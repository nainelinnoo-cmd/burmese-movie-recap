var s_storyData = null;
var s_currentEpNum = 1;

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
    </style>

    <div style="display: flex; flex-direction: column; gap: 14px;">

      <!-- Model Tracker & Loading Bar -->
      <div id="s-global-progress" style="display: none; background: #1e293b; border: 1px solid #0284c7; border-radius: 12px; padding: 12px;">
        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 6px;">
          <span id="s-progress-status-title" style="color: #38bdf8; font-weight: bold;">စတင်နေပါသည်...</span>
          <span id="s-progress-status-pct" style="color: #facc15; font-weight: bold;">0%</span>
        </div>
        <div style="width: 100%; height: 8px; background: #0f172a; border-radius: 6px; overflow: hidden;">
          <div id="s-progress-status-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #38bdf8, #10b981); transition: width 0.25s ease;"></div>
        </div>
      </div>

      <!-- ပုံပြင်စာသား ရေးသားထုတ်ယူခြင်း Box -->
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

        <div>
          <label id="s-label-current-text" style="font-size: 0.78rem; color: #38bdf8; font-weight: bold; margin-bottom: 4px; display: block;">📖 ထွက်ပေါ်လာသော မြန်မာဇာတ်လမ်းစာသား</label>
          <textarea id="s-script-textarea" rows="6" placeholder="အင်္ဂလိပ်စာလုံး လုံးဝမပါသော မြန်မာစာသား ဤနေရာတွင် ပေါ်လာမည်..." style="font-size: 0.85rem;"></textarea>
        </div>

        <!-- နောက်တစ်ဆင့်အတွက် Translate to Prompt ခလုတ် -->
        <button id="btn-next-translate-prompt" class="btn" style="display: none; background: #6366f1; padding: 11px; font-weight: bold;">
          <span>🌐 [Translate to Prompt] စာသားမှ English Prompts သို့ ပြောင်းမည်</span>
        </button>
      </div>

    </div>
  `;
}

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

// ဇာတ်လမ်းစာသား ရေးထုတ်ခြင်း Function
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
  updateGlobalProgress("Gemini Flash ဖြင့် စတင်ချိတ်ဆက်နေပါသည်...", 15, true);

  try {
    updateGlobalProgress("[Gemini Flash] မြန်မာစာသီးသန့် ဇာတ်လမ်း ရေးသားနေပါသည်...", 50, true);

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

    updateGlobalProgress(`[${data.model_used}] မြန်မာဇာတ်လမ်းစာသား ရေးသားပြီးပါပြီ!`, 100, true);
    btn.innerText = "✨ စာသား အသစ်ပြန်ရေးမည်";
    nextBtn.style.display = "block";

    setTimeout(function() { updateGlobalProgress("", 0, false); }, 1200);

  } catch (err) {
    updateGlobalProgress("", 0, false);
    alert("Error: " + err.message);
    btn.innerText = "✨ ဇာတ်လမ်းစာသား ရေးထုတ်မည်";
  } finally {
    btn.disabled = false;
  }
}

// Series အပိုင်းများ ကူးပြောင်းကြည့်ရှုခြင်း
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

window.initStoryView = initStoryView;
if (document.readyState !== "loading") { initStoryView(); } else { document.addEventListener("DOMContentLoaded", initStoryView); }

document.addEventListener("click", function(e) {
  if (e.target && e.target.closest && (e.target.closest("[onclick*='story']") || e.target.closest(".nav-item:nth-child(3)") || e.target.closest("button:nth-child(3)"))) {
    setTimeout(initStoryView, 50);
  }
});
