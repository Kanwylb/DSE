const timerDisplay = document.getElementById('timerDisplay');
const timerHint = document.getElementById('timerHint');
const buttons = Array.from(document.querySelectorAll('button[data-minutes]'));
const pauseToggleBtn = document.getElementById('pauseToggleBtn');
let countdownInterval = null;
let endTime = null;
let currentLabel = '';
let currentModeMinutes = 0;
let originalTotalSeconds = 0;
let remainingSeconds = 0;
let audioContext = null;
let isPaused = false;

function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

function playTone(duration = 0.18, frequency = 880, type = 'sine', volume = 0.25) {
  const ctx = ensureAudioContext();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = 0;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.01);
  oscillator.start(now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  oscillator.stop(now + duration + 0.02);
}

function playAlert(duration = 3, volume = 0.22) {
  const ctx = ensureAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 880;
  gain.gain.value = 0.0001;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;
  const pulses = [0, 0.7, 1.4];
  pulses.forEach(start => {
    gain.gain.setValueAtTime(0.0001, now + start);
    gain.gain.linearRampToValueAtTime(volume, now + start + 0.02);
    gain.gain.setValueAtTime(volume, now + start + 0.18);
    gain.gain.linearRampToValueAtTime(0.0001, now + start + 0.2);
  });
  osc.start(now);
  osc.stop(now + duration + 0.05);
}

function formatTime(seconds) {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

function resetActiveButtons() {
  buttons.forEach(btn => btn.classList.remove('active'));
}

function startCountdown(totalSeconds, label, resume = false) {
  clearInterval(countdownInterval);
  isPaused = false;
  if (!resume) {
    originalTotalSeconds = totalSeconds;
    currentModeMinutes = totalSeconds / 60;
    remainingSeconds = totalSeconds;
    alertState.fiveMinute = false;
    alertState.oneMinute = false;
  } else {
    totalSeconds = remainingSeconds;
  }
  currentLabel = label;
  const now = Date.now();
  endTime = now + remainingSeconds * 1000;
  resetActiveButtons();
  const activeButton = buttons.find(btn => btn.dataset.minutes === String(currentModeMinutes));
  if (activeButton) activeButton.classList.add('active');
  updateDisplay(remainingSeconds, label);
  countdownInterval = setInterval(() => {
    const remainingMs = endTime - Date.now();
    const currentSec = Math.max(0, Math.ceil(remainingMs / 1000));
    remainingSeconds = currentSec;
    handleAlerts(currentSec, originalTotalSeconds);
    updateDisplay(currentSec, label);
    if (currentSec <= 0) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      isPaused = false;
      updateControlButtons();
      timerHint.textContent = `${label} 已结束，请选择下一项。`;
      pauseToggleBtn.disabled = true;
      pauseToggleBtn.textContent = '暂停 / 开始';
      playAlert(3, 0.25);
    }
  }, 200);
  updateControlButtons();
}

const alertState = {
  fiveMinute: false,
  oneMinute: false,
  endPlayed: false,
};

function handleAlerts(remainingSec, totalSeconds) {
  if (remainingSec <= 0) return;
  if (totalSeconds === 600) {
    if (remainingSec <= 300 && !alertState.fiveMinute) {
      alertState.fiveMinute = true;
      playTone(0.15, 880, 'sine', 0.25);
    }
  }
  if ((totalSeconds === 600 || totalSeconds === 480 || totalSeconds === 360) && remainingSec <= 60 && !alertState.oneMinute) {
    alertState.oneMinute = true;
    playTone(0.15, 880, 'sine', 0.24);
  }
}

function updateDisplay(seconds, label) {
  if (seconds === 0) {
    timerDisplay.textContent = '00:00';
    timerDisplay.classList.remove('danger', 'flashing');
    return;
  }
  timerDisplay.textContent = formatTime(seconds);
  timerHint.textContent = isPaused ? `${label} 已暂停` : `${label} 剩余时间`;
  if (seconds <= 10 && !isPaused) {
    timerDisplay.classList.add('danger', 'flashing');
  } else {
    timerDisplay.classList.remove('danger', 'flashing');
  }
}

buttons.forEach(button => {
  button.addEventListener('click', () => {
    const minutes = Number(button.dataset.minutes);
    const seconds = minutes * 60;
    const labelMap = {
      '10': '10分钟准备',
      '8': '8分钟讨论',
      '6': '6分钟讨论',
      '1': '1分钟个人问答',
    };
    const label = labelMap[String(minutes)] || `${minutes} 分钟模式`;
    startCountdown(seconds, label);
    playTone(0.08, 880, 'sine', 0.18);
  });
});

pauseToggleBtn.addEventListener('click', () => {
  if (!countdownInterval && !isPaused) return;
  if (isPaused) {
    startCountdown(remainingSeconds, currentLabel, true);
  } else {
    clearInterval(countdownInterval);
    countdownInterval = null;
    isPaused = true;
    timerHint.textContent = `${currentLabel} 已暂停`;
    timerDisplay.classList.remove('flashing');
    updateControlButtons();
  }
});

function updateControlButtons() {
  pauseToggleBtn.disabled = !countdownInterval && !isPaused;
  pauseToggleBtn.textContent = isPaused ? '开始' : '暂停';
}

window.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    clearInterval(countdownInterval);
    countdownInterval = null;
    isPaused = false;
    remainingSeconds = 0;
    currentLabel = '';
    timerHint.textContent = '已停止计时，请选择一个模式开始。';
    timerDisplay.classList.remove('danger', 'flashing');
    timerDisplay.textContent = '00:00';
    resetActiveButtons();
    updateControlButtons();
  }
});
