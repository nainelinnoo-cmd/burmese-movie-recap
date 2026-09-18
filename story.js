let storySeriesData = null;
let currentEpNumber = 1;
let currentStoryVoice = "edge-thiha";
let storyProgressInterval = null;

function initStoryView() {
  const container = document.getElementById("view-story");
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      <div class="card">
        <label>📖 ဇာတ်လမ်း ခေါင်းစဉ် (သို့) Topic</label>
        <input type="text" id="story-topic" placeholder="ဥပမာ- ရွာစွန်က သရဲမကြီး" />
      </div>

      <!-- Row 1: ပုံစံ နှင့် ဇာတ်လမ်းအမျိုးအစား -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-items: start;">
        <div>
          <label style="height: 20px; line-height: 20px; margin-bottom: 6px; display: block;">🎬 ဇာတ်လမ်းပုံစံ</label>
          <select id="story-format" onchange="handleFormatChange()" style="height: 44px; margin-bottom: 0;">
            <option value="series">📺 Series (ဇာတ်လမ်းတွဲ)</option>
            <option value="movie">🎬 Movie (တစ်ပိုင်းတည်း)</option>
          </select>
        </div>
        <div>
          <label style="height: 20px; line-height: 20px; margin-bottom: 6px; display: block;">🎭 ဇာတ်လမ်းအမျိုးအစား</label>
          <select id="story-genre" style="height: 44px; margin-bottom: 0;">
            <option value="horror">👻 သရဲ / ထိတ်လန့်ဖွယ်</option>
            <option value="mystery">🔍 လျှို့ဝှက်သည်းဖို</option>
            <option value="drama">💔 ရင်နင့်ဖွယ် ဘဝဇာတ်လမ်း</option>
            <option value="motivation">💪 စိတ်ဓာတ်ခွန်အား</option>
            <option value="funny">😂 ဟာသဇာတ်လမ်း</option>
          </select>
        </div>
      </div>

      <!-- Row 2: အသံသရုပ်ဆောင် -->
      <div>
        <label style="height: 20px; line-height: 20px; margin-bottom: 6px; display: block;">🗣️ အသံသရုပ်ဆောင် / Engine</label>
        <select id="story-voice-actor" style="height: 44px; margin-bottom: 0;">
          <optgroup label="Microsoft Edge-TTS (မြန်မာအသံ)">
            <option value="edge-thiha">သီဟ (ကျား - ပုံမှန်)</option>
            <option value="edge-thiha-deep">သီဟ (ကျား - အသံဩဇာကြီး)</option>
            <option value="edge-thiha-fast">သီဟ (ကျား - သွက်လက်)</option>
            <option value="edge-nilar">နီလာ (မ - သာယာကြည်လင်)</option>
            <option value="edge-nilar-warm">နီလာ (မ - ညင်သာနွေးထွေး)</option>
            <option value="edge-nilar-fast">နီလာ (မ - စိတ်လှုပ်ရှားသွက်လက်)</option>
          </optgroup>
          <optgroup label="Google TTS (မြန်မာအသံ)">
            <option value="google-my-standard">Google မြန်မာ (သဘာဝစံ)</option>
            <option value="google-my-slow">Google မြန်မာ (အေးဆေးရှင်းလင်း)</option>
            <option value="google-my-fast">Google မြန်မာ (စကားပြောသွက်)</option>
          </optgroup>
          <optgroup label="International (နိုင်ငံတကာ)">
            <option value="edge-en-guy">Guy (US English - ကျား)</option>
            <option value="edge-en-jenny">Jenny (US English - မ)</option>
            <option value="edge-th-niwat">Niwat (Thai - ကျား)</option>
            <option value="edge-th-premwadee">Premwadee (Thai - မ)</option>
          </optgroup>
        </select>
      </div>

      <button id="story-generate-btn" onclick="handleGenerateStory()" class="btn btn-story">
        <span id="story-btn-text">📺 ဇာတ်လမ်းတွဲ (Ep 1 to 6) ဖန်တီးမည်</span>
      </button>

      <!-- % အတိအကျပြသပေးမည့် Progress Bar UI -->
      <div id="story-progress-container" style="display: none; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 14px;">
        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 6px;">
          <span id="story-step-title" style="color: #38bdf8; font-weight: bold;">စတင်နေပါသည်...</span>
          <span id="story-step-percent" style="color: #facc15; font-weight: bold;">0%</span>
        </div>
        <div style="width: 100%; height: 8px; background: #0f172a; border-radius: 6px; overflow: hidden; margin-bottom: 8px;">
          <div id="story-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #38bdf8, #0ea5e9); transition: width 0.3s ease;"></div>
        </div>
        <div id="story-model-info" style="font-size: 0.75rem; color: #94a3b8;">🧠 Gemini 3.6-flash & HF Edge-TTS ဖြင့် လုပ်ဆောင်နေပါသည်</div>
      </div>

      <!-- Result Container -->
      <div id="story-result-container" style="display: none; flex-direction: column; gap: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span id="story-main-title" style="font-size: 0.95rem; font-weight: bold; color: #38bdf8;"></span>
          <span id="story-format-badge" style="font-size: 0.75rem; color: #94a3b8;"></span>
        </div>

        <!-- Series ဖြစ်ပါက ပေါ်လာမည့် Episode Buttons -->
        <div id="series-ep-buttons" style="display: none; grid-template-columns: repeat(6, 1fr); gap: 6px;">
          <button onclick="selectEpisode(1)" id="btn-ep-1" class="ep-btn" style="padding: 10px 0; border-radius: 8px; border: 1px solid #334155; background: #38bdf8; color: #000; font-weight: bold; cursor: pointer;">Ep 1</button>
          <button onclick="selectEpisode(2)" id="btn-ep-2" class="ep-btn" style="padding: 10px 0; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: #fff; font-weight: bold; cursor: pointer;">Ep 2</button>
          <button onclick="selectEpisode(3)" id="btn-ep-3" class="ep-btn" style="padding: 10px 0; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: #fff; font-weight: bold; cursor: pointer;">Ep 3</button>
          <button onclick="selectEpisode(4)" id="btn-ep-4" class="ep-btn" style="padding: 10px 0; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: #fff; font-weight: bold; cursor: pointer;">Ep 4</button>
          <button onclick="selectEpisode(5)" id="btn-ep-5" class="ep-btn" style="padding: 10px 0; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: #fff; font-weight: bold; cursor: pointer;">Ep 5</button>
          <button onclick="selectEpisode(6)" id="btn-ep-6" class="ep-btn" style="padding: 10px 0; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: #fff; font-weight: bold; cursor: pointer;">Ep 6</button>
        </div>

        <div class="card" style="margin-top: 4px;">
          <label id="current-story-label" style="color: #facc15;">ထုတ်လုပ်ထားသော ဇာတ်လမ်းစာသား</label>
          <textarea id="story-script-text" rows="8"></textarea>
        </div>

        <!-- အသံဖွင့်ခလုတ် (နားထောင်နေစဉ် State ပြောင်းလဲမည့် ခလုတ်) -->
        <button id="ep-audio-btn" onclick="playCurrentStoryAudio()" class="btn" style="background: #10b981; color: white; transition: all 0.3s ease;">
          <span id="audio-btn-icon">🔊</span> <span id="audio-btn-text">ဤ Episode အသံကို ဖွင့်မည်</span>
        </button>

        <audio id="story-audio-player" controls style="width: 100%; display: none; margin-top: 6px;"></audio>
      </div>
    </div>
  `;

  // Audio Player Event Listeners (ခလုတ်တွင် အသံနားထောင်နေသည့် ပုံစံပြောင်းရန်)
  const audioPlayer = document.getElementById("story-audio-player");
  const audioBtn = document.getElementById("ep-audio-btn");
  const audioIcon = document.getElementById("audio-btn-icon");
  const audioText = document.getElementById("audio-btn-text");

  audioPlayer.addEventListener("play", () => {
    audioBtn.style.background = "linear-gradient(90deg, #0ea5e9, #6366f1)";
    audioBtn.style.boxShadow = "0 0 15px rgba(14, 165, 233, 0.6)";
    audioIcon.innerText = "⏳";
    audioText.innerText = "အသံနားထောင်နေသည်...";
  });

  audioPlayer.addEventListener("pause", () => {
    audioBtn.style.background = "#10b981";
    audioBtn.style.boxShadow = "none";
    audioIcon.innerText = "▶️";
    audioText.innerText = "အသံပြန်ဖွင့်မည်";
  });

  audioPlayer.addEventListener("ended", () => {
    audioBtn.style.background = "#10b981";
    audioBtn.style.boxShadow = "none";
    audioIcon.innerText = "🔊";
    audioText.innerText = "အသံဖိုင် ပြန်ဖွင့်မည်";
  });
}

function handleFormatChange() {
  const format = document.getElementById("story-format").value;
  const btnText = document.getElementById("story-btn-text");
  if (format === "series") {
    btnText.innerText = "📺 ဇာတ်လမ်းတွဲ (Ep 1 to 6) ဖန်တီးမည်";
  } else {
    btnText.innerText = "🎬 Movie (တစ်ပိုင်းတည်း) ဖန်တီးမည်";
  }
}

function updateStoryProgress(percent, title) {
  const pContainer = document.getElementById("story-progress-container");
  const pBar = document.getElementById("story-progress-bar");
  const pTitle = document.getElementById("story-step-title");
  const pPercent = document.getElementById("story-step-percent");

  if (pContainer) pContainer.style.display = "block";
  if (pBar) pBar.style.width = `${percent}%`;
  if (pPercent) pPercent.innerText = `${percent}%`;
  if (pTitle) pTitle.innerText = title;
}

async function handleGenerateStory() {
  const topic = document.getElementById("story-topic").value.trim();
  const format = document.getElementById("story-format").value;
  const genre = document.getElementById("story-genre").value;
  const voice = document.getElementById("story-voice-actor").value;
  const resultContainer = document.getElementById("story-result-container");
  const epButtonsBox = document.getElementById("series-ep-buttons");
  const generateBtn = document.getElementById("story-generate-btn");

  if (!topic) {
    alert("ဇာတ်လမ်းခေါင်းစဉ် ရိုက်ထည့်ပေးပါ");
    return;
  }

  currentStoryVoice = voice;
  generateBtn.disabled = true;
  generateBtn.style.opacity = "0.5";
  resultContainer.style.display = "none";

  // Progress Bar % အဆင့်ဆင့် တိုးပေးခြင်း
  let currentPct = 10;
  updateStoryProgress(currentPct, "AI စတင်ပြင်ဆင်နေပါသည်...");

  if (storyProgressInterval) clearInterval(storyProgressInterval);
  storyProgressInterval = setInterval(() => {
    if (currentPct < 88) {
      currentPct += Math.floor(Math.random() * 8) + 4;
      if (currentPct > 88) currentPct = 88;

      if (currentPct < 45) {
        updateStoryProgress(currentPct, "Gemini 3.6-flash က ဇာတ်လမ်းဖွဲ့စည်းနေပါသည်...");
      } else if (currentPct < 75) {
        updateStoryProgress(currentPct, "ဇာတ်လမ်း အချိတ်အဆက်များ ညှိယူနေပါသည်...");
      } else {
        updateStoryProgress(currentPct, "မြန်မာ Neural အသံဖိုင် ဖန်တီးနေပါသည်...");
      }
    }
  }, 1200);

  try {
    const response = await fetch("/api/generate-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, format, genre, voice })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "ဇာတ်လမ်းဖန်တီးမှု မအောင်မြင်ပါ");

    clearInterval(storyProgressInterval);
    updateStoryProgress(100, "အားလုံး အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ!");

    setTimeout(() => {
      document.getElementById("story-progress-container").style.display = "none";
    }, 1500);

    resultContainer.style.display = "flex";

    if (format === "series") {
      storySeriesData = data.series;
      epButtonsBox.style.display = "grid";
      document.getElementById("story-main-title").innerText = storySeriesData.series_title || topic;
      document.getElementById("story-format-badge").innerText = "အခန်းဆက် ၆ ပိုင်း";

      if (data.initialAudioBase64) {
        storySeriesData.episodes[0].audioBase64 = data.initialAudioBase64;
      }
      selectEpisode(1);
    } else {
      storySeriesData = null;
      epButtonsBox.style.display = "none";
      document.getElementById("story-main-title").innerText = data.movie_title || topic;
      document.getElementById("story-format-badge").innerText = "ရုပ်ရှင် (တစ်ပိုင်းတည်းပြီး)";
      document.getElementById("current-story-label").innerText = "🎬 ရုပ်ရှင် ဇာတ်လမ်းအပြည့်အစုံ";
      document.getElementById("story-script-text").value = data.story_text;

      const audioPlayer = document.getElementById("story-audio-player");
      if (data.audioBase64) {
        const audioBlob = new Blob([Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0))], { type: "audio/mp3" });
        audioPlayer.src = URL.createObjectURL(audioBlob);
      }
    }

  } catch (err) {
    clearInterval(storyProgressInterval);
    updateStoryProgress(0, `❌ Error: ${err.message}`);
  } finally {
    generateBtn.disabled = false;
    generateBtn.style.opacity = "1";
  }
}

function selectEpisode(epNum) {
  if (!storySeriesData || !storySeriesData.episodes) return;
  currentEpNumber = epNum;

  for (let i = 1; i <= 6; i++) {
    const btn = document.getElementById(`btn-ep-${i}`);
    if (i === epNum) {
      btn.style.background = "#38bdf8";
      btn.style.color = "#000";
    } else {
      btn.style.background = "#1e293b";
      btn.style.color = "#fff";
    }
  }

  const epData = storySeriesData.episodes[epNum - 1];
  document.getElementById("current-story-label").innerText = `${epData.title || `အပိုင်း ${epNum}`}`;
  document.getElementById("story-script-text").value = epData.text;

  const audioPlayer = document.getElementById("story-audio-player");
  audioPlayer.pause();
  if (epData.audioBase64) {
    const audioBlob = new Blob([Uint8Array.from(atob(epData.audioBase64), c => c.charCodeAt(0))], { type: "audio/mp3" });
    audioPlayer.src = URL.createObjectURL(audioBlob);
  }
}

async function playCurrentStoryAudio() {
  const audioPlayer = document.getElementById("story-audio-player");
  const audioBtn = document.getElementById("ep-audio-btn");
  const audioIcon = document.getElementById("audio-btn-icon");
  const audioText = document.getElementById("audio-btn-text");
  const format = document.getElementById("story-format").value;

  if (format === "series") {
    const epData = storySeriesData.episodes[currentEpNumber - 1];
    if (epData.audioBase64) {
      audioPlayer.src = URL.createObjectURL(new Blob([Uint8Array.from(atob(epData.audioBase64), c => c.charCodeAt(0))], { type: "audio/mp3" }));
      audioPlayer.play();
      return;
    }

    audioBtn.disabled = true;
    audioIcon.innerText = "⏳";
    audioText.innerText = "အသံဖိုင် ဖန်တီးနေပါသည်...";

    try {
      const response = await fetch("/api/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fetchAudioOnly: true,
          scriptText: epData.text,
          voice: currentStoryVoice
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      epData.audioBase64 = data.audioBase64;
      const audioBlob = new Blob([Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0))], { type: "audio/mp3" });
      audioPlayer.src = URL.createObjectURL(audioBlob);
      audioPlayer.play();

    } catch (err) {
      alert("အသံဖန်တီးမှု မအောင်မြင်ပါ: " + err.message);
      audioIcon.innerText = "🔊";
      audioText.innerText = "ဤ Episode အသံကို ဖွင့်မည်";
    } finally {
      audioBtn.disabled = false;
    }
  } else {
    // Movie Audio
    if (audioPlayer.src) {
      audioPlayer.play();
    }
  }
}
