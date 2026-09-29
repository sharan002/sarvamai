const micBtn = document.getElementById("micBtn");
const statusEl = document.getElementById("status");
const logEl = document.getElementById("log");
const player = document.getElementById("player");

let mediaRecorder = null;
let chunks = [];
let isRecording = false;
let isBusy = false;
let sessionId = sessionStorage.getItem("sarvam_session_id") || null;

function setStatus(text) {
  statusEl.textContent = text;
}

function addBubble(text, who) {
  const div = document.createElement("div");
  div.className = `bubble ${who}`;
  div.textContent = text;
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

function setBusy(busy) {
  isBusy = busy;
  micBtn.classList.toggle("busy", busy);
  micBtn.disabled = busy;
}

async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  chunks = [];
  mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
  mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
  mediaRecorder.onstop = () => {
    stream.getTracks().forEach((t) => t.stop());
    handleRecordedAudio(new Blob(chunks, { type: "audio/webm" }));
  };
  mediaRecorder.start();
  isRecording = true;
  micBtn.classList.add("recording");
  setStatus("Listening... tap to stop");
}

function stopRecording() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    isRecording = false;
    micBtn.classList.remove("recording");
  }
}

async function handleRecordedAudio(blob) {
  setBusy(true);
  setStatus("Thinking...");

  const form = new FormData();
  form.append("audio", blob, "call.webm");
  if (sessionId) form.append("sessionId", sessionId);

  try {
    const res = await fetch("/api/voice-chat", { method: "POST", body: form });
    const data = await res.json();

    if (data.error && !data.reply) {
      setStatus(data.error);
      setBusy(false);
      return;
    }

    if (data.sessionId) {
      sessionId = data.sessionId;
      sessionStorage.setItem("sarvam_session_id", sessionId);
    }

    addBubble(data.transcript, "user");
    addBubble(data.reply, "bot");

    if (data.audioBase64) {
      player.src = `data:${data.audioMimeType};base64,${data.audioBase64}`;
      setStatus("Speaking...");
      await player.play();
      player.onended = () => {
        setStatus("Tap to talk");
        setBusy(false);
      };
    } else {
      setStatus("Tap to talk");
      setBusy(false);
    }
  } catch (err) {
    console.error(err);
    setStatus("Something went wrong - tap to try again");
    setBusy(false);
  }
}

micBtn.addEventListener("click", async () => {
  if (isBusy) return;
  if (!isRecording) {
    await startRecording();
  } else {
    stopRecording();
  }
});
