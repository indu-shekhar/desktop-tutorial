import pandas as pd
import sqlite3
import pyaudio
import numpy as np
import threading
import speech_recognition as sr
import pyttsx3  # Text to Speech Library
data = {
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

df = pd.DataFrame(data)

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer

# Splitting the data
X = df['text']
y = df['intent']
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Vectorizing text data
vectorizer = TfidfVectorizer()
X_train_vec = vectorizer.fit_transform(X_train)
X_test_vec = vectorizer.transform(X_test)
from sklearn.linear_model import LogisticRegression

# Training the model
model1 = LogisticRegression()
model1.fit(X_train_vec, y_train)
from sklearn.metrics import classification_report

# Making predictions
y_pred = model1.predict(X_test_vec)

# Evaluating the model
print(classification_report(y_test, y_pred))
def predict_intent(text):
    text_vec = vectorizer.transform([text])
    prediction = model1.predict(text_vec)
    return prediction[0]
# Initialize Text to Speech
engine = pyttsx3.init()

# Function to speak text
def speak(text):
    engine.say(text)
    engine.runAndWait()

# Connecting to SQLite
conn = sqlite3.connect('INSTRUCTOR.db', check_same_thread=False)
cursor_obj = conn.cursor()

# Creating INSTRUCTOR table
table = """ 
CREATE TABLE IF NOT EXISTS INSTRUCTOR (
    ACC_NUM INTEGER PRIMARY KEY NOT NULL, 
    FNAME VARCHAR(20), 
    LNAME VARCHAR(20), 
    ACC_TYPE VARCHAR(20),  
    BAL FLOAT
);"""
cursor_obj.execute(table)

# Inserting values into INSTRUCTOR table if empty
cursor_obj.execute("SELECT COUNT(*) FROM INSTRUCTOR")
if cursor_obj.fetchone()[0] == 0:  # Check if the table is empty
    cursor_obj.execute('''INSERT INTO INSTRUCTOR values 
        (123, 'lok', 'chandra', 'SAVING', 5000),
        (234, 'pawan', 'sai', 'SAVING', 10000),
        (135,'Surendra','Goud','SAVINGS',5000)
    ''')

# Creating TRANSACTION_HISTORY table
create_history_table = """
CREATE TABLE IF NOT EXISTS TRANSACTION_HISTORY (
    TRANSACTION_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    ACC_NUM INTEGER,
    SENT_TO_NUM INTEGER,
    TRANSACTION_TYPE TEXT,
    AMOUNT FLOAT,
    TIMESTAMP DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ACC_NUM) REFERENCES INSTRUCTOR (ACC_NUM)
);
"""
cursor_obj.execute(create_history_table)

# Function to send money
def send_money(cursor, from_acc_num, to_acc_num, amount):
    try:
        cursor.execute("SELECT BAL FROM INSTRUCTOR WHERE ACC_NUM = ?", (from_acc_num,))
        from_account = cursor.fetchone()

        cursor.execute("SELECT BAL FROM INSTRUCTOR WHERE ACC_NUM = ?", (to_acc_num,))
        to_account = cursor.fetchone()

        if from_account is None or to_account is None:
            speak("Please enter a valid account number.")
            return

        if from_account[0] < amount:
            speak("Insufficient balance.")
            return

        new_from_balance = from_account[0] - amount
        cursor.execute("UPDATE INSTRUCTOR SET BAL = ? WHERE ACC_NUM = ?", (new_from_balance, from_acc_num))

        new_to_balance = to_account[0] + amount
        cursor.execute("UPDATE INSTRUCTOR SET BAL = ? WHERE ACC_NUM = ?", (new_to_balance, to_acc_num))

        cursor.execute("INSERT INTO TRANSACTION_HISTORY (ACC_NUM, SENT_TO_NUM, TRANSACTION_TYPE, AMOUNT) VALUES (?, ?, ?, ?)",
                       (from_acc_num, to_acc_num, 'Debit', amount))  # Debit for sender
        cursor.execute("INSERT INTO TRANSACTION_HISTORY (ACC_NUM, SENT_TO_NUM, TRANSACTION_TYPE, AMOUNT) VALUES (?, ?, ?, ?)",
                       (to_acc_num, from_acc_num, 'Credit', amount))  # Credit for receiver

        cursor.connection.commit()

        speak(f"Transaction successful: ${amount:.2f} sent from account {from_acc_num} to account {to_acc_num}.")

    except Exception as e:
        cursor.connection.rollback()
        speak(f"Transaction failed: {e}")

# Function to fetch transaction history
def fetch_transaction_history(cursor, acc_num):
    cursor.execute("""
        SELECT TRANSACTION_ID, TRANSACTION_TYPE, AMOUNT, SENT_TO_NUM, TIMESTAMP
        FROM TRANSACTION_HISTORY
        WHERE ACC_NUM = ?
        ORDER BY TIMESTAMP DESC
    """, (acc_num,))

    transactions = cursor.fetchall()
    if transactions:
        speak(f"Transaction history for account {acc_num}:")
        for transaction in transactions:
            transaction_id, transaction_type, amount, sent_to_num, timestamp = transaction
            speak(f"ID: {transaction_id}, Type: {transaction_type}, Amount: ${amount:.2f}, "
                  f"Sent Money To: {sent_to_num if sent_to_num else 'N/A'}, Time: {timestamp}")
    else:
        speak("No transaction history found for this account.")

# Function to get account balance
def get_balance(cursor, acc_num):
    cursor.execute("SELECT BAL FROM INSTRUCTOR WHERE ACC_NUM = ?", (acc_num,))
    balance = cursor.fetchone()

    if balance is not None:
        return balance[0]
    else:
        speak("Account number does not exist.")
        return None

# Function to recognize speech
def recognize_speech():
    recognizer = sr.Recognizer()
    with sr.Microphone() as source:
        #print("Listening...")
        audio = recognizer.listen(source)
        try:
            text = recognizer.recognize_google(audio)
            print(f"You said: {text}")
            return text
        except sr.UnknownValueError:
            speak("Sorry, I could not understand the audio.")
            return None
        except sr.RequestError as e:
            speak(f"Could not request results; {e}")
            return None

# Function to process transfer command
def process_transfer_command(command):
    words = command.split()
    try:
        amount = float(words[1])  # Assumes "transfer <amount> to <name>"
        name = words[3]  # Assumes the name is the fourth word
        print(f"Searching for account with the name: {name}")
        
        query = "SELECT ACC_NUM FROM INSTRUCTOR WHERE FNAME = ? COLLATE NOCASE;"
        cursor_obj.execute(query, (name,))
        results = cursor_obj.fetchall()

        if not results:
            speak(f"No account found with the name '{name}'.")
        else:
            to_acc_num = results[0][0]  # Get the first account number
            from_acc_num = 123  # The account number you want to send from
            send_money(cursor_obj, from_acc_num, to_acc_num, amount)

    except (IndexError, ValueError):
        speak("Please make sure to say the amount and the recipient's name correctly.")


# Main execution
speak("Program started. Say 'Start' to begin or 'Exit' to quit.")
p = pyaudio.PyAudio()
stream = p.open(format=pyaudio.paInt16,
                channels=1,
                rate=16000,
                input=True,
                frames_per_buffer=1024)

try:
    while True:
        command = recognize_speech()
        if command:
            if "start" in command.lower():
                speak("Listening for commands.")
                command = recognize_speech()
                if command:
                    intent = predict_intent(command)
                print(f"Predicted Intent: {intent}")
                if intent:
                    if intent=="TransferMoney":
                        process_transfer_command(command)
                    elif intent=="CheckBalance":
                        balance = get_balance(cursor_obj, 123)  # Replace with user account number
                        if balance is not None:
                            speak(f"Your balance is ${balance:.2f}.")
                    elif "transaction history" in command.lower():
                        fetch_transaction_history(cursor_obj, 123)  # Replace with user account number
                 # Exit outer loop
            elif "exit" in command.lower():
                speak("Exiting the program.")
                break  # Exit outer loop
except KeyboardInterrupt:
    print("Stopping...")

finally:
    stream.stop_stream()
    stream.close()
    cursor_obj.close()
    conn.close()
    speak("Program terminated.")