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

      <!-- Duration (Minutes) & Format Selection -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-items: start;">
        <div>
          <label style="height: 20px; line-height: 20px; margin-bottom: 6px; display: block;">⏱️ ဇာတ်လမ်း ကြာချိန်</label>
          <select id="story-duration" style="height: 44px;">
            <option value="1">၁ မိနစ် (တိုတိုရှင်းရှင်း)</option>
            <option value="2">၂ မိနစ် (ပုံမှန်)</option>
            <option value="3" selected>၃ မိနစ် (အလတ်စား)</option>
            <option value="5">၅ မိနစ် (ဇာတ်လမ်းရှည်)</option>
          </select>
        </div>
        <div>
          <label style="height: 20px; line-height: 20px; margin-bottom: 6px; display: block;">🎬 ဇာတ်လမ်းပုံစံ</label>
          <select id="story-format" onchange="handleFormatChange()" style="height: 44px;">
            <option value="series">📺 Series (ဇာတ်လမ်းတွဲ)</option>
            <option value="movie">🎬 Movie (တစ်ပိုင်းတည်း)</option>
          </select>
        </div>
      </div>

      <!-- Genre & Voice -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-items: start;">
        <div>
          <label style="height: 20px; line-height: 20px; margin-bottom: 6px; display: block;">🎭 အမျိုးအစား</label>
          <select id="story-genre" style="height: 44px;">
            <option value="horror">👻 သရဲ / ထိတ်လန့်ဖွယ်</option>
            <option value="mystery">🔍 လျှို့ဝှက်သည်းဖို</option>
            <option value="drama">💔 ဘဝဇာတ်လမ်း</option>
            <option value="motivation">💪 ခွန်အားဖြည့်</option>
          </select>
        </div>
        <div>
          <label style="height: 20px; line-height: 20px; margin-bottom: 6px; display: block;">🗣️ အသံသရုပ်ဆောင်</label>
          <select id="story-voice-actor" style="height: 44px;">
            <option value="edge-thiha">သီဟ (ကျား - ပုံမှန်)</option>
            <option value="edge-nilar">နီလာ (မ - ကြည်လင်)</option>
            <option value="google-my-standard">Google မြန်မာ</option>
          </select>
        </div>
      </div>

      <button id="story-generate-btn" onclick="handleGenerateStory()" class="btn btn-story">
        <span id="story-btn-text">📺 ဇာတ်လမ်းတွဲ (Ep 1 to 6) ဖန်တီးမည်</span>
      </button>

      <div id="story-progress-container" style="display: none; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 14px;">
        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 6px;">
          <span id="story-step-title" style="color: #38bdf8; font-weight: bold;">စတင်နေပါသည်...</span>
          <span id="story-step-percent" style="color: #facc15; font-weight: bold;">0%</span>
        </div>
        <div style="width: 100%; height: 8px; background: #0f172a; border-radius: 6px; overflow: hidden; margin-bottom: 8px;">
          <div id="story-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #38bdf8, #0ea5e9); transition: width 0.3s ease;"></div>
        </div>
        <div style="font-size: 0.75rem; color: #94a3b8;">🧠 Gemini 2.5-flash & Groq Engine ဖြင့် စနစ်တကျ ရေးသားနေပါသည်</div>
      </div>

      <div id="story-error-box" style="display: none; background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; border-radius: 10px; padding: 12px; font-size: 0.85rem; color: #fca5a5;"></div>

      <div id="story-result-container" style="display: none; flex-direction: column; gap: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span id="story-main-title" style="font-size: 0.95rem; font-weight: bold; color: #38bdf8;"></span>
          <span id="story-format-badge" style="font-size: 0.75rem; color: #94a3b8;"></span>
        </div>

        <div id="series-ep-buttons" style="display: none; grid-template-columns: repeat(6, 1fr); gap: 6px;">
          <button onclick="selectEpisode(1)" id="btn-ep-1" class="ep-btn" style="padding: 10px 0; border-radius: 8px; border: 1px solid #334155; background: #38bdf8; color: #000; font-weight: bold;">Ep 1</button>
          <button onclick="selectEpisode(2)" id="btn-ep-2" class="ep-btn" style="padding: 10px 0; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: #fff; font-weight: bold;">Ep 2</button>
          <button onclick="selectEpisode(3)" id="btn-ep-3" class="ep-btn" style="padding: 10px 0; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: #fff; font-weight: bold;">Ep 3</button>
          <button onclick="selectEpisode(4)" id="btn-ep-4" class="ep-btn" style="padding: 10px 0; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: #fff; font-weight: bold;">Ep 4</button>
          <button onclick="selectEpisode(5)" id="btn-ep-5" class="ep-btn" style="padding: 10px 0; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: #fff; font-weight: bold;">Ep 5</button>
          <button onclick="selectEpisode(6)" id="btn-ep-6" class="ep-btn" style="padding: 10px 0; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: #fff; font-weight: bold;">Ep 6</button>
        </div>

        <div class="card" style="margin-top: 4px;">
          <label id="current-story-label" style="color: #facc15;">ထုတ်လုပ်ထားသော ဇာတ်လမ်းစာသား</label>
          <textarea id="story-script-text" rows="8"></textarea>
        </div>

        <button id="ep-audio-btn" onclick="playCurrentStoryAudio()" class="btn" style="background: #10b981; color: white;">
          <span id="audio-btn-icon">🔊</span> <span id="audio-btn-text">ဤ Episode အသံကို ဖွင့်မည်</span>
        </button>
        <audio id="story-audio-player" controls style="width: 100%; display: none; margin-top: 6px;"></audio>
      </div>
    </div>
  `;

  setupAudioStateListeners();
}

function setupAudioStateListeners() {
  const audioPlayer = document.getElementById("story-audio-player");
  const audioBtn = document.getElementById("ep-audio-btn");
  const audioIcon = document.getElementById("audio-btn-icon");
  const audioText = document.getElementById("audio-btn-text");

  audioPlayer.addEventListener("play", () => {
    audioBtn.style.background = "linear-gradient(90deg, #0ea5e9, #6366f1)";
    audioIcon.innerText = "⏳";
    audioText.innerText = "အသံနားထောင်နေသည်...";
  });

  audioPlayer.addEventListener("pause", () => {
    audioBtn.style.background = "#10b981";
    audioIcon.innerText = "▶️";
    audioText.innerText = "အသံပြန်ဖွင့်မည်";
  });

  audioPlayer.addEventListener("ended", () => {
    audioBtn.style.background = "#10b981";
    audioIcon.innerText = "🔊";
    audioText.innerText = "အသံဖိုင် ပြန်ဖွင့်မည်";
  });
}

function handleFormatChange() {
  const format = document.getElementById("story-format").value;
  document.getElementById("story-btn-text").innerText = format === "series" ? "📺 ဇာတ်လမ်းတွဲ (Ep 1 to 6) ဖန်တီးမည်" : "🎬 Movie (တစ်ပိုင်းတည်း) ဖန်တီးမည်";
}

async function handleGenerateStory() {
  const topic = document.getElementById("story-topic").value.trim();
  const duration = document.getElementById("story-duration").value;
  const format = document.getElementById("story-format").value;
  const genre = document.getElementById("story-genre").value;
  const voice = document.getElementById("story-voice-actor").value;
  const pContainer = document.getElementById("story-progress-container");
  const pBar = document.getElementById("story-progress-bar");
  const pPercent = document.getElementById("story-step-percent");
  const pTitle = document.getElementById("story-step-title");
  const errorBox = document.getElementById("story-error-box");
  const resultContainer = document.getElementById("story-result-container");
  const generateBtn = document.getElementById("story-generate-btn");

  if (!topic) return alert("ဇာတ်လမ်းခေါင်းစဉ် ရိုက်ထည့်ပေးပါ");

  currentStoryVoice = voice;
  errorBox.style.display = "none";
  resultContainer.style.display = "none";
  generateBtn.disabled = true;
  generateBtn.style.opacity = "0.5";
  pContainer.style.display = "block";

  let pct = 15;
  pBar.style.width = `${pct}%`;
  pPercent.innerText = `${pct}%`;
  pTitle.innerText = "AI ဇာတ်လမ်း ဖွဲ့စည်းရေးသားနေပါသည်...";

  storyProgressInterval = setInterval(() => {
    if (pct < 85) {
      pct += 10;
      pBar.style.width = `${pct}%`;
      pPercent.innerText = `${pct}%`;
    }
  }, 800);

  try {
    const response = await fetch("/api/generate-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, format, genre, voice, durationMinutes: duration })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "ဇာတ်လမ်း ထုတ်လုပ်မှု မအောင်မြင်ပါ");

    clearInterval(storyProgressInterval);
    pBar.style.width = "100%";
    pPercent.innerText = "100%";
    pTitle.innerText = "ဇာတ်လမ်း အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ!";

    setTimeout(() => { pContainer.style.display = "none"; }, 1000);
    resultContainer.style.display = "flex";

    if (format === "series") {
      storySeriesData = data.series;
      document.getElementById("series-ep-buttons").style.display = "grid";
      document.getElementById("story-main-title").innerText = storySeriesData.series_title || topic;
      document.getElementById("story-format-badge").innerText = `အခန်းဆက် ၆ ပိုင်း (${duration} မိနစ်စာ)`;
      selectEpisode(1);
    } else {
      storySeriesData = null;
      document.getElementById("series-ep-buttons").style.display = "none";
      document.getElementById("story-main-title").innerText = data.movie_title || topic;
      document.getElementById("story-format-badge").innerText = `ရုပ်ရှင် (${duration} မိနစ်စာ)`;
      document.getElementById("current-story-label").innerText = "🎬 ရုပ်ရှင် ဇာတ်လမ်းစာသား";
      document.getElementById("story-script-text").value = data.story_text;
    }

  } catch (err) {
    clearInterval(storyProgressInterval);
    pContainer.style.display = "none";
    errorBox.style.display = "block";
    errorBox.innerText = `❌ Error: ${err.message}`;
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
    btn.style.background = (i === epNum) ? "#38bdf8" : "#1e293b";
    btn.style.color = (i === epNum) ? "#000" : "#fff";
  }

  const epData = storySeriesData.episodes[epNum - 1];
  document.getElementById("current-story-label").innerText = epData.title || `အပိုင်း ${epNum}`;
  document.getElementById("story-script-text").value = epData.text;

  const audioPlayer = document.getElementById("story-audio-player");
  audioPlayer.pause();
  audioPlayer.style.display = epData.audioBase64 ? "block" : "none";
  if (epData.audioBase64) {
    audioPlayer.src = URL.createObjectURL(new Blob([Uint8Array.from(atob(epData.audioBase64), c => c.charCodeAt(0))], { type: "audio/mp3" }));
  }
}

async function playCurrentStoryAudio() {
  const audioPlayer = document.getElementById("story-audio-player");
  const audioBtn = document.getElementById("ep-audio-btn");
  const audioIcon = document.getElementById("audio-btn-icon");
  const audioText = document.getElementById("audio-btn-text");
  const format = document.getElementById("story-format").value;

  const textToRead = format === "series" ? storySeriesData.episodes[currentEpNumber - 1].text : document.getElementById("story-script-text").value;

  if (format === "series" && storySeriesData.episodes[currentEpNumber - 1].audioBase64) {
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
        scriptText: textToRead,
        voice: currentStoryVoice
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    if (format === "series") storySeriesData.episodes[currentEpNumber - 1].audioBase64 = data.audioBase64;
    audioPlayer.src = URL.createObjectURL(new Blob([Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0))], { type: "audio/mp3" }));
    audioPlayer.style.display = "block";
    audioPlayer.play();

  } catch (err) {
    alert("အသံဖန်တီးမှု မအောင်မြင်ပါ: " + err.message);
    audioIcon.innerText = "🔊";
    audioText.innerText = "အသံဖွင့်မည်";
  } finally {
    audioBtn.disabled = false;
  }
}
