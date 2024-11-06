const voiceBtn = document.getElementById("voice-btn");
const output = document.getElementById("output");

voiceBtn.addEventListener("click", async () => {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.start();
    output.textContent = "Listening...";

    recognition.onresult = (event) => {
        const command = event.results[0][0].transcript;
        output.textContent = `You said: ${command}`;
        sendVoiceCommand(command);
    };

    recognition.onerror = (event) => {
        output.textContent = `Error occurred in recognition: ${event.error}`;
    };
});

async function sendVoiceCommand(command) {
    try {
        const response = await fetch('/process_command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command })
        });
        const data = await response.json();
        output.textContent = data.message;
        speak(data.message);
    } catch (error) {
        output.textContent = "Error communicating with the server.";
    }
}

function speak(text) {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    synth.speak(utterance);
}