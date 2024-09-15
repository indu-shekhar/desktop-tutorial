let chunks = [];
let mediaRecorder;

const recordBtn = document.getElementById('record-btn');
const stopBtn = document.getElementById('stop-btn');
const audioPlayer = document.getElementById('player');
const audioInput = document.getElementById('audio-file');
audioPlayer.style.display = 'none';

recordBtn.addEventListener('click', async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (e) => {
        chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        chunks = [];
        const audioURL = URL.createObjectURL(blob);
        audioPlayer.src = audioURL;

        // Convert blob to a file and store it in the input field for submission
        const file = new File([blob], 'enrolled_audio.wav', { type: blob.type });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        audioInput.files = dataTransfer.files;
    };

    mediaRecorder.start();
    recordBtn.disabled = true;
    stopBtn.disabled = false;
});

document.getElementById('upload-form').addEventListener('submit', function(event) {
    event.preventDefault();  // Prevent the form from submitting the traditional way

    var formData = new FormData();
    var fileInput = document.getElementById('audio-file');
    
    formData.append('audio-file', fileInput.files[0]);

    // Send the form data via AJAX
    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            document.getElementById('result').innerText = data.error;
        } else {
            document.getElementById('result').innerText = 'Prediction: ' + data.result;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('result').innerText = 'An error occurred while processing the file';
    });
});

stopBtn.addEventListener('click', () => {
    mediaRecorder.stop();
    recordBtn.disabled = false;
    stopBtn.disabled = true;
    audioPlayer.style.display = 'block';
});




// // const dataTransfer = new DataTransfer();

// // try {
// //     dataTransfer.items.add(file);
// //     audioInput.files = dataTransfer.files;
// // } catch (error) {
// //     console.error('Error adding file to DataTransfer:', error);
// // }

// // try {
// //     mediaRecorder.start();
// //     recordBtn.disabled = true;
// //     stopBtn.disabled = false;
// // } catch (error) {
// //     console.error('Error starting media recorder:', error);
// // }

// // stopBtn.addEventListener('click', () => {
// //     try {
// //         mediaRecorder.stop();
// //         recordBtn.disabled = false;
// //         stopBtn.disabled = true;
// //     } catch (error) {
// //         console.error('Error stopping media recorder:', error);
// //     }
// // });
// let chunks = [];
// let mediaRecorder;

// const recordBtn = document.getElementById('record-btn');
// const stopBtn = document.getElementById('stop-btn');
// const audioPlayer = document.getElementById('player');
// const audioInput = document.getElementById('audio-file');

// recordBtn.addEventListener('click', async () => {
//     const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//     mediaRecorder = new MediaRecorder(stream);

//     mediaRecorder.ondataavailable = (e) => {
//         chunks.push(e.data);
//     };

//     mediaRecorder.onstop = async () => {
//         const blob = new Blob(chunks, { type: 'audio/webm' });
//         chunks = [];
//         const arrayBuffer = await blob.arrayBuffer();
//         const uint8Array = new Uint8Array(arrayBuffer);

//         // Use wavefile library to create a valid WAV file
//         const wav = new wavefile.WaveFile();
//         wav.fromScratch(1, 48000, '16', uint8Array);

//         const wavBlob = new Blob([wav.toBuffer()], { type: 'audio/wav' });
//         const audioURL = URL.createObjectURL(wavBlob);
//         audioPlayer.src = audioURL;

//         // Convert blob to a file and store it in the input field for submission
//         const file = new File([wavBlob], 'enrolled_audio.wav', { type: 'audio/wav' });
//         const dataTransfer = new DataTransfer();
//         dataTransfer.items.add(file);
//         audioInput.files = dataTransfer.files;
//     };

//     mediaRecorder.start();
//     recordBtn.disabled = true;
//     stopBtn.disabled = false;
// });

// stopBtn.addEventListener('click', () => {
//     mediaRecorder.stop();
//     recordBtn.disabled = false;
//     stopBtn.disabled = true;
// });