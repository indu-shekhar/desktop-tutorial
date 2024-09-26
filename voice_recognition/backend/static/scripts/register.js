// Elements from the HTML
const recordBtn = document.getElementById("record-btn");
const stopBtn = document.getElementById("stop-btn");
const audioPlayer = document.getElementById("player");
const audioFileInput = document.getElementById("audio-file");
const form = document.getElementById("registration-form");

let mediaRecorder;
let audioChunks = [];

// Function to handle recording start
recordBtn.addEventListener("click", async () => {
    // Request permission to access the microphone
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Create a new MediaRecorder object
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    // When data is available, push it to the audioChunks array
    mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
    };

    // When the recording stops, create an audio file
    mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
        const audioUrl = URL.createObjectURL(audioBlob);

        // Load the recorded audio into the audio player
        audioPlayer.src = audioUrl;

        // Convert the audioBlob to a file and set it to the hidden input field
        const audioFile = new File([audioBlob], "voice_recording.wav", { type: "audio/wav" });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(audioFile);
        audioFileInput.files = dataTransfer.files;
    };

    // Start recording
    mediaRecorder.start();

    // Disable the record button and enable the stop button
    recordBtn.disabled = true;
    stopBtn.disabled = false;
});

// Function to handle recording stop
stopBtn.addEventListener("click", () => {
    // Stop the recording
    mediaRecorder.stop();

    // Enable the record button and disable the stop button
    recordBtn.disabled = false;
    stopBtn.disabled = true;
});

// Prevent form submission if audio is not recorded
form.addEventListener("submit", (event) => {
    if (audioFileInput.files.length === 0) {
        event.preventDefault();
        alert("Please record your voice before submitting the form.");
    }
});
