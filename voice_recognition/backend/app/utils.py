
import io
import os
import numpy as np
import face_recognition
from pydub import AudioSegment
import random
import re

OTP_DIGIT_WORDS = {
    '0': 'zero',
    '1': 'one',
    '2': 'two',
    '3': 'three',
    '4': 'four',
    '5': 'five',
    '6': 'six',
    '7': 'seven',
    '8': 'eight',
    '9': 'nine',
}

def generate_otp_phrase(num_digits=4):
    digits = [str(random.randint(0, 9)) for _ in range(num_digits)]
    numeric = ''.join(digits)
    text = ' '.join([OTP_DIGIT_WORDS[d] for d in digits])
    return numeric, text

def normalize_otp_text(text):
    # Remove all spaces, punctuation, and lowercase
    return re.sub(r'[^a-zA-Z0-9]', '', text).lower()

def fuzzy_otp_match(expected_numeric, expected_text, recognized_text):
    # Normalize all
    norm_rec = normalize_otp_text(recognized_text)
    norm_num = normalize_otp_text(expected_numeric)
    norm_txt = normalize_otp_text(expected_text)
    # Check direct match
    if norm_rec == norm_num or norm_rec == norm_txt:
        return True
    # Fuzzy: allow up to 1 char difference
    from difflib import SequenceMatcher
    ratio_num = SequenceMatcher(None, norm_rec, norm_num).ratio()
    ratio_txt = SequenceMatcher(None, norm_rec, norm_txt).ratio()
    # Accept if at least 85% match and at least 3 chars in common
    return (ratio_num > 0.85 and len(norm_rec) >= 3 and len(norm_num) >= 3) or (ratio_txt > 0.85 and len(norm_rec) >= 3 and len(norm_txt) >= 3)

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
