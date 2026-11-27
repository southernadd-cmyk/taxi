# Switch Cab

A taxi game for one or two switches. Switch 1 is Space, switch 2 is Enter. Nothing else is needed.

## Run it
The game loads its 3D models as files, so serve the folder over HTTP rather than opening
`index.html` directly, e.g. `python3 -m http.server` then visit http://localhost:8000.
GitHub Pages works as is.

## Files
- `index.html`: page layout and styles
- `js/input-scanning-voice.js`: Space/Enter handling (acts on release), choice scanning
  (blank step, parking, Space brake, row groups with a Back stop), speech, shared settings
- `js/sound.js`: all sounds, generated in code and played with HTML audio (no Web Audio)
- `js/models.js`, `js/city.js`, `js/imported-models.js`: 3D city, vehicles and imported models
- `js/visual-effects.js`: bloom, outlines (police red, next passenger gold), colour grade, vignette, FXAA and tone mapping (Graphics: High only), shared car model for traffic and police,
  traffic lights, clouds
- `js/turns-carpool-police.js`: the turn-based shift (carpool, patience, police, dares, nitro, levels)
- `js/progress.js`, `js/menus.js`, `js/settings.js`, `js/shift.js`, `js/traffic.js`,
  `js/city-editor-and-camera.js`: progress, menus, settings, starting and saving shifts, the city editor,
  camera and route drawing

## Driving practice
Choose **Learn to drive** from the main menu. Follow GPS to a waiting passenger, pick them up, then deliver them to the park. Wrong turns are fine; there are no deadlines, police, fuel costs or penalties. Practice does not change your saved shift, cash or records. Pause, replay instructions, restart or leave at any junction.

## Visual accessibility
Settings → Motion can force reduced motion, or follow the device's accessibility preference. Reduced motion uses a fixed north-up camera, steady lights, no stunt spins or particle bursts, and no automatic camera orbit. Police lights default to steady for new players. The game retains all driving choices and scoring. Compact screens use a scrollable choice bar and stable high-contrast highlights.

## How a turn works
Every junction is one turn. When the cab moves one block (two with nitro), every police car moves one
block along the route it showed in advance, and every passenger loses one move of patience. Nothing
happens between turns, so the game never depends on reaction time.

## Hub integration
- Exit Game sends `window.parent.postMessage({ action: 'focusBackButton' }, '*')`.
- If `NarbeScanManager`, `NarbeVoiceManager` or `SafeAudio` are on the page they are used;
  otherwise the game uses its own fallbacks.

See CREDITS.md for model licences.
