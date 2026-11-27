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
// Static, generated recordings. No neural inference or third-party requests in play.
const recordedVoiceId = "__kokoro_emma__";
const recordedClips = Object.create(null);
// Load the tiny generated index synchronously before this script. No fetch race.
if (!window.NarbeVoiceManager && typeof window.Audio === "function") {
  for (const [phrase, file] of Object.entries(window.SwitchCabRecordedClips || {})) {
    if (typeof file === "string" && /^[a-f0-9]{16}\.mp3$/.test(file)) recordedClips[phrase] = file;
  }
}
let recordedAudio = null;
function hasRecordedVoice() { return Object.keys(recordedClips).length > 0; }
function useRecordedVoice() {
  return hasRecordedVoice() && (!localVoice.voice || localVoice.voice === recordedVoiceId);
}
function bestDeviceVoice() {
  const voices = localVoices();
  const selected = voices.find(v => v.name === localVoice.voice);
  if (selected) return selected;
  const british = voices.filter(v => /^en[-_]GB$/i.test(v.lang));
  return british.find(v => v.localService && /natural|neural|enhanced|premium/i.test(v.name))
    || british.find(v => v.localService)
    || british.find(v => /natural|neural|enhanced|premium/i.test(v.name))
    || british[0] || voices.find(v => v.localService && /^en/i.test(v.lang))
    || voices.find(v => /^en/i.test(v.lang)) || voices[0];
}
let finishLocalSpeech = null;
const Voice = {
  latest: null,
  latestTicket: null,
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
    const v = localVoices().map(x => x.name);
    if (hasRecordedVoice()) v.unshift(recordedVoiceId);
    if (!v.length) return;
    const current = useRecordedVoice() ? recordedVoiceId : localVoice.voice || bestDeviceVoice()?.name;
    const i = v.indexOf(current);
    localVoice.voice = v[(i + 1) % v.length];
    store("switchcity-voice", localVoice);
  },
  name() {
    const M = window.NarbeVoiceManager;
    if (M && M.getCurrentVoice) {
      const c = M.getCurrentVoice();
      return M.getVoiceDisplayName ? M.getVoiceDisplayName(c) : (c && c.name) || "Default";
    }
    if (useRecordedVoice()) return "Emma (recorded)";
    const v = bestDeviceVoice();
    return v ? v.name.replace(/\(.*?\)/g, "").trim() : "Default";
  },
  // Owned speech completion; never block input and never wait forever.
  speak(text) {
    finishLocalSpeech?.("cancelled");
    Voice.latestTicket = null;
    const M = window.NarbeVoiceManager;
    const p = new Promise((resolve) => {
      if (!text || !Voice.enabled()) { resolve("disabled"); return; }
      let settled = false, cap, startup, clip;
      const stopClip = () => {
        if (!clip) return;
        const old = clip;
        clip = null;
        old.onplaying = old.onended = old.onerror = null;
        try { old.pause(); } catch (_) {}
      };
      const finish = (reason) => {
        if (settled) return;
        settled = true;
        clearTimeout(cap);
        clearTimeout(startup);
        stopClip();
        if (finishLocalSpeech === finish) finishLocalSpeech = null;
        resolve(reason);
      };
      const file = !M && useRecordedVoice() && recordedClips[text];
      // Short labels also need time for media startup and the native fallback.
      cap = setTimeout(() => finish("timeout"), Math.min(10000, (file ? 3200 : 600) + text.length * 70));
      if (M && M.speak) {
        try {
          const ticket = M.speak(text);
          Voice.latestTicket = ticket;
          if (ticket?.finished) Promise.resolve(ticket.finished).then(
            result => finish(result?.reason === "end" ? "ended" : result?.reason || "ended"), () => finish("error")
          );
        } catch (_) { finish("error"); }
        return;
      }
      finishLocalSpeech = finish;
      const native = () => {
        if (settled) return;
        clearTimeout(startup);
        stopClip();
        if (!("speechSynthesis" in window)) { finish("disabled"); return; }
        try {
          speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(text);
          u.rate = 1.05;
          const v = bestDeviceVoice();
          if (v) { u.voice = v; u.lang = v.lang; }
          else u.lang = "en-GB";
          u.onstart = () => clearTimeout(startup);
          u.onend = () => finish("ended");
          u.onerror = () => finish("error");
          startup = setTimeout(() => finish("error"), 1000);
          speechSynthesis.speak(u);
        } catch (_) { finish("error"); }
      };
      if (!file) { native(); return; }
      try {
        if ("speechSynthesis" in window) speechSynthesis.cancel();
        // Reuse the same media element so user-gesture permission can persist.
        const a = clip = recordedAudio || (recordedAudio = new window.Audio());
        a.preload = "auto";
        a.src = "./assets/voice/" + file;
        const fallback = () => { if (clip === a && !settled) native(); };
        a.onplaying = () => { if (clip === a) clearTimeout(startup); };
        a.onended = () => { if (clip === a) finish("ended"); };
        a.onerror = fallback;
        startup = setTimeout(fallback, 1600);
        Promise.resolve(a.play()).catch(fallback);
      } catch (_) { native(); }
    });
    Voice.latest = p;
    return p;
  },
};

/* ======================= choice scanner (§4 contract) ======================= */
let Scan = (() => {
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
  let renderedItems = null, renderedHost = null, buttons = [];
  const available = list => list.filter(it => !it.hidden && !it.disabled);
  function render() {
    if (!host) return;
    if (renderedItems !== items || renderedHost !== host) {
      host.innerHTML = "";
      renderedItems = items;
      renderedHost = host;
      const list = items;
      buttons = items.map((it, k) => {
        const b = document.createElement("button");
        b.type = "button";
        b.tabIndex = -1;
        if (it.html) b.innerHTML = it.html;
        else b.textContent = it.label;
        b.setAttribute("aria-label", it.say || it.label);
        b.addEventListener("click", () => {
          if (items === list && host === renderedHost) direct(k);
        });
        host.appendChild(b);
        return b;
      });
    }
    buttons.forEach((b,k) => {
      b.className = "opt" + (k === i ? " on" : "") + (k === i && braked ? " braked" : "");
    });
    host.classList.toggle("backstop", !!atBack());
    const on = host.querySelector(".on");
    if (on) on.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
    const backButton = $("#editorBack");
    if (backButton) { backButton.classList.toggle("hide", !group); backButton.onclick = group ? () => { resetKeys(); group.back(); } : null; }
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
    pending = it ? Voice.speak(it.say || it.label) : null;
  }
  function move(dir, auto) {
    const n = items.length;
    if (!n) return;
    if (group) {
      i = i === -1 ? (dir > 0 ? 0 : n) : (i + dir + n + 1) % (n + 1);
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
    items = available(list);
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
    open(list, el, titleSpeech, keepId) {
      reset(list, el);
      group = null;
      i = keepId == null ? -1 : items.findIndex(x => x.id === keepId);
      render();
      pending = titleSpeech ? Voice.speak(titleSpeech) : null;
      if (i >= 0) { scanFocus(items[i]); announce(); }
      schedule();
    },
    // a row inside a task: loops through its items and one Back stop; startId re-lands on an item
    enterGroup(list, el, onBack, startId, speech) {
      reset(list, el);
      group = { back: onBack };
      const k = startId ? items.findIndex((x) => x.id === startId) : -1;
      i = k >= 0 ? k : items.length ? 0 : -1;
      render();
      if (speech) {
        pending = Voice.speak(speech).then(() => {});
      } else {
        if (items[i]) scanFocus(items[i]);
        announce();
      }
      schedule();
    },
    // in-place redraw keeping the same item by id
    setItems(list, keepId) {
      const id = keepId ?? items[i]?.id;
      const wasBack = atBack();
      const prior = items[i];
      items = available(list);
      i = wasBack && keepId == null ? items.length : items.findIndex(x => x.id === id);
      if (i < 0 || prior?.id !== items[i]?.id) {
        resetKeys();
        labelTok++;
        braked = false;
        pending = null;
      }
      render();
      schedule();
    },
    close() {
      resetKeys();
      clearTimers();
      labelTok++;
      items = [];
      renderedItems = null;
      renderedHost = null;
      buttons = [];
      i = -1;
      group = null;
      braked = false;
      parked = false;
      if (host) {
        host.innerHTML = "";
        host.classList.remove("backstop");
      }
      $("#status").classList.add("hide");
      const backButton = $("#editorBack"); if (backButton) backButton.classList.add("hide");
    },
    retime() {
      if (!acc().auto && (braked || parked)) {
        braked = false; parked = false; brakeResume = false;
        $("#status").classList.add("hide"); render();
      }
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
  if (!window.NarbeScanManager && now - lastAccepted < acc().sens) {
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
