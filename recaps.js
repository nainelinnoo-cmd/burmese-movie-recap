async function handleGenerateRecap() {
  const fileInput = document.getElementById("recap-video-file");
  const voice = document.getElementById("recap-voice-actor").value;
  const tone = document.getElementById("recap-tone").value;
  const errorBox = document.getElementById("recap-error-box");
  const resultBox = document.getElementById("recap-result-box");
  const scriptText = document.getElementById("recap-script-text");
  const videoPlayer = document.getElementById("recap-video-player");
  const subOverlay = document.getElementById("draggable-subtitle");
  const generateBtn = document.getElementById("recap-generate-btn");
  const pContainer = document.getElementById("recap-progress-container");
  const pBar = document.getElementById("recap-progress-bar");
  const pPercent = document.getElementById("recap-step-percent");
  const pTitle = document.getElementById("recap-step-title");

  if (!fileInput.files || fileInput.files.length === 0) return alert("ဗီဒီယိုဖိုင် ရွေးချယ်ပေးပါ");

  const file = fileInput.files[0];
  errorBox.style.display = "none";
  resultBox.style.display = "none";
  generateBtn.disabled = true;
  generateBtn.style.opacity = "0.5";
  pContainer.style.display = "block";

  try {
    pTitle.innerText = "ဗီဒီယိုအသံ ချုံ့ယူနေပါသည်...";
    pPercent.innerText = "25%";
    pBar.style.width = "25%";

    const { audioBase64, duration } = await extractAudioOptimized(file);

    // Step 1: STT + Gemini Flash ဖြင့် Script ထုတ်ယူခြင်း (အမြန်ဆုံး ပြီးမည်)
    pTitle.innerText = "Gemini Flash က Recap ဇာတ်လမ်း ရေးသားနေပါသည်...";
    pPercent.innerText = "55%";
    pBar.style.width = "55%";

    const scriptRes = await fetch("/api/generate-recap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioBase64, tone, videoDuration: Math.round(duration) }),
    });

    const scriptData = await scriptRes.json();
    if (!scriptRes.ok) throw new Error(scriptData.error || "Recap စာသား ရေးသားမှု မအောင်မြင်ပါ");

    const recapScript = scriptData.script;
    scriptText.value = recapScript;

    // Step 2: Story Creator ကဲ့သို့ အသံဖိုင်ကို သီးခြားထုတ်ယူခြင်း (Timeout လုံးဝ မဖြစ်စေပါ)
    pTitle.innerText = "မြန်မာ အသံသရုပ်ဆောင် အသံဖိုင် ဖန်တီးနေပါသည်...";
    pPercent.innerText = "80%";
    pBar.style.width = "80%";

    const audioRes = await fetch("/api/generate-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fetchAudioOnly: true,
        scriptText: recapScript,
        voice: voice
      })
    });

    const audioData = await audioRes.json();
    if (!audioRes.ok) throw new Error(audioData.error || "အသံဖိုင် ထုတ်ယူမှု မအောင်မြင်ပါ");

    pPercent.innerText = "100%";
    pBar.style.width = "100%";
    pTitle.innerText = "အားလုံး အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ!";
    resultBox.style.display = "flex";

    const audioBlob = new Blob([Uint8Array.from(atob(audioData.audioBase64), c => c.charCodeAt(0))], { type: "audio/mp3" });
    if (currentRecapAudio) currentRecapAudio.pause();
    currentRecapAudio = new Audio(URL.createObjectURL(audioBlob));

    videoPlayer.src = URL.createObjectURL(file);
    videoPlayer.volume = document.getElementById("vol-video-slider").value / 100;
    currentRecapAudio.volume = document.getElementById("vol-ai-slider").value / 100;

    currentRecapAudio.onloadedmetadata = () => {
      const realAudioDuration = currentRecapAudio.duration || duration;
      const accurateSrt = generateAccurateSrt(recapScript, realAudioDuration);
      window.currentSrtRaw = accurateSrt;
      document.getElementById("srt-edit-textarea").value = accurateSrt;
      recapSrtCues = parseSrtCues(accurateSrt);
    };

    videoPlayer.ontimeupdate = () => {
      if (!isSrtVisible) return;
      const curr = videoPlayer.currentTime;
      const cue = recapSrtCues.find(c => curr >= c.start && curr <= c.end);
      subOverlay.innerText = cue ? cue.text : "";

      if (Math.abs(videoPlayer.currentTime - currentRecapAudio.currentTime) > 0.3) {
        currentRecapAudio.currentTime = videoPlayer.currentTime;
      }
      if (currentBgmAudio && Math.abs(videoPlayer.currentTime - currentBgmAudio.currentTime) > 0.4) {
        currentBgmAudio.currentTime = videoPlayer.currentTime % currentBgmAudio.duration;
      }
    };

    videoPlayer.onplay = () => {
      currentRecapAudio.play();
      if (currentBgmAudio) currentBgmAudio.play();
    };

    videoPlayer.onpause = () => {
      currentRecapAudio.pause();
      if (currentBgmAudio) currentBgmAudio.pause();
    };

    videoPlayer.onseeking = () => {
      currentRecapAudio.currentTime = videoPlayer.currentTime;
      if (currentBgmAudio) currentBgmAudio.currentTime = videoPlayer.currentTime % currentBgmAudio.duration;
    };

  } catch (err) {
    pContainer.style.display = "none";
    errorBox.style.display = "block";
    errorBox.innerHTML = `<b>❌ Error:</b> ${err.message}`;
  } finally {
    generateBtn.disabled = false;
    generateBtn.style.opacity = "1";
  }
}
