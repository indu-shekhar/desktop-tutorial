from pydub import AudioSegment
from flask import Flask, render_template, request, jsonify
from speechbrain.inference import SpeakerRecognition
import os

# Initialize the Flask application
app = Flask(__name__, template_folder="../templates")

# Load the pre-trained speaker recognition model
model = SpeakerRecognition.from_hparams(
    source="speechbrain/spkrec-ecapa-voxceleb", savedir="pretrained_model"
)

# Define the route for the home page
@app.route("/")
def index():
    # Render the index.html template
    return render_template("index.html")

# Define the route for file upload
@app.route("/upload", methods=["POST"])
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

        # Define paths for the reference and enrolled audio files
        reference_path = "../uploaded_files/reference_voice.wav"
        enrolled_path = "../uploaded_files/enrolled_audio.wav"

        try:
            # Convert the uploaded file to WAV format
            sound = AudioSegment.from_file(enrolled_path)
            sound.export(enrolled_path, format="wav")

            # Verify the speaker using the pre-trained model
            score, prediction = model.verify_files(enrolled_path, reference_path)
            result = "Same speaker" if score > 0.75 else "Different speaker"

            # Return the result as a JSON response
            return jsonify({"result": result})
        except Exception as e:
            # Remove the enrolled file if an error occurs
            os.remove(enrolled_path)
            return f"Error: {e}"

# Run the Flask application
if __name__ == "__main__":
    app.run(debug=True)