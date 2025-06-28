document.addEventListener("DOMContentLoaded", () => {
  const output = document.getElementById("output");

  let isActivated = false;
  let recognitionActive = false;
  let mediaRecorder;
  let chunks = [];

  // Create a single SpeechRecognition instance
  const recognition = new (window.SpeechRecognition ||
    window.webkitSpeechRecognition)();
  recognition.continuous = true;
  recognition.interimResults = false;
  // recognition.lang = "en-US";
  recognition.onstart = () => {
    recognitionActive = true;
    console.log("Speech recognition started.");
  };

  recognition.onend = () => {
    recognitionActive = false;
    console.log("Speech recognition ended.");
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    recognitionActive = false;
  };

  // Updated speak function
  function speak(text, callback) {
    if (recognitionActive) {
      recognition.stop();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
    utterance.onend = () => {
      if (callback) callback();
      if (!recognitionActive) {
        recognition.start();
      }
    };
  }

  function speak_voice_record(text, callback) {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
    utterance.onend = () => {
      setTimeout(() => {
        if (callback) callback();
      }, 200);
    };
  }

  function formatTransactionRow(transaction) {
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

  // Greet the user on load
  const welcomeMessage =
    "Welcome to Voice Activated Banking. Say hello bank to begin.";
  speak(welcomeMessage);
  output.textContent = welcomeMessage;

  // Handle recognized speech
  recognition.onresult = (event) => {
    const command = event.results[event.results.length - 1][0].transcript
      .trim()
      .toLowerCase();
    console.log("Heard:", command);
    output.textContent = `You said: ${command}`;

    if (!isActivated) {
      // Listen for "hi bank" to activate
      if (command.includes("hello, bank")) {
        isActivated = true;
        speak("Voice command mode activated. Please state your command now.");
      }
    } else {
      // Already activated; process command
      recognition.stop();
      recognitionActive = false;
      speak_voice_record("Recording voice sample. Please speak clearly.");
      startRecording(command);
    }
  };

  // Start recording voice sample
  function startRecording(command) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      mediaRecorder = new MediaRecorder(stream);
      chunks = [];
      mediaRecorder.ondataavailable = (event) => chunks.push(event.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/wav" });
        const file = new File([blob], "voice_sample.wav", { type: blob.type });
        sendVoiceCommand(command, file);
      };

      setTimeout(() => {
        mediaRecorder.start();
        console.log("Recording started.");
      }, 1000); // Adjust delay as needed (e.g., 500ms)
      // mediaRecorder.start();
      // Automatically stop after 3 minutes
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
      }, 10000); // 3 minutes in milliseconds
    });
  }

  // Existing functionality: identical data submission to backend
  async function sendVoiceCommand(command, voiceSample) {
    const tokenCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("access_token="));
    let token = "";
    if (tokenCookie) token = tokenCookie.split("=")[1];

    const formData = new FormData();
    formData.append("command", command);
    formData.append("voice_sample", voiceSample);

    try {
      const response = await fetch("/process_command", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const data = await response.json();

      if (data.error) {
        output.textContent = `Error: ${data.error}`;
        speak_voice_record(`Error: ${data.error}`, resetActivation);
      } else if (data.balance !== undefined) {
        const balanceMsg = `Your balance is $${data.balance.toFixed(2)}`;
        output.textContent = balanceMsg;
        speak_voice_record(balanceMsg, resetActivation);
      } else if (data.transactions) {
        // let transactionHistory = "Your last five transactions are:\n";
        // data.transactions.forEach((transaction, index) => {
        //     transactionHistory +=
        //       `${index + 1}. ${transaction.transaction_type} of $${transaction.amount.toFixed(2)} on ` +
        //       `${new Date(transaction.timestamp).toLocaleString()}\n`;
        // });
        // output.textContent = transactionHistory;
        // speak_voice_record(transactionHistory, resetActivation);
        const tableElement = document.getElementById("transactionTable");
        const tableBody = document.getElementById("transactionBody");

        // Clear previous entries
        tableBody.innerHTML = "";

        // Add new transactions
        data.transactions.forEach((transaction) => {
          tableBody.innerHTML += formatTransactionRow(transaction);
        });

        // Show table with animation
        tableElement.classList.remove("hidden");
        tableElement.classList.add("animate-fade-in");

        // Update output and speak
        output.textContent = "Here are your recent transactions:";
        speak_voice_record(
          "Here are your recent transactions. The details are displayed in a table below.",
          resetActivation
        );
      } else {
        output.textContent = data.message;
        speak_voice_record(data.message, resetActivation);
      }
    } catch (error) {
      output.textContent = "Error communicating with the server.";
      speak_voice_record(
        "Error communicating with the server.",
        resetActivation
      );
    }
  }

  function resetActivation() {
    isActivated = false;
    speak("Command complete. Say activation phrase to issue another command.");
  }
});
