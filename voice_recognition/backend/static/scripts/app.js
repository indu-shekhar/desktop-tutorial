// let chunks = [];
// let mediaRecorder;

// const recordBtn = document.getElementById("record-btn");
// const stopBtn = document.getElementById("stop-btn");
// const audioPlayer = document.getElementById("player");
// const audioInput = document.getElementById("audio-file");

// audioPlayer.style.display = "none";

// recordBtn.addEventListener("click", async () => {
//   const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

//   mediaRecorder = new MediaRecorder(stream);

//   mediaRecorder.ondataavailable = (e) => {
//     chunks.push(e.data);
//   };

//   mediaRecorder.onstop = () => {
//     const blob = new Blob(chunks, { type: "audio/wav" });
//     chunks = [];

//     const audioURL = URL.createObjectURL(blob);
//     audioPlayer.src = audioURL;

//     const file = new File([blob], "enrolled_audio.wav", { type: blob.type });
//     const dataTransfer = new DataTransfer();
//     dataTransfer.items.add(file);
//     audioInput.files = dataTransfer.files;
//   };

//   mediaRecorder.start();

//   recordBtn.disabled = true;
//   stopBtn.disabled = false;
// });

// document
//   .getElementById("upload-form")
//   .addEventListener("submit", async function (event) {
//     event.preventDefault();

//     var formData = new FormData();
//     var fileInput = document.getElementById("audio-file");
//     var email = document.getElementById("email").value;
//     formData.append("email", email);
//     formData.append("audio-file", fileInput.files[0]);
//     try {
//       const response = await fetch("/login", {
//         method: "POST",
//         body: formData,
//       });

//       const data = await response.json();

//       if (response.ok && data.access_token) {
//         document.cookie = `access_token=${data.access_token};path=/;`;
//         window.location.href = "/secret";
//         return;
//       } else if (response.status === 401) {
//         document.getElementById("result").innerText =
//           data.result || "Authentication failed";
//       } else {
//         document.getElementById("result").innerText = "Unknown error occurred";
//       }
//     } catch (error) {
//       console.error("Error:", error);
//       document.getElementById("result").innerText =
//         "An error occurred while processing your request.";
//     }
//   });

// stopBtn.addEventListener("click", () => {
//   mediaRecorder.stop();

//   recordBtn.disabled = false;
//   stopBtn.disabled = true;

//   audioPlayer.style.display = "block";
// });

document.addEventListener("DOMContentLoaded", () => {
  let chunks = [];
  let mediaRecorder;

  // Audio Recording
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

      const file = new File([blob], "login_audio.wav", { type: blob.type });
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

    audioPlayer.style.display = "block";
  });

  // Face Capture
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
        const file = new File([blob], "login_face_image.png", {
          type: "image/png",
        });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        faceInput.files = dataTransfer.files;

        stream.getTracks().forEach((track) => track.stop());
        stream = null;
      });
  }

  // Form Submission
  document
    .getElementById("upload-form")
    .addEventListener("submit", async function (event) {
      event.preventDefault();

      const formData = new FormData();
      const audioFile = document.getElementById("audio-file").files[0];
      const faceFile = document.getElementById("face-image").files[0];
      const email = document.getElementById("email").value;

      formData.append("email", email);
      formData.append("audio-file", audioFile);
      formData.append("face-image", faceFile);

      try {
        const response = await fetch("/login", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (response.ok && data.access_token) {
          document.cookie = `access_token=${data.access_token};path=/;`;
          window.location.href = "/secret";
        } else if (response.status === 401) {
          document.getElementById("result").innerText =
            data.result || "Authentication failed";
        } else {
          document.getElementById("result").innerText =
            "Unknown error occurred";
        }
      } catch (error) {
        console.error("Error:", error);
        document.getElementById("result").innerText =
          "An error occurred while processing your request.";
      }
    });
});
