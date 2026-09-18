let storySeriesData = null;
let currentEpNumber = 1;
let currentStoryVoice = "edge-thiha";

function initStoryView() {
  const container = document.getElementById("view-story");
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      <div class="card">
        <label>📖 ဇာတ်လမ်း ခေါင်းစဉ် (သို့) Topic</label>
        <input type="text" id="story-topic" placeholder="ဥပမာ- သုသာန်ဟောင်းထဲက အသံမဲ့ခြေရာများ" />
      </div>

      <!-- Row 1: ပုံစံ (Movie/Series) နှင့် ဇာတ်လမ်းအမျိုးအစား -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-items: start;">
        <div>
          <label style="height: 20px; line-height: 20px; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">🎬 ဇာတ်လမ်းပုံစံ</label>
          <select id="story-format" onchange="handleFormatChange()" style="height: 44px; margin-bottom: 0;">
            <option value="movie">🎬 Movie (တစ်ပိုင်းတည်း)</option>
            <option value="series">📺 Series (ဇာတ်လမ်းတွဲ)</option>
          </select>
        </div>
        <div>
          <label style="height: 20px; line-height: 20px; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">🎭 ဇာတ်လမ်းအမျိုးအစား</label>
          <select id="story-genre" style="height: 44px; margin-bottom: 0;">
            <option value="horror">👻 သရဲ / ထိတ်လန့်ဖွယ်</option>
            <option value="mystery">🔍 လျှို့ဝှက်သည်းဖို</option>
            <option value="drama">💔 ရင်နင့်ဖွယ် ဘဝဇာတ်လမ်း</option>
            <option value="motivation">💪 စိတ်ဓာတ်ခွန်အား</option>
            <option value="funny">😂 ဟာသဇာတ်လမ်း</option>
          </select>
        </div>
      </div>

      <!-- Row 2: အသံသရုပ်ဆောင် ရွေးချယ်မှု -->
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
        <span id="story-btn-text">🎬 Movie (တစ်ပိုင်းတည်း) ဖန်တီးမည်</span>
      </button>

      <div id="story-status" style="display: none; text-align: center; font-size: 0.9rem; font-weight: bold; color: #38bdf8; padding: 10px;"></div>

      <!-- Result Container -->
      <div id="story-result-container" style="display: none; flex-direction: column; gap: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span id="story-main-title" style="font-size: 0.95rem; font-weight: bold; color: #38bdf8;"></span>
          <span id="story-format-badge" style="font-size: 0.75rem; color: #94a3b8;"></span>
        </div>

        <!-- Series ဖြစ်ပါက ပေါ်လာမည့် Episode 1-6 Buttons -->
        <div id="series-ep-buttons" style="display: none; grid-template-columns: repeat(6, 1fr); gap: 6px;">
          <button onclick="selectEpisode(1)" id="btn-ep-1" class="ep-btn" style="padding: 10px 0; border-radius: 8px; border: 1px solid #334155; background: #38bdf8; color: #000; font-weight: bold; cursor: pointer;">Ep 1</button>
          <button onclick="selectEpisode(2)" id="btn-ep-2" class="ep-btn" style="padding: 10px 0; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: #fff; font-weight: bold; cursor: pointer;">Ep 2</button>
          <button onclick="selectEpisode(3)" id="btn-ep-3" class="ep-btn" style="padding: 10px 0; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: #fff; font-weight: bold; cursor: pointer;">Ep 3</button>
          <button onclick="selectEpisode(4)" id="btn-ep-4" class="ep-btn" style="padding: 10px 0; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: #fff; font-weight: bold; cursor: pointer;">Ep 4</button>
          <button onclick="selectEpisode(5)" id="btn-ep-5" class="ep-btn" style="padding: 10px 0; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: #fff; font-weight: bold; cursor: pointer;">Ep 5</button>
          <button onclick="selectEpisode(6)" id="btn-ep-6" class="ep-btn" style="padding: 10px 0; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: #fff; font-weight: bold; cursor: pointer;">Ep 6</button>
        </div>

        <!-- စာသားပြသရာ Box -->
        <div class="card" style="margin-top: 4px;">
          <label id="current-story-label" style="color: #facc15;">ထုတ်လုပ်ထားသော ဇာတ်လမ်းစာသား</label>
          <textarea id="story-script-text" rows="8"></textarea>
        </div>

        <!-- အသံဖွင့်စက် -->
        <button id="ep-audio-btn" onclick="playCurrentStoryAudio()" class="btn" style="background: #10b981; color: white;">
          <span id="audio-btn-text">🔊 အသံဖိုင် ဖွင့်မည်</span>
        </button>
        <audio id="story-audio-player" controls style="width: 100%; display: none; margin-top: 6px;"></audio>
      </div>
    </div>
  `;
}

// Movie / Series ရွေးချယ်မှုအလိုက် ခလုတ်စာသား ပြောင်းပေးခြင်း
function handleFormatChange() {
  const format = document.getElementById("story-format").value;
  const btnText = document.getElementById("story-btn-text");
  if (format === "series") {
    btnText.innerText = "📺 ဇာတ်လမ်းတွဲ (Ep 1 to 6) ဖန်တီးမည်";
  } else {
    btnText.innerText = "🎬 Movie (တစ်ပိုင်းတည်း) ဖန်တီးမည်";
  }
}

async function handleGenerateStory() {
  const topic = document.getElementById("story-topic").value.trim();
  const format = document.getElementById("story-format").value;
  const genre = document.getElementById("story-genre").value;
  const voice = document.getElementById("story-voice-actor").value;
  const statusEl = document.getElementById("story-status");
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
  statusEl.style.display = "block";
  statusEl.innerText = format === "series"
    ? "⏳ AI က အခန်းဆက် ၆ ပိုင်းလုံးကို ဇာတ်လမ်းဖွဲ့စည်းနေပါသည်..."
    : "⏳ AI က ရုပ်ရှင်ဇာတ်လမ်း တစ်ပုဒ်လုံးကို ဖန်တီးနေပါသည်...";

  try {
    const response = await fetch("/api/generate-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, format, genre, voice })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "ဇာတ်လမ်းဖန်တီးမှု မအောင်မြင်ပါ");

    statusEl.innerText = "🎉 ဇာတ်လမ်း အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ!";
    resultContainer.style.display = "flex";

    if (format === "series") {
      // Series စနစ်
      storySeriesData = data.series;
      epButtonsBox.style.display = "grid";
      document.getElementById("story-main-title").innerText = storySeriesData.series_title || topic;
      document.getElementById("story-format-badge").innerText = "အခန်းဆက် ၆ ပိုင်း";
      
      if (data.initialAudioBase64) {
        storySeriesData.episodes[0].audioBase64 = data.initialAudioBase64;
      }
      selectEpisode(1);
    } else {
      // Movie (တစ်ပိုင်းတည်း) စနစ်
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
        audioPlayer.style.display = "block";
      }
    }

  } catch (err) {
    statusEl.innerText = `❌ Error: ${err.message}`;
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
    audioPlayer.style.display = "block";
  } else {
    audioPlayer.style.display = "none";
  }
}

async function playCurrentStoryAudio() {
  const audioPlayer = document.getElementById("story-audio-player");
  const audioBtn = document.getElementById("ep-audio-btn");
  const format = document.getElementById("story-format").value;

  if (format === "series") {
    const epData = storySeriesData.episodes[currentEpNumber - 1];
    if (epData.audioBase64) {
      audioPlayer.style.display = "block";
      audioPlayer.play();
      return;
    }

    audioBtn.disabled = true;
    audioBtn.innerText = "⏳ အသံဖိုင် ဖန်တီးနေပါသည်...";

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
      audioPlayer.style.display = "block";
      audioPlayer.play();

    } catch (err) {
      alert("အသံဖန်တီးမှု မအောင်မြင်ပါ: " + err.message);
    } finally {
      audioBtn.disabled = false;
      audioBtn.innerText = "🔊 ဤ Episode အသံကို ဖွင့်မည်";
    }
  } else {
    // Movie Audio
    if (audioPlayer.src) {
      audioPlayer.style.display = "block";
      audioPlayer.play();
    }
  }
}
