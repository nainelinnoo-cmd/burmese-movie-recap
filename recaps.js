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

// Performance / lifecycle state
let currentVideoObjectUrl = null;
let currentBgmObjectUrl = null;
let currentRecapAudioUrl = null;
let exportAudioGraph = null;
let activeExport = false;
let lastSrtCueIndex = -1;

function initRecapsView() {
  if (window.__recapsViewInitialized) return;
  window.__recapsViewInitialized = true;
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

      <!-- ၂။ အသံသရုပ်ဆောင် (သီဟ၊ နီလာ၊ Google ကျား/မ) နှင့် စတိုင် -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label style="height: 20px; line-height: 20px; margin-bottom: 6px; display: block;">🗣️ အသံသရုပ်ဆောင်</label>
          <select id="recap-voice-actor" style="height: 44px;">
            <optgroup label="Edge-TTS (သဘာဝ)">
              <option value="edge-thiha">👨 သီဟ (ပုံမှန်)</option>
              <option value="edge-thiha-deep">🎙️ သီဟ (ဩဇာကြီး)</option>
              <option value="edge-thiha-fast">⚡ သီဟ (သွက်လက်)</option>
              <option value="edge-nilar" selected>👩 နီလာ (ကြည်လင်)</option>
              <option value="edge-nilar-warm">🌸 နီလာ (နွေးထွေး)</option>
            </optgroup>
            <optgroup label="Google TTS">
              <option value="google-my-female">👩 Google (မ)</option>
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

          <!-- စာသားနောက်ခံအရောင် / အနားကွပ် ၈ မျိုး -->
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

          <button onclick="downloadSrtFile()" class="btn" style="background: #6366f1; padding: 10px; font-size: 0.85rem;">
            <span>📥 Subtitle (.SRT) ဖိုင် Download ရယူမည်</span>
          </button>
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
  const file = event.target.files?.[0];
  if (!file) return;
  const videoPlayer = document.getElementById("recap-video-player");
  const wrapper = document.getElementById("video-wrapper");
  if (!videoPlayer || !wrapper) return;

  if (currentVideoObjectUrl) URL.revokeObjectURL(currentVideoObjectUrl);
  currentVideoObjectUrl = URL.createObjectURL(file);
  videoPlayer.src = currentVideoObjectUrl;
  videoPlayer.load();
  videoPlayer.onloadedmetadata = () => {
    const aspect = (videoPlayer.videoWidth || 16) / (videoPlayer.videoHeight || 9);
    wrapper.style.aspectRatio = String(aspect);
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
  const file = e.target.files?.[0];
  if (!file) return;

  if (currentBgmAudio) currentBgmAudio.pause();
  if (currentBgmObjectUrl) URL.revokeObjectURL(currentBgmObjectUrl);

  currentBgmObjectUrl = URL.createObjectURL(file);
  currentBgmAudio = new Audio(currentBgmObjectUrl);
  currentBgmAudio.preload = "auto";
  currentBgmAudio.loop = true;
  currentBgmAudio.volume = Number(document.getElementById("vol-bgm-slider")?.value || 35) / 100;
  document.getElementById("btn-remove-bgm").style.display = "block";
}

function removeBgmAudio() {
  if (currentBgmAudio) {
    currentBgmAudio.pause();
    currentBgmAudio.removeAttribute("src");
    currentBgmAudio.load();
  }
  if (currentBgmObjectUrl) URL.revokeObjectURL(currentBgmObjectUrl);
  currentBgmAudio = null;
  currentBgmObjectUrl = null;
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
  if (!el || !wrapper) return;

  let dragging = false;
  let startX = 0, startY = 0, origX = 0, origY = 0;

  const onDown = (e) => {
    if (e.target.closest?.("[id$='resize-handle']")) return;
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    origX = el.offsetLeft; origY = el.offsetTop;
    el.style.transform = "none";
    el.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  };
  const onMove = (e) => {
    if (!dragging) return;
    const maxX = Math.max(0, wrapper.clientWidth - el.clientWidth);
    const maxY = Math.max(0, wrapper.clientHeight - el.clientHeight);
    el.style.left = `${Math.max(0, Math.min(maxX, origX + e.clientX - startX))}px`;
    el.style.top = `${Math.max(0, Math.min(maxY, origY + e.clientY - startY))}px`;
    el.style.right = "auto";
    el.style.bottom = "auto";
  };
  const stop = () => { dragging = false; };

  el.style.touchAction = "none";
  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", stop);
  el.addEventListener("pointercancel", stop);
}

function setupSubtitleTouchResize() {
  const handle = document.getElementById("sub-resize-handle");
  const slider = document.getElementById("srt-size-slider");
  const sizeVal = document.getElementById("srt-font-size-val");
  if (!handle) return;

  let resizing = false, startX = 0, startSize = 18;
  const onDown = (e) => {
    e.stopPropagation();
    resizing = true; startX = e.clientX; startSize = Number(srtFontSize);
    handle.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  };
  const onMove = (e) => {
    if (!resizing) return;
    const newSize = Math.max(10, Math.min(100, Math.round(startSize + (e.clientX - startX) * 0.35)));
    srtFontSize = newSize;
    if (slider) slider.value = newSize;
    if (sizeVal) sizeVal.innerText = `${newSize}px`;
    applySrtStyles();
  };
  const stop = () => { resizing = false; };

  handle.style.touchAction = "none";
  handle.addEventListener("pointerdown", onDown);
  handle.addEventListener("pointermove", onMove);
  handle.addEventListener("pointerup", stop);
  handle.addEventListener("pointercancel", stop);
}

function setupTouchResize(targetId, handleId) {
  const target = document.getElementById(targetId);
  const handle = document.getElementById(handleId);
  if (!target || !handle) return;

  let resizing = false, startX = 0, startY = 0, startW = 0, startH = 0;
  const onDown = (e) => {
    e.stopPropagation();
    resizing = true; startX = e.clientX; startY = e.clientY;
    startW = target.clientWidth; startH = target.clientHeight;
    handle.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  };
  const onMove = (e) => {
    if (!resizing) return;
    target.style.width = `${Math.max(30, startW + e.clientX - startX)}px`;
    target.style.height = `${Math.max(20, startH + e.clientY - startY)}px`;
  };
  const stop = () => { resizing = false; };

  handle.style.touchAction = "none";
  handle.addEventListener("pointerdown", onDown);
  handle.addEventListener("pointermove", onMove);
  handle.addEventListener("pointerup", stop);
  handle.addEventListener("pointercancel", stop);
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

function downloadSrtFile() {
  if (!window.currentSrtRaw) return alert("SRT ဒေတာ မရှိသေးပါ");
  const blob = new Blob([window.currentSrtRaw], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "recap_subtitles.srt";
  a.click();
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
  if (!srtText?.trim()) return [];

  const parseTime = (raw) => {
    const m = String(raw).trim().match(/(\d+):(\d{2}):(\d{2})[,.](\d{3})/);
    return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 1000 : NaN;
  };

  return srtText.trim().split(/\n\s*\n/).map(block => {
    const lines = block.split(/\r?\n/);
    const timeIndex = lines.findIndex(line => line.includes("-->"));
    if (timeIndex < 0) return null;
    const [a, b] = lines[timeIndex].split(/\s+-->\s+/);
    const start = parseTime(a), end = parseTime(b);
    const text = lines.slice(timeIndex + 1).join(" ").trim();
    return Number.isFinite(start) && Number.isFinite(end) && text ? { start, end, text } : null;
  }).filter(Boolean).sort((a, b) => a.start - b.start);
}

function getCueAtTime(time) {
  if (!recapSrtCues.length) return null;

  if (lastSrtCueIndex >= 0) {
    const cue = recapSrtCues[lastSrtCueIndex];
    if (cue && time >= cue.start && time <= cue.end) return cue;
  }

  let lo = 0, hi = recapSrtCues.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const cue = recapSrtCues[mid];
    if (time < cue.start) hi = mid - 1;
    else if (time > cue.end) lo = mid + 1;
    else {
      lastSrtCueIndex = mid;
      return cue;
    }
  }
  lastSrtCueIndex = Math.max(0, Math.min(recapSrtCues.length - 1, lo));
  return null;
}

// Lightweight scene snapshots + compressed audio for a much smaller request payload.
async function extractVideoKeyframes(file) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const frames = [];
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    };

    video.onerror = () => { cleanup(); resolve([]); };
    video.onloadedmetadata = async () => {
      try {
        const duration = Number.isFinite(video.duration) ? video.duration : 10;
        // Two well-spaced frames are enough for scene grounding and cut image upload roughly 1/3.
        const timestamps = [0.30, 0.70].map(r => Math.min(Math.max(0.1, duration * r), Math.max(0.1, duration - 0.05)));
        const width = 200;
        const height = Math.max(1, Math.round((video.videoHeight / Math.max(1, video.videoWidth)) * width));
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d", { alpha: false });

        for (const t of [...new Set(timestamps)]) {
          await new Promise(done => {
            let finished = false;
            const finish = () => {
              if (finished) return;
              finished = true;
              clearTimeout(timer);
              done();
            };
            const onSeeked = () => {
              try {
                ctx.drawImage(video, 0, 0, width, height);
                const base64 = canvas.toDataURL("image/jpeg", 0.28).split(",", 2)[1];
                if (base64) frames.push(base64);
              } catch (_) {}
              finish();
            };
            const timer = setTimeout(finish, 700);
            video.addEventListener("seeked", onSeeked, { once: true });
            video.currentTime = t;
          });
        }
      } finally {
        cleanup();
        resolve(frames);
      }
    };
    video.src = url;
  });
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

// Prefer Opus/WebM: a 30-60s clip is usually tens/hundreds of KB instead of ~1-2MB WAV.
// Falls back to the WAV path for browsers without MediaRecorder/captureStream.
async function extractAudioCompressed(file) {
  const video = document.createElement("video");
  const url = URL.createObjectURL(file);
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = url;

  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Audio metadata timeout")), 8000);
      video.onloadedmetadata = () => { clearTimeout(timer); resolve(); };
      video.onerror = () => { clearTimeout(timer); reject(new Error("Video audio track မဖတ်နိုင်ပါ")); };
    });

    if (!video.captureStream || !window.MediaRecorder) throw new Error("compressed audio unsupported");
    const sourceStream = video.captureStream();
    const audioTracks = sourceStream.getAudioTracks();
    if (!audioTracks.length) throw new Error("No audio track");

    const audioStream = new MediaStream(audioTracks);
    const mimeCandidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4"
    ];
    const mimeType = mimeCandidates.find(type => MediaRecorder.isTypeSupported(type));
    if (!mimeType) throw new Error("No supported audio recorder");

    const chunks = [];
    const recorder = new MediaRecorder(audioStream, {
      mimeType,
      audioBitsPerSecond: 32000
    });

    const done = new Promise((resolve, reject) => {
      recorder.ondataavailable = e => { if (e.data?.size) chunks.push(e.data); };
      recorder.onerror = () => reject(recorder.error || new Error("Audio recording failed"));
      recorder.onstop = async () => {
        try {
          const blob = new Blob(chunks, { type: mimeType });
          const buffer = await blob.arrayBuffer();
          resolve({ audioBase64: arrayBufferToBase64(buffer), duration: video.duration, audioMimeType: mimeType });
        } catch (e) { reject(e); }
      };
    });

    recorder.start(1000);
    video.currentTime = 0;
    await video.play();
    await new Promise(resolve => {
      const stop = () => { video.removeEventListener("ended", stop); resolve(); };
      video.addEventListener("ended", stop, { once: true });
      setTimeout(stop, Math.min(60000, Math.max(1000, video.duration * 1000 + 500)));
    });
    if (recorder.state !== "inactive") recorder.stop();
    const result = await done;
    return result;
  } finally {
    video.pause();
    URL.revokeObjectURL(url);
  }
}

async function extractAudioOptimized(file) {
  try {
    return await extractAudioCompressed(file);
  } catch (_) {
    // Compatibility fallback: the existing mono 16k WAV path.
  }

  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) throw new Error("Browser မှာ AudioContext မထောက်ပံ့ပါ");

  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new AudioContextCtor();
  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    const targetSampleRate = 16000;
    const maxSeconds = Math.min(audioBuffer.duration, 60);
    const targetLength = Math.max(1, Math.floor(maxSeconds * targetSampleRate));
    const offlineCtx = new OfflineAudioContext(1, targetLength, targetSampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start(0, 0, maxSeconds);
    const resampled = await offlineCtx.startRendering();
    const channelData = resampled.getChannelData(0);
    const outBuffer = new ArrayBuffer(44 + channelData.length * 2);
    const view = new DataView(outBuffer);
    const writeString = (pos, str) => { for (let i = 0; i < str.length; i++) view.setUint8(pos + i, str.charCodeAt(i)); };
    writeString(0, "RIFF"); view.setUint32(4, outBuffer.byteLength - 8, true); writeString(8, "WAVE"); writeString(12, "fmt ");
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, targetSampleRate, true);
    view.setUint32(28, targetSampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); writeString(36, "data");
    view.setUint32(40, channelData.length * 2, true);
    for (let i = 0, offset = 44; i < channelData.length; i++, offset += 2) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    }
    return { audioBase64: arrayBufferToBase64(outBuffer), duration: audioBuffer.duration, audioMimeType: "audio/wav" };
  } finally {
    await audioCtx.close().catch(() => {});
  }
}

async function fetchJson(url, options, timeoutMs = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); }
    catch (_) { throw new Error(`ဆာဗာမှ JSON မဟုတ်သော တုံ့ပြန်မှု ရရှိပါသည်: ${raw.slice(0, 120)}`); }
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    return data;
  } catch (err) {
    if (err.name === "AbortError") throw new Error("ဆာဗာတုံ့ပြန်ချိန် ကြာလွန်းပါသည်။");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}


async function streamRecapGeneration(payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);
  try {
    const response = await fetch("/api/generate-recap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    if (!response.ok) {
      const raw = await response.text();
      let data = null; try { data = JSON.parse(raw); } catch (_) {}
      throw new Error(data?.error || raw.slice(0, 160) || `Request failed (${response.status})`);
    }

    // NDJSON stream: {type:"stage",stage:"..."}\n ... {type:"result",script:"..."}\n
    if (!response.body) return await response.json();
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result = null;

    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.type === "stage") payload.onStage?.(event.stage);
        if (event.type === "result") result = event;
        if (event.type === "error") throw new Error(event.error || "Recap generation failed");
      }
      if (done) break;
    }
    if (buffer.trim()) {
      const event = JSON.parse(buffer);
      if (event.type === "result") result = event;
      if (event.type === "error") throw new Error(event.error || "Recap generation failed");
    }
    if (!result?.script) throw new Error("AI မှ Recap စာသား မရရှိပါ");
    return result;
  } catch (err) {
    if (err.name === "AbortError") throw new Error("Recap ဆာဗာတုံ့ပြန်ချိန် ကြာလွန်းပါသည်။");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function handleGenerateRecap() {
  const file = document.getElementById("recap-video-file")?.files?.[0];
  const voice = document.getElementById("recap-voice-actor")?.value;
  const tone = document.getElementById("recap-tone")?.value;
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

  if (!file) return alert("ဗီဒီယိုဖိုင် ရွေးချယ်ပေးပါ");

  errorBox.style.display = "none";
  resultBox.style.display = "none";
  generateBtn.disabled = true;
  generateBtn.style.opacity = "0.5";
  pContainer.style.display = "block";
  lastSrtCueIndex = -1;

  try {
    pTitle.innerText = "အသံနှင့် Scene Snapshots ဖတ်နေပါသည်...";
    pPercent.innerText = "25%";
    pBar.style.width = "25%";

    const [{ audioBase64, duration, audioMimeType }, frames] = await Promise.all([
      extractAudioOptimized(file),
      extractVideoKeyframes(file)
    ]);

    const actualVideoDuration = Math.max(1, Math.round(videoPlayer.duration || duration || 30));

    pTitle.innerText = "AI က Recap စာသားရေးနေပါသည်...";
    pPercent.innerText = "55%";
    pBar.style.width = "55%";

    const scriptData = await streamRecapGeneration({
      audioBase64,
      audioMimeType: audioMimeType || "audio/webm",
      frames,
      tone,
      videoDuration: actualVideoDuration,
      onStage: (stage) => {
        if (stage === "transcribing") {
          pTitle.innerText = "အသံကို မြန်မြန် Transcribe လုပ်နေပါသည်...";
          pPercent.innerText = "45%"; pBar.style.width = "45%";
        } else if (stage === "writing") {
          pTitle.innerText = "AI က Recap စာသားရေးနေပါသည်...";
          pPercent.innerText = "70%"; pBar.style.width = "70%";
        }
      }
    });

    const recapScript = String(scriptData.script || "").trim();
    if (!recapScript) throw new Error("AI မှ Recap စာသား မရရှိပါ");
    scriptText.value = recapScript;

    pTitle.innerText = "ရွေးချယ်ထားသော အသံ ဖန်တီးနေပါသည်...";
    pPercent.innerText = "80%";
    pBar.style.width = "80%";

    const audioData = await fetchJson("/api/generate-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fetchAudioOnly: true, scriptText: recapScript, voice })
    });

    if (!audioData.audioBase64) throw new Error("အသံဖိုင်ဒေတာ မရရှိပါ");

    const audioBytes = Uint8Array.from(atob(audioData.audioBase64), c => c.charCodeAt(0));
    const audioBlob = new Blob([audioBytes], { type: "audio/mpeg" });

    if (currentRecapAudio) currentRecapAudio.pause();
    if (currentRecapAudioUrl) URL.revokeObjectURL(currentRecapAudioUrl);
    currentRecapAudioUrl = URL.createObjectURL(audioBlob);
    currentRecapAudio = new Audio(currentRecapAudioUrl);
    currentRecapAudio.preload = "auto";
    currentRecapAudio.volume = Number(document.getElementById("vol-ai-slider")?.value || 100) / 100;

    if (!currentVideoObjectUrl) currentVideoObjectUrl = URL.createObjectURL(file);
    videoPlayer.src = currentVideoObjectUrl;
    videoPlayer.volume = Number(document.getElementById("vol-video-slider")?.value || 0) / 100;
    videoPlayer.load();

    const applySrt = () => {
      const accurateSrt = generateAccurateSrt(recapScript, actualVideoDuration);
      window.currentSrtRaw = accurateSrt;
      document.getElementById("srt-edit-textarea").value = accurateSrt;
      recapSrtCues = parseSrtCues(accurateSrt);
      lastSrtCueIndex = -1;
    };

    if (videoPlayer.readyState >= 1) applySrt();
    else videoPlayer.addEventListener("loadedmetadata", applySrt, { once: true });

    videoPlayer.ontimeupdate = () => {
      const curr = videoPlayer.currentTime;
      if (isSrtVisible) {
        const cue = getCueAtTime(curr);
        if (textSpan) textSpan.innerText = cue?.text || "";
      }

      if (currentRecapAudio && Number.isFinite(currentRecapAudio.duration)) {
        const target = Math.min(curr, Math.max(0, currentRecapAudio.duration - 0.05));
        if (Math.abs(currentRecapAudio.currentTime - target) > 0.25) currentRecapAudio.currentTime = target;
      }

      if (currentBgmAudio && Number.isFinite(currentBgmAudio.duration) && currentBgmAudio.duration > 0) {
        const target = curr % currentBgmAudio.duration;
        if (Math.abs(currentBgmAudio.currentTime - target) > 0.4) currentBgmAudio.currentTime = target;
      }
    };

    videoPlayer.onplay = () => {
      currentRecapAudio?.play().catch(() => {});
      currentBgmAudio?.play().catch(() => {});
    };
    videoPlayer.onpause = () => {
      currentRecapAudio?.pause();
      currentBgmAudio?.pause();
    };
    videoPlayer.onseeking = () => {
      if (currentRecapAudio && Number.isFinite(currentRecapAudio.duration)) {
        currentRecapAudio.currentTime = Math.min(videoPlayer.currentTime, Math.max(0, currentRecapAudio.duration - 0.05));
      }
      if (currentBgmAudio && Number.isFinite(currentBgmAudio.duration) && currentBgmAudio.duration > 0) {
        currentBgmAudio.currentTime = videoPlayer.currentTime % currentBgmAudio.duration;
      }
    };
    videoPlayer.onended = () => {
      currentRecapAudio?.pause();
      currentBgmAudio?.pause();
    };

    pPercent.innerText = "100%";
    pBar.style.width = "100%";
    pTitle.innerText = "အားလုံး အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ!";
    resultBox.style.display = "flex";
  } catch (err) {
    pContainer.style.display = "none";
    errorBox.style.display = "block";
    errorBox.innerHTML = `<b>❌ Error:</b> ${String(err.message || err).replace(/[<>]/g, "")}`;
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

  if (!video.src || !video.videoWidth) return alert("ဗီဒီယို မရှိသေးပါ");
  if (activeExport) return;
  activeExport = true;

  exportBtn.disabled = true;
  exportBtn.style.opacity = "0.5";
  exportBox.style.display = "block";
  exportTitle.innerText = "Render ပြုလုပ်နေပါသည်...";
  exportBar.style.width = "0%";
  exportPercent.innerText = "0%";

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) { activeExport = false; throw new Error("Canvas မရရှိပါ"); }

  let audioCtx = null;
  let recorder = null;
  let rafId = 0;
  let stopped = false;

  const cleanup = async () => {
    cancelAnimationFrame(rafId);
    video.pause();
    currentRecapAudio?.pause();
    currentBgmAudio?.pause();
    // Keep the shared AudioContext alive so its MediaElementSource nodes
    // remain valid for the next export.
    activeExport = false;
    exportBtn.disabled = false;
    exportBtn.style.opacity = "1";
  };

  try {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) throw new Error("AudioContext မထောက်ပံ့သော Browser ဖြစ်ပါသည်");

    // A MediaElementSource can only be created once for a media element.
    // Keep one AudioContext/graph alive across exports instead of closing it
    // and trying to reuse nodes from a closed context.
    if (!exportAudioGraph) {
      const ctx = new AudioContextCtor();
      exportAudioGraph = {
        ctx,
        dest: ctx.createMediaStreamDestination(),
        nodes: new WeakMap()
      };
    }

    audioCtx = exportAudioGraph.ctx;
    const dest = exportAudioGraph.dest;

    const connect = (mediaEl, volume) => {
      if (!mediaEl) return;
      let graph = exportAudioGraph.nodes.get(mediaEl);

      if (!graph) {
        const source = audioCtx.createMediaElementSource(mediaEl);
        const gain = audioCtx.createGain();
        source.connect(gain);
        gain.connect(dest);
        gain.connect(audioCtx.destination);
        graph = { source, gain };
        exportAudioGraph.nodes.set(mediaEl, graph);
      }

      graph.gain.gain.value = volume;
    };

    connect(video, Number(document.getElementById("vol-video-slider")?.value || 0) / 100);
    connect(currentRecapAudio, Number(document.getElementById("vol-ai-slider")?.value || 100) / 100);
    connect(currentBgmAudio, Number(document.getElementById("vol-bgm-slider")?.value || 35) / 100);

    const canvasStream = canvas.captureStream(30);
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...dest.stream.getAudioTracks()
    ]);

    const mimeType = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm"
    ].find(type => MediaRecorder.isTypeSupported(type));

    if (!mimeType) throw new Error("ဒီ Browser မှာ Video Export format မထောက်ပံ့ပါ");

    recorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: Math.min(8_000_000, Math.max(2_500_000, canvas.width * canvas.height * 3))
    });

    const chunks = [];
    recorder.ondataavailable = e => { if (e.data?.size) chunks.push(e.data); };

    const stoppedPromise = new Promise(resolve => { recorder.onstop = resolve; });

    await audioCtx.resume();
    video.currentTime = 0;
    if (currentRecapAudio) currentRecapAudio.currentTime = 0;
    if (currentBgmAudio && Number.isFinite(currentBgmAudio.duration)) currentBgmAudio.currentTime = 0;

    const scaleX = canvas.width / Math.max(1, wrapper.clientWidth);
    const scaleY = canvas.height / Math.max(1, wrapper.clientHeight);

    const drawWrapped = (text, x, centerY, maxWidth, size) => {
      const words = String(text || "").split(/\s+/);
      const lines = [];
      let line = "";
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) {
          lines.push(line); line = word;
        } else line = test;
      }
      if (line) lines.push(line);
      const lh = size * 1.25;
      lines.forEach((t, i) => ctx.fillText(t, x, centerY + (i - (lines.length - 1) / 2) * lh));
    };

    const renderFrame = () => {
      if (stopped) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (isBlurActive && blurEl.style.display !== "none") {
        const bx = blurEl.offsetLeft * scaleX, by = blurEl.offsetTop * scaleY;
        const bw = blurEl.clientWidth * scaleX, bh = blurEl.clientHeight * scaleY;
        ctx.save();
        ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
        ctx.filter = "blur(18px)";
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      }

      if (isWatermarkActive && watermarkImg && wmEl.style.display !== "none") {
        ctx.drawImage(watermarkImg,
          wmEl.offsetLeft * scaleX, wmEl.offsetTop * scaleY,
          wmEl.clientWidth * scaleX, wmEl.clientHeight * scaleY);
      }

      if (isTitleActive && titleEl.style.display !== "none") {
        const x = (titleEl.offsetLeft + titleEl.clientWidth / 2) * scaleX;
        const y = (titleEl.offsetTop + titleEl.clientHeight / 2) * scaleY;
        const size = Math.max(12, Math.round(titleFontSize * scaleY));
        ctx.font = `bold ${size}px sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.shadowColor = "#000"; ctx.shadowBlur = 8; ctx.fillStyle = "#facc15";
        drawWrapped(titleEl.innerText, x, y, canvas.width * 0.9, size);
        ctx.shadowBlur = 0;
      }

      if (isSrtVisible && subEl.style.display !== "none") {
        const cue = getCueAtTime(video.currentTime);
        if (cue?.text) {
          const x = (subEl.offsetLeft + subEl.clientWidth / 2) * scaleX;
          const y = (subEl.offsetTop + subEl.clientHeight / 2) * scaleY;
          const size = Math.max(12, Math.round(srtFontSize * scaleY));
          const maxWidth = canvas.width * 0.86;
          ctx.font = `bold ${size}px sans-serif`;
          ctx.textAlign = "center"; ctx.textBaseline = "middle";

          if (srtBgStyle === "stroke") {
            ctx.strokeStyle = "#000"; ctx.lineWidth = Math.max(3, 5 * scaleX);
            ctx.lineJoin = "round"; ctx.strokeText(cue.text, x, y);
            ctx.fillStyle = srtFontColor; drawWrapped(cue.text, x, y, maxWidth, size);
          } else {
            const w = Math.min(maxWidth, ctx.measureText(cue.text).width) + 28 * scaleX;
            const h = size + 16 * scaleY;
            ctx.fillStyle = srtBgStyle;
            ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, 8 * scaleX); ctx.fill();
            ctx.fillStyle = srtFontColor; drawWrapped(cue.text, x, y, maxWidth, size);
          }
        }
      }

      const duration = Number.isFinite(video.duration) ? video.duration : 1;
      const pct = Math.min(99, Math.round((video.currentTime / duration) * 100));
      exportBar.style.width = `${pct}%`;
      exportPercent.innerText = `${pct}%`;
      rafId = requestAnimationFrame(renderFrame);
    };

    const stop = () => {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(rafId);
      if (recorder?.state !== "inactive") recorder.stop();
    };

    recorder.start(1000);
    video.onended = stop;
    renderFrame();
    await video.play();
    currentRecapAudio?.play().catch(() => {});
    currentBgmAudio?.play().catch(() => {});
    await stoppedPromise;

    const finalBlob = new Blob(chunks, { type: mimeType });
    const downloadUrl = URL.createObjectURL(finalBlob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `Recap_Final_${Date.now()}.webm`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);

    exportTitle.innerText = "ဗီဒီယို Download အောင်မြင်စွာ ရရှိပါပြီ!";
    exportBar.style.width = "100%";
    exportPercent.innerText = "100%";
  } catch (err) {
    exportTitle.innerText = `❌ ${err.message || "Export မအောင်မြင်ပါ"}`;
  } finally {
    await cleanup();
  }
}

if (document.readyState !== "loading") {
  initRecapsView();
} else {
  document.addEventListener("DOMContentLoaded", initRecapsView);
}
