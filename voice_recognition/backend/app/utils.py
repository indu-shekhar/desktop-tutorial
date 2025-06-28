import io
import os
import numpy as np
import face_recognition
from pydub import AudioSegment

def process_audio_file(audio_file):
    sound = AudioSegment.from_file(audio_file)
    wav_io = io.BytesIO()
    sound.export(wav_io, format="wav")
    wav_io.seek(0)
    return wav_io.read()

def process_face_image(face_image):
    face_image_path = os.path.join("temp_face.jpg")
    face_image.save(face_image_path)
    face = face_recognition.load_image_file(face_image_path)
    face_encodings = face_recognition.face_encodings(face)
    if os.path.exists(face_image_path):
        os.remove(face_image_path)
    if not face_encodings:
        return None
    return face_encodings[0]

def verify_face(known_encoding, face_image):
    face = face_recognition.load_image_file(face_image)
    face_encodings = face_recognition.face_encodings(face)
    if not face_encodings:
        return False
    face_encoding = face_encodings[0]
    match = face_recognition.compare_faces([np.array(known_encoding)], face_encoding)[0]
    return match
