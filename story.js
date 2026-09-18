var s_storyData = null;
var s_currentEpNum = 1;
var s_promptsArray = [];
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

      /* စာသား Box ထဲရှိ Loading Animation စတိုင် */
      @keyframes pulseGlow {
        0%, 100% { opacity: 0.6; transform: scale(0.98); }
        50% { opacity: 1; transform: scale(1.02); }
      }
      @keyframes spinRing {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .loading-spinner {
        width: 38px;
        height: 38px;
        border: 3px solid rgba(56, 189, 248, 0.2);
        border-top: 3px solid #38bdf8;
        border-radius: 50%;
        animation: spinRing 0.8s linear infinite;
      }
    </style>

    <div style="display: flex; flex-direction: column; gap: 14px;">

      <!-- အဆင့် ၁: ပုံပြင်စာသား ရေးသားထုတ်ယူခြင်း Box -->
      <div class="card" style="display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: bold; color: #38bdf8;"><span class="step-badge">အဆင့် ၁</span> 📝 ပုံပြင်စာသား ရေးသားထုတ်ယူခြင်း</span>
        </div>

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

        <!-- စာသား Box နှင့် ယင်းအတွင်း ထည့်သွင်းထားသော Loading Animation -->
        <div style="position: relative; min-height: 150px;">
          <label id="s-label-current-text" style="font-size: 0.78rem; color: #38bdf8; font-weight: bold; margin-bottom: 4px; display: block;">📖 ထွက်ပေါ်လာသော မြန်မာဇာတ်လမ်းစာသား</label>
          
          <textarea id="s-script-textarea" rows="6" placeholder="နံပါတ်စဉ်နှင့် အင်္ဂလိပ်စာလုံး လုံးဝမပါသော မြန်မာစာသား ဤနေရာတွင် ပေါ်လာမည်..." style="font-size: 0.85rem; line-height: 1.6; width: 100%; box-sizing: border-box;"></textarea>

          <!-- အနီရောင်ဝိုင်းပြထားသော စာသား Box အတွင်း Loading Animation UI -->
          <div id="s-box-loader" style="display: none; position: absolute; top: 24px; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.95); border: 1.5px solid #0284c7; border-radius: 8px; flex-direction: column; align-items: center; justify-content: center; gap: 10px; z-index: 10; padding: 12px; box-sizing: border-box;">
            <div class="loading-spinner"></div>
            <div style="text-align: center;">
              <span id="s-box-loading-title" style="color: #38bdf8; font-size: 0.82rem; font-weight: bold; display: block;">Gemini Flash ဖြင့် ရေးသားနေပါသည်...</span>
              <span id="s-box-loading-pct" style="color: #facc15; font-size: 1rem; font-weight: bold;">0%</span>
            </div>
            <!-- အောက်ခံ Progress Bar အသေး -->
            <div style="width: 75%; height: 6px; background: #080e1a; border-radius: 4px; overflow: hidden;">
              <div id="s-box-loading-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #38bdf8, #10b981); transition: width 0.3s ease;"></div>
            </div>
          </div>
        </div>

        <!-- Translate to Prompt ခလုတ် -->
        <button onclick="handleTranslateToPrompts()" id="btn-next-translate-prompt" class="btn" style="display: none; background: #6366f1; padding: 12px; font-weight: bold;">
          <span>🌐 [Translate to Prompt] စာသားမှ English Prompts သို့ ပြောင်းမည်</span>
        </button>
      </div>

      <!-- အဆင့် ၂: English Prompt သီးသန့် Box -->
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

        <button id="btn-prompt-to-photo" class="btn" style="background: #8b5cf6; padding: 11px; font-weight: bold;">
          <span>🖼️ [Prompt to Photo] ဓာတ်ပုံများ စတင်ဆွဲမည်</span>
        </button>
      </div>

    </div>
  `;
}

// စာသား Box ထဲတွင် Animation နှင့် % အမှန် ပြသပေးသည့် Controller
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

// ၁။ ပုံပြင်စာသား ရေးထုတ်ခြင်း (စာသား Box ထဲတွင် ကာတွန်းနှင့် % အမှန် တက်စေမည့် စနစ်)
async function handleGenerateStoryText() {
  var topic = document.getElementById("s-topic-input").value.trim();
  var format = document.getElementById("s-format-select").value;
  var genre = document.getElementById("s-genre-select").value;
  var duration = document.getElementById("s-duration-select").value;

  var btn = document.getElementById("btn-gen-text");
  var textarea = document.getElementById("s-script-textarea");
  var epContainer = document.getElementById("s-ep-buttons-container");
  var nextBtn = document.getElementById("btn-next-translate-prompt");

  if (!topic) return alert("ဇာတ်လမ်းခေါင်းစဉ် ရိုက်ထည့်ပေးပါ");

  btn.disabled = true;
  nextBtn.style.display = "none";

  // စာသား Box ထဲတွင် Loading Animation စတင်ပြသခြင်း
  var currentPct = 10;
  updateBoxLoader("Gemini Flash ဖြင့် ချိတ်ဆက်နေပါသည်...", currentPct, true);

  // မရပ်တန့်ဘဲ ၉၀% အထိ သဘာဝကျစွာ တဖြည်းဖြည်း တက်စေခြင်း
  clearInterval(s_loadTimer);
  s_loadTimer = setInterval(function() {
    if (currentPct < 90) {
      currentPct += Math.floor(Math.random() * 8) + 4;
      if (currentPct > 90) currentPct = 90;
      updateBoxLoader("မြန်မာစာသီးသန့် ဇာတ်လမ်း ရေးသားနေပါသည်...", currentPct, true);
    }
  }, 400);

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
      nextBtn.style.display = "block";
      btn.disabled = false;
    }, 600);

  } catch (err) {
    clearInterval(s_loadTimer);
    updateBoxLoader("", 0, false);
    alert("Error: " + err.message);
    btn.innerText = "✨ ဇာတ်လမ်းစာသား ရေးထုတ်မည်";
    btn.disabled = false;
  }
}

// ၂။ Series Episode ရွေးချယ်ခြင်း
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

// ၃။ မြန်မာစာမှ English Prompts သို့ Translate လုပ်ခြင်း
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
    }, 500);

  } catch (err) {
    updateBoxLoader("", 0, false);
    alert("Error: " + err.message);
    nextBtn.disabled = false;
  }
}

window.initStoryView = initStoryView;
if (document.readyState !== "loading") { initStoryView(); } else { document.addEventListener("DOMContentLoaded", initStoryView); }

document.addEventListener("click", function(e) {
  if (e.target && e.target.closest && (e.target.closest("[onclick*='story']") || e.target.closest(".nav-item:nth-child(3)") || e.target.closest("button:nth-child(3)"))) {
    setTimeout(initStoryView, 50);
  }
});
