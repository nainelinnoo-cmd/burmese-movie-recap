import { FFmpeg } from "https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/+esm";
import { fetchFile, toBlobURL } from "https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/+esm";

const ffmpeg = new FFmpeg();
const videoInput = document.getElementById("videoInput");
const processBtn = document.getElementById("processBtn");
const status = document.getElementById("status");
const scriptBox = document.getElementById("scriptBox");
const outputVideo = document.getElementById("outputVideo");

// ၁။ ဒေါင်းလုဒ် ရာခိုင်နှုန်း (%) ပြသပေးသည့် Function
async function fetchWithProgress(url, mimeType, label) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download မအောင်မြင်ပါ: ${response.status}`);

  const contentLength = response.headers.get("content-length");
  const total = contentLength ? parseInt(contentLength, 10) : 31457280;
  let loaded = 0;

  const reader = response.body.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;

    const percent = Math.min(100, Math.round((loaded / total) * 100));
    const loadedMB = (loaded / (1024 * 1024)).toFixed(1);
    const totalMB = (total / (1024 * 1024)).toFixed(1);
    status.innerText = `📥 ${label}: ${percent}% (${loadedMB}MB / ${totalMB}MB)...`;
  }

  const blob = new Blob(chunks, { type: mimeType });
  return URL.createObjectURL(blob);
}

processBtn.addEventListener("click", async () => {
  const file = videoInput.files[0];
  if (!file) return alert("ဗီဒီယိုဖိုင် ရွေးချယ်ပေးပါ");

  try {
    processBtn.disabled = true;

    if (!ffmpeg.loaded) {
      const baseURL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";
      const ffmpegWorkerSrc = "https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/worker.js";

      // Worker ပြင်ဆင်ခြင်း
      status.innerText = "FFmpeg Worker စနစ်ကို ပြင်ဆင်နေပါသည်...";
      const workerBlob = new Blob([`import "${ffmpegWorkerSrc}";`], { type: "text/javascript" });
      const classWorkerURL = URL.createObjectURL(workerBlob);

      const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript");
      const wasmURL = await fetchWithProgress(
        `${baseURL}/ffmpeg-core.wasm`,
        "application/wasm",
        "FFmpeg Core ဖိုင်အား ဒေါင်းလုဒ်ဆွဲနေပါသည်"
      );

      // ၂။ Core Run သည့်အခါ % တက်ပြပေးသည့် စနစ် (Simulated Progress)
      let runPercent = 10;
      status.innerText = `⚙️ FFmpeg Core စတင် Run နေပါသည်: ${runPercent}%...`;

      const runInterval = setInterval(() => {
        if (runPercent < 90) {
          runPercent += Math.floor(Math.random() * 12) + 8;
          if (runPercent > 90) runPercent = 90;
          status.innerText = `⚙️ FFmpeg Core စတင် Run နေပါသည်: ${runPercent}%...`;
        }
      }, 500);

      try {
        await ffmpeg.load({ coreURL, wasmURL, classWorkerURL });
        clearInterval(runInterval);
        status.innerText = `⚙️ FFmpeg Core စတင် Run ခြင်း ပြီးစီးပါပြီ: 100%!`;
      } catch (loadErr) {
        clearInterval(runInterval);
        throw new Error("FFmpeg Core Run ခြင်း မအောင်မြင်ပါ: " + loadErr.message);
      }

      // Render % ပြသပေးရန် ချိန်ညှိခြင်း
      ffmpeg.on("progress", ({ progress }) => {
        const renderPercent = Math.round(progress * 100);
        if (renderPercent > 0 && renderPercent <= 100) {
          status.innerText = `⚙️ ဗီဒီယိုနှင့် အသံ ပေါင်းစပ်နေပါသည်: ${renderPercent}%...`;
        }
      });
    }

    // ၃။ ဗီဒီယိုမှ အသံဖိုင် ခွဲထုတ်ခြင်း
    status.innerText = "ဗီဒီယိုမှ အသံဖိုင် သီးသန့် ခွဲထုတ်နေပါသည်...";
    await ffmpeg.writeFile("input.mp4", await fetchFile(file));
    await ffmpeg.exec(["-i", "input.mp4", "-vn", "-ar", "16000", "-ac", "1", "-b:a", "32k", "audio.mp3"]);

    const audioData = await ffmpeg.readFile("audio.mp3");
    const audioBlob = new Blob([audioData.buffer], { type: "audio/mp3" });

    // ၄။ AI ထံ အသံ ပေးပို့ခြင်း
    status.innerText = "AI ဆီသို့ အသံဖိုင် ပေးပို့နေပါသည်...";
    const audioBase64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(",")[1]);
      reader.readAsDataURL(audioBlob);
    });

    // ၅။ Vercel Backend ဆီမှ မြန်မာ Script နှင့် Voiceover ရယူခြင်း
    status.innerText = "မြန်မာ Recap Script နှင့် Voiceover ဖန်တီးနေပါသည်...";
    const res = await fetch("/api/generate-recap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioBase64 }),
    });

    const result = await res.json();
    if (!res.ok || result.error) throw new Error(result.error || `Server Error: ${res.status}`);

    scriptBox.innerText = result.script;
    scriptBox.classList.remove("hidden");

    // ၆။ အသံနှင့် ဗီဒီယို ပြန်လည်ပေါင်းစပ်ခြင်း
    status.innerText = "ဗီဒီယိုနှင့် မြန်မာအသံ ပေါင်းစပ်နေပါသည် (ခဏစောင့်ပေးပါ)...";
    const voiceoverBuffer = Uint8Array.from(atob(result.voiceoverBase64), (c) => c.charCodeAt(0));
    await ffmpeg.writeFile("voice.mp3", voiceoverBuffer);

    await ffmpeg.exec([
      "-i", "input.mp4",
      "-i", "voice.mp3",
      "-filter_complex", "[0:a]volume=0.2[bg];[1:a]volume=1.2[tts];[bg][tts]amix=inputs=2:duration=first[aout]",
      "-map", "0:v",
      "-map", "[aout]",
      "-c:v", "copy",
      "-c:a", "aac",
      "final_recap.mp4",
    ]);

    // ၇။ အပြီးသတ်ဗီဒီယို ပြသခြင်း
    const finalData = await ffmpeg.readFile("final_recap.mp4");
    outputVideo.src = URL.createObjectURL(new Blob([finalData.buffer], { type: "video/mp4" }));
    outputVideo.classList.remove("hidden");
    status.innerText = "🎉 Recap ဗီဒီယို အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ!";
  } catch (err) {
    console.error(err);
    status.innerText = "⚠️ အမှားဖြစ်သွားပါသည်: " + err.message;
  } finally {
    processBtn.disabled = false;
  }
});
