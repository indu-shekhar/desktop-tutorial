from pydub import AudioSegment
from flask import Flask, render_template, request, redirect, url_for, jsonify
from speechbrain.inference import SpeakerRecognition
import os

app = Flask(__name__, template_folder='../templates')


model = SpeakerRecognition.from_hparams(source="speechbrain/spkrec-ecapa-voxceleb", savedir="pretrained_model")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    
    

    
    
    
    if 'audio-file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['audio-file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file:
        
        
        upload_folder = os.path.join(app.root_path, '../uploaded_files')
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder)

        enrolled_path = os.path.join(upload_folder, file.filename)
        file.save(enrolled_path)
        

        
        reference_path = '../uploaded_files/reference_voice.wav'
        enrolled_path = "../uploaded_files/enrolled_audio.wav"
        
        
        try:
            sound=AudioSegment.from_file(enrolled_path)
            sound.export(enrolled_path, format="wav")
            
            score, prediction = model.verify_files(enrolled_path, reference_path)
            result = "Same speaker" if score > 0.75 else "Different speaker"
            
            
            return jsonify({"result": result})
        except Exception as e:
            os.remove(enrolled_path)
            return f'Error: {e}'

if __name__ == '__main__':
    app.run(debug=True)