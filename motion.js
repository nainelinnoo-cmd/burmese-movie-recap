function initMotionView() {
  const container = document.getElementById("view-motion");
  container.innerHTML = `
    <div class="space-y-4">
      <div class="p-4 bg-gray-800/60 rounded-xl border border-gray-700">
        <label class="block text-sm font-semibold mb-2 text-gray-300">ဓါတ်ပုံ တင်သွင်းပါ</label>
        <input type="file" id="motion-image-file" accept="image/*" class="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-500" />
      </div>

      <div class="space-y-2">
        <label class="block text-xs text-gray-400">ပေါ်မည့် စာတန်း</label>
        <input type="text" id="motion-caption" placeholder="ဗီဒီယိုပေါ်တွင် ပြသမည့် စာတန်း..." class="w-full p-2.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500" />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-gray-400 mb-1">Motion ပုံစံ</label>
          <select id="motion-effect" class="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500">
            <option value="zoom-in">Zoom In (အနီးကပ်)</option>
            <option value="zoom-out">Zoom Out (အဝေးကြည့်)</option>
            <option value="pan-left">Pan Left (ဘယ်သို့ရွေ့)</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">ကြာချိန်</label>
          <select id="motion-duration" class="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500">
            <option value="5">၅ စက္ကန့်</option>
            <option value="10">၁၀ စက္ကန့်</option>
          </select>
        </div>
      </div>

      <button onclick="handlePreviewMotion()" class="w-full py-3 bg-purple-600 hover:bg-purple-500 font-bold rounded-xl text-white transition flex justify-center items-center gap-2">
        <i class="fa-solid fa-film"></i> Motion Preview ကြည့်မည်
      </button>

      <div id="motion-canvas-container" class="hidden overflow-hidden rounded-xl border border-gray-700 aspect-video relative bg-black flex items-center justify-center">
        <canvas id="motion-canvas" class="w-full h-full object-cover"></canvas>
      </div>
    </div>
  `;
}

function handlePreviewMotion() {
  const fileInput = document.getElementById("motion-image-file");
  const caption = document.getElementById("motion-caption").value;
  const canvasContainer = document.getElementById("motion-canvas-container");
  const canvas = document.getElementById("motion-canvas");
  const ctx = canvas.getContext("2d");

  if (!fileInput.files || fileInput.files.length === 0) {
    alert("ပုံရွေးချယ်ပေးပါ");
    return;
  }

  const img = new Image();
  img.src = URL.createObjectURL(fileInput.files[0]);
  img.onload = () => {
    canvasContainer.classList.remove("hidden");
    canvas.width = 1280;
    canvas.height = 720;

    let scale = 1.0;
    function animate() {
      if (scale < 1.25) {
        scale += 0.001;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(scale, scale);
        ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
        ctx.restore();

        // Caption စာသားဆွဲခြင်း
        if (caption) {
          ctx.font = "bold 42px sans-serif";
          ctx.fillStyle = "yellow";
          ctx.textAlign = "center";
          ctx.shadowColor = "black";
          ctx.shadowBlur = 8;
          ctx.fillText(caption, canvas.width / 2, canvas.height - 60);
        }
        requestAnimationFrame(animate);
      }
    }
    animate();
  };
}
