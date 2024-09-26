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
  .getElementById("upload-form")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    // Create a FormData object and append the audio file
    var formData = new FormData();
    var fileInput = document.getElementById("audio-file");
    var email = document.getElementById("email").value;
    formData.append("email", email);
    formData.append("audio-file", fileInput.files[0]);

    //Send the form data to the server using fetch
    fetch("/login", {
      method: "POST",
      body: formData,
    })
      .then(async (response) => {
        const data = await response.json();
        // Check if there was an error
        if (data.error) {
          document.getElementById("result").innerText = data.error;
        } else if (response.ok) {
          localStorage.setItem("access_token", data.access_token);
          window.location.href = "/secret";
        } else {
          document.getElementById("result").innerText =
            "Unknown error occurred";
        }
      })
      // .then((response) => response.json())
      // .then((data) => {
      //   // Display the result or error message
      //   if (data.error) {
      //     document.getElementById("result").innerText = data.error;
      //   } else if (response.ok) {
      //     localStorage.setItem("access_token", data.access_token);
      //     window.location.href = "/secret";
      //   } else {
      //     document.getElementById(
      //       "result"
      //     ).innerText = `somewhat error unknow error what is that who nows`;
      //   }
      // })
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
