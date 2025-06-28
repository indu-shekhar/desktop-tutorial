let chunks = [];
let mediaRecorder;

// Audio Recording
const recordBtn = document.getElementById("record-btn");
const stopBtn = document.getElementById("stop-btn");
const audioPlayer = document.getElementById("player");
const audioInput = document.getElementById("audio-file");

recordBtn.addEventListener("click", async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);

  mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
  mediaRecorder.onstop = () => {
    const blob = new Blob(chunks, { type: "audio/wav" });
    chunks = [];

    const audioURL = URL.createObjectURL(blob);
    audioPlayer.src = audioURL;

    const file = new File([blob], "audio.wav", { type: blob.type });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    audioInput.files = dataTransfer.files;
  };

  mediaRecorder.start();
  recordBtn.disabled = true;
  stopBtn.disabled = false;
});

stopBtn.addEventListener("click", () => {
  mediaRecorder.stop();
  recordBtn.disabled = false;
  stopBtn.disabled = true;
});

// Camera Capture
const camera = document.getElementById("camera");
const snapshot = document.getElementById("snapshot");
const facePreview = document.getElementById("face-preview");
const captureBtn = document.getElementById("capture-btn");
const faceInput = document.getElementById("face-image");

let stream;

captureBtn.addEventListener("click", async () => {
  if (!stream) {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    camera.srcObject = stream;
    camera.style.display = "block";
  } else {
    takeSnapshot();
  }
});

function takeSnapshot() {
  const context = snapshot.getContext("2d");
  snapshot.width = camera.videoWidth;
  snapshot.height = camera.videoHeight;

  context.drawImage(camera, 0, 0, snapshot.width, snapshot.height);

  const dataURL = snapshot.toDataURL("image/png");
  facePreview.src = dataURL;
  facePreview.style.display = "block";
  camera.style.display = "none";

  fetch(dataURL)
    .then((res) => res.blob())
    .then((blob) => {
      const file = new File([blob], "face_image.png", { type: "image/png" });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      faceInput.files = dataTransfer.files;

      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    });
}
// Hide the audio player initially
audioPlayer.style.display = "none";

// Add event listener to the form submission
document.getElementById("registration-form").addEventListener("submit", function (event) {
  event.preventDefault();

  // Create a FormData object and append the audio file
  var formData = new FormData();
  var fileInput = document.getElementById("audio-file");
  var email = document.getElementById("email").value;
  var user_id = document.getElementById("user_id").value;
  formData.append("audio-file", fileInput.files[0]);
  formData.append("face-image", document.getElementById("face-image").files[0]);
  formData.append("email", email);
  formData.append("user_id", user_id);

  // Log whether the audio file is attached to the form
  if (fileInput.files.length > 0) {
    console.log("Audio file attached to the form.");
  } else {
    console.log("No audio file attached to the form.");
  }

  // Send the form data to the server using fetch
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
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      document.getElementById("result").innerText = "An error occurred while processing the file";
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