const sarvam = require("./sarvamClient");
const cartesia = require("./cartesiaClient");

// TTS_PROVIDER=cartesia /* (Sonic, e.g. your cloned "Gayathri" voice) */
TTS_PROVIDER=sarvam /* (Bulbul) - switch in .env, no code changes needed. */
async function synthesizeSpeech(text) {
  const provider = (process.env.TTS_PROVIDER || "cartesia").toLowerCase();

  if (provider === "sarvam") {
    return { buffer: await sarvam.synthesizeSpeech(text), mimeType: "audio/mpeg" };
  }

  return { buffer: await cartesia.synthesizeSpeech(text), mimeType: "audio/mpeg" };
}

module.exports = { synthesizeSpeech };
