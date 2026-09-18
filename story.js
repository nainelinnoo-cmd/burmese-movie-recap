var s_storyData = null;
var s_currentEpNum = 1;
var s_selectedVoice = "nilar-clear"; // Default စခရင်ပုံအတိုင်း နီလာ (ကြည်လင်)
var s_promptsArray = [];
var s_sceneImages = [];
var s_aspectRatio = "16:9";
var s_motionStyle = "dynamic";
var s_clipDurationMode = "auto";

var s_audioEl = null;
var s_srtCues = [];
var s_isMotionPlaying = false;
var s_animFrameId = null;

var s_isSrtVisible = true;
var s_loadTimer = null;

function initStoryView() {
  var container = document.getElementById("view-story") ||
                  document.getElementById("story") ||
                  document.getElementById("story-view") ||
                  document.getElementById("story-container");

  if (!container) return;

  container.innerHTML = `
    <style>
      .step-badge { background: #0284c7; color: #fff; font-size: 0.75rem; padding: 2px 8px; border-radius: 6px; font-weight: bold; }
      .ep-btn { padding: 8px 0; border-radius: 6px; border: 1px solid #334155; background: #1e293b; color: #fff; font-weight: bold; cursor: pointer; font-size: 0.8rem; }
      .ep-btn.active { background: #38bdf8; color: #000; border-color: #38bdf8; }
      .ratio-btn { flex: 1; padding: 8px; background: #1e293b; border: 1px solid #334155; color: #94a3b8; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 0.8rem; }
      .ratio-btn.active { background: #38bdf8; color: #000; border-color: #38bdf8; }

      /* စခရင်ပုံထဲကအတိုင်း Custom Voice List စတိုင် */
      .voice-section-title { font-size: 0.78rem; font-weight: bold; color: #94a3b8; margin: 6px 0 2px 4px; display: block; }
      .voice-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: background 0.15s ease; border-bottom: 1px solid #1e293b; }
      .voice-row:last-child { border-bottom: none; }
      .voice-row:hover { background: #1e293b; }
      .voice-row.selected { background: rgba(56, 189, 248, 0.12); }
      .voice-label-wrap { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; font-weight: 500; color: #f1f5f9; }
      .custom-radio { width: 18px; height: 18px; border-radius: 50%; border: 2px solid #64748b; display: flex; align-items: center; justify-content: center; }
      .voice-row.selected .custom-radio { border-color: #38bdf8; }
      .custom-radio-dot { width: 9px; height: 9px; border-radius: 50%; background: #38bdf8; display: none; }
      .voice-row.selected .custom-radio-dot { display: block; }

      @keyframes spinRing {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .loading-spinner {
        width: 36px;
        height: 36px;
        border: 3px solid rgba(56, 189, 248, 0.2);
        border-top: 3px solid #38bdf8;
        border-radius: 50%;
        animation: spinRing 0.8s linear infinite;
      }
    </style>

    <div style="display: flex; flex-direction: column; gap: 14px;">

      <!-- အဆင့် ၁: ပုံပြင်စာသား ရေးထုတ်ခြင်း Box -->
      <div class="card" style="display: flex; flex-direction: column; gap: 10px;">
        <span style="font-weight: bold; color: #38bdf8;"><span class="step-badge">အဆင့် ၁</span> 📝 ပုံပြင်စာသား ရေးသားထုတ်ယူခြင်း</span>

        <div>
          <label style="font-size: 0.75rem; margin-bottom: 4px; display: block;">ဇာတ်လမ်း ခေါင်းစဉ် (Title)</label>
          <input type="text" id="s-topic-input" placeholder="ခေါင်းစဉ် ရိုက်ပါ (ဥပမာ- ရွာစွန်က သရဲမလေး)..." style="font-size: 0.85rem;" />
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
          <div>
            <label style="font-size: 0.72rem; margin-bottom: 2px;">🎬 ပုံစံ</label>
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
              <option value="1">၁ မိနစ်စာ (~105 လုံး)</option>
              <option value="2">၂ မိနစ်စာ (~210 လုံး)</option>
              <option value="3">၃ မိနစ်စာ (~315 လုံး)</option>
            </select>
          </div>
        </div>

        <button onclick="handleGenerateStoryText()" id="btn-gen-text" class="btn" style="background: #0284c7; padding: 12px; font-weight: bold;">
          <span>✨ ဇာတ်လမ်းစာသား ရေးထုတ်မည်</span>
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

        <div style="position: relative; min-height: 150px;">
          <label id="s-label-current-text" style="font-size: 0.78rem; color: #38bdf8; font-weight: bold; margin-bottom: 4px; display: block;">📖 ထွက်ပေါ်လာသော မြန်မာဇာတ်လမ်းစာသား</label>
          <textarea id="s-script-textarea" rows="6" placeholder="နံပါတ်စဉ်နှင့် အင်္ဂလိပ်စာလုံး လုံးဝမပါသော မြန်မာစာသား ဤနေရာတွင် ပေါ်လာမည်..." style="font-size: 0.85rem; line-height: 1.6; width: 100%; box-sizing: border-box;"></textarea>

          <div id="s-box-loader" style="display: none; position: absolute; top: 24px; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.96); border: 1.5px solid #0284c7; border-radius: 8px; flex-direction: column; align-items: center; justify-content: center; gap: 8px; z-index: 10; padding: 12px; box-sizing: border-box;">
            <div class="loading-spinner"></div>
            <div style="text-align: center;">
              <span id="s-box-loading-title" style="color: #38bdf8; font-size: 0.82rem; font-weight: bold; display: block;">Gemini Flash ဖြင့် ရေးသားနေပါသည်...</span>
              <span id="s-box-loading-pct" style="color: #facc15; font-size: 1rem; font-weight: bold;">0%</span>
            </div>
            <div style="width: 70%; height: 6px; background: #080e1a; border-radius: 4px; overflow: hidden;">
              <div id="s-box-loading-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #38bdf8, #10b981); transition: width 0.3s ease;"></div>
            </div>
          </div>
        </div>

        <!-- အသံသရုပ်ဆောင် ရွေးချယ်မှု စာရင်း (စခရင်ပုံအတိုင်း အသံ ၇ မျိုး အပြည့်အစုံ) -->
        <div id="s-audio-preview-box" style="display: none; flex-direction: column; gap: 10px; background: #0b1120; border: 1.5px solid #1e293b; border-radius: 12px; padding: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.82rem; color: #38bdf8; font-weight: bold;">🎙️ အသံသရုပ်ဆောင် ရွေးချယ်ပြီး စမ်းနားထောင်မည်</span>
          </div>

          <!-- စခရင်ပုံထဲက UI ပုံစံ အသံစာရင်း -->
          <div style="background: #111827; border-radius: 10px; padding: 4px 6px; border: 1px solid #1f2937;">
            <span class="voice-section-title">Edge-TTS (သဘာဝ)</span>

            <div class="voice-row" onclick="chooseVoice('thiha-regular', this)">
              <div class="voice-label-wrap"><span>👦</span> <span>သီဟ (ပုံမှန်)</span></div>
              <div class="custom-radio"><div class="custom-radio-dot"></div></div>
            </div>

            <div class="voice-row" onclick="chooseVoice('thiha-deep', this)">
              <div class="voice-label-wrap"><span>🎙️</span> <span>သီဟ (ဩဇာကြီး)</span></div>
              <div class="custom-radio"><div class="custom-radio-dot"></div></div>
            </div>

            <div class="voice-row" onclick="chooseVoice('thiha-fast', this)">
              <div class="voice-label-wrap"><span>⚡</span> <span>သီဟ (သွက်လက်)</span></div>
              <div class="custom-radio"><div class="custom-radio-dot"></div></div>
            </div>

            <div class="voice-row selected" onclick="chooseVoice('nilar-clear', this)">
              <div class="voice-label-wrap"><span>👩</span> <span>နီလာ (ကြည်လင်)</span></div>
              <div class="custom-radio"><div class="custom-radio-dot"></div></div>
            </div>

            <div class="voice-row" onclick="chooseVoice('nilar-warm', this)">
              <div class="voice-label-wrap"><span>🌸</span> <span>နီလာ (နွေးထွေး)</span></div>
              <div class="custom-radio"><div class="custom-radio-dot"></div></div>
            </div>

            <span class="voice-section-title" style="margin-top: 10px;">Google TTS</span>

            <div class="voice-row" onclick="chooseVoice('google-female', this)">
              <div class="voice-label-wrap"><span>👩</span> <span>Google (မ)</span></div>
              <div class="custom-radio"><div class="custom-radio-dot"></div></div>
            </div>

            <div class="voice-row" onclick="chooseVoice('google-male', this)">
              <div class="voice-label-wrap"><span>👦</span> <span>Google (ကျား)</span></div>
              <div class="custom-radio"><div class="custom-radio-dot"></div></div>
            </div>
          </div>

          <!-- အသံထုတ်လုပ် စမ်းနားထောင်မည့် ခလုတ် -->
          <button onclick="handleGenerateAudioPreview()" id="btn-preview-audio" class="btn" style="background: #10b981; padding: 12px; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <span>🔊 အသံ စမ်းနားထောင်မည်</span>
          </button>

          <audio id="s-preview-audio" controls style="width: 100%; height: 40px; display: none; margin-top: 4px;"></audio>
        </div>

        <!-- Translate to Prompt ခလုတ် -->
        <button onclick="handleTranslateToPrompts()" id="btn-next-translate-prompt" class="btn" style="display: none; background: #6366f1; padding: 12px; font-weight: bold;">
          <span>🌐 [Translate to Prompt] စာသားမှ English Prompts သို့ ပြောင်းမည်</span>
        </button>
      </div>

      <!-- အဆင့် ၂: English Prompts သီးသန့် Box -->
      <div class="card" id="s-prompts-card" style="display: none; flex-direction: column; gap: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: bold; color: #a5b4fc;"><span class="step-badge" style="background: #6366f1;">အဆင့် ၂</span> 🎨 English Prompts (ဓာတ်ပုံဖော်ပြချက်များ)</span>
          <select id="s-photo-count" style="height: 34px; font-size: 0.75rem; width: auto;">
            <option value="2">၂ ပုံ</option>
            <option value="4" selected>၄ ပုံ</option>
            <option value="6">၆ ပုံ</option>
            <option value="8">၈ ပုံ</option>
          </select>
        </div>

        <textarea id="s-prompts-textarea" rows="5" placeholder="ဘာသာပြန်ထားသော English Prompts များ ဤနေရာတွင် ပေါ်လာမည်..." style="font-size: 0.82rem; font-family: monospace;"></textarea>

        <button onclick="handlePromptToPhoto()" id="btn-prompt-to-photo" class="btn" style="background: #8b5cf6; padding: 11px; font-weight: bold;">
          <span>🖼️ [Prompt to Photo] ဓာတ်ပုံများ စတင်ဆွဲမည်</span>
        </button>

        <div id="s-photo-grid" style="display: none; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 4px;"></div>
      </div>

      <!-- အဆင့် ၃: Motion Video Studio -->
      <div class="card" id="s-motion-card" style="display: none; flex-direction: column; gap: 14px; background: #131d31;">
        <span style="font-weight: bold; color: #facc15;"><span class="step-badge" style="background: #eab308; color: #000;">အဆင့် ၃</span> 🎬 Motion Video Studio</span>

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
            </select>
          </div>
          <div>
            <label style="font-size: 0.72rem; margin-bottom: 2px;">🎬 Motion စတိုင်</label>
            <select id="s-motion-type" onchange="s_motionStyle = this.value" style="height: 40px; width: 100%; font-size: 0.8rem;">
              <option value="dynamic" selected>🔀 Dynamic (စုံလင်)</option>
              <option value="zoom-in">🔍 Zoom In</option>
              <option value="zoom-out">🔎 Zoom Out</option>
              <option value="pan-left">⬅️ Pan Left</option>
            </select>
          </div>
        </div>

        <div id="s-video-wrapper" style="position: relative; width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 12px; overflow: hidden; border: 1px solid #334155; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
          <canvas id="s-motion-canvas" width="1280" height="720" style="width: 100%; height: 100%; object-fit: contain;"></canvas>

          <div id="s-drag-subtitle" style="position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); width: 86%; text-align: center; color: #ffffff; background: rgba(0,0,0,0.75); padding: 6px 12px; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: move; z-index: 15; touch-action: none; line-height: 1.4;">
            <span id="s-sub-text">စာတန်းထိုး ပြသမည့်နေရာ</span>
          </div>
        </div>

        <button onclick="toggleMotionPlayback()" class="btn" style="background: #10b981; padding: 12px; font-weight: bold;">
          <span id="s-play-text">▶ Motion Video စမ်းဖွင့်မည်</span>
        </button>

        <button onclick="exportMotionHardcodedVideo()" class="btn" style="background: linear-gradient(90deg, #6366f1, #10b981); padding: 14px; font-weight: bold; font-size: 0.95rem;">
          <span>📥 Motion Video အပြီးသတ် Download ရယူမည်</span>
        </button>
      </div>

    </div>
  `;
}

function chooseVoice(voiceKey, el) {
  s_selectedVoice = voiceKey;
  document.querySelectorAll(".voice-row").forEach(function(row) {
    row.classList.remove("selected");
  });
  if (el) el.classList.add("selected");
}

function updateBoxLoader(title, percent, show = true) {
  var loader = document.getElementById("s-box-loader");
  var tEl = document.getElementById("s-box-loading-title");
  var pEl = document.getElementById("s-box-loading-pct");
  var bEl = document.getElementById("s-box-loading-bar");

  if (!show) {
    if (loader) loader.style.display = "none";
    clearInterval(s_loadTimer);
    return;
  }

  if (loader) loader.style.display = "flex";
  if (tEl) tEl.innerText = title;
  if (pEl) pEl.innerText = percent + "%";
  if (bEl) bEl.style.width = percent + "%";
}

async function handleGenerateStoryText() {
  var topic = document.getElementById("s-topic-input").value.trim();
  var format = document.getElementById("s-format-select").value;
  var genre = document.getElementById("s-genre-select").value;
  var duration = document.getElementById("s-duration-select").value;

  var btn = document.getElementById("btn-gen-text");
  var textarea = document.getElementById("s-script-textarea");
  var epContainer = document.getElementById("s-ep-buttons-container");
  var nextBtn = document.getElementById("btn-next-translate-prompt");
  var audioBox = document.getElementById("s-audio-preview-box");

  if (!topic) return alert("ဇာတ်လမ်းခေါင်းစဉ် ရိုက်ထည့်ပေးပါ");

  btn.disabled = true;
  nextBtn.style.display = "none";
  audioBox.style.display = "none";

  var currentPct = 15;
  updateBoxLoader("Gemini Flash ဖြင့် ဇာတ်လမ်းရေးနေပါသည်...", currentPct, true);

  clearInterval(s_loadTimer);
  s_loadTimer = setInterval(function() {
    if (currentPct < 90) {
      currentPct += Math.floor(Math.random() * 6) + 3;
      if (currentPct > 90) currentPct = 90;
      updateBoxLoader("မြန်မာစာသီးသန့် ဇာတ်လမ်း ရေးသားနေပါသည်...", currentPct, true);
    }
  }, 300);

  try {
    var res = await fetch("/api/story/generate-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: topic,
        format: format,
        genre: genre,
        durationMinutes: duration
      })
    });

    var data = await res.json();
    if (!res.ok) throw new Error(data.error || "ဇာတ်လမ်း ရေးသားမှု မအောင်မြင်ပါ");

    clearInterval(s_loadTimer);
    updateBoxLoader(`[${data.model_used}] အောင်မြင်စွာ ပြီးစီးပါပြီ!`, 100, true);

    setTimeout(function() {
      updateBoxLoader("", 0, false);
      s_storyData = data;

      if (data.format === "series" && data.episodes) {
        epContainer.style.display = "flex";
        s_currentEpNum = 1;
        selectStoryEpisode(1);
      } else {
        epContainer.style.display = "none";
        document.getElementById("s-label-current-text").innerText = "🎬 " + data.title + " (ရုပ်ရှင်ဇာတ်လမ်းစာသား)";
        textarea.value = data.story_text;
      }

      btn.innerText = "✨ စာသား အသစ်ပြန်ရေးမည်";
      audioBox.style.display = "flex";
      nextBtn.style.display = "block";
      btn.disabled = false;
    }, 400);

  } catch (err) {
    clearInterval(s_loadTimer);
    updateBoxLoader("", 0, false);
    alert("Error: " + err.message);
    btn.innerText = "✨ ဇာတ်လမ်းစာသား ရေးထုတ်မည်";
    btn.disabled = false;
  }
}

function selectStoryEpisode(epNum) {
  if (!s_storyData || !s_storyData.episodes) return;
  s_currentEpNum = epNum;

  for (var i = 1; i <= 6; i++) {
    var b = document.getElementById("btn-sep-" + i);
    if (b) {
      if (i === epNum) b.classList.add("active");
      else b.classList.remove("active");
    }
  }

  var ep = s_storyData.episodes[epNum - 1];
  document.getElementById("s-label-current-text").innerText = "📖 အပိုင်း " + epNum + ": " + ep.title;
  document.getElementById("s-script-textarea").value = ep.text;
}

async function handleGenerateAudioPreview() {
  var scriptText = document.getElementById("s-script-textarea").value.trim();
  var btn = document.getElementById("btn-preview-audio");
  var audioPlayer = document.getElementById("s-preview-audio");

  if (!scriptText) return alert("စာသား မရှိသေးပါ");

  btn.disabled = true;
  btn.innerHTML = '<span>⏳ အသံဖိုင် စီစဉ်ထုတ်ယူနေသည်...</span>';

  try {
    var res = await fetch("/api/story/generate-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generate_audio",
        scriptText: scriptText,
        voice: s_selectedVoice
      })
    });

    var data = await res.json();
    if (!res.ok) throw new Error(data.error);

    var audioBlob = new Blob([Uint8Array.from(atob(data.audioBase64), function(c) { return c.charCodeAt(0); })], { type: "audio/mp3" });
    audioPlayer.src = URL.createObjectURL(audioBlob);
    audioPlayer.style.display = "block";
    s_audioEl = audioPlayer;
    audioPlayer.play();

    var dur = audioPlayer.duration || 60;
    s_srtCues = parseStorySrt(generateStorySrt(scriptText, dur));

    btn.innerHTML = `<span>🔊 [${data.voice_used}] အသံ နားထောင်မည်</span>`;
  } catch (err) {
    alert("Audio Error: " + err.message);
    btn.innerHTML = "<span>🔊 အသံ စမ်းနားထောင်မည်</span>";
  } finally {
    btn.disabled = false;
  }
}

async function handleTranslateToPrompts() {
  var scriptText = document.getElementById("s-script-textarea").value.trim();
  var count = document.getElementById("s-photo-count").value;
  var nextBtn = document.getElementById("btn-next-translate-prompt");
  var promptsCard = document.getElementById("s-prompts-card");
  var promptsTextarea = document.getElementById("s-prompts-textarea");

  if (!scriptText) return alert("စာသား အရင်ထုတ်ပေးပါ");

  nextBtn.disabled = true;
  updateBoxLoader("English Prompts သို့ ဘာသာပြန်နေပါသည်...", 40, true);

  try {
    var res = await fetch("/api/story/generate-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "translate_to_prompts",
        scriptText: scriptText,
        photoCount: count
      })
    });

    var data = await res.json();
    if (!res.ok) throw new Error(data.error);

    updateBoxLoader(`[${data.model_used}] Prompts ပြီးစီးပါပြီ!`, 100, true);

    setTimeout(function() {
      updateBoxLoader("", 0, false);
      s_promptsArray = data.prompts_array || [];
      promptsTextarea.value = data.prompts_text;
      promptsCard.style.display = "flex";
      nextBtn.disabled = false;
    }, 400);

  } catch (err) {
    updateBoxLoader("", 0, false);
    alert("Error: " + err.message);
    nextBtn.disabled = false;
  }
}

async function handlePromptToPhoto() {
  var rawText = document.getElementById("s-prompts-textarea").value.trim();
  var btn = document.getElementById("btn-prompt-to-photo");
  var grid = document.getElementById("s-photo-grid");
  var motionCard = document.getElementById("s-motion-card");

  if (!rawText) return alert("Prompts မရှိသေးပါ");

  var prompts = rawText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  if (prompts.length === 0) prompts = s_promptsArray;

  btn.disabled = true;
  btn.innerText = "⏳ ဓာတ်ပုံများ ရေးဆွဲနေသည်...";

  var w = 1280, h = 720;
  if (s_aspectRatio === "9:16") { w = 720; h = 1280; }
  if (s_aspectRatio === "1:1") { w = 720; h = 720; }

  grid.innerHTML = "";
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(" + Math.min(4, prompts.length) + ", 1fr)";

  for (var i = 0; i < prompts.length; i++) {
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
  btn.innerText = "✅ ဓာတ်ပုံများ ရရှိပါပြီ (ပြန်ဆွဲနိုင်သည်)";
  btn.disabled = false;
  motionCard.style.display = "flex";
  renderMotionFrame(0, 60);
}

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

  var scale = 1.0 + prog * 0.12;
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(scale, scale);
  ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
  ctx.restore();
}

function toggleMotionPlayback() {
  if (!s_audioEl || !s_audioEl.src) return alert("အသံဖိုင် စမ်းနားထောင်ခြင်း အရင်လုပ်ပေးပါ။");
  var btnText = document.getElementById("s-play-text");

  if (s_audioEl.paused) {
    s_audioEl.play();
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
    s_isMotionPlaying = false;
    btnText.innerText = "▶ Motion Video စမ်းဖွင့်မည်";
    cancelAnimationFrame(s_animFrameId);
  }
}

function generateStorySrt(scriptText, totalDuration) {
  var sentences = scriptText.match(/[^။!?\n]+[။!?\n]?/g) || [scriptText];
  var chunks = sentences.map(function(s) { return s.trim(); }).filter(Boolean);
  var totalLength = chunks.reduce(function(acc, c) { return acc + c.length; }, 0);
  var srt = "", currentStart = 0;

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
  };

  s_audioEl.currentTime = 0;
  recorder.start();
  await s_audioEl.play();

  function exportLoop() {
    if (s_audioEl.paused || s_audioEl.ended) return;
    var curr = s_audioEl.currentTime;
    var dur = s_audioEl.duration || 60;
    renderMotionFrame(curr, dur);
    ctx.drawImage(document.getElementById("s-motion-canvas"), 0, 0, exportCanvas.width, exportCanvas.height);
    requestAnimationFrame(exportLoop);
  }
  s_audioEl.onended = function() { recorder.stop(); };
  exportLoop();
}

window.initStoryView = initStoryView;
if (document.readyState !== "loading") { initStoryView(); } else { document.addEventListener("DOMContentLoaded", initStoryView); }

document.addEventListener("click", function(e) {
  if (e.target && e.target.closest && (e.target.closest("[onclick*='story']") || e.target.closest(".nav-item:nth-child(3)") || e.target.closest("button:nth-child(3)"))) {
    setTimeout(initStoryView, 50);
  }
});
