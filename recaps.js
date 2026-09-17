function initRecapsView() {
  const container = document.getElementById("view-recaps");
  container.innerHTML = `
    <div class="space-y-4">
      <div class="p-4 bg-gray-800/60 rounded-xl border border-gray-700">
        <label class="block text-sm font-semibold mb-2 text-gray-300">ရုပ်ရှင် ဗီဒီယိုအပိုင်း တင်ပါ</label>
        <input type="file" id="recap-video-file" accept="video/*" class="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-500" />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-gray-400 mb-1">အသံသရုပ်ဆောင်</label>
          <select id="recap-voice-actor" class="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500">
            <option value="my-MM-ThihaNeural">သီဟ (အမျိုးသား)</option>
            <option value="my-MM-NilarNeural">နီလာ (အမျိုးသမီး)</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Recap စတိုင်</label>
          <select id="recap-tone" class="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500">
            <option value="funny">ဟာသ / ဆယ်လီစတိုင်</option>
            <option value="dramatic">စိတ်လှုပ်ရှားဖွယ် ဇာတ်လမ်း</option>
            <option value="concise">ရှင်းလင်း အနှစ်ချုပ်</option>
          </select>
        </div>
      </div>

      <button id="recap-generate-btn" onclick="handleGenerateRecap()" class="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl text-white transition flex justify-center items-center gap-2">
        <i class="fa-solid fa-play"></i> Recap ဗီဒီယို ဖန်တီးမည်
      </button>

      <div id="recap-status" class="hidden text-center text-sm font-semibold text-yellow-400"></div>

      <div id="recap-result-box" class="hidden space-y-3">
        <div class="p-3 bg-gray-900 border border-gray-700 rounded-lg">
          <label class="block text-xs text-gray-400 mb-1">ထုတ်လုပ်ထားသော Recap စာသား</label>
          <textarea id="recap-script-text" rows="4" class="w-full bg-transparent text-sm text-gray-200 resize-none focus:outline-none"></textarea>
        </div>

        <video id="recap-video-player" controls class="w-full rounded-xl border border-gray-700 aspect-video bg-black"></video>
      </div>
    </div>
  `;
}

async function handleGenerateRecap() {
  const fileInput = document.getElementById("recap-video-file");
  const voice = document.getElementById("recap-voice-actor").value;
  const tone = document.getElementById("recap-tone").value;
  const statusEl = document.getElementById("recap-status");
  const resultBox = document.getElementById("recap-result-box");
  const scriptText = document.getElementById("recap-script-text");
  const videoPlayer = document.getElementById("recap-video-player");

  if (!fileInput.files || fileInput.files.length === 0) {
    alert("ဗီဒီယိုဖိုင် ရွေးချယ်ပေးပါ");
    return;
  }

  const file = fileInput.files[0];
  statusEl.classList.remove("hidden");
  statusEl.innerText = "⏳ လုပ်ဆောင်နေပါသည်... စောင့်ဆိုင်းပေးပါ";

  try {
    // ဗီဒီယိုမှ Base64 ပြောင်းခြင်း
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const response = await fetch("/api/generate-recap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audioBase64: base64Data,
        voice: voice,
        tone: tone
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "ဖန်တီးမှု မအောင်မြင်ပါ");

    statusEl.innerText = "🎉 Recap ဗီဒီယို အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ!";
    resultBox.classList.remove("hidden");
    scriptText.value = data.script;

    // အသံနှင့် ဗီဒီယို ချိန်ဆက်ပြသခြင်း
    const audioBlob = new Blob([Uint8Array.from(atob(data.voiceoverBase64), c => c.charCodeAt(0))], { type: "audio/mp3" });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    videoPlayer.src = URL.createObjectURL(file);
    videoPlayer.onplay = () => audio.play();
    videoPlayer.onpause = () => audio.pause();
    videoPlayer.onseeking = () => { audio.currentTime = videoPlayer.currentTime; };

  } catch (err) {
    statusEl.innerText = `❌ အမှားဖြစ်ပေါ်ပါသည်: ${err.message}`;
  }
}
