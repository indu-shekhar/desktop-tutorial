class ApiService {
  static getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
  }

  static async login(formData) {
    const response = await fetch("/login", { method: "POST", body: formData });
    return response.json();
  }

  static async sendVoiceCommand(formData) {
    const token = this.getCookie("access_token");
    const response = await fetch("/process_command", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    return response.json();
  }
}

class MediaRecorderService {
  constructor(onStopCallback) {
    this.mediaRecorder = null;
    this.chunks = [];
    this.onStopCallback = onStopCallback;
  }

  startRecording(stream) {
    this.mediaRecorder = new MediaRecorder(stream);
    this.chunks = [];
    this.mediaRecorder.ondataavailable = (event) => this.chunks.push(event.data);
    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.chunks, { type: "audio/wav" });
      this.onStopCallback(blob);
    };
    this.mediaRecorder.start();
    console.log("Recording started.");
  }

  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.stop();
    }
  }
}

class SpeechService {
  constructor(onResult) {
    this.recognitionActive = false;
    this.onResult = onResult;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech Recognition API not supported.");
      return;
    }
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = false;

    this.recognition.onstart = () => {
      this.recognitionActive = true;
      console.log("Speech recognition started.");
    };

    this.recognition.onend = () => {
      this.recognitionActive = false;
      console.log("Speech recognition ended.");
    };

    this.recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
    };

    this.recognition.onresult = this.onResult;
  }

  start() {
    if (this.recognition && !this.recognitionActive) {
      try {
        this.recognition.start();
      } catch (e) {
        console.error("Error starting speech recognition:", e);
      }
    }
  }

  stop() {
    if (this.recognition && this.recognitionActive) {
      this.recognition.stop();
    }
  }

  speak(text, onEndCallback) {
    // Ensure recognition is stopped before speaking to prevent a feedback loop.
    this.stop();

    // A brief delay to allow the recognition service to fully stop.
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => {
        console.log("Speech synthesis finished.");
        if (onEndCallback) {
          onEndCallback();
        }
      };
      window.speechSynthesis.speak(utterance);
    }, 250); // 250ms delay
  }
}
