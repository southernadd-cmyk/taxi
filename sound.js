/* ======================= sound (HTML5 audio only, no Web Audio) ======================= */
const SR = 22050;
function toWav(buf) {
  const len = buf.length,
    ab = new ArrayBuffer(44 + len * 2),
    v = new DataView(ab);
  const w = (o, s) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  w(0, "RIFF");
  v.setUint32(4, 36 + len * 2, true);
  w(8, "WAVE");
  w(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, SR, true);
  v.setUint32(28, SR * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, "data");
  v.setUint32(40, len * 2, true);
  for (let i = 0; i < len; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, buf[i])) * 32767, true);
  const b = new Uint8Array(ab);
  let bin = "";
  for (let i = 0; i < b.length; i += 8192) bin += String.fromCharCode.apply(null, b.subarray(i, i + 8192));
  return "data:audio/wav;base64," + btoa(bin);
}
const osc = (type, ph) => {
  const x = ph % 1;
  return type === "sin"
    ? Math.sin(ph * 2 * Math.PI)
    : type === "sq"
      ? x < 0.5
        ? 0.6
        : -0.6
      : type === "tri"
        ? 4 * Math.abs(x - 0.5) - 1
        : (2 * x - 1) * 0.7;
};
function rnd(dur, fn) {
  const n = Math.floor(SR * dur),
    b = new Float32Array(n);
  fn(b, n);
  return b;
}
function notes(list, type = "sq", vol = 0.3) {
  const total = list.reduce((a, [, d]) => a + d, 0);
  return rnd(total + 0.05, (b) => {
    let o = 0;
    list.forEach(([f, d]) => {
      const n = Math.floor(SR * d);
      let ph = 0;
      for (let i = 0; i < n; i++) {
        ph += f / SR;
        const env = Math.min(1, i / 120) * Math.pow(1 - i / n, 1.5);
        b[o + i] += osc(type, ph) * env * vol;
      }
      o += n;
    });
  });
}
function sweep(f0, f1, dur, type = "sin", vol = 0.35, noise = 0) {
  return rnd(dur, (b, n) => {
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      ph += (f0 + (f1 - f0) * t) / SR;
      const env = Math.sin(Math.PI * t);
      b[i] = (osc(type, ph) * (1 - noise) + (Math.random() * 2 - 1) * noise) * env * vol;
    }
  });
}
function crash(dur = 0.5, vol = 0.5) {
  return rnd(dur, (b, n) => {
    let lp = 0;
    for (let i = 0; i < n; i++) {
      lp += (Math.random() * 2 - 1 - lp) * 0.35;
      b[i] = lp * Math.pow(1 - i / n, 2.5) * vol * 1.6;
    }
  });
}
function mix(...bs) {
  const n = Math.max(...bs.map((b) => b.length)),
    o = new Float32Array(n);
  bs.forEach((b) => b.forEach((v, i) => (o[i] += v)));
  return o;
}
const C = (n) => 440 * Math.pow(2, (n - 69) / 12); // midi to Hz
const SOUNDS = {};
function buildSounds() {
  const S = (k, b) => (SOUNDS[k] = toWav(b));
  S("hover", notes([[C(84), 0.05]], "tri", 0.25));
  S(
    "select",
    notes(
      [
        [C(79), 0.06],
        [C(91), 0.1],
      ],
      "sq",
      0.22,
    ),
  );
  S(
    "straight",
    notes(
      [
        [C(72), 0.09],
        [C(79), 0.09],
        [C(84), 0.14],
      ],
      "tri",
      0.4,
    ),
  );
  S(
    "left",
    notes(
      [
        [C(55), 0.12],
        [C(52), 0.18],
      ],
      "sq",
      0.3,
    ),
  );
  S(
    "right",
    notes(
      [
        [C(88), 0.09],
        [C(91), 0.15],
      ],
      "sq",
      0.25,
    ),
  );
  S("around", sweep(700, 180, 0.4, "tri", 0.4));
  S(
    "pause",
    notes(
      [
        [C(67), 0.06],
        [0, 0.05],
        [C(67), 0.06],
      ],
      "sin",
      0.35,
    ),
  );
  S(
    "gps",
    notes(
      [
        [C(96), 0.05],
        [C(100), 0.05],
        [C(103), 0.09],
      ],
      "sin",
      0.22,
    ),
  );
  for (let k = 0; k < 5; k++)
    S(
      "coin" + k,
      notes(
        [
          [C(84 + k * 2), 0.05],
          [C(91 + k * 2), 0.12],
        ],
        "sq",
        0.2,
      ),
    );
  S("jump", sweep(200, 900, 0.55, "saw", 0.3, 0.45));
  S("land", mix(crash(0.25, 0.45), sweep(120, 50, 0.25, "sin", 0.6)));
  S(
    "smash",
    mix(
      crash(0.6, 0.6),
      notes(
        [
          [C(60), 0.05],
          [C(48), 0.12],
        ],
        "sq",
        0.2,
      ),
    ),
  );
  S(
    "score",
    notes(
      [
        [C(72), 0.1],
        [C(76), 0.1],
        [C(79), 0.16],
      ],
      "sq",
      0.25,
    ),
  );
  S(
    "win",
    notes(
      [
        [C(72), 0.1],
        [C(76), 0.1],
        [C(79), 0.1],
        [C(84), 0.12],
        [C(79), 0.08],
        [C(84), 0.3],
      ],
      "sq",
      0.25,
    ),
  );
  S(
    "bust",
    notes(
      [
        [C(67), 0.16],
        [C(63), 0.16],
        [C(60), 0.4],
      ],
      "saw",
      0.28,
    ),
  );
  S(
    "combo",
    notes(
      [
        [C(79), 0.05],
        [C(83), 0.05],
        [C(86), 0.05],
        [C(91), 0.14],
      ],
      "sq",
      0.22,
    ),
  );
  S(
    "rank",
    notes(
      [
        [C(72), 0.12],
        [C(79), 0.12],
        [C(84), 0.12],
        [C(88), 0.12],
        [C(91), 0.4],
      ],
      "tri",
      0.35,
    ),
  );
  S(
    "cash",
    notes(
      [
        [C(96), 0.04],
        [C(91), 0.04],
        [C(96), 0.1],
      ],
      "sq",
      0.18,
    ),
  );
  S(
    "alert",
    notes(
      [
        [C(88), 0.07],
        [C(76), 0.07],
        [C(88), 0.07],
        [C(76), 0.1],
      ],
      "sq",
      0.3,
    ),
  );
  S(
    "urgent",
    notes(
      [
        [C(93), 0.06],
        [0, 0.04],
        [C(93), 0.06],
        [0, 0.04],
        [C(93), 0.09],
      ],
      "sq",
      0.25,
    ),
  );
  S(
    "siren1",
    rnd(1.1, (b, n) => {
      let ph = 0;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        ph += (700 + 500 * Math.sin(Math.PI * 2 * t * 1.5)) / SR;
        b[i] = osc("tri", ph) * 0.4 * Math.sin(Math.PI * t);
      }
    }),
  );
  S(
    "steal",
    notes(
      [
        [C(70), 0.12],
        [C(66), 0.12],
        [C(58), 0.3],
      ],
      "tri",
      0.35,
    ),
  );
  S("hail", mix(sweep(1400, 2200, 0.18, "sin", 0.3), sweep(2200, 1500, 0.25, "sin", 0.3)));
  for (let k = 0; k < 4; k++) S("ping" + k, notes([[C(60 + k * 7), 0.16]], "sin", 0.45));
  // loops
  S(
    "engine",
    rnd(0.4, (b, n) => {
      let p1 = 0,
        p2 = 0;
      for (let i = 0; i < n; i++) {
        p1 += 55 / SR;
        p2 += 110 / SR;
        b[i] = (osc("saw", p1) * 0.5 + osc("sq", p2) * 0.15 + (Math.random() * 2 - 1) * 0.04) * 0.5;
      }
    }),
  );
  S(
    "siren",
    rnd(2, (b, n) => {
      let ph = 0;
      for (let i = 0; i < n; i++) {
        const t = i / SR;
        const f = t % 1 < 0.5 ? 760 : 980;
        ph += f / SR;
        b[i] = osc("tri", ph) * 0.4;
      }
    }),
  );
  S("music", buildMusic());
}
function buildMusic() {
  const bpm = 112,
    beat = 60 / bpm,
    bars = 8,
    dur = bars * 4 * beat;
  const b = new Float32Array(Math.floor(SR * dur));
  const prog = [
    [57, 60, 64],
    [53, 57, 60],
    [48, 52, 55],
    [55, 59, 62],
    [57, 60, 64],
    [53, 57, 60],
    [50, 53, 57],
    [52, 56, 59],
  ];
  const add = (t, d, f, type, vol, dec = 1.5) => {
    const s = Math.floor(t * SR),
      n = Math.floor(d * SR);
    let ph = 0;
    for (let i = 0; i < n && s + i < b.length; i++) {
      ph += f / SR;
      b[s + i] += osc(type, ph) * Math.min(1, i / 60) * Math.pow(1 - i / n, dec) * vol;
    }
  };
  for (let bar = 0; bar < bars; bar++) {
    const ch = prog[bar],
      t0 = bar * 4 * beat;
    for (let q = 0; q < 8; q++) add(t0 + (q * beat) / 2, (beat / 2) * 0.95, C(ch[0] - 24), "saw", 0.16, 0.6); // bass
    for (let s = 0; s < 16; s++)
      add(t0 + (s * beat) / 4, (beat / 4) * 0.9, C(ch[s % 3] + 12 + (s % 6 > 2 ? 12 : 0)), "sq", 0.045, 2); // arp
    ch.forEach((n) => add(t0, 4 * beat, C(n), "tri", 0.045, 0.3)); // pad
    for (let k = 0; k < 4; k++) {
      const s = Math.floor((t0 + k * beat) * SR);
      for (let i = 0; i < SR * 0.18 && s + i < b.length; i++) {
        const e = 1 - i / (SR * 0.18);
        b[s + i] += Math.sin((2 * Math.PI * (50 + 90 * e * e) * i) / SR) * e * e * 0.38;
      }
    } // kick
    for (let k = 0; k < 8; k++) {
      const s = Math.floor((t0 + (k * beat) / 2 + beat / 4) * SR);
      for (let i = 0; i < SR * 0.04 && s + i < b.length; i++)
        b[s + i] += (Math.random() * 2 - 1) * (1 - i / (SR * 0.04)) * 0.06;
    } // hats
    for (let k = 1; k < 4; k += 2) {
      const s = Math.floor((t0 + k * beat) * SR);
      let lp = 0;
      for (let i = 0; i < SR * 0.15 && s + i < b.length; i++) {
        lp += (Math.random() * 2 - 1 - lp) * 0.5;
        b[s + i] += lp * (1 - i / (SR * 0.15)) * 0.18;
      }
    } // snare
  }
  return b;
}
buildSounds();
function sfx(name, vol = 0.8) {
  if (!game.sfx || !SOUNDS[name]) return;
  try {
    const a = new Audio(SOUNDS[name]);
    a.volume = vol;
    a.play().catch(() => {});
  } catch (e) {}
}
// looping beds
const loops = {};
function loopAudio(name, vol) {
  if (!loops[name]) {
    const a = new Audio(SOUNDS[name]);
    a.loop = true;
    a.volume = 0;
    a.preservesPitch = false;
    a.mozPreservesPitch = false;
    a.webkitPreservesPitch = false;
    loops[name] = a;
  }
  return loops[name];
}
let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  ["engine", "siren", "music"].forEach((n) => {
    const a = loopAudio(n);
    a.play().catch(() => {
      audioUnlocked = false;
    });
  });
}
addEventListener("keydown", unlockAudio);
addEventListener("pointerdown", unlockAudio);
let speaking = false;
{
  const raw = Voice.speak;
  Voice.speak = function (t) {
    const p = raw(t);
    if (t) {
      speaking = true;
      p.then(() => (speaking = false));
    }
    return p;
  };
}
function updateLoops(state) {
  // state: {engine:0..1 rate, siren:0..1}
  const m = loopAudio("music"),
    e = loopAudio("engine"),
    s = loopAudio("siren");
  const tm = game.music ? (speaking ? 0.12 : 0.32) : 0;
  m.volume += (tm - m.volume) * 0.08;
  const te = game.engine && state.engineOn ? 0.14 + state.rate * 0.1 : 0;
  e.volume += (te - e.volume) * 0.1;
  e.playbackRate = 0.7 + state.rate * 0.9;
  const ts = game.sfx ? state.siren * 0.35 : 0;
  s.volume += (ts - s.volume) * 0.1;
}
// direction earcons on scan focus
function scanFocus(it) {
  if (!it) return;
  if (it.sound) {
    sfx(it.sound, 0.9);
    if (it.danger) setTimeout(() => sfx("alert", 0.8), 240);
    else if (it.gps) setTimeout(() => sfx("gps", 0.7), 260);
  } else sfx("hover", 0.6);
}
