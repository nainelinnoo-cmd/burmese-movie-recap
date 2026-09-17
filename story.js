let storySeriesData = null;
let currentEpNumber = 1;
let currentStoryVoice = "edge-thiha";

function initStoryView() {
  const container = document.getElementById("view-story");
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      <div class="card">
        <label>📖 ဇာတ်လမ်းတွဲ ခေါင်းစဉ် (သို့) Topic</label>
        <input type="text" id="story-topic" placeholder="ဥပမာ- သုသာန်ဟောင်းထဲက အသံမဲ့ခြေရာများ" />
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label>🗣️ အသံသရုပ်ဆောင်</label>
          <select id="story-voice-actor">
            <option value="edge-thiha">သီဟ (အမျိုးသား)</option>
            <option value="edge-nilar">နီလာ (အမျိုးသမီး)</option>
          </select>
        </div>
        <div>
          <label>🎭 ဇာတ်လမ်းအမျိုးအစား</label>
          <select id="story-genre">
            <option value="horror">👻 သရဲ / ထိတ်လန့်ဖွယ်</option>
            <option value="mystery">🔍 လျှို့ဝှက်သည်းဖို</option>
            <option value="drama">💔 ရင်နင့်ဖွယ် ဘဝဇာတ်လမ်း</option>
            <option value="motivation">💪 စိတ်ဓာတ်ခွန်အား</option>
          </select>
        </div>
      </div>

      <button id="story-generate-btn" onclick="handleGenerateStorySeries()" class="btn btn-story">
        <span>✨ ဇာတ်လမ်းတွဲ (Ep 1 to 6) ဖန်တီးမည်</span>
      </button>

      <div id="story-status" style="display: none; text-align: center; font-size: 0.9rem; font-weight: bold; color: #38bdf8; padding: 10px;"></div>

      <!-- Episode 1-6 Navigation Buttons Container -->
      <div id="story-episodes-container" style="display: none; flex-direction: column; gap: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span id="series-main-title" style="font-size: 0.95rem; font-weight: bold; color: #38bdf8;"></span>
          <span style="font-size: 0.75rem; color: #94a3b8;">အခန်းဆက် ၆ ပိုင်း</span>
        </div>

        <!-- 6 Episodes Buttons -->
        <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px;">
          <button onclick="selectEpisode(1)" id="btn-ep-1" class="ep-btn" style="padding: 10px 0; border-radius: 8px; border: 1px solid #334155; background: #38bdf8; color: #000; font-weight: bold; cursor: pointer;">Ep 1</button>
          <button onclick="selectEpisode(2)" id="btn-ep-2" class="ep-btn" style="padding: 10px 0; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: #fff; font-weight: bold; cursor: pointer;">Ep 2</button>
          <button onclick="selectEpisode(3)" id="btn-ep-3" class="ep-btn" style="padding: 10px 0; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: #fff; font-weight: bold; cursor: pointer;">Ep 3</button>
          <button onclick="selectEpisode(4)" id="btn-ep-4" class="ep-btn" style="padding: 10px 0; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: #fff; font-weight: bold; cursor: pointer;">Ep 4</button>
          <button onclick="selectEpisode(5)" id="btn-ep-5" class="ep-btn" style="padding: 10px 0; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: #fff; font-weight: bold; cursor: pointer;">Ep 5</button>
          <button onclick="selectEpisode(6)" id="btn-ep-6" class="ep-btn" style="padding: 10px 0; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: #fff; font-weight: bold; cursor: pointer;">Ep 6</button>
        </div>

        <!-- စာသားပြသရာ Box -->
        <div class="card" style="margin-top: 6px;">
          <label id="current-ep-label" style="color: #facc15;">အပိုင်း ၁ ဇာတ်လမ်းစာသား</label>
          <textarea id="story-script-text" rows="7"></textarea>
        </div>

        <!-- အသံဖွင့်စက် နှင့် အသံထုတ်ခလုတ် -->
        <button id="ep-audio-btn" onclick="playCurrentEpAudio()" class="btn" style="background: #10b981; color: white;">
          <span>🔊 ဤ Episode အသံကို ဖွင့်မည်</span>
        </button>
        <audio id="story-audio-player" controls style="width: 100%; display: none; margin-top: 6px;"></audio>
      </div>
    </div>
  `;
}

async function handleGenerateStorySeries() {
  const topic = document.getElementById("story-topic").value.trim();
  const voice = document.getElementById("story-voice-actor").value;
  const genre = document.getElementById("story-genre").value;
  const statusEl = document.getElementById("story-status");
  const episodesContainer = document.getElementById("story-episodes-container");
  const generateBtn = document.getElementById("story-generate-btn");

  if (!topic) {
    alert("ဇာတ်လမ်းခေါင်းစဉ် ရိုက်ထည့်ပေးပါ");
    return;
  }

  currentStoryVoice = voice;
  generateBtn.disabled = true;
  generateBtn.style.opacity = "0.5";
  statusEl.style.display = "block";
  statusEl.innerText = "⏳ AI က အခန်းဆက် ၆ ပိုင်းလုံးကို ဇာတ်လမ်းဖွဲ့စည်းနေပါသည်...";

  try {
    const response = await fetch("/api/generate-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, genre, voice })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "ဇာတ်လမ်းတွဲ မအောင်မြင်ပါ");

    storySeriesData = data.series;
    statusEl.innerText = "🎉 အခန်းဆက် ၆ ပိုင်းလုံး အောင်မြင်စွာ ရရှိပါပြီ!";
    episodesContainer.style.display = "flex";

    document.getElementById("series-main-title").innerText = storySeriesData.series_title || topic;
    
    // Episode 1 ကို စတင်ရွေးချယ်ပြသခြင်း
    selectEpisode(1);

    // Initial Audio သိမ်းဆည်းခြင်း
    if (data.initialAudioBase64) {
      storySeriesData.episodes[0].audioBase64 = data.initialAudioBase64;
    }

  } catch (err) {
    statusEl.innerText = `❌ Error: ${err.message}`;
  } finally {
    generateBtn.disabled = false;
    generateBtn.style.opacity = "1";
  }
}

// Button Click ဖြင့် Episode ကူးပြောင်းခြင်း
function selectEpisode(epNum) {
  if (!storySeriesData || !storySeriesData.episodes) return;
  currentEpNumber = epNum;

  // Buttons Style ပြောင်းခြင်း
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
  document.getElementById("current-ep-label").innerText = `${epData.title || `အပိုင်း ${epNum}`}`;
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

// သက်ဆိုင်ရာ Episode အသံထုတ်ယူခြင်း
async function playCurrentEpAudio() {
  const epData = storySeriesData.episodes[currentEpNumber - 1];
  const audioPlayer = document.getElementById("story-audio-player");
  const audioBtn = document.getElementById("ep-audio-btn");

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
}
