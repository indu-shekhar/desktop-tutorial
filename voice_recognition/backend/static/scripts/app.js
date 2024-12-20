let chunks = [];
let mediaRecorder;

const recordBtn = document.getElementById("record-btn");
const stopBtn = document.getElementById("stop-btn");
const audioPlayer = document.getElementById("player");
const audioInput = document.getElementById("audio-file");

audioPlayer.style.display = "none";

recordBtn.addEventListener("click", async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  mediaRecorder = new MediaRecorder(stream);

  mediaRecorder.ondataavailable = (e) => {
    chunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(chunks, { type: "audio/wav" });
    chunks = [];

    const audioURL = URL.createObjectURL(blob);
    audioPlayer.src = audioURL;

    const file = new File([blob], "enrolled_audio.wav", { type: blob.type });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    audioInput.files = dataTransfer.files;
  };

  mediaRecorder.start();

  recordBtn.disabled = true;
  stopBtn.disabled = false;
});

document
  .getElementById("upload-form")
  .addEventListener("submit", async function (event) {
    event.preventDefault();

    var formData = new FormData();
    var fileInput = document.getElementById("audio-file");
    var email = document.getElementById("email").value;
    formData.append("email", email);
    formData.append("audio-file", fileInput.files[0]);
    try {
      const response = await fetch("/login", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.access_token) {
        document.cookie = `access_token=${data.access_token};path=/;`;
        window.location.href = "/secret";
        return;
      } else if (response.status === 401) {
        document.getElementById("result").innerText =
          data.result || "Authentication failed";
      } else {
        document.getElementById("result").innerText = "Unknown error occurred";
      }
    } catch (error) {
      console.error("Error:", error);
      document.getElementById("result").innerText =
        "An error occurred while processing your request.";
    }
  });

stopBtn.addEventListener("click", () => {
  mediaRecorder.stop();

  recordBtn.disabled = false;
  stopBtn.disabled = true;

  audioPlayer.style.display = "block";
});
