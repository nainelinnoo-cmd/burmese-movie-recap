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
    </style>

    <div style="display: flex; flex-direction: column; gap: 14px;">

      <div class="card" style="background: #131d31; padding: 12px;">
        <label style="font-size: 0.8rem; margin-bottom: 6px; display: block; color: #facc15;">📐 ဗီဒီယို ဆိုဒ် (Aspect Ratio) ရွေးချယ်ပါ</label>
        <div style="display: flex; gap: 8px;">
          <button onclick="setVideoRatio('16:9', this)" class="ratio-btn active">📺 16:9 (Landscape)</button>
          <button onclick="setVideoRatio('9:16', this)" class="ratio-btn">📱 9:16 (TikTok/Reels)</button>
          <button onclick="setVideoRatio('1:1', this)" class="ratio-btn">🔲 1:1 (Square)</button>
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
          <span>✨ ၁။ ဇာတ်လမ်းစာသားနှင့် အသံဖိုင် အရင်ထုတ်မည်</span>
        </button>

        <textarea id="s-script-textarea" rows="4" placeholder="အသံနှင့် စာသား အရင်ပေါ်လာမည်..." style="font-size: 0.85rem;"></textarea>
        <audio id="s-audio-player" controls style="width: 100%; height: 38px; display: none;"></audio>
      </div>

      <div class="card" id="s-step2-card" style="display: none; flex-direction: column; gap: 10px;">
        <span style="font-weight: bold; color: #38bdf8;"><span class="step-badge">အဆင့် ၂</span> 🎨 Prompt to Photo (ဓာတ်ပုံများ ဆွဲယူခြင်း)</span>
        
        <div style="display: flex; gap: 8px; align-items: center;">
          <select id="s-photo-count" style="height: 40px; font-size: 0.8rem; flex: 1;">
            <option value="2">၂ ပုံ</option>
            <option value="4" selected>၄ ပုံ</option>
            <option value="6">၆ ပုံ</option>
            <option value="8">၈ ပုံ</option>
          </select>
          <button onclick="handleStep2Photos()" id="btn-step2" class="btn" style="background: #8b5cf6; padding: 10px 14px; font-weight: bold; flex: 2;">
            <span>🖼️ ၂။ ဓာတ်ပုံများ ဆွဲယူမည်</span>
          </button>
        </div>

        <div id="s-photo-grid" style="display: none; grid-template-columns: repeat(4, 1fr); gap: 6px;"></div>
      </div>

      <div class="card" id="s-step3-card" style="display: none; flex-direction: column; gap: 14px;">
        <span style="font-weight: bold; color: #facc15;"><span class="step-badge">အဆင့် ၃</span> 🎬 Motion Video ဖန်တီးခြင်း</span>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div>
            <label style="font-size: 0.72rem;">⏱️ Clip Time</label>
            <select id="s-clip-time" onchange="s_clipDurationMode = this.value" style="height: 38px; width: 100%; font-size: 0.8rem;">
              <option value="auto" selected>🎵 Auto (အသံနှင့်ညီ)</option>
              <option value="3">၃ စက္ကန့်</option>
              <option value="5">၅ စက္ကန့်</option>
            </select>
          </div>
          <div>
            <label style="font-size: 0.72rem;">🎬 Motion စတိုင်</label>
            <select id="s-motion-type" onchange="s_motionStyle = this.value" style="height: 38px; width: 100%; font-size: 0.8rem;">
              <option value="dynamic" selected>🔀 Dynamic (စုံလင်)</option>
              <option value="zoom-in">🔍 Zoom In</option>
              <option value="zoom-out">🔎 Zoom Out</option>
              <option value="pan-left">⬅️ Pan Left</option>
            </select>
          </div>
        </div>

        <div id="s-video-wrapper" style="position: relative; width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 12px; overflow: hidden; border: 1px solid #334155; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
          <canvas id="s-motion-canvas" width="1280" height="720" style="width: 100%; height: 100%; object-fit: contain;"></canvas>

          <div id="s-drag-title" style="display: none; position: absolute; top: 15px; left: 50%; transform: translateX(-50%); color: #facc15; font-weight: bold; font-size: 24px; cursor: move; z-index: 25; text-shadow: 2px 2px 4px #000;">
            ခေါင်းစဉ် စာသား
          </div>

          <div id="s-drag-subtitle" style="position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); width: 86%; text-align: center; color: #ffffff; background: rgba(0,0,0,0.75); padding: 6px 12px; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: move; z-index: 15; touch-action: none;">
            <span id="s-sub-text">စာတန်းထိုး ပြသမည့်နေရာ</span>
            <div id="s-sub-resize-handle" style="position: absolute; right: -7px; bottom: -7px; width: 22px; height: 22px; background: #10b981; color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; cursor: nwse-resize; font-weight: bold;">↘</div>
          </div>
        </div>

        <button onclick="toggleMotionPlayback()" class="btn" style="background: #10b981; padding: 12px; font-weight: bold;">
          <span id="s-play-text">▶ ၃။ Motion Video စမ်းဖွင့်မည်</span>
        </button>

        <button onclick="exportMotionHardcodedVideo()" class="btn" style="background: linear-gradient(90deg, #6366f1, #10b981); padding: 14px; font-weight: bold; font-size: 0.95rem;">
          <span>📥 Motion Video အပြီးသတ် Download ရယူမည်</span>
        </button>
      </div>

    </div>
  `;
}

// Aspect Ratio Setter
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
}

// အဆင့် ၁: ဇာတ်လမ်းစာသား နှင့် အသံဖိုင် (TTS) ထုတ်ယူခြင်း
async function handleStep1GenerateStory() {
  var topic = document.getElementById("s-topic").value.trim();
  var genre = document.getElementById("s-genre").value;
  var voice = document.getElementById("s-voice").value;
  var btn = document.getElementById("btn-step1");
  var textarea = document.getElementById("s-script-textarea");
  var audioEl = document.getElementById("s-audio-player");
  var step2Card = document.getElementById("s-step2-card");

  if (!topic) return alert("ခေါင်းစဉ် ရိုက်ထည့်ပေးပါ");

  btn.disabled = true;
  btn.innerText = "⏳ စာသားနှင့် အသံဖိုင် ထုတ်နေပါသည်...";

  try {
    var res = await fetch("/api/generate-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate_story_and_audio", topic: topic, genre: genre, voice: voice, durationMinutes: 1 })
    });
    var data = await res.json();
    if (!res.ok) throw new Error(data.error);

    textarea.value = data.story_text;

    var audioBlob = new Blob([Uint8Array.from(atob(data.audioBase64), function(c) { return c.charCodeAt(0); })], { type: "audio/mp3" });
    audioEl.src = URL.createObjectURL(audioBlob);
    audioEl.style.display = "block";
    s_audioEl = audioEl;

    audioEl.onloadedmetadata = function() {
      var dur = audioEl.duration || 60;
      s_srtCues = parseStorySrt(generateStorySrt(data.story_text, dur));
    };

    btn.innerText = "✅ ၁။ စာသားနှင့် အသံ အဆင်သင့်ဖြစ်ပါပြီ";
    step2Card.style.display = "flex";

  } catch (err) {
    alert("Error: " + err.message);
    btn.innerText = "✨ ၁။ ဇာတ်လမ်းစာသားနှင့် အသံဖိုင် အရင်ထုတ်မည်";
  } finally {
    btn.disabled = false;
  }
}

// အဆင့် ၂: Prompt to Photo (ပုံများ ဆွဲယူခြင်း)
async function handleStep2Photos() {
  var scriptText = document.getElementById("s-script-textarea").value.trim();
  var count = parseInt(document.getElementById("s-photo-count").value) || 4;
  var btn = document.getElementById("btn-step2");
  var grid = document.getElementById("s-photo-grid");
  var step3Card = document.getElementById("s-step3-card");

  if (!scriptText) return alert("စာသား အရင်ထုတ်ပေးပါ");

  btn.disabled = true;
  btn.innerText = "⏳ ဓာတ်ပုံများ ဆွဲယူနေပါသည်...";

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
        img.src = "[https://image.pollinations.ai/prompt/](https://image.pollinations.ai/prompt/)" + encodeURIComponent(p) + "?width=" + w + "&height=" + h + "&nologo=true&seed=" + seed;
        img.onload = function() {
          var pImg = document.getElementById("s-img-" + idx);
          if (pImg) pImg.src = img.src;
          resolve(img);
        };
        img.onerror = function() { resolve(null); };
      });
    });

    s_sceneImages = (await Promise.all(loadPromises)).filter(Boolean);

    btn.innerText = "✅ ၂။ ဓာတ်ပုံများ အဆင်သင့်ဖြစ်ပါပြီ";
    step3Card.style.display = "flex";
    renderMotionFrame(0, 60);

  } catch (err) {
    alert("Photo Error: " + err.message);
    btn.innerText = "🖼️ ၂။ ဓာတ်ပုံများ ဆွဲယူမည်";
  } finally {
    btn.disabled = false;
  }
}

// Motion Render & Playback
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
    s_isMotionPlaying = true;
    btnText.innerText = "⏸ ခေတ္တရပ်မည်";

    function loop() {
      if (!s_isMotionPlaying) return;
      var curr = s_audioEl.currentTime;
      var dur = s_audioEl.duration || 60;
      renderMotionFrame(curr, dur);

      var cue = s_srtCues.find(function(c) { return curr >= c.start && curr <= c.end; });
      document.getElementById("s-sub-text").innerText = cue ? cue.text : "";
      
      s_animFrameId = requestAnimationFrame(loop);
    }
    s_animFrameId = requestAnimationFrame(loop);
  } else {
    s_audioEl.pause();
    s_isMotionPlaying = false;
    btnText.innerText = "▶ ၃။ Motion Video စမ်းဖွင့်မည်";
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

// Final Video Export
async function exportMotionHardcodedVideo() {
  if (!s_audioEl || !s_audioEl.src) return alert("အသံဖိုင် မရှိသေးပါ။");
  alert("Motion Video အပြီးသတ် Render ပြုလုပ်ခြင်း စတင်နေပါပြီ...");
  // Render logic can follow standard MediaRecorder pattern or simplified download.
}

window.initStoryView = initStoryView;
if (document.readyState !== "loading") { initStoryView(); } else { document.addEventListener("DOMContentLoaded", initStoryView); }
