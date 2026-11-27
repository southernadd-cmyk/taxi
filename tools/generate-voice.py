"""Generate static British English Kokoro clips. Run only when the pack changes."""
import hashlib
import json
import pathlib
import subprocess
import tempfile

import numpy as np
import soundfile as sf
from kokoro import KPipeline

root = pathlib.Path(__file__).resolve().parents[1]
out = root / "assets" / "voice"
out.mkdir(parents=True, exist_ok=True)
phrases = json.loads((root / "tools" / "voice-phrases.json").read_text())
assert len(phrases) == len(set(phrases)) and all(phrases)
pipeline = KPipeline(lang_code="b", repo_id="hexgrad/Kokoro-82M")
clips = {}
with tempfile.TemporaryDirectory() as temp:
    wav = pathlib.Path(temp) / "clip.wav"
    for phrase in phrases:
        name = hashlib.sha256(("emma-v1:" + phrase).encode()).hexdigest()[:16] + ".mp3"
        audio = [np.asarray(a) for _, _, a in pipeline(phrase, voice="bf_emma", speed=1.05)]
        assert audio and sum(x.size for x in audio) > 2400, phrase
        sf.write(wav, np.concatenate(audio), 24000)
        subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", str(wav),
                        "-codec:a", "libmp3lame", "-b:a", "48k", str(out / name)], check=True)
        assert (out / name).stat().st_size > 1000, phrase
        clips[phrase] = name
(out / "manifest.json").write_text(json.dumps({"voice": "Kokoro bf_emma", "clips": clips}, indent=2) + "\n")
for file in out.glob("*.mp3"):
    if file.name not in clips.values():
        file.unlink()
print(f"Generated {len(clips)} clips")
