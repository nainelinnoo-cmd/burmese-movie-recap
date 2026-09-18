let s_currentVoice = "edge-nilar";
let s_seriesData = null;
let s_currentEpNum = 1;
let s_scenePrompts = [];
let s_sceneImages = [];
let s_aspectRatio = "16:9";

// Custom Motion Controls
let s_motionStyle = "dynamic"; // "dynamic", "zoom-in", "zoom-out", "pan-left", "pan-right"
let s_clipDurationMode = "auto"; // "auto", "3", "5", "7"

let s_audioEl = null;
let s_currentBgm = null;
let s_srtCues = [];
let s_isMotionPlaying = false;
let s_animFrameId = null;

// Overlays Settings
let s_isTitleActive = false;
let s_isWatermarkActive = false;
let s_isSrtVisible = true;

let s_srtFontSize = 18;
let s_srtFontColor = "#ffffff";
let s_srtBgStyle = "rgba(0,0,0,0.75)";
let s_titleFontSize = 24;
let s_watermarkImg = null;

function initStoryView() {
  const container = document.getElementById("view-story") ||
                    document.getElementById("story-view") ||
                    document.getElementById("story-container");
  if (!container) return;

  container.innerHTML = `
    <style>
      .step-badge {
        background: #0284c7;
        color: #fff;
        font-size: 0.75rem;
        padding: 2px 8px;
        border-radius: 6px;
        font-weight: bold;
      }
      .ratio-btn {
        flex: 1;
        padding: 8px;
        background: #1e293b;
        border: 1px solid #334155;
        color: #94a3b8;
        font-weight: bold;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.8rem;
      }
      .ratio-btn.active {
        background: #38bdf8;
        color: #000;
        border-color: #38bdf8;
      }
      .ep-btn {
        padding: 8px 0;
        border-radius: 6px;
        border: 1px solid #334155;
        background: #1e293b;
        color: #fff;
        font-weight: bold;
        cursor: pointer;
        font-size: 0.8rem;
      }
      .ep-btn.active {
        background: #38bdf8;
        color: #000;
        border-color: #38bdf8;
      }
    </style>

    <div style="display: flex; flex-direction: column; gap: 14px;">

      <!-- Global Accurate Progress Loading Bar -->
      <div id="s-global-progress" style="display: none; background: #1e293b; border: 1px solid #0284c7; border-radius: 12px; padding: 12px;">
        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 6px;">
          <span id="s-progress-status-title" style="color: #38bdf8; font-weight: bold;">လုပ်ဆောင်နေပါသည်...</span>
          <span id="s-progress-status-pct" style="color: #facc15; font-weight: bold;">0%</span>
        </div>
        <div style="width: 100%; height: 8px; background: #0f172a; border-radius: 6px; overflow: hidden;">
          <div id="s-progress-status-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #38bdf8, #10b981); transition: width 0.25s ease;"></div>
        </div>
      </div>

      <!-- အဆင့် ၁: ပုံပြင်စာသား ရေးသားခြင်း (Series Ep 1-6 / Movie) -->
      <div class="card" style="display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: bold; color: #38bdf8;"><span class="step-badge">အဆင့် ၁</span> 📝 ပုံပြင်စာသား ရေးသားခြင်း</span>
        </div>

        <input type="text" id="s-topic-input" placeholder="ဇာတ်လမ်းခေါင်းစဉ် ရိုက်ပါ (ဥပမာ- ရွာထိပ်က စုန်းမကြီး)..." style="font-size: 0.85rem;" />

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
          <div>
            <label style="font-size: 0.72rem; margin-bottom: 2px;">🎬 ဇာတ်လမ်းပုံစံ</label>
            <select id="s-format-select" style="height: 40px; font-size: 0.8rem;">
              <option value="movie" selected>🎬 Movie (တစ်ပိုင်း)</option>
              <option value="series">📺 Series (၆ ပိုင်း)</option>
            </select>
          </div>
          <div>
            <label style="font-size: 0.72rem; margin-bottom: 2px;">🎭 အမျိုးအစား</label>
            <select id="s-genre-select" style="height: 40px; font-size: 0.8rem;">
              <option value="horror">👻 သရဲ</option>
              <option value="mystery">🔍 လျှို့ဝှက်</option>
              <option value="drama">💔 ဘဝ</option>
              <option value="motivation">💪 ခွန်အား</option>
            </select>
          </div>
          <div>
            <label style="font-size: 0.72rem; margin-bottom: 2px;">⏱️ တစ်ပိုင်းကြာချိန်</label>
            <select id="s-duration-select" style="height: 40px; font-size: 0.8rem;">
              <option value="1">၁ မိနစ်</option>
              <option value="2">၂ မိနစ်</option>
              <option value="3">၃ မိနစ်</option>
            </select>
          </div>
        </div>

        <button onclick="handleGenerateStoryScript()" id="btn-gen-script" class="btn" style="background: #0284c7; padding: 10px; font-size: 0.85rem;">
          <span>✨ AI ဖြင့် မြန်မာစာသီးသန့် ဇာတ်လမ်းရေးမည်</span>
        </button>

        <!-- Series ဖြစ်ပါက Ep 1 to 6 ခလုတ်များ -->
        <div id="s-ep-buttons-container" style="display: none; flex-direction: column; gap: 6px;">
          <label style="font-size: 0.75rem; color: #facc15; font-weight: bold;">📺 အပိုင်းများ ရွေးချယ်ရန် (Ep 1 to 6)</label>
          <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px;">
            <button onclick="selectStoryEpisode(1)" id="btn-sep-1" class="ep-btn active">Ep 1</button>
            <button onclick="selectStoryEpisode(2)" id="btn-sep-2" class="ep-btn">Ep 2</button>
            <button onclick="selectStoryEpisode(3)" id="btn-sep-3" class="ep-btn">Ep 3</button>
            <button onclick="selectStoryEpisode(4)" id="btn-sep-4" class="ep-btn">Ep 4</button>
            <button onclick="selectStoryEpisode(5)" id="btn-sep-5" class="ep-btn">Ep 5</button>
            <button onclick="selectStoryEpisode(6)" id="btn-sep-6" class="ep-btn">Ep 6</button>
          </div>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span id="s-current-label" style="font-size: 0.78rem; color: #38bdf8; font-weight: bold;">📖 ဇာတ်လမ်းစာသား (စိတ်ကြိုက် ပြင်ဆင်နိုင်သည်)</span>
          </div>
          <textarea id="s-script-textarea" rows="5" placeholder="AI ရေးပေးသော မြန်မာစာသား ဤနေရာတွင် ပေါ်လာမည်..." style="font-size: 0.85rem;"></textarea>
        </div>
      </div>

      <!-- ဆိုဒ် ရွေးချယ်ခြင်း: 16:9 / 9:16 / 1:1 -->
      <div class="card" style="background: #131d31; padding: 12px;">
        <label style="font-size: 0.8rem; margin-bottom: 6px; display: block; color: #facc15;">📐 ဗီဒီယို ဆိုဒ် (Aspect Ratio) ရွေးချယ်ပါ</label>
        <div style="display: flex; gap: 8px;">
          <button onclick="setVideoRatio('16:9', this)" class="ratio-btn active">📺 16:9 (Landscape)</button>
          <button onclick="setVideoRatio('9:16', this)" class="ratio-btn">📱 9:16 (TikTok/Reels)</button>
          <button onclick="setVideoRatio('1:1', this)" class="ratio-btn">🔲 1:1 (Square)</button>
        </div>
      </div>

      <!-- အဆင့် ၂: Prompt to Photo (ပုံအရေအတွက် နှင့် အသေးစိတ် ရွေးချယ်မှုများ) -->
      <div class="card" style="display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: bold; color: #38bdf8;"><span class="step-badge">အဆင့် ၂</span> 🎨 Prompt to Photo & Motion Settings</span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
          <div>
            <label style="font-size: 0.72rem; margin-bottom: 2px;">🖼️ ဓာတ်ပုံ အရေအတွက်</label>
            <select id="s-photo-count" style="height: 40px; font-size: 0.8rem;">
              <option value="2">၂ ပုံ</option>
              <option value="4" selected>၄ ပုံ</option>
              <option value="6">၆ ပုံ</option>
              <option value="8">၈ ပုံ</option>
            </select>
          </div>
          <div>
            <label style="font-size: 0.72rem; margin-bottom: 2px;">⏱️ Photo Clip Time</label>
            <select id="s-clip-duration" onchange="s_clipDurationMode = this.value" style="height: 40px; font-size: 0.8rem;">
              <option value="auto" selected>🎵 Auto (အသံနှင့်ညီ)</option>
              <option value="3">၃ စက္ကန့်</option>
              <option value="5">၅ စက္ကန့်</option>
              <option value="7">၇ စက္ကန့်</option>
            </select>
          </div>
          <div>
            <label style="font-size: 0.72rem; margin-bottom: 2px;">🎬 Motion စတိုင်</label>
            <select id="s-motion-style" onchange="s_motionStyle = this.value" style="height: 40px; font-size: 0.8rem;">
              <option value="dynamic" selected>🔀 Dynamic (စုံလင်)</option>
              <option value="zoom-in">🔍 Zoom In (အနီး)</option>
              <option value="zoom-out">🔎 Zoom Out (အဝေး)</option>
              <option value="pan-left">⬅️ Pan Left (ဘယ်)</option>
              <option value="pan-right">➡️ Pan Right (ညာ)</option>
            </select>
          </div>
        </div>

        <button onclick="handlePromptToPhoto()" id="btn-prompt-photo" class="btn" style="background: #8b5cf6; padding: 10px; font-size: 0.85rem;">
          <span>🖼️ စာသားမှ ဓာတ်ပုံများ ဆွဲယူမည် (Prompt to Photo)</span>
        </button>

        <div id="s-photo-preview-grid" style="display: none; grid-template-columns: repeat(4, 1fr); gap: 6px;"></div>
      </div>

      <!-- အဆင့် ၃: Text to Speech -->
      <div class="card" style="display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: bold; color: #38bdf8;"><span class="step-badge">အဆင့် ၃</span> 🎙️ Text to Speech</span>
        </div>

        <div style="display: flex; gap: 8px; align-items: center;">
          <select id="s-voice-select" style="height: 42px; font-size: 0.85rem; flex: 1; background: #080e1a; color: #38bdf8; border: 1.5px solid #1e3a8a; border-radius: 8px; padding: 0 8px;">
            <optgroup label="Edge-TTS">
              <option value="edge-nilar" selected>👩 နီလာ (ကြည်လင်)</option>
              <option value="edge-nilar-warm">🌸 နီလာ (နွေးထွေး)</option>
              <option value="edge-thiha">👨 သီဟ (ပုံမှန်)</option>
              <option value="edge-thiha-deep">🎙️ သီဟ (ဩဇာကြီး)</option>
            </optgroup>
            <optgroup label="Google TTS">
              <option value="google-my-female">👩 Google (မ)</option>
              <option value="google-my-male">👨 Google (ကျား)</option>
            </optgroup>
          </select>
          <button onclick="handleTextToSpeech()" id="btn-gen-audio" class="btn" style="width: auto; background: #10b981; padding: 8px 14px; font-size: 0.85rem;">
            <span>🔊 အသံထုတ်မည်</span>
          </button>
        </div>

        <audio id="s-audio-player" controls style="width: 100%; height: 38px; display: none;"></audio>
      </div>

      <!-- အဆင့် ၄: Motion Video Studio -->
      <div id="s-motion-studio" style="display: none; flex-direction: column; gap: 14px;">
        <div class="card" style="padding: 10px; background: #131d31;">
          <span style="font-weight: bold; color: #facc15; font-size: 0.9rem;"><span class="step-badge">အဆင့် ၄</span> 🎬 Motion Video Studio</span>
        </div>

        <div id="s-video-wrapper" style="position: relative; width: 100%; aspect-ratio: 16/9; max-height: 70vh; background: #000; border-radius: 12px; overflow: hidden; border: 1px solid #334155; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
          <canvas id="s-motion-canvas" width="1280" height="720" style="width: 100%; height: 100%; object-fit: contain;"></canvas>

          <!-- Title Overlay -->
          <div id="s-drag-title" style="display: none; position: absolute; top: 15px; left: 50%; transform: translateX(-50%); color: #facc15; font-weight: bold; font-size: 24px; cursor: move; z-index: 25; text-shadow: 2px 2px 4px #000; text-align: center; white-space: nowrap;">
            ခေါင်းစဉ် စာသား
          </div>

          <!-- Subtitle Overlay with ↘ Resize Handle -->
          <div id="s-drag-subtitle" style="position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); width: 86%; text-align: center; color: #ffffff; background: rgba(0,0,0,0.75); padding: 6px 12px; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: move; z-index: 15; touch-action: none; line-height: 1.4;">
            <span id="s-sub-text">စာတန်းထိုး ပြသမည့်နေရာ</span>
            <div id="s-sub-resize-handle" style="position: absolute; right: -7px; bottom: -7px; width: 22px; height: 22px; background: #10b981; color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; cursor: nwse-resize; touch-action: none; font-weight: bold;">↘</div>
          </div>

          <!-- Watermark Overlay with ↘ Resize Handle -->
          <div id="s-drag-watermark" style="display: none; position: absolute; top: 15px; right: 15px; width: 70px; height: 70px; cursor: move; z-index: 20; border: 1px dashed rgba(255,255,255,0.4); border-radius: 4px;">
            <img id="s-wm-preview-img" src="" style="width: 100%; height: 100%; object-fit: contain; pointer-events: none;" />
            <div id="s-wm-resize-handle" style="position: absolute; right: -6px; bottom: -6px; width: 20px; height: 20px; background: #38bdf8; color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; cursor: nwse-resize; touch-action: none; font-weight: bold;">↘</div>
          </div>
        </div>

        <button id="btn-s-play-toggle" onclick="toggleMotionPlayback()" class="btn" style="background: #10b981; padding: 12px;">
          <span id="s-play-text">▶ Motion Video စမ်းဖွင့်မည်</span>
        </button>

        <!-- Video Title Controls -->
        <div class="card" style="background: #131d31; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.85rem; font-weight: bold; color: #38bdf8;">✏️ Video Title / စာသားထည့်</span>
            <button onclick="toggleSTitle()" id="btn-s-title-toggle" class="btn" style="width: auto; padding: 4px 10px; font-size: 0.75rem; background: #475569;">Title: OFF</button>
          </div>
          <div id="s-title-box" style="display: none; flex-direction: column; gap: 6px;">
            <input type="text" id="s-title-input" placeholder="ဗီဒီယိုပေါ်တွင် ပြသမည့် ခေါင်းစဉ်..." oninput="updateSTitleText(this.value)" style="font-size: 0.85rem;" />
            <input type="range" id="s-title-size" min="10" max="100" value="24" oninput="changeSTitleSize(this.value)" style="width: 100%;" />
          </div>
        </div>

        <!-- Watermark Controls -->
        <div class="card" style="background: #131d31; display: flex; flex-direction: column; gap: 8px;">
          <span style="font-size: 0.85rem; font-weight: bold; color: #38bdf8;">🖼️ Watermark & တံဆိပ်</span>
          <div style="display: flex; gap: 8px; align-items: center;">
            <input type="file" id="s-wm-file" accept="image/*" onchange="handleSWatermarkUpload(event)" style="font-size: 0.75rem; padding: 6px; flex: 1;" />
            <button id="btn-s-remove-wm" onclick="removeSWatermark()" class="btn" style="display: none; width: auto; padding: 6px 10px; background: #ef4444; font-size: 0.75rem;">❌ ဖျက်မည်</button>
          </div>
        </div>

        <!-- Subtitle (SRT) Settings (၇ မျိုး & ၈ မျိုး ⭕) -->
        <div class="card" style="background: #131d31; display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.85rem; font-weight: bold; color: #38bdf8;">⚙️ Subtitle (SRT) စနစ်</span>
            <div style="display: flex; gap: 6px;">
              <button onclick="toggleSSrtEdit()" class="btn" style="width: auto; padding: 4px 8px; font-size: 0.75rem; background: #f59e0b; color: #000;">✏️ Edit</button>
              <button onclick="toggleSSrtVisibility()" id="btn-s-srt-toggle" class="btn" style="width: auto; padding: 4px 8px; font-size: 0.75rem; background: #0284c7; color: #fff;">SRT: ON</button>
            </div>
          </div>

          <div>
            <label style="font-size: 0.75rem; margin-bottom: 4px; display: block;">စာသားအရောင် (၇ မျိုး)</label>
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <div onclick="setSFontColor('#ffffff', this)" class="s-f-dot" style="background: #ffffff; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; border: 2px solid #38bdf8;"></div>
              <div onclick="setSFontColor('#facc15', this)" class="s-f-dot" style="background: #facc15; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              <div onclick="setSFontColor('#38bdf8', this)" class="s-f-dot" style="background: #38bdf8; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              <div onclick="setSFontColor('#4ade80', this)" class="s-f-dot" style="background: #4ade80; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              <div onclick="setSFontColor('#f87171', this)" class="s-f-dot" style="background: #f87171; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              <div onclick="setSFontColor('#c084fc', this)" class="s-f-dot" style="background: #c084fc; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              <div onclick="setSFontColor('#fb923c', this)" class="s-f-dot" style="background: #fb923c; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
            </div>
          </div>

          <div>
            <label style="font-size: 0.75rem; margin-bottom: 4px; display: block;">နောက်ခံအရောင် / စာသားအနားကွပ် (၈ မျိုး)</label>
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <div onclick="setSBgStyle('rgba(0,0,0,0.75)', this)" class="s-b-dot" title="မည်းကြည်" style="background: rgba(0,0,0,0.75); width: 24px; height: 24px; border-radius: 50%; cursor: pointer; border: 2px solid #38bdf8;"></div>
              <div onclick="setSBgStyle('#000000', this)" class="s-b-dot" title="အနက်" style="background: #000000; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              <div onclick="setSBgStyle('rgba(185,28,28,0.75)', this)" class="s-b-dot" title="နီကြည်" style="background: #b91c1c; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              <div onclick="setSBgStyle('rgba(30,58,138,0.75)', this)" class="s-b-dot" title="ပြာကြည်" style="background: #1e3a8a; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              <div onclick="setSBgStyle('rgba(20,83,45,0.75)', this)" class="s-b-dot" title="စိမ်းကြည်" style="background: #14532d; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              <div onclick="setSBgStyle('rgba(180,83,9,0.75)', this)" class="s-b-dot" title="ဝါကြည်" style="background: #b45309; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              <div onclick="setSBgStyle('rgba(109,40,217,0.75)', this)" class="s-b-dot" title="ခရမ်းကြည်" style="background: #6d28d9; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              <div onclick="setSBgStyle('stroke', this)" class="s-b-dot" title="စာသားအနားကွပ် (နောက်ခံမပါ)" style="background: transparent; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; border: 2px dashed #ffffff; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #fff; font-weight: bold;">⭕</div>
            </div>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
              <span style="color: #94a3b8;">စာလုံးဆိုဒ် (Font Size) - စခရင်ပေါ်ရှိ (↘) ကိုလည်း ထိဆွဲနိုင်သည်</span>
              <span id="s-srt-size-val" style="color: #38bdf8; font-weight: bold;">18px</span>
            </div>
            <input type="range" id="s-srt-size-slider" min="10" max="100" value="18" oninput="changeSSrtFontSize(this.value)" style="width: 100%; cursor: pointer;" />
          </div>

          <div id="s-srt-edit-box" style="display: none; flex-direction: column; gap: 6px;">
            <textarea id="s-srt-textarea" rows="4" style="font-family: monospace; font-size: 0.75rem;"></textarea>
            <button onclick="saveSSrtText()" class="btn" style="background: #10b981; padding: 6px; font-size: 0.75rem;">💾 SRT သိမ်းမည်</button>
          </div>
        </div>

        <!-- Audio Mixer (BGM) -->
        <div class="card" style="background: #131d31; display: flex; flex-direction: column; gap: 8px;">
          <span style="font-size: 0.85rem; font-weight: bold; color: #38bdf8;">🎚️ Audio Mixer & BGM</span>
          <div>
            <label style="font-size: 0.75rem;">🎵 စိတ်ကြိုက် BGM ဖိုင် တင်ရန် (MP3/WAV)</label>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input type="file" id="s-bgm-file" accept="audio/*" onchange="handleSBgmUpload(event)" style="font-size: 0.75rem; padding: 6px; flex: 1;" />
              <button id="btn-s-remove-bgm" onclick="removeSBgm()" class="btn" style="display: none; width: auto; padding: 6px 10px; background: #ef4444; font-size: 0.75rem;">❌ ဖျက်မည်</button>
            </div>
          </div>
        </div>

        <!-- Final Export Card -->
        <div class="card" style="background: linear-gradient(145deg, #1e1b4b, #0f172a); border: 1px solid #6366f1;">
          <div style="font-size: 0.9rem; font-weight: bold; color: #a5b4fc; margin-bottom: 6px;">🚀 Motion Video အပြီးသတ် Download လုပ်ခြင်း</div>
          <button id="btn-s-export" onclick="exportMotionHardcodedVideo()" class="btn" style="background: linear-gradient(90deg, #6366f1, #10b981); font-weight: bold; font-size: 0.95rem; padding: 14px;">
            <span>📥 အားလုံးပါဝင်သော Motion Video Download ရယူမည်</span>
          </button>
        </div>

      </div>
    </div>
  `;

  setupSTouchDrag("s-drag-title");
  setupSTouchDrag("s-drag-watermark");
  setupSTouchDrag("s-drag-subtitle");

  setupSTouchResize("s-drag-watermark", "s-wm-resize-handle");
  setupSSubtitleTouchResize();
}

// Progress Bar Controller (တိကျသော ရာခိုင်နှုန်း ပြသခြင်း)
function updateGlobalProgress(title, percent, show = true) {
  const box = document.getElementById("s-global-progress");
  const tEl = document.getElementById("s-progress-status-title");
  const pEl = document.getElementById("s-progress-status-pct");
  const bEl = document.getElementById("s-progress-status-bar");

  if (!show) {
    if (box) box.style.display = "none";
    return;
  }
  if (box) box.style.display = "block";
  if (tEl) tEl.innerText = title;
  if (pEl) pEl.innerText = `${percent}%`;
  if (bEl) bEl.style.width = `${percent}%`;
}

function setVideoRatio(ratio, el) {
  s_aspectRatio = ratio;
  document.querySelectorAll(".ratio-btn").forEach(b => b.classList.remove("active"));
  el.classList.add("active");

  const wrapper = document.getElementById("s-video-wrapper");
  const canvas = document.getElementById("s-motion-canvas");

  if (ratio === "16:9") {
    wrapper.style.aspectRatio = "16/9";
    canvas.width = 1280;
    canvas.height = 720;
  } else if (ratio === "9:16") {
    wrapper.style.aspectRatio = "9/16";
    canvas.width = 720;
    canvas.height = 1280;
  } else if (ratio === "1:1") {
    wrapper.style.aspectRatio = "1/1";
    canvas.width = 720;
    canvas.height = 720;
  }

  renderMotionFrame(0, 60);
}

// အဆင့် ၁: ပုံပြင်စာသား ရေးသားခြင်း (Progress % အမှန်ပြသခြင်း)
async function handleGenerateStoryScript() {
  const topic = document.getElementById("s-topic-input").value.trim();
  const format = document.getElementById("s-format-select").value;
  const genre = document.getElementById("s-genre-select").value;
  const duration = document.getElementById("s-duration-select").value;
  const btn = document.getElementById("btn-gen-script");
  const textarea = document.getElementById("s-script-textarea");
  const epContainer = document.getElementById("s-ep-buttons-container");

  if (!topic) return alert("ဇာတ်လမ်းခေါင်းစဉ် ရိုက်ထည့်ပေးပါ");

  btn.disabled = true;
  updateGlobalProgress("AI မော်ဒယ်များနှင့် ချိတ်ဆက်နေပါသည်...", 15, true);

  try {
    updateGlobalProgress("Gemini က မြန်မာစာသီးသန့် ဇာတ်လမ်း ရေးသားနေပါသည်...", 55, true);

    const res = await fetch("/api/generate-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generate_script",
        topic,
        format,
        genre,
        durationMinutes: duration
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    updateGlobalProgress("ဇာတ်လမ်းစာသား ရေးသားမှု ပြီးဆုံးပါပြီ!", 100, true);

    if (format === "series" && data.episodes && Array.isArray(data.episodes)) {
      s_seriesData = data;
      epContainer.style.display = "flex";
      selectStoryEpisode(1);
    } else {
      s_seriesData = null;
      epContainer.style.display = "none";
      const storyTitle = data.movie_title || topic;
      const storyContent = data.story_text || "";

      document.getElementById("s-current-label").innerText = `🎬 ${storyTitle} (ရုပ်ရှင်ဇာတ်လမ်းစာသား)`;
      textarea.value = storyContent;
      document.getElementById("s-title-input").value = storyTitle;
      updateSTitleText(storyTitle);
    }

    btn.innerText = "✨ စာသား အသစ်ပြန်ရေးမည်";
    setTimeout(() => updateGlobalProgress("", 0, false), 1500);

  } catch (err) {
    updateGlobalProgress("", 0, false);
    alert(`Error: ${err.message}`);
    btn.innerText = "✨ AI ဖြင့် မြန်မာစာသီးသန့် ဇာတ်လမ်းရေးမည်";
  } finally {
    btn.disabled = false;
  }
}

function selectStoryEpisode(epNum) {
  if (!s_seriesData || !s_seriesData.episodes) return;
  s_currentEpNum = epNum;

  for (let i = 1; i <= 6; i++) {
    const b = document.getElementById(`btn-sep-${i}`);
    if (b) {
      if (i === epNum) b.classList.add("active");
      else b.classList.remove("active");
    }
  }

  const ep = s_seriesData.episodes[epNum - 1];
  const epText = ep.text || "";
  document.getElementById("s-current-label").innerText = `📖 အပိုင်း ${epNum}: ${ep.title}`;
  document.getElementById("s-script-textarea").value = epText;
  document.getElementById("s-title-input").value = ep.title;
  updateSTitleText(ep.title);
}

// အဆင့် ၂: Prompt to Photo (ဓာတ်ပုံတစ်ပုံချင်းစီ အမှန်တကယ် Download ပြီးစီးမှု % အတိအကျ ပြသခြင်း)
async function handlePromptToPhoto() {
  const scriptText = document.getElementById("s-script-textarea").value.trim();
  const btn = document.getElementById("btn-prompt-photo");
  const grid = document.getElementById("s-photo-preview-grid");
  const count = parseInt(document.getElementById("s-photo-count").value) || 4;

  if (!scriptText) return alert("စာသား အရင်ရေးပေးပါ သို့မဟုတ် ရိုက်ထည့်ပေးပါ");

  btn.disabled = true;
  updateGlobalProgress("စာသားမှ မြင်ကွင်း Prompts များကို ခွဲထုတ်နေပါသည်...", 10, true);

  try {
    const res = await fetch("/api/generate-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate_prompts", scriptText, photoCount: count })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    s_scenePrompts = data.prompts || [];

    let w = 1280, h = 720;
    if (s_aspectRatio === "9:16") { w = 720; h = 1280; }
    if (s_aspectRatio === "1:1") { w = 720; h = 720; }

    grid.innerHTML = "";
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = `repeat(${Math.min(4, count)}, 1fr)`;

    for (let i = 0; i < count; i++) {
      grid.innerHTML += `<div style="aspect-ratio: 16/9; background: #0f172a; border-radius: 6px; overflow: hidden;"><img id="scene-img-${i}" src="" style="width:100%;height:100%;object-fit:cover;" /></div>`;
    }

    let loadedCount = 0;
    const totalPrompts = s_scenePrompts.length;

    const loadPromises = s_scenePrompts.map((p, idx) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        const seed = Math.floor(Math.random() * 99999);
        img.src = `https://image.pollinations.ai/prompt/${encodeURIComponent(p)}?width=${w}&height=${h}&nologo=true&seed=${seed}`;
        img.onload = () => {
          loadedCount++;
          const realPercent = Math.round(20 + (loadedCount / totalPrompts) * 80);
          updateGlobalProgress(`AI ဓာတ်ပုံ (${loadedCount}/${totalPrompts}) ရေးဆွဲပြီးစီးပါပြီ...`, realPercent, true);

          const previewImg = document.getElementById(`scene-img-${idx}`);
          if (previewImg) previewImg.src = img.src;
          resolve(img);
        };
        img.onerror = () => {
          loadedCount++;
          resolve(null);
        };
      });
    });

    s_sceneImages = (await Promise.all(loadPromises)).filter(Boolean);

    updateGlobalProgress("ဓာတ်ပုံများ အားလုံး အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ!", 100, true);
    btn.innerText = `✅ ဓာတ်ပုံ ${count} ပုံ အောင်မြင်စွာ ဆွဲပြီးပါပြီ (ပြန်ဆွဲနိုင်သည်)`;
    document.getElementById("s-motion-studio").style.display = "flex";
    renderMotionFrame(0, 60);

    setTimeout(() => updateGlobalProgress("", 0, false), 1500);

  } catch (err) {
    updateGlobalProgress("", 0, false);
    alert(`Photo Error: ${err.message}`);
  } finally {
    btn.disabled = false;
  }
}

// အဆင့် ၃: Text to Speech (TTS Progress % ပြသခြင်း)
async function handleTextToSpeech() {
  const scriptText = document.getElementById("s-script-textarea").value.trim();
  const voice = document.getElementById("s-voice-select").value;
  const btn = document.getElementById("btn-gen-audio");
  const audioEl = document.getElementById("s-audio-player");

  if (!scriptText) return alert("စာသား အရင်ရေးပေးပါ");

  btn.disabled = true;
  updateGlobalProgress("TTS ဆာဗာသို့ အသံဖိုင် တောင်းဆိုနေပါသည်...", 30, true);

  try {
    updateGlobalProgress("မြန်မာစကားပြော အသံလှိုင်းများ ထုတ်လုပ်နေပါသည်...", 70, true);

    const res = await fetch("/api/generate-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate_audio", scriptText, voice })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    updateGlobalProgress("အသံဖိုင်နှင့် စာတန်းထိုး ချိတ်ဆက်ပြီးပါပြီ!", 100, true);

    const audioBlob = new Blob([Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0))], { type: "audio/mp3" });
    audioEl.src = URL.createObjectURL(audioBlob);
    audioEl.style.display = "block";
    s_audioEl = audioEl;

    audioEl.onloadedmetadata = () => {
      const dur = audioEl.duration || 60;
      const srt = generateStorySrt(scriptText, dur);
      document.getElementById("s-srt-textarea").value = srt;
      s_srtCues = parseStorySrt(srt);
    };

    btn.innerText = "✅ အသံဖိုင် ရရှိပါပြီ";
    document.getElementById("s-motion-studio").style.display = "flex";

    setTimeout(() => updateGlobalProgress("", 0, false), 1500);

  } catch (err) {
    updateGlobalProgress("", 0, false);
    alert(`Audio Error: ${err.message}`);
  } finally {
    btn.disabled = false;
  }
}

// Custom Motion Styles & Dynamic Pan/Zoom Rendering
function renderMotionFrame(time, duration) {
  const canvas = document.getElementById("s-motion-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  if (s_sceneImages.length === 0) {
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

  // Clip Time Calculation (Auto or 3s, 5s, 7s)
  let segmentDur = (duration || 60) / s_sceneImages.length;
  if (s_clipDurationMode !== "auto") {
    segmentDur = parseFloat(s_clipDurationMode) || 5;
  }

  const idx = Math.floor(time / segmentDur) % s_sceneImages.length;
  const prog = (time % segmentDur) / segmentDur;

  const img = s_sceneImages[idx];
  if (!img) return;

  let scale = 1.0;
  let panX = 0;
  let panY = 0;

  // Selected Motion Styles
  if (s_motionStyle === "zoom-in") {
    scale = 1.0 + prog * 0.15;
  } else if (s_motionStyle === "zoom-out") {
    scale = 1.15 - prog * 0.15;
  } else if (s_motionStyle === "pan-left") {
    scale = 1.08;
    panX = (0.5 - prog) * 50;
  } else if (s_motionStyle === "pan-right") {
    scale = 1.08;
    panX = (prog - 0.5) * 50;
  } else {
    // Dynamic Mix (အခန်းတစ်ခုချင်းစီ အလိုက် မတူညီသော စတိုင်များ ပေါင်းစပ်လှုပ်ရှားခြင်း)
    if (idx % 4 === 0) {
      scale = 1.0 + prog * 0.12;
    } else if (idx % 4 === 1) {
      scale = 1.12 - prog * 0.12;
      panX = (prog - 0.5) * 30;
    } else if (idx % 4 === 2) {
      scale = 1.08;
      panX = (0.5 - prog) * 40;
    } else {
      scale = 1.06 + prog * 0.08;
      panY = (prog - 0.5) * 20;
    }
  }

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2 + panX, canvas.height / 2 + panY);
  ctx.scale(scale, scale);
  ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
  ctx.restore();
}

function toggleMotionPlayback() {
  if (!s_audioEl || !s_audioEl.src) return alert("အဆင့် ၃ မှ အသံဖိုင် အရင်ထုတ်ပေးပါခင်ဗျာ");
  const btnText = document.getElementById("s-play-text");

  if (s_audioEl.paused) {
    s_audioEl.play();
    if (s_currentBgm) s_currentBgm.play();
    s_isMotionPlaying = true;
    btnText.innerText = "⏸ Motion Video ခေတ္တရပ်မည်";

    function loop() {
      if (!s_isMotionPlaying) return;
      const curr = s_audioEl.currentTime;
      const dur = s_audioEl.duration || 60;
      renderMotionFrame(curr, dur);

      if (s_isSrtVisible) {
        const cue = s_srtCues.find(c => curr >= c.start && curr <= c.end);
        document.getElementById("s-sub-text").innerText = cue ? cue.text : "";
      }
      s_animFrameId = requestAnimationFrame(loop);
    }
    s_animFrameId = requestAnimationFrame(loop);

  } else {
    s_audioEl.pause();
    if (s_currentBgm) s_currentBgm.pause();
    s_isMotionPlaying = false;
    btnText.innerText = "▶ Motion Video စမ်းဖွင့်မည်";
    cancelAnimationFrame(s_animFrameId);
  }
}

// Overlays Controls (Title, Watermark, Subtitles)
function toggleSTitle() {
  s_isTitleActive = !s_isTitleActive;
  const el = document.getElementById("s-drag-title");
  const box = document.getElementById("s-title-box");
  const btn = document.getElementById("btn-s-title-toggle");
  el.style.display = s_isTitleActive ? "block" : "none";
  box.style.display = s_isTitleActive ? "flex" : "none";
  btn.innerText = s_isTitleActive ? "Title: ON" : "Title: OFF";
  btn.style.background = s_isTitleActive ? "#facc15" : "#475569";
  btn.style.color = s_isTitleActive ? "#000" : "#fff";
}

function updateSTitleText(t) {
  document.getElementById("s-drag-title").innerText = t || "ခေါင်းစဉ် စာသား";
}

function changeSTitleSize(v) {
  s_titleFontSize = v;
  document.getElementById("s-drag-title").style.fontSize = `${v}px`;
}

function handleSWatermarkUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    s_watermarkImg = new Image();
    s_watermarkImg.src = ev.target.result;
    s_watermarkImg.onload = () => {
      document.getElementById("s-wm-preview-img").src = ev.target.result;
      document.getElementById("s-drag-watermark").style.display = "block";
      document.getElementById("btn-s-remove-wm").style.display = "block";
      s_isWatermarkActive = true;
    };
  };
  reader.readAsDataURL(file);
}

function removeSWatermark() {
  s_watermarkImg = null;
  s_isWatermarkActive = false;
  document.getElementById("s-wm-file").value = "";
  document.getElementById("s-drag-watermark").style.display = "none";
  document.getElementById("btn-s-remove-wm").style.display = "none";
}

function setSFontColor(color, el) {
  s_srtFontColor = color;
  document.querySelectorAll(".s-f-dot").forEach(d => d.style.borderColor = "transparent");
  el.style.borderColor = "#38bdf8";
  applySSrtStyles();
}

function setSBgStyle(style, el) {
  s_srtBgStyle = style;
  document.querySelectorAll(".s-b-dot").forEach(d => {
    d.style.borderColor = (d.getAttribute("title") && d.getAttribute("title").includes("အနားကွပ်")) ? "#ffffff" : "transparent";
  });
  el.style.borderColor = "#38bdf8";
  applySSrtStyles();
}

function changeSSrtFontSize(val) {
  s_srtFontSize = val;
  document.getElementById("s-srt-size-val").innerText = `${val}px`;
  applySSrtStyles();
}

function applySSrtStyles() {
  const sub = document.getElementById("s-drag-subtitle");
  if (!sub) return;
  sub.style.color = s_srtFontColor;
  sub.style.fontSize = `${s_srtFontSize}px`;

  if (s_srtBgStyle === "stroke") {
    sub.style.background = "transparent";
    sub.style.textShadow = "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000";
  } else {
    sub.style.background = s_srtBgStyle;
    sub.style.textShadow = "none";
  }
}

function toggleSSrtVisibility() {
  s_isSrtVisible = !s_isSrtVisible;
  document.getElementById("s-drag-subtitle").style.display = s_isSrtVisible ? "block" : "none";
  document.getElementById("btn-s-srt-toggle").innerText = s_isSrtVisible ? "SRT: ON" : "SRT: OFF";
  document.getElementById("btn-s-srt-toggle").style.background = s_isSrtVisible ? "#0284c7" : "#475569";
}

function toggleSSrtEdit() {
  const b = document.getElementById("s-srt-edit-box");
  b.style.display = b.style.display === "none" ? "flex" : "none";
}

function saveSSrtText() {
  s_srtCues = parseStorySrt(document.getElementById("s-srt-textarea").value);
  alert("SRT သိမ်းဆည်းပြီးပါပြီ");
}

function handleSBgmUpload(e) {
  if (e.target.files && e.target.files[0]) {
    s_currentBgm = new Audio(URL.createObjectURL(e.target.files[0]));
    s_currentBgm.loop = true;
    document.getElementById("btn-s-remove-bgm").style.display = "block";
  }
}

function removeSBgm() {
  if (s_currentBgm) { s_currentBgm.pause(); s_currentBgm = null; }
  document.getElementById("s-bgm-file").value = "";
  document.getElementById("btn-s-remove-bgm").style.display = "none";
}

// Touch Dragging & Resizing
function setupSTouchDrag(elementId) {
  const el = document.getElementById(elementId);
  const wrapper = document.getElementById("s-video-wrapper");
  if (!el || !wrapper) return;

  let isDragging = false;
  let startX, startY, origX, origY;

  function onStart(e) {
    if (e.target.id && e.target.id.includes("resize-handle")) return;
    isDragging = true;
    startX = e.touches ? e.touches[0].clientX : e.clientX;
    startY = e.touches ? e.touches[0].clientY : e.clientY;
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
  }

  function onEnd() { isDragging = false; }

  el.addEventListener("touchstart", onStart, { passive: false });
  window.addEventListener("touchmove", onMove, { passive: false });
  window.addEventListener("touchend", onEnd);
  el.addEventListener("mousedown", onStart);
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onEnd);
}

function setupSSubtitleTouchResize() {
  const handle = document.getElementById("s-sub-resize-handle");
  const slider = document.getElementById("s-srt-size-slider");
  const valText = document.getElementById("s-srt-size-val");
  if (!handle) return;

  let isResizing = false;
  let startX, startSize;

  function onStart(e) {
    e.stopPropagation();
    isResizing = true;
    startX = e.touches ? e.touches[0].clientX : e.clientX;
    startSize = s_srtFontSize;
  }

  function onMove(e) {
    if (!isResizing) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const delta = clientX - startX;
    let newSize = Math.max(10, Math.min(100, Math.round(startSize + delta * 0.35)));
    s_srtFontSize = newSize;
    if (slider) slider.value = newSize;
    if (valText) valText.innerText = `${newSize}px`;
    applySSrtStyles();
  }

  function onEnd() { isResizing = false; }

  handle.addEventListener("touchstart", onStart, { passive: false });
  window.addEventListener("touchmove", onMove, { passive: false });
  window.addEventListener("touchend", onEnd);
  handle.addEventListener("mousedown", onStart);
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onEnd);
}

function setupSTouchResize(targetId, handleId) {
  const target = document.getElementById(targetId);
  const handle = document.getElementById(handleId);
  if (!target || !handle) return;

  let isResizing = false;
  let startX, startY, startW, startH;

  function onStart(e) {
    e.stopPropagation();
    isResizing = true;
    startX = e.touches ? e.touches[0].clientX : e.clientX;
    startY = e.touches ? e.touches[0].clientY : e.clientY;
    startW = target.clientWidth;
    startH = target.clientHeight;
  }

  function onMove(e) {
    if (!isResizing) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    target.style.width = `${Math.max(30, startW + (clientX - startX))}px`;
    target.style.height = `${Math.max(20, startH + (clientY - startY))}px`;
  }

  function onEnd() { isResizing = false; }

  handle.addEventListener("touchstart", onStart, { passive: false });
  window.addEventListener("touchmove", onMove, { passive: false });
  window.addEventListener("touchend", onEnd);
  handle.addEventListener("mousedown", onStart);
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onEnd);
}

function generateStorySrt(scriptText, totalDuration) {
  const sentences = scriptText.match(/[^။!?\n]+[။!?\n]?/g) || [scriptText];
  const chunks = sentences.map(s => s.trim()).filter(Boolean);
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

function parseStorySrt(srtText) {
  if (!srtText) return [];
  const blocks = srtText.trim().split(/\n\s*\n/);
  return blocks.map(block => {
    const lines = block.split("\n");
    if (lines.length >= 3) {
      const timeParts = lines[1].split(" --> ");
      const parseSec = (t) => {
        const [h, m, s] = t.split(":");
        const [sec, ms] = s.split(",");
        return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(sec) + parseInt(ms) / 1000;
      };
      return { start: parseSec(timeParts[0]), end: parseSec(timeParts[1]), text: lines.slice(2).join(" ") };
    }
    return null;
  }).filter(Boolean);
}

// ၈။ Final Hardcoded Video Export (Render Progress % ပြသခြင်း)
async function exportMotionHardcodedVideo() {
  if (!s_audioEl || !s_audioEl.src) return alert("ဗီဒီယိုနှင့် အသံဖိုင် အဆင်သင့် မရှိသေးပါ");

  const exportBtn = document.getElementById("btn-s-export");
  const wrapper = document.getElementById("s-video-wrapper");
  const subEl = document.getElementById("s-drag-subtitle");
  const titleEl = document.getElementById("s-drag-title");
  const wmEl = document.getElementById("s-drag-watermark");

  exportBtn.disabled = true;
  updateGlobalProgress("Motion Video ကို Render စတင်ပြုလုပ်နေပါသည်...", 5, true);

  const exportCanvas = document.createElement("canvas");
  if (s_aspectRatio === "9:16") {
    exportCanvas.width = 720;
    exportCanvas.height = 1280;
  } else if (s_aspectRatio === "1:1") {
    exportCanvas.width = 720;
    exportCanvas.height = 720;
  } else {
    exportCanvas.width = 1280;
    exportCanvas.height = 720;
  }
  const ctx = exportCanvas.getContext("2d");

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const dest = audioCtx.createMediaStreamDestination();

  try {
    const aSource = audioCtx.createMediaElementSource(s_audioEl);
    aSource.connect(dest);
  } catch (e) {}

  try {
    if (s_currentBgm) {
      const bSource = audioCtx.createMediaElementSource(s_currentBgm);
      bSource.connect(dest);
    }
  } catch (e) {}

  const canvasStream = exportCanvas.captureStream(30);
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...dest.stream.getAudioTracks()
  ]);

  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
    ? "video/webm;codecs=vp9,opus"
    : "video/webm";

  const recorder = new MediaRecorder(combinedStream, { mimeType });
  const chunks = [];

  recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: "video/webm" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Motion_Video_${s_aspectRatio.replace(":", "_")}_${Date.now()}.webm`;
    a.click();

    updateGlobalProgress("Motion Video Download ရယူပြီးပါပြီ!", 100, true);
    setTimeout(() => {
      updateGlobalProgress("", 0, false);
      exportBtn.disabled = false;
    }, 2000);
  };

  s_audioEl.currentTime = 0;
  if (s_currentBgm) s_currentBgm.currentTime = 0;
  recorder.start();
  await s_audioEl.play();
  if (s_currentBgm) s_currentBgm.play();

  const scaleX = exportCanvas.width / wrapper.clientWidth;
  const scaleY = exportCanvas.height / wrapper.clientHeight;

  function exportLoop() {
    if (s_audioEl.paused || s_audioEl.ended) return;

    const curr = s_audioEl.currentTime;
    const dur = s_audioEl.duration || 60;

    // Render Canvas Frame
    renderMotionFrame(curr, dur);
    ctx.drawImage(document.getElementById("s-motion-canvas"), 0, 0, exportCanvas.width, exportCanvas.height);

    if (s_isWatermarkActive && s_watermarkImg && wmEl.style.display !== "none") {
      ctx.drawImage(s_watermarkImg, wmEl.offsetLeft * scaleX, wmEl.offsetTop * scaleY, wmEl.clientWidth * scaleX, wmEl.clientHeight * scaleY);
    }

    if (s_isTitleActive && titleEl.style.display !== "none") {
      const tx = (titleEl.offsetLeft + titleEl.clientWidth / 2) * scaleX;
      const ty = (titleEl.offsetTop + titleEl.clientHeight / 2) * scaleY;
      ctx.font = `bold ${Math.round(s_titleFontSize * scaleY)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = "#facc15";
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 8;
      ctx.fillText(titleEl.innerText, tx, ty);
      ctx.shadowBlur = 0;
    }

    if (s_isSrtVisible && subEl.style.display !== "none") {
      const cue = s_srtCues.find(c => curr >= c.start && curr <= c.end);
      if (cue && cue.text) {
        const sx = (subEl.offsetLeft + subEl.clientWidth / 2) * scaleX;
        const sy = (subEl.offsetTop + subEl.clientHeight / 2) * scaleY;
        const dynFont = Math.round(s_srtFontSize * scaleY);

        ctx.font = `bold ${dynFont}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        if (s_srtBgStyle === "stroke") {
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 5 * scaleX;
          ctx.strokeText(cue.text, sx, sy);
          ctx.fillStyle = s_srtFontColor;
          ctx.fillText(cue.text, sx, sy);
        } else {
          const metrics = ctx.measureText(cue.text);
          const padX = 14 * scaleX;
          const padY = 8 * scaleY;
          const bW = metrics.width + padX * 2;
          const bH = dynFont + padY * 2;

          ctx.fillStyle = s_srtBgStyle;
          ctx.beginPath();
          ctx.roundRect(sx - bW / 2, sy - bH / 2, bW, bH, 8 * scaleX);
          ctx.fill();

          ctx.fillStyle = s_srtFontColor;
          ctx.fillText(cue.text, sx, sy);
        }
      }
    }

    const pct = Math.min(99, Math.round((curr / dur) * 100));
    updateGlobalProgress(`ဗီဒီယို Render ပြုလုပ်နေပါသည်...`, pct, true);

    requestAnimationFrame(exportLoop);
  }

  s_audioEl.onended = () => {
    recorder.stop();
    if (s_currentBgm) s_currentBgm.pause();
  };

  exportLoop();
}

window.initStoryView = initStoryView;
if (document.readyState !== "loading") { initStoryView(); } else { document.addEventListener("DOMContentLoaded", initStoryView); }

document.addEventListener("click", (e) => {
  if (e.target && e.target.closest && (e.target.closest("[onclick*='story']") || e.target.closest(".nav-item:nth-child(3)"))) {
    setTimeout(initStoryView, 60);
  }
});
