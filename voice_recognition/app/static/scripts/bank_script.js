document.addEventListener("DOMContentLoaded", () => {
  const output = document.getElementById("output");

  const BankAppState = {
    AWAITING_ACTIVATION: "AWAITING_ACTIVATION",
    LISTENING_FOR_COMMAND: "LISTENING_FOR_COMMAND",
    PROCESSING: "PROCESSING",
    PRESENTING: "PRESENTING",
  };

  class SpeechService {
    constructor(onResult) {
      this.recognitionActive = false;
      this.onResult = onResult;

      this.recognition = new (window.SpeechRecognition ||
        window.webkitSpeechRecognition)();
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      // recognition.lang = "en-US";
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
        this.recognitionActive = false;
      };

      this.recognition.onresult = (event) => {
        this.onResult(event);
      };
    }

    start() {
      this.recognition.start();
    }

    stop() {
      this.recognition.stop();
    }

    speak(text, callback) {
      if (this.recognitionActive) {
        this.stop();
      }
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
      utterance.onend = () => {
        if (callback) callback();
        if (!this.recognitionActive) {
          this.start();
        }
      };
    }
  }

  class MediaRecorderService {
    constructor(onStop) {
      this.onStop = onStop;
      this.mediaRecorder = null;
      this.chunks = [];
    }

    startRecording(stream) {
      this.mediaRecorder = new MediaRecorder(stream);
      this.chunks = [];
      this.mediaRecorder.ondataavailable = (event) => this.chunks.push(event.data);
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: "audio/wav" });
        this.onStop(blob);
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

  class ApiService {
    static async getOtp() {
      const response = await fetch("/generate_otp", { method: "GET", credentials: "same-origin" });
      return response.json();
    }
    static async verifyOtpAudio(blob) {
      const tokenCookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("access_token="));
      let token = "";
      if (tokenCookie) token = tokenCookie.split("=")[1];
      const formData = new FormData();
      formData.append("otp_audio", blob, "otp_audio.wav");
      try {
        const response = await fetch("/verify_otp_audio", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
          credentials: "same-origin",
        });
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          return await response.json();
        } else {
          const text = await response.text();
          return { error: text };
        }
      } catch (e) {
        return { error: e.message };
      }
    }
    static async sendVoiceCommand(formData) {
      const tokenCookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("access_token="));
      let token = "";
      if (tokenCookie) token = tokenCookie.split("=")[1];

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


class BankApp {
    constructor() {
      this.livenessRequired = false;
      this.otpText = null;
      this.otpNumeric = null;
      this.livenessBlob = null;
      this.state = BankAppState.AWAITING_ACTIVATION;
      this.userCommand = "";
      this.stream = null;

      this.speechService = new SpeechService(this.handleSpeechResult.bind(this));
      this.recorderService = new MediaRecorderService(
        this.handleRecordingStop.bind(this)
      );

      this.initialize();
    }

    async initialize() {
      try {
        // Get the media stream once and reuse it
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true },
        });
        const welcomeMessage =
          "Welcome to Voice Activated Banking. Say hello bank to begin.";
        this.speechService.speak(welcomeMessage, () => {
          this.transitionToState(BankAppState.AWAITING_ACTIVATION);
        });
      } catch (err) {
        console.error("Error initializing media devices:", err);
        output.textContent =
          "Error: Could not access microphone. Please grant permission and refresh.";
      }
    }

    transitionToState(newState) {
      // Centralized state transition with logging and cleanup
      console.log(`[STATE] Transitioning from ${this.state} to ${newState}`);
      // Clean up previous state if needed
      switch (this.state) {
        case BankAppState.LISTENING_FOR_COMMAND:
        case BankAppState.PROCESSING:
          // Always stop recognition and recording before leaving these states
          this.speechService.stop();
          this.recorderService.stopRecording();
          break;
      }
      this.state = newState;
      switch (this.state) {
        case BankAppState.AWAITING_ACTIVATION:
          output.textContent = "Say 'hello bank' to begin.";
          this.userCommand = "";
          this.livenessRequired = false;
          this.otpText = null;
          this.otpNumeric = null;
          this.lastCommandBlob = null;
          this.livenessBlob = null;
          try {
            this.speechService.start();
          } catch (e) {
            console.error('[STATE] Error starting speech recognition:', e);
          }
          break;
        case BankAppState.LISTENING_FOR_COMMAND:
          this.speechService.speak("I'm listening for your command.", () => {
            try {
              this.recorderService.startRecording(this.stream);
              this.speechService.start();
            } catch (e) {
              this.handleApiError(e);
            }
          });
          break;
        case BankAppState.PROCESSING:
          // Defensive: stop everything before processing
          this.speechService.stop();
          this.recorderService.stopRecording();
          output.textContent = "Processing your command...";
          break;
        case BankAppState.PRESENTING:
          // Listening is intentionally kept off during presentation
          this.speechService.stop();
          break;
      }
    }

    handleSpeechResult(event) {
      try {
        const results = event.results;
        const lastResult = results[results.length - 1];
        const rawText = lastResult[0].transcript;
        const text = rawText
          .toLowerCase()
          .replace(/[.,!?]/g, "")
          .trim();

        console.log("Heard:", text);
        output.textContent = `You said: ${text}`;

        if (
          this.state === BankAppState.AWAITING_ACTIVATION &&
          text.includes("hello bank")
        ) {
          this.transitionToState(BankAppState.LISTENING_FOR_COMMAND);
        } else if (this.state === BankAppState.LISTENING_FOR_COMMAND) {
          if (lastResult.isFinal) {
            this.userCommand = text;
            this.transitionToState(BankAppState.PROCESSING);
          }
        }

        // Liveliness/OTP: If waiting for OTP and user finished speaking, stop recorder to send OTP audio
        if (this.livenessRequired && lastResult.isFinal) {
          console.log('[BankApp] OTP speech recognized, stopping MediaRecorder...');
          this.recorderService.stopRecording(); // triggers handleRecordingStop() with OTP
          this.transitionToState(BankAppState.PROCESSING);
        }
      } catch (e) {
        this.handleApiError(e);
      }
    }

    async handleRecordingStop(blob) {
      console.log('[BankApp] handleRecordingStop called. livenessRequired:', this.livenessRequired);
      // If in liveness/OTP mode, send OTP audio to backend and after success, send command
      if (this.livenessRequired) {
        console.log('[BankApp] Sending OTP audio to backend for verification...');
        // This is the OTP/liveness audio
        try {
          // Send OTP audio to backend for verification
          const verifyRes = await ApiService.verifyOtpAudio(blob);
          console.log('[BankApp] OTP backend response:', verifyRes);
          if (verifyRes.success) {
            this.livenessRequired = false;
            this.otpText = null;
            this.otpNumeric = null;
            // Now re-send the original command and voice sample (the one before OTP)
            if (this.lastCommandBlob && this.userCommand) {
              console.log('[BankApp] Resending original command after OTP success.');
              const formData = new FormData();
              formData.append("command", this.userCommand);
              formData.append("voice_sample", this.lastCommandBlob, "command.wav");
              try {
                const data = await ApiService.sendVoiceCommand(formData);
                console.log('[BankApp] Command backend response after OTP:', data);
                this.handleApiResponse(data);
              } catch (error) {
                console.error('[BankApp] Error sending command after OTP:', error);
                this.handleApiError(error);
              }
            } else {
              // fallback: ask user to repeat command
              console.warn('[BankApp] No lastCommandBlob or userCommand found after OTP. Asking user to repeat.');
              this.speechService.speak("Liveness check passed. Please repeat your command.", () => {
                this.transitionToState(BankAppState.LISTENING_FOR_COMMAND);
              });
            }
          } else {
            console.warn('[BankApp] Liveness check failed:', verifyRes);
            this.speechService.speak("Liveness check failed. Please try again.", () => {
              this.resetActivation();
            });
          }
        } catch (error) {
          console.error('[BankApp] Error during OTP verification:', error);
          this.handleApiError(error);
        }
        return;
      }
      // Normal command flow: record and store the command audio for possible reuse after OTP
      this.lastCommandBlob = blob;
      const formData = new FormData();
      formData.append("command", this.userCommand);
      formData.append("voice_sample", blob, "command.wav");
      try {
        console.log('[BankApp] Sending command to backend...');
        const data = await ApiService.sendVoiceCommand(formData);
        console.log('[BankApp] Command backend response:', data);
        if (data.liveness_required) {
          // Liveliness/OTP required
          this.livenessRequired = true;
          this.otpText = data.otp_text;
          this.otpNumeric = data.otp_numeric;
          console.log('[BankApp] Liveliness required. Prompting for OTP:', this.otpText);
          this.speechService.speak(
            `For security, please repeat the following code: ${this.otpText}`,
            () => {
              this.recorderService.startRecording(this.stream);
            }
          );
        } else {
          this.handleApiResponse(data);
        }
      } catch (error) {
        console.error('[BankApp] Error sending command:', error);
        this.handleApiError(error);
      }
    }

    async sendCommandWithLiveness() {
      // After liveness/OTP is verified, re-send the original command and voice sample
      if (this.livenessBlob && this.userCommand) {
        const formData = new FormData();
        formData.append("command", this.userCommand);
        formData.append("voice_sample", this.livenessBlob, "command.wav");
        try {
          const data = await ApiService.sendVoiceCommand(formData);
          this.handleApiResponse(data);
        } catch (error) {
          this.handleApiError(error);
        }
      } else {
        // fallback: ask user to repeat command
        this.speechService.speak("Liveness check passed. Please repeat your command.", () => {
          this.transitionToState(BankAppState.LISTENING_FOR_COMMAND);
        });
      }
    }

    handleApiResponse(data) {
      // Robust: always go to PRESENTING, then reset
      this.transitionToState(BankAppState.PRESENTING);
      let messageToSpeak = "I could not process that request.";
      try {
        if (data.error) {
          messageToSpeak = `Error: ${data.error}`;
          output.textContent = messageToSpeak;
        } else if (data.balance !== undefined) {
          messageToSpeak = `Your balance is $${data.balance.toFixed(2)}`;
          output.textContent = messageToSpeak;
        } else if (data.transactions) {
          messageToSpeak = "Here are your recent transactions.";
          this.displayTransactions(data.transactions);
        } else if (data.message) {
          messageToSpeak = data.message;
          output.textContent = messageToSpeak;
        }
      } catch (e) {
        messageToSpeak = "Sorry, an error occurred while processing the response.";
        output.textContent = messageToSpeak;
        console.error('[BankApp] Error in handleApiResponse:', e);
      }
      this.speechService.speak(messageToSpeak, () => {
        this.resetActivation();
      });
    }

    handleApiError(error) {
      // Robust: always go to PRESENTING, then reset
      this.transitionToState(BankAppState.PRESENTING);
      let message = "Sorry, there was an error connecting to the server.";
      if (error && error.message) {
        message = `Error: ${error.message}`;
      } else if (typeof error === 'string') {
        message = error;
      }
      output.textContent = message;
      console.error("[BankApp] API Error:", error);
      this.speechService.speak(message, () => {
        this.resetActivation();
      });
    }

    displayTransactions(transactions) {
      const tableElement = document.getElementById("transactionTable");
      const tableBody = document.getElementById("transactionBody");

      tableBody.innerHTML = "";
      transactions.forEach((transaction) => {
        tableBody.innerHTML += this.formatTransactionRow(transaction);
      });

      tableElement.classList.remove("hidden");
      tableElement.classList.add("animate-fade-in");
      output.textContent = "Here are your recent transactions:";
    }

    formatTransactionRow(transaction) {
      const date = new Date(transaction.timestamp);
      const formattedDate = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const typeColor =
        transaction.transaction_type.toLowerCase() === "credit"
          ? "text-green-400"
          : "text-red-400";

      return `
          <tr class="transition-colors hover:bg-blue-900/20">
              <td class="px-6 py-4 whitespace-nowrap text-sm">${formattedDate}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm ${typeColor} font-medium">
                  ${transaction.transaction_type}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                  $${transaction.amount.toFixed(2)}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-900/50 text-blue-400">
                      Completed
                  </span>
              </td>
          </tr>
      `;
    }

    resetActivation() {
      this.transitionToState(BankAppState.AWAITING_ACTIVATION);
    }
  }

  new BankApp();
});
