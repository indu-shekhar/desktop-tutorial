// // Elements from the HTML
// const recordBtn = document.getElementById("record-btn");
// const stopBtn = document.getElementById("stop-btn");
// const audioPlayer = document.getElementById("player");
// const audioFileInput = document.getElementById("audio-file");
// const form = document.getElementById("registration-form");

// let mediaRecorder;
// let audioChunks = [];

// // Function to handle recording start
// recordBtn.addEventListener("click", async () => {
//     // Request permission to access the microphone
//     const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

//     // Create a new MediaRecorder object
//     mediaRecorder = new MediaRecorder(stream);
//     audioChunks = [];

//     // When data is available, push it to the audioChunks array
//     mediaRecorder.ondataavailable = (event) => {
//         audioChunks.push(event.data);
//     };

//     // When the recording stops, create an audio file
//     mediaRecorder.onstop = () => {
//         const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
//         const audioUrl = URL.createObjectURL(audioBlob);

//         // Load the recorded audio into the audio player
//         audioPlayer.src = audioUrl;

//         // Convert the audioBlob to a file and set it to the hidden input field
//         const audioFile = new File([audioBlob], "voice_recording.wav", { type: Blob.type });
//         const dataTransfer = new DataTransfer();
//         dataTransfer.items.add(audioFile);
//         audioFileInput.files = dataTransfer.files;
//     };

//     // Start recording
//     mediaRecorder.start();

//     // Disable the record button and enable the stop button
//     recordBtn.disabled = true;
//     stopBtn.disabled = false;
// });

// // Function to handle recording stop
// stopBtn.addEventListener("click", () => {
//     // Stop the recording
//     mediaRecorder.stop();

//     // Enable the record button and disable the stop button
//     recordBtn.disabled = false;
//     stopBtn.disabled = true;
// });

// // Prevent form submission if audio is not recorded
// form.addEventListener("submit", (event) => {
//     if (audioFileInput.files.length === 0) {
//         event.preventDefault();
//         alert("Please record your voice before submitting the form.");
//     }
// });

// Initialize variables to store audio chunks and the media recorder
let chunks = [];
let mediaRecorder;

// Get references to the HTML elements
const recordBtn = document.getElementById("record-btn");
const stopBtn = document.getElementById("stop-btn");
const audioPlayer = document.getElementById("player");
const audioInput = document.getElementById("audio-file");

// Hide the audio player initially
audioPlayer.style.display = "none";

// Add event listener to the record button
recordBtn.addEventListener("click", async () => {
  // Request access to the user's microphone
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  // Initialize the media recorder with the audio stream
  mediaRecorder = new MediaRecorder(stream);

  // Event handler for when audio data is available
  mediaRecorder.ondataavailable = (e) => {
    chunks.push(e.data);
  };

  // Event handler for when recording stops
  mediaRecorder.onstop = () => {
    // Create a blob from the recorded audio chunks
    const blob = new Blob(chunks, { type: "audio/wav" });
    chunks = [];
    // Create a URL for the audio blob and set it as the source for the audio player
    const audioURL = URL.createObjectURL(blob);
    audioPlayer.src = audioURL;

    // Create a file from the audio blob and set it as the input file for the form
    const file = new File([blob], "enrolled_audio.wav", { type: blob.type });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    audioInput.files = dataTransfer.files;
  };

  // Start recording
  mediaRecorder.start();
  // Disable the record button and enable the stop button
  recordBtn.disabled = true;
  stopBtn.disabled = false;
});

// Add event listener to the form submission
document
  .getElementById("registration-form")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    // Create a FormData object and append the audio file
    var formData = new FormData();
    var fileInput = document.getElementById("audio-file");
    var email=document.getElementById("email").value;
    var user_id=document.getElementById("user_id").value;
    formData.append("audio-file", fileInput.files[0]);
    formData.append("email",email);
    formData.append("user_id",user_id);

    // Log whether the audio file is attached to the form
    if (fileInput.files.length > 0) {
        console.log("Audio file attached to the form.");
    } else {
        console.log("No audio file attached to the form.");
    }
    //Send the form data to the server using fetch
    fetch("/register", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        // Display the result or error message
        if (data.error) {
          document.getElementById("result").innerText = data.error;
        } else {
            document.getElementById("result").innerText = data.message;
        //   document.getElementById(
        //     "result"
        //   ).innerText = `An error occurred while processing the file${data.result}`;
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        document.getElementById("result").innerText =
          "An error occurred while processing the file";
      });
  });

// Add event listener to the stop button
stopBtn.addEventListener("click", () => {
  // Stop the recording
  mediaRecorder.stop();
  // Enable the record button and disable the stop button
  recordBtn.disabled = false;
  stopBtn.disabled = true;
  // Show the audio player
  audioPlayer.style.display = "block";
});
