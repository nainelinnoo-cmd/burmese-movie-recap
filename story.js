function initStoryView() {
  const container = document.getElementById("view-story");
  container.innerHTML = `
    <div class="space-y-4">
      <div class="p-4 bg-gray-800/60 rounded-xl border border-gray-700">
        <label class="block text-sm font-semibold mb-2 text-gray-300">ဇာတ်လမ်း ခေါင်းစဉ် (သို့) အကြောင်းအရာ</label>
        <input type="text" id="story-topic" placeholder="ဥပမာ- ရွာစွန်က တစ္ဆေခြောက်တဲ့ အိမ်ဟောင်းကြီး" class="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500" />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-gray-400 mb-1">အသံသရုပ်ဆောင်</label>
          <select id="story-voice-actor" class="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500">
            <option value="my-MM-ThihaNeural">သီဟ (အမျိုးသား)</option>
            <option value="my-MM-NilarNeural">နီလာ (အမျိုးသမီး)</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">ဇာတ်လမ်းအမျိုးအစား</label>
          <select id="story-genre" class="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500">
            <option value="horror">သရဲ / ထိတ်လန့်ဖွယ်</option>
            <option value="motivation">စိတ်ဓာတ်ခွန်အားဖြည့်</option>
            <option value="fairy">ပုံပြင် / ဒဏ္ဍာရီ</option>
          </select>
        </div>
      </div>

      <button id="story-generate-btn" onclick="handleGenerateStory()" class="w-full py-3 bg-sky-600 hover:bg-sky-500 font-bold rounded-xl text-white transition flex justify-center items-center gap-2">
        <i class="fa-solid fa-pen-nib"></i> ဇာတ်လမ်းနှင့် အသံထုတ်မည်
      </button>

      <div id="story-status" class="hidden text-center text-sm font-semibold text-yellow-400"></div>

      <div id="story-result-box" class="hidden space-y-3">
        <div class="p-3 bg-gray-900 border border-gray-700 rounded-lg">
          <label class="block text-xs text-gray-400 mb-1">ထုတ်လုပ်ထားသော ဇာတ်လမ်း</label>
          <textarea id="story-script-text" rows="5" class="w-full bg-transparent text-sm text-gray-200 resize-none focus:outline-none"></textarea>
        </div>

        <audio id="story-audio-player" controls class="w-full mt-2"></audio>
      </div>
    </div>
  `;
}

async function handleGenerateStory() {
  const topic = document.getElementById("story-topic").value.trim();
  const voice = document.getElementById("story-voice-actor").value;
  const genre = document.getElementById("story-genre").value;
  const statusEl = document.getElementById("story-status");
  const resultBox = document.getElementById("story-result-box");
  const scriptText = document.getElementById("story-script-text");
  const audioPlayer = document.getElementById("story-audio-player");

  if (!topic) {
    alert("ဇာတ်လမ်းခေါင်းစဉ် ရိုက်ထည့်ပေးပါ");
    return;
  }

  statusEl.classList.remove("hidden");
  statusEl.innerText = "⏳ AI ဇာတ်လမ်းရေးဖွဲ့ပြီး အသံဖန်တီးနေပါသည်...";

  try {
    const response = await fetch("/api/generate-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, voice, genre })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "ဇာတ်လမ်း ထုတ်လုပ်မှု မအောင်မြင်ပါ");

    statusEl.innerText = "🎉 ဇာတ်လမ်းနှင့် အသံ အောင်မြင်စွာ ရရှိပါပြီ!";
    resultBox.classList.remove("hidden");
    scriptText.value = data.storyText;

    const audioBlob = new Blob([Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0))], { type: "audio/mp3" });
    audioPlayer.src = URL.createObjectURL(audioBlob);
    audioPlayer.play();

  } catch (err) {
    statusEl.innerText = `❌ အမှားဖြစ်ပေါ်ပါသည်: ${err.message}`;
  }
}
