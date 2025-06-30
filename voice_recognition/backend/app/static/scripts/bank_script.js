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
      console.log(`Transitioning from ${this.state} to ${newState}`);
      this.state = newState;

      switch (this.state) {
        case BankAppState.AWAITING_ACTIVATION:
          output.textContent = "Say 'hello bank' to begin.";
          this.speechService.start();
          break;
        case BankAppState.LISTENING_FOR_COMMAND:
          this.speechService.speak("I'm listening for your command.", () => {
            this.recorderService.startRecording(this.stream);
            this.speechService.start();
          });
          break;
        case BankAppState.PROCESSING:
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
    }

    async handleRecordingStop(blob) {
      const formData = new FormData();
      formData.append("command", this.userCommand);
      formData.append("voice_sample", blob, "command.wav");

      try {
        const data = await ApiService.sendVoiceCommand(formData);
        this.handleApiResponse(data);
      } catch (error) {
        this.handleApiError(error);
      }
    }

    handleApiResponse(data) {
      this.transitionToState(BankAppState.PRESENTING);
      let messageToSpeak = "I could not process that request.";

      if (data.error) {
        messageToSpeak = `Error: ${data.error}`;
        output.textContent = messageToSpeak;
      } else if (data.balance !== undefined) {
        messageToSpeak = `Your balance is $${data.balance.toFixed(2)}`;
        output.textContent = messageToSpeak;
      } else if (data.transactions) {
        messageToSpeak = "Here are your recent transactions.";
        this.displayTransactions(data.transactions);
      } else {
        messageToSpeak = data.message;
        output.textContent = messageToSpeak;
      }

      this.speechService.speak(messageToSpeak, () => {
        this.resetActivation();
      });
    }

    handleApiError(error) {
      this.transitionToState(BankAppState.PRESENTING);
      console.error("API Error:", error);
      const message = "Sorry, there was an error connecting to the server.";
      output.textContent = message;
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
