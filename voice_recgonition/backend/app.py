from pydub import AudioSegment
from flask import Flask, render_template, request, redirect, url_for, jsonify
from speechbrain.inference import SpeakerRecognition
import os

app = Flask(__name__, template_folder='../templates')

# Initialize SpeechBrain model
model = SpeakerRecognition.from_hparams(source="speechbrain/spkrec-ecapa-voxceleb", savedir="pretrained_model")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    # if 'audio-file' not in request.files:
    #     return redirect(request.url)

    # file = request.files['audio-file']
    # if file.filename == '':
    #     return redirect(request.url)
    if 'audio-file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['audio-file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file:
        # enrolled_path = os.path.join('../uploaded_files', file.filename)
        # file.save(enrolled_path)
        upload_folder = os.path.join(app.root_path, '../uploaded_files')
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder)

        enrolled_path = os.path.join(upload_folder, file.filename)
        file.save(enrolled_path)
        # return 'File successfully uploaded'

        # Reference voice path (pre-stored)
        reference_path = '../uploaded_files/reference_voice.wav'
        enrolled_path = "../uploaded_files/enrolled_audio.wav"
        # Compare the enrolled voice to the reference voice
        # ../uploaded_files/enrolled_audio.wav
        try:
            sound=AudioSegment.from_file(enrolled_path)
            sound.export(enrolled_path, format="wav")
            # prediction uing the model and the enrolled and reference voice
            score, prediction = model.verify_files(enrolled_path, reference_path)
            result = "Same speaker" if score > 0.75 else "Different speaker"
            # print(f'Result: {result} (Score: {score})')
            # return f'Result: {result} (Score: {score})'
            return jsonify({"result": result})
        except Exception as e:
            os.remove(enrolled_path)
            return f'Error: {e}'

if __name__ == '__main__':
    app.run(debug=True)