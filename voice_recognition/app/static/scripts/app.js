document.addEventListener("DOMContentLoaded", () => {
  const statusEl = document.getElementById("status");
  const resultEl = document.getElementById("result");
  const uploadForm = document.getElementById("upload-form");
  const emailInput = document.getElementById("email");
  const audioInput = document.getElementById("audio-file");
  const faceInput = document.getElementById("face-image");
  const camera = document.getElementById("camera");
  const snapshot = document.getElementById("snapshot");
  const facePreview = document.getElementById("face-preview");

  const AuthAppState = {
    AWAITING_ACTIVATION: "AWAITING_ACTIVATION",
    AWAITING_EMAIL: "AWAITING_EMAIL",
    CONFIRMING_EMAIL: "CONFIRMING_EMAIL",
    RECORDING_VOICE: "RECORDING_VOICE",
    CAPTURING_FACE: "CAPTURING_FACE",
    AWAITING_SUBMISSION: "AWAITING_SUBMISSION",
    SUBMITTING: "SUBMITTING",
    ERROR: "ERROR",
  };

  class AuthApp {
    constructor() {
      this.state = null;
      this.cameraStream = null;

      this.speechService = new SpeechService(this.handleSpeechResult.bind(this));
      this.recorderService = new MediaRecorderService(
        this.handleRecordingStop.bind(this)
      );

      this.initialize();
    }

    initialize() {
      const savedEmail = ApiService.getCookie("saved_email");
      if (savedEmail) {
        emailInput.value = savedEmail;
        this.speechService.speak(
          "Welcome back. We have your email on file. Say hello indu to begin login.",
          () => {
            this.transitionToState(AuthAppState.AWAITING_ACTIVATION);
          }
        );
      } else {
        this.speechService.speak(
          "Welcome. Please say hello indu to begin the login process.",
          () => {
            this.transitionToState(AuthAppState.AWAITING_ACTIVATION);
          }
        );
      }
    }

    transitionToState(newState) {
      console.log(`Transitioning from ${this.state} to ${newState}`);
      this.state = newState;

      switch (this.state) {
        case AuthAppState.AWAITING_ACTIVATION:
          statusEl.textContent = "Say 'Hello Indu' to start.";
          this.speechService.start();
          break;

        case AuthAppState.AWAITING_EMAIL:
          statusEl.textContent = "Please say your email address.";
          this.speechService.speak("Please say your email address.", () => {
            this.speechService.start();
          });
          break;

        case AuthAppState.CONFIRMING_EMAIL:
          this.speechService.speak(
            `Your email is: ${emailInput.value}. Do you confirm? Say confirm or cancel.`,
            () => {
              this.speechService.start();
            }
          );
          break;

        case AuthAppState.RECORDING_VOICE:
          statusEl.textContent = "Recording your voice...";
          this.speechService.speak(
            "Confirmed. Starting voice recording for 5 seconds.",
            () => {
              navigator.mediaDevices
                .getUserMedia({ audio: { echoCancellation: true } })
                .then((stream) => {
                  this.recorderService.startRecording(stream);
                  setTimeout(() => this.recorderService.stopRecording(), 5000);
                });
            }
          );
          break;

        case AuthAppState.CAPTURING_FACE:
          statusEl.textContent = "Capturing your face...";
          this.speechService.speak(
            "Voice captured. Starting camera to take a photo.",
            () => this.startCamera()
          );
          break;

        case AuthAppState.AWAITING_SUBMISSION:
          statusEl.textContent = "Ready to submit. Say 'submit' or 'cancel'.";
          this.speechService.speak(
            "Face captured. Shall I submit? Say submit or cancel.",
            () => {
              this.speechService.start();
            }
          );
          break;

        case AuthAppState.SUBMITTING:
          statusEl.textContent = "Submitting form...";
          this.speechService.speak("Submitting form. Please wait.", () => {
            this.submitForm();
          });
          break;

        case AuthAppState.ERROR:
          this.speechService.speak("An error occurred. Please try again.", () => {
            this.reset();
          });
          break;
      }
    }

    handleSpeechResult(e) {
      const text = e.results[e.results.length - 1][0].transcript
        .toLowerCase()
        .trim();
      console.log(`Heard: "${text}" in state: ${this.state}`);

      switch (this.state) {
        case AuthAppState.AWAITING_ACTIVATION:
          if (text.includes("hello indu")) {
            const savedEmail = ApiService.getCookie("saved_email");
            if (savedEmail) {
              this.transitionToState(AuthAppState.RECORDING_VOICE);
            } else {
              this.transitionToState(AuthAppState.AWAITING_EMAIL);
            }
          }
          break;

        case AuthAppState.AWAITING_EMAIL:
          const sanitizedEmail = this.sanitizeEmail(text);
          emailInput.value = sanitizedEmail;
          statusEl.textContent = `Email captured: ${sanitizedEmail}`;
          this.transitionToState(AuthAppState.CONFIRMING_EMAIL);
          break;

        case AuthAppState.CONFIRMING_EMAIL:
          if (text.includes("confirm")) {
            this.transitionToState(AuthAppState.RECORDING_VOICE);
          } else if (text.includes("cancel") || text.includes("no")) {
            this.transitionToState(AuthAppState.AWAITING_EMAIL);
          }
          break;

        case AuthAppState.AWAITING_SUBMISSION:
          if (text.includes("submit") || text.includes("confirm")) {
            this.transitionToState(AuthAppState.SUBMITTING);
          } else if (text.includes("cancel")) {
            this.reset();
          }
          break;
      }
    }

    sanitizeEmail(input) {
      return input.replace(/[^a-zA-Z0-9_.@]/g, "").replace(/\s/g, "");
    }

    handleRecordingStop(blob) {
      const file = new File([blob], "login_audio.wav", { type: blob.type });
      const dt = new DataTransfer();
      dt.items.add(file);
      audioInput.files = dt.files;
      this.transitionToState(AuthAppState.CAPTURING_FACE);
    }

    startCamera() {
      navigator.mediaDevices.getUserMedia({ video: true }).then((str) => {
        this.cameraStream = str;
        camera.srcObject = str;
        camera.hidden = false;
        // Give the camera a moment to initialize before taking a picture
        setTimeout(() => this.stopCameraAndCapture(), 1500);
      });
    }

    stopCameraAndCapture() {
      const ctx = snapshot.getContext("2d");
      snapshot.width = camera.videoWidth;
      snapshot.height = camera.videoHeight;
      ctx.drawImage(camera, 0, 0, snapshot.width, snapshot.height);

      const dataURL = snapshot.toDataURL("image/png");
      facePreview.src = dataURL;
      facePreview.hidden = false;
      camera.hidden = true;
      if (this.cameraStream) {
        this.cameraStream.getTracks().forEach((track) => track.stop());
      }
      fetch(dataURL)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], "login_face_image.png", {
            type: "image/png",
          });
          const dt = new DataTransfer();
          dt.items.add(file);
          faceInput.files = dt.files;
          this.transitionToState(AuthAppState.AWAITING_SUBMISSION);
        });
    }

    async submitForm() {
      const formData = new FormData(uploadForm);
      try {
        const data = await ApiService.login(formData);
        if (data.access_token) {
          document.cookie = `saved_email=${emailInput.value};path=/;max-age=31536000`;
          document.cookie = `access_token=${data.access_token};path=/;`;
          this.speechService.speak("Login successful. Redirecting.", () => {
            window.location.href = "/secret";
          });
        } else {
          resultEl.textContent = data.error || "Login failed.";
          this.speechService.speak(`Error: ${data.error || "Login failed."}`,
            () => {
              this.reset();
            }
          );
        }
      } catch (error) {
        resultEl.textContent = "Server error during login.";
        this.speechService.speak("A server error occurred.", () => {
          this.reset();
        });
      }
    }

    reset() {
      this.speechService.speak(
        "Process cancelled. Say hello indu to try again.",
        () => {
          this.transitionToState(AuthAppState.AWAITING_ACTIVATION);
        }
      );
    }
  }

  new AuthApp();
});
