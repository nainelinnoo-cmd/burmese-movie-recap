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

      <!-- အဆင့်လိုက် လုပ်ငန်းစဉ်နှင့် Progress UI -->
      <div id="recap-progress-container" style="display: none; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 14px;">
        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 6px;">
          <span id="recap-step-title" style="color: #38bdf8; font-weight: bold;">စတင်နေပါသည်...</span>
          <span id="recap-step-percent" style="color: #facc15; font-weight: bold;">0%</span>
        </div>
        
        <!-- Progress Bar -->
        <div style="width: 100%; height: 8px; background: #0f172a; border-radius: 6px; overflow: hidden; margin-bottom: 10px;">
          <div id="recap-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #38bdf8, #10b981); transition: width 0.3s ease;"></div>
        </div>

        <!-- အသုံးပြုနေသော Models Status Badges -->
        <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.75rem;">
          <div id="model-badge-stt" style="color: #64748b;">⏳ <b>STT:</b> Groq Whisper-large-v3 (အသံမှ စာသားဖတ်ယူမှု)</div>
          <div id="model-badge-llm" style="color: #64748b;">⏳ <b>LLM:</b> Gemini 3.6-flash (Recap Script ရေးသားမှု)</div>
          <div id="model-badge-tts" style="color: #64748b;">⏳ <b>TTS:</b> HF ZeroGPU - Edge-TTS (မြန်မာအသံဖန်တီးမှု)</div>
        </div>
      </div>

      <!-- Error ပြသရန် Box -->
      <div id="recap-error-box" style="display: none; background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; border-radius: 10px; padding: 12px; font-size: 0.85rem; color: #fca5a5; word-break: break-word;"></div>

      <!-- ရလဒ်ပြသရန် Box -->
      <div id="recap-result-box" style="display: none; flex-direction: column; gap: 12px;">
        <div class="card">
          <label>ထုတ်လုပ်ထားသော Recap စာသား</label>
          <textarea id="recap-script-text" rows="4"></textarea>
        </div>

        <video id="recap-video-player" controls style="width: 100%; border-radius: 10px; border: 1px solid #334155; background: #000; aspect-ratio: 16/9;"></video>
      </div>
    </div>
  `;
}

// Progress Bar နှင့် အဆင့် Update ပေးမည့် Helper
function updateRecapProgress(percent, title, activeModel = null) {
  const pContainer = document.getElementById("recap-progress-container");
  const pBar = document.getElementById("recap-progress-bar");
  const pTitle = document.getElementById("recap-step-title");
  const pPercent = document.getElementById("recap-step-percent");

  pContainer.style.display = "block";
  pBar.style.width = `${percent}%`;
  pPercent.innerText = `${percent}%`;
  pTitle.innerText = title;

  if (activeModel === "stt") {
    document.getElementById("model-badge-stt").style.color = "#38bdf8";
  } else if (activeModel === "llm") {
    document.getElementById("model-badge-stt").style.color = "#10b981";
    document.getElementById("model-badge-llm").style.color = "#38bdf8";
  } else if (activeModel === "tts") {
    document.getElementById("model-badge-llm").style.color = "#10b981";
    document.getElementById("model-badge-tts").style.color = "#38bdf8";
  } else if (activeModel === "done") {
    document.getElementById("model-badge-tts").style.color = "#10b981";
  }
}

// ဗီဒီယိုထဲမှ အသံကို သီးသန့်ထုတ်ယူပြီး အရွယ်အစားချုံ့ခြင်း (Audio Extraction with Progress)
async function extractAudioFromVideo(file) {
  updateRecapProgress(10, "ဗီဒီယိုဒေတာ ဖတ်ယူနေပါသည်...");
  const arrayBuffer = await file.arrayBuffer();

  updateRecapProgress(25, "အသံလှိုင်းများ ခွဲထုတ်ချုံ့နေပါသည်...");
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  updateRecapProgress(40, "ပေါ့ပါးသော WAV အသံအဖြစ် ပြောင်းလဲနေပါသည်...");
  const numOfChan = 1; // Mono
  const length = audioBuffer.length * numOfChan * 2 + 44;
  const outBuffer = new ArrayBuffer(length);
  const view = new DataView(outBuffer);
  let sampleRate = audioBuffer.sampleRate;
  let offset = 0;
  let pos = 0;

  function setUint16(data) { view.setUint16(pos, data, true); pos += 2; }
  function setUint32(data) { view.setUint32(pos, data, true); pos += 4; }

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
  const errorBox = document.getElementById("recap-error-box");
  const resultBox = document.getElementById("recap-result-box");
  const scriptText = document.getElementById("recap-script-text");
  const videoPlayer = document.getElementById("recap-video-player");
  const generateBtn = document.getElementById("recap-generate-btn");

  errorBox.style.display = "none";
  resultBox.style.display = "none";

  if (!fileInput.files || fileInput.files.length === 0) {
    alert("ရုပ်ရှင် ဗီဒီယိုဖိုင် ရွေးချယ်ပေးပါ");
    return;
  }

  const file = fileInput.files[0];
  generateBtn.disabled = true;
  generateBtn.style.opacity = "0.5";

  try {
    // အဆင့် ၁ - အသံခွဲထုတ်ခြင်း
    const compressedAudioBase64 = await extractAudioFromVideo(file);

    // အဆင့် ၂ - Groq Whisper STT အသံဖတ်ခြင်း
    updateRecapProgress(55, "အသံမှ စကားပြောများကို စာသားပြောင်းနေပါသည်...", "stt");

    // အဆင့် ၃ - Gemini Script ရေးသားခြင်း
    setTimeout(() => {
      updateRecapProgress(75, "AI Recap Script ရေးသားနေပါသည်...", "llm");
    }, 2500);

    // အဆင့် ၄ - Hugging Face ZeroGPU Edge-TTS
    setTimeout(() => {
      updateRecapProgress(88, "မြန်မာ Neural အသံဖိုင် ဖန်တီးနေပါသည်...", "tts");
    }, 5500);

    const response = await fetch("/api/generate-recap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audioBase64: compressedAudioBase64,
        voice: voice,
        tone: tone
      }),
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Server Response Error (${response.status}): ${responseText.substring(0, 180)}`);
    }

    if (!response.ok) {
      throw new Error(data.error || `Server Error: Status ${response.status}`);
    }

    // အောင်မြင်မှု အခြေအနေ
    updateRecapProgress(100, "အားလုံး အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ!", "done");
    resultBox.style.display = "flex";
    scriptText.value = data.script;

    const audioBlob = new Blob([Uint8Array.from(atob(data.voiceoverBase64), c => c.charCodeAt(0))], { type: "audio/mp3" });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    videoPlayer.src = URL.createObjectURL(file);
    videoPlayer.onplay = () => audio.play();
    videoPlayer.onpause = () => audio.pause();
    videoPlayer.onseeking = () => { audio.currentTime = videoPlayer.currentTime; };

  } catch (err) {
    document.getElementById("recap-progress-container").style.display = "none";
    errorBox.style.display = "block";
    errorBox.innerHTML = `<b>❌ Error အသေးစိတ်:</b><br/>${err.message}`;
  } finally {
    generateBtn.disabled = false;
    generateBtn.style.opacity = "1";
  }
}
