from flask import Blueprint, request, jsonify, render_template
from flask_jwt_extended import decode_token
from .models import User, TransactionHistory, db
import io
import os
import tempfile
import numpy as np
from pydub import AudioSegment
from speechbrain.inference import SpeakerRecognition
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import re

intent_bp = Blueprint('intent', __name__)

# Load the pre-trained speaker recognition model
voice_model = SpeakerRecognition.from_hparams(
    source="speechbrain/spkrec-ecapa-voxceleb", savedir="pretrained_model"
)

# Training the intent recognition model
bank_data = {
    "text": [
        "What's my account balance?",
        "Can you show me my balance?",
        "Check my current balance.",
        "I want to see my bank balance.",
        "Show me the available balance.",
        "Transfer money to John.",
        "Send $500 to my savings account.",
        "I need to transfer funds to my checking account.",
        "Move $1000 to account number 123456.",
        "I want to transfer money.",
        "Show my last five transactions.",
        "What are my recent transactions?",
        "Can I see my previous transactions?",
        "Display the last five transactions.",
        "I want to check my transaction history.",
    ],
    "intent": [
        "CheckBalance",
        "CheckBalance",
        "CheckBalance",
        "CheckBalance",
        "CheckBalance",
        "TransferMoney",
        "TransferMoney",
        "TransferMoney",
        "TransferMoney",
        "TransferMoney",
        "GetLastTransactions",
        "GetLastTransactions",
        "GetLastTransactions",
        "GetLastTransactions",
        "GetLastTransactions",
    ],
}
df = pd.DataFrame(bank_data)
X_train, X_test, y_train, y_test = train_test_split(
    df["text"], df["intent"], test_size=0.2, random_state=42
)
vectorizer = TfidfVectorizer()
X_train_vec = vectorizer.fit_transform(X_train)
bank_model = LogisticRegression().fit(X_train_vec, y_train)

def predict_intent(text):
    text_vec = vectorizer.transform([text])
    return bank_model.predict(text_vec)[0]

def extract_name_and_amount(text):
    pattern = r"(?i)(?:send|transfer|give|forward|pay|dispatch|deliver|allocate|wire|remit)?\\s*(?:\\$)?(\\d+)\\s*(?:to|for|towards)?\\s*([a-zA-Z]+)|([a-zA-Z]+)\\s*(?:needs|requires|deserves|expects|asked for|requested|waiting for|could use|should receive|might need)\\s*(?:\\$)?(\\d+)"
    match = re.search(pattern, text)
    if match:
        if match.group(1) and match.group(2):
            amount = match.group(1)
            name = match.group(2)
        elif match.group(3) and match.group(4):
            amount = match.group(4)
            name = match.group(3)
        else:
            return None
        return {"name": name.capitalize(), "amount": amount}
    else:
        return None

@intent_bp.route("/", methods=["GET"])
def index():
    return render_template("index.html")

@intent_bp.route("/secret", methods=["GET"])
def secret():
    token = request.cookies.get("access_token")
    if not token:
        return jsonify({"error": "Missing access token"}), 401
    try:
        decoded_token = decode_token(token)
        current_user = decoded_token["sub"]
        user = User.query.filter_by(email=current_user).first()
        if not user:
            return jsonify({"error": "User not found"}), 404
        return render_template("bank_index.html")
    except Exception as e:
        return jsonify({"error": str(e)}), 401

@intent_bp.route("/process_command", methods=["POST"])
def process_command():
    token = request.headers.get("Authorization").split()[1]
    decoded_token = decode_token(token)
    email = decoded_token.get("sub")
    if not email:
        return jsonify({"error": "Invalid token: email not found"}), 401
    if "voice_sample" not in request.files:
        return jsonify({"error": "Voice sample missing"}), 400
    voice_sample = request.files["voice_sample"]
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    try:
        enrolled_audio = io.BytesIO(user.audio_file)
        enrolled_audio.seek(0)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as enrolled_tmp:
            enrolled_tmp.write(enrolled_audio.read())
            temp_audio_path = enrolled_tmp.name
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as input_tmp:
            sound = AudioSegment.from_file(voice_sample)
            sound.export(input_tmp.name, format="wav")
            input_audio_path = input_tmp.name
        score, _ = voice_model.verify_files(input_audio_path, temp_audio_path)
        if score <= 0.50:
            return jsonify({"error": "Voice authentication failed"}), 401
        else:
            command = request.form.get("command")
            intent = predict_intent(command)
            if intent == "CheckBalance":
                return jsonify({"balance": user.balance})
            elif intent == "TransferMoney":
                name_and_amount = extract_name_and_amount(command)
                if not name_and_amount:
                    return jsonify({"error": "Could not parse recipient or amount"}), 400
                name = name_and_amount.get("name")
                amount = float(name_and_amount.get("amount"))
                to_account = User.query.filter_by(user_id=name.lower()).first()
                if not to_account:
                    return jsonify({"error": "Recipient account not found"}), 404
                if user.balance < amount:
                    return jsonify({"error": "Insufficient balance"}), 400
                user.balance -= amount
                to_account.balance += amount
                db.session.add(
                    TransactionHistory(
                        acc_email=email,
                        sent_to_email=name,
                        transaction_type="Debit",
                        amount=amount,
                    )
                )
                db.session.add(
                    TransactionHistory(
                        acc_email=name,
                        sent_to_email=email,
                        transaction_type="Credit",
                        amount=amount,
                    )
                )
                db.session.commit()
                return jsonify({"message": f"Transferred ${amount} to {name}'s account."})
            elif intent == "GetLastTransactions":
                transactions = (
                    TransactionHistory.query.filter_by(acc_email=email)
                    .order_by(TransactionHistory.timestamp.desc())
                    .limit(5)
                    .all()
                )
                if not transactions:
                    return jsonify({"error": "No transaction history found"}), 404
                history = []
                for t in transactions:
                    history.append(
                        {
                            "transaction_id": t.transaction_id,
                            "transaction_type": t.transaction_type,
                            "amount": t.amount,
                            "timestamp": t.timestamp,
                        }
                    )
                return jsonify({"transactions": history})
            else:
                return jsonify({"message": "I'm sorry, I didn't understand that."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        for path_var in ["temp_audio_path", "input_audio_path"]:
            if path_var in locals() and os.path.exists(locals()[path_var]):
                os.remove(locals()[path_var])
