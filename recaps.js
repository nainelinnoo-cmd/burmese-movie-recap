function initRecapsView() {
  const container = document.getElementById("view-recaps");
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      <div class="card">
        <label>ရုပ်ရှင် ဗီဒီယိုအပိုင်း တင်ပါ</label>
        <input type="file" id="recap-video-file" accept="video/*" />
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label>အသံသရုပ်ဆောင်</label>
          <select id="recap-voice-actor">
            <option value="my-MM-ThihaNeural">သီဟ (အမျိုးသား)</option>
            <option value="my-MM-NilarNeural">နီလာ (အမျိုးသမီး)</option>
          </select>
        </div>
        <div>
          <label>Recap စတိုင်</label>
          <select id="recap-tone">
            <option value="concise">ရှင်းလင်း အနှစ်ချုပ်</option>
            <option value="funny">ဟာသ / ဆယ်လီစတိုင်</option>
            <option value="dramatic">စိတ်လှုပ်ရှားဖွယ် ဇာတ်လမ်း</option>
          </select>
        </div>
      </div>

      <button id="recap-generate-btn" onclick="handleGenerateRecap()" class="btn btn-recap">
        <span>▶ Recap ဗီဒီယို ဖန်တီးမည်</span>
      </button>

      <div id="recap-status" style="display: none; text-align: center; font-size: 0.9rem; font-weight: bold; color: #facc15; padding: 10px;"></div>

      <div id="recap-result-box" style="display: none; display: flex; flex-direction: column; gap: 12px;">
        <div class="card">
          <label>ထုတ်လုပ်ထားသော Recap စာသား</label>
          <textarea id="recap-script-text" rows="4"></textarea>
        </div>

        <video id="recap-video-player" controls style="width: 100%; border-radius: 10px; border: 1px solid #334155; background: #000; aspect-ratio: 16/9;"></video>
      </div>
    </div>
  `;
}

// Browser ထဲတွင် ဗီဒီယိုမှ အသံ (Audio) ကို သီးသန့် ချုံ့ယူပေးမည့် Function
async function extractAudioFromVideo(file) {
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  // WAV အသံဖိုင်အဖြစ် သေးငယ်စွာ Encode လုပ်ခြင်း
  const numOfChan = 1; // Mono အသံဖြင့် ဒေတာချုံ့ခြင်း
  const length = audioBuffer.length * numOfChan * 2 + 44;
  const outBuffer = new ArrayBuffer(length);
  const view = new DataView(outBuffer);
  const channels = [];
  let sampleRate = audioBuffer.sampleRate;
  let offset = 0;
  let pos = 0;

  function setUint16(data) { view.setUint16(pos, data, true); pos += 2; }
  function setUint32(data) { view.setUint32(pos, data, true); pos += 4; }

  // WAV Header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8);
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt "
  setUint32(16);
  setUint16(1); // PCM
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  setUint32(0x61746164); // "data"
  setUint32(length - pos - 4);

  const channelData = audioBuffer.getChannelData(0);
  while (pos < length) {
    let sample = Math.max(-1, Math.min(1, channelData[offset]));
    sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
    view.setInt16(pos, sample, true);
    pos += 2;
    offset++;
  }

  // Base64 ပြောင်းလဲခြင်း
  let binary = '';
  const bytes = new Uint8Array(outBuffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function handleGenerateRecap() {
  const fileInput = document.getElementById("recap-video-file");
  const voice = document.getElementById("recap-voice-actor").value;
  const tone = document.getElementById("recap-tone").value;
  const statusEl = document.getElementById("recap-status");
  const resultBox = document.getElementById("recap-result-box");
  const scriptText = document.getElementById("recap-script-text");
  const videoPlayer = document.getElementById("recap-video-player");

  if (!fileInput.files || fileInput.files.length === 0) {
    alert("ဗီဒီယိုဖိုင် ရွေးချယ်ပေးပါ");
    return;
  }

  const file = fileInput.files[0];
  statusEl.style.display = "block";
  statusEl.innerText = "⏳ ဗီဒီယိုထဲမှ အသံကို ဖတ်ယူချုံ့နေပါသည်...";

  try {
    // ဖုန်း Browser ထဲမှာတင် အသံဖိုင်အရွယ်အစားကို အလွန်သေးငယ်အောင် ချုံ့ယူခြင်း
    const compressedAudioBase64 = await extractAudioFromVideo(file);

    statusEl.innerText = "⏳ AI ဇာတ်ကြောင်းပြန်ရေးပြီး မြန်မာအသံ ထုတ်ယူနေပါသည်...";

    const response = await fetch("/api/generate-recap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audioBase64: compressedAudioBase64,
        voice: voice,
        tone: tone
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "ဖန်တီးမှု မအောင်မြင်ပါ");

    statusEl.innerText = "🎉 Recap ဗီဒီယို အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ!";
    resultBox.style.display = "flex";
    scriptText.value = data.script;

    // အသံနှင့် ဗီဒီယို ချိန်ဆက်ပြသခြင်း
    const audioBlob = new Blob([Uint8Array.from(atob(data.voiceoverBase64), c => c.charCodeAt(0))], { type: "audio/mp3" });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    videoPlayer.src = URL.createObjectURL(file);
    videoPlayer.onplay = () => audio.play();
    videoPlayer.onpause = () => audio.pause();
    videoPlayer.onseeking = () => { audio.currentTime = videoPlayer.currentTime; };

  } catch (err) {
    statusEl.innerText = `❌ အမှားဖြစ်ပေါ်ပါသည်: ${err.message}`;
  }
}
