from flask import Blueprint, render_template, request, jsonify
from .models import User, db
from .utils import process_audio_file, process_face_image, verify_face
import io
import os
import tempfile
import numpy as np
import face_recognition
from flask_jwt_extended import create_access_token

auth_bp = Blueprint('auth', __name__)

@auth_bp.route("/register", methods=["POST", "GET"])
def register():
    if request.method == "GET":
        return render_template("register.html")
    if "audio-file" not in request.files or "face-image" not in request.files:
        return jsonify({"error": "Audio file or face image missing"}), 400

    audio_file = request.files["audio-file"]
    face_image = request.files["face-image"]
    email = request.form.get("email")
    user_id = request.form.get("user_id")

    if not audio_file.filename or not face_image.filename:
        return jsonify({"error": "Files not selected"}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"error": "Email already registered"}), 400

    try:
        wav_data = process_audio_file(audio_file)
        face_encoding = process_face_image(face_image)
        if face_encoding is None:
            return jsonify({"error": "No face detected"}), 400
        new_user = User(
            email=email,
            user_id=user_id,
            audio_file=wav_data,
            face_encoding=face_encoding,
        )
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"message": "User registered successfully!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route("/login", methods=["POST"])
def login():
    if "audio-file" not in request.files or "face-image" not in request.files:
        return jsonify({"error": "File(s) missing"}), 400

    audio_file = request.files["audio-file"]
    face_image = request.files["face-image"]
    email = request.form.get("email", None)
    if not email:
        email = request.cookies.get("email")
    if not email:
        return jsonify({"error": "Email missing"}), 400
    if not audio_file.filename or not face_image.filename:
        return jsonify({"error": "No file selected"}), 400
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    try:
        # Load enrolled voice from DB
        enrolled_audio = io.BytesIO(user.audio_file)
        enrolled_audio.seek(0)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as enrolled_tmp:
            enrolled_tmp.write(enrolled_audio.read())
            temp_audio_path = enrolled_tmp.name
        # Process new audio file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as input_tmp:
            from pydub import AudioSegment
            sound = AudioSegment.from_file(audio_file)
            sound.export(input_tmp.name, format="wav")
            input_audio_path = input_tmp.name
        # Voice verification (to be implemented in intent.py for shared use)
        # Process face image
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as face_tmp:
            face_image.save(face_tmp.name)
            face_image_path = face_tmp.name
        match = verify_face(user.face_encoding, face_image_path)
        if not match:
            return jsonify({"error": "Face authentication failed"}), 401
        access_token = create_access_token(identity=email)
        return jsonify({"access_token": access_token}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        for path_var in ["temp_audio_path", "input_audio_path", "face_image_path"]:
            if path_var in locals() and os.path.exists(locals()[path_var]):
                os.remove(locals()[path_var])
