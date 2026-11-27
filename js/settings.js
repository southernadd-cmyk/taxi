function settingsItems(back) {
  const J = ["wait for me", "follow GPS after 5 s", "follow GPS after 10 s"],
    JV = [0, 5000, 10000],
    CAM = ["Chase", "High", "Top down"];
  const a = acc();
  const it = (id, label, f) => ({
    id,
    label,
    say: label.replace("—", ""),
    act: () => {
      f();
      settingsRefresh(back, id);
    },
  });
  return [
    it("tts", "Text to Speech: " + (Voice.enabled() ? "On" : "Off"), () => {
      Voice.toggle();
      Voice.speak("Text to speech on");
    }),
    it("voice", "Voice: " + Voice.name(), () => {
      Voice.cycle();
      setTimeout(() => Voice.speak("Voice: " + Voice.name()), 50);
    }),
    it("ui", "Text size: " + (game.ui ? "Huge" : "Large"), () => {
      game.ui = game.ui ? 0 : 1;
      saveGameSettings();
      applyUI();
      Voice.speak("Text size " + (game.ui ? "huge" : "large"));
    }),
    it("diff", "Passengers: " + ["Relaxed", "Normal", "Tough"][game.diff], () => {
      game.diff = (game.diff + 1) % 3;
      saveGameSettings();
      Voice.speak(
        [
          "Relaxed. Passengers never run out of patience. No police patrols and no rival cab.",
          "Normal. Passengers start with five spare moves, one fewer every two levels, down to two. Patrols appear from level 3, and a rival cab from level 2.",
          "Tough. Passengers start with two spare moves, down to one. Patrols appear from level 2, there are more roadworks, and a faster rival cab races you from the start.",
        ][game.diff],
      );
    }),
    it("nav", "Navigation: " + (game.nav ? "Compass only" : "Full GPS"), () => {
      game.nav = game.nav ? 0 : 1;
      saveGameSettings();
      Voice.speak(
        game.nav
          ? "Compass only. No GPS line. You hear which way to go by compass. Fares pay half as much again."
          : "Full GPS. The best way is always first.",
      );
    }),
    it("guide", "Spoken directions: " + (game.guide ? "Full" : "Short"), () => {
      game.guide = game.guide ? 0 : 1;
      saveGameSettings();
      Voice.speak(game.guide ? "Full directions at every junction" : "Short directions");
    }),
    it("music", "Music: " + (game.music ? "On" : "Off"), () => {
      game.music = !game.music;
      saveGameSettings();
      Voice.speak("Music " + (game.music ? "on" : "off"));
    }),
    it("engine", "Engine sound: " + (game.engine ? "On" : "Off"), () => {
      game.engine = !game.engine;
      saveGameSettings();
      Voice.speak("Engine sound " + (game.engine ? "on" : "off"));
    }),
    it("speed", "Car speed: " + ["Slow", "Normal", "Fast"][game.speed], () => {
      game.speed = (game.speed + 1) % 3;
      saveGameSettings();
      Voice.speak("Car speed " + ["slow", "normal", "fast"][game.speed]);
    }),
    it("wait", "At junctions: " + (a.auto ? "wait for me (one switch)" : J[JV.indexOf(game.wait)]), () => {
      if (acc().auto) { Voice.speak('One switch always waits at junctions.'); return; }
      game.wait = JV[(JV.indexOf(game.wait) + 1) % 3];
      saveGameSettings();
      Voice.speak(
        game.wait
          ? "The car follows the GPS if you wait " + game.wait / 1000 + " seconds"
          : "The car waits for you at every junction",
      );
    }),
    it("cops", "Police chase: " + ["Off", "Slow", "Normal"][game.cops], () => {
      game.cops = (game.cops + 1) % 3;
      saveGameSettings();
      updateHud();
      Voice.speak(
        ["Police chase off. You cannot get caught.", "Police chase slow.", "Police chase normal."][game.cops],
      );
    }),
    it("cam", "Camera: " + CAM[game.cam], () => {
      game.cam = (game.cam + 1) % 3;
      saveGameSettings();
      Voice.speak("Camera " + CAM[game.cam]);
    }),
    it("flash", "Police lights: " + (game.flash ? "Flashing" : "Steady"), () => {
      game.flash = !game.flash;
      saveGameSettings();
      Voice.speak("Police lights " + (game.flash ? "flashing" : "steady, no flashing"));
    }),
    it("gfx", "Graphics: " + (game.gfx ? "High" : "Low"), () => {
      game.gfx = game.gfx ? 0 : 1;
      saveGameSettings();
      resize();
      Voice.speak("Graphics " + (game.gfx ? "high" : "low, for slower computers"));
    }),
    it("outline", "Outlines: " + (game.outline !== 0 ? "On" : "Off"), () => {
      game.outline = game.outline !== 0 ? 0 : 1;
      saveGameSettings();
      Voice.speak(
        game.outline
          ? "Outlines on. Police cars glow red and your next passenger glows gold, even behind buildings. Needs Graphics: High."
          : "Outlines off",
      );
    }),
    it("auto", "Auto Scan: " + (a.auto ? "On — One Switch" : "Off — Two Switches"), () => {
      toggleAuto();
      hints();
      Voice.speak(
        acc().auto
          ? "Auto scan on. One switch. Enter chooses."
          : "Auto scan off. Two switches. Space moves, Enter chooses.",
      );
    }),
    it("scan", "Scan Speed: " + a.interval / 1000 + " s", () => {
      cycleSpeed();
      Voice.speak("Scan speed " + acc().interval / 1000 + " seconds");
    }),
    ...(!window.NarbeScanManager ? [
      it("speechwait", "Wait for Speech: " + (a.wait ? "On" : "Off"), () => {
        localAcc.waitForSpeech = !localAcc.waitForSpeech;
        store("switchcity-access", localAcc);
        Voice.speak("Wait for speech " + (localAcc.waitForSpeech ? "on" : "off"));
      }),
    ] : []),
    it("sfx", "Sound Effects: " + (game.sfx ? "On" : "Off"), () => {
      game.sfx = !game.sfx;
      saveGameSettings();
      if (window.SafeAudio) SafeAudio.setEnabled(game.sfx);
      Voice.speak("Sound effects " + (game.sfx ? "on" : "off"));
    }),
    {
      id: "reset",
      label: resetArmed ? "⚠️  Reset Progress: choose again to erase" : "Reset Progress",
      say: resetArmed ? "Choose again to erase all progress" : "Reset progress",
      act: () => {
        if (!resetArmed) {
          resetArmed = true;
          Voice.speak("Choose reset again to erase your money, cars and saved job. Your cities are kept.");
        } else {
          resetArmed = false;
          cash = 0;
          earned = 0;
          Object.assign(garage, { owned: ["hatch"], car: "hatch", color: 0 });
          saveProgress();
          try {
            ["switchcity-game", "switchcity-game2", "switchcity-game3", "switchcity-tips"].forEach((k) =>
              localStorage.removeItem(k),
            );
            for (const k in TIPS) delete TIPS[k];
          } catch (e) {}
          updateHud();
          Voice.speak("Progress erased.");
        }
        Scan.setItems(settingsItems(back), "reset");
      },
    },
    {
      id: "back",
      label: "⬅️  Back",
      say: "Back",
      act: () => {
        resetArmed = false;
        back();
      },
    },
  ];
}
function settingsRefresh(back, id) {
  resetArmed = false;
  Scan.setItems(settingsItems(back), id);
}
function settingsMenu(back) {
  resetArmed = false;
  showMenu("Settings", "Choose a setting to change it.", settingsItems(back), "Settings");
}
