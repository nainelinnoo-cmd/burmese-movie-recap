let currentRecapAudio = null;
let recapSrtCues = [];
let isSrtVisible = true;

function initRecapsView() {
  const container = document.getElementById("view-recaps");
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      <div class="card">
        <label>🎬 ရုပ်ရှင် ဗီဒီယိုအပိုင်း တင်ပါ</label>
        <input type="file" id="recap-video-file" accept="video/*" />
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-items: start;">
        <div>
          <label style="height: 20px; line-height: 20px; margin-bottom: 6px; display: block;">🗣️ အသံသရုပ်ဆောင်</label>
          <select id="recap-voice-actor" style="height: 44px;">
            <optgroup label="Microsoft Edge-TTS">
              <option value="edge-thiha">သီဟ (ကျား - ပုံမှန်)</option>
              <option value="edge-thiha-deep">သီဟ (ကျား - အသံဩဇာကြီး)</option>
              <option value="edge-thiha-fast">သီဟ (ကျား - သွက်လက်)</option>
              <option value="edge-nilar">နီလာ (မ - သာယာကြည်လင်)</option>
              <option value="edge-nilar-warm">နီလာ (မ - ညင်သာနွေးထွေး)</option>
            </optgroup>
            <optgroup label="Google TTS">
              <option value="google-my-standard">Google မြန်မာ (သဘာဝစံ)</option>
            </optgroup>
          </select>
        </div>
        <div>
          <label style="height: 20px; line-height: 20px; margin-bottom: 6px; display: block;">🎭 Recap စတိုင်</label>
          <select id="recap-tone" style="height: 44px;">
            <option value="horror">👻 သရဲ / ထိတ်လန့်ဖွယ်</option>
            <option value="funny">😂 ဟာသ / ဆယ်လီစတိုင်</option>
            <option value="dramatic">🔥 ရုပ်ရှင်ဇာတ်လမ်းဆန်ဆန်</option>
            <option value="concise">⚡ ရှင်းလင်း အနှစ်ချုပ်</option>
          </select>
        </div>
      </div>

      <!-- Volume Controls -->
      <div class="card" style="display: flex; flex-direction: column; gap: 10px; background: #131d31;">
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 4px;">
            <span style="color: #94a3b8;">🎥 မူရင်း ဗီဒီယိုအသံ</span>
            <span id="vol-video-val" style="color: #38bdf8; font-weight: bold;">30%</span>
          </div>
          <input type="range" id="vol-video-slider" min="0" max="100" value="30" style="width: 100%;" />
        </div>
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 4px;">
            <span style="color: #94a3b8;">🎙️ AI နောက်ခံစကားပြော</span>
            <span id="vol-ai-val" style="color: #10b981; font-weight: bold;">100%</span>
          </div>
          <input type="range" id="vol-ai-slider" min="0" max="100" value="100" style="width: 100%;" />
        </div>
      </div>

      <button id="recap-generate-btn" onclick="handleGenerateRecap()" class="btn btn-recap">
        <span>▶ Recap ဗီဒီယို ဖန်တီးမည်</span>
      </button>

      <div id="recap-progress-container" style="display: none; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 14px;">
        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 6px;">
          <span id="recap-step-title" style="color: #38bdf8; font-weight: bold;">စတင်နေပါသည်...</span>
          <span id="recap-step-percent" style="color: #facc15; font-weight: bold;">0%</span>
        </div>
        <div style="width: 100%; height: 8px; background: #0f172a; border-radius: 6px; overflow: hidden; margin-bottom: 8px;">
          <div id="recap-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #38bdf8, #10b981); transition: width 0.3s ease;"></div>
        </div>
      </div>

      <div id="recap-error-box" style="display: none; background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; border-radius: 10px; padding: 12px; font-size: 0.85rem; color: #fca5a5;"></div>

      <!-- Video Player with Touch-Draggable Subtitle Overlay -->
      <div id="recap-result-box" style="display: none; flex-direction: column; gap: 12px;">
        <div class="card">
          <label>📝 ထုတ်လုပ်ထားသော Recap စာသား</label>
          <textarea id="recap-script-text" rows="4"></textarea>
        </div>

        <!-- Video Wrapper -->
        <div id="video-wrapper" style="position: relative; width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 12px; overflow: hidden; border: 1px solid #334155;">
          <video id="recap-video-player" playsinline style="width: 100%; height: 100%; object-fit: contain;"></video>
          
          <!-- Draggable Subtitle Box -->
          <div id="draggable-subtitle" style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); width: 88%; text-align: center; color: #ffffff; background: rgba(0,0,0,0.7); padding: 6px 12px; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: move; user-select: none; z-index: 10; touch-action: none;">
            စာတန်းထိုး နေရာရွှေ့နိုင်သည်
          </div>
        </div>

        <!-- SRT Controller Settings -->
        <div class="card" style="display: flex; flex-direction: column; gap: 10px; background: #131d31;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.85rem; font-weight: bold; color: #38bdf8;">⚙️ Subtitle (SRT) စနစ်</span>
            <button onclick="toggleSrtVisibility()" id="btn-srt-toggle" class="btn" style="width: auto; padding: 6px 12px; font-size: 0.75rem; background: #0284c7;">SRT: ON</button>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
            <div>
              <label style="font-size: 0.75rem;">စာသားအရောင်</label>
              <select id="srt-font-color" onchange="applySrtStyle()" style="height: 38px;">
                <option value="#ffffff">ဖြူ</option>
                <option value="#facc15">ဝါ</option>
                <option value="#38bdf8">အပြာနု</option>
                <option value="#4ade80">စိမ်း</option>
              </select>
            </div>
            <div>
              <label style="font-size: 0.75rem;">နောက်ခံအရောင်</label>
              <select id="srt-bg-color" onchange="applySrtStyle()" style="height: 38px;">
                <option value="rgba(0,0,0,0.7)">မည်းကြည်</option>
                <option value="#000000">မည်းနက်</option>
                <option value="transparent">မပါ (None)</option>
                <option value="rgba(220,38,38,0.7)">နီကြည်</option>
              </select>
            </div>
            <div>
              <label style="font-size: 0.75rem;">စာလုံးဆိုဒ်</label>
              <select id="srt-font-size" onchange="applySrtStyle()" style="height: 38px;">
                <option value="14px">သေး (14px)</option>
                <option value="16px" selected>လတ် (16px)</option>
                <option value="20px">ကြီး (20px)</option>
                <option value="24px">အကြီးဆုံး</option>
              </select>
            </div>
          </div>

          <button onclick="downloadSrtFile()" class="btn" style="background: #6366f1; padding: 10px; font-size: 0.85rem;">
            <span>📥 Subtitle (.SRT) ဖိုင် Download ရယူမည်</span>
          </button>
        </div>
      </div>
    </div>
  `;

  setupVolumeListeners();
  setupTouchDragSubtitle();
}

function setupVolumeListeners() {
  const videoSlider = document.getElementById("vol-video-slider");
  const aiSlider = document.getElementById("vol-ai-slider");
  const videoPlayer = document.getElementById("recap-video-player");

  videoSlider.addEventListener("input", (e) => {
    document.getElementById("vol-video-val").innerText = `${e.target.value}%`;
    if (videoPlayer) videoPlayer.volume = e.target.value / 100;
  });

  aiSlider.addEventListener("input", (e) => {
    document.getElementById("vol-ai-val").innerText = `${e.target.value}%`;
    if (currentRecapAudio) currentRecapAudio.volume = e.target.value / 100;
  });
}

// Touch & Mouse Dragging Subtitle over Video
function setupTouchDragSubtitle() {
  const sub = document.getElementById("draggable-subtitle");
  const wrapper = document.getElementById("video-wrapper");

  let isDragging = false;
  let startX, startY, origX, origY;

  function onStart(e) {
    isDragging = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    startX = clientX;
    startY = clientY;
    origX = sub.offsetLeft;
    origY = sub.offsetTop;
    sub.style.transform = "none";
  }

  function onMove(e) {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const deltaX = clientX - startX;
    const deltaY = clientY - startY;

    let newX = origX + deltaX;
    let newY = origY + deltaY;

    newX = Math.max(0, Math.min(newX, wrapper.clientWidth - sub.clientWidth));
    newY = Math.max(0, Math.min(newY, wrapper.clientHeight - sub.clientHeight));

    sub.style.left = `${newX}px`;
    sub.style.top = `${newY}px`;
    sub.style.bottom = "auto";
  }

  function onEnd() { isDragging = false; }

  sub.addEventListener("touchstart", onStart, { passive: false });
  window.addEventListener("touchmove", onMove, { passive: false });
  window.addEventListener("touchend", onEnd);

  sub.addEventListener("mousedown", onStart);
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onEnd);
}

function applySrtStyle() {
  const sub = document.getElementById("draggable-subtitle");
  sub.style.color = document.getElementById("srt-font-color").value;
  sub.style.background = document.getElementById("srt-bg-color").value;
  sub.style.fontSize = document.getElementById("srt-font-size").value;
}

function toggleSrtVisibility() {
  isSrtVisible = !isSrtVisible;
  const sub = document.getElementById("draggable-subtitle");
  const btn = document.getElementById("btn-srt-toggle");
  sub.style.display = isSrtVisible ? "block" : "none";
  btn.innerText = isSrtVisible ? "SRT: ON" : "SRT: OFF";
  btn.style.background = isSrtVisible ? "#0284c7" : "#475569";
}

function parseSrtCues(srtText) {
  const blocks = srtText.trim().split(/\n\s*\n/);
  return blocks.map(block => {
    const lines = block.split("\n");
    if (lines.length >= 3) {
      const timeParts = lines[1].split(" --> ");
      const parseSeconds = (t) => {
        const [h, m, s] = t.split(":");
        const [sec, ms] = s.split(",");
        return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(sec) + parseInt(ms) / 1000;
      };
      return {
        start: parseSeconds(timeParts[0]),
        end: parseSeconds(timeParts[1]),
        text: lines.slice(2).join(" ")
      };
    }
    return null;
  }).filter(Boolean);
}

function downloadSrtFile() {
  if (!window.currentSrtRaw) return alert("SRT ဒေတာ မရှိသေးပါ");
  const blob = new Blob([window.currentSrtRaw], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "recap_subtitles.srt";
  a.click();
}

async function extractAudioOptimized(file) {
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  const targetSampleRate = 16000;
  const maxSeconds = Math.min(audioBuffer.duration, 70);
  const targetLength = Math.floor(maxSeconds * targetSampleRate);

  const offlineCtx = new OfflineAudioContext(1, targetLength, targetSampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);
  const resampledBuffer = await offlineCtx.startRendering();

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
  view.setUint16(20, 1, true);
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
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return { audioBase64: btoa(binary), duration: audioBuffer.duration };
}

async function handleGenerateRecap() {
  const fileInput = document.getElementById("recap-video-file");
  const voice = document.getElementById("recap-voice-actor").value;
  const tone = document.getElementById("recap-tone").value;
  const errorBox = document.getElementById("recap-error-box");
  const resultBox = document.getElementById("recap-result-box");
  const scriptText = document.getElementById("recap-script-text");
  const videoPlayer = document.getElementById("recap-video-player");
  const subOverlay = document.getElementById("draggable-subtitle");
  const generateBtn = document.getElementById("recap-generate-btn");
  const pContainer = document.getElementById("recap-progress-container");
  const pBar = document.getElementById("recap-progress-bar");
  const pPercent = document.getElementById("recap-step-percent");
  const pTitle = document.getElementById("recap-step-title");

  if (!fileInput.files || fileInput.files.length === 0) return alert("ဗီဒီယိုဖိုင် ရွေးချယ်ပေးပါ");

  const file = fileInput.files[0];
  errorBox.style.display = "none";
  resultBox.style.display = "none";
  generateBtn.disabled = true;
  generateBtn.style.opacity = "0.5";
  pContainer.style.display = "block";

  try {
    pTitle.innerText = "ဗီဒီယိုအသံ ဖတ်ယူချုံ့နေပါသည်...";
    pPercent.innerText = "30%";
    pBar.style.width = "30%";

    const { audioBase64, duration } = await extractAudioOptimized(file);

    pTitle.innerText = "AI Recap Script နှင့် Subtitle ရေးသားနေပါသည်...";
    pPercent.innerText = "65%";
    pBar.style.width = "65%";

    const response = await fetch("/api/generate-recap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioBase64, voice, tone, videoDuration: Math.round(duration) }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Recap ဖန်တီးမှု မအောင်မြင်ပါ");

    pPercent.innerText = "100%";
    pBar.style.width = "100%";
    pTitle.innerText = "အားလုံး အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ!";
    resultBox.style.display = "flex";
    scriptText.value = data.script;

    window.currentSrtRaw = data.srtText;
    recapSrtCues = parseSrtCues(data.srtText);

    const audioBlob = new Blob([Uint8Array.from(atob(data.voiceoverBase64), c => c.charCodeAt(0))], { type: "audio/mp3" });
    if (currentRecapAudio) currentRecapAudio.pause();
    currentRecapAudio = new Audio(URL.createObjectURL(audioBlob));

    videoPlayer.src = URL.createObjectURL(file);
    videoPlayer.volume = document.getElementById("vol-video-slider").value / 100;
    currentRecapAudio.volume = document.getElementById("vol-ai-slider").value / 100;

    // Subtitle Realtime Update
    videoPlayer.ontimeupdate = () => {
      if (!isSrtVisible) return;
      const curr = videoPlayer.currentTime;
      const cue = recapSrtCues.find(c => curr >= c.start && curr <= c.end);
      subOverlay.innerText = cue ? cue.text : "";
    };

    videoPlayer.onplay = () => currentRecapAudio.play();
    videoPlayer.onpause = () => currentRecapAudio.pause();
    videoPlayer.onseeking = () => { currentRecapAudio.currentTime = videoPlayer.currentTime; };

  } catch (err) {
    pContainer.style.display = "none";
    errorBox.style.display = "block";
    errorBox.innerHTML = `<b>❌ Error အသေးစိတ်:</b><br/>${err.message}`;
  } finally {
    generateBtn.disabled = false;
    generateBtn.style.opacity = "1";
  }
}
