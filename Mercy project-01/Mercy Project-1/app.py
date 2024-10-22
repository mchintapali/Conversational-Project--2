from flask import Flask, render_template, request, jsonify
from google.cloud import speech, texttospeech
from flask_cors import CORS
import subprocess
import os

app = Flask(__name__)
CORS(app)

# Route to serve the HTML page
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    audio_file = request.data  
    
    # Save the uploaded audio to a temporary file
    with open('temp_audio.aac', 'wb') as f:
        f.write(audio_file)

    # Use FFmpeg to convert AAC to WAV (LINEAR16)
    try:
        subprocess.run(['ffmpeg', '-i', 'temp_audio.aac', '-acodec', 'pcm_s16le', '-ar', '48000', 'temp_audio.wav'], check=True)
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg error: {e}")
        return jsonify({"error": "Audio conversion failed."}), 500

    client = speech.SpeechClient()

    with open('temp_audio.wav', 'rb') as audio:
        audio_content = audio.read()

    audio = speech.RecognitionAudio(content=audio_content)
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=48000,
        language_code="en-US"
    )

    response = client.recognize(config=config, audio=audio)


    if response.results:
        transcripts = []
        for result in response.results:
            transcript = result.alternatives[0].transcript
            
            transcripts.append(f"{transcript} ")

        # Join all transcripts into a single string
        full_transcript = "\n".join(transcripts)
        
        # Clean up temporary files
        os.remove('temp_audio.aac')
        os.remove('temp_audio.wav')

        return jsonify({"transcription": full_transcript})  # Return as JSON
        
    else:
        
        os.remove('temp_audio.aac')
        os.remove('temp_audio.wav')
        
        return jsonify({"transcription": "No transcription available."})  # Return as JSON

# Route for handling text-to-speech conversion using Google Text-to-Speech API
@app.route('/text-to-speech', methods=['POST'])
def text_to_speech():
    data = request.get_json()
    text = data.get('text')

    client = texttospeech.TextToSpeechClient()

    input_text = texttospeech.SynthesisInput(text=text)
    voice = texttospeech.VoiceSelectionParams(
        language_code="en-US",
        ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL
    )
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3
    )

    response = client.synthesize_speech(input=input_text, voice=voice, audio_config=audio_config)

    audio_filename = 'output.mp3'
    with open(audio_filename, 'wb') as out:
        out.write(response.audio_content)

    return jsonify({"audio_url": f"/static/{audio_filename}"})

if __name__ == '__main__':
    app.run(debug=True)
