from flask import Blueprint, render_template, request, jsonify
from .models import User, db
import io
import os
import tempfile
import numpy as np
import face_recognition
from .utils import process_face_image, verify_face
from .voice_auth import save_and_convert_audio, verify_voice
from flask_jwt_extended import create_access_token
import tempfile
import os

auth_bp = Blueprint('auth', __name__)

@auth_bp.route("/register", methods=["POST", "GET"])
def register():
    import logging
    if request.method == "GET":
        logging.info("[REGISTER] GET request received.")
        return render_template("register.html")
    if "audio-file" not in request.files or "face-image" not in request.files:
        logging.warning("[REGISTER] Audio file or face image missing in request.")
        return jsonify({"error": "Audio file or face image missing"}), 400

    audio_file = request.files["audio-file"]
    face_image = request.files["face-image"]
    email = request.form.get("email")
    user_id = request.form.get("user_id")

    if not audio_file.filename or not face_image.filename:
        logging.warning(f"[REGISTER] Files not selected for email: {email}")
        return jsonify({"error": "Files not selected"}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        logging.info(f"[REGISTER] Attempt to register already registered email: {email}")
        return jsonify({"error": "Email already registered"}), 400

    try:
        # Save and convert audio to 16kHz mono wav
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_audio:
            save_and_convert_audio(audio_file, tmp_audio.name)
            tmp_audio.seek(0)
            wav_data = tmp_audio.read()
        face_encoding = process_face_image(face_image)
        if face_encoding is None:
            logging.warning(f"[REGISTER] No face detected for email: {email}")
            return jsonify({"error": "No face detected"}), 400
        new_user = User(
            email=email,
            user_id=user_id,
            audio_file=wav_data,
            face_encoding=face_encoding,
        )
        db.session.add(new_user)
        db.session.commit()
        logging.info(f"[REGISTER] User registered successfully: {email}")
        return jsonify({"message": "User registered successfully!"})
    except Exception as e:
        logging.error(f"[REGISTER] Exception: {str(e)}")
        return jsonify({"error": str(e)}), 500

@auth_bp.route("/login", methods=["POST"])
def login():
    import logging
    if "audio-file" not in request.files or "face-image" not in request.files:
        logging.warning("[LOGIN] File(s) missing in request.")
        return jsonify({"error": "File(s) missing"}), 400

    audio_file = request.files["audio-file"]
    face_image = request.files["face-image"]
    email = request.form.get("email", None)
    if not email:
        email = request.cookies.get("email")
    if not email:
        logging.warning("[LOGIN] Email missing in request.")
        return jsonify({"error": "Email missing"}), 400
    if not audio_file.filename or not face_image.filename:
        logging.warning(f"[LOGIN] No file selected for email: {email}")
        return jsonify({"error": "No file selected"}), 400
    user = User.query.filter_by(email=email).first()
    if not user:
        logging.warning(f"[LOGIN] User not found: {email}")
        return jsonify({"error": "User not found"}), 404
    try:
        logging.info(f"[LOGIN] Login attempt for user: {email}")
        # Save enrolled voice to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as enrolled_tmp:
            enrolled_tmp.write(user.audio_file)
            enrolled_audio_path = enrolled_tmp.name
        # Save and convert new audio file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as input_tmp:
            save_and_convert_audio(audio_file, input_tmp.name)
            input_audio_path = input_tmp.name
        # Voice verification using pyannote
        voice_match, distance = verify_voice(enrolled_audio_path, input_audio_path)
        logging.info(f"[LOGIN] Voice verification for {email}: distance={distance:.4f}, match={voice_match}")
        if not voice_match:
            logging.warning(f"[LOGIN] Voice authentication failed for {email} (distance={distance:.4f})")
            return jsonify({"error": f"Voice authentication failed (distance={distance:.4f})"}), 401
        # Process face image
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as face_tmp:
            face_image.save(face_tmp.name)
            face_image_path = face_tmp.name
        match = verify_face(user.face_encoding, face_image_path)
        logging.info(f"[LOGIN] Face verification for {email}: match={match}")
        if not match:
            logging.warning(f"[LOGIN] Face authentication failed for {email}")
            return jsonify({"error": "Face authentication failed"}), 401
        access_token = create_access_token(identity=email)
        logging.info(f"[LOGIN] User {email} successfully logged in.")
        return jsonify({"access_token": access_token}), 200
    except Exception as e:
        logging.error(f"[LOGIN] Exception: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        for path_var in ["enrolled_audio_path", "input_audio_path", "face_image_path"]:
            if path_var in locals() and os.path.exists(locals()[path_var]):
                os.remove(locals()[path_var])
