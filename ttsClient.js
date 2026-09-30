const sarvam = require("./sarvamClient");
const cartesia = require("./cartesiaClient");

// TTS_PROVIDER=cartesia /*(Sonic, e.g. your cloned voice) or*/
TTS_PROVIDER=sarvam /* (Bulbul)  - switch in .env, no code changes needed. */
// Used by both the voice widget and the WhatsApp voice-note replies, so
// changing it here governs billing/provider choice for both at once.
async function synthesizeSpeech(text) {
  const provider = (process.env.TTS_PROVIDER || "cartesia").toLowerCase();

  if (provider === "sarvam") {
    return { buffer: await sarvam.synthesizeSpeech(text), mimeType: "audio/mpeg" };
  }

  return { buffer: await cartesia.synthesizeSpeech(text), mimeType: "audio/mpeg" };
}

module.exports = { synthesizeSpeech };
