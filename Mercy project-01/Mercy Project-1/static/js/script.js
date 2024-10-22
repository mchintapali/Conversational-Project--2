// Check for browser support
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Your browser does not support audio recording. Please use a different browser.');
}

let mediaRecorder; // To manage audio recording
let audioChunks = []; // To store recorded audio data

document.addEventListener('DOMContentLoaded', function () {
    const recordBtn = document.getElementById('record-btn');
    const stopBtn = document.getElementById('stop-btn');
    const recordingStatus = document.getElementById('recording-status');
    const transcriptionText = document.getElementById('transcription-text');
    const ttsBtn = document.getElementById('tts-btn');
    const textInput = document.getElementById('text-input');
    const ttsAudio = document.getElementById('tts-audio');
    const uploadBtn = document.getElementById('upload-btn');
    const audioFileInput = document.getElementById('audio-file-input');

    

    // Speech-to-Text Recording
    recordBtn.addEventListener('click', function () {
        recordingStatus.textContent = 'Recording...';
        recordBtn.disabled = true;  // Disable the record button
        stopBtn.disabled = false;    // Enable the stop button
        audioChunks = []; // Reset audio chunks

        // Start recording audio
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(function (stream) {
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.start();

                mediaRecorder.ondataavailable = function (event) {
                    audioChunks.push(event.data); 
                };

                mediaRecorder.onstop = function () {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' }); // Create a blob from audio data

                    // Transcribe the audio using your backend
                    fetch('/transcribe', {
                        method: 'POST',
                        body: audioBlob,
                        headers: {
                            'Content-Type': 'audio/wav' // Ensure this matches the audio format
                        }
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.json();
                    })
                    .then(data => {

                        console.log(data);
                        // Display the transcription
                        transcriptionText.value = data.transcription|| 'No transcription available';
                        
                        // Display the sentiment analysis results
                        const sentimentScoreElement = document.getElementById('sentiment-score');
                        const sentimentMagnitudeElement = document.getElementById('sentiment-magnitude');
                        const sentimentResultElement = document.getElementById('sentiment-result'); 
                    
                        sentimentScoreElement.textContent = `Sentiment Score: ${data.sentiment.score !== undefined ? data.sentiment.score : 'No Score'}`;
                        sentimentMagnitudeElement.textContent = `Sentiment Magnitude: ${data.sentiment.magnitude !== undefined ? data.sentiment.magnitude : 'N/A'}`;
                        
                        if (data.sentiment.score > 0) {
                            sentimentResultElement.textContent = `Sentiment Result: Positive`;
                        } else if (data.sentiment.score < 0) {
                            sentimentResultElement.textContent = `Sentiment Result: Negative`;
                        } else {
                            sentimentResultElement.textContent = `Sentiment Result: Neutral`;
                        }
                    })
                    
                    
                    .catch(error => {
                        console.error('Error during transcription:', error);
                        recordingStatus.textContent = 'Transcription error';
                    });
                };
            })
            .catch(function (err) {
                console.error('Error accessing microphone: ', err);
                recordingStatus.textContent = 'Error accessing microphone';
                recordBtn.disabled = false; 
                stopBtn.disabled = true; 
            });
    });

    // Stop recording
    stopBtn.addEventListener('click', function () {
        recordingStatus.textContent = 'Not recording...';
        recordBtn.disabled = false; 
        stopBtn.disabled = true; 
        mediaRecorder.stop(); 
    });

    // Upload audio file
    uploadBtn.addEventListener('click', function () {
        const audioFile = audioFileInput.files[0]; // Get the uploaded audio file
        if (audioFile) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const audioBlob = new Blob([event.target.result], { type: audioFile.type }); // Create a Blob from the uploaded file

                // Transcribe the audio using your backend
                fetch('/transcribe', {
                    method: 'POST',
                    body: audioBlob,
                    headers: {
                        'Content-Type': audioFile.type 
                    }
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    transcriptionText.value = data.transcription || 'No transcription available'; // Display the transcription

                    // Display the sentiment analysis results
                    const sentimentScoreElement = document.getElementById('sentiment-score');
                    const sentimentMagnitudeElement = document.getElementById('sentiment-magnitude');
                    const sentimentResultElement = document.getElementById('sentiment-result'); 
                
                    sentimentScoreElement.textContent = `Sentiment Score: ${data.sentiment.score !== undefined ? data.sentiment.score : 'No Score'}`;
                    sentimentMagnitudeElement.textContent = `Sentiment Magnitude: ${data.sentiment.magnitude !== undefined ? data.sentiment.magnitude : 'N/A'}`;
                    
                    if (data.sentiment.score > 0) {
                        sentimentResultElement.textContent = `Sentiment Result: Positive`;
                    } else if (data.sentiment.score < 0) {
                        sentimentResultElement.textContent = `Sentiment Result: Negative`;
                    } else {
                        sentimentResultElement.textContent =  `Sentiment Result: Neutral`;
                    }
                })
                .catch(error => {
                    console.error('Error during transcription:', error);
                    recordingStatus.textContent = 'Transcription error';
                });
            };
            reader.readAsArrayBuffer(audioFile); // Read the file as an ArrayBuffer
        } else {
            alert('Please select an audio file to upload.');
        }
    });

    // Text-to-Speech Conversion
    ttsBtn.addEventListener('click', function () {
        const text = textInput.value;
        if (text) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.onstart = function() {
                ttsAudio.src = ""; // Clear previous audio source
            };
            utterance.onend = function() {
                ttsAudio.src = ""; 
            };
            window.speechSynthesis.speak(utterance); // Speak the text
        } else {
            alert('Please enter some text to convert to speech.');
        }
    });
});
