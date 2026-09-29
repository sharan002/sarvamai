# Minmini Voice - Sarvam AI voice bot for Appin Technology

Voice version of the WhatsApp "Minmini" bot. Same persona, same RAG knowledge
base (reads the `chunks` collection already populated by `wpchat-api`), same
`gpt-4o-mini` brain - but the input/output is spoken, via Sarvam AI:

- **STT**: Sarvam Saaras (`saaras:v3`, Tamil, codemix mode - matches the
  dashboard's "Mixed - Tanglish" transcriber setting)
- **LLM**: your existing RAG + `gpt-4o-mini` (not Sarvam's hosted LLM) so the
  bot answers from the same knowledge base and prompt as the WhatsApp bot
- **TTS**: Sarvam Bulbul (`bulbul:v2`, `anushka` by default)

## Setup

```powershell
cd D:\Etherservices\sarvam
npm install
```

Open `.env` and set `SARVAM_API_KEY` (from https://dashboard.sarvam.ai). The
`MONGO_URI` and `OPENAI_API_KEY` are already filled in - copied from
`wpchat-api/.env` so this hits the exact same MongoDB knowledge base.

```powershell
npm start
```

Then open http://localhost:4000 and tap the mic button to talk.

## Changing the voice

Edit `SARVAM_TTS_SPEAKER` in `.env`. Female voices: `meera`, `pavithra`,
`maitreyi`, `diya`, `misha`, `maya`, `priya`, `neha`, `shreya`, `simran`,
`kavya`, `pooja`, `ritu`, `anushka`. Male voices: `arvind`, `amol`,
`amartya`, `neel`, `vian`, `arjun`, `rahul`, `amit`, `dev`, `varun`, `rohan`.
Preview voices in the Sarvam dashboard's TTS playground before picking one.

## API

`POST /api/voice-chat` - multipart form with an `audio` file (webm/opus from
the browser) and an optional `sessionId`. Returns:

```json
{
  "sessionId": "...",
  "transcript": "...",
  "reply": "...",
  "course": "Python Fullstack with AI",
  "audioBase64": "...",
  "audioMimeType": "audio/mpeg"
}
```

`POST /api/session/reset` - `{ "sessionId": "..." }` clears a call's
conversation history and detected course.

## Notes / next steps

- Conversation state is in-memory (per server process) - fine for a single
  instance demo; move to Mongo/Redis if this needs to scale or survive
  restarts.
- This is "tap to talk, record then respond" rather than a fully continuous
  live-streaming call. Sarvam's streaming STT websocket can replace the
  batch `/speech-to-text` call later if you want real-time barge-in like an
  actual phone call.
- Course detection is a simple keyword match on the transcript (see
  `prompt.js`). If callers describe a course without naming it, ask them to
  name it explicitly, or extend `detectCourse`.
