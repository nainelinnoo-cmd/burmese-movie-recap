let currentRecapAudio = null;

function initRecapsView() {
  const container = document.getElementById("view-recaps");
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      <div class="card">
        <label>🎬 ရုပ်ရှင် ဗီဒီယိုအပိုင်း တင်ပါ</label>
        <input type="file" id="recap-video-file" accept="video/*" />
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label>🗣️ အသံသရုပ်ဆောင် / Engine</label>
          <select id="recap-voice-actor">
            <option value="edge-thiha">Edge-TTS: သီဟ (ကျား)</option>
            <option value="edge-nilar">Edge-TTS: နီလာ (မ)</option>
            <option value="google-my">Google TTS: မြန်မာအသံ</option>
          </select>
        </div>
        <div>
          <label>🎭 Recap စတိုင်</label>
          <select id="recap-tone">
            <option value="horror">👻 သရဲ / ထိတ်လန့်ဖွယ် ဇာတ်လမ်း</option>
            <option value="funny">😂 ဟာသ / ဆယ်လီစတိုင်</option>
            <option value="dramatic">🔥 စိတ်လှုပ်ရှားဖွယ် ဇာတ်လမ်း</option>
            <option value="concise">⚡ ရှင်းလင်း အနှစ်ချုပ်</option>
          </select>
        </div>
      </div>

      <!-- Volume Controls (Dual Sliders) -->
      <div class="card" style="display: flex; flex-direction: column; gap: 10px; background: #131d31;">
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 4px;">
            <span style="color: #94a3b8;">🎥 မူရင်း ဗီဒီယိုအသံ (Original Video)</span>
            <span id="vol-video-val" style="color: #38bdf8; font-weight: bold;">30%</span>
          </div>
          <input type="range" id="vol-video-slider" min="0" max="100" value="30" style="width: 100%; cursor: pointer;" />
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 4px;">
            <span style="color: #94a3b8;">🎙️ AI နောက်ခံစကားပြော (Voiceover)</span>
            <span id="vol-ai-val" style="color: #10b981; font-weight: bold;">100%</span>
          </div>
          <input type="range" id="vol-ai-slider" min="0" max="100" value="100" style="width: 100%; cursor: pointer;" />
        </div>
      </div>

      <button id="recap-generate-btn" onclick="handleGenerateRecap()" class="btn btn-recap">
        <span>▶ Recap ဗီဒီယို ဖန်တီးမည်</span>
      </button>

      <!-- Progress UI -->
      <div id="recap-progress-container" style="display: none; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 14px;">
        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 6px;">
          <span id="recap-step-title" style="color: #38bdf8; font-weight: bold;">စတင်နေပါသည်...</span>
          <span id="recap-step-percent" style="color: #facc15; font-weight: bold;">0%</span>
        </div>
        <div style="width: 100%; height: 8px; background: #0f172a; border-radius: 6px; overflow: hidden; margin-bottom: 10px;">
          <div id="recap-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #38bdf8, #10b981); transition: width 0.3s ease;"></div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.75rem;">
          <div id="model-badge-stt" style="color: #64748b;">⏳ <b>STT:</b> Groq Whisper-large-v3 (အသံဖတ်ယူမှု)</div>
          <div id="model-badge-llm" style="color: #64748b;">⏳ <b>LLM:</b> Gemini 3.6-flash (Recap ရေးသားမှု)</div>
          <div id="model-badge-tts" style="color: #64748b;">⏳ <b>TTS:</b> Multi-Engine Neural Audio (အသံဖန်တီးမှု)</div>
        </div>
      </div>

      <!-- Error Box -->
      <div id="recap-error-box" style="display: none; background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; border-radius: 10px; padding: 12px; font-size: 0.85rem; color: #fca5a5; word-break: break-word;"></div>

      <!-- Result Box -->
      <div id="recap-result-box" style="display: none; flex-direction: column; gap: 12px;">
        <div class="card">
          <label>📝 ထုတ်လုပ်ထားသော Recap စာသား</label>
          <textarea id="recap-script-text" rows="4"></textarea>
        </div>

        <video id="recap-video-player" controls style="width: 100%; border-radius: 10px; border: 1px solid #334155; background: #000; aspect-ratio: 16/9;"></video>
      </div>
    </div>
  `;

  // Volume Slider Event Listeners
  const videoSlider = document.getElementById("vol-video-slider");
  const aiSlider = document.getElementById("vol-ai-slider");
  const videoPlayer = document.getElementById("recap-video-player");

  videoSlider.addEventListener("input", (e) => {
    const val = e.target.value;
    document.getElementById("vol-video-val").innerText = `${val}%`;
    if (videoPlayer) videoPlayer.volume = val / 100;
  });

  aiSlider.addEventListener("input", (e) => {
    const val = e.target.value;
    document.getElementById("vol-ai-val").innerText = `${val}%`;
    if (currentRecapAudio) currentRecapAudio.volume = val / 100;
  });
}

function updateRecapProgress(percent, title, activeModel = null) {
  const pContainer = document.getElementById("recap-progress-container");
  const pBar = document.getElementById("recap-progress-bar");
  const pTitle = document.getElementById("recap-step-title");
  const pPercent = document.getElementById("recap-step-percent");

  if (pContainer) pContainer.style.display = "block";
  if (pBar) pBar.style.width = `${percent}%`;
  if (pPercent) pPercent.innerText = `${percent}%`;
  if (pTitle) pTitle.innerText = title;

  const bSTT = document.getElementById("model-badge-stt");
  const bLLM = document.getElementById("model-badge-llm");
  const bTTS = document.getElementById("model-badge-tts");

  if (activeModel === "stt" && bSTT) {
    bSTT.style.color = "#38bdf8";
  } else if (activeModel === "llm" && bLLM) {
    if (bSTT) bSTT.style.color = "#10b981";
    bLLM.style.color = "#38bdf8";
  } else if (activeModel === "tts" && bTTS) {
    if (bLLM) bLLM.style.color = "#10b981";
    bTTS.style.color = "#38bdf8";
  } else if (activeModel === "done") {
    if (bTTS) bTTS.style.color = "#10b981";
  }
}

// 16kHz Mono WAV အဖြစ် သေးငယ်စွာ ချုံ့ထုတ်ပေးမည့် Function
async function extractAudioOptimized(file) {
  updateRecapProgress(15, "ဗီဒီယိုဒေတာ ဖတ်ယူနေပါသည်...");
  const arrayBuffer = await file.arrayBuffer();

  updateRecapProgress(25, "အသံလှိုင်းများကို 16kHz သို့ ချုံ့နေပါသည်...");
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  // 16000Hz သို့ Resample လုပ်ခြင်း
  const targetSampleRate = 16000;
  const offlineCtx = new OfflineAudioContext(1, audioBuffer.duration * targetSampleRate, targetSampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);
  const resampledBuffer = await offlineCtx.startRendering();

  updateRecapProgress(35, "Groq ဖတ်နိုင်သော WAV အသံအဖြစ် Encode လုပ်နေပါသည်...");
  const channelData = resampledBuffer.getChannelData(0);
  const length = channelData.length * 2 + 44;
  const outBuffer = new ArrayBuffer(length);
  const view = new DataView(outBuffer);

  function writeString(pos, str) {
    for (let i = 0; i < str.length; i++) view.setUint8(pos + i, str.charCodeAt(i));
  }

  writeString(0, "RIFF");
  view.setUint32(4, length - 8, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // Mono
  view.setUint16(22, 1, true);
  view.setUint32(24, targetSampleRate, true);
  view.setUint32(28, targetSampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, length - 44, true);

  let offset = 44;
  for (let i = 0; i < channelData.length; i++) {
    let sample = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  let binary = "";
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
  const videoSlider = document.getElementById("vol-video-slider");
  const aiSlider = document.getElementById("vol-ai-slider");

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
    const audioBase64 = await extractAudioOptimized(file);

    updateRecapProgress(50, "Groq Whisper ဖြင့် အသံမှ စကားပြောများကို ဖတ်ယူနေပါသည်...", "stt");

    setTimeout(() => {
      updateRecapProgress(70, "Gemini 3.6-flash ဖြင့် Recap Script ရေးသားနေပါသည်...", "llm");
    }, 2000);

    setTimeout(() => {
      updateRecapProgress(85, "မြန်မာ Neural အသံဖိုင် ဖန်တီးနေပါသည်...", "tts");
    }, 4500);

    const response = await fetch("/api/generate-recap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioBase64, voice, tone }),
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Server Response: ${responseText.substring(0, 180)}`);
    }

    if (!response.ok) throw new Error(data.error || "ဖန်တီးမှု မအောင်မြင်ပါ");

    updateRecapProgress(100, "အားလုံး အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ!", "done");
    resultBox.style.display = "flex";
    scriptText.value = data.script;

    // အသံနှင့် ဗီဒီယို တိုက်ဆိုင်ချိန်ညှိခြင်း
    const audioBlob = new Blob([Uint8Array.from(atob(data.voiceoverBase64), c => c.charCodeAt(0))], { type: "audio/mp3" });
    if (currentRecapAudio) currentRecapAudio.pause();
    currentRecapAudio = new Audio(URL.createObjectURL(audioBlob));

    videoPlayer.src = URL.createObjectURL(file);
    videoPlayer.volume = videoSlider.value / 100;
    currentRecapAudio.volume = aiSlider.value / 100;

    videoPlayer.onplay = () => currentRecapAudio.play();
    videoPlayer.onpause = () => currentRecapAudio.pause();
    videoPlayer.onseeking = () => { currentRecapAudio.currentTime = videoPlayer.currentTime; };

  } catch (err) {
    document.getElementById("recap-progress-container").style.display = "none";
    errorBox.style.display = "block";
    errorBox.innerHTML = `<b>❌ Error အသေးစိတ်:</b><br/>${err.message}`;
  } finally {
    generateBtn.disabled = false;
    generateBtn.style.opacity = "1";
  }
}
