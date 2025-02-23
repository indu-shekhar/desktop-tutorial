document.addEventListener("DOMContentLoaded", () => {
  const statusEl = document.getElementById("status");
  const resultEl = document.getElementById("result");
  const uploadForm = document.getElementById("upload-form");
  const emailInput = document.getElementById("email");
  const audioInput = document.getElementById("audio-file");
  const faceInput = document.getElementById("face-image");
  const player = document.getElementById("player");
  const camera = document.getElementById("camera");
  const snapshot = document.getElementById("snapshot");
  const facePreview = document.getElementById("face-preview");

  let conversationStep = 0;
  let mediaRecorder;
  let chunks = [];
  let cameraStream;

  let recognitionActive = false; 
  const hotwordRecognition =
    new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  hotwordRecognition.continuous = true;
  hotwordRecognition.interimResults = false;

  hotwordRecognition.onstart = () => {
    recognitionActive = true;
  };

  hotwordRecognition.onend = () => {
    recognitionActive = false;
  };

  hotwordRecognition.onerror = (err) => {
    console.warn("Recognition error:", err);
    recognitionActive = false;
  };

  function speakThen(text, callback) {
    if (recognitionActive) {
      hotwordRecognition.stop();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => {
      if (callback) callback();
      if (!recognitionActive) {
        hotwordRecognition.start();
      }
    };
    speechSynthesis.speak(utterance);
  }

  function speak(text) {
    speakThen(text, null);
  }

  const savedEmailCookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("saved_email="));
  const savedEmail = savedEmailCookie ? savedEmailCookie.split("=")[1] : null;

  if (savedEmail) {
    emailInput.value = savedEmail;
    statusEl.textContent = `Using saved email: ${savedEmail}`;
    conversationStep = 3; 
    speak("We have your email on file. Starting voice recording.");
    startRecording();
  } else {
    hotwordRecognition.start();
    speak("Waiting for hello indu.");
  }

  function sanitizeEmail(input) {
    let sanitized = input.replace(/[^a-zA-Z0-9_.@]/g, "");
    if (sanitized.endsWith(".")) {
      sanitized = sanitized.slice(0, -1);
    }
    return sanitized;
  }

  hotwordRecognition.onresult = (e) => {
    let text = e.results[e.results.length - 1][0].transcript.toLowerCase().trim();

    if (text.includes("hello indu") && conversationStep === 0) {
      conversationStep = 1;
      if (savedEmail) {
        speak("Starting voice recording.");
        startRecording();
      } else {
        speak("Please say your email.");
        statusEl.textContent = "Please say your email.";
      }
      return;
    }

    if (conversationStep === 1) {
      const sanitizedEmail = sanitizeEmail(text);
      emailInput.value = sanitizedEmail;
      statusEl.textContent = `Email captured: ${sanitizedEmail}`;
      console.log("Email captured:", sanitizedEmail);

      conversationStep = 2;
      speak(`Your email is: ${sanitizedEmail}. Do you confirm? Say confirm or cancel.`);
      return;
    }

    if (conversationStep === 2 && text.includes("confirm")) {
      conversationStep = 3;
      speak("Starting voice recording.");
      startRecording();
      return;
    } else if (conversationStep === 2 && (text.includes("cancel") || text.includes("no"))) {
      conversationStep = 1;
      speak("Okay, please say your email again.");
      return;
    }

    if (conversationStep === 4 && text.includes("confirm")) {
      submitForm();
    } else if (conversationStep === 4 && text.includes("cancel")) {
      speak("Cancelled. Waiting for hello indu.");
      statusEl.textContent = "Cancelled.";
      conversationStep = 0;
    }
  };

  function startRecording() {
    speakThen("Starting voice recording.", () => {
      navigator.mediaDevices.getUserMedia({ audio: true }).then((str) => {
        mediaRecorder = new MediaRecorder(str);
        chunks = [];
        mediaRecorder.ondataavailable = (evt) => chunks.push(evt.data);
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: "audio/wav" });
          const file = new File([blob], "login_audio.wav", { type: blob.type });
          const dt = new DataTransfer();
          dt.items.add(file);
          audioInput.files = dt.files;
          statusEl.textContent = "Voice captured!";
          conversationStep = 4;
          speakThen("Voice captured. Starting camera to take a photo.", startCamera);
        };

        mediaRecorder.start();
        setTimeout(() => {
          if (mediaRecorder.state === "recording") {
            mediaRecorder.stop();
          }
        }, 5000);
      });
    });
  }

  function startCamera() {
    navigator.mediaDevices.getUserMedia({ video: true }).then((str) => {
      cameraStream = str;
      camera.srcObject = str;
      camera.hidden = false;
      speakThen("Camera started. Taking snapshot.", () => {
        stopCameraAndCapture();
      });
    });
  }

  function stopCameraAndCapture() {
    const ctx = snapshot.getContext("2d");
    snapshot.width = camera.videoWidth;
    snapshot.height = camera.videoHeight;
    ctx.drawImage(camera, 0, 0, snapshot.width, snapshot.height);

    const dataURL = snapshot.toDataURL("image/png");
    facePreview.src = dataURL;
    facePreview.hidden = false;
    camera.hidden = true;
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }
    fetch(dataURL)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], "login_face_image.png", { type: "image/png" });
        const dt = new DataTransfer();
        dt.items.add(file);
        faceInput.files = dt.files;
        speak("Face captured. Shall I submit? Say confirm or cancel.");
      });
  }

  function submitForm() {
    speak("Submitting form. Please wait.");
    statusEl.textContent = "Submitting form...";

    const formData = new FormData(uploadForm);
    fetch("/login", { method: "POST", body: formData })
      .then((resp) => resp.json())
      .then((data) => {
        if (data.access_token) {
          const currentEmail = emailInput.value;
          document.cookie = `saved_email=${currentEmail};path=/;`;
          document.cookie = `access_token=${data.access_token};path=/;`;

          speak("Login successful. Redirecting.");
          window.location.href = "/secret";
        } else if (data.error) {
          speak("Error: " + data.error);
          resultEl.textContent = data.error;
        } else {
          speak("Unknown error occurred.");
          resultEl.textContent = "Unknown error.";
        }
      })
      .catch(() => {
        speak("Server error.");
        resultEl.textContent = "Server error.";
      })
      .finally(() => {
        conversationStep = 0;
      });
  }
});
