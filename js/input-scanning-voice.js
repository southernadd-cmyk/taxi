/* ======================= storage ======================= */
function load(k, d) {
  try {
    const v = localStorage.getItem(k);
    return v == null ? d : JSON.parse(v);
  } catch (e) {
    return d;
  }
}
function store(k, v) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {}
}
const game = Object.assign(
  { speed: 1, wait: 0, cops: 1, sfx: true, cam: 0, flash: false, motion: false, gfx: 1, ui: 0, music: true, engine: true },
  load("switchcity-settings", {}),
);
function saveGameSettings() {
  store("switchcity-settings", game);
}
let cash = +load("switchcity-cash", 0) || 0;

/* ======================= access settings (shared manager if present) ======================= */
const localAcc = Object.assign(
  {
    autoScan: true,
    scanInterval: 2000,
    inputSensitivity: 100,
    parking: "off",
    parkLoops: 2,
    spaceBrake: true,
    waitForSpeech: true,
  },
  load("switchcity-access", {}),
);
function normParking(p) {
  p = String(p || "off").toLowerCase();
  return p.includes("auto") ? "auto" : p.includes("chos") || p.includes("when") ? "chosen" : "off";
}
function acc() {
  const M = window.NarbeScanManager;
  if (M && typeof M.getSettings === "function") {
    const s = M.getSettings() || {};
    return {
      auto: !!(s.autoScan ?? s.autoScanEnabled ?? s.auto),
      interval: typeof M.getScanInterval === "function" ? M.getScanInterval() : s.scanInterval || 2000,
      sens: typeof M.getInputSensitivity === "function" ? M.getInputSensitivity() : s.inputSensitivity || 100,
      parking: normParking(s.parking ?? s.parkingMode),
      loops: +(s.parkLoops ?? s.loopsBeforeParking ?? 2) || 2,
      brake: (s.spaceBrake ?? true) !== false,
      wait: !!(s.waitForSpeech ?? false),
    };
  }
  return {
    auto: localAcc.autoScan,
    interval: localAcc.scanInterval,
    sens: localAcc.inputSensitivity,
    parking: normParking(localAcc.parking),
    loops: localAcc.parkLoops,
    brake: localAcc.spaceBrake,
    wait: localAcc.waitForSpeech,
  };
}
function toggleAuto() {
  const M = window.NarbeScanManager;
  if (M && M.toggleAutoScan) M.toggleAutoScan();
  else {
    localAcc.autoScan = !localAcc.autoScan;
    store("switchcity-access", localAcc);
  }
}
function cycleSpeed() {
  const M = window.NarbeScanManager;
  if (M && M.cycleScanSpeed) M.cycleScanSpeed();
  else {
    localAcc.scanInterval = localAcc.scanInterval >= 5000 ? 1000 : localAcc.scanInterval + 1000;
    store("switchcity-access", localAcc);
  }
}
if (window.NarbeScanManager && NarbeScanManager.subscribe)
  NarbeScanManager.subscribe(() => {
    hints();
    Scan.retime();
  });

/* ======================= voice (shared manager if present) ======================= */
const localVoice = Object.assign({ tts: true, voice: "" }, load("switchcity-voice", {}));
function localVoices() {
  if (!("speechSynthesis" in window)) return [];
  const v = speechSynthesis.getVoices();
  const en = v.filter((x) => /^en/i.test(x.lang));
  return en.length ? en : v;
}
let finishLocalSpeech = null;
const Voice = {
  latest: null,
  enabled() {
    const M = window.NarbeVoiceManager;
    if (M && M.getSettings) return !!M.getSettings().ttsEnabled;
    return localVoice.tts;
  },
  toggle() {
    const M = window.NarbeVoiceManager;
    if (M && M.toggleTTS) M.toggleTTS();
    else {
      localVoice.tts = !localVoice.tts;
      if (!localVoice.tts) {
        finishLocalSpeech?.('disabled');
        if ('speechSynthesis' in window) speechSynthesis.cancel();
      }
      store("switchcity-voice", localVoice);
    }
  },
  cycle() {
    const M = window.NarbeVoiceManager;
    if (M && M.cycleVoice) return M.cycleVoice();
    const v = localVoices();
    if (!v.length) return;
    const i = v.findIndex((x) => x.name === localVoice.voice);
    localVoice.voice = v[(i + 1) % v.length].name;
    store("switchcity-voice", localVoice);
  },
  name() {
    const M = window.NarbeVoiceManager;
    if (M && M.getCurrentVoice) {
      const c = M.getCurrentVoice();
      return M.getVoiceDisplayName ? M.getVoiceDisplayName(c) : (c && c.name) || "Default";
    }
    const v = localVoices().find((x) => x.name === localVoice.voice);
    return v ? v.name.replace(/\(.*?\)/g, "").trim() : "Default";
  },
  // Owned speech completion; never block input and never wait forever.
  speak(text) {
    finishLocalSpeech?.("cancelled");
    const M = window.NarbeVoiceManager;
    const p = new Promise((resolve) => {
      if (!text || !Voice.enabled()) { resolve("disabled"); return; }
      let settled = false, cap, startup;
      const finish = (reason) => {
        if (settled) return;
        settled = true;
        clearTimeout(cap);
        clearTimeout(startup);
        if (finishLocalSpeech === finish) finishLocalSpeech = null;
        resolve(reason);
      };
      cap = setTimeout(() => finish("timeout"), Math.min(10000, 600 + text.length * 70));
      if (M && M.speak) {
        try {
          const ticket = M.speak(text);
          if (ticket?.finished) Promise.resolve(ticket.finished).then(
            result => finish(result?.reason || "ended"), () => finish("error")
          );
        } catch (_) { finish("error"); }
        return;
      }
      if (!("speechSynthesis" in window)) { finish("disabled"); return; }
      finishLocalSpeech = finish;
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.05;
        const v = localVoices().find(x => x.name === localVoice.voice);
        if (v) u.voice = v;
        u.onstart = () => clearTimeout(startup);
        u.onend = () => finish("ended");
        u.onerror = () => finish("error");
        startup = setTimeout(() => finish("error"), 1000);
        speechSynthesis.speak(u);
      } catch (_) { finish("error"); }
    });
    Voice.latest = p;
    return p;
  },
};

/* ======================= choice scanner (§4 contract) ======================= */
const Scan = (() => {
  // root lists: blank -1 step, parking. groups (rows): wrap through items plus one Back stop, no -1.
  let items = [],
    i = -1,
    host = null,
    parked = false,
    braked = false,
    brakeResume = false,
    loops = 0,
    ticket = 0,
    timer = null,
    pending = null,
    group = null,
    labelTok = 0;
  let enterHeld = false;
  let holdT = null,
    backT = null,
    backing = false;
  const isActive = () => items.length > 0;
  const atBack = () => group && i === items.length;
  function render() {
    if (!host) return;
    host.innerHTML = "";
    items.forEach((it, k) => {
      const b = document.createElement("button");
      b.type = "button";
      b.tabIndex = -1;
      b.className = "opt" + (k === i ? " on" : "") + (k === i && braked ? " braked" : "");
      b.innerHTML = it.html || it.label;
      b.setAttribute("aria-label", it.say || it.label);
      b.addEventListener("click", () => {
        direct(k);
      });
      host.appendChild(b);
    });
    host.classList.toggle("backstop", !!atBack());
    const on = host.querySelector(".on");
    if (on) on.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
    if (window.onScanRender)
      onScanRender(atBack() ? { focus: "⬅  BACK", say: "Back" } : i >= 0 ? items[i] : null, braked);
  }
  function clearTimers() {
    ticket++;
    clearTimeout(timer);
    timer = null;
  }
  function schedule() {
    clearTimers();
    const a = acc();
    if (!a.auto || parked || braked || enterHeld || !items.length) return;
    const t = ticket;
    const go = () => {
      if (t !== ticket) return;
      timer = setTimeout(() => {
        if (t === ticket) {
          move(1, true);
          schedule();
        }
      }, a.interval);
    };
    if (a.wait && pending) pending.then(go);
    else go();
  }
  function announce() {
    labelTok++;
    if (atBack()) {
      pending = Voice.speak("Back");
      return;
    }
    const it = items[i];
    pending = Voice.speak(it.say || it.label);
  }
  function move(dir, auto) {
    const n = items.length;
    if (!n) return;
    if (group) {
      i = (i + dir + n + 1) % (n + 1);
      render();
      if (atBack()) sfx("hover", 0.6);
      else scanFocus(items[i]);
      announce();
      return;
    }
    if (i === -1) i = dir > 0 ? 0 : n - 1;
    else {
      i += dir;
      if (i >= n || i < 0) i = -1;
    }
    render();
    if (i === -1) {
      pending = null;
      if (auto) {
        loops++;
        const a = acc();
        if (a.parking !== "off") {
          pending = Voice.speak("park");
          if (a.parking === "auto" && loops >= a.loops) {
            park();
            return;
          }
        }
      }
    } else {
      scanFocus(items[i]);
      announce();
    }
  }
  function park() {
    parked = true;
    i = -1;
    clearTimers();
    render();
    $("#status").textContent = "Parked. Press Enter to carry on.";
    $("#status").classList.remove("hide");
    pending = Voice.speak("parked");
  }
  function unpark() {
    parked = false;
    loops = 0;
    $("#status").classList.add("hide");
    i = 0;
    render();
    scanFocus(items[0]);
    announce();
    schedule();
  }
  function select() {
    const before = Voice.latest, beforeHost = host, beforeItems = items;
    if (atBack()) {
      sfx("select");
      group.back();
      return;
    }
    const it = items[i];
    if (!it) return;
    sfx("select");
    it.act();
    if (host === beforeHost && items.length && Voice.latest !== before && (items === beforeItems || i >= 0)) pending = Voice.latest;
  }
  function direct(k) {
    resetKeys();
    if (typeof autoT !== 'undefined') clearTimeout(autoT);
    clearTimers();
    parked = false;
    braked = false;
    $("#status").classList.add("hide");
    i = k;
    render();
    select();
    schedule();
  }
  function reset(list, el) {
    resetKeys();
    clearTimers();
    labelTok++;
    items = list;
    host = el;
    parked = false;
    braked = false;
    brakeResume = false;
    loops = 0;
    $("#status").classList.add("hide");
  }
  return {
    get index() {
      return atBack() ? -1 : i;
    },
    get items() {
      return items;
    },
    get braked() {
      return braked;
    },
    isActive,
    // a fresh root menu or junction: starts on the silent blank step with a full interval
    open(list, el, titleSpeech) {
      reset(list, el);
      group = null;
      i = -1;
      render();
      pending = titleSpeech ? Voice.speak(titleSpeech) : null;
      schedule();
    },
    // a row inside a task: loops through its items and one Back stop; startId re-lands on an item
    enterGroup(list, el, onBack, startId, speech) {
      reset(list, el);
      group = { back: onBack };
      const k = startId ? list.findIndex((x) => x.id === startId) : -1;
      i = k >= 0 ? k : 0;
      render();
      if (speech) {
        pending = Voice.speak(speech).then(() => {});
      } else {
        scanFocus(items[i]);
        announce();
      }
      schedule();
    },
    // in-place redraw keeping the same item by id
    setItems(list, keepId) {
      items = list;
      const k = list.findIndex((x) => x.id === keepId);
      i = k >= 0 ? k : group ? 0 : -1;
      render();
    },
    close() {
      resetKeys();
      clearTimers();
      labelTok++;
      items = [];
      i = -1;
      group = null;
      braked = false;
      parked = false;
      if (host) {
        host.innerHTML = "";
        host.classList.remove("backstop");
      }
      $("#status").classList.add("hide");
    },
    retime() {
      if (items.length) schedule();
    },
    spaceDown() {
      if (!items.length || enterHeld) return;
      const a = acc();
      if (a.auto && a.brake) {
        if (parked || i === -1 || atBack()) return;
        if (!braked) {
          braked = true;
          clearTimers();
          render();
          const tok = labelTok;
          (pending || Promise.resolve()).then((reason) => {
            if (reason === "ended" && braked && tok === labelTok) Voice.speak("Paused");
          });
        } else brakeResume = true;
        return;
      }
      if (a.auto) return; // brake off: acts on release
      holdT = setTimeout(() => {
        backing = true;
        move(-1, false);
        backT = setInterval(() => move(-1, false), acc().interval);
      }, HOLD_MS);
    },
    spaceUp() {
      if (!items.length || enterHeld) return;
      const a = acc();
      if (a.auto && a.brake) {
        if (brakeResume) {
          brakeResume = false;
          braked = false;
          render();
          schedule();
        }
        return;
      }
      if (a.auto) {
        if (parked) return;
        move(1, false);
        schedule();
        return;
      }
      const wasBacking = backing;
      cancelHold();
      if (!wasBacking) move(1, false);
    },
    enterDown() {
      if (!items.length) return;
      cancelHold();
      enterHeld = true;
      clearTimers();
    },
    enterUp() {
      if (!enterHeld || !items.length) return;
      enterHeld = false;
      const a = acc();
      if (parked) {
        unpark();
        return;
      }
      if (i === -1 && !group) {
        if (a.auto && a.parking === "chosen") park();
        else schedule();
        return;
      }
      select();
      schedule();
    },
    cancelInput() {
      cancelHold();
      const wasHeld = enterHeld;
      enterHeld = false;
      brakeResume = false;
      if (wasHeld) schedule();
    },
  };
  function cancelHold() {
    clearTimeout(holdT);
    clearInterval(backT);
    holdT = backT = null;
    backing = false;
  }
})();

/* ======================= keys: act on release, sensitivity cooldown ======================= */
const keyState = {};
let lastAccepted = -Infinity;
function nativeInput(e) {
  return !Scan.isActive() || !!e.target?.closest?.('textarea, input, select, [contenteditable]');
}
function keyOf(e) {
  if (e.code === "Space" || e.key === " ") return "space";
  if (e.key === "Enter" || e.code === "Enter" || e.code === "NumpadEnter") return "enter";
  return null;
}
addEventListener("keydown", (e) => {
  const k = keyOf(e);
  if (!k || nativeInput(e)) return;
  e.preventDefault();
  if (e.repeat || keyState[k]) return;
  const now = performance.now();
  if (now - lastAccepted < acc().sens) {
    keyState[k] = { rejected: true };
    return;
  }
  lastAccepted = now;
  if (typeof autoT !== 'undefined') clearTimeout(autoT);
  keyState[k] = { t: now };
  if (k === "space") Scan.spaceDown();
  else Scan.enterDown();
});
addEventListener("keyup", (e) => {
  const k = keyOf(e);
  if (!k) return;
  const s = keyState[k];
  delete keyState[k];
  if (nativeInput(e)) {
    if (s) Scan.cancelInput();
    return;
  }
  e.preventDefault();
  if (!s || s.rejected) return;
  if (k === "space") Scan.spaceUp();
  else Scan.enterUp();
});
function resetKeys() {
  for (const k in keyState) delete keyState[k];
  Scan.cancelInput();
}
addEventListener("blur", resetKeys);
addEventListener("focusin", (e) => { if (e.target?.closest?.('textarea, input, select, [contenteditable]')) resetKeys(); });
addEventListener("narbe-input-cancelled", resetKeys);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) resetKeys();
});
function hints() {
  const h = acc().auto
    ? "One switch: press Enter to choose the highlighted option."
    : "Space moves to the next option. Enter chooses it.";
  $("#barHint").textContent = h;
  $("#menuHint").textContent = h;
}
