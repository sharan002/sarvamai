require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");

const { COMPANY_INFO } = require("./companyInfo");
const { detectCourse, buildSystemPrompt } = require("./prompt");
const { transcribeAudio, generateChatReply } = require("./sarvamClient");
const { synthesizeSpeech } = require("./ttsClient");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// In-memory per-call session state: conversation history + detected course.
// Good enough for a single-instance voice widget; swap for Mongo/Redis if
// this needs to survive server restarts or run across multiple instances.
const sessions = new Map();

function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { course: null, history: [] });
  }
  return sessions.get(sessionId);
}

app.post("/api/voice-chat", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded (field name: audio)" });
    }

    const sessionId = req.body.sessionId || crypto.randomUUID();
    const session = getSession(sessionId);

    const { transcript } = await transcribeAudio(req.file.buffer, req.file.originalname);

    if (!transcript || !transcript.trim()) {
      return res.status(200).json({
        sessionId,
        transcript: "",
        reply: "",
        error: "Couldn't hear anything - please try again.",
      });
    }

    if (!session.course) {
      const detected = detectCourse(transcript);
      if (detected) session.course = detected;
    }

    const messages = [
      { role: "system", content: buildSystemPrompt(session.course, COMPANY_INFO) },
      ...session.history.slice(-9),
      { role: "user", content: transcript },
    ];

    const reply = await generateChatReply(messages);

    session.history.push({ role: "user", content: transcript });
    session.history.push({ role: "assistant", content: reply });

    const { buffer: audioBuffer, mimeType: audioMimeType } = await synthesizeSpeech(reply);

    res.json({
      sessionId,
      transcript,
      reply,
      course: session.course,
      audioBase64: audioBuffer.toString("base64"),
      audioMimeType,
    });
  } catch (err) {
    console.error("voice-chat error:", err.response?.data || err.message);
    res.status(500).json({ error: "Something went wrong processing that call." });
  }
});

// Standalone STT/TTS, reused by other services (e.g. wpchat-api's WhatsApp
// voice-note handling) so they don't duplicate Sarvam/Cartesia client code
// and so TTS_PROVIDER here is the single switch for every channel's voice output.
app.post("/api/stt", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded (field name: audio)" });
    }

    const { transcript, languageCode } = await transcribeAudio(req.file.buffer, req.file.originalname);
    res.json({ transcript, languageCode });
  } catch (err) {
    console.error("stt error:", err.response?.data || err.message);
    res.status(500).json({ error: "Speech-to-text failed." });
  }
});

app.post("/api/tts", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Missing 'text' in request body." });
    }

    const { buffer, mimeType } = await synthesizeSpeech(text);
    res.json({ audioBase64: buffer.toString("base64"), audioMimeType: mimeType });
  } catch (err) {
    console.error("tts error:", err.response?.data || err.message);
    res.status(500).json({ error: "Text-to-speech failed." });
  }
});

app.post("/api/session/reset", (req, res) => {
  const { sessionId } = req.body;
  if (sessionId) sessions.delete(sessionId);
  res.json({ ok: true });
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`🎙️  Sarvam voice bot running at http://localhost:${PORT}`);
});
