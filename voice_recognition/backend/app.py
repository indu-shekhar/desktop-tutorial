from pydub import AudioSegment
from flask import Flask, render_template, request, jsonify
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity,
)
from flask_sqlalchemy import SQLAlchemy
from speechbrain.inference import SpeakerRecognition
import os
import io

# Initialize the Flask application
app = Flask(__name__, template_folder="../templates")
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

# Setting up the database model with email ID, password, and audio file in blob format
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    user_id = db.Column(db.String(120), nullable=False)
    audio_file = db.Column(db.LargeBinary, nullable=False)

    def __init__(self, email, user_id, audio_file):
        self.email = email
        self.user_id = user_id
        self.audio_file = audio_file

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
            if score > 0.75 : 
                #redirect the client to the secret page route
                access_token=create_access_token(identity=user.email)
                return jsonify({"access_token":access_token}),200
            else: 
                result= "Different speaker"

            # Return the result as a JSON response
            return jsonify({"result": result})
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
@jwt_required()
def secret():
    current_user = get_jwt_identity()
    return jsonify({"message": f"Welcome {current_user} to the secret page!"})
# Run the Flask application
if __name__ == "__main__":
    with app.app_context():
        try:
            db.create_all()
            print("Database created successfully!")
        except Exception as e:
            print(f"An error occurred: {str(e)}")
    app.run(debug=True)