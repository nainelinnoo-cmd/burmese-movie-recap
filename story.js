var s_currentVoice = "edge-nilar";
var s_seriesData = null;
var s_currentEpNum = 1;
var s_sceneImages = [];
var s_aspectRatio = "16:9";

var s_motionStyle = "dynamic";
var s_clipDurationMode = "auto";

var s_audioEl = null;
var s_currentBgm = null;
var s_srtCues = [];
var s_isMotionPlaying = false;
var s_animFrameId = null;

var s_isTitleActive = false;
var s_isWatermarkActive = false;
var s_isSrtVisible = true;

var s_srtFontSize = 18;
var s_srtFontColor = "#ffffff";
var s_srtBgStyle = "rgba(0,0,0,0.75)";
var s_titleFontSize = 24;
var s_watermarkImg = null;

function initStoryView() {
  var container = document.getElementById("view-story") ||
                  document.getElementById("story") ||
                  document.getElementById("story-view") ||
                  document.getElementById("view-stories") ||
                  document.getElementById("story-container") ||
                  document.querySelector("[id*='story']");

  if (!container) return;

  container.innerHTML = `
    <style>
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

      <div class="card" style="display: flex; flex-direction: column; gap: 10px;">
        <label style="font-weight: bold; color: #38bdf8;">📖 ဇာတ်လမ်း ခေါင်းစဉ် (Topic)</label>
        <input type="text" id="s-topic-input" placeholder="ဥပမာ- ရွာထိပ်က စုန်းမကြီး..." style="font-size: 0.85rem;" />

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
          <div>
            <label style="font-size: 0.72rem; margin-bottom: 2px;">🎬 ဇာတ်လမ်းပုံစံ</label>
            <select id="s-format-select" style="height: 42px; width: 100%; font-size: 0.8rem;">
              <option value="movie" selected>🎬 Movie (တစ်ပိုင်း)</option>
              <option value="series">📺 Series (၆ ပိုင်း)</option>
            </select>
          </div>
          <div>
            <label style="font-size: 0.72rem; margin-bottom: 2px;">🎭 အမျိုးအစား</label>
            <select id="s-genre-select" style="height: 42px; width: 100%; font-size: 0.8rem;">
              <option value="horror">👻 သရဲ</option>
              <option value="mystery">🔍 လျှို့ဝှက်</option>
              <option value="drama">💔 ဘဝ</option>
              <option value="motivation">💪 ခွန်အား</option>
            </select>
          </div>
          <div>
            <label style="font-size: 0.72rem; margin-bottom: 2px;">⏱️ ကြာချိန်</label>
            <select id="s-duration-select" style="height: 42px; width: 100%; font-size: 0.8rem;">
              <option value="1">၁ မိနစ်</option>
              <option value="2">၂ မိနစ်</option>
              <option value="3">၃ မိနစ်</option>
            </select>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div>
            <label style="font-size: 0.72rem; margin-bottom: 2px;">🗣️ အသံသရုပ်ဆောင်</label>
            <select id="s-voice-select" style="height: 42px; width: 100%; font-size: 0.82rem; background: #080e1a; color: #38bdf8; border: 1.5px solid #1e3a8a; border-radius: 8px; padding: 0 8px;">
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
          </div>
          <div>
            <label style="font-size: 0.72rem; margin-bottom: 2px;">🖼️ ဓာတ်ပုံ အရေအတွက်</label>
            <select id="s-photo-count" style="height: 42px; width: 100%; font-size: 0.82rem;">
              <option value="2">၂ ပုံ</option>
              <option value="4" selected>၄ ပုံ</option>
              <option value="6">၆ ပုံ</option>
              <option value="8">၈ ပုံ</option>
            </select>
          </div>
        </div>
      </div>

      <div class="card" style="background: #131d31; display: flex; flex-direction: column; gap: 10px;">
        <div>
          <label style="font-size: 0.8rem; margin-bottom: 6px; display: block; color: #facc15;">📐 ဗီဒီယို ဆိုဒ် (Aspect Ratio)</label>
          <div style="display: flex; gap: 8px;">
            <button onclick="setVideoRatio('16:9', this)" class="ratio-btn active">📺 16:9 (Landscape)</button>
            <button onclick="setVideoRatio('9:16', this)" class="ratio-btn">📱 9:16 (TikTok/Reels)</button>
            <button onclick="setVideoRatio('1:1', this)" class="ratio-btn">🔲 1:1 (Square)</button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div>
            <label style="font-size: 0.72rem; margin-bottom: 2px;">⏱️ Clip Time</label>
            <select id="s-clip-duration" onchange="s_clipDurationMode = this.value" style="height: 40px; width: 100%; font-size: 0.8rem;">
              <option value="auto" selected>🎵 Auto (အသံနှင့်ညီ)</option>
              <option value="3">၃ စက္ကန့်</option>
              <option value="5">၅ စက္ကန့်</option>
              <option value="7">၇ စက္ကန့်</option>
            </select>
          </div>
          <div>
            <label style="font-size: 0.72rem; margin-bottom: 2px;">🎬 Motion စတိုင်</label>
            <select id="s-motion-style" onchange="s_motionStyle = this.value" style="height: 40px; width: 100%; font-size: 0.8rem;">
              <option value="dynamic" selected>🔀 Dynamic (စုံလင်)</option>
              <option value="zoom-in">🔍 Zoom In</option>
              <option value="zoom-out">🔎 Zoom Out</option>
              <option value="pan-left">⬅️ Pan Left</option>
              <option value="pan-right">➡️ Pan Right</option>
            </select>
          </div>
        </div>
      </div>

      <div class="card" style="background: #131d31; padding: 12px;">
        <div onclick="toggleStoryAudioMixerDropdown()" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
          <span style="font-size: 0.85rem; font-weight: bold; color: #38bdf8;">🎚️ အသံချိန်ညှိမှု စနစ် (Audio Mixer)</span>
          <span id="s-audio-mixer-chevron" style="color: #facc15; font-size: 0.85rem; font-weight: bold;">▼ အသံချိန်ညှိမည်</span>
        </div>

        <div id="s-audio-mixer-content" style="display: none; flex-direction: column; gap: 10px; margin-top: 12px; border-top: 1px solid #334155; padding-top: 10px;">
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
              <span style="color: #94a3b8;">🎙️ AI ဇာတ်လမ်းပြောသံ (Voiceover)</span>
              <span id="s-vol-ai-val" style="color: #10b981; font-weight: bold;">100%</span>
            </div>
            <input type="range" id="s-vol-ai-slider" min="0" max="100" value="100" style="width: 100%;" />
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
              <span style="color: #94a3b8;">🎵 နောက်ခံ BGM တီးလုံးအသံ</span>
              <span id="s-vol-bgm-val" style="color: #facc15; font-weight: bold;">30%</span>
            </div>
            <input type="range" id="s-vol-bgm-slider" min="0" max="100" value="30" style="width: 100%;" />
          </div>

          <div>
            <label style="font-size: 0.75rem;">🎵 စိတ်ကြိုက် BGM ဖိုင် တင်ရန် (MP3/WAV)</label>
            <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
              <input type="file" id="s-bgm-file" accept="audio/*" onchange="handleSBgmUpload(event)" style="font-size: 0.75rem; padding: 6px; flex: 1;" />
              <button id="btn-s-remove-bgm" onclick="removeSBgm()" class="btn" style="display: none; width: auto; padding: 6px 12px; background: #ef4444; font-size: 0.75rem;">❌ ဖျက်မည်</button>
            </div>
          </div>
        </div>
      </div>

      <button id="s-main-gen-btn" onclick="handleAllInOneGenerate()" class="btn btn-story" style="padding: 14px; font-size: 0.95rem; font-weight: bold;">
        <span>🚀 Motion Video တစ်ခါတည်း အပြီးဖန်တီးမည်</span>
      </button>

      <div id="s-global-progress" style="display: none; background: #1e293b; border: 1px solid #0284c7; border-radius: 12px; padding: 12px;">
        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 6px;">
          <span id="s-progress-status-title" style="color: #38bdf8; font-weight: bold;">စတင်နေပါသည်...</span>
          <span id="s-progress-status-pct" style="color: #facc15; font-weight: bold;">0%</span>
        </div>
        <div style="width: 100%; height: 8px; background: #0f172a; border-radius: 6px; overflow: hidden;">
          <div id="s-progress-status-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #38bdf8, #10b981); transition: width 0.25s ease;"></div>
        </div>
      </div>

      <div id="s-error-box" style="display: none; background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; border-radius: 10px; padding: 12px; font-size: 0.85rem; color: #fca5a5;"></div>

      <div id="s-motion-studio" style="display: none; flex-direction: column; gap: 14px;">

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

        <div id="s-video-wrapper" style="position: relative; width: 100%; aspect-ratio: 16/9; max-height: 70vh; background: #000; border-radius: 12px; overflow: hidden; border: 1px solid #334155; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
          <canvas id="s-motion-canvas" width="1280" height="720" style="width: 100%; height: 100%; object-fit: contain;"></canvas>

          <div id="s-drag-title" style="display: none; position: absolute; top: 15px; left: 50%; transform: translateX(-50%); color: #facc15; font-weight: bold; font-size: 24px; cursor: move; z-index: 25; text-shadow: 2px 2px 4px #000; text-align: center; white-space: nowrap;">
            ခေါင်းစဉ် စာသား
          </div>

          <div id="s-drag-subtitle" style="position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); width: 86%; text-align: center; color: #ffffff; background: rgba(0,0,0,0.75); padding: 6px 12px; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: move; z-index: 15; touch-action: none; line-height: 1.4;">
            <span id="s-sub-text">စာတန်းထိုး ပြသမည့်နေရာ</span>
            <div id="s-sub-resize-handle" style="position: absolute; right: -7px; bottom: -7px; width: 22px; height: 22px; background: #10b981; color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; cursor: nwse-resize; touch-action: none; font-weight: bold;">↘</div>
          </div>

          <div id="s-drag-watermark" style="display: none; position: absolute; top: 15px; right: 15px; width: 70px; height: 70px; cursor: move; z-index: 20; border: 1px dashed rgba(255,255,255,0.4); border-radius: 4px;">
            <img id="s-wm-preview-img" src="" style="width: 100%; height: 100%; object-fit: contain; pointer-events: none;" />
            <div id="s-wm-resize-handle" style="position: absolute; right: -6px; bottom: -6px; width: 20px; height: 20px; background: #38bdf8; color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; cursor: nwse-resize; touch-action: none; font-weight: bold;">↘</div>
          </div>
        </div>

        <button id="btn-s-play-toggle" onclick="toggleMotionPlayback()" class="btn" style="background: #10b981; padding: 12px;">
          <span id="s-play-text">▶ Motion Video ဖွင့်မည်</span>
        </button>

        <audio id="s-audio-player" style="display: none;"></audio>

        <div class="card">
          <label id="s-current-label" style="color: #38bdf8;">📖 ထုတ်လုပ်ထားသော မြန်မာစာသား</label>
          <textarea id="s-script-textarea" rows="5" style="font-size: 0.85rem;"></textarea>
        </div>

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

        <div class="card" style="background: #131d31; display: flex; flex-direction: column; gap: 8px;">
          <span style="font-size: 0.85rem; font-weight: bold; color: #38bdf8;">🖼️ Watermark & တံဆိပ်</span>
          <div style="display: flex; gap: 8px; align-items: center;">
            <input type="file" id="s-wm-file" accept="image/*" onchange="handleSWatermarkUpload(event)" style="font-size: 0.75rem; padding: 6px; flex: 1;" />
            <button id="btn-s-remove-wm" onclick="removeSWatermark()" class="btn" style="display: none; width: auto; padding: 6px 10px; background: #ef4444; font-size: 0.75rem;">❌ ဖျက်မည်</button>
          </div>
        </div>

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

        <div class="card" style="background: linear-gradient(145deg, #1e1b4b, #0f172a); border: 1px solid #6366f1;">
          <div style="font-size: 0.9rem; font-weight: bold; color: #a5b4fc; margin-bottom: 6px;">🚀 Motion Video အပြီးသတ် Download လုပ်ခြင်း</div>
          <button id="btn-s-export" onclick="exportMotionHardcodedVideo()" class="btn" style="background: linear-gradient(90deg, #6366f1, #10b981); font-weight: bold; font-size: 0.95rem; padding: 14px;">
            <span>📥 အားလုံးပါဝင်သော Motion Video Download ရယူမည်</span>
          </button>
        </div>

      </div>
    </div>
  `;

  setupStoryAudioListeners();
  setupSTouchDrag("s-drag-title");
  setupSTouchDrag("s-drag-watermark");
  setupSTouchDrag("s-drag-subtitle");

  setupSTouchResize("s-drag-watermark", "s-wm-resize-handle");
  setupSSubtitleTouchResize();
}

// Audio Mixer Controls
function toggleStoryAudioMixerDropdown() {
  var content = document.getElementById("s-audio-mixer-content");
  var chevron = document.getElementById("s-audio-mixer-chevron");
  if (content.style.display === "none") {
    content.style.display = "flex";
    chevron.innerText = "▲ ပိတ်မည်";
  } else {
    content.style.display = "none";
    chevron.innerText = "▼ အသံချိန်ညှိမည်";
  }
}

function setupStoryAudioListeners() {
  var aSlider = document.getElementById("s-vol-ai-slider");
  var bSlider = document.getElementById("s-vol-bgm-slider");
  var audioEl = document.getElementById("s-audio-player");

  if (aSlider) {
    aSlider.addEventListener("input", function(e) {
      document.getElementById("s-vol-ai-val").innerText = e.target.value + "%";
      if (audioEl) audioEl.volume = e.target.value / 100;
    });
  }

  if (bSlider) {
    bSlider.addEventListener("input", function(e) {
      document.getElementById("s-vol-bgm-val").innerText = e.target.value + "%";
      if (s_currentBgm) s_currentBgm.volume = e.target.value / 100;
    });
  }
}

function handleSBgmUpload(e) {
  if (e.target.files && e.target.files[0]) {
    s_currentBgm = new Audio(URL.createObjectURL(e.target.files[0]));
    s_currentBgm.loop = true;
    s_currentBgm.volume = document.getElementById("s-vol-bgm-slider").value / 100;
    document.getElementById("btn-s-remove-bgm").style.display = "block";
  }
}

function removeSBgm() {
  if (s_currentBgm) { s_currentBgm.pause(); s_currentBgm = null; }
  document.getElementById("s-bgm-file").value = "";
  document.getElementById("btn-s-remove-bgm").style.display = "none";
}

// Global Progress Bar Controller
function updateGlobalProgress(title, percent, show = true) {
  var box = document.getElementById("s-global-progress");
  var tEl = document.getElementById("s-progress-status-title");
  var pEl = document.getElementById("s-progress-status-pct");
  var bEl = document.getElementById("s-progress-status-bar");

  if (!show) {
    if (box) box.style.display = "none";
    return;
  }
  if (box) box.style.display = "block";
  if (tEl) tEl.innerText = title;
  if (pEl) pEl.innerText = percent + "%";
  if (bEl) bEl.style.width = percent + "%";
}

function setVideoRatio(ratio, el) {
  s_aspectRatio = ratio;
  document.querySelectorAll(".ratio-btn").forEach(function(b) { b.classList.remove("active"); });
  el.classList.add("active");

  var wrapper = document.getElementById("s-video-wrapper");
  var canvas = document.getElementById("s-motion-canvas");

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

// All-in-One Main Generator (ခလုတ်တစ်ချက်နှိပ်ရုံဖြင့် အားလုံး အလိုအလျောက် ပြီးစီးခြင်း)
async function handleAllInOneGenerate() {
  var topic = document.getElementById("s-topic-input").value.trim();
  var format = document.getElementById("s-format-select").value;
  var genre = document.getElementById("s-genre-select").value;
  var duration = document.getElementById("s-duration-select").value;
  var voice = document.getElementById("s-voice-select").value;
  var photoCount = parseInt(document.getElementById("s-photo-count").value) || 4;
  var btn = document.getElementById("s-main-gen-btn");
  var textarea = document.getElementById("s-script-textarea");
  var epContainer = document.getElementById("s-ep-buttons-container");
  var studio = document.getElementById("s-motion-studio");
  var errBox = document.getElementById("s-error-box");

  if (!topic) return alert("ဇာတ်လမ်းခေါင်းစဉ် ရိုက်ထည့်ပေးပါ");

  btn.disabled = true;
  errBox.style.display = "none";
  studio.style.display = "none";
  s_currentVoice = voice;

  try {
    // အဆင့် ၁: Gemini Flash ဖြင့် ဇာတ်လမ်းစာသား + Image Prompts ရေးသားခြင်း
    updateGlobalProgress("Gemini Flash က မြန်မာစာသီးသန့် ဇာတ်လမ်းနှင့် မြင်ကွင်းများ ရေးသားနေပါသည်...", 25, true);

    var res = await fetch("/api/generate-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: topic,
        format: format,
        genre: genre,
        durationMinutes: duration,
        photoCount: photoCount
      })
    });

    var data = await res.json();
    if (!res.ok) throw new Error(data.error || "ဇာတ်လမ်း ဖန်တီးမှု မအောင်မြင်ပါ");

    var currentText = "";
    var currentPrompts = [];
    var currentTitle = topic;

    if (format === "series" && data.episodes && Array.isArray(data.episodes)) {
      s_seriesData = data;
      epContainer.style.display = "flex";
      s_currentEpNum = 1;
      var ep1 = data.episodes[0];
      currentText = ep1.text;
      currentPrompts = ep1.image_prompts || [];
      currentTitle = ep1.title;
      document.getElementById("s-current-label").innerText = "📖 အပိုင်း ၁: " + ep1.title;
    } else {
      s_seriesData = null;
      epContainer.style.display = "none";
      currentText = data.story_text;
      currentPrompts = data.image_prompts || [];
      currentTitle = data.movie_title || topic;
      document.getElementById("s-current-label").innerText = "🎬 " + currentTitle + " (ရုပ်ရှင်ဇာတ်လမ်းစာသား)";
    }

    textarea.value = currentText;
    document.getElementById("s-title-input").value = currentTitle;
    updateSTitleText(currentTitle);

    // အဆင့် ၂: AI ဓာတ်ပုံများ ဆွဲယူခြင်း (Progress % တိကျစွာ ပြသခြင်း)
    updateGlobalProgress("AI ဓာတ်ပုံများ စတင်ဆွဲယူနေပါသည်...", 50, true);

    var w = 1280, h = 720;
    if (s_aspectRatio === "9:16") { w = 720; h = 1280; }
    if (s_aspectRatio === "1:1") { w = 720; h = 720; }

    var loadedCount = 0;
    var totalP = currentPrompts.length;

    var loadPromises = currentPrompts.map(function(p) {
      return new Promise(function(resolve) {
        var img = new Image();
        img.crossOrigin = "anonymous";
        var seed = Math.floor(Math.random() * 99999);
        img.src = "https://image.pollinations.ai/prompt/" + encodeURIComponent(p) + "?width=" + w + "&height=" + h + "&nologo=true&seed=" + seed;
        img.onload = function() {
          loadedCount++;
          var pct = Math.round(50 + (loadedCount / totalP) * 25);
          updateGlobalProgress("AI ဓာတ်ပုံ (" + loadedCount + "/" + totalP + ") ဆွဲပြီးစီးပါပြီ...", pct, true);
          resolve(img);
        };
        img.onerror = function() {
          loadedCount++;
          resolve(null);
        };
      });
    });

    s_sceneImages = (await Promise.all(loadPromises)).filter(Boolean);

    // အဆင့် ၃: အသံဖိုင် (Voiceover) ထုတ်ယူခြင်း
    updateGlobalProgress("မြန်မာစကားပြော အသံဖိုင် ဖန်တီးနေပါသည်...", 80, true);

    var audioRes = await fetch("/api/generate-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generate_audio",
        scriptText: currentText,
        voice: voice
      })
    });

    var audioData = await audioRes.json();
    if (!audioRes.ok) throw new Error(audioData.error || "အသံဖိုင် ထုတ်ယူမှု မအောင်မြင်ပါ");

    var audioBlob = new Blob([Uint8Array.from(atob(audioData.audioBase64), function(c) { return c.charCodeAt(0); })], { type: "audio/mp3" });
    var audioEl = document.getElementById("s-audio-player");
    audioEl.src = URL.createObjectURL(audioBlob);
    s_audioEl = audioEl;

    audioEl.onloadedmetadata = function() {
      var dur = audioEl.duration || 60;
      var srt = generateStorySrt(currentText, dur);
      document.getElementById("s-srt-textarea").value = srt;
      s_srtCues = parseStorySrt(srt);
      renderMotionFrame(0, dur);
    };

    updateGlobalProgress("အားလုံး အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ!", 100, true);
    studio.style.display = "flex";
    setTimeout(function() { updateGlobalProgress("", 0, false); }, 1500);

  } catch (err) {
    updateGlobalProgress("", 0, false);
    errBox.style.display = "block";
    errBox.innerHTML = "<b>❌ Error:</b> " + err.message;
  } finally {
    btn.disabled = false;
  }
}

// Series Episode ပြောင်းလဲခြင်း
async function selectStoryEpisode(epNum) {
  if (!s_seriesData || !s_seriesData.episodes) return;
  s_currentEpNum = epNum;

  for (var i = 1; i <= 6; i++) {
    var b = document.getElementById("btn-sep-" + i);
    if (b) {
      if (i === epNum) b.classList.add("active");
      else b.classList.remove("active");
    }
  }

  var ep = s_seriesData.episodes[epNum - 1];
  document.getElementById("s-current-label").innerText = "📖 အပိုင်း " + epNum + ": " + ep.title;
  document.getElementById("s-script-textarea").value = ep.text;
  document.getElementById("s-title-input").value = ep.title;
  updateSTitleText(ep.title);

  // အသံနှင့် ပုံများကို ထိုအပိုင်းအလိုက် ပြောင်းလဲပေးခြင်း
  updateGlobalProgress("အပိုင်း " + epNum + " အသံနှင့် ပုံများ ရယူနေပါသည်...", 50, true);

  var w = 1280, h = 720;
  if (s_aspectRatio === "9:16") { w = 720; h = 1280; }
  if (s_aspectRatio === "1:1") { w = 720; h = 720; }

  var loadPromises = (ep.image_prompts || []).map(function(p) {
    return new Promise(function(resolve) {
      var img = new Image();
      img.crossOrigin = "anonymous";
      var seed = Math.floor(Math.random() * 99999);
      img.src = "https://image.pollinations.ai/prompt/" + encodeURIComponent(p) + "?width=" + w + "&height=" + h + "&nologo=true&seed=" + seed;
      img.onload = function() { resolve(img); };
      img.onerror = function() { resolve(null); };
    });
  });

  s_sceneImages = (await Promise.all(loadPromises)).filter(Boolean);

  var audioRes = await fetch("/api/generate-story", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "generate_audio",
      scriptText: ep.text,
      voice: s_currentVoice
    })
  });

  var audioData = await audioRes.json();
  if (audioRes.ok) {
    var audioBlob = new Blob([Uint8Array.from(atob(audioData.audioBase64), function(c) { return c.charCodeAt(0); })], { type: "audio/mp3" });
    s_audioEl.src = URL.createObjectURL(audioBlob);
    s_audioEl.onloadedmetadata = function() {
      var dur = s_audioEl.duration || 60;
      var srt = generateStorySrt(ep.text, dur);
      document.getElementById("s-srt-textarea").value = srt;
      s_srtCues = parseStorySrt(srt);
      renderMotionFrame(0, dur);
    };
  }

  updateGlobalProgress("", 0, false);
}

// 2.5D Motion Rendering (Ken-Burns Pan & Zoom)
function renderMotionFrame(time, duration) {
  var canvas = document.getElementById("s-motion-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");

  if (s_sceneImages.length === 0) {
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

  var segmentDur = (duration || 60) / s_sceneImages.length;
  if (s_clipDurationMode !== "auto") {
    segmentDur = parseFloat(s_clipDurationMode) || 5;
  }

  var idx = Math.floor(time / segmentDur) % s_sceneImages.length;
  var prog = (time % segmentDur) / segmentDur;

  var img = s_sceneImages[idx];
  if (!img) return;

  var scale = 1.0;
  var panX = 0;
  var panY = 0;

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
    // Dynamic
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
  if (!s_audioEl || !s_audioEl.src) return alert("အသံဖိုင် အဆင်သင့် မရှိသေးပါ");
  var btnText = document.getElementById("s-play-text");

  if (s_audioEl.paused) {
    s_audioEl.play();
    if (s_currentBgm) s_currentBgm.play();
    s_isMotionPlaying = true;
    btnText.innerText = "⏸ Motion Video ခေတ္တရပ်မည်";

    function loop() {
      if (!s_isMotionPlaying) return;
      var curr = s_audioEl.currentTime;
      var dur = s_audioEl.duration || 60;
      renderMotionFrame(curr, dur);

      if (s_isSrtVisible) {
        var cue = s_srtCues.find(function(c) { return curr >= c.start && curr <= c.end; });
        document.getElementById("s-sub-text").innerText = cue ? cue.text : "";
      }
      s_animFrameId = requestAnimationFrame(loop);
    }
    s_animFrameId = requestAnimationFrame(loop);

  } else {
    s_audioEl.pause();
    if (s_currentBgm) s_currentBgm.pause();
    s_isMotionPlaying = false;
    btnText.innerText = "▶ Motion Video ဖွင့်မည်";
    cancelAnimationFrame(s_animFrameId);
  }
}

// Overlays Controls
function toggleSTitle() {
  s_isTitleActive = !s_isTitleActive;
  var el = document.getElementById("s-drag-title");
  var box = document.getElementById("s-title-box");
  var btn = document.getElementById("btn-s-title-toggle");
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
  document.getElementById("s-drag-title").style.fontSize = v + "px";
}

function handleSWatermarkUpload(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    s_watermarkImg = new Image();
    s_watermarkImg.src = ev.target.result;
    s_watermarkImg.onload = function() {
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
  document.querySelectorAll(".s-f-dot").forEach(function(d) { d.style.borderColor = "transparent"; });
  el.style.borderColor = "#38bdf8";
  applySSrtStyles();
}

function setSBgStyle(style, el) {
  s_srtBgStyle = style;
  document.querySelectorAll(".s-b-dot").forEach(function(d) {
    d.style.borderColor = (d.getAttribute("title") && d.getAttribute("title").includes("အနားကွပ်")) ? "#ffffff" : "transparent";
  });
  el.style.borderColor = "#38bdf8";
  applySSrtStyles();
}

function changeSSrtFontSize(val) {
  s_srtFontSize = val;
  document.getElementById("s-srt-size-val").innerText = val + "px";
  applySSrtStyles();
}

function applySSrtStyles() {
  var sub = document.getElementById("s-drag-subtitle");
  if (!sub) return;
  sub.style.color = s_srtFontColor;
  sub.style.fontSize = s_srtFontSize + "px";

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
  var b = document.getElementById("s-srt-edit-box");
  b.style.display = b.style.display === "none" ? "flex" : "none";
}

function saveSSrtText() {
  s_srtCues = parseStorySrt(document.getElementById("s-srt-textarea").value);
  alert("SRT သိမ်းဆည်းပြီးပါပြီ");
}

// Touch Dragging & Resizing
function setupSTouchDrag(elementId) {
  var el = document.getElementById(elementId);
  var wrapper = document.getElementById("s-video-wrapper");
  if (!el || !wrapper) return;

  var isDragging = false;
  var startX, startY, origX, origY;

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
    var clientX = e.touches ? e.touches[0].clientX : e.clientX;
    var clientY = e.touches ? e.touches[0].clientY : e.clientY;

    var newX = origX + (clientX - startX);
    var newY = origY + (clientY - startY);

    newX = Math.max(0, Math.min(newX, wrapper.clientWidth - el.clientWidth));
    newY = Math.max(0, Math.min(newY, wrapper.clientHeight - el.clientHeight));

    el.style.left = newX + "px";
    el.style.top = newY + "px";
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
  var handle = document.getElementById("s-sub-resize-handle");
  var slider = document.getElementById("s-srt-size-slider");
  var valText = document.getElementById("s-srt-size-val");
  if (!handle) return;

  var isResizing = false;
  var startX, startSize;

  function onStart(e) {
    e.stopPropagation();
    isResizing = true;
    startX = e.touches ? e.touches[0].clientX : e.clientX;
    startSize = s_srtFontSize;
  }

  function onMove(e) {
    if (!isResizing) return;
    var clientX = e.touches ? e.touches[0].clientX : e.clientX;
    var delta = clientX - startX;
    var newSize = Math.max(10, Math.min(100, Math.round(startSize + delta * 0.35)));
    s_srtFontSize = newSize;
    if (slider) slider.value = newSize;
    if (valText) valText.innerText = newSize + "px";
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
  var target = document.getElementById(targetId);
  var handle = document.getElementById(handleId);
  if (!target || !handle) return;

  var isResizing = false;
  var startX, startY, startW, startH;

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
    var clientX = e.touches ? e.touches[0].clientX : e.clientX;
    var clientY = e.touches ? e.touches[0].clientY : e.clientY;
    target.style.width = Math.max(30, startW + (clientX - startX)) + "px";
    target.style.height = Math.max(20, startH + (clientY - startY)) + "px";
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
  var sentences = scriptText.match(/[^။!?\n]+[။!?\n]?/g) || [scriptText];
  var chunks = sentences.map(function(s) { return s.trim(); }).filter(Boolean);
  var totalLength = chunks.reduce(function(acc, c) { return acc + c.length; }, 0);

  var srt = "";
  var currentStart = 0;

  chunks.forEach(function(chunk, index) {
    var chunkRatio = chunk.length / totalLength;
    var chunkDuration = totalDuration * chunkRatio;
    var currentEnd = Math.min(currentStart + chunkDuration, totalDuration);

    var fmt = function(s) {
      var hrs = Math.floor(s / 3600).toString().padStart(2, "0");
      var mins = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
      var secs = Math.floor(s % 60).toString().padStart(2, "0");
      var ms = Math.floor((s % 1) * 1000).toString().padStart(3, "0");
      return hrs + ":" + mins + ":" + secs + "," + ms;
    };

    srt += (index + 1) + "\n" + fmt(currentStart) + " --> " + fmt(currentEnd) + "\n" + chunk + "\n\n";
    currentStart = currentEnd;
  });

  return srt;
}

function parseStorySrt(srtText) {
  if (!srtText) return [];
  var blocks = srtText.trim().split(/\n\s*\n/);
  return blocks.map(function(block) {
    var lines = block.split("\n");
    if (lines.length >= 3) {
      var timeParts = lines[1].split(" --> ");
      var parseSec = function(t) {
        var parts = t.split(":");
        var secParts = parts[2].split(",");
        return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(secParts[0]) + parseInt(secParts[1]) / 1000;
      };
      return { start: parseSec(timeParts[0]), end: parseSec(timeParts[1]), text: lines.slice(2).join(" ") };
    }
    return null;
  }).filter(Boolean);
}

// Hardcoded Motion Video Export
async function exportMotionHardcodedVideo() {
  if (!s_audioEl || !s_audioEl.src) return alert("ဗီဒီယိုနှင့် အသံဖိုင် အဆင်သင့် မရှိသေးပါ");

  var exportBtn = document.getElementById("btn-s-export");
  var wrapper = document.getElementById("s-video-wrapper");
  var subEl = document.getElementById("s-drag-subtitle");
  var titleEl = document.getElementById("s-drag-title");
  var wmEl = document.getElementById("s-drag-watermark");

  exportBtn.disabled = true;
  updateGlobalProgress("Motion Video ကို Render ပြုလုပ်နေပါသည်...", 5, true);

  var exportCanvas = document.createElement("canvas");
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
  var ctx = exportCanvas.getContext("2d");

  var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  var dest = audioCtx.createMediaStreamDestination();

  var aGain = audioCtx.createGain();
  aGain.gain.value = document.getElementById("s-vol-ai-slider").value / 100;
  var bGain = audioCtx.createGain();
  bGain.gain.value = document.getElementById("s-vol-bgm-slider").value / 100;

  try {
    var aSource = audioCtx.createMediaElementSource(s_audioEl);
    aSource.connect(aGain);
    aGain.connect(dest);
  } catch (e) {}

  try {
    if (s_currentBgm) {
      var bSource = audioCtx.createMediaElementSource(s_currentBgm);
      bSource.connect(bGain);
      bGain.connect(dest);
    }
  } catch (e) {}

  var canvasStream = exportCanvas.captureStream(30);
  var combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...dest.stream.getAudioTracks()
  ]);

  var mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
    ? "video/webm;codecs=vp9,opus"
    : "video/webm";

  var recorder = new MediaRecorder(combinedStream, { mimeType });
  var chunks = [];

  recorder.ondataavailable = function(e) { if (e.data && e.data.size > 0) chunks.push(e.data); };
  recorder.onstop = function() {
    var blob = new Blob(chunks, { type: "video/webm" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "Story_Motion_Video_" + s_aspectRatio.replace(":", "_") + "_" + Date.now() + ".webm";
    a.click();

    updateGlobalProgress("Motion Video Download ရယူပြီးပါပြီ!", 100, true);
    setTimeout(function() {
      updateGlobalProgress("", 0, false);
      exportBtn.disabled = false;
    }, 2000);
  };

  s_audioEl.currentTime = 0;
  if (s_currentBgm) s_currentBgm.currentTime = 0;
  recorder.start();
  await s_audioEl.play();
  if (s_currentBgm) s_currentBgm.play();

  var scaleX = exportCanvas.width / wrapper.clientWidth;
  var scaleY = exportCanvas.height / wrapper.clientHeight;

  function exportLoop() {
    if (s_audioEl.paused || s_audioEl.ended) return;

    var curr = s_audioEl.currentTime;
    var dur = s_audioEl.duration || 60;

    renderMotionFrame(curr, dur);
    ctx.drawImage(document.getElementById("s-motion-canvas"), 0, 0, exportCanvas.width, exportCanvas.height);

    if (s_isWatermarkActive && s_watermarkImg && wmEl.style.display !== "none") {
      ctx.drawImage(s_watermarkImg, wmEl.offsetLeft * scaleX, wmEl.offsetTop * scaleY, wmEl.clientWidth * scaleX, wmEl.clientHeight * scaleY);
    }

    if (s_isTitleActive && titleEl.style.display !== "none") {
      var tx = (titleEl.offsetLeft + titleEl.clientWidth / 2) * scaleX;
      var ty = (titleEl.offsetTop + titleEl.clientHeight / 2) * scaleY;
      ctx.font = "bold " + Math.round(s_titleFontSize * scaleY) + "px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#facc15";
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 8;
      ctx.fillText(titleEl.innerText, tx, ty);
      ctx.shadowBlur = 0;
    }

    if (s_isSrtVisible && subEl.style.display !== "none") {
      var cue = s_srtCues.find(function(c) { return curr >= c.start && curr <= c.end; });
      if (cue && cue.text) {
        var sx = (subEl.offsetLeft + subEl.clientWidth / 2) * scaleX;
        var sy = (subEl.offsetTop + subEl.clientHeight / 2) * scaleY;
        var dynFont = Math.round(s_srtFontSize * scaleY);

        ctx.font = "bold " + dynFont + "px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        if (s_srtBgStyle === "stroke") {
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 5 * scaleX;
          ctx.strokeText(cue.text, sx, sy);
          ctx.fillStyle = s_srtFontColor;
          ctx.fillText(cue.text, sx, sy);
        } else {
          var metrics = ctx.measureText(cue.text);
          var padX = 14 * scaleX;
          var padY = 8 * scaleY;
          var bW = metrics.width + padX * 2;
          var bH = dynFont + padY * 2;

          ctx.fillStyle = s_srtBgStyle;
          ctx.beginPath();
          ctx.roundRect(sx - bW / 2, sy - bH / 2, bW, bH, 8 * scaleX);
          ctx.fill();

          ctx.fillStyle = s_srtFontColor;
          ctx.fillText(cue.text, sx, sy);
        }
      }
    }

    var pct = Math.min(99, Math.round((curr / dur) * 100));
    updateGlobalProgress("ဗီဒီယို Render ပြုလုပ်နေပါသည်...", pct, true);

    requestAnimationFrame(exportLoop);
  }

  s_audioEl.onended = function() {
    recorder.stop();
    if (s_currentBgm) s_currentBgm.pause();
  };

  exportLoop();
}

// Router Hooks
window.initStoryView = initStoryView;
window.initStory = initStoryView;
window.renderStory = initStoryView;
window.showStory = initStoryView;
window.loadStoryView = initStoryView;

if (document.readyState !== "loading") {
  initStoryView();
} else {
  document.addEventListener("DOMContentLoaded", initStoryView);
}

document.addEventListener("click", function(e) {
  if (e.target && e.target.closest && (e.target.closest("[onclick*='story']") || e.target.closest(".nav-item:nth-child(3)") || e.target.closest("button:nth-child(3)"))) {
    setTimeout(initStoryView, 50);
    setTimeout(initStoryView, 200);
  }
});
