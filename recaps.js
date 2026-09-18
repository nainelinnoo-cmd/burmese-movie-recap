let currentRecapAudio = null;
let currentBgmAudio = null;
let recapSrtCues = [];
let isSrtVisible = true;
let isBlurActive = false;
let isWatermarkActive = false;

let srtFontSize = 18;
let srtFontColor = "#ffffff";
let srtBgColor = "rgba(0,0,0,0.75)";
let watermarkImg = null;

function initRecapsView() {
  const container = document.getElementById("view-recaps");
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      <!-- ၁။ မူရင်း Video ဖိုင်တင်ရန် -->
      <div class="card">
        <label>🎬 မူရင်း ရုပ်ရှင် ဗီဒီယိုအပိုင်း တင်ပါ</label>
        <input type="file" id="recap-video-file" accept="video/*" />
      </div>

      <!-- ၂။ အသံသရုပ်ဆောင်နှင့် စတိုင်ရွေးချယ်မှု -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label style="height: 20px; line-height: 20px; margin-bottom: 6px; display: block;">🗣️ အသံသရုပ်ဆောင်</label>
          <select id="recap-voice-actor" style="height: 44px;">
            <optgroup label="Microsoft Edge-TTS">
              <option value="edge-thiha">သီဟ (ကျား - ပုံမှန်)</option>
              <option value="edge-thiha-deep">သီဟ (ကျား - အသံဩဇာကြီး)</option>
              <option value="edge-thiha-fast">သီဟ (ကျား - သွက်လက်)</option>
              <option value="edge-nilar">နီလာ (မ - သာယာကြည်လင်)</option>
            </optgroup>
            <optgroup label="Google TTS">
              <option value="google-my-standard">Google မြန်မာ</option>
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

      <!-- ၃။ အသံ ၃ မျိုး ချိန်ညှိမှု (Original, AI Voiceover, BGM) -->
      <div class="card" style="display: flex; flex-direction: column; gap: 10px; background: #131d31;">
        <span style="font-size: 0.85rem; font-weight: bold; color: #38bdf8;">🎚️ အသံချိန်ညှိမှု စနစ် (Audio Mixer)</span>

        <div>
          <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
            <span style="color: #94a3b8;">🎥 မူရင်း ဗီဒီယိုအသံ (Copyright အတွက် 0% ထားနိုင်သည်)</span>
            <span id="vol-video-val" style="color: #38bdf8; font-weight: bold;">0%</span>
          </div>
          <input type="range" id="vol-video-slider" min="0" max="100" value="0" style="width: 100%; cursor: pointer;" />
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
            <span style="color: #94a3b8;">🎙️ AI နောက်ခံစကားပြော (Voiceover)</span>
            <span id="vol-ai-val" style="color: #10b981; font-weight: bold;">100%</span>
          </div>
          <input type="range" id="vol-ai-slider" min="0" max="100" value="100" style="width: 100%; cursor: pointer;" />
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
            <span style="color: #94a3b8;">🎵 နောက်ခံ BGM တီးလုံးအသံ</span>
            <span id="vol-bgm-val" style="color: #facc15; font-weight: bold;">35%</span>
          </div>
          <input type="range" id="vol-bgm-slider" min="0" max="100" value="35" style="width: 100%; cursor: pointer;" />
        </div>

        <div style="margin-top: 4px;">
          <label style="font-size: 0.75rem;">🎵 စိတ်ကြိုက် BGM / တီးလုံးဖိုင် တင်ရန် (ရွေးချယ်နိုင်သည်)</label>
          <input type="file" id="recap-bgm-file" accept="audio/*" style="font-size: 0.75rem; padding: 6px;" />
        </div>
      </div>

      <button id="recap-generate-btn" onclick="handleGenerateRecap()" class="btn btn-recap">
        <span>▶ Recap ဗီဒီယို ဖန်တီးမည်</span>
      </button>

      <!-- Progress Bar -->
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

      <!-- Result Video Studio Section -->
      <div id="recap-result-box" style="display: none; flex-direction: column; gap: 14px;">
        <div class="card">
          <label>📝 ထုတ်လုပ်ထားသော Recap စာသား</label>
          <textarea id="recap-script-text" rows="4"></textarea>
        </div>

        <!-- Video Display Container with Draggable Overlays -->
        <div id="video-wrapper" style="position: relative; width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 12px; overflow: hidden; border: 1px solid #334155; user-select: none;">
          <video id="recap-video-player" controls playsinline style="width: 100%; height: 100%; object-fit: contain;"></video>

          <!-- ၁။ Subtitle Overlay -->
          <div id="draggable-subtitle" style="position: absolute; bottom: 35px; left: 50%; transform: translateX(-50%); width: 86%; text-align: center; color: #ffffff; background: rgba(0,0,0,0.75); padding: 6px 10px; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: move; z-index: 15; touch-action: none; line-height: 1.4;">
            စာတန်းထိုး ပြသမည့်နေရာ
          </div>

          <!-- ၂။ Watermark Image Overlay -->
          <div id="draggable-watermark" style="display: none; position: absolute; top: 15px; right: 15px; width: 60px; height: 60px; cursor: move; z-index: 20; touch-action: none; border: 1px dashed rgba(255,255,255,0.4); border-radius: 4px;">
            <img id="watermark-preview-img" src="" style="width: 100%; height: 100%; object-fit: contain; pointer-events: none;" />
          </div>

          <!-- ၃။ Blur Box Overlay -->
          <div id="draggable-blur" style="display: none; position: absolute; top: 20px; left: 20px; width: 90px; height: 50px; background: rgba(255,255,255,0.25); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 2px dashed #facc15; border-radius: 6px; cursor: move; z-index: 18; touch-action: none; display: none; align-items: center; justify-content: center; font-size: 10px; color: #facc15; font-weight: bold;">
            BLUR BOX
          </div>
        </div>

        <!-- ၄။ Watermark & Blur Controls Card -->
        <div class="card" style="display: flex; flex-direction: column; gap: 12px; background: #131d31;">
          <span style="font-size: 0.9rem; font-weight: bold; color: #38bdf8;">🎨 Watermark & Blur ကိရိယာများ</span>

          <!-- Watermark Setup -->
          <div>
            <label style="font-size: 0.75rem;">🖼️ Watermark ပုံတင်ပါ (PNG / JPG)</label>
            <input type="file" id="watermark-file-input" accept="image/*" onchange="handleWatermarkUpload(event)" style="font-size: 0.75rem; padding: 6px;" />
            <div id="watermark-size-controls" style="display: none; margin-top: 6px;">
              <div style="display: flex; justify-content: space-between; font-size: 0.75rem;">
                <span style="color: #94a3b8;">Watermark Size</span>
                <span id="wm-size-val" style="color: #38bdf8; font-weight: bold;">60px</span>
              </div>
              <input type="range" id="wm-size-slider" min="30" max="180" value="60" oninput="changeWatermarkSize(this.value)" style="width: 100%;" />
            </div>
          </div>

          <!-- Blur Box Setup -->
          <div style="border-top: 1px solid #334155; padding-top: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <label style="font-size: 0.75rem; margin-bottom: 0;">🌫️ Blur Box ဖွင့်/ပိတ် (Logo, စာသား ဖုံးရန်)</label>
              <button onclick="toggleBlurBox()" id="btn-blur-toggle" class="btn" style="width: auto; padding: 4px 10px; font-size: 0.75rem; background: #475569;">Blur: OFF</button>
            </div>
            <div id="blur-size-controls" style="display: none; margin-top: 6px;">
              <div style="display: flex; justify-content: space-between; font-size: 0.75rem;">
                <span style="color: #94a3b8;">Blur Box Size</span>
                <span id="blur-size-val" style="color: #facc15; font-weight: bold;">90x50</span>
              </div>
              <input type="range" id="blur-size-slider" min="40" max="220" value="90" oninput="changeBlurBoxSize(this.value)" style="width: 100%;" />
            </div>
          </div>
        </div>

        <!-- ၅။ SRT Controller Card -->
        <div class="card" style="display: flex; flex-direction: column; gap: 12px; background: #131d31;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.9rem; font-weight: bold; color: #38bdf8;">⚙️ Subtitle (SRT) စနစ်</span>
            <div style="display: flex; gap: 6px;">
              <button onclick="toggleSrtEditBox()" id="btn-srt-edit-toggle" class="btn" style="width: auto; padding: 6px 10px; font-size: 0.75rem; background: #f59e0b; color: #000;">✏️ Edit</button>
              <button onclick="toggleSrtVisibility()" id="btn-srt-toggle" class="btn" style="width: auto; padding: 6px 10px; font-size: 0.75rem; background: #0284c7; color: #fff;">SRT: ON</button>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div>
              <label style="font-size: 0.75rem; margin-bottom: 4px;">စာသားအရောင်</label>
              <div style="display: flex; gap: 10px;">
                <div onclick="selectFontColor('#ffffff', this)" class="color-dot" style="background: #ffffff; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; border: 2px solid #38bdf8;"></div>
                <div onclick="selectFontColor('#facc15', this)" class="color-dot" style="background: #facc15; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
                <div onclick="selectFontColor('#38bdf8', this)" class="color-dot" style="background: #38bdf8; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
                <div onclick="selectFontColor('#4ade80', this)" class="color-dot" style="background: #4ade80; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              </div>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
                <span style="color: #94a3b8;">စာလုံးဆိုဒ် (Font Size)</span>
                <span id="srt-font-size-val" style="color: #38bdf8; font-weight: bold;">18px</span>
              </div>
              <input type="range" id="srt-size-slider" min="10" max="100" value="18" oninput="changeSrtFontSize(this.value)" style="width: 100%; cursor: pointer;" />
            </div>
          </div>

          <div id="srt-edit-panel" style="display: none; flex-direction: column; gap: 8px;">
            <textarea id="srt-edit-textarea" rows="5" style="font-family: monospace; font-size: 0.75rem;"></textarea>
            <button onclick="saveAndApplySrtEdit()" class="btn" style="background: #10b981; padding: 8px; font-size: 0.8rem;">💾 SRT သိမ်းဆည်းမည်</button>
          </div>
        </div>

        <!-- ၆။ Final Hardcoded Video Export & Download -->
        <div class="card" style="background: linear-gradient(145deg, #1e1b4b, #0f172a); border: 1px solid #6366f1;">
          <div style="font-size: 0.9rem; font-weight: bold; color: #a5b4fc; margin-bottom: 8px;">🚀 Video အသေထည့်ပြီး Download လုပ်ခြင်း</div>
          <p style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 12px;">စာတန်းထိုး၊ Watermark၊ Blur Box နှင့် တီးလုံးအသံ (Audio Mix) များကို Video ထဲတွင် အသေထည့်သွင်း၍ ဖုန်းထဲသို့ သိမ်းဆည်းပေးမည် ဖြစ်ပါသည်။</p>

          <button id="btn-export-hardcoded" onclick="exportHardcodedVideo()" class="btn" style="background: linear-gradient(90deg, #6366f1, #10b981); font-weight: bold; font-size: 0.95rem; padding: 14px;">
            <span>📥 အားလုံးပါဝင်သော Video အပြီးသတ် Download ရယူမည်</span>
          </button>

          <div id="export-progress-box" style="display: none; margin-top: 10px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
              <span id="export-status-title" style="color: #38bdf8;">ဗီဒီယို ပေါင်းစပ်ထုတ်လုပ်နေပါသည်...</span>
              <span id="export-percent-val" style="color: #facc15; font-weight: bold;">0%</span>
            </div>
            <div style="width: 100%; height: 6px; background: #0f172a; border-radius: 4px; overflow: hidden;">
              <div id="export-progress-bar" style="width: 0%; height: 100%; background: #10b981; transition: width 0.2s linear;"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  setupAudioMixerListeners();
  setupTouchDragOverlay("draggable-subtitle");
  setupTouchDragOverlay("draggable-watermark");
  setupTouchDragOverlay("draggable-blur");
}

// အသံ ၃ မျိုး ချိန်ညှိမှု စနစ်
function setupAudioMixerListeners() {
  const vSlider = document.getElementById("vol-video-slider");
  const aSlider = document.getElementById("vol-ai-slider");
  const bSlider = document.getElementById("vol-bgm-slider");
  const bgmFileInput = document.getElementById("recap-bgm-file");
  const videoPlayer = document.getElementById("recap-video-player");

  vSlider.addEventListener("input", (e) => {
    document.getElementById("vol-video-val").innerText = `${e.target.value}%`;
    if (videoPlayer) videoPlayer.volume = e.target.value / 100;
  });

  aSlider.addEventListener("input", (e) => {
    document.getElementById("vol-ai-val").innerText = `${e.target.value}%`;
    if (currentRecapAudio) currentRecapAudio.volume = e.target.value / 100;
  });

  bSlider.addEventListener("input", (e) => {
    document.getElementById("vol-bgm-val").innerText = `${e.target.value}%`;
    if (currentBgmAudio) currentBgmAudio.volume = e.target.value / 100;
  });

  bgmFileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      const bgmUrl = URL.createObjectURL(e.target.files[0]);
      if (currentBgmAudio) currentBgmAudio.pause();
      currentBgmAudio = new Audio(bgmUrl);
      currentBgmAudio.loop = true;
      currentBgmAudio.volume = bSlider.value / 100;
    }
  });
}

// Touch Drag စနစ် (Subtitle, Watermark, Blur Box အတွက် ဘုံသုံး Function)
function setupTouchDragOverlay(elementId) {
  const el = document.getElementById(elementId);
  const wrapper = document.getElementById("video-wrapper");

  let isDragging = false;
  let startX, startY, origX, origY;

  function onStart(e) {
    isDragging = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    startX = clientX;
    startY = clientY;
    origX = el.offsetLeft;
    origY = el.offsetTop;
    el.style.transform = "none";
  }

  function onMove(e) {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    let newX = origX + (clientX - startX);
    let newY = origY + (clientY - startY);

    newX = Math.max(0, Math.min(newX, wrapper.clientWidth - el.clientWidth));
    newY = Math.max(0, Math.min(newY, wrapper.clientHeight - el.clientHeight));

    el.style.left = `${newX}px`;
    el.style.top = `${newY}px`;
    el.style.bottom = "auto";
    el.style.right = "auto";
  }

  function onEnd() { isDragging = false; }

  el.addEventListener("touchstart", onStart, { passive: false });
  window.addEventListener("touchmove", onMove, { passive: false });
  window.addEventListener("touchend", onEnd);
  el.addEventListener("mousedown", onStart);
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onEnd);
}

// Watermark Upload & Control
function handleWatermarkUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    watermarkImg = new Image();
    watermarkImg.src = e.target.result;
    watermarkImg.onload = () => {
      document.getElementById("watermark-preview-img").src = e.target.result;
      document.getElementById("draggable-watermark").style.display = "block";
      document.getElementById("watermark-size-controls").style.display = "block";
      isWatermarkActive = true;
    };
  };
  reader.readAsDataURL(file);
}

function changeWatermarkSize(val) {
  const wm = document.getElementById("draggable-watermark");
  wm.style.width = `${val}px`;
  wm.style.height = `${val}px`;
  document.getElementById("wm-size-val").innerText = `${val}px`;
}

// Blur Box Controls
function toggleBlurBox() {
  isBlurActive = !isBlurActive;
  const blurBox = document.getElementById("draggable-blur");
  const btn = document.getElementById("btn-blur-toggle");
  const controls = document.getElementById("blur-size-controls");

  if (isBlurActive) {
    blurBox.style.display = "flex";
    controls.style.display = "block";
    btn.innerText = "Blur: ON";
    btn.style.background = "#facc15";
    btn.style.color = "#000";
  } else {
    blurBox.style.display = "none";
    controls.style.display = "none";
    btn.innerText = "Blur: OFF";
    btn.style.background = "#475569";
    btn.style.color = "#fff";
  }
}

function changeBlurBoxSize(val) {
  const blurBox = document.getElementById("draggable-blur");
  const h = Math.round(val * 0.55);
  blurBox.style.width = `${val}px`;
  blurBox.style.height = `${h}px`;
  document.getElementById("blur-size-val").innerText = `${val}x${h}`;
}

// Subtitle Styling
function selectFontColor(color, el) {
  srtFontColor = color;
  document.querySelectorAll(".color-dot").forEach(d => d.style.borderColor = "transparent");
  el.style.borderColor = "#38bdf8";
  applySrtStyles();
}

function changeSrtFontSize(size) {
  srtFontSize = size;
  document.getElementById("srt-font-size-val").innerText = `${size}px`;
  applySrtStyles();
}

function applySrtStyles() {
  const sub = document.getElementById("draggable-subtitle");
  if (sub) {
    sub.style.color = srtFontColor;
    sub.style.fontSize = `${srtFontSize}px`;
  }
}

function toggleSrtEditBox() {
  const panel = document.getElementById("srt-edit-panel");
  panel.style.display = panel.style.display === "none" ? "flex" : "none";
}

function saveAndApplySrtEdit() {
  const newSrtText = document.getElementById("srt-edit-textarea").value;
  window.currentSrtRaw = newSrtText;
  recapSrtCues = parseSrtCues(newSrtText);
  alert("SRT ကို သိမ်းဆည်းပြီးပါပြီ!");
}

function toggleSrtVisibility() {
  isSrtVisible = !isSrtVisible;
  const sub = document.getElementById("draggable-subtitle");
  const btn = document.getElementById("btn-srt-toggle");
  sub.style.display = isSrtVisible ? "block" : "none";
  btn.innerText = isSrtVisible ? "SRT: ON" : "SRT: OFF";
  btn.style.background = isSrtVisible ? "#0284c7" : "#475569";
}

// မြန်မာစာတန်းများကို စာကြောင်းတိုအဖြစ် ခွဲထုတ်ခြင်း (Screen ပေါ်မရှုပ်စေရန်)
function splitBurmeseIntoShortChunks(text) {
  const sentences = text.match(/[^။!?\n]+[။!?\n]?/g) || [text];
  const chunks = [];
  for (const s of sentences) {
    const trimmed = s.trim();
    if (trimmed.length <= 32) {
      if (trimmed) chunks.push(trimmed);
    } else {
      const subParts = trimmed.split(/([၊\s]+)/);
      let current = "";
      for (const part of subParts) {
        if ((current + part).length > 30 && current.length > 0) {
          chunks.push(current.trim());
          current = part;
        } else {
          current += part;
        }
      }
      if (current.trim()) chunks.push(current.trim());
    }
  }
  return chunks.filter(c => c.length > 0);
}

function generateAccurateSrt(scriptText, totalDuration) {
  const chunks = splitBurmeseIntoShortChunks(scriptText);
  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);

  let srt = "";
  let currentStart = 0;

  chunks.forEach((chunk, index) => {
    const chunkRatio = chunk.length / totalLength;
    const chunkDuration = totalDuration * chunkRatio;
    const currentEnd = Math.min(currentStart + chunkDuration, totalDuration);

    const fmt = (s) => {
      const hrs = Math.floor(s / 3600).toString().padStart(2, "0");
      const mins = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
      const secs = Math.floor(s % 60).toString().padStart(2, "0");
      const ms = Math.floor((s % 1) * 1000).toString().padStart(3, "0");
      return `${hrs}:${mins}:${secs},${ms}`;
    };

    srt += `${index + 1}\n${fmt(currentStart)} --> ${fmt(currentEnd)}\n${chunk}\n\n`;
    currentStart = currentEnd;
  });

  return srt;
}

function parseSrtCues(srtText) {
  if (!srtText) return [];
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

    pTitle.innerText = "Gemini Flash က Recap ရေးသားနေပါသည်...";
    pPercent.innerText = "65%";
    pBar.style.width = "65%";

    const response = await fetch("/api/generate-recap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioBase64, voice, tone, videoDuration: Math.round(duration) }),
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`ဆာဗာမှ မှားယွင်းသော ဒေတာ ပေးပို့ထားပါသည်: ${responseText.substring(0, 100)}`);
    }

    if (!response.ok) throw new Error(data.error || "Recap ဖန်တီးမှု မအောင်မြင်ပါ");

    pPercent.innerText = "100%";
    pBar.style.width = "100%";
    pTitle.innerText = "အားလုံး အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ!";
    resultBox.style.display = "flex";
    scriptText.value = data.script;

    const audioBlob = new Blob([Uint8Array.from(atob(data.voiceoverBase64), c => c.charCodeAt(0))], { type: "audio/mp3" });
    if (currentRecapAudio) currentRecapAudio.pause();
    currentRecapAudio = new Audio(URL.createObjectURL(audioBlob));

    videoPlayer.src = URL.createObjectURL(file);
    videoPlayer.volume = document.getElementById("vol-video-slider").value / 100;
    currentRecapAudio.volume = document.getElementById("vol-ai-slider").value / 100;

    currentRecapAudio.onloadedmetadata = () => {
      const realAudioDuration = currentRecapAudio.duration || duration;
      const accurateSrt = generateAccurateSrt(data.script, realAudioDuration);
      window.currentSrtRaw = accurateSrt;
      document.getElementById("srt-edit-textarea").value = accurateSrt;
      recapSrtCues = parseSrtCues(accurateSrt);
    };

    videoPlayer.ontimeupdate = () => {
      if (!isSrtVisible) return;
      const curr = videoPlayer.currentTime;
      const cue = recapSrtCues.find(c => curr >= c.start && curr <= c.end);
      subOverlay.innerText = cue ? cue.text : "";

      if (Math.abs(videoPlayer.currentTime - currentRecapAudio.currentTime) > 0.3) {
        currentRecapAudio.currentTime = videoPlayer.currentTime;
      }
      if (currentBgmAudio && Math.abs(videoPlayer.currentTime - currentBgmAudio.currentTime) > 0.4) {
        currentBgmAudio.currentTime = videoPlayer.currentTime % currentBgmAudio.duration;
      }
    };

    videoPlayer.onplay = () => {
      currentRecapAudio.play();
      if (currentBgmAudio) currentBgmAudio.play();
    };

    videoPlayer.onpause = () => {
      currentRecapAudio.pause();
      if (currentBgmAudio) currentBgmAudio.pause();
    };

    videoPlayer.onseeking = () => {
      currentRecapAudio.currentTime = videoPlayer.currentTime;
      if (currentBgmAudio) currentBgmAudio.currentTime = videoPlayer.currentTime % currentBgmAudio.duration;
    };

  } catch (err) {
    pContainer.style.display = "none";
    errorBox.style.display = "block";
    errorBox.innerHTML = `<b>❌ Error:</b> ${err.message}`;
  } finally {
    generateBtn.disabled = false;
    generateBtn.style.opacity = "1";
  }
}

// ၇။ Canvas ဖြင့် Video + Hardcoded Subtitle + Watermark + Blur Box + Audio Mixer အားလုံး ပေါင်းစပ်ပြီး Download ဆွဲခြင်း
async function exportHardcodedVideo() {
  const video = document.getElementById("recap-video-player");
  const wrapper = document.getElementById("video-wrapper");
  const subEl = document.getElementById("draggable-subtitle");
  const wmEl = document.getElementById("draggable-watermark");
  const blurEl = document.getElementById("draggable-blur");
  const exportBtn = document.getElementById("btn-export-hardcoded");
  const exportBox = document.getElementById("export-progress-box");
  const exportBar = document.getElementById("export-progress-bar");
  const exportPercent = document.getElementById("export-percent-val");
  const exportTitle = document.getElementById("export-status-title");

  if (!video.src) return alert("ဗီဒီယို မရှိသေးပါ");

  exportBtn.disabled = true;
  exportBtn.style.opacity = "0.5";
  exportBox.style.display = "block";
  exportTitle.innerText = "ဗီဒီယို အပြီးသတ် Render ပြုလုပ်နေပါသည်...";

  // Canvas တည်ဆောက်ခြင်း
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext("2d");

  // Web Audio Context ဖြင့် Original + AI Voice + BGM ၃ မျိုးလုံးကို တစ်ပေါင်းတည်း Mix လုပ်ခြင်း
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const dest = audioCtx.createMediaStreamDestination();

  // Volume Sliders တန်ဖိုးများ ရယူခြင်း
  const vGain = audioCtx.createGain();
  vGain.gain.value = document.getElementById("vol-video-slider").value / 100;
  const aGain = audioCtx.createGain();
  aGain.gain.value = document.getElementById("vol-ai-slider").value / 100;
  const bGain = audioCtx.createGain();
  bGain.gain.value = document.getElementById("vol-bgm-slider").value / 100;

  try {
    const vSource = audioCtx.createMediaElementSource(video);
    vSource.connect(vGain);
    vGain.connect(dest);
  } catch (e) {}

  try {
    if (currentRecapAudio) {
      const aSource = audioCtx.createMediaElementSource(currentRecapAudio);
      aSource.connect(aGain);
      aGain.connect(dest);
    }
  } catch (e) {}

  try {
    if (currentBgmAudio) {
      const bSource = audioCtx.createMediaElementSource(currentBgmAudio);
      bSource.connect(bGain);
      bGain.connect(dest);
    }
  } catch (e) {}

  // Canvas Stream နှင့် Audio Mix ပေါင်းစပ်ခြင်း
  const canvasStream = canvas.captureStream(30);
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...dest.stream.getAudioTracks()
  ]);

  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
    ? "video/webm;codecs=vp9,opus"
    : "video/webm";

  const recorder = new MediaRecorder(combinedStream, { mimeType });
  const recordedChunks = [];

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) recordedChunks.push(e.data);
  };

  recorder.onstop = () => {
    const finalBlob = new Blob(recordedChunks, { type: "video/webm" });
    const downloadUrl = URL.createObjectURL(finalBlob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `Recap_Final_Video_${Date.now()}.webm`;
    a.click();

    exportTitle.innerText = "ဗီဒီယို Download အောင်မြင်စွာ ရရှိပါပြီ!";
    exportBar.style.width = "100%";
    exportPercent.innerText = "100%";

    setTimeout(() => {
      exportBox.style.display = "none";
      exportBtn.disabled = false;
      exportBtn.style.opacity = "1";
    }, 2500);
  };

  // Video ကို အစမှ ပြန်ဖွင့်ပြီး Canvas ထဲ Frame အလိုက် ဆွဲထည့်ခြင်း
  video.currentTime = 0;
  if (currentRecapAudio) currentRecapAudio.currentTime = 0;
  if (currentBgmAudio) currentBgmAudio.currentTime = 0;

  recorder.start();
  await video.play();
  if (currentRecapAudio) currentRecapAudio.play();
  if (currentBgmAudio) currentBgmAudio.play();

  const scaleX = canvas.width / wrapper.clientWidth;
  const scaleY = canvas.height / wrapper.clientHeight;

  function renderLoop() {
    if (video.paused || video.ended) return;

    // ၁။ Base Video Frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // ၂။ Blur Box ဆွဲခြင်း (Blur Effect Hardcoded)
    if (isBlurActive && blurEl.style.display !== "none") {
      const bx = blurEl.offsetLeft * scaleX;
      const by = blurEl.offsetTop * scaleY;
      const bw = blurEl.clientWidth * scaleX;
      const bh = blurEl.clientHeight * scaleY;

      ctx.save();
      ctx.beginPath();
      ctx.rect(bx, by, bw, bh);
      ctx.clip();
      ctx.filter = "blur(18px)";
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    // ၃။ Watermark ပုံဆွဲခြင်း (Watermark Hardcoded)
    if (isWatermarkActive && watermarkImg && wmEl.style.display !== "none") {
      const wx = wmEl.offsetLeft * scaleX;
      const wy = wmEl.offsetTop * scaleY;
      const ww = wmEl.clientWidth * scaleX;
      const wh = wmEl.clientHeight * scaleY;
      ctx.drawImage(watermarkImg, wx, wy, ww, wh);
    }

    // ၄။ SRT စာတန်းထိုး အသေဆွဲခြင်း (Subtitle Hardcoded)
    if (isSrtVisible && subEl.style.display !== "none") {
      const currTime = video.currentTime;
      const currentCue = recapSrtCues.find(c => currTime >= c.start && currTime <= c.end);

      if (currentCue && currentCue.text) {
        const sx = (subEl.offsetLeft + subEl.clientWidth / 2) * scaleX;
        const sy = (subEl.offsetTop + subEl.clientHeight / 2) * scaleY;
        const dynamicFontSize = Math.round(srtFontSize * scaleY);

        ctx.font = `bold ${dynamicFontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const textMetrics = ctx.measureText(currentCue.text);
        const paddingX = 14 * scaleX;
        const paddingY = 8 * scaleY;
        const boxWidth = textMetrics.width + paddingX * 2;
        const boxHeight = dynamicFontSize + paddingY * 2;

        ctx.fillStyle = srtBgColor;
        ctx.beginPath();
        ctx.roundRect(sx - boxWidth / 2, sy - boxHeight / 2, boxWidth, boxHeight, 8 * scaleX);
        ctx.fill();

        ctx.fillStyle = srtFontColor;
        ctx.fillText(currentCue.text, sx, sy);
      }
    }

    // Progress Bar % Update
    const pct = Math.min(99, Math.round((video.currentTime / video.duration) * 100));
    exportBar.style.width = `${pct}%`;
    exportPercent.innerText = `${pct}%`;

    requestAnimationFrame(renderLoop);
  }

  video.onended = () => {
    recorder.stop();
    if (currentRecapAudio) currentRecapAudio.pause();
    if (currentBgmAudio) currentBgmAudio.pause();
  };

  renderLoop();
}
