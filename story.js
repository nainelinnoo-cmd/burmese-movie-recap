let storySeriesData = null;
let currentEpNumber = 1;
let currentStoryVoice = "edge-nilar";
let storyProgressInterval = null;
let currentStorySrtCues = [];
let currentStoryAudio = null;
let currentStoryBgm = null;

let storySceneImages = [];
let isStoryPlaying = false;
let storyAnimationId = null;

let isTitleActive = false;
let isWatermarkActive = false;
let isSrtVisible = true;

let srtFontSize = 18;
let srtFontColor = "#ffffff";
let srtBgStyle = "rgba(0,0,0,0.75)";
let titleFontSize = 24;
let watermarkImg = null;

function initStoryView() {
  const container = document.getElementById("view-story");
  if (!container) return;

  container.innerHTML = `
    <style>
      #story-voice-actor {
        background-color: #080e1a !important;
        border: 1.5px solid #1e3a8a !important;
        color: #38bdf8 !important;
        font-weight: 600;
        font-size: 0.85rem;
        border-radius: 8px;
        padding: 0 10px;
      }
      #story-voice-actor optgroup {
        background-color: #050913 !important;
        color: #94a3b8;
        font-weight: bold;
      }
      #story-voice-actor option {
        background-color: #080e1a !important;
        color: #f1f5f9;
        padding: 8px;
      }
    </style>

    <div style="display: flex; flex-direction: column; gap: 14px;">
      <!-- ၁။ ခေါင်းစဉ် နှင့် ပုံစံ ရွေးချယ်မှု -->
      <div class="card">
        <label>📖 ဇာတ်လမ်း ခေါင်းစဉ် (သို့) Topic</label>
        <input type="text" id="story-topic" placeholder="ဥပမာ- ရွာစွန်က သရဲမကြီး" />
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label style="height: 20px; line-height: 20px; margin-bottom: 6px; display: block;">⏱️ Ep တစ်ခု ကြာချိန်</label>
          <select id="story-duration" style="height: 44px;">
            <option value="1" selected>၁ မိနစ်</option>
            <option value="2">၂ မိနစ်</option>
            <option value="3">၃ မိနစ်</option>
          </select>
        </div>
        <div>
          <label style="height: 20px; line-height: 20px; margin-bottom: 6px; display: block;">🎬 ဇာတ်လမ်းပုံစံ</label>
          <select id="story-format" onchange="handleFormatChange()" style="height: 44px;">
            <option value="series">📺 Series (၆ ပိုင်းတွဲ)</option>
            <option value="movie">🎬 Movie (တစ်ပိုင်းတည်း)</option>
          </select>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label style="height: 20px; line-height: 20px; margin-bottom: 6px; display: block;">🎭 အမျိုးအစား</label>
          <select id="story-genre" style="height: 44px;">
            <option value="horror">👻 သရဲ / ထိတ်လန့်ဖွယ်</option>
            <option value="mystery">🔍 လျှို့ဝှက်သည်းဖို</option>
            <option value="drama">💔 ဘဝဇာတ်လမ်း</option>
            <option value="motivation">💪 စိတ်ဓာတ်ခွန်အား</option>
          </select>
        </div>
        <div>
          <label style="height: 20px; line-height: 20px; margin-bottom: 6px; display: block;">🗣️ အသံသရုပ်ဆောင်</label>
          <select id="story-voice-actor" style="height: 44px;">
            <optgroup label="Edge-TTS">
              <option value="edge-nilar" selected>👩 နီလာ (ကြည်လင်)</option>
              <option value="edge-nilar-warm">🌸 နီလာ (နွေးထွေး)</option>
              <option value="edge-thiha">👨 သီဟ (ပုံမှန်)</option>
              <option value="edge-thiha-deep">🎙️ သီဟ (ဩဇာကြီး)</option>
            </optgroup>
            <optgroup label="Google TTS">
              <option value="google-my-female">👩 Google (မ)</option>
              <option value="google-my-male">👨 Google (ကျား)</option>
            </optgroup>
          </select>
        </div>
      </div>

      <!-- ၂။ Audio Mixer (Dropdown + BGM Remove) -->
      <div class="card" style="background: #131d31; padding: 12px;">
        <div onclick="toggleStoryAudioMixerDropdown()" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
          <span style="font-size: 0.85rem; font-weight: bold; color: #38bdf8;">🎚️ အသံချိန်ညှိမှု စနစ် (Audio Mixer)</span>
          <span id="story-audio-mixer-chevron" style="color: #facc15; font-size: 0.85rem; font-weight: bold;">▼ အသံချိန်ညှိမည်</span>
        </div>

        <div id="story-audio-mixer-dropdown-content" style="display: none; flex-direction: column; gap: 10px; margin-top: 12px; border-top: 1px solid #334155; padding-top: 10px;">
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
              <span style="color: #94a3b8;">🎙️ AI ဇာတ်လမ်းပြောသံ (Voiceover)</span>
              <span id="story-vol-ai-val" style="color: #10b981; font-weight: bold;">100%</span>
            </div>
            <input type="range" id="story-vol-ai-slider" min="0" max="100" value="100" style="width: 100%; cursor: pointer;" />
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
              <span style="color: #94a3b8;">🎵 နောက်ခံ BGM တီးလုံးအသံ</span>
              <span id="story-vol-bgm-val" style="color: #facc15; font-weight: bold;">30%</span>
            </div>
            <input type="range" id="story-vol-bgm-slider" min="0" max="100" value="30" style="width: 100%; cursor: pointer;" />
          </div>

          <div>
            <label style="font-size: 0.75rem;">🎵 စိတ်ကြိုက် BGM ဖိုင် တင်ရန် (MP3/WAV)</label>
            <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
              <input type="file" id="story-bgm-file" accept="audio/*" onchange="handleStoryBgmSelect(event)" style="font-size: 0.75rem; padding: 6px; flex: 1;" />
              <button id="btn-story-remove-bgm" onclick="removeStoryBgm()" class="btn" style="display: none; width: auto; padding: 6px 12px; background: #ef4444; font-size: 0.75rem;">❌ ဖျက်မည်</button>
            </div>
          </div>
        </div>
      </div>

      <button id="story-generate-btn" onclick="handleGenerateStory()" class="btn btn-story">
        <span id="story-btn-text">📺 ဇာတ်လမ်းတွဲ (Ep 1 to 6) ဖန်တီးမည်</span>
      </button>

      <!-- Progress Container -->
      <div id="story-progress-container" style="display: none; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 14px;">
        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 6px;">
          <span id="story-step-title" style="color: #38bdf8; font-weight: bold;">စတင်နေပါသည်...</span>
          <span id="story-step-percent" style="color: #facc15; font-weight: bold;">0%</span>
        </div>
        <div style="width: 100%; height: 8px; background: #0f172a; border-radius: 6px; overflow: hidden; margin-bottom: 8px;">
          <div id="story-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #38bdf8, #10b981); transition: width 0.3s ease;"></div>
        </div>
      </div>

      <div id="story-error-box" style="display: none; background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; border-radius: 10px; padding: 12px; font-size: 0.85rem; color: #fca5a5;"></div>

      <!-- ၃။ Story Result & Motion Video Studio -->
      <div id="story-result-container" style="display: none; flex-direction: column; gap: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span id="story-main-title" style="font-size: 1rem; font-weight: bold; color: #38bdf8;"></span>
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

        <!-- ၄။ Canvas-Based 2.5D Motion Video Player Wrapper -->
        <div id="story-video-wrapper" style="position: relative; width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 12px; overflow: hidden; border: 1px solid #334155; user-select: none; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
          <canvas id="story-motion-canvas" width="1280" height="720" style="width: 100%; height: 100%; object-fit: contain; display: block;"></canvas>

          <!-- ၁။ Title Overlay -->
          <div id="draggable-story-title" style="display: none; position: absolute; top: 15px; left: 50%; transform: translateX(-50%); color: #facc15; font-weight: bold; font-size: 24px; cursor: move; z-index: 25; text-shadow: 2px 2px 4px #000; text-align: center; white-space: nowrap;">
            ဇာတ်လမ်း ခေါင်းစဉ်
          </div>

          <!-- ၂။ Subtitle Overlay (Resize Handle ↘ ပါဝင်သည်) -->
          <div id="draggable-story-subtitle" style="position: absolute; bottom: 35px; left: 50%; transform: translateX(-50%); width: 86%; text-align: center; color: #ffffff; background: rgba(0,0,0,0.75); padding: 6px 12px; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: move; z-index: 15; touch-action: none; line-height: 1.4;">
            <span id="story-subtitle-text-content">စာတန်းထိုး ပြသမည့်နေရာ</span>
            <div id="story-sub-resize-handle" style="position: absolute; right: -7px; bottom: -7px; width: 22px; height: 22px; background: #10b981; color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; cursor: nwse-resize; touch-action: none; font-weight: bold; box-shadow: 0 0 8px rgba(16,185,129,0.8); z-index: 30;">↘</div>
          </div>

          <!-- ၃။ Watermark Overlay (Resize Handle ↘ ပါဝင်သည်) -->
          <div id="draggable-story-watermark" style="display: none; position: absolute; top: 15px; right: 15px; width: 70px; height: 70px; cursor: move; z-index: 20; border: 1px dashed rgba(255,255,255,0.4); border-radius: 4px;">
            <img id="story-watermark-preview-img" src="" style="width: 100%; height: 100%; object-fit: contain; pointer-events: none;" />
            <div id="story-wm-resize-handle" style="position: absolute; right: -6px; bottom: -6px; width: 20px; height: 20px; background: #38bdf8; color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; cursor: nwse-resize; touch-action: none; font-weight: bold;">↘</div>
          </div>
        </div>

        <!-- Video Play/Pause Bar -->
        <div style="display: flex; gap: 8px; align-items: center;">
          <button id="btn-story-play-pause" onclick="toggleStoryPlayback()" class="btn" style="background: #10b981; flex: 1; padding: 12px;">
            <span id="story-play-icon">▶</span> <span id="story-play-text">Motion Video ဖွင့်မည်</span>
          </button>
          <button onclick="reloadScenePhotos()" class="btn" style="width: auto; background: #334155; padding: 12px; font-size: 0.8rem;" title="AI ဓာတ်ပုံများ ပြန်လည်ဆွဲယူရန်">
            🔄 ပုံများ ပြန်ဆွဲမည်
          </button>
        </div>

        <audio id="story-audio-element" style="display: none;"></audio>

        <!-- ၅။ Title Controls Card -->
        <div class="card" style="background: #131d31; display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.9rem; font-weight: bold; color: #38bdf8;">✏️ Video Title / စာသားထည့်ခြင်း</span>
            <button onclick="toggleStoryTitle()" id="btn-story-title-toggle" class="btn" style="width: auto; padding: 4px 10px; font-size: 0.75rem; background: #475569;">Title: OFF</button>
          </div>

          <div id="story-title-controls-box" style="display: none; flex-direction: column; gap: 8px;">
            <input type="text" id="custom-story-title-input" placeholder="ဗီဒီယိုပေါ်တွင် ပြသမည့် ခေါင်းစဉ်..." oninput="updateStoryTitleText(this.value)" style="font-size: 0.85rem;" />
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
                <span style="color: #94a3b8;">Title Size</span>
                <span id="story-title-size-val" style="color: #facc15; font-weight: bold;">24px</span>
              </div>
              <input type="range" id="story-title-size-slider" min="10" max="100" value="24" oninput="changeStoryTitleFontSize(this.value)" style="width: 100%; cursor: pointer;" />
            </div>
          </div>
        </div>

        <!-- ၆။ Watermark Card (Remove Button ပါဝင်သည်) -->
        <div class="card" style="display: flex; flex-direction: column; gap: 10px; background: #131d31;">
          <span style="font-size: 0.9rem; font-weight: bold; color: #38bdf8;">🖼️ Watermark တံဆိပ်</span>
          <div style="display: flex; gap: 8px; align-items: center;">
            <input type="file" id="story-watermark-file-input" accept="image/*" onchange="handleStoryWatermarkUpload(event)" style="font-size: 0.75rem; padding: 6px; flex: 1;" />
            <button id="btn-story-remove-wm" onclick="removeStoryWatermark()" class="btn" style="display: none; width: auto; padding: 6px 12px; background: #ef4444; font-size: 0.75rem;">❌ ဖျက်မည်</button>
          </div>
          <small style="color: #94a3b8; font-size: 0.7rem;">* ပုံပေါ်ရှိ (↘) အပြာရောင်ခလုတ်လေးကို ထိဆွဲပြီး Size စိတ်ကြိုက် ချိန်ညှိနိုင်ပါသည်</small>
        </div>

        <!-- ၇။ Subtitle (SRT) Settings Card (၇ မျိုး၊ ၈ မျိုး ⭕၊ ↘ Resize) -->
        <div class="card" style="display: flex; flex-direction: column; gap: 12px; background: #131d31;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.9rem; font-weight: bold; color: #38bdf8;">⚙️ Subtitle (SRT) စနစ်</span>
            <div style="display: flex; gap: 6px;">
              <button onclick="toggleStorySrtEditBox()" id="btn-story-srt-edit-toggle" class="btn" style="width: auto; padding: 6px 10px; font-size: 0.75rem; background: #f59e0b; color: #000;">✏️ Edit</button>
              <button onclick="toggleStorySrtVisibility()" id="btn-story-srt-toggle" class="btn" style="width: auto; padding: 6px 10px; font-size: 0.75rem; background: #0284c7; color: #fff;">SRT: ON</button>
            </div>
          </div>

          <!-- စာသားအရောင် ၇ မျိုး -->
          <div>
            <label style="font-size: 0.75rem; margin-bottom: 6px; display: block;">စာသားအရောင် (၇ မျိုး)</label>
            <div style="display: flex; gap: 9px; align-items: center; flex-wrap: wrap;">
              <div onclick="selectStoryFontColor('#ffffff', this)" class="story-font-dot" style="background: #ffffff; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px solid #38bdf8;"></div>
              <div onclick="selectStoryFontColor('#facc15', this)" class="story-font-dot" style="background: #facc15; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              <div onclick="selectStoryFontColor('#38bdf8', this)" class="story-font-dot" style="background: #38bdf8; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              <div onclick="selectStoryFontColor('#4ade80', this)" class="story-font-dot" style="background: #4ade80; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              <div onclick="selectStoryFontColor('#f87171', this)" class="story-font-dot" style="background: #f87171; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              <div onclick="selectStoryFontColor('#c084fc', this)" class="story-font-dot" style="background: #c084fc; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              <div onclick="selectStoryFontColor('#fb923c', this)" class="story-font-dot" style="background: #fb923c; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
            </div>
          </div>

          <!-- စာသားနောက်ခံအရောင် / အနားကွပ် ၈ မျိုး -->
          <div>
            <label style="font-size: 0.75rem; margin-bottom: 6px; display: block;">နောက်ခံအရောင် / စာသားအနားကွပ် (၈ မျိုး)</label>
            <div style="display: flex; gap: 9px; align-items: center; flex-wrap: wrap;">
              <div onclick="selectStoryBgStyle('rgba(0,0,0,0.75)', this)" class="story-bg-dot" title="မည်းကြည်" style="background: rgba(0,0,0,0.75); width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px solid #38bdf8;"></div>
              <div onclick="selectStoryBgStyle('#000000', this)" class="story-bg-dot" title="အနက်" style="background: #000000; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              <div onclick="selectStoryBgStyle('rgba(185,28,28,0.75)', this)" class="story-bg-dot" title="နီကြည်" style="background: #b91c1c; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              <div onclick="selectStoryBgStyle('rgba(30,58,138,0.75)', this)" class="story-bg-dot" title="ပြာကြည်" style="background: #1e3a8a; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              <div onclick="selectStoryBgStyle('rgba(20,83,45,0.75)', this)" class="story-bg-dot" title="စိမ်းကြည်" style="background: #14532d; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              <div onclick="selectStoryBgStyle('rgba(180,83,9,0.75)', this)" class="story-bg-dot" title="ဝါကြည်" style="background: #b45309; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              <div onclick="selectStoryBgStyle('rgba(109,40,217,0.75)', this)" class="story-bg-dot" title="ခရမ်းကြည်" style="background: #6d28d9; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px solid transparent;"></div>
              <div onclick="selectStoryBgStyle('stroke', this)" class="story-bg-dot" title="စာသားအနားကွပ် (နောက်ခံမပါ)" style="background: transparent; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px dashed #ffffff; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #fff; font-weight: bold;">⭕</div>
            </div>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
              <span style="color: #94a3b8;">စာလုံးဆိုဒ် (Font Size) - စခရင်ပေါ်ရှိ (↘) ကိုလည်း ထိဆွဲနိုင်သည်</span>
              <span id="story-srt-font-size-val" style="color: #38bdf8; font-weight: bold;">18px</span>
            </div>
            <input type="range" id="story-srt-size-slider" min="10" max="100" value="18" oninput="changeStorySrtFontSize(this.value)" style="width: 100%; cursor: pointer;" />
          </div>

          <div id="story-srt-edit-panel" style="display: none; flex-direction: column; gap: 8px;">
            <textarea id="story-srt-edit-textarea" rows="5" style="font-family: monospace; font-size: 0.75rem;"></textarea>
            <button onclick="saveStorySrtChanges()" class="btn" style="background: #10b981; padding: 8px; font-size: 0.8rem;">💾 SRT သိမ်းဆည်းမည်</button>
          </div>

          <button onclick="downloadCurrentStorySrt()" class="btn" style="background: #6366f1; padding: 10px; font-size: 0.85rem;">
            <span>📥 Subtitle (.SRT) ဖိုင် Download ရယူမည်</span>
          </button>
        </div>

        <!-- ဇာတ်လမ်း စာသား ကတ် -->
        <div class="card">
          <label id="current-story-label" style="color: #facc15;">📖 ထုတ်လုပ်ထားသော ဇာတ်လမ်းစာသား</label>
          <textarea id="story-script-text" rows="5"></textarea>
        </div>

        <!-- ၈။ Final Hardcoded Video Download -->
        <div class="card" style="background: linear-gradient(145deg, #1e1b4b, #0f172a); border: 1px solid #6366f1;">
          <div style="font-size: 0.9rem; font-weight: bold; color: #a5b4fc; margin-bottom: 6px;">🚀 Motion Video အပြီးသတ် Download လုပ်ခြင်း</div>
          <p style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 12px;">AI Motion ဗီဒီယိုမြင်ကွင်း၊ စာတန်းထိုး၊ Title၊ Watermark နှင့် Audio Mixer များကို အသေထည့်သွင်း၍ ဖုန်းထဲသို့ Export ထုတ်ပေးမည် ဖြစ်ပါသည်။</p>

          <button id="btn-export-story-video" onclick="exportStoryHardcodedVideo()" class="btn" style="background: linear-gradient(90deg, #6366f1, #10b981); font-weight: bold; font-size: 0.95rem; padding: 14px;">
            <span>📥 အားလုံးပါဝင်သော Motion Video အပြီးသတ် Download ရယူမည်</span>
          </button>

          <div id="story-export-progress-box" style="display: none; margin-top: 10px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
              <span id="story-export-status-title" style="color: #38bdf8;">Render ပြုလုပ်နေပါသည်...</span>
              <span id="story-export-percent-val" style="color: #facc15; font-weight: bold;">0%</span>
            </div>
            <div style="width: 100%; height: 6px; background: #0f172a; border-radius: 4px; overflow: hidden;">
              <div id="story-export-progress-bar" style="width: 0%; height: 100%; background: #10b981; transition: width 0.2s linear;"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  setupStoryAudioListeners();
  setupStoryTouchDrag("draggable-story-title");
  setupStoryTouchDrag("draggable-story-watermark");
  setupStoryTouchDrag("draggable-story-subtitle");

  setupStoryTouchResize("draggable-story-watermark", "story-wm-resize-handle");
  setupStorySubtitleTouchResize();
}

function handleFormatChange() {
  const format = document.getElementById("story-format").value;
  document.getElementById("story-btn-text").innerText = format === "series" ? "📺 ဇာတ်လမ်းတွဲ (Ep 1 to 6) ဖန်တီးမည်" : "🎬 Movie (တစ်ပိုင်းတည်း) ဖန်တီးမည်";
}

function toggleStoryAudioMixerDropdown() {
  const content = document.getElementById("story-audio-mixer-dropdown-content");
  const chevron = document.getElementById("story-audio-mixer-chevron");
  if (content.style.display === "none") {
    content.style.display = "flex";
    chevron.innerText = "▲ ပိတ်မည်";
  } else {
    content.style.display = "none";
    chevron.innerText = "▼ အသံချိန်ညှိမည်";
  }
}

function setupStoryAudioListeners() {
  const aSlider = document.getElementById("story-vol-ai-slider");
  const bSlider = document.getElementById("story-vol-bgm-slider");
  const audioEl = document.getElementById("story-audio-element");

  aSlider.addEventListener("input", (e) => {
    document.getElementById("story-vol-ai-val").innerText = `${e.target.value}%`;
    if (audioEl) audioEl.volume = e.target.value / 100;
  });

  bSlider.addEventListener("input", (e) => {
    document.getElementById("story-vol-bgm-val").innerText = `${e.target.value}%`;
    if (currentStoryBgm) currentStoryBgm.volume = e.target.value / 100;
  });
}

function handleStoryBgmSelect(e) {
  if (e.target.files && e.target.files[0]) {
    const bgmUrl = URL.createObjectURL(e.target.files[0]);
    if (currentStoryBgm) currentStoryBgm.pause();
    currentStoryBgm = new Audio(bgmUrl);
    currentStoryBgm.loop = true;
    currentStoryBgm.volume = document.getElementById("story-vol-bgm-slider").value / 100;
    document.getElementById("btn-story-remove-bgm").style.display = "block";
  }
}

function removeStoryBgm() {
  if (currentStoryBgm) {
    currentStoryBgm.pause();
    currentStoryBgm = null;
  }
  document.getElementById("story-bgm-file").value = "";
  document.getElementById("btn-story-remove-bgm").style.display = "none";
}

// Title Controls
function toggleStoryTitle() {
  isTitleActive = !isTitleActive;
  const titleEl = document.getElementById("draggable-story-title");
  const controls = document.getElementById("story-title-controls-box");
  const btn = document.getElementById("btn-story-title-toggle");

  if (isTitleActive) {
    titleEl.style.display = "block";
    controls.style.display = "flex";
    btn.innerText = "Title: ON";
    btn.style.background = "#facc15";
    btn.style.color = "#000";
  } else {
    titleEl.style.display = "none";
    controls.style.display = "none";
    btn.innerText = "Title: OFF";
    btn.style.background = "#475569";
    btn.style.color = "#fff";
  }
}

function updateStoryTitleText(text) {
  document.getElementById("draggable-story-title").innerText = text || "ဇာတ်လမ်း ခေါင်းစဉ်";
}

function changeStoryTitleFontSize(val) {
  titleFontSize = val;
  document.getElementById("story-title-size-val").innerText = `${val}px`;
  document.getElementById("draggable-story-title").style.fontSize = `${val}px`;
}

// Watermark Controls
function handleStoryWatermarkUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    watermarkImg = new Image();
    watermarkImg.src = e.target.result;
    watermarkImg.onload = () => {
      document.getElementById("story-watermark-preview-img").src = e.target.result;
      document.getElementById("draggable-story-watermark").style.display = "block";
      document.getElementById("btn-story-remove-wm").style.display = "block";
      isWatermarkActive = true;
    };
  };
  reader.readAsDataURL(file);
}

function removeStoryWatermark() {
  watermarkImg = null;
  isWatermarkActive = false;
  document.getElementById("story-watermark-file-input").value = "";
  document.getElementById("draggable-story-watermark").style.display = "none";
  document.getElementById("btn-story-remove-wm").style.display = "none";
}

// Subtitle Styling (၇ မျိုး & ၈ မျိုး ⭕)
function selectStoryFontColor(color, el) {
  srtFontColor = color;
  document.querySelectorAll(".story-font-dot").forEach(d => d.style.borderColor = "transparent");
  el.style.borderColor = "#38bdf8";
  applyStorySrtStyles();
}

function selectStoryBgStyle(style, el) {
  srtBgStyle = style;
  document.querySelectorAll(".story-bg-dot").forEach(d => {
    d.style.borderColor = (d.getAttribute("title") && d.getAttribute("title").includes("အနားကွပ်")) ? "#ffffff" : "transparent";
  });
  el.style.borderColor = "#38bdf8";
  applyStorySrtStyles();
}

function changeStorySrtFontSize(size) {
  srtFontSize = size;
  document.getElementById("story-srt-font-size-val").innerText = `${size}px`;
  applyStorySrtStyles();
}

function applyStorySrtStyles() {
  const sub = document.getElementById("draggable-story-subtitle");
  if (!sub) return;

  sub.style.color = srtFontColor;
  sub.style.fontSize = `${srtFontSize}px`;

  if (srtBgStyle === "stroke") {
    sub.style.background = "transparent";
    sub.style.textShadow = "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 3px 6px rgba(0,0,0,0.9)";
  } else {
    sub.style.background = srtBgStyle;
    sub.style.textShadow = "none";
  }
}

function toggleStorySrtVisibility() {
  isSrtVisible = !isSrtVisible;
  const sub = document.getElementById("draggable-story-subtitle");
  const btn = document.getElementById("btn-story-srt-toggle");
  sub.style.display = isSrtVisible ? "block" : "none";
  btn.innerText = isSrtVisible ? "SRT: ON" : "SRT: OFF";
  btn.style.background = isSrtVisible ? "#0284c7" : "#475569";
}

function toggleStorySrtEditBox() {
  const panel = document.getElementById("story-srt-edit-panel");
  panel.style.display = panel.style.display === "none" ? "flex" : "none";
}

function saveStorySrtChanges() {
  const newSrtText = document.getElementById("story-srt-edit-textarea").value;
  window.currentStorySrtRaw = newSrtText;
  currentStorySrtCues = parseStorySrt(newSrtText);
  alert("SRT ကို အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ!");
}

function downloadCurrentStorySrt() {
  if (!window.currentStorySrtRaw) return alert("SRT ဒေတာ မရှိသေးပါ");
  const blob = new Blob([window.currentStorySrtRaw], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Story_Subtitle_Ep${currentEpNumber}.srt`;
  a.click();
}

// Touch Dragging & Resizing
function setupStoryTouchDrag(elementId) {
  const el = document.getElementById(elementId);
  const wrapper = document.getElementById("story-video-wrapper");

  let isDragging = false;
  let startX, startY, origX, origY;

  function onStart(e) {
    if (e.target.id && e.target.id.includes("resize-handle")) return;
    isDragging = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    startX = clientX;
    startY = clientY;
    origX = el.offsetLeft;
    origY = el.offsetTop;
    el.style.transform = "none";
  }

  function onMove(e) {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    let newX = origX + (clientX - startX);
    let newY = origY + (clientY - startY);

    newX = Math.max(0, Math.min(newX, wrapper.clientWidth - el.clientWidth));
    newY = Math.max(0, Math.min(newY, wrapper.clientHeight - el.clientHeight));

    el.style.left = `${newX}px`;
    el.style.top = `${newY}px`;
    el.style.bottom = "auto";
    el.style.right = "auto";
  }

  function onEnd() { isDragging = false; }

  el.addEventListener("touchstart", onStart, { passive: false });
  window.addEventListener("touchmove", onMove, { passive: false });
  window.addEventListener("touchend", onEnd);
  el.addEventListener("mousedown", onStart);
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onEnd);
}

function setupStorySubtitleTouchResize() {
  const handle = document.getElementById("story-sub-resize-handle");
  const slider = document.getElementById("story-srt-size-slider");
  const sizeVal = document.getElementById("story-srt-font-size-val");

  let isResizing = false;
  let startX, startSize;

  function onStart(e) {
    e.stopPropagation();
    isResizing = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    startX = clientX;
    startSize = srtFontSize;
  }

  function onMove(e) {
    if (!isResizing) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - startX;
    let newSize = Math.max(10, Math.min(100, Math.round(startSize + deltaX * 0.35)));
    srtFontSize = newSize;
    if (slider) slider.value = newSize;
    if (sizeVal) sizeVal.innerText = `${newSize}px`;
    applyStorySrtStyles();
  }

  function onEnd() { isResizing = false; }

  handle.addEventListener("touchstart", onStart, { passive: false });
  window.addEventListener("touchmove", onMove, { passive: false });
  window.addEventListener("touchend", onEnd);
  handle.addEventListener("mousedown", onStart);
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onEnd);
}

function setupStoryTouchResize(targetId, handleId) {
  const target = document.getElementById(targetId);
  const handle = document.getElementById(handleId);

  let isResizing = false;
  let startX, startY, startW, startH;

  function onResizeStart(e) {
    e.stopPropagation();
    isResizing = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    startX = clientX;
    startY = clientY;
    startW = target.clientWidth;
    startH = target.clientHeight;
  }

  function onResizeMove(e) {
    if (!isResizing) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const newW = Math.max(30, startW + (clientX - startX));
    const newH = Math.max(20, startH + (clientY - startY));

    target.style.width = `${newW}px`;
    target.style.height = `${newH}px`;
  }

  function onResizeEnd() { isResizing = false; }

  handle.addEventListener("touchstart", onResizeStart, { passive: false });
  window.addEventListener("touchmove", onResizeMove, { passive: false });
  window.addEventListener("touchend", onResizeEnd);
  handle.addEventListener("mousedown", onResizeStart);
  window.addEventListener("mousemove", onResizeMove);
  window.addEventListener("mouseup", onResizeEnd);
}

// Subtitle Chunking & Accurate SRT Logic
function splitBurmeseIntoShortChunks(text) {
  const sentences = text.match(/[^။!?\n]+[။!?\n]?/g) || [text];
  const chunks = [];
  for (const s of sentences) {
    const trimmed = s.trim();
    if (trimmed.length <= 32) {
      if (trimmed) chunks.push(trimmed);
    } else {
      const subParts = trimmed.split(/([၊\s]+)/);
      let current = "";
      for (const part of subParts) {
        if ((current + part).length > 30 && current.length > 0) {
          chunks.push(current.trim());
          current = part;
        } else {
          current += part;
        }
      }
      if (current.trim()) chunks.push(current.trim());
    }
  }
  return chunks.filter(c => c.length > 0);
}

function generateAccurateSrt(scriptText, totalDuration) {
  const chunks = splitBurmeseIntoShortChunks(scriptText);
  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);

  let srt = "";
  let currentStart = 0;

  chunks.forEach((chunk, index) => {
    const chunkRatio = chunk.length / totalLength;
    const chunkDuration = totalDuration * chunkRatio;
    const currentEnd = Math.min(currentStart + chunkDuration, totalDuration);

    const fmt = (s) => {
      const hrs = Math.floor(s / 3600).toString().padStart(2, "0");
      const mins = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
      const secs = Math.floor(s % 60).toString().padStart(2, "0");
      const ms = Math.floor((s % 1) * 1000).toString().padStart(3, "0");
      return `${hrs}:${mins}:${secs},${ms}`;
    };

    srt += `${index + 1}\n${fmt(currentStart)} --> ${fmt(currentEnd)}\n${chunk}\n\n`;
    currentStart = currentEnd;
  });

  return srt;
}

function parseStorySrt(srtText) {
  if (!srtText) return [];
  const blocks = srtText.trim().split(/\n\s*\n/);
  return blocks.map(block => {
    const lines = block.split("\n");
    if (lines.length >= 3) {
      const timeParts = lines[1].split(" --> ");
      const parseSeconds = (t) => {
        const [h, m, s] = t.split(":");
        const [sec, ms] = s.split(",");
        return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(sec) + parseInt(ms) / 1000;
      };
      return {
        start: parseSeconds(timeParts[0]),
        end: parseSeconds(timeParts[1]),
        text: lines.slice(2).join(" ")
      };
    }
    return null;
  }).filter(Boolean);
}

// AI Image Generation & 2.5D Motion Canvas Animation
async function fetchSceneImagesFromPrompts(prompts = []) {
  storySceneImages = [];
  if (!prompts || prompts.length === 0) return;

  const loadPromises = prompts.map((p, idx) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      const seed = Math.floor(Math.random() * 100000);
      img.src = `https://image.pollinations.ai/prompt/${encodeURIComponent(p)}?width=1280&height=720&nologo=true&seed=${seed}`;
      img.onload = () => resolve(img);
      img.onerror = () => {
        // Fallback canvas gradient if network fails
        const fallbackCanvas = document.createElement("canvas");
        fallbackCanvas.width = 1280;
        fallbackCanvas.height = 720;
        const ctx = fallbackCanvas.getContext("2d");
        const grad = ctx.createLinearGradient(0, 0, 1280, 720);
        grad.addColorStop(0, "#0f172a");
        grad.addColorStop(1, "#1e1b4b");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1280, 720);
        const fallbackImg = new Image();
        fallbackImg.src = fallbackCanvas.toDataURL();
        fallbackImg.onload = () => resolve(fallbackImg);
      };
    });
  });

  storySceneImages = await Promise.all(loadPromises);
}

function renderMotionCanvasFrame(time, duration) {
  const canvas = document.getElementById("story-motion-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  if (storySceneImages.length === 0) {
    ctx.fillStyle = "#0a0f1d";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

  const segmentDuration = (duration || 60) / storySceneImages.length;
  const currentIdx = Math.min(storySceneImages.length - 1, Math.floor(time / segmentDuration));
  const segmentProgress = (time % segmentDuration) / segmentDuration;

  const img = storySceneImages[currentIdx];
  if (!img) return;

  // 2.5D Ken-Burns Slow Zoom & Pan
  const scale = 1.0 + segmentProgress * 0.12; // 1.0 to 1.12 zoom
  const panX = (segmentProgress - 0.5) * 40; // slight horizontal pan
  const panY = (segmentProgress - 0.5) * 20;

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2 + panX, canvas.height / 2 + panY);
  ctx.scale(scale, scale);
  ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
  ctx.restore();
}

function startMotionRenderLoop() {
  const audioEl = document.getElementById("story-audio-element");
  const textSpan = document.getElementById("story-subtitle-text-content");

  function loop() {
    if (!isStoryPlaying) return;

    const curr = audioEl.currentTime;
    const dur = audioEl.duration || 60;

    renderMotionCanvasFrame(curr, dur);

    // Live Subtitle Update
    if (isSrtVisible) {
      const cue = currentStorySrtCues.find(c => curr >= c.start && curr <= c.end);
      if (textSpan) textSpan.innerText = cue ? cue.text : "";
    }

    storyAnimationId = requestAnimationFrame(loop);
  }

  cancelAnimationFrame(storyAnimationId);
  storyAnimationId = requestAnimationFrame(loop);
}

function toggleStoryPlayback() {
  const audioEl = document.getElementById("story-audio-element");
  const playBtnText = document.getElementById("story-play-text");
  const playIcon = document.getElementById("story-play-icon");

  if (!audioEl.src) {
    return alert("အသံဖိုင် အဆင်သင့် မဖြစ်သေးပါခင်ဗျာ");
  }

  if (audioEl.paused) {
    audioEl.play();
    if (currentStoryBgm) currentStoryBgm.play();
    isStoryPlaying = true;
    playIcon.innerText = "⏸";
    playBtnText.innerText = "Motion Video ခေတ္တရပ်မည်";
    startMotionRenderLoop();
  } else {
    audioEl.pause();
    if (currentStoryBgm) currentStoryBgm.pause();
    isStoryPlaying = false;
    playIcon.innerText = "▶";
    playBtnText.innerText = "Motion Video ဖွင့်မည်";
    cancelAnimationFrame(storyAnimationId);
  }
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
  pTitle.innerText = "Gemini Flash မော်ဒယ်များဖြင့် ဇာတ်လမ်းနှင့် Scene Prompts ရေးသားနေပါသည်...";

  storyProgressInterval = setInterval(() => {
    if (pct < 75) {
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

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`ဆာဗာမှ မှားယွင်းသော ဒေတာ ပြန်ပို့ထားပါသည်: ${responseText.substring(0, 100)}`);
    }

    if (!response.ok) throw new Error(data.error || "ဇာတ်လမ်း ထုတ်လုပ်မှု မအောင်မြင်ပါ");

    clearInterval(storyProgressInterval);
    pTitle.innerText = "AI Scene ဓာတ်ပုံများ ဆွဲယူနေပါသည်...";
    pPercent.innerText = "88%";
    pBar.style.width = "88%";

    resultContainer.style.display = "flex";

    if (format === "series") {
      storySeriesData = data.series;
      document.getElementById("series-ep-buttons").style.display = "grid";
      document.getElementById("story-main-title").innerText = storySeriesData.series_title || topic;
      document.getElementById("story-format-badge").innerText = `အခန်းဆက် ၆ ပိုင်း (Ep တစ်ခု ${duration} မိနစ်စာ)`;
      await selectEpisode(1);
    } else {
      storySeriesData = null;
      document.getElementById("series-ep-buttons").style.display = "none";
      document.getElementById("story-main-title").innerText = data.movie_title || topic;
      document.getElementById("story-format-badge").innerText = `ရုပ်ရှင် (${duration} မိနစ်စာ)`;
      document.getElementById("current-story-label").innerText = "🎬 ရုပ်ရှင် ဇာတ်လမ်းစာသား";
      document.getElementById("story-script-text").value = data.story_text;
      document.getElementById("custom-story-title-input").value = data.movie_title || topic;
      updateStoryTitleText(data.movie_title || topic);

      await fetchSceneImagesFromPrompts(data.image_prompts || []);
      await prepareAudioForScript(data.story_text);
    }

    pBar.style.width = "100%";
    pPercent.innerText = "100%";
    pTitle.innerText = "အားလုံး အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ!";
    setTimeout(() => { pContainer.style.display = "none"; }, 1200);

  } catch (err) {
    clearInterval(storyProgressInterval);
    pContainer.style.display = "none";
    errorBox.style.display = "block";
    errorBox.innerHTML = `❌ Error: ${err.message}`;
  } finally {
    generateBtn.disabled = false;
    generateBtn.style.opacity = "1";
  }
}

async function selectEpisode(epNum) {
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
  document.getElementById("custom-story-title-input").value = epData.title || `Ep ${epNum}`;
  updateStoryTitleText(epData.title || `Ep ${epNum}`);

  await fetchSceneImagesFromPrompts(epData.image_prompts || []);
  await prepareAudioForScript(epData.text);
}

async function reloadScenePhotos() {
  let prompts = [];
  if (storySeriesData && storySeriesData.episodes) {
    prompts = storySeriesData.episodes[currentEpNumber - 1].image_prompts || [];
  }
  if (prompts.length === 0) return alert("ပုံဆွဲရန် Prompts မရှိပါ");
  await fetchSceneImagesFromPrompts(prompts);
  renderMotionCanvasFrame(0, 60);
  alert("AI ဓာတ်ပုံများကို အသစ်ပြန်လည် ဆွဲယူပြီးပါပြီ!");
}

async function prepareAudioForScript(scriptText) {
  const audioEl = document.getElementById("story-audio-element");
  audioEl.pause();
  isStoryPlaying = false;

  const res = await fetch("/api/generate-story", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fetchAudioOnly: true,
      scriptText: scriptText,
      voice: currentStoryVoice
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error);

  const audioBlob = new Blob([Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0))], { type: "audio/mp3" });
  audioEl.src = URL.createObjectURL(audioBlob);

  audioEl.onloadedmetadata = () => {
    const dur = audioEl.duration || 60;
    const srt = generateAccurateSrt(scriptText, dur);
    window.currentStorySrtRaw = srt;
    document.getElementById("story-srt-edit-textarea").value = srt;
    currentStorySrtCues = parseStorySrt(srt);
    renderMotionCanvasFrame(0, dur);
  };

  audioEl.onended = () => {
    isStoryPlaying = false;
    document.getElementById("story-play-icon").innerText = "▶";
    document.getElementById("story-play-text").innerText = "Motion Video ပြန်ဖွင့်မည်";
    cancelAnimationFrame(storyAnimationId);
  };
}

// ၈။ Final Hardcoded Video Export (Title + Watermark + Subtitles + 2.5D Motion Canvas + Audio Mixer)
async function exportStoryHardcodedVideo() {
  const audioEl = document.getElementById("story-audio-element");
  const wrapper = document.getElementById("story-video-wrapper");
  const subEl = document.getElementById("draggable-story-subtitle");
  const titleEl = document.getElementById("draggable-story-title");
  const wmEl = document.getElementById("draggable-story-watermark");
  const exportBtn = document.getElementById("btn-export-story-video");
  const exportBox = document.getElementById("story-export-progress-box");
  const exportBar = document.getElementById("story-export-progress-bar");
  const exportPercent = document.getElementById("story-export-percent-val");
  const exportTitle = document.getElementById("story-export-status-title");

  if (!audioEl.src) return alert("ဗီဒီယိုနှင့် အသံဖိုင် အဆင်သင့် မရှိသေးပါ");

  exportBtn.disabled = true;
  exportBtn.style.opacity = "0.5";
  exportBox.style.display = "block";
  exportTitle.innerText = "Motion Video ကို Render ပြုလုပ်နေပါသည်...";

  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = 1280;
  exportCanvas.height = 720;
  const ctx = exportCanvas.getContext("2d");

  // Audio Mixer Setup
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const dest = audioCtx.createMediaStreamDestination();

  const aGain = audioCtx.createGain();
  aGain.gain.value = document.getElementById("story-vol-ai-slider").value / 100;
  const bGain = audioCtx.createGain();
  bGain.gain.value = document.getElementById("story-vol-bgm-slider").value / 100;

  try {
    const aSource = audioCtx.createMediaElementSource(audioEl);
    aSource.connect(aGain);
    aGain.connect(dest);
  } catch (e) {}

  try {
    if (currentStoryBgm) {
      const bSource = audioCtx.createMediaElementSource(currentStoryBgm);
      bSource.connect(bGain);
      bGain.connect(dest);
    }
  } catch (e) {}

  const canvasStream = exportCanvas.captureStream(30);
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...dest.stream.getAudioTracks()
  ]);

  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
    ? "video/webm;codecs=vp9,opus"
    : "video/webm";

  const recorder = new MediaRecorder(combinedStream, { mimeType });
  const recordedChunks = [];

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) recordedChunks.push(e.data);
  };

  recorder.onstop = () => {
    const finalBlob = new Blob(recordedChunks, { type: "video/webm" });
    const downloadUrl = URL.createObjectURL(finalBlob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `Story_Motion_Video_${Date.now()}.webm`;
    a.click();

    exportTitle.innerText = "Motion Video Download အောင်မြင်စွာ ရရှိပါပြီ!";
    exportBar.style.width = "100%";
    exportPercent.innerText = "100%";

    setTimeout(() => {
      exportBox.style.display = "none";
      exportBtn.disabled = false;
      exportBtn.style.opacity = "1";
    }, 2500);
  };

  audioEl.currentTime = 0;
  if (currentStoryBgm) currentStoryBgm.currentTime = 0;

  recorder.start();
  await audioEl.play();
  if (currentStoryBgm) currentStoryBgm.play();

  const scaleX = exportCanvas.width / wrapper.clientWidth;
  const scaleY = exportCanvas.height / wrapper.clientHeight;

  function renderExportLoop() {
    if (audioEl.paused || audioEl.ended) return;

    const curr = audioEl.currentTime;
    const dur = audioEl.duration || 60;

    // ၁။ 2.5D Pan/Zoom Motion Background
    if (storySceneImages.length > 0) {
      const segmentDuration = dur / storySceneImages.length;
      const currentIdx = Math.min(storySceneImages.length - 1, Math.floor(curr / segmentDuration));
      const segmentProgress = (curr % segmentDuration) / segmentDuration;
      const img = storySceneImages[currentIdx];

      if (img) {
        const scale = 1.0 + segmentProgress * 0.12;
        const panX = (segmentProgress - 0.5) * 40;
        const panY = (segmentProgress - 0.5) * 20;

        ctx.save();
        ctx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
        ctx.translate(exportCanvas.width / 2 + panX, exportCanvas.height / 2 + panY);
        ctx.scale(scale, scale);
        ctx.drawImage(img, -exportCanvas.width / 2, -exportCanvas.height / 2, exportCanvas.width, exportCanvas.height);
        ctx.restore();
      }
    } else {
      ctx.fillStyle = "#0a0f1d";
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    }

    // ၂။ Hardcoded Watermark
    if (isWatermarkActive && watermarkImg && wmEl.style.display !== "none") {
      const wx = wmEl.offsetLeft * scaleX;
      const wy = wmEl.offsetTop * scaleY;
      const ww = wmEl.clientWidth * scaleX;
      const wh = wmEl.clientHeight * scaleY;
      ctx.drawImage(watermarkImg, wx, wy, ww, wh);
    }

    // ၃။ Hardcoded Custom Title Text
    if (isTitleActive && titleEl.style.display !== "none") {
      const tx = (titleEl.offsetLeft + titleEl.clientWidth / 2) * scaleX;
      const ty = (titleEl.offsetTop + titleEl.clientHeight / 2) * scaleY;
      const dynamicTitleSize = Math.round(titleFontSize * scaleY);

      ctx.font = `bold ${dynamicTitleSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.shadowColor = "#000000";
      ctx.shadowBlur = 8;
      ctx.fillStyle = "#facc15";
      ctx.fillText(titleEl.innerText, tx, ty);
      ctx.shadowBlur = 0;
    }

    // ၄။ Hardcoded Subtitle (SRT)
    if (isSrtVisible && subEl.style.display !== "none") {
      const currentCue = currentStorySrtCues.find(c => curr >= c.start && curr <= c.end);

      if (currentCue && currentCue.text) {
        const sx = (subEl.offsetLeft + subEl.clientWidth / 2) * scaleX;
        const sy = (subEl.offsetTop + subEl.clientHeight / 2) * scaleY;
        const dynamicFontSize = Math.round(srtFontSize * scaleY);

        ctx.font = `bold ${dynamicFontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        if (srtBgStyle === "stroke") {
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 5 * scaleX;
          ctx.strokeText(currentCue.text, sx, sy);
          ctx.fillStyle = srtFontColor;
          ctx.fillText(currentCue.text, sx, sy);
        } else {
          const textMetrics = ctx.measureText(currentCue.text);
          const paddingX = 14 * scaleX;
          const paddingY = 8 * scaleY;
          const boxWidth = textMetrics.width + paddingX * 2;
          const boxHeight = dynamicFontSize + paddingY * 2;

          ctx.fillStyle = srtBgStyle;
          ctx.beginPath();
          ctx.roundRect(sx - boxWidth / 2, sy - boxHeight / 2, boxWidth, boxHeight, 8 * scaleX);
          ctx.fill();

          ctx.fillStyle = srtFontColor;
          ctx.fillText(currentCue.text, sx, sy);
        }
      }
    }

    const pct = Math.min(99, Math.round((curr / dur) * 100));
    exportBar.style.width = `${pct}%`;
    exportPercent.innerText = `${pct}%`;

    requestAnimationFrame(renderExportLoop);
  }

  audioEl.onended = () => {
    recorder.stop();
    if (currentStoryBgm) currentStoryBgm.pause();
  };

  renderExportLoop();
}

if (document.readyState !== "loading") {
  initStoryView();
} else {
  document.addEventListener("DOMContentLoaded", initStoryView);
}
