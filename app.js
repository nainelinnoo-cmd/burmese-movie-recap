import { FFmpeg } from "https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js";
import { fetchFile } from "https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js";

const ffmpeg = new FFmpeg();
const videoInput = document.getElementById("videoInput");
const processBtn = document.getElementById("processBtn");
const status = document.getElementById("status");
const scriptBox = document.getElementById("scriptBox");
const outputVideo = document.getElementById("outputVideo");

processBtn.addEventListener("click", async () => {
  const file = videoInput.files[0];
  if (!file) return alert("ဗီဒီယိုဖိုင် ရွေးချယ်ပေးပါ");

  status.innerText = "FFmpeg Core Load လုပ်နေပါသည်...";
  if (!ffmpeg.loaded) await ffmpeg.load();

  status.innerText = "ဗီဒီယိုမှ အသံဖိုင် သီးသန့် ခွဲထုတ်နေပါသည်...";
  await ffmpeg.writeFile("input.mp4", await fetchFile(file));
  await ffmpeg.exec(["-i", "input.mp4", "-vn", "-ar", "16000", "-ac", "1", "-b:a", "32k", "audio.mp3"]);
  
  const audioData = await ffmpeg.readFile("audio.mp3");
  const audioBlob = new Blob([audioData.buffer], { type: "audio/mp3" });
  
  const reader = new FileReader();
  reader.readAsDataURL(audioBlob);
  reader.onloadend = async () => {
    const audioBase64 = reader.result.split(",")[1];

    status.innerText = "မြန်မာ Recap Script နှင့် Voiceover ဖန်တီးနေပါသည်...";
    const res = await fetch("/.netlify/functions/generate-recap", {
      method: "POST",
      body: JSON.stringify({ audioBase64 }),
    });
    const result = await res.json();
    
    scriptBox.innerText = result.script;
    scriptBox.classList.remove("hidden");

    status.innerText = "ဗီဒီယိုနှင့် မြန်မာအသံ ပေါင်းစပ်နေပါသည်...";
    const voiceoverBuffer = Uint8Array.from(atob(result.voiceoverBase64), c => c.charCodeAt(0));
    await ffmpeg.writeFile("voice.mp3", voiceoverBuffer);

    await ffmpeg.exec([
      "-i", "input.mp4",
      "-i", "voice.mp3",
      "-filter_complex", "[0:a]volume=0.2[bg];[1:a]volume=1.2[tts];[bg][tts]amix=inputs=2:duration=first[aout]",
      "-map", "0:v",
      "-map", "[aout]",
      "-c:v", "copy",
      "-c:a", "aac",
      "final_recap.mp4"
    ]);

    const finalData = await ffmpeg.readFile("final_recap.mp4");
    outputVideo.src = URL.createObjectURL(new Blob([finalData.buffer], { type: "video/mp4" }));
    outputVideo.classList.remove("hidden");
    status.innerText = "ဗီဒီယို အောင်မြင်စွာ ထွက်ရှိပါပြီ!";
  };
});
