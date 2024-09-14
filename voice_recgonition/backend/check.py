from flask import Flask, render_template, request, redirect, url_for
from speechbrain.inference import SpeakerRecognition
import os

# Initialize SpeechBrain model
model = SpeakerRecognition.from_hparams(source="speechbrain/spkrec-ecapa-voxceleb", savedir="pretrained_model")

reference_path = 'reference_voice.wav'

# Compare the enrolled voice to the reference voice
enrolled_path = ".wav"
score, prediction = model.verify_files(enrolled_path, reference_path)
result = "Same speaker" if score > 0.75 else "Different speaker"
print(f'Result: {result} (Score: {score})')