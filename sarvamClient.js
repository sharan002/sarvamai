const axios = require("axios");
const FormData = require("form-data");

const SARVAM_API_KEY = process.env.SARVAM_API_KEY;

if (!SARVAM_API_KEY) {
  console.warn("⚠️  SARVAM_API_KEY is not set - add it to .env before making calls.");
}

// Speech -> text via Sarvam Saaras (real-time-capable STT model).
// "codemix" mode keeps English/technical words in English and everything
// else in the caller's language, matching the dashboard's "Mixed" setting.
async function transcribeAudio(audioBuffer, filename = "audio.webm") {
  const form = new FormData();
  form.append("file", audioBuffer, filename);
  form.append("model", process.env.SARVAM_STT_MODEL || "saaras:v3");
  form.append("language_code", process.env.SARVAM_STT_LANGUAGE || "ta-IN");
  form.append("mode", process.env.SARVAM_STT_MODE || "codemix");

  const res = await axios.post("https://api.sarvam.ai/speech-to-text", form, {
    headers: {
      ...form.getHeaders(),
      "api-subscription-key": SARVAM_API_KEY,
    },
    maxBodyLength: Infinity,
  });

  return {
    transcript: res.data.transcript,
    languageCode: res.data.language_code,
  };
}

// Text -> speech via Sarvam Bulbul. Returns a Buffer of audio bytes.
async function synthesizeSpeech(text) {
  const res = await axios.post(
    "https://api.sarvam.ai/text-to-speech",
    {
      text,
      language_code: process.env.SARVAM_STT_LANGUAGE || "ta-IN",
      model: process.env.SARVAM_TTS_MODEL || "bulbul:v2",
      speaker: process.env.SARVAM_TTS_SPEAKER || "anushka",
      speech_sample_rate: Number(process.env.SARVAM_TTS_SAMPLE_RATE) || 22050,
      output_audio_codec: "mp3",
    },
    {
      headers: {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json",
      },
    }
  );

  const base64Audio = res.data.audios[0];
  return Buffer.from(base64Audio, "base64");
}

// Chat reply via Sarvam's own LLM - sarvam-105b-conversations, the model the
// dashboard recommends for voice agents. OpenAI-compatible chat/completions
// shape, so `messages` is the same [{ role, content }, ...] array as before.
async function generateChatReply(messages) {
  const res = await axios.post(
    "https://api.sarvam.ai/v1/chat/completions",
    {
      model: process.env.SARVAM_CHAT_MODEL || "sarvam-105b-conversations",
      messages,
      // Reasoning is on by default on this endpoint; turn it off so replies
      // come back fast and without hidden "thinking" text leaking into what
      // gets read aloud.
      reasoning_effort: null,
    },
    {
      headers: {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json",
      },
    }
  );

  return res.data.choices[0].message.content;
}

module.exports = { transcribeAudio, synthesizeSpeech, generateChatReply };
