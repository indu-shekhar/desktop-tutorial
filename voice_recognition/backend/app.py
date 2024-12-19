from pydub import AudioSegment
from flask import Flask, render_template, request, jsonify
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    #jwt_required,
    get_jwt_identity,
    # verify_jwt_in_request,
    get_jwt,        
    decode_token,
)
from flask_sqlalchemy import SQLAlchemy
from speechbrain.inference import SpeakerRecognition
import os
import io
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
import speech_recognition as sr
import pyttsx3
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

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
model = SpeakerRecognition.from_hparams(
    source="speechbrain/spkrec-ecapa-voxceleb", savedir="pretrained_model"
)


#training the intent recognition model
bank_data = {
    'text': [
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
        "I want to check my transaction history."
    ],
    'intent': [
        # Check Account Balance
        "CheckBalance", "CheckBalance", "CheckBalance", "CheckBalance", "CheckBalance",

        # Transfer Money
        "TransferMoney", "TransferMoney", "TransferMoney", "TransferMoney", "TransferMoney",

        # Get Last Five Transactions
        "GetLastTransactions", "GetLastTransactions", "GetLastTransactions", "GetLastTransactions", "GetLastTransactions"
    ]
}
df = pd.DataFrame(bank_data)
X_train, X_test, y_train, y_test = train_test_split(df['text'], df['intent'], test_size=0.2, random_state=42)
vectorizer = TfidfVectorizer()
X_train_vec = vectorizer.fit_transform(X_train)
bank_model = LogisticRegression().fit(X_train_vec, y_train)

# Setting up the database model with email ID, password, and audio file in blob format
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    user_id = db.Column(db.String(120), nullable=False)
    balance = db.Column(db.Float, nullable=False)
    audio_file = db.Column(db.LargeBinary, nullable=False)

    def __init__(self, email, user_id, audio_file):
        self.email = email
        self.user_id = user_id
        self.audio_file = audio_file
        self.balance = 10000.0

class TransactionHistory(db.Model):
    transaction_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    acc_email = db.Column(db.String(120), db.ForeignKey('user.email'), nullable=False)
    sent_to_email = db.Column(db.String(120), nullable=True)
    transaction_type = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, server_default=db.func.now())

# Define the route for the home page
@app.route("/")
def index():
    # Render the index.html template
    return render_template("index.html")


@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "GET":
        return render_template("register.html")
    elif request.method == "POST":
        if "audio-file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files["audio-file"]
        # If the user does not select a file, the browser submits an empty file without a filename
        if file.filename == "":
            return jsonify({"error": "No selected file"}), 400

        if file:
            email = request.form.get("email")
            user_id = request.form.get("user_id")
            # Convert the uploaded file to WAV format using pydub
            existing_user = User.query.filter_by(email=email).first()
            if existing_user:
                return jsonify({"error": "Email already registered"}), 400

            sound = AudioSegment.from_file(file)
            wav_io = io.BytesIO()
            sound.export(wav_io, format="wav")
            wav_io.seek(0)
            wav_data = wav_io.read()

            new_user = User(email=email, user_id=user_id, audio_file=wav_data)
            try:
                db.session.add(new_user)
                db.session.commit()
            except Exception as e:
                return jsonify({"error": str(e)}), 500
            return jsonify({"message": "User registered successfully!"})


@app.route("/login", methods=["POST"])
def upload_file():
    # Check if the POST request has the file part
    if "audio-file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["audio-file"]
    # If the user does not select a file, the browser submits an empty file without a filename
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    if file:
        # Define the upload folder path
        upload_folder = os.path.join(app.root_path, "../uploaded_files")
        # Create the upload folder if it doesn't exist
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder)

        # Save the uploaded file
        enrolled_path = os.path.join(upload_folder, file.filename)
        file.save(enrolled_path)

        user = User.query.filter_by(email=request.form.get("email")).first()
        if not user:
            return jsonify({"error": "User not found"}), 404

        reference_audio = io.BytesIO(user.audio_file)
        reference_audio.seek(0)
        reference_path = "../uploaded_files/reference_voice.wav"
        with open(reference_path, "wb") as f:
            f.write(reference_audio.read())

        try:
            # Convert the uploaded file to WAV format
            sound = AudioSegment.from_file(enrolled_path)
            sound.export(enrolled_path, format="wav")

            # Verify the speaker using the pre-trained model
            score, prediction = model.verify_files(enrolled_path, reference_path)
            print(f"Score: {score}, Prediction: {prediction}")
            if score > 0.50:
                # redirect the client to the secret page route
                email = request.form.get("email")
                access_token = create_access_token(identity=email)
                return jsonify({"access_token": access_token}), 200
            else:
                result = "Different speaker"
                # Return the result as a JSON response
                return jsonify({"result": result}), 401
        except Exception as e:
            # Remove the enrolled file if an error occurs
            os.remove(enrolled_path)
            return jsonify({"error": str(e)}), 500
        finally:
            # Clean up temporary files
            if os.path.exists(enrolled_path):
                os.remove(enrolled_path)
            if os.path.exists(reference_path):
                os.remove(reference_path)


@app.route("/secret", methods=["GET"])
def secret():
    token=request.cookies.get("access_token")
    if not token:
        return jsonify({"error": "Missing access token"}), 401
    try:
        # Manually decode the token from the cookie
        decoded_token = decode_token(token)
        current_user = decoded_token['sub']  # 'sub' contains the user identity (email)
        #check whether user is in the database
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
    pattern = r'(?i)(?:send|transfer|give|forward|pay|dispatch|deliver|allocate|wire|remit)?\s*(?:\$)?(\d+)\s*(?:to|for|towards)?\s*([a-zA-Z]+)|([a-zA-Z]+)\s*(?:needs|requires|deserves|expects|asked for|requested|waiting for|could use|should receive|might need)\s*(?:\$)?(\d+)'
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

@app.route('/process_command', methods=['POST'])
def process_command():
    token = request.headers.get('Authorization').split()[1]
    decoded_token = decode_token(token)
    email = decoded_token.get('sub')
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
            amount = name_and_amount.get("amount")
            # Transfer the amount to the specified account
            from_account = User.query.filter_by(email=email).first()
            to_account = User.query.filter_by(email=name).first()

            if not from_account or not to_account:
                return jsonify({"error": "Invalid account number"}), 404

            if from_account.balance < amount:
                return jsonify({"error": "Insufficient balance"}), 400

            from_account.balance -= amount
            to_account.balance += amount

            db.session.add(TransactionHistory(acc_email=email, sent_to_email=name, transaction_type="Debit", amount=amount))
            db.session.add(TransactionHistory(acc_num=name, sent_to_email=email, transaction_type="Credit", amount=amount))
            db.session.commit()

            return jsonify({"message": f"Transferred ${amount} to {name}'s account."})

    elif intent == "GetLastTransactions":
        transactions = TransactionHistory.query.filter_by(acc_email=email).order_by(TransactionHistory.timestamp.desc()).limit(5).all()
        if transactions:
            history = [{"transaction_id": t.transaction_id, "transaction_type": t.transaction_type, "amount": t.amount, "timestamp": t.timestamp} for t in transactions]
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
