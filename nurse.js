(() => {
  "use strict";

  const steps = [
    {
      key: "N",
      name: "Notice",
      short: "Notice the signs. Try to wake them.",
      detail: "Look for very slow or stopped breathing, pinpoint pupils, choking or gurgling sounds, pale or blue skin, or a person who will not wake.",
      cue: "Shout their name. Rub your knuckles firmly on the center of their chest.",
    },
    {
      key: "U",
      name: "Use",
      short: "Use naloxone. Call 911 now.",
      detail: "Give naloxone if it is available, then call 911. Tell the dispatcher the person is not responding or is not breathing normally.",
      cue: "Call 911 even if the person wakes up. Naloxone can wear off before the opioid does.",
    },
    {
      key: "R",
      name: "Restore",
      short: "Restore breathing. CPR if trained.",
      detail: "Support breathing with rescue breaths or CPR if you are trained. Follow the dispatcher’s instructions and use an AED if one is available.",
      cue: "Airway and breathing come first while help is on the way.",
    },
    {
      key: "S",
      name: "Side",
      short: "Side position. Stay with them.",
      detail: "If they are breathing, place them on their side with the top knee bent and their face turned toward the floor to help keep the airway clear.",
      cue: "Do not leave them alone. Keep watching their breathing.",
    },
    {
      key: "E",
      name: "Evaluate",
      short: "Evaluate again in 2–3 minutes.",
      detail: "If there is no response or normal breathing after 2–3 minutes, give another naloxone dose if one is available and continue support.",
      cue: "Use the response timer below as a prompt, not as a replacement for 911 guidance.",
    },
    {
      key: "0",
      name: "Zero delay",
      short: "Zero time to waste. Support the handoff.",
      detail: "Stay until emergency help takes over. Tell responders what you saw, when naloxone was given, and any changes in breathing or responsiveness.",
      cue: "Keep the naloxone package nearby so responders know the dose and product used.",
    },
  ];

  const state = {
    mode: document.body.dataset.initialMode === "respond" ? "respond" : "explore",
    selected: 0,
    completed: new Set(),
    elapsed: 0,
    running: false,
    doses: [],
    interval: null,
  };

  const one = (selector) => document.querySelector(selector);
  const all = (selector) => Array.from(document.querySelectorAll(selector));
  const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  const nodes = {
    room: one("#response-room"),
    status: one("[data-status]"),
    statusPip: one("[data-status-pip]"),
    guidanceLabel: one("[data-guidance-label]"),
    stepCount: one("[data-step-count]"),
    coreLetter: one("[data-core-letter]"),
    coreTitle: one("[data-core-title]"),
    coreDetail: one("[data-core-detail]"),
    coreCue: one("[data-core-cue]"),
    complete: one("[data-complete]"),
    next: one("[data-next]"),
    timer: one("[data-timer]"),
    timerToggle: one("[data-timer-toggle]"),
    doseCount: one("[data-dose-count]"),
    handoffElapsed: one("[data-handoff-elapsed]"),
    handoffDoses: one("[data-handoff-doses]"),
    handoffCompleted: one("[data-handoff-completed]"),
    doseLog: one("[data-dose-log]"),
    copy: one("[data-copy]"),
    copyStatus: one("[data-copy-status]"),
    companionPanel: one("#nurse-companion-panel"),
    companionToggle: one("[data-companion-toggle]"),
    companionLabel: one("[data-companion-label]"),
    companionTitle: one("[data-companion-title]"),
    companionCue: one("[data-companion-cue]"),
  };

  const updateTimer = () => {
    const time = formatTime(state.elapsed);
    nodes.timer.textContent = time;
    nodes.handoffElapsed.textContent = time;
    nodes.status.textContent = state.running ? `Response active · ${time}` : "Response system ready";
    nodes.statusPip.classList.toggle("is-live", state.running);
    nodes.timerToggle.textContent = state.running ? "Pause" : "Start";
  };

  const updateHandoff = () => {
    nodes.doseCount.textContent = String(state.doses.length);
    nodes.handoffDoses.textContent = state.doses.length ? `${state.doses.length} dose${state.doses.length === 1 ? "" : "s"}` : "Not logged";
    nodes.handoffCompleted.textContent = state.completed.size ? Array.from(state.completed).sort().map((index) => steps[index].key).join(" · ") : "No steps marked";
    nodes.doseLog.replaceChildren();
    if (!state.doses.length) {
      const empty = document.createElement("span");
      empty.className = "dose-log__empty";
      empty.textContent = "Naloxone times will appear here when you log them.";
      nodes.doseLog.append(empty);
      return;
    }
    state.doses.forEach((dose, index) => {
      const item = document.createElement("span");
      item.textContent = `Dose ${index + 1} · ${dose}`;
      nodes.doseLog.append(item);
    });
  };

  const updateStep = () => {
    const step = steps[state.selected];
    nodes.stepCount.textContent = `${state.selected + 1} / ${steps.length}`;
    nodes.coreLetter.textContent = step.key;
    nodes.coreTitle.textContent = step.short;
    nodes.coreDetail.textContent = step.detail;
    nodes.coreCue.textContent = step.cue;
    nodes.companionTitle.textContent = step.short;
    nodes.companionCue.textContent = step.cue;
    nodes.complete.textContent = state.completed.has(state.selected) ? "Mark not done" : "Mark complete";
    nodes.next.hidden = state.selected === steps.length - 1;

    all("[data-step]").forEach((cube) => {
      const index = Number(cube.dataset.step);
      const selected = index === state.selected;
      cube.classList.toggle("is-selected", selected);
      cube.setAttribute("aria-pressed", String(selected));
      cube.querySelector("[data-done]").hidden = !state.completed.has(index);
    });

    all("[data-companion-step]").forEach((button) => {
      button.classList.toggle("is-active", Number(button.dataset.companionStep) === state.selected);
    });
  };

  const updateMode = () => {
    nodes.room.classList.toggle("is-active", state.mode === "respond");
    nodes.guidanceLabel.textContent = state.mode === "respond" ? "Live guidance" : "Tap a cube";
    all("[data-mode]").forEach((button) => button.classList.toggle("is-active", button.dataset.mode === state.mode));
  };

  const setRunning = (running) => {
    state.running = running;
    if (state.interval) window.clearInterval(state.interval);
    state.interval = null;
    if (running) {
      state.interval = window.setInterval(() => {
        state.elapsed += 1;
        updateTimer();
      }, 1000);
    }
    updateTimer();
  };

  const startResponse = () => {
    state.mode = "respond";
    updateMode();
    setRunning(true);
    nodes.room.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  const setCompanion = (open) => {
    nodes.companionPanel.hidden = !open;
    nodes.companionToggle.setAttribute("aria-expanded", String(open));
    nodes.companionLabel.textContent = open ? "Close companion" : "Ask the companion";
    if (open) nodes.companionPanel.querySelector("button").focus();
    else nodes.companionToggle.focus();
  };

  all("[data-step]").forEach((button) => button.addEventListener("click", () => {
    state.selected = Number(button.dataset.step);
    updateStep();
  }));

  all("[data-companion-step]").forEach((button) => button.addEventListener("click", () => {
    state.selected = Number(button.dataset.companionStep);
    updateStep();
  }));

  all("[data-start]").forEach((button) => button.addEventListener("click", startResponse));
  all("[data-mode]").forEach((button) => button.addEventListener("click", () => {
    state.mode = button.dataset.mode;
    if (state.mode === "respond") setRunning(true);
    updateMode();
  }));

  nodes.complete.addEventListener("click", () => {
    if (state.completed.has(state.selected)) state.completed.delete(state.selected);
    else state.completed.add(state.selected);
    updateStep();
    updateHandoff();
  });

  nodes.next.addEventListener("click", () => {
    state.selected = Math.min(steps.length - 1, state.selected + 1);
    updateStep();
  });

  nodes.timerToggle.addEventListener("click", () => setRunning(!state.running));
  one("[data-timer-reset]").addEventListener("click", () => {
    state.elapsed = 0;
    setRunning(false);
    updateHandoff();
  });

  one("[data-dose]").addEventListener("click", () => {
    if (!state.running) setRunning(true);
    state.doses.push(formatTime(state.elapsed));
    state.selected = 4;
    updateStep();
    updateHandoff();
  });

  nodes.copy.addEventListener("click", async () => {
    nodes.copy.disabled = true;
    nodes.copy.textContent = "Preparing handoff…";
    const summary = [
      "NURSE 0 emergency handoff",
      `Elapsed response time: ${formatTime(state.elapsed)}`,
      `Naloxone doses logged: ${state.doses.length ? state.doses.join(", ") : "none logged"}`,
      `Steps marked complete: ${state.completed.size ? Array.from(state.completed).sort().map((index) => steps[index].key).join(", ") : "none"}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(summary);
      nodes.copy.textContent = "Handoff copied";
      nodes.copyStatus.textContent = "";
      window.setTimeout(() => {
        nodes.copy.textContent = "Copy handoff";
        nodes.copy.disabled = false;
      }, 1800);
    } catch {
      nodes.copy.textContent = "Copy handoff";
      nodes.copy.disabled = false;
      nodes.copyStatus.textContent = "Copy was blocked. Select the record above and copy it manually.";
      nodes.copyStatus.classList.add("is-error");
    }
  });

  nodes.companionToggle.addEventListener("click", () => setCompanion(nodes.companionPanel.hidden));
  one("[data-companion-close]").addEventListener("click", () => setCompanion(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !nodes.companionPanel.hidden) setCompanion(false);
  });

  if (state.mode === "respond") nodes.room.classList.add("is-active");
  updateMode();
  updateStep();
  updateTimer();
  updateHandoff();
})();
