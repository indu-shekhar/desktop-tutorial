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

//     mediaRecorder.onstop = () => {
//         const blob = new Blob(chunks, { type: 'audio/wav' });
//         chunks = [];
//         const audioURL = URL.createObjectURL(blob);
//         audioPlayer.src = audioURL;

//         // Convert blob to a file and store it in the input field for submission
//         const file = new File([blob], 'enrolled_audio.wav', { type: 'audio/wav' });
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
const dataTransfer = new DataTransfer();

try {
    dataTransfer.items.add(file);
    audioInput.files = dataTransfer.files;
} catch (error) {
    console.error('Error adding file to DataTransfer:', error);
}

try {
    mediaRecorder.start();
    recordBtn.disabled = true;
    stopBtn.disabled = false;
} catch (error) {
    console.error('Error starting media recorder:', error);
}

stopBtn.addEventListener('click', () => {
    try {
        mediaRecorder.stop();
        recordBtn.disabled = false;
        stopBtn.disabled = true;
    } catch (error) {
        console.error('Error stopping media recorder:', error);
    }
});