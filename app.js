// --- Internacionalização ---
const translations = {
    pt: {
        title: "Binaural Experience",
        support: "Seu navegador não suporta Web Audio API.",
        tutorial: "O áudio binaural utiliza frequências diferentes em cada ouvido para criar efeitos no cérebro. Use fones de ouvido para melhor experiência.",
        preset: "Preset:",
        presets: [
            "Padrão (16-40Hz)",
            "Foco (12-20Hz)",
            "Relaxamento (4-8Hz)"
        ],
        start: "Iniciar",
        pause: "Pausar",
        resume: "Retomar",
        stop: "Parar",
        volume: "Volume",
        freq: freq => `Frequência Direita: ${freq} Hz`,
        diff: diff => `Diferença Binaural: ${diff} Hz`
    },
    en: {
        title: "Binaural Experience",
        support: "Your browser does not support Web Audio API.",
        tutorial: "Binaural audio uses different frequencies in each ear to create brainwave effects. Use headphones for best experience.",
        preset: "Preset:",
        presets: [
            "Default (16-40Hz)",
            "Focus (12-20Hz)",
            "Relaxation (4-8Hz)"
        ],
        start: "Start",
        pause: "Pause",
        resume: "Resume",
        stop: "Stop",
        volume: "Volume",
        freq: freq => `Right Frequency: ${freq} Hz`,
        diff: diff => `Binaural Difference: ${diff} Hz`
    }
};

let lang = 'pt';
function t(key, ...args) {
    const val = translations[lang][key];
    return typeof val === 'function' ? val(...args) : val;
}

// --- Presets ---
const presets = {
    default: { left: 659, rightStart: 675, rightEnd: 699, duration: 20*60, total: 40*60 },
    focus:   { left: 400, rightStart: 412, rightEnd: 420, duration: 10*60, total: 20*60 },
    relax:   { left: 200, rightStart: 204, rightEnd: 208, duration: 10*60, total: 20*60 }
};

// --- Custom Presets ---
function getCustomPresets() {
    return JSON.parse(localStorage.getItem('customPresets') || '[]');
}
function saveCustomPresets(presetsArr) {
    localStorage.setItem('customPresets', JSON.stringify(presetsArr));
}
function addCustomPreset(preset) {
    const arr = getCustomPresets();
    arr.push(preset);
    saveCustomPresets(arr);
}
function removeCustomPreset(index) {
    const arr = getCustomPresets();
    arr.splice(index, 1);
    saveCustomPresets(arr);
}

function updatePresetSelect() {
    // Limpa e adiciona opções padrão
    presetSelect.innerHTML = '';
    const defaultKeys = Object.keys(presets);
    defaultKeys.forEach((key, i) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = t('presets')[i] || key;
        presetSelect.appendChild(opt);
    });
    // Adiciona customizados
    const customs = getCustomPresets();
    customs.forEach((preset, i) => {
        const opt = document.createElement('option');
        opt.value = 'custom_' + i;
        opt.textContent = preset.name + ' (Custom)';
        presetSelect.appendChild(opt);
    });
}

let leftFrequency = presets.default.left;
let startRightFrequency = presets.default.rightStart;
let maxRightFrequency = presets.default.rightEnd;
let duration = presets.default.duration;
let totalDuration = presets.default.total;
let frequencyIncrement = (maxRightFrequency - startRightFrequency) / duration;

let currentFrequency = startRightFrequency;
let elapsedTime = 0;
let leftOscillator, rightOscillator;
let isPlaying = false;
let isPaused = false;
let intervalId;
let chartData = [];

const startButton = document.getElementById('startBtn');
const pauseResumeButton = document.getElementById('pauseResumeBtn');
const stopButton = document.getElementById('stopBtn');
const volumeControl = document.getElementById('volumeControl');
const progressBar = document.getElementById('progressBar');
const frequencyDisplay = document.getElementById('frequencyDisplay');
const binauralDiffDisplay = document.getElementById('binauralDiffDisplay');
const currentTimeLabel = document.getElementById('currentTime');
const totalTimeLabel = document.getElementById('totalTime');
const supportWarning = document.getElementById('supportWarning');
const supportText = document.getElementById('supportText');
const tutorial = document.getElementById('tutorial');
const tutorialText = document.getElementById('tutorialText');
const presetSelect = document.getElementById('presetSelect');
const presetLabel = document.getElementById('presetLabel');
const appTitle = document.getElementById('appTitle');
const volumeLabel = document.getElementById('volumeLabel');
const langPT = document.getElementById('langPT');
const langEN = document.getElementById('langEN');
const binauralChart = document.getElementById('binauralChart');

// --- UI para adicionar preset ---
const addPresetBtn = document.createElement('button');
addPresetBtn.textContent = '+';
addPresetBtn.title = 'Adicionar novo preset';
addPresetBtn.style.marginLeft = '8px';
addPresetBtn.style.fontWeight = 'bold';
addPresetBtn.style.fontSize = '1.2em';
addPresetBtn.style.background = '#f1f5fd';
addPresetBtn.style.color = '#2563eb';
addPresetBtn.style.border = '1px solid #cbd5e1';
addPresetBtn.style.borderRadius = '6px';
addPresetBtn.style.cursor = 'pointer';
addPresetBtn.style.padding = '0 10px';
addPresetBtn.style.height = '32px';
document.querySelector('.presets').appendChild(addPresetBtn);

const modal = document.createElement('div');
modal.style.display = 'none';
modal.style.position = 'fixed';
modal.style.top = '0';
modal.style.left = '0';
modal.style.width = '100vw';
modal.style.height = '100vh';
modal.style.background = 'rgba(0,0,0,0.25)';
modal.style.justifyContent = 'center';
modal.style.alignItems = 'center';
modal.style.zIndex = '1000';
modal.innerHTML = `
  <form id="customPresetForm" style="background:#fff;padding:24px 18px;border-radius:12px;box-shadow:0 4px 24px #2563eb22;display:flex;flex-direction:column;gap:10px;min-width:260px;max-width:90vw;">
    <h3 style="margin:0 0 8px 0;color:#2563eb;">Novo Preset</h3>
    <input name="name" placeholder="Nome" required style="padding:6px;border-radius:5px;border:1px solid #cbd5e1;" />
    <input name="left" type="number" placeholder="Frequência Esquerda (Hz)" required min="20" max="2000" step="1" style="padding:6px;border-radius:5px;border:1px solid #cbd5e1;" />
    <input name="rightStart" type="number" placeholder="Frequência Direita Inicial (Hz)" required min="20" max="2000" step="1" style="padding:6px;border-radius:5px;border:1px solid #cbd5e1;" />
    <input name="rightEnd" type="number" placeholder="Frequência Direita Final (Hz)" required min="20" max="2000" step="1" style="padding:6px;border-radius:5px;border:1px solid #cbd5e1;" />
    <input name="duration" type="number" placeholder="Duração (segundos)" required min="10" max="7200" step="1" style="padding:6px;border-radius:5px;border:1px solid #cbd5e1;" />
    <input name="total" type="number" placeholder="Duração Total (segundos)" required min="10" max="7200" step="1" style="padding:6px;border-radius:5px;border:1px solid #cbd5e1;" />
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button type="button" id="cancelPresetBtn" style="background:#eee;color:#222;border:none;padding:6px 16px;border-radius:5px;">Cancelar</button>
      <button type="submit" style="background:#2563eb;color:#fff;border:none;padding:6px 16px;border-radius:5px;">Salvar</button>
    </div>
  </form>
`;
document.body.appendChild(modal);

addPresetBtn.onclick = () => { modal.style.display = 'flex'; };
modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
document.getElementById('cancelPresetBtn').onclick = () => { modal.style.display = 'none'; };
document.getElementById('customPresetForm').onsubmit = function(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(this));
    const preset = {
        name: data.name,
        left: Number(data.left),
        rightStart: Number(data.rightStart),
        rightEnd: Number(data.rightEnd),
        duration: Number(data.duration),
        total: Number(data.total)
    };
    addCustomPreset(preset);
    updatePresetSelect();
    modal.style.display = 'none';
    presetSelect.value = 'custom_' + (getCustomPresets().length - 1);
    setPreset(presetSelect.value);
};

// --- Presets ---
function setPreset(presetKey) {
    if (presetKey.startsWith('custom_')) {
        const customs = getCustomPresets();
        const idx = parseInt(presetKey.replace('custom_', ''));
        const preset = customs[idx];
        leftFrequency = preset.left;
        startRightFrequency = preset.rightStart;
        maxRightFrequency = preset.rightEnd;
        duration = preset.duration;
        totalDuration = preset.total;
        frequencyIncrement = (maxRightFrequency - startRightFrequency) / duration;
        currentFrequency = startRightFrequency;
        elapsedTime = 0;
        totalTimeLabel.textContent = formatTime(totalDuration);
        updateUI();
        chartData = [];
        drawChart();
        return;
    }
    const preset = presets[presetKey];
    leftFrequency = preset.left;
    startRightFrequency = preset.rightStart;
    maxRightFrequency = preset.rightEnd;
    duration = preset.duration;
    totalDuration = preset.total;
    frequencyIncrement = (maxRightFrequency - startRightFrequency) / duration;
    currentFrequency = startRightFrequency;
    elapsedTime = 0;
    totalTimeLabel.textContent = formatTime(totalDuration);
    updateUI();
    chartData = [];
    drawChart();
}

let audioContext = null;

function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function updateTexts() {
    appTitle.textContent = t('title');
    supportText.textContent = t('support');
    tutorialText.textContent = t('tutorial');
    presetLabel.textContent = t('preset');
    for (let i = 0; i < presetSelect.options.length; i++) {
        presetSelect.options[i].textContent = t('presets')[i];
    }
    startButton.textContent = t('start');
    pauseResumeButton.textContent = isPaused ? t('resume') : t('pause');
    stopButton.textContent = t('stop');
    volumeLabel.textContent = t('volume');
    updateFrequencyDisplay();
    showBinauralDifference();
    updatePresetSelect();
}

function setPreset(presetKey) {
    if (presetKey.startsWith('custom_')) {
        const customs = getCustomPresets();
        const idx = parseInt(presetKey.replace('custom_', ''));
        const preset = customs[idx];
        leftFrequency = preset.left;
        startRightFrequency = preset.rightStart;
        maxRightFrequency = preset.rightEnd;
        duration = preset.duration;
        totalDuration = preset.total;
        frequencyIncrement = (maxRightFrequency - startRightFrequency) / duration;
        currentFrequency = startRightFrequency;
        elapsedTime = 0;
        totalTimeLabel.textContent = formatTime(totalDuration);
        updateUI();
        chartData = [];
        drawChart();
        return;
    }
    const preset = presets[presetKey];
    leftFrequency = preset.left;
    startRightFrequency = preset.rightStart;
    maxRightFrequency = preset.rightEnd;
    duration = preset.duration;
    totalDuration = preset.total;
    frequencyIncrement = (maxRightFrequency - startRightFrequency) / duration;
    currentFrequency = startRightFrequency;
    elapsedTime = 0;
    totalTimeLabel.textContent = formatTime(totalDuration);
    updateUI();
    chartData = [];
    drawChart();
}

function createOscillator(frequency, panValue) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const panNode = audioContext.createStereoPanner();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    panNode.pan.value = panValue;
    oscillator.connect(panNode);
    panNode.connect(gainNode);
    gainNode.connect(audioContext.destination);

    return { oscillator, gainNode };
}

function setVolume(volume, fade = false) {
    if (leftOscillator && rightOscillator) {
        const now = audioContext.currentTime;
        if (fade) {
            leftOscillator.gainNode.gain.linearRampToValueAtTime(volume, now + 0.4);
            rightOscillator.gainNode.gain.linearRampToValueAtTime(volume, now + 0.4);
        } else {
            leftOscillator.gainNode.gain.setValueAtTime(volume, now);
            rightOscillator.gainNode.gain.setValueAtTime(volume, now);
        }
    }
}

function startAudio() {
    stopAudio();

    currentFrequency = startRightFrequency;
    elapsedTime = 0;
    chartData = [];

    leftOscillator = createOscillator(leftFrequency, -1);
    rightOscillator = createOscillator(currentFrequency, 1);

    leftOscillator.oscillator.start();
    rightOscillator.oscillator.start();

    setVolume(volumeControl.value, true);

    isPlaying = true;
    isPaused = false;
    startButton.disabled = true;
    pauseResumeButton.disabled = false;
    stopButton.disabled = false;
    pauseResumeButton.textContent = t('pause');
    updateUI();
    intervalId = setInterval(mainIntervalTick, 1000);
}

function pauseResumeAudio() {
    if (!isPlaying) return;
    if (!isPaused) {
        setVolume(0, true);
        clearInterval(intervalId);
        isPaused = true;
        pauseResumeButton.textContent = t('resume');
    } else {
        setVolume(volumeControl.value, true);
        isPaused = false;
        pauseResumeButton.textContent = t('pause');
        intervalId = setInterval(mainIntervalTick, 1000);
    }
}

function stopAudio() {
    if (leftOscillator && rightOscillator) {
        try { leftOscillator.oscillator.stop(); } catch {}
        try { rightOscillator.oscillator.stop(); } catch {}
    }
    isPlaying = false;
    isPaused = false;
    clearInterval(intervalId);
    startButton.disabled = false;
    pauseResumeButton.disabled = true;
    stopButton.disabled = true;
    pauseResumeButton.textContent = t('pause');
    setVolume(0);
    elapsedTime = 0;
    currentFrequency = startRightFrequency;
    updateUI();
}

function mainIntervalTick() {
    if (!isPaused && isPlaying) {
        updateFrequency();
        updateUI();
    }
}

function updateFrequency() {
    if (elapsedTime < duration) {
        currentFrequency += frequencyIncrement;
        if (currentFrequency > maxRightFrequency) currentFrequency = maxRightFrequency;
        rightOscillator.oscillator.frequency.setValueAtTime(currentFrequency, audioContext.currentTime);
        elapsedTime++;
    } else if (elapsedTime < totalDuration) {
        currentFrequency = maxRightFrequency;
        rightOscillator.oscillator.frequency.setValueAtTime(maxRightFrequency, audioContext.currentTime);
        elapsedTime++;
    } else {
        clearInterval(intervalId);
        stopAudio();
    }
    chartData.push(Math.abs(currentFrequency - leftFrequency));
    drawChart();
}

function updateUI() {
    const progress = Math.min(elapsedTime / totalDuration, 1);
    progressBar.value = progress;
    currentTimeLabel.textContent = formatTime(elapsedTime);
    updateFrequencyDisplay();
    showBinauralDifference();
    drawChart();
}

function updateFrequencyDisplay() {
    frequencyDisplay.textContent = t('freq', currentFrequency.toFixed(2));
}

function showBinauralDifference() {
    const diff = Math.abs(currentFrequency - leftFrequency);
    binauralDiffDisplay.textContent = t('diff', diff.toFixed(2));
}

function drawChart() {
    if (!binauralChart) return;
    const ctx = binauralChart.getContext('2d');
    ctx.clearRect(0, 0, binauralChart.width, binauralChart.height);
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const maxDiff = Math.max(...chartData, 40);
    for (let i = 0; i < chartData.length; i++) {
        const x = (i / totalDuration) * binauralChart.width;
        const y = binauralChart.height - (chartData[i] / maxDiff) * binauralChart.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // Eixos
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, binauralChart.height - 1);
    ctx.lineTo(binauralChart.width, binauralChart.height - 1);
    ctx.stroke();
}

volumeControl.addEventListener('input', (event) => {
    setVolume(event.target.value, true);
});

startButton.addEventListener('click', startAudio);
pauseResumeButton.addEventListener('click', pauseResumeAudio);
stopButton.addEventListener('click', stopAudio);

progressBar.addEventListener('input', (event) => {
    const progress = parseFloat(event.target.value);
    elapsedTime = Math.floor(progress * totalDuration);

    if (elapsedTime < duration) {
        currentFrequency = startRightFrequency + (elapsedTime * frequencyIncrement);
        if (currentFrequency > maxRightFrequency) currentFrequency = maxRightFrequency;
        if (currentFrequency < startRightFrequency) currentFrequency = startRightFrequency;
        if (rightOscillator && rightOscillator.oscillator) {
            rightOscillator.oscillator.frequency.setValueAtTime(currentFrequency, audioContext.currentTime);
        }
    } else if (elapsedTime < totalDuration) {
        currentFrequency = maxRightFrequency;
        if (rightOscillator && rightOscillator.oscillator) {
            rightOscillator.oscillator.frequency.setValueAtTime(maxRightFrequency, audioContext.currentTime);
        }
    }
    currentTimeLabel.textContent = formatTime(elapsedTime);
    updateFrequencyDisplay();
    showBinauralDifference();
    drawChart();
});

presetSelect.addEventListener('change', (e) => {
    setPreset(e.target.value);
});

langPT.addEventListener('click', () => {
    lang = 'pt';
    updateTexts();
});
langEN.addEventListener('click', () => {
    lang = 'en';
    updateTexts();
});

// --- Inicialização ---
function checkSupport() {
    if (!window.AudioContext && !window.webkitAudioContext) {
        supportWarning.style.display = '';
        startButton.disabled = true;
        pauseResumeButton.disabled = true;
        stopButton.disabled = true;
    } else {
        supportWarning.style.display = 'none';
        // Cria o audioContext se ainda não existir
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }
}

function init() {
    checkSupport();
    updatePresetSelect();
    setPreset('default');
    updateTexts();
    pauseResumeButton.disabled = true;
    stopButton.disabled = true;
    drawChart();
}

init();