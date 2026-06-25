// ---- 状態管理 ----
const STORAGE_KEY = "simple-alarm:alarms";
let alarms = loadAlarms();

const clockEl = document.getElementById("clock");
const listEl = document.getElementById("alarm-list");
const formEl = document.getElementById("setter");
const timeInput = document.getElementById("time-input");
const ringingEl = document.getElementById("ringing");
const ringingTimeEl = document.getElementById("ringing-time");
const stopBtn = document.getElementById("stop-btn");

let audioCtx = null;
let ringTimer = null;

// ---- 永続化 ----
function loadAlarms() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveAlarms() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
}

// ---- 描画 ----
function render() {
  listEl.innerHTML = "";
  alarms
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time))
    .forEach((alarm) => {
      const li = document.createElement("li");
      li.className = "alarm-item" + (alarm.triggered ? " done" : "");

      const time = document.createElement("span");
      time.className = "time";
      time.textContent = alarm.time;

      const del = document.createElement("button");
      del.className = "delete-btn";
      del.setAttribute("aria-label", "削除");
      del.textContent = "×";
      del.addEventListener("click", () => removeAlarm(alarm.id));

      li.append(time, del);
      listEl.append(li);
    });
}

// ---- アラーム操作 ----
function addAlarm(time) {
  if (alarms.some((a) => a.time === time && !a.triggered)) return;
  alarms.push({ id: Date.now(), time, triggered: false });
  saveAlarms();
  render();
}

function removeAlarm(id) {
  alarms = alarms.filter((a) => a.id !== id);
  saveAlarms();
  render();
}

// ---- 時計と監視 ----
function tick() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  clockEl.textContent = `${hh}:${mm}:${ss}`;

  const current = `${hh}:${mm}`;
  alarms.forEach((alarm) => {
    if (!alarm.triggered && alarm.time === current && ss === "00") {
      alarm.triggered = true;
      saveAlarms();
      render();
      trigger(alarm.time);
    }
  });
}

// ---- 鳴動 ----
function trigger(time) {
  ringingTimeEl.textContent = time;
  ringingEl.hidden = false;
  startBeep();
}

function startBeep() {
  stopBeep();
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const beep = () => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.4);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
  };
  beep();
  ringTimer = setInterval(beep, 800);
}

function stopBeep() {
  if (ringTimer) clearInterval(ringTimer);
  ringTimer = null;
  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
  }
}

function stopRinging() {
  ringingEl.hidden = true;
  stopBeep();
}

// ---- イベント ----
formEl.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!timeInput.value) return;
  addAlarm(timeInput.value);
  timeInput.value = "";
});

stopBtn.addEventListener("click", stopRinging);

// ---- 起動 ----
render();
tick();
setInterval(tick, 1000);
