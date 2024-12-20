from pydub import AudioSegment
from flask import Flask, render_template, request, jsonify
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    decode_token,
)
from flask_sqlalchemy import SQLAlchemy
from speechbrain.inference import SpeakerRecognition
import os
import io
import re
from flask_cors import CORS
import speech_recognition as sr
import pyttsx3
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import face_recognition
import numpy as np

# Initialize the Flask application
app = Flask(__name__, template_folder="../templates")
CORS(app)

# Initialize text-to-speech
engine = pyttsx3.init()

# Load the configuration from the config.py file
app.config.from_object("config.Config")

# Initialize the JWT manager
jwt = JWTManager(app)

# Initialize the SQLAlchemy database
db = SQLAlchemy(app)

# Load the pre-trained speaker recognition model
voice_model = SpeakerRecognition.from_hparams(
    source="speechbrain/spkrec-ecapa-voxceleb", savedir="pretrained_model"
)

# Training the intent recognition model
bank_data = {
    "text": [
        # Check Account Balance
        "What's my account balance?",
        "Can you show me my balance?",
        "Check my current balance.",
        "I want to see my bank balance.",
        "Show me the available balance.",
        # Transfer Money
        "Transfer money to John.",
        "Send $500 to my savings account.",
        "I need to transfer funds to my checking account.",
        "Move $1000 to account number 123456.",
        "I want to transfer money.",
        # Get Last Five Transactions
        "Show my last five transactions.",
        "What are my recent transactions?",
        "Can I see my previous transactions?",
        "Display the last five transactions.",
        "I want to check my transaction history.",
    ],
    "intent": [
        # Check Account Balance
        "CheckBalance",
        "CheckBalance",
        "CheckBalance",
        "CheckBalance",
        "CheckBalance",
        # Transfer Money
        "TransferMoney",
        "TransferMoney",
        "TransferMoney",
        "TransferMoney",
        "TransferMoney",
        # Get Last Five Transactions
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


# Setting up the database model with email ID, password, audio file in blob format, and face encoding
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    user_id = db.Column(db.String(120), nullable=False)
    balance = db.Column(db.Float, nullable=False)
    audio_file = db.Column(db.LargeBinary, nullable=False)
    face_encoding = db.Column(db.PickleType, nullable=False)

    def __init__(self, email, user_id, audio_file, face_encoding):
        self.email = email
        self.user_id = user_id
        self.audio_file = audio_file
        self.face_encoding = face_encoding
        self.balance = 10000.0


class TransactionHistory(db.Model):
    transaction_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    acc_email = db.Column(db.String(120), db.ForeignKey("user.email"), nullable=False)
    sent_to_email = db.Column(db.String(120), nullable=True)
    transaction_type = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, server_default=db.func.now())


# Define the route for the home page
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/register", methods=["POST"])
def register():
    if request.method == "GET":
        return render_template("register.html")
    if "audio-file" not in request.files or "face-image" not in request.files:
        return jsonify({"error": "Audio file or face image missing"}), 400

    audio_file = request.files["audio-file"]
    face_image = request.files["face-image"]
    email = request.form.get("email")
    user_id = request.form.get("user_id")

    if not audio_file.filename or not face_image.filename:
        return jsonify({"error": "Files not selected"}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"error": "Email already registered"}), 400

    try:
        # Process audio file
        sound = AudioSegment.from_file(audio_file)
        wav_io = io.BytesIO()
        sound.export(wav_io, format="wav")
        wav_io.seek(0)
        wav_data = wav_io.read()

        # Process face image
        face_image_path = os.path.join("temp_face.jpg")
        face_image.save(face_image_path)
        face = face_recognition.load_image_file(face_image_path)
        face_encodings = face_recognition.face_encodings(face)

        if not face_encodings:
            return jsonify({"error": "No face detected"}), 400

        face_encoding = face_encodings[0]

        # Save user to database
        new_user = User(
            email=email,
            user_id=user_id,
            audio_file=wav_data,
            face_encoding=face_encoding,
        )
        db.session.add(new_user)
        db.session.commit()

        return jsonify({"message": "User registered successfully!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(face_image_path):
            os.remove(face_image_path)


@app.route("/login", methods=["POST"])
def login():
    if "audio-file" not in request.files or "face-image" not in request.files:
        return jsonify({"error": "Audio file or face image missing"}), 400

    audio_file = request.files["audio-file"]
    face_image = request.files["face-image"]
    email = request.form.get("email")

    if not audio_file.filename or not face_image.filename:
        return jsonify({"error": "Files not selected"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    try:
        # Process audio file
        enrolled_audio = io.BytesIO(user.audio_file)
        enrolled_audio.seek(0)
        temp_audio_path = "temp_audio.wav"
        with open(temp_audio_path, "wb") as f:
            f.write(enrolled_audio.read())

        input_audio_path = "input_audio.wav"
        sound = AudioSegment.from_file(audio_file)
        sound.export(input_audio_path, format="wav")

        score, prediction = voice_model.verify_files(input_audio_path, temp_audio_path)

        if score <= 0.50:
            return jsonify({"error": "Voice authentication failed"}), 401

        # Process face image
        face_image_path = os.path.join("temp_face.jpg")
        face_image.save(face_image_path)
        face = face_recognition.load_image_file(face_image_path)
        face_encodings = face_recognition.face_encodings(face)

        if not face_encodings:
            return jsonify({"error": "No face detected"}), 400

        face_encoding = face_encodings[0]
        match = face_recognition.compare_faces(
            [np.array(user.face_encoding)], face_encoding
        )[0]

        if not match:
            return jsonify({"error": "Face authentication failed"}), 401

        access_token = create_access_token(identity=email)
        return jsonify({"access_token": access_token}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
        if os.path.exists(input_audio_path):
            os.remove(input_audio_path)
        if os.path.exists(face_image_path):
            os.remove(face_image_path)


@app.route("/secret", methods=["GET"])
def secret():
    token = request.cookies.get("access_token")
    if not token:
        return jsonify({"error": "Missing access token"}), 401
    try:
        # Manually decode the token from the cookie
        decoded_token = decode_token(token)
        current_user = decoded_token["sub"]  # 'sub' contains the user identity (email)
        # check whether user is in the database
        user = User.query.filter_by(email=current_user).first()
        if not user:
            return jsonify({"error": "User not found"}), 404
        # Render the secret page
        return render_template("bank_index.html")
    except Exception as e:
        return jsonify({"error": str(e)}), 401


# Define the route for the process_command endpoint
def predict_intent(text):
    text_vec = vectorizer.transform([text])
    return bank_model.predict(text_vec)[0]


def extract_name_and_amount(text):
    # Regex to handle various sentence formats
    pattern = r"(?i)(?:send|transfer|give|forward|pay|dispatch|deliver|allocate|wire|remit)?\s*(?:\$)?(\d+)\s*(?:to|for|towards)?\s*([a-zA-Z]+)|([a-zA-Z]+)\s*(?:needs|requires|deserves|expects|asked for|requested|waiting for|could use|should receive|might need)\s*(?:\$)?(\d+)"
    match = re.search(pattern, text)

    if match:
        # Check which format matched
        if match.group(1) and match.group(2):  # Format: "Send $100 to John"
            amount = match.group(1)
            name = match.group(2)
        elif match.group(3) and match.group(4):  # Format: "John needs $100"
            amount = match.group(4)
            name = match.group(3)
        else:
            return None
        return {"name": name.capitalize(), "amount": amount}
    else:
        return None


@app.route("/process_command", methods=["POST"])
def process_command():
    token = request.headers.get("Authorization").split()[1]
    decoded_token = decode_token(token)
    email = decoded_token.get("sub")
    if not email:
        return jsonify({"error": "Invalid token: email not found"}), 401
    bank_data = request.json
    command = bank_data.get("command")
    intent = predict_intent(command)

    if intent == "CheckBalance":
        # balance = get_balance(123)  # Example account
        # response = f"Your balance is ${balance:.2f}" if balance else "Account not found."
        # response = "Your balance is $1000."
        account = User.query.filter_by(email=email).first()
        if account:
            return jsonify({"balance": account.balance})
        else:
            return jsonify({"error": "Account not found"}), 404

    elif intent == "TransferMoney":
        # Example transfer command handling
        name_and_amount = extract_name_and_amount(command)
        if name_and_amount:
            name = name_and_amount.get("name")
            print(name)
            amount = float(name_and_amount.get("amount"))
            print(amount)
            # Transfer the amount to the specified account
            from_account = User.query.filter_by(email=email).first()
            to_account = User.query.filter_by(user_id=name.lower()).first()
            if not from_account:
                return jsonify({"error": "Invalid account number"}), 404
            if not to_account:
                return jsonify({"error": "Recipient account not found"}), 404
            if from_account.balance < amount:
                return jsonify({"error": "Insufficient balance"}), 400

            from_account.balance -= amount
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
        if transactions:
            history = [
                {
                    "transaction_id": t.transaction_id,
                    "transaction_type": t.transaction_type,
                    "amount": t.amount,
                    "timestamp": t.timestamp,
                }
                for t in transactions
            ]
            return jsonify({"transactions": history})
        else:
            return jsonify({"error": "No transaction history found"}), 404
    else:
        response = "I'm sorry, I didn't understand that."
        return jsonify({"message": response})


# Run the Flask application
if __name__ == "__main__":
    with app.app_context():
        try:
            db.create_all()
            print("Database created successfully!")
        except Exception as e:
            print(f"An error occurred: {str(e)}")
    app.run(debug=True)
