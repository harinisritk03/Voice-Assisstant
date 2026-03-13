import requests
import base64
import os
import struct

class SarvamClient:
    def __init__(self, api_key):
        self.api_key = api_key
        self.headers = {"api-subscription-key": self.api_key}
        self.stt_url = "https://api.sarvam.ai/speech-to-text"
        self.tts_url = "https://api.sarvam.ai/text-to-speech"

    def speech_to_text(self, audio_file_path, language_code="unknown"):
        with open(audio_file_path, "rb") as f:
            files = {"file": (os.path.basename(audio_file_path), f, "audio/webm")}
            data = {"language_code": language_code, "model": "saarika:v2.5"}

            response = requests.post(
                self.stt_url,
                headers=self.headers,
                files=files,
                data=data
            )

        if response.status_code != 200:
            raise Exception(f"STT Error: {response.text}")

        return response.json()

    def text_to_speech(self, text, language_code="en-IN", speaker="anushka"):
        payload = {
            "inputs": [text],
            "target_language_code": language_code,
            "speaker": speaker,
            "speech_sample_rate": 16000,
            "model": "bulbul:v2"
        }

        headers = self.headers.copy()
        headers["Content-Type"] = "application/json"

        response = requests.post(self.tts_url, headers=headers, json=payload)

        if response.status_code != 200:
            raise Exception(f"TTS Error: {response.text}")

        return response.json()["audios"][0]
