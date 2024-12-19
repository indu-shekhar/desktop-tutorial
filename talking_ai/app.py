from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import speech_recognition as sr
import pyttsx3
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from flask import render_template

app = Flask(__name__)
CORS(app)

# Initialize text-to-speech
engine = pyttsx3.init()

# Load and process bank_data for intent recognition
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

def predict_intent(text):
    text_vec = vectorizer.transform([text])
    return bank_model.predict(text_vec)[0]

# Database setup
conn = sqlite3.connect('bank.db', check_same_thread=False)
cursor = conn.cursor()
# @app.route('/')
# def index():
#     return render_template('index.html')

# @app.route('/process_command', methods=['POST'])
def process_command():
    bank_data = request.json
    command = bank_data.get("command")
    intent = predict_intent(command)

    if intent == "CheckBalance":
        # balance = get_balance(123)  # Example account
        # response = f"Your balance is ${balance:.2f}" if balance else "Account not found."
        response = "Your balance is $1000."
        
    elif intent == "TransferMoney":
        # Example transfer command handling
        response = "Transferred $100 to John Doe's account."
    elif intent == "GetLastTransactions":
        response = "Your last five transactions are displayed."
    else:
        response = "I'm sorry, I didn't understand that."

    return jsonify({"message": response})

def get_balance(acc_num):
    cursor.execute("SELECT BAL FROM accounts WHERE ACC_NUM = ?", (acc_num,))
    balance = cursor.fetchone()
    return balance[0] if balance else None

if __name__ == '__main__':
    app.run(debug=True)