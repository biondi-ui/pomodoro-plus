(() => {
  const DURATIONS = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };
  const LABELS = { focus: "Enfoque", short: "Descanso corto", long: "Descanso largo" };
  const STORAGE_KEY = "pomodoroPlusState";

  const timeEl = document.getElementById("time");
  const sessionLabelEl = document.getElementById("sessionLabel");
  const startPauseBtn = document.getElementById("startPause");
  const resetBtn = document.getElementById("reset");
  const ringProgress = document.querySelector(".ring-progress");
  const modeBtns = document.querySelectorAll(".mode-btn");
  const ambientBtns = document.querySelectorAll(".ambient-btn");
  const volumeSlider = document.getElementById("volume");
  const statSessions = document.getElementById("statSessions");
  const statFocusTime = document.getElementById("statFocusTime");
  const statStreak = document.getElementById("statStreak");
  const resetStatsBtn = document.getElementById("resetStats");
  const taskForm = document.getElementById("taskForm");
  const taskInput = document.getElementById("taskInput");
  const taskList = document.getElementById("taskList");

  const CIRCUMFERENCE = 2 * Math.PI * 100;
  ringProgress.style.strokeDasharray = `${CIRCUMFERENCE}`;

  let mode = "focus";
  let secondsLeft = DURATIONS[mode];
  let running = false;
  let intervalId = null;
  let activeTaskId = null;

  let tasks = [];
  let stats = { date: todayKey(), sessions: 0, focusMinutes: 0, streak: 0 };

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function loadState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (Array.isArray(raw.tasks)) tasks = raw.tasks;
      if (raw.stats) stats = raw.stats;
      if (stats.date !== todayKey()) {
        stats.date = todayKey();
        stats.sessions = 0;
        stats.focusMinutes = 0;
      }
    } catch (e) {
      /* ignore corrupt storage */
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks, stats }));
  }

  function renderStats() {
    statSessions.textContent = stats.sessions;
    statFocusTime.textContent = `${stats.focusMinutes}m`;
    statStreak.textContent = stats.streak;
  }

  function formatTime(total) {
    const m = Math.floor(total / 60).toString().padStart(2, "0");
    const s = Math.floor(total % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function updateRing() {
    const total = DURATIONS[mode];
    const fraction = secondsLeft / total;
    ringProgress.style.strokeDashoffset = `${CIRCUMFERENCE * (1 - fraction)}`;
  }

  function renderTime() {
    timeEl.textContent = formatTime(secondsLeft);
    sessionLabelEl.textContent = LABELS[mode];
    updateRing();
  }

  function setMode(newMode, resetTimer = true) {
    mode = newMode;
    modeBtns.forEach((btn) => btn.classList.toggle("active", btn.dataset.mode === mode));
    if (resetTimer) {
      pause();
      secondsLeft = DURATIONS[mode];
      renderTime();
    }
  }

  function tick() {
    secondsLeft -= 1;
    if (secondsLeft <= 0) {
      completeSession();
      return;
    }
    renderTime();
  }

  function completeSession() {
    pause();
    playChime();

    if (mode === "focus") {
      stats.sessions += 1;
      stats.focusMinutes += Math.round(DURATIONS.focus / 60);
      stats.streak += 1;
      if (activeTaskId) {
        const task = tasks.find((t) => t.id === activeTaskId);
        if (task) task.pomodoros = (task.pomodoros || 0) + 1;
      }
      renderTasks();
      const nextMode = stats.sessions % 4 === 0 ? "long" : "short";
      setMode(nextMode);
    } else {
      setMode("focus");
    }
    renderStats();
    saveState();
  }

  function playChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.0001;
      osc.connect(gain).connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.3, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.65);
      osc.onended = () => ctx.close();
    } catch (e) {
      /* audio unavailable */
    }
  }

  function start() {
    if (running) return;
    running = true;
    startPauseBtn.textContent = "Pausar";
    intervalId = setInterval(tick, 1000);
  }

  function pause() {
    running = false;
    startPauseBtn.textContent = "Iniciar";
    clearInterval(intervalId);
  }

  function resetTimer() {
    pause();
    secondsLeft = DURATIONS[mode];
    renderTime();
  }

  startPauseBtn.addEventListener("click", () => {
    running ? pause() : start();
  });

  resetBtn.addEventListener("click", resetTimer);

  modeBtns.forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });

  resetStatsBtn.addEventListener("click", () => {
    stats = { date: todayKey(), sessions: 0, focusMinutes: 0, streak: 0 };
    renderStats();
    saveState();
  });

  // ---- Tasks ----
  function renderTasks() {
    taskList.innerHTML = "";
    if (tasks.length === 0) {
      const hint = document.createElement("li");
      hint.className = "empty-hint";
      hint.textContent = "Sin tareas todavía. Agrega una para enfocarte.";
      taskList.appendChild(hint);
      return;
    }
    tasks.forEach((task) => {
      const li = document.createElement("li");
      li.className = "task-item" + (task.done ? " done" : "") + (task.id === activeTaskId ? " active-task" : "");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = !!task.done;
      checkbox.addEventListener("change", () => {
        task.done = checkbox.checked;
        renderTasks();
        saveState();
      });

      const text = document.createElement("span");
      text.className = "task-text";
      text.textContent = task.text;
      text.title = "Clic para marcar como tarea activa";
      text.style.cursor = "pointer";
      text.addEventListener("click", () => {
        activeTaskId = task.id;
        renderTasks();
      });

      const pomoCount = document.createElement("span");
      pomoCount.className = "pomo-count";
      pomoCount.textContent = task.pomodoros ? `🍅 x${task.pomodoros}` : "";

      const delBtn = document.createElement("button");
      delBtn.textContent = "✕";
      delBtn.addEventListener("click", () => {
        tasks = tasks.filter((t) => t.id !== task.id);
        if (activeTaskId === task.id) activeTaskId = null;
        renderTasks();
        saveState();
      });

      li.appendChild(checkbox);
      li.appendChild(text);
      li.appendChild(pomoCount);
      li.appendChild(delBtn);
      taskList.appendChild(li);
    });
  }

  taskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = taskInput.value.trim();
    if (!value) return;
    tasks.push({ id: Date.now().toString(36), text: value, done: false, pomodoros: 0 });
    taskInput.value = "";
    renderTasks();
    saveState();
  });

  // ---- Ambient sound (generated via Web Audio API, no external files) ----
  let audioCtx = null;
  let noiseSource = null;
  let gainNode = null;
  let currentSound = "none";

  function ensureAudioCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      gainNode = audioCtx.createGain();
      gainNode.gain.value = parseFloat(volumeSlider.value);
      gainNode.connect(audioCtx.destination);
    }
    return audioCtx;
  }

  function makeNoiseBuffer(ctx) {
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  function stopAmbient() {
    if (noiseSource) {
      noiseSource.stop();
      noiseSource.disconnect();
      noiseSource = null;
    }
  }

  function startAmbient(kind) {
    stopAmbient();
    if (kind === "none") return;
    const ctx = ensureAudioCtx();
    const buffer = makeNoiseBuffer(ctx);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    if (kind === "rain" || kind === "waves") {
      filter.type = "lowpass";
      filter.frequency.value = kind === "rain" ? 1200 : 500;
    } else {
      filter.type = "allpass";
    }

    source.connect(filter).connect(gainNode);

    if (kind === "waves") {
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.15;
      lfoGain.gain.value = 0.15;
      lfo.connect(lfoGain).connect(gainNode.gain);
      lfo.start();
    }

    source.start();
    noiseSource = source;
  }

  ambientBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      ambientBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentSound = btn.dataset.sound;
      startAmbient(currentSound);
    });
  });

  volumeSlider.addEventListener("input", () => {
    if (gainNode) gainNode.gain.value = parseFloat(volumeSlider.value);
  });

  // ---- Init ----
  loadState();
  renderStats();
  renderTasks();
  renderTime();
})();
