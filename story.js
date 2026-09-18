var s_seriesData = null;
var s_currentEpNum = 1;
var s_currentVoice = "edge-nilar";

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
                  document.getElementById("story-container");

  if (!container) return;

  container.innerHTML = `
    <style>
      .step-badge { background: #0284c7; color: #fff; font-size: 0.75rem; padding: 2px 8px; border-radius: 6px; font-weight: bold; }
      .ratio-btn { flex: 1; padding: 8px; background: #1e293b; border: 1px solid #334155; color: #94a3b8; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 0.8rem; }
      .ratio-btn.active { background: #38bdf8; color: #000; border-color: #38bdf8; }
      .ep-btn { padding: 8px 0; border-radius: 6px; border: 1px solid #334155; background: #1e293b; color: #fff; font-weight: bold; cursor: pointer; font-size: 0.8rem; }
      .ep-btn.active { background: #38bdf8; color: #000; border-color: #38bdf8; }
    </style>

    <div style="display: flex; flex-direction: column; gap: 14px;">

      <div class="card" style="background: #131d31; padding: 12px;">
        <label style="font-size: 0.8rem; margin-bottom: 6px; display: block; color: #facc15;">🎬 ဇာတ်လမ်းပုံစံ ရွေးချယ်ပါ (Movie or Series)</label>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <select id="s-format-select" style="height: 42px; font-size: 0.85rem; background: #080e1a; color: #38bdf8; border: 1.5px solid #1e3a8a; border-radius: 8px; padding: 0 8px;">
            <option value="movie" selected>🎬 Movie (တစ်ပိုင်းတည်း)</option>
            <option value="series">📺 Series (၆ ပိုင်းတွဲ)</option>
          </select>
          <select id="s-duration-select" style="height: 42px; font-size: 0.85rem;">
            <option value="1">၁ မိနစ်စာ</option>
            <option value="2">၂ မိနစ်စာ</option>
            <option value="3">၃ မိနစ်စာ</option>
          </select>
        </div>
      </div>

      <div class="card" style="display: flex; flex-direction: column; gap: 10px;">
        <span style="font-weight: bold; color: #38bdf8;"><span class="step-badge">အဆင့် ၁</span> 📝 ဇာတ်လမ်းစာသား နှင့် အသံဖိုင် (TTS) ထုတ်မည်</span>
        <input type="text" id="s-topic" placeholder="ဇာတ်လမ်း ခေါင်းစဉ် (ဥပမာ- ရွာထိပ်က စုန်းမကြီး)..." style="font-size: 0.85rem;" />

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <select id="s-genre" style="height: 42px; font-size: 0.8rem;">
            <option value="horror">👻 သရဲ</option>
            <option value="mystery">🔍 လျှို့ဝှက်</option>
            <option value="drama">💔 ဘဝ</option>
            <option value="motivation">💪 ခွန်အား</option>
          </select>
          <select id="s-voice" style="height: 42px; font-size: 0.8rem; background: #080e1a; color: #38bdf8; border: 1.5px solid #1e3a8a; border-radius: 8px; padding: 0 8px;">
            <option value="edge-nilar" selected>👩 နီလာ (ကြည်လင်)</option>
            <option value="edge-thiha">👨 သီဟ (ပုံမှန်)</option>
            <option value="google-my-female">👩 Google (မ)</option>
          </select>
        </div>

        <button onclick="handleStep1GenerateStory()" id="btn-step1" class="btn" style="background: #0284c7; padding: 12px; font-weight: bold;">
          <span>✨ ၁။ မြန်မာစာသားနှင့် အသံဖိုင် အရင်ထုတ်မည်</span>
        </button>

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

        <textarea id="s-script-textarea" rows="5" placeholder="မြန်မာစာသား အရင်ပေါ်လာမည်..." style="font-size: 0.85rem;"></textarea>
        <audio id="s-audio-player" controls style="width: 100%; height: 38px; display: none;"></audio>
      </div>

      <div class="card" id="s-step2-card" style="display: none; flex-direction: column; gap: 10px;">
        <span style="font-weight: bold; color: #38bdf8;"><span class="step-badge">အဆင့် ၂</span> 🎨 Prompt to Photo (ဓာတ်ပုံများ ဆွဲယူခြင်း)</span>
        <p style="font-size: 0.72rem; color: #94a3b8; margin: 0;">အထက်ပါ မြန်မာစာသားမှ အခန်းလိုက် English Prompts များ အလိုအလျောက် ထုတ်ယူပြီး AI ဓာတ်ပုံများ ဆွဲပေးမည်။</p>

        <div style="display: flex; gap: 8px; align-items: center;">
          <select id="s-photo-count" style="height: 42px; font-size: 0.8rem; flex: 1;">
            <option value="2">၂ ပုံ</option>
            <option value="4" selected>၄ ပုံ</option>
            <option value="6">၆ ပုံ</option>
            <option value="8">၈ ပုံ</option>
          </select>
          <button onclick="handleStep2Photos()" id="btn-step2" class="btn" style="height: 42px; background: #8b5cf6; padding: 0 14px; font-weight: bold; flex: 2; display: flex; align-items: center; justify-content: center;">
            <span>🖼️ ၂။ ဓာတ်ပုံများ ဆွဲယူမည်</span>
          </button>
        </div>

        <div id="s-photo-grid" style="display: none; grid-template-columns: repeat(4, 1fr); gap: 6px;"></div>
      </div>

      <div class="card" id="s-step3-card" style="display: none; flex-direction: column; gap: 14px;">
        <span style="font-weight: bold; color: #facc15;"><span class="step-badge">အဆင့် ၃</span> 🎬 Motion Video Studio</span>

        <div style="background: #0f172a; padding: 10px; border-radius: 8px; border: 1px solid #334155;">
          <label style="font-size: 0.78rem; margin-bottom: 6px; display: block; color: #38bdf8; font-weight: bold;">📐 ဗီဒီယို ဆိုဒ် (Aspect Ratio) ရွေးချယ်ပါ</label>
          <div style="display: flex; gap: 8px;">
            <button onclick="setVideoRatio('16:9', this)" class="ratio-btn active">📺 16:9 (Landscape)</button>
            <button onclick="setVideoRatio('9:16', this)" class="ratio-btn">📱 9:16 (TikTok/Reels)</button>
            <button onclick="setVideoRatio('1:1', this)" class="ratio-btn">🔲 1:1 (Square)</button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div>
            <label style="font-size: 0.72rem; margin-bottom: 2px;">⏱️ Clip Time</label>
            <select id="s-clip-time" onchange="s_clipDurationMode = this.value" style="height: 40px; width: 100%; font-size: 0.8rem;">
              <option value="auto" selected>🎵 Auto (အသံနှင့်ညီ)</option>
              <option value="3">၃ စက္ကန့်</option>
              <option value="5">၅ စက္ကန့်</option>
              <option value="7">၇ စက္ကန့်</option>
            </select>
          </div>
          <div>
            <label style="font-size: 0.72rem; margin-bottom: 2px;">🎬 Motion စတိုင်</label>
            <select id="s-motion-type" onchange="s_motionStyle = this.value" style="height: 40px; width: 100%; font-size: 0.8rem;">
              <option value="dynamic" selected>🔀 Dynamic (စုံလင်)</option>
              <option value="zoom-in">🔍 Zoom In</option>
              <option value="zoom-out">🔎 Zoom Out</option>
              <option value="pan-left">⬅️ Pan Left</option>
              <option value="pan-right">➡️ Pan Right</option>
            </select>
          </div>
        </div>

        <div id="s-video-wrapper" style="position: relative; width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 12px; overflow: hidden; border: 1px solid #334155; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
          <canvas id="s-motion-canvas" width="1280" height="720" style="width: 100%; height: 100%; object-fit: contain;"></canvas>

          <div id="s-drag-title" style="display: none; position: absolute; top: 15px; left: 50%; transform: translateX(-50%); color: #facc15; font-weight: bold; font-size: 24px; cursor: move; z-index: 25; text-shadow: 2px 2px 4px #000; white-space: nowrap;">
            ခေါင်းစဉ် စာသား
          </div>

          <div id="s-drag-subtitle" style="position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); width: 86%; text-align: center; color: #ffffff; background: rgba(0,0,0,0.75); padding: 6px 12px; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: move; z-index: 15; touch-action: none; line-height: 1.4;">
            <span id="s-sub-text">စာတန်းထိုး ပြသမည့်နေရာ</span>
            <div id="s-sub-resize-handle" style="position: absolute; right: -7px; bottom: -7px; width: 22px; height: 22px; background: #10b981; color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; cursor: nwse-resize; font-weight: bold;">↘</div>
          </div>

          <div id="s-drag-watermark" style="display: none; position: absolute; top: 15px; right: 15px; width: 70px; height: 70px; cursor: move; z-index: 20; border: 1px dashed rgba(255,255,255,0.4); border-radius: 4px;">
            <img id="s-wm-preview-img" src="" style="width: 100%; height: 100%; object-fit: contain; pointer-events: none;" />
            <div id="s-wm-resize-handle" style="position: absolute; right: -6px; bottom: -6px; width: 20px; height: 20px; background: #38bdf8; color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; cursor: nwse-resize; font-weight: bold;">↘</div>
          </div>
        </div>

        <button onclick="toggleMotionPlayback()" class="btn" style="background: #10b981; padding: 12px; font-weight: bold;">
          <span id="s-play-text">▶ ၃။ Motion Video စမ်းဖွင့်မည်</span>
        </button>

        <div style="background: #131d31; border: 1px solid #334155; border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.85rem; font-weight: bold; color: #38bdf8;">✏️ Video Title / စာသားထည့်</span>
            <button onclick="toggleSTitle()" id="btn-s-title-toggle" class="btn" style="width: auto; padding: 4px 10px; font-size: 0.75rem; background: #475569;">Title: OFF</button>
          </div>
          <div id="s-title-box" style="display: none; flex-direction: column; gap: 6px;">
            <input type="text" id="s-title-input" placeholder="ဗီဒီယိုပေါ်တွင် ပြသမည့် ခေါင်းစဉ်..." oninput="updateSTitleText(this.value)" style="font-size: 0.85rem;" />
            <input type="range" id="s-title-size" min="10" max="100" value="24" oninput="changeSTitleSize(this.value)" style="width: 100%;" />
          </div>
        </div>

        <div style="background: #131d31; border: 1px solid #334155; border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 8px;">
          <span style="font-size: 0.85rem; font-weight: bold; color: #38bdf8;">🖼️ Watermark & တံဆိပ်</span>
          <div style="display: flex; gap: 8px; align-items: center;">
            <input type="file" id="s-wm-file" accept="image/*" onchange="handleSWatermarkUpload(event)" style="font-size: 0.75rem; padding: 6px; flex: 1;" />
            <button id="btn-s-remove-wm" onclick="removeSWatermark()" class="btn" style="display: none; width: auto; padding: 6px 10px; background: #ef4444; font-size: 0.75rem;">❌ ဖျက်မည်</button>
          </div>
        </div>

        <div style="background: #131d31; border: 1px solid #334155; border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 10px;">
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

        <button onclick="exportMotionHardcodedVideo()" class="btn" style="background: linear-gradient(90deg, #6366f1, #10b981); padding: 14px; font-weight: bold; font-size: 0.95rem;">
          <span>📥 Motion Video အပြီးသတ် Download ရယူမည်</span>
        </button>
      </div>

    </div>
  `;

  setupSTouchDrag("s-drag-title");
  setupSTouchDrag("s-drag-watermark");
  setupSTouchDrag("s-drag-subtitle");
  setupSTouchResize("s-drag-watermark", "s-wm-resize-handle");
  setupSSubtitleTouchResize();
}

// Aspect Ratio Setter (အဆင့် ၃ တွင် အလုပ်လုပ်ခြင်း)
function setVideoRatio(ratio, el) {
  s_aspectRatio = ratio;
  document.querySelectorAll(".ratio-btn").forEach(function(b) { b.classList.remove("active"); });
  el.classList.add("active");

  var wrapper = document.getElementById("s-video-wrapper");
  var canvas = document.getElementById("s-motion-canvas");
  if (!wrapper || !canvas) return;

  if (ratio === "16:9") {
    wrapper.style.aspectRatio = "16/9";
    canvas.width = 1280; canvas.height = 720;
  } else if (ratio === "9:16") {
    wrapper.style.aspectRatio = "9/16";
    canvas.width = 720; canvas.height = 1280;
  } else if (ratio === "1:1") {
    wrapper.style.aspectRatio = "1/1";
    canvas.width = 720; canvas.height = 720;
  }

  renderMotionFrame(0, 60);
}

// အဆင့် ၁: ဇာတ်လမ်းစာသား နှင့် အသံဖိုင် (TTS) ထုတ်ယူခြင်း
async function handleStep1GenerateStory() {
  var topic = document.getElementById("s-topic").value.trim();
  var format = document.getElementById("s-format-select").value;
  var genre = document.getElementById("s-genre").value;
  var voice = document.getElementById("s-voice").value;
  var duration = document.getElementById("s-duration-select").value;
  var btn = document.getElementById("btn-step1");
  var textarea = document.getElementById("s-script-textarea");
  var audioEl = document.getElementById("s-audio-player");
  var step2Card = document.getElementById("s-step2-card");
  var epContainer = document.getElementById("s-ep-buttons-container");

  if (!topic) return alert("ခေါင်းစဉ် ရိုက်ထည့်ပေးပါ");

  btn.disabled = true;
  btn.innerText = "⏳ မြန်မာစာသားနှင့် အသံဖိုင် ထုတ်နေပါသည်...";
  s_currentVoice = voice;

  try {
    var res = await fetch("/api/generate-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generate_story_and_audio",
        topic: topic,
        format: format,
        genre: genre,
        voice: voice,
        durationMinutes: duration
      })
    });
    var data = await res.json();
    if (!res.ok) throw new Error(data.error);

    var currentText = "";
    var currentTitle = topic;

    if (data.format === "series" && data.episodes && Array.isArray(data.episodes)) {
      s_seriesData = data;
      epContainer.style.display = "flex";
      s_currentEpNum = 1;
      var ep1 = data.episodes[0];
      currentText = ep1.text;
      currentTitle = ep1.title;
    } else {
      s_seriesData = null;
      epContainer.style.display = "none";
      currentText = data.story_text;
      currentTitle = data.movie_title || topic;
    }

    textarea.value = currentText;
    document.getElementById("s-title-input").value = currentTitle;
    updateSTitleText(currentTitle);

    var audioBlob = new Blob([Uint8Array.from(atob(data.audioBase64), function(c) { return c.charCodeAt(0); })], { type: "audio/mp3" });
    audioEl.src = URL.createObjectURL(audioBlob);
    audioEl.style.display = "block";
    s_audioEl = audioEl;

    audioEl.onloadedmetadata = function() {
      var dur = audioEl.duration || 60;
      s_srtCues = parseStorySrt(generateStorySrt(currentText, dur));
      document.getElementById("s-srt-textarea").value = generateStorySrt(currentText, dur);
    };

    btn.innerText = "✅ ၁။ စာသားနှင့် အသံ အဆင်သင့်ဖြစ်ပါပြီ (ပြန်ထုတ်နိုင်သည်)";
    step2Card.style.display = "flex";

  } catch (err) {
    alert("Error: " + err.message);
    btn.innerText = "✨ ၁။ မြန်မာစာသားနှင့် အသံဖိုင် အရင်ထုတ်မည်";
  } finally {
    btn.disabled = false;
  }
}

// Series Episode ခလုတ် ရွေးချယ်ခြင်း
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
  document.getElementById("s-script-textarea").value = ep.text;
  document.getElementById("s-title-input").value = ep.title;
  updateSTitleText(ep.title);

  // အသံဖိုင် အသစ်ရယူခြင်း
  var res = await fetch("/api/generate-story", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "generate_audio", scriptText: ep.text, voice: s_currentVoice })
  });
  var data = await res.json();
  if (res.ok) {
    var audioBlob = new Blob([Uint8Array.from(atob(data.audioBase64), function(c) { return c.charCodeAt(0); })], { type: "audio/mp3" });
    s_audioEl.src = URL.createObjectURL(audioBlob);
    s_audioEl.onloadedmetadata = function() {
      var dur = s_audioEl.duration || 60;
      s_srtCues = parseStorySrt(generateStorySrt(ep.text, dur));
      document.getElementById("s-srt-textarea").value = generateStorySrt(ep.text, dur);
      renderMotionFrame(0, dur);
    };
  }
}

// အဆင့် ၂: Prompt to Photo (မြန်မာစာမှ English Prompts ထုတ်ယူပြီး ပုံဆွဲခြင်း)
async function handleStep2Photos() {
  var scriptText = document.getElementById("s-script-textarea").value.trim();
  var count = parseInt(document.getElementById("s-photo-count").value) || 4;
  var btn = document.getElementById("btn-step2");
  var grid = document.getElementById("s-photo-grid");
  var step3Card = document.getElementById("s-step3-card");

  if (!scriptText) return alert("စာသား အရင်ထုတ်ပေးပါ");

  btn.disabled = true;
  btn.innerText = "⏳ English Prompts ဘာသာပြန်ပြီး ဓာတ်ပုံများ ဆွဲနေသည်...";

  try {
    var res = await fetch("/api/generate-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate_prompts", scriptText: scriptText, photoCount: count })
    });
    var data = await res.json();
    if (!res.ok) throw new Error(data.error);

    var prompts = data.prompts || [];
    var w = 1280, h = 720;
    if (s_aspectRatio === "9:16") { w = 720; h = 1280; }
    if (s_aspectRatio === "1:1") { w = 720; h = 720; }

    grid.innerHTML = "";
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(" + Math.min(4, count) + ", 1fr)";

    for (var i = 0; i < count; i++) {
      grid.innerHTML += '<div style="aspect-ratio: 16/9; background: #0f172a; border-radius: 6px; overflow: hidden;"><img id="s-img-' + i + '" src="" style="width:100%;height:100%;object-fit:cover;" /></div>';
    }

    var loadPromises = prompts.map(function(p, idx) {
      return new Promise(function(resolve) {
        var img = new Image();
        img.crossOrigin = "anonymous";
        var seed = Math.floor(Math.random() * 99999);
        img.src = "https://image.pollinations.ai/prompt/" + encodeURIComponent(p) + "?width=" + w + "&height=" + h + "&nologo=true&seed=" + seed;
        img.onload = function() {
          var pImg = document.getElementById("s-img-" + idx);
          if (pImg) pImg.src = img.src;
          resolve(img);
        };
        img.onerror = function() { resolve(null); };
      });
    });

    s_sceneImages = (await Promise.all(loadPromises)).filter(Boolean);

    btn.innerText = "✅ ၂။ ဓာတ်ပုံများ အဆင်သင့်ဖြစ်ပါပြီ (ပြန်ဆွဲနိုင်သည်)";
    step3Card.style.display = "flex";
    renderMotionFrame(0, 60);

  } catch (err) {
    alert("Photo Error: " + err.message);
    btn.innerText = "🖼️ ၂။ ဓာတ်ပုံများ ဆွဲယူမည်";
  } finally {
    btn.disabled = false;
  }
}

// 2.5D Motion Pan/Zoom Rendering
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
  if (s_clipDurationMode !== "auto") segmentDur = parseFloat(s_clipDurationMode) || 5;

  var idx = Math.floor(time / segmentDur) % s_sceneImages.length;
  var prog = (time % segmentDur) / segmentDur;
  var img = s_sceneImages[idx];
  if (!img) return;

  var scale = 1.0;
  var panX = 0, panY = 0;

  if (s_motionStyle === "zoom-in") scale = 1.0 + prog * 0.15;
  else if (s_motionStyle === "zoom-out") scale = 1.15 - prog * 0.15;
  else if (s_motionStyle === "pan-left") { scale = 1.08; panX = (0.5 - prog) * 50; }
  else if (s_motionStyle === "pan-right") { scale = 1.08; panX = (prog - 0.5) * 50; }
  else { scale = 1.0 + prog * 0.12; }

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2 + panX, canvas.height / 2 + panY);
  ctx.scale(scale, scale);
  ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
  ctx.restore();
}

function toggleMotionPlayback() {
  if (!s_audioEl || !s_audioEl.src) return alert("အသံဖိုင် မရှိသေးပါ။");
  var btnText = document.getElementById("s-play-text");

  if (s_audioEl.paused) {
    s_audioEl.play();
    if (s_currentBgm) s_currentBgm.play();
    s_isMotionPlaying = true;
    btnText.innerText = "⏸ ခေတ္တရပ်မည်";

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
    btnText.innerText = "▶ ၃။ Motion Video စမ်းဖွင့်မည်";
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
    var chunkDur = totalDuration * (chunk.length / totalLength);
    var currentEnd = Math.min(currentStart + chunkDur, totalDuration);
    var fmt = function(s) {
      return Math.floor(s / 3600).toString().padStart(2, "0") + ":" +
             Math.floor((s % 3600) / 60).toString().padStart(2, "0") + ":" +
             Math.floor(s % 60).toString().padStart(2, "0") + "," +
             Math.floor((s % 1) * 1000).toString().padStart(3, "0");
    };
    srt += (index + 1) + "\n" + fmt(currentStart) + " --> " + fmt(currentEnd) + "\n" + chunk + "\n\n";
    currentStart = currentEnd;
  });
  return srt;
}

function parseStorySrt(srtText) {
  if (!srtText) return [];
  return srtText.trim().split(/\n\s*\n/).map(function(block) {
    var lines = block.split("\n");
    if (lines.length >= 3) {
      var timeParts = lines[1].split(" --> ");
      var parseSec = function(t) {
        var p = t.split(":"); var s = p[2].split(",");
        return parseInt(p[0]) * 3600 + parseInt(p[1]) * 60 + parseInt(s[0]) + parseInt(s[1]) / 1000;
      };
      return { start: parseSec(timeParts[0]), end: parseSec(timeParts[1]), text: lines.slice(2).join(" ") };
    }
    return null;
  }).filter(Boolean);
}

// ၈။ Final Motion Video Export
async function exportMotionHardcodedVideo() {
  if (!s_audioEl || !s_audioEl.src) return alert("အသံဖိုင် မရှိသေးပါ။");

  var exportCanvas = document.createElement("canvas");
  if (s_aspectRatio === "9:16") {
    exportCanvas.width = 720; exportCanvas.height = 1280;
  } else if (s_aspectRatio === "1:1") {
    exportCanvas.width = 720; exportCanvas.height = 720;
  } else {
    exportCanvas.width = 1280; exportCanvas.height = 720;
  }
  var ctx = exportCanvas.getContext("2d");

  var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  var dest = audioCtx.createMediaStreamDestination();

  try {
    var aSource = audioCtx.createMediaElementSource(s_audioEl);
    aSource.connect(dest);
  } catch (e) {}

  var canvasStream = exportCanvas.captureStream(30);
  var combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...dest.stream.getAudioTracks()
  ]);

  var mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : "video/webm";
  var recorder = new MediaRecorder(combinedStream, { mimeType });
  var chunks = [];

  recorder.ondataavailable = function(e) { if (e.data && e.data.size > 0) chunks.push(e.data); };
  recorder.onstop = function() {
    var blob = new Blob(chunks, { type: "video/webm" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "Story_Video_" + s_aspectRatio.replace(":", "_") + "_" + Date.now() + ".webm";
    a.click();
    alert("Motion Video Download ရယူပြီးပါပြီ!");
  };

  s_audioEl.currentTime = 0;
  recorder.start();
  await s_audioEl.play();

  var wrapper = document.getElementById("s-video-wrapper");
  var scaleX = exportCanvas.width / wrapper.clientWidth;
  var scaleY = exportCanvas.height / wrapper.clientHeight;
  var subEl = document.getElementById("s-drag-subtitle");
  var titleEl = document.getElementById("s-drag-title");
  var wmEl = document.getElementById("s-drag-watermark");

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
          var padX = 14 * scaleX; var padY = 8 * scaleY;
          var bW = metrics.width + padX * 2; var bH = dynFont + padY * 2;
          ctx.fillStyle = s_srtBgStyle;
          ctx.beginPath();
          ctx.roundRect(sx - bW / 2, sy - bH / 2, bW, bH, 8 * scaleX);
          ctx.fill();
          ctx.fillStyle = s_srtFontColor;
          ctx.fillText(cue.text, sx, sy);
        }
      }
    }
    requestAnimationFrame(exportLoop);
  }

  s_audioEl.onended = function() { recorder.stop(); };
  exportLoop();
}

window.initStoryView = initStoryView;
window.initStory = initStoryView;
window.renderStory = initStoryView;

if (document.readyState !== "loading") {
  initStoryView();
} else {
  document.addEventListener("DOMContentLoaded", initStoryView);
}

document.addEventListener("click", function(e) {
  if (e.target && e.target.closest && (e.target.closest("[onclick*='story']") || e.target.closest(".nav-item:nth-child(3)") || e.target.closest("button:nth-child(3)"))) {
    setTimeout(initStoryView, 50);
  }
});
