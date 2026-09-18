let currentRecapAudio = null;
let currentBgmAudio = null;
let recapSrtCues = [];
let isSrtVisible = true;
let isBlurActive = false;
let isWatermarkActive = false;
let isTitleActive = false;

let srtFontSize = 18;
let srtFontColor = "#ffffff";
let srtBgStyle = "rgba(0,0,0,0.75)";
let titleFontSize = 24;
let watermarkImg = null;

function initRecapsView() {
  const container = document.getElementById("view-recaps");
  if (!container) return;

  container.innerHTML = `
    <style>
      #recap-voice-actor {
        background-color: #080e1a !important;
        border: 1.5px solid #1e3a8a !important;
        color: #38bdf8 !important;
        font-weight: 600;
        font-size: 0.85rem;
        border-radius: 8px;
        padding: 0 10px;
        box-shadow: 0 0 10px rgba(30, 58, 138, 0.4);
      }
      #recap-voice-actor optgroup {
        background-color: #050913 !important;
        color: #94a3b8;
        font-weight: bold;
      }
      #recap-voice-actor option {
        background-color: #080e1a !important;
        color: #f1f5f9;
        padding: 8px;
        font-size: 0.85rem;
      }
    </style>

    <div style="display: flex; flex-direction: column; gap: 14px;">
      <!-- ၁။ Video ဖိုင်တင်ရန် -->
      <div class="card">
        <label>🎬 မူရင်း ရုပ်ရှင် ဗီဒီယိုအပိုင်း တင်ပါ</label>
        <input type="file" id="recap-video-file" accept="video/*" onchange="handleVideoFileSelect(event)" />
      </div>

      <!-- ၂။ အသံသရုပ်ဆောင် (Blue-Black + နာမည်တိုများ) နှင့် စတိုင် -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label style="height: 20px; line-height: 20px; margin-bottom: 6px; display: block;">🗣️ အသံသရုပ်ဆောင်</label>
          <select id="recap-voice-actor" style="height: 44px;">
            <optgroup label="Edge-TTS (သဘာဝ)">
              <option value="edge-thiha">👨 သီဟ (ပုံမှန်)</option>
              <option value="edge-thiha-deep">🎙️ သီဟ (ဩဇာကြီး)</option>
              <option value="edge-thiha-fast">⚡ သီဟ (သွက်လက်)</option>
              <option value="edge-nilar">👩 နီလာ (ကြည်လင်)</option>
              <option value="edge-nilar-warm">🌸 နီလာ (နွေးထွေး)</option>
            </optgroup>
            <optgroup label="Google TTS">
              <option value="google-my-female" selected>👩 Google (မ)</option>
              <option value="google-my-male">👨 Google (ကျား)</option>
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

      <!-- ၃။ Audio Mixer (Dropdown Accordion + BGM Remove Button) -->
      <div class="card" style="background: #131d31; padding: 12px;">
        <div onclick="toggleAudioMixerDropdown()" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
          <span style="font-size: 0.85rem; font-weight: bold; color: #38bdf8;">🎚️ အသံချိန်ညှိမှု စနစ် (Audio Mixer)</span>
          <span id="audio-mixer-chevron" style="color: #facc15; font-size: 0.85rem; font-weight: bold;">▼ အသံချိန်ညှိမည်</span>
        </div>

        <div id="audio-mixer-dropdown-content" style="display: none; flex-direction: column; gap: 10px; margin-top: 12px; border-top: 1px solid #334155; padding-top: 10px;">
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

          <!-- BGM File Input with Remove Button -->
          <div>
            <label style="font-size: 0.75rem;">🎵 စိတ်ကြိုက် BGM / တီးလုံးဖိုင် တင်ရန် (MP3/WAV)</label>
            <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
              <input type="file" id="recap-bgm-file" accept="audio/*" onchange="handleBgmFileSelect(event)" style="font-size: 0.75rem; padding: 6px; flex: 1;" />
              <button id="btn-remove-bgm" onclick="removeBgmAudio()" class="btn" style="display: none; width: auto; padding: 6px 12px; background: #ef4444; font-size: 0.75rem;">❌ ဖျက်မည်</button>
            </div>
          </div>
        </div>
      </div>

      <button id="recap-generate-btn" onclick="handleGenerateRecap()" class="btn btn-recap">
        <span>▶ Recap ဗီဒီယို ဖန်တီးမည် (AI Scene Vision ပါဝင်သည်)</span>
      </button>

      <!-- Progress Container -->
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

      <!-- Result Studio Section -->
      <div id="recap-result-box" style="display: none; flex-direction: column; gap: 14px;">
        <div class="card">
          <label>📝 ထုတ်လုပ်ထားသော Recap စာသား</label>
          <textarea id="recap-script-text" rows="4"></textarea>
        </div>

        <!-- Video Player Wrapper (Screen အပြည့်ပြသခြင်း) -->
        <div id="video-wrapper" style="position: relative; width: 100%; max-height: 72vh; background: #000; border-radius: 12px; overflow: hidden; border: 1px solid #334155; user-select: none; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
          <video id="recap-video-player" controls playsinline style="width: 100%; height: 100%; object-fit: contain; display: block;"></video>

          <!-- ၁။ Title Overlay -->
          <div id="draggable-title" style="display: none; position: absolute; top: 15px; left: 50%; transform: translateX(-50%); color: #facc15; font-weight: bold; font-size: 24px; cursor: move; z-index: 25; text-shadow: 2px 2px 4px #000; text-align: center; white-space: nowrap;">
            ခေါင်းစဉ် စာသား
          </div>

          <!-- ၂။ Subtitle Overlay with Resize Handle (↘) -->
          <div id="draggable-subtitle" style="position: absolute; bottom: 35px; left: 50%; transform: translateX(-50%); width: 86%; text-align: center; color: #ffffff; background: rgba(0,0,0,0.75); padding: 6px 12px; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: move; z-index: 15; touch-action: none; line-height: 1.4;">
            <span id="subtitle-text-content">စာတန်းထိုး ပြသမည့်နေရာ</span>
            <div id="sub-resize-handle" style="position: absolute; right: -7px; bottom: -7px; width: 22px; height: 22px; background: #10b981; color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; cursor: nwse-resize; touch-action: none; font-weight: bold; box-shadow: 0 0 8px rgba(16,185,129,0.8); z-index: 30;">↘</div>
          </div>

          <!-- ၃။ Watermark Overlay with Resize Handle (↘) -->
          <div id="draggable-watermark" style="display: none; position: absolute; top: 15px; right: 15px; width: 70px; height: 70px; cursor: move; z-index: 20; border: 1px dashed rgba(255,255,255,0.4); border-radius: 4px;">
            <img id="watermark-preview-img" src="" style="width: 100%; height: 100%; object-fit: contain; pointer-events: none;" />
            <div id="wm-resize-handle" style="position: absolute; right: -6px; bottom: -6px; width: 20px; height: 20px; background: #38bdf8; color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; cursor: nwse-resize; touch-action: none; font-weight: bold;">↘</div>
          </div>

          <!-- ၄။ Blur Box Overlay with Resize Handle (↘) -->
          <div id="draggable-blur" style="display: none; position: absolute; top: 20px; left: 20px; width: 100px; height: 60px; background: rgba(255,255,255,0.25); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 2px dashed #facc15; border-radius: 6px; cursor: move; z-index: 18; align-items: center; justify-content: center; font-size: 11px; color: #facc15; font-weight: bold;">
            BLUR BOX
            <div id="blur-resize-handle" style="position: absolute; right: -6px; bottom: -6px; width: 20px; height: 20px; background: #facc15; color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; cursor: nwse-resize; touch-action: none; font-weight: bold;">↘</div>
          </div>
        </div>

        <!-- Title Controls Card -->
        <div class="card" style="background: #131d31; display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.9rem; font-weight: bold; color: #38bdf8;">✏️ Video Title / စာသားထည့်ခြင်း</span>
            <button onclick="toggleVideoTitle()" id="btn-title-toggle" class="btn" style="width: auto; padding: 4px 10px; font-size: 0.75rem; background: #475569;">Title: OFF</button>
          </div>

          <div id="title-controls-box" style="display: none; flex-direction: column; gap: 8px;">
            <input type="text" id="custom-title-input" placeholder="ဗီဒီယိုပေါ်တွင် ပြသမည့် စာသား ရိုက်ပါ..." oninput="updateCustomTitleText(this.value)" style="font-size: 0.85rem;" />
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
                <span style="color: #94a3b8;">Title Size (0 - 100)</span>
                <span id="title-size-val" style="color: #facc15; font-weight: bold;">24px</span>
              </div>
              <input type="range" id="title-size-slider" min="10" max="100" value="24" oninput="changeTitleFontSize(this.value)" style="width: 100%; cursor: pointer;" />
            </div>
          </div>
        </div>

        <!-- Watermark & Blur Controls Card (Remove Button ပါဝင်သည်) -->
        <div class="card" style="display: flex; flex-direction: column; gap: 10px; background: #131d31;">
          <span style="font-size: 0.9rem; font-weight: bold; color: #38bdf8;">🎨 Watermark & Blur ကိရိယာများ</span>

          <div>
            <label style="font-size: 0.75rem;">🖼️ Watermark ပုံတင်ပါ (PNG / JPG)</label>
            <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
              <input type="file" id="watermark-file-input" accept="image/*" onchange="handleWatermarkUpload(event)" style="font-size: 0.75rem; padding: 6px; flex: 1;" />
              <button id="btn-remove-wm" onclick="removeWatermark()" class="btn" style="display: none; width: auto; padding: 6px 12px; background: #ef4444; font-size: 0.75rem;">❌ ဖျက်မည်</button>
            </div>
            <small style="color: #94a3b8; font-size: 0.7rem;">* ပုံပေါ်ရှိ (↘) အပြာရောင်ခလုတ်လေးကို ထိဆွဲပြီး Size စိတ်ကြိုက် ချိန်ညှိနိုင်ပါသည်</small>
          </div>

          <div style="border-top: 1px solid #334155; padding-top: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <label style="font-size: 0.75rem; margin-bottom: 0;">🌫️ Blur Box (Logo, စာသား ဖုံးရန်)</label>
              <button onclick="toggleBlurBox()" id="btn-blur-toggle" class="btn" style="width: auto; padding: 4px 10px; font-size: 0.75rem; background: #475569;">Blur: OFF</button>
            </div>
            <small style="color: #94a3b8; font-size: 0.7rem;">* Blur အကွက်ပေါ်ရှိ (↘) အဝါရောင်ခလုတ်လေးကို ထိဆွဲပြီး Size ပြင်ဆင်နိုင်ပါသည်</small>
          </div>
        </div>

        <!-- Subtitle (SRT) Settings Card -->
        <div class="card" style="display: flex; flex-direction: column; gap: 12px; background: #131d31;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.9rem; font-weight: bold; color: #38bdf8;">⚙️ Subtitle (SRT) စနစ်</span>
            <div style="display: flex; gap: 6px;">
              <button onclick="toggleSrtEditBox()" id="btn-srt-edit-toggle" class="btn" style="width: auto; padding: 6px 10px; font-size: 0.75rem; background: #f59e0b; color: #000;">✏️ Edit</button>
              <button onclick="toggleSrtVisibility()" id="btn-srt-toggle" class="btn" style="width: auto; padding: 6px 10px; font-size: 0.75rem; background: #0284c7; color: #fff;">SRT: ON</button>
            </div>
          </div>

          <!-- စာသားအရောင် ၇ မျိုး -->
          <div>
            <label style="font-size: 0.75rem; margin-bottom: 6px; display: block;">စာသားအရောင် (၇ မျိုး)</label>
            <div style="display: flex; gap: 9px; align-items: center; flex-wrap: wrap;">
              <div onclick="selectFontColor('#ffffff', this)" class="font-color-dot" style="background: #ffffff; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px solid #38bdf8;"></div>
              <div onclick="selectFontColor('#facc15', this)" class="font-color-dot" style="background: #facc15; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              <div onclick="selectFontColor('#38bdf8', this)" class="font-color-dot" style="background: #38bdf8; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              <div onclick="selectFontColor('#4ade80', this)" class="font-color-dot" style="background: #4ade80; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              <div onclick="selectFontColor('#f87171', this)" class="font-color-dot" style="background: #f87171; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              <div onclick="selectFontColor('#c084fc', this)" class="font-color-dot" style="background: #c084fc; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              <div onclick="selectFontColor('#fb923c', this)" class="font-color-dot" style="background: #fb923c; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
            </div>
          </div>

          <!-- စာသားနောက်ခံအရောင် / အနားကွပ် ၈ မျိုး (O စက်ဝိုင်း Icon များ) -->
          <div>
            <label style="font-size: 0.75rem; margin-bottom: 6px; display: block;">နောက်ခံအရောင် / စာသားအနားကွပ် (၈ မျိုး)</label>
            <div style="display: flex; gap: 9px; align-items: center; flex-wrap: wrap;">
              <div onclick="selectBgStyle('rgba(0,0,0,0.75)', this)" class="bg-style-dot" title="မည်းကြည်" style="background: rgba(0,0,0,0.75); width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px solid #38bdf8;"></div>
              <div onclick="selectBgStyle('#000000', this)" class="bg-style-dot" title="အနက်" style="background: #000000; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              <div onclick="selectBgStyle('rgba(185,28,28,0.75)', this)" class="bg-style-dot" title="နီကြည်" style="background: #b91c1c; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              <div onclick="selectBgStyle('rgba(30,58,138,0.75)', this)" class="bg-style-dot" title="ပြာကြည်" style="background: #1e3a8a; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              <div onclick="selectBgStyle('rgba(20,83,45,0.75)', this)" class="bg-style-dot" title="စိမ်းကြည်" style="background: #14532d; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              <div onclick="selectBgStyle('rgba(180,83,9,0.75)', this)" class="bg-style-dot" title="ဝါကြည်" style="background: #b45309; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              <div onclick="selectBgStyle('rgba(109,40,217,0.75)', this)" class="bg-style-dot" title="ခရမ်းကြည်" style="background: #6d28d9; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              <div onclick="selectBgStyle('stroke', this)" class="bg-style-dot" title="စာသားအနားကွပ် (နောက်ခံမပါ)" style="background: transparent; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px dashed #ffffff; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #fff; font-weight: bold;">⭕</div>
            </div>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
              <span style="color: #94a3b8;">စာလုံးဆိုဒ် (Font Size) - စခရင်ပေါ်ရှိ (↘) ကိုလည်း ထိဆွဲနိုင်သည်</span>
              <span id="srt-font-size-val" style="color: #38bdf8; font-weight: bold;">18px</span>
            </div>
            <input type="range" id="srt-size-slider" min="10" max="100" value="18" oninput="changeSrtFontSize(this.value)" style="width: 100%; cursor: pointer;" />
          </div>

          <div id="srt-edit-panel" style="display: none; flex-direction: column; gap: 8px;">
            <textarea id="srt-edit-textarea" rows="5" style="font-family: monospace; font-size: 0.75rem;"></textarea>
            <button onclick="saveAndApplySrtEdit()" class="btn" style="background: #10b981; padding: 8px; font-size: 0.8rem;">💾 SRT သိမ်းဆည်းမည်</button>
          </div>
        </div>

        <!-- Final Export Card -->
        <div class="card" style="background: linear-gradient(145deg, #1e1b4b, #0f172a); border: 1px solid #6366f1;">
          <div style="font-size: 0.9rem; font-weight: bold; color: #a5b4fc; margin-bottom: 6px;">🚀 Video အသေထည့်ပြီး Download လုပ်ခြင်း</div>
          <p style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 12px;">စာတန်းထိုး၊ Title၊ Watermark၊ Blur Box နှင့် Audio Mixer များကို Video ထဲတွင် အသေထည့်သွင်း၍ သိမ်းဆည်းပေးမည် ဖြစ်ပါသည်။</p>

          <button id="btn-export-hardcoded" onclick="exportHardcodedVideo()" class="btn" style="background: linear-gradient(90deg, #6366f1, #10b981); font-weight: bold; font-size: 0.95rem; padding: 14px;">
            <span>📥 အားလုံးပါဝင်သော Video အပြီးသတ် Download ရယူမည်</span>
          </button>

          <div id="export-progress-box" style="display: none; margin-top: 10px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
              <span id="export-status-title" style="color: #38bdf8;">Render ပြုလုပ်နေပါသည်...</span>
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
  setupTouchDragOverlay("draggable-title");
  setupTouchDragOverlay("draggable-watermark");
  setupTouchDragOverlay("draggable-blur");

  setupTouchResize("draggable-watermark", "wm-resize-handle");
  setupTouchResize("draggable-blur", "blur-resize-handle");
  setupSubtitleTouchResize();
}

function handleVideoFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  const videoPlayer = document.getElementById("recap-video-player");
  const wrapper = document.getElementById("video-wrapper");

  videoPlayer.src = URL.createObjectURL(file);
  videoPlayer.onloadedmetadata = () => {
    const aspect = (videoPlayer.videoWidth || 16) / (videoPlayer.videoHeight || 9);
    wrapper.style.aspectRatio = `${aspect}`;
  };
}

function toggleAudioMixerDropdown() {
  const content = document.getElementById("audio-mixer-dropdown-content");
  const chevron = document.getElementById("audio-mixer-chevron");
  if (content.style.display === "none") {
    content.style.display = "flex";
    chevron.innerText = "▲ ပိတ်မည်";
  } else {
    content.style.display = "none";
    chevron.innerText = "▼ အသံချိန်ညှိမည်";
  }
}

function setupAudioMixerListeners() {
  const vSlider = document.getElementById("vol-video-slider");
  const aSlider = document.getElementById("vol-ai-slider");
  const bSlider = document.getElementById("vol-bgm-slider");
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
}

function handleBgmFileSelect(e) {
  if (e.target.files && e.target.files[0]) {
    const bgmUrl = URL.createObjectURL(e.target.files[0]);
    if (currentBgmAudio) currentBgmAudio.pause();
    currentBgmAudio = new Audio(bgmUrl);
    currentBgmAudio.loop = true;
    currentBgmAudio.volume = document.getElementById("vol-bgm-slider").value / 100;
    document.getElementById("btn-remove-bgm").style.display = "block";
  }
}

function removeBgmAudio() {
  if (currentBgmAudio) {
    currentBgmAudio.pause();
    currentBgmAudio = null;
  }
  document.getElementById("recap-bgm-file").value = "";
  document.getElementById("btn-remove-bgm").style.display = "none";
}

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
      document.getElementById("btn-remove-wm").style.display = "block";
      isWatermarkActive = true;
    };
  };
  reader.readAsDataURL(file);
}

function removeWatermark() {
  watermarkImg = null;
  isWatermarkActive = false;
  document.getElementById("watermark-file-input").value = "";
  document.getElementById("draggable-watermark").style.display = "none";
  document.getElementById("btn-remove-wm").style.display = "none";
}

function toggleVideoTitle() {
  isTitleActive = !isTitleActive;
  const titleEl = document.getElementById("draggable-title");
  const controls = document.getElementById("title-controls-box");
  const btn = document.getElementById("btn-title-toggle");

  if (isTitleActive) {
    titleEl.style.display = "block";
    controls.style.display = "flex";
    btn.innerText = "Title: ON";
    btn.style.background = "#facc15";
    btn.style.color = "#000";
  } else {
    titleEl.style.display = "none";
    controls.style.display = "none";
    btn.innerText = "Title: OFF";
    btn.style.background = "#475569";
    btn.style.color = "#fff";
  }
}

function updateCustomTitleText(text) {
  document.getElementById("draggable-title").innerText = text || "ခေါင်းစဉ် စာသား";
}

function changeTitleFontSize(val) {
  titleFontSize = val;
  document.getElementById("title-size-val").innerText = `${val}px`;
  document.getElementById("draggable-title").style.fontSize = `${val}px`;
}

function setupTouchDragOverlay(elementId) {
  const el = document.getElementById(elementId);
  const wrapper = document.getElementById("video-wrapper");

  let isDragging = false;
  let startX, startY, origX, origY;

  function onStart(e) {
    if (e.target.id && e.target.id.includes("resize-handle")) return;
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

function setupSubtitleTouchResize() {
  const handle = document.getElementById("sub-resize-handle");
  const slider = document.getElementById("srt-size-slider");
  const sizeVal = document.getElementById("srt-font-size-val");

  let isResizing = false;
  let startX, startSize;

  function onStart(e) {
    e.stopPropagation();
    isResizing = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    startX = clientX;
    startSize = srtFontSize;
  }

  function onMove(e) {
    if (!isResizing) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - startX;
    let newSize = Math.max(10, Math.min(100, Math.round(startSize + deltaX * 0.35)));
    srtFontSize = newSize;
    if (slider) slider.value = newSize;
    if (sizeVal) sizeVal.innerText = `${newSize}px`;
    applySrtStyles();
  }

  function onEnd() { isResizing = false; }

  handle.addEventListener("touchstart", onStart, { passive: false });
  window.addEventListener("touchmove", onMove, { passive: false });
  window.addEventListener("touchend", onEnd);
  handle.addEventListener("mousedown", onStart);
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onEnd);
}

function setupTouchResize(targetId, handleId) {
  const target = document.getElementById(targetId);
  const handle = document.getElementById(handleId);

  let isResizing = false;
  let startX, startY, startW, startH;

  function onResizeStart(e) {
    e.stopPropagation();
    isResizing = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    startX = clientX;
    startY = clientY;
    startW = target.clientWidth;
    startH = target.clientHeight;
  }

  function onResizeMove(e) {
    if (!isResizing) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const newW = Math.max(30, startW + (clientX - startX));
    const newH = Math.max(20, startH + (clientY - startY));

    target.style.width = `${newW}px`;
    target.style.height = `${newH}px`;
  }

  function onResizeEnd() { isResizing = false; }

  handle.addEventListener("touchstart", onResizeStart, { passive: false });
  window.addEventListener("touchmove", onResizeMove, { passive: false });
  window.addEventListener("touchend", onResizeEnd);
  handle.addEventListener("mousedown", onResizeStart);
  window.addEventListener("mousemove", onResizeMove);
  window.addEventListener("mouseup", onResizeEnd);
}

function toggleBlurBox() {
  isBlurActive = !isBlurActive;
  const blurBox = document.getElementById("draggable-blur");
  const btn = document.getElementById("btn-blur-toggle");

  if (isBlurActive) {
    blurBox.style.display = "flex";
    btn.innerText = "Blur: ON";
    btn.style.background = "#facc15";
    btn.style.color = "#000";
  } else {
    blurBox.style.display = "none";
    btn.innerText = "Blur: OFF";
    btn.style.background = "#475569";
    btn.style.color = "#fff";
  }
}

function selectFontColor(color, el) {
  srtFontColor = color;
  document.querySelectorAll(".font-color-dot").forEach(d => d.style.borderColor = "transparent");
  el.style.borderColor = "#38bdf8";
  applySrtStyles();
}

function selectBgStyle(style, el) {
  srtBgStyle = style;
  document.querySelectorAll(".bg-style-dot").forEach(d => {
    d.style.borderColor = (d.getAttribute("title") && d.getAttribute("title").includes("အနားကွပ်")) ? "#ffffff" : "transparent";
  });
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
  if (!sub) return;

  sub.style.color = srtFontColor;
  sub.style.fontSize = `${srtFontSize}px`;

  if (srtBgStyle === "stroke") {
    sub.style.background = "transparent";
    sub.style.textShadow = "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 3px 6px rgba(0,0,0,0.9)";
  } else {
    sub.style.background = srtBgStyle;
    sub.style.textShadow = "none";
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

// ဗီဒီယိုမှ မြင်ကွင်း Snapshot ၅ ပုံ အလိုအလျောက် ဖြတ်ယူခြင်း (Gemini Vision အတွက်)
async function extractVideoKeyframes(file, count = 5) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadedmetadata = async () => {
      const duration = video.duration || 10;
      const timestamps = [];
      for (let i = 1; i <= count; i++) {
        timestamps.push((duration / (count + 1)) * i);
      }

      const canvas = document.createElement("canvas");
      const width = 320;
      const height = Math.round((video.videoHeight / (video.videoWidth || 1)) * width) || 180;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      const frames = [];

      for (const t of timestamps) {
        await new Promise((res) => {
          let done = false;
          const timer = setTimeout(() => {
            if (!done) { done = true; res(); }
          }, 800);

          video.currentTime = t;
          video.onseeked = () => {
            if (!done) {
              done = true;
              clearTimeout(timer);
              try {
                ctx.drawImage(video, 0, 0, width, height);
                const dataUrl = canvas.toDataURL("image/jpeg", 0.5);
                const base64 = dataUrl.split(",")[1];
                if (base64) frames.push(base64);
              } catch (e) {}
              res();
            }
          };
        });
      }

      URL.revokeObjectURL(url);
      resolve(frames);
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve([]);
    };
  });
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
  const textSpan = document.getElementById("subtitle-text-content");
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
    pTitle.innerText = "ဗီဒီယိုအသံနှင့် မြင်ကွင်း Snapshots များ ဖတ်ယူနေပါသည်...";
    pPercent.innerText = "30%";
    pBar.style.width = "30%";

    // အသံနှင့် မြင်ကွင်း Snapshots များကို တပြိုင်နက်တည်း အမြန်ဆုံး ဖြတ်ယူခြင်း
    const [{ audioBase64, duration }, frames] = await Promise.all([
      extractAudioOptimized(file),
      extractVideoKeyframes(file, 5)
    ]);

    pTitle.innerText = "Gemini Vision က မြင်ကွင်း + အသံကို ကြည့်ရှုပြီး Recap ရေးနေပါသည်...";
    pPercent.innerText = "60%";
    pBar.style.width = "60%";

    const scriptRes = await fetch("/api/generate-recap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioBase64, frames, tone, videoDuration: Math.round(duration) }),
    });

    const scriptData = await scriptRes.json();
    if (!scriptRes.ok) throw new Error(scriptData.error || "Recap စာသား ရေးသားမှု မအောင်မြင်ပါ");

    const recapScript = scriptData.script;
    scriptText.value = recapScript;

    pTitle.innerText = "ရွေးချယ်ထားသော အသံဖိုင် ဖန်တီးနေပါသည်...";
    pPercent.innerText = "85%";
    pBar.style.width = "85%";

    const audioRes = await fetch("/api/generate-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fetchAudioOnly: true,
        scriptText: recapScript,
        voice: voice
      })
    });

    const audioData = await audioRes.json();
    if (!audioRes.ok) throw new Error(audioData.error || "အသံဖိုင် ထုတ်ယူမှု မအောင်မြင်ပါ");

    pPercent.innerText = "100%";
    pBar.style.width = "100%";
    pTitle.innerText = "အားလုံး အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ!";
    resultBox.style.display = "flex";

    const audioBlob = new Blob([Uint8Array.from(atob(audioData.audioBase64), c => c.charCodeAt(0))], { type: "audio/mp3" });
    if (currentRecapAudio) currentRecapAudio.pause();
    currentRecapAudio = new Audio(URL.createObjectURL(audioBlob));

    videoPlayer.src = URL.createObjectURL(file);
    videoPlayer.volume = document.getElementById("vol-video-slider").value / 100;
    currentRecapAudio.volume = document.getElementById("vol-ai-slider").value / 100;

    currentRecapAudio.onloadedmetadata = () => {
      const realAudioDuration = currentRecapAudio.duration || duration;
      const accurateSrt = generateAccurateSrt(recapScript, realAudioDuration);
      window.currentSrtRaw = accurateSrt;
      document.getElementById("srt-edit-textarea").value = accurateSrt;
      recapSrtCues = parseSrtCues(accurateSrt);
    };

    videoPlayer.ontimeupdate = () => {
      if (!isSrtVisible) return;
      const curr = videoPlayer.currentTime;
      const cue = recapSrtCues.find(c => curr >= c.start && curr <= c.end);
      if (textSpan) textSpan.innerText = cue ? cue.text : "";

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

async function exportHardcodedVideo() {
  const video = document.getElementById("recap-video-player");
  const wrapper = document.getElementById("video-wrapper");
  const subEl = document.getElementById("draggable-subtitle");
  const titleEl = document.getElementById("draggable-title");
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
  exportTitle.innerText = "Render ပြုလုပ်နေပါသည်...";

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext("2d");

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const dest = audioCtx.createMediaStreamDestination();

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
    a.download = `Recap_Final_${Date.now()}.webm`;
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

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

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

    if (isWatermarkActive && watermarkImg && wmEl.style.display !== "none") {
      const wx = wmEl.offsetLeft * scaleX;
      const wy = wmEl.offsetTop * scaleY;
      const ww = wmEl.clientWidth * scaleX;
      const wh = wmEl.clientHeight * scaleY;
      ctx.drawImage(watermarkImg, wx, wy, ww, wh);
    }

    if (isTitleActive && titleEl.style.display !== "none") {
      const tx = (titleEl.offsetLeft + titleEl.clientWidth / 2) * scaleX;
      const ty = (titleEl.offsetTop + titleEl.clientHeight / 2) * scaleY;
      const dynamicTitleSize = Math.round(titleFontSize * scaleY);

      ctx.font = `bold ${dynamicTitleSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.shadowColor = "#000000";
      ctx.shadowBlur = 8;
      ctx.fillStyle = "#facc15";
      ctx.fillText(titleEl.innerText, tx, ty);
      ctx.shadowBlur = 0;
    }

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

        if (srtBgStyle === "stroke") {
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 5 * scaleX;
          ctx.strokeText(currentCue.text, sx, sy);
          ctx.fillStyle = srtFontColor;
          ctx.fillText(currentCue.text, sx, sy);
        } else {
          const textMetrics = ctx.measureText(currentCue.text);
          const paddingX = 14 * scaleX;
          const paddingY = 8 * scaleY;
          const boxWidth = textMetrics.width + paddingX * 2;
          const boxHeight = dynamicFontSize + paddingY * 2;

          ctx.fillStyle = srtBgStyle;
          ctx.beginPath();
          ctx.roundRect(sx - boxWidth / 2, sy - boxHeight / 2, boxWidth, boxHeight, 8 * scaleX);
          ctx.fill();

          ctx.fillStyle = srtFontColor;
          ctx.fillText(currentCue.text, sx, sy);
        }
      }
    }

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

if (document.readyState !== "loading") {
  initRecapsView();
} else {
  document.addEventListener("DOMContentLoaded", initRecapsView);
}
