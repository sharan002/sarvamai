# Minmini Voice - Sarvam AI voice bot for Appin Technology

Voice version of the WhatsApp "Minmini" bot. Same persona, same company info,
but the input/output is spoken, and the whole stack runs on Sarvam AI:

- **STT**: Sarvam Saaras (`saaras:v3`, Tamil, codemix mode - matches the
  dashboard's "Mixed - Tanglish" transcriber setting)
- **LLM**: Sarvam's own hosted model, `sarvam-105b-conversations` (the model
  the dashboard recommends for voice agents) - tuned for natural
  Tamil/Tanglish conversation. Company info is a plain string in
  `companyInfo.js` sent straight into the system prompt - no embeddings, no
  vector search, no database lookup.
- **TTS**: Sarvam Bulbul (`bulbul:v2`, `anushka` by default)

## Setup

```powershell
cd D:\Etherservices\sarvam
npm install
```

Open `.env` and set `SARVAM_API_KEY` (from https://dashboard.sarvam.ai), then
paste your company info (courses, fees, trainers, placements, etc.) into the
`COMPANY_INFO` string in `companyInfo.js`.

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

`POST /api/stt` - multipart form with an `audio` file. Returns
`{ "transcript": "...", "languageCode": "ta-IN" }`. Used internally by
`/api/voice-chat`, and by `wpchat-api` to transcribe incoming WhatsApp voice
notes.

`POST /api/tts` - JSON `{ "text": "..." }`. Returns
`{ "audioBase64": "...", "audioMimeType": "audio/mpeg" }`, synthesized with
whichever provider `TTS_PROVIDER` in `.env` currently points at (`cartesia`
or `sarvam`). Used internally by `/api/voice-chat`, and by `wpchat-api` to
speak WhatsApp voice-note replies - so this one `.env` setting controls the
TTS provider/billing for every channel.

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
