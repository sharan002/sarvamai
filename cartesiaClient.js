const axios = require("axios");

const CARTESIA_API_KEY = process.env.CARTESIA_API_KEY;
const CARTESIA_VERSION = "2026-08-14";

if (!CARTESIA_API_KEY) {
  console.warn("⚠️  CARTESIA_API_KEY is not set - add it to .env before making calls.");
}

const authHeaders = {
  Authorization: `Bearer ${CARTESIA_API_KEY}`,
  "Cartesia-Version": CARTESIA_VERSION,
};

// "Gayathri" is an account voice (likely cloned), so its ID is specific to
// your Cartesia account rather than a public catalog entry. We resolve the
// name -> id once via the voice search API and cache it in memory.
let cachedVoiceId = null;

async function resolveVoiceId(name) {
  if (cachedVoiceId) return cachedVoiceId;

  const res = await axios.get("https://api.cartesia.ai/voices", {
    headers: authHeaders,
    params: { q: name, limit: 10 },
  });

  const match = res.data.data.find(
    (v) => v.name.toLowerCase() === name.toLowerCase()
  ) || res.data.data[0];

  if (!match) {
    throw new Error(
      `No Cartesia voice found matching "${name}" - check the name in your Cartesia dashboard.`
    );
  }

  cachedVoiceId = match.id;
  return cachedVoiceId;
}

async function synthesizeSpeech(text) {
  const voiceId = await resolveVoiceId(process.env.CARTESIA_VOICE_NAME || "Gayathri");

  const res = await axios.post(
    "https://api.cartesia.ai/tts/bytes",
    {
      model_id: process.env.CARTESIA_MODEL || "sonic-3.6",
      transcript: text,
      voice: { id: voiceId },
      language: process.env.CARTESIA_LANGUAGE || "ta",
      output_format: {
        container: "mp3",
        sample_rate: Number(process.env.CARTESIA_SAMPLE_RATE) || 44100,
      },
    },
    {
      headers: { ...authHeaders, "Content-Type": "application/json" },
      responseType: "arraybuffer",
    }
  );

  return Buffer.from(res.data);
}

module.exports = { synthesizeSpeech };
