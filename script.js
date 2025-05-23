const elements = {
  canvas: document.getElementById("canvas"),
  upload: document.getElementById("upload"),
  blackLevel: document.getElementById("blackLevel"),
  midLevel: document.getElementById("midLevel"),
  whiteLevel: document.getElementById("whiteLevel"),
  blur: document.getElementById("blur"),
  grainSize: document.getElementById("grainSize"),
  grainStrength: document.getElementById("grainStrength"),
  overlayMode: document.getElementById("overlayMode"),
  randomizeColors: document.getElementById("randomizeColors"),
  save: document.getElementById("save"),
  undo: document.getElementById("undo"),
  redo: document.getElementById("redo"),
  applyPreset: document.getElementById("applyPreset"),
  colors: Array.from({ length: 4 }, (_, i) => document.getElementById(`color${i + 1}`)),
  placeholder: document.querySelector('.placeholder-message'),
  presetName: document.getElementById('presetName'),
  savePreset: document.getElementById('savePreset'),
  presetGallery: document.querySelector('.preset-gallery')
};

const ctx = elements.canvas.getContext("2d");
let originalImage = null;
let imageHistory = [];
let redoHistory = [];
const MAX_HISTORY = 50;

// Load saved presets from localStorage
let presets = JSON.parse(localStorage.getItem('imageEditorPresets')) || [];
let lastUsedPreset = localStorage.getItem('lastUsedPreset');
let lastUsedImage = localStorage.getItem('lastUsedImage');

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function hexToRgb(hex) {
  const bigint = parseInt(hex.replace("#", ""), 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function drawImage(image) {
  if (!image) return;
  
  const aspectRatio = image.width / image.height;
  const maxWidth = Math.min(1200, window.innerWidth * 0.9);
  const maxHeight = window.innerHeight * 0.6;
  
  let width = image.width;
  let height = image.height;
  
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }
  
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }
  
  elements.canvas.width = width;
  elements.canvas.height = height;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
}

function applyGradientMap(data) {
  const stops = elements.colors.map(c => hexToRgb(c.value));
  const blackVal = parseInt(elements.blackLevel.value);
  const whiteVal = parseInt(elements.whiteLevel.value);
  const midVal = parseFloat(elements.midLevel.value);
  
  for (let i = 0; i < data.data.length; i += 4) {
    const avg = (data.data[i] + data.data[i + 1] + data.data[i + 2]) / 3;
    
    // Normalize the value to 0-1 range
    let t = avg / 255;
    
    // Apply midtone adjustment first using power function
    if (midVal !== 1) {
      t = Math.pow(t, 1 / midVal);
    }
    
    // Then apply levels adjustment
    t = (t * 255 - blackVal) / (whiteVal - blackVal);
    t = clamp(t, 0, 1);
    
    const stopIndex = Math.floor(t * (stops.length - 1));
    const ratio = t * (stops.length - 1) - stopIndex;
    const c1 = stops[clamp(stopIndex, 0, stops.length - 1)];
    const c2 = stops[clamp(stopIndex + 1, 0, stops.length - 1)];

    data.data[i] = lerp(c1[0], c2[0], ratio);
    data.data[i + 1] = lerp(c1[1], c2[1], ratio);
    data.data[i + 2] = lerp(c1[2], c2[2], ratio);
  }
  return data;
}

function drawGrain() {
  const grainCanvas = document.createElement("canvas");
  grainCanvas.width = elements.canvas.width;
  grainCanvas.height = elements.canvas.height;
  const gctx = grainCanvas.getContext("2d");
  const imgData = gctx.createImageData(elements.canvas.width, elements.canvas.height);
  
  const size = Math.max(1, Math.min(5, parseFloat(elements.grainSize.value)));
  const strength = parseFloat(elements.grainStrength.value) * 255;
  
  // Pre-calculate random values for better performance
  const noiseValues = new Float32Array(Math.ceil(elements.canvas.width / size) * Math.ceil(elements.canvas.height / size));
  for (let i = 0; i < noiseValues.length; i++) {
    noiseValues[i] = (Math.random() - 0.5) * 2 * strength;
  }
  
  // Calculate dimensions
  const cols = Math.ceil(elements.canvas.width / size);
  const rows = Math.ceil(elements.canvas.height / size);
  
  // Apply grain more efficiently
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const noiseValue = noiseValues[row * cols + col];
      const y = row * size;
      const x = col * size;
      
      // Calculate boundaries
      const endY = Math.min(y + size, elements.canvas.height);
      const endX = Math.min(x + size, elements.canvas.width);
      
      // Fill the block with the same noise value
      for (let py = y; py < endY; py++) {
        const rowOffset = py * elements.canvas.width * 4;
        for (let px = x; px < endX; px++) {
          const i = rowOffset + px * 4;
          imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = 128 + noiseValue;
          imgData.data[i + 3] = 255;
        }
      }
    }
  }
  
  gctx.putImageData(imgData, 0, 0);
  ctx.globalCompositeOperation = elements.overlayMode.checked ? "overlay" : "source-over";
  ctx.drawImage(grainCanvas, 0, 0);
  ctx.globalCompositeOperation = "source-over";
}

const applyEffects = debounce(() => {
  if (!originalImage) return;
  
  try {
    ctx.filter = "none";
    drawImage(originalImage);
    
    let imageData = ctx.getImageData(0, 0, elements.canvas.width, elements.canvas.height);
    imageData = applyGradientMap(imageData);
    ctx.putImageData(imageData, 0, 0);
    
    if (parseInt(elements.blur.value) > 0) {
      ctx.filter = `blur(${elements.blur.value}px)`;
      ctx.drawImage(elements.canvas, 0, 0);
    }
    
    ctx.filter = "none";
    if (parseFloat(elements.grainStrength.value) > 0) {
      drawGrain();
    }
    
    saveState();
    updateControls();
  } catch (error) {
    console.error('Error applying effects:', error);
  }
}, 150);

function saveState() {
  if (!elements.canvas) return;
  
  try {
    const state = ctx.getImageData(0, 0, elements.canvas.width, elements.canvas.height);
    imageHistory.push(state);
    
    if (imageHistory.length > MAX_HISTORY) {
      imageHistory.shift();
    }
    
    redoHistory = [];
    updateControls();
  } catch (error) {
    console.error('Error saving state:', error);
  }
}

function updateControls() {
  elements.undo.disabled = imageHistory.length < 2;
  elements.redo.disabled = redoHistory.length === 0;
  elements.save.disabled = !originalImage;
  
  document.querySelectorAll('input[type="range"]').forEach(input => {
    const display = input.parentElement.querySelector('.value-display');
    if (display) {
      display.textContent = input.value;
    }
  });
}

// Function to get current settings
function getCurrentSettings() {
  return {
    colors: elements.colors.map(c => c.value),
    blackLevel: elements.blackLevel.value,
    midLevel: elements.midLevel.value,
    whiteLevel: elements.whiteLevel.value,
    blur: elements.blur.value,
    grainSize: elements.grainSize.value,
    grainStrength: elements.grainStrength.value,
    overlayMode: elements.overlayMode.checked
  };
}

// Function to apply settings
function applySettings(settings) {
  elements.colors.forEach((c, i) => c.value = settings.colors[i]);
  elements.blackLevel.value = settings.blackLevel;
  elements.midLevel.value = settings.midLevel;
  elements.whiteLevel.value = settings.whiteLevel;
  elements.blur.value = settings.blur;
  elements.grainSize.value = settings.grainSize;
  elements.grainStrength.value = settings.grainStrength;
  elements.overlayMode.checked = settings.overlayMode;
  applyEffects();
}

// Function to save preset
function savePreset() {
  const name = elements.presetName.value.trim();
  if (!name) {
    alert('Please enter a preset name');
    return;
  }

  const thumbnail = elements.canvas.toDataURL('image/jpeg', 0.1);
  const settings = getCurrentSettings();
  const preset = {
    id: Date.now(),
    name,
    date: new Date().toISOString(),
    settings,
    thumbnail,
    image: originalImage ? elements.canvas.toDataURL() : null
  };

  presets.push(preset);
  localStorage.setItem('imageEditorPresets', JSON.stringify(presets));
  elements.presetName.value = '';
  renderPresets();
}

// Function to render presets
function renderPresets() {
  elements.presetGallery.innerHTML = '';
  presets.forEach(preset => {
    const card = document.createElement('div');
    card.className = 'preset-card';
    if (preset.id === lastUsedPreset) {
      card.classList.add('active');
    }

    card.innerHTML = `
      <img src="${preset.thumbnail}" alt="${preset.name}" class="preset-thumbnail">
      <div class="preset-name">${preset.name}</div>
      <div class="preset-date">${new Date(preset.date).toLocaleDateString()}</div>
      <button class="preset-delete">×</button>
    `;

    // Apply preset
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('preset-delete')) return;
      applySettings(preset.settings);
      if (preset.image) {
        const img = new Image();
        img.onload = () => {
          originalImage = img;
          elements.placeholder.style.display = 'none';
          applyEffects();
        };
        img.src = preset.image;
      }
      lastUsedPreset = preset.id;
      localStorage.setItem('lastUsedPreset', preset.id);
      renderPresets();
    });

    // Delete preset
    card.querySelector('.preset-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Are you sure you want to delete this preset?')) {
        presets = presets.filter(p => p.id !== preset.id);
        localStorage.setItem('imageEditorPresets', JSON.stringify(presets));
        if (lastUsedPreset === preset.id) {
          lastUsedPreset = null;
          localStorage.removeItem('lastUsedPreset');
        }
        renderPresets();
      }
    });

    elements.presetGallery.appendChild(card);
  });
}

// Save preset button click handler
elements.savePreset.addEventListener('click', savePreset);

// Load last used image and preset on startup
if (lastUsedImage) {
  const img = new Image();
  img.onload = () => {
    originalImage = img;
    elements.placeholder.style.display = 'none';
    if (lastUsedPreset) {
      const preset = presets.find(p => p.id === parseInt(lastUsedPreset));
      if (preset) {
        applySettings(preset.settings);
      }
    }
    applyEffects();
  };
  img.src = lastUsedImage;
}

// Render initial presets
renderPresets();

// Update last used image when new image is loaded
elements.upload.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file.');
    return;
  }
  
  const img = new Image();
  img.onload = () => {
    originalImage = img;
    imageHistory = [];
    redoHistory = [];
    elements.placeholder.style.display = 'none';
    localStorage.setItem('lastUsedImage', elements.canvas.toDataURL());
    applyEffects();
  };
  img.onerror = () => {
    alert('Error loading image. Please try another file.');
  };
  img.src = URL.createObjectURL(file);
});

document.querySelectorAll('input').forEach(input => {
  input.addEventListener('input', applyEffects);
});

elements.randomizeColors.addEventListener("click", () => {
  const current = elements.colors.map(c => c.value);
  const shuffled = [...current].sort(() => Math.random() - 0.5);
  elements.colors.forEach((c, i) => c.value = shuffled[i]);
  
  elements.blackLevel.value = Math.floor(Math.random() * 50);
  elements.whiteLevel.value = 200 + Math.floor(Math.random() * 55);
  applyEffects();
});

elements.save.addEventListener("click", () => {
  try {
    const link = document.createElement("a");
    link.download = "edited-image.png";
    link.href = elements.canvas.toDataURL("image/png");
    link.click();
  } catch (error) {
    console.error('Error saving image:', error);
    alert('Error saving image. Please try again.');
  }
});

elements.undo.addEventListener("click", () => {
  if (imageHistory.length < 2) return;
  
  try {
    redoHistory.push(imageHistory.pop());
    const prev = imageHistory[imageHistory.length - 1];
    ctx.putImageData(prev, 0, 0);
    updateControls();
  } catch (error) {
    console.error('Error during undo:', error);
  }
});

elements.redo.addEventListener("click", () => {
  if (!redoHistory.length) return;
  
  try {
    const redo = redoHistory.pop();
    imageHistory.push(redo);
    ctx.putImageData(redo, 0, 0);
    updateControls();
  } catch (error) {
    console.error('Error during redo:', error);
  }
});

elements.applyPreset.addEventListener("click", () => {
  elements.blackLevel.value = 30;
  elements.midLevel.value = 1;
  elements.whiteLevel.value = 225;
  elements.blur.value = 5;
  elements.grainSize.value = 1;
  elements.grainStrength.value = 0.3;
  elements.overlayMode.checked = true;
  applyEffects();
});

updateControls();