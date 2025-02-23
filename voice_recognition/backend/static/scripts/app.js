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

  // Mark recognition as active on start
  hotwordRecognition.onstart = () => {
    recognitionActive = true;
  };

  // When recognition ends, mark as inactive
  hotwordRecognition.onend = () => {
    recognitionActive = false;
  };

  // On error, mark as inactive
  hotwordRecognition.onerror = (err) => {
    console.warn("Recognition error:", err);
    recognitionActive = false;
  };

  // Helper: speak text, then run a callback after speech finishes.
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

  // For prompts without a callback
  function speak(text) {
    speakThen(text, null);
  }

  // Fetch saved email from cookies (if present)
  const savedEmailCookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("saved_email="));
  const savedEmail = savedEmailCookie ? savedEmailCookie.split("=")[1] : null;

  if (savedEmail) {
    // If an email is already stored, skip straight to voice recording steps
    emailInput.value = savedEmail;
    statusEl.textContent = `Using saved email: ${savedEmail}`;
    conversationStep = 3; 
    speak("We have your email on file. Say record to start voice recording.");
  } else {
    // If no email is saved, do your normal prompt
    hotwordRecognition.start();
    speak("Waiting for hello indu.");
  }

  function sanitizeEmail(input) {
    // Allow letters, digits, underscores, dots, and @
    // Remove everything else
    let sanitized = input.replace(/[^a-zA-Z0-9_.@]/g, "");
    // Remove trailing dot if present
    if (sanitized.endsWith(".")) {
      sanitized = sanitized.slice(0, -1);
    }
    return sanitized;
  }

  hotwordRecognition.onresult = (e) => {
    let text = e.results[e.results.length - 1][0].transcript.toLowerCase().trim();

    // 0) Listen for activation phrase
    if (text.includes("hello indu") && conversationStep === 0) {
      conversationStep = 1;
      speak("Please say your email.");
      statusEl.textContent = "Please say your email.";
      return;
    }

    // 1) Get email from user
    if (conversationStep === 1) {
      // Sanitize the captured text
      const sanitizedEmail = sanitizeEmail(text);
      emailInput.value = sanitizedEmail;
      statusEl.textContent = `Email captured: ${sanitizedEmail}`;
      console.log("Email captured:", sanitizedEmail);

      // Ask user to confirm email
      conversationStep = 2;
      speak(`Your email is: ${sanitizedEmail}. Do you confirm? Say confirm or cancel.`);
      return;
    }

    // 2) Confirm or re-enter email
    if (conversationStep === 2 && text.includes("confirm")) {
      conversationStep = 3;
      speak("Say record to start voice recording. We will capture five seconds automatically.");
      return;
    } else if (conversationStep === 2 && (text.includes("cancel")|| text.includes("no"))) {
      conversationStep = 1;
      speak("Okay, please say your email again.");
      return;
    }

    // 3) Wait for user to say "record" (we’ll stop automatically after 5s)
    if (conversationStep === 3 && text.includes("record")) {
      statusEl.textContent = "Recording audio...";
      speakThen("Recording started for five seconds. Please speak now.", () => {
        startRecording();
      });
      return;
    }

    // 4) Capture face
    if (conversationStep === 4 && text.includes("capture face")) {
      statusEl.textContent = "Starting camera...";
      speakThen("Camera started. Say snapshot to capture your face.", () => {
        startCamera();
      });
      return;
    } else if (conversationStep === 4 && text.includes("snapshot") && cameraStream) {
      stopCameraAndCapture();
      conversationStep = 5;
      speak("Face captured. Shall I submit? Say confirm or cancel.");
      return;
    }

    // 5) Submit or cancel
    if (conversationStep === 5 && text.includes("confirm")) {
      submitForm();
    } else if (conversationStep === 5 && text.includes("cancel")) {
      speak("Cancelled. Waiting for hello indu.");
      statusEl.textContent = "Cancelled.";
      conversationStep = 0;
    }
  };

  function startRecording() {
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
        speak("Voice captured. Next, say capture face to take a photo.");
      };

      mediaRecorder.start();
      // Automatically stop after 5 seconds
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
      }, 5000);
    });
  }

  function startCamera() {
    navigator.mediaDevices.getUserMedia({ video: true }).then((str) => {
      cameraStream = str;
      camera.srcObject = str;
      camera.hidden = false;
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
          // Store the user’s email in a cookie for future sessions
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
