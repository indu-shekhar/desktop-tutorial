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
