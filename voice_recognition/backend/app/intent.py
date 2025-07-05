from flask import Blueprint, request, jsonify, render_template
import logging
from flask_jwt_extended import decode_token
from .models import User, TransactionHistory, db
import io
import os
import tempfile
import numpy as np
from .voice_auth import save_and_convert_audio, verify_voice
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import re

intent_bp = Blueprint('intent', __name__)



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
    logging.info(f"[PROCESS_COMMAND] Received command request for user: {email}")
    if not email:
        logging.warning("[PROCESS_COMMAND] Invalid token: email not found.")
        return jsonify({"error": "Invalid token: email not found"}), 401
    if "voice_sample" not in request.files:
        logging.warning(f"[PROCESS_COMMAND] Voice sample missing for user: {email}")
        return jsonify({"error": "Voice sample missing"}), 400
    voice_sample = request.files["voice_sample"]
    user = User.query.filter_by(email=email).first()
    if not user:
        logging.warning(f"[PROCESS_COMMAND] User not found: {email}")
        return jsonify({"error": "User not found"}), 404
    try:
        # Save enrolled voice to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as enrolled_tmp:
            enrolled_tmp.write(user.audio_file)
            enrolled_audio_path = enrolled_tmp.name
        # Save and convert new voice sample
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as input_tmp:
            save_and_convert_audio(voice_sample, input_tmp.name)
            input_audio_path = input_tmp.name
        # Voice verification using pyannote
        voice_match, distance = verify_voice(enrolled_audio_path, input_audio_path)
        logging.info(f"[PROCESS_COMMAND] Voice verification for {email}: distance={distance:.4f}, match={voice_match}")
        if not voice_match:
            logging.warning(f"[PROCESS_COMMAND] Voice authentication failed for {email} (distance={distance:.4f})")
            return jsonify({"error": f"Voice authentication failed (distance={distance:.4f})"}), 401
        command = request.form.get("command")
        logging.info(f"[PROCESS_COMMAND] Command received: '{command}' for user: {email}")
        intent = predict_intent(command)
        logging.info(f"[PROCESS_COMMAND] Predicted intent: {intent} for user: {email}")
        if intent == "CheckBalance":
            logging.info(f"[PROCESS_COMMAND] Returning balance for {email}: {user.balance}")
            return jsonify({"balance": user.balance})
        elif intent == "TransferMoney":
            name_and_amount = extract_name_and_amount(command)
            if not name_and_amount:
                logging.warning(f"[PROCESS_COMMAND] Could not parse recipient or amount for command: '{command}'")
                return jsonify({"error": "Could not parse recipient or amount"}), 400
            name = name_and_amount.get("name")
            amount = float(name_and_amount.get("amount"))
            to_account = User.query.filter_by(user_id=name.lower()).first()
            if not to_account:
                logging.warning(f"[PROCESS_COMMAND] Recipient account not found: {name}")
                return jsonify({"error": "Recipient account not found"}), 404
            if user.balance < amount:
                logging.warning(f"[PROCESS_COMMAND] Insufficient balance for {email}. Tried to send {amount}.")
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
            logging.info(f"[PROCESS_COMMAND] Transferred ${amount} from {email} to {name}.")
            return jsonify({"message": f"Transferred ${amount} to {name}'s account."})
        elif intent == "GetLastTransactions":
            transactions = (
                TransactionHistory.query.filter_by(acc_email=email)
                .order_by(TransactionHistory.timestamp.desc())
                .limit(5)
                .all()
            )
            if not transactions:
                logging.warning(f"[PROCESS_COMMAND] No transaction history found for {email}")
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
            logging.info(f"[PROCESS_COMMAND] Returning last {len(history)} transactions for {email}")
            return jsonify({"transactions": history})
        else:
            logging.info(f"[PROCESS_COMMAND] Unrecognized command for {email}: '{command}'")
            return jsonify({"message": "I'm sorry, I didn't understand that."})
    except Exception as e:
        logging.error(f"[PROCESS_COMMAND] Exception: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        for path_var in ["enrolled_audio_path", "input_audio_path"]:
            if path_var in locals() and os.path.exists(locals()[path_var]):
                os.remove(locals()[path_var])
