// const voiceBtn = document.getElementById("voice-btn");
// const output = document.getElementById("output");

// voiceBtn.addEventListener("click", async () => {
//     const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
//     recognition.start();
//     output.textContent = "Listening...";

//     recognition.onresult = (event) => {
//         const command = event.results[0][0].transcript;
//         output.textContent = `You said: ${command}`;
//         sendVoiceCommand(command);
//     };

//     recognition.onerror = (event) => {
//         output.textContent = `Error occurred in recognition: ${event.error}`;
//     };
// });

// async function sendVoiceCommand(command) {
//     try {
//         const response = await fetch('/process_command', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ command })
//         });
//         const data = await response.json();
//         output.textContent = data.message;
//         speak(data.message);
//     } catch (error) {
//         output.textContent = "Error communicating with the server.";
//     }
// }

// function speak(text) {
//     const synth = window.speechSynthesis;
//     const utterance = new SpeechSynthesisUtterance(text);
//     synth.speak(utterance);
// }
document.addEventListener("DOMContentLoaded", () => {
    const welcomeMessage = "Welcome to Voice Activated Banking. Press the button or press the spacebar on your keyboard to start speaking and give commands.";
    speak(welcomeMessage);
    output.textContent = welcomeMessage;
});

const voiceBtn = document.getElementById("voice-btn");
const output = document.getElementById("output");

voiceBtn.addEventListener("click", startRecognition);
document.addEventListener("keydown", (event) => {
    if (event.code === "Space") {
        startRecognition();
    }
});

function startRecognition() {
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
}

async function sendVoiceCommand(command) {
    const token = document.cookie.split('; ').find(row => row.startsWith('access_token=')).split('=')[1];
    try {
        const response = await fetch('/process_command', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
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