#!/usr/bin/env bash
# Generate TTS narration for every scene in scenes.json via the z-ai CLI,
# then measure each WAV's duration with ffprobe into durations.json.
set -uo pipefail
DIR=/tmp/video
SCENES=/home/z/my-project/scripts/video/scenes.json
mkdir -p "$DIR"

VOICE=$(python3 -c "import json;print(json.load(open('$SCENES'))['voice'])")
SPEED=$(python3 -c "import json;print(json.load(open('$SCENES'))['speed'])")

python3 - "$SCENES" "$VOICE" "$SPEED" << 'PYEOF' > "$DIR/tts_plan.sh"
import json, sys, shlex
d = json.load(open(sys.argv[1]))
voice, speed = sys.argv[2], sys.argv[3]
for s in d["scenes"]:
    out = f"/tmp/video/{s['id']}.wav"
    print(f"z-ai tts -i {shlex.quote(s['narration'])} -o {out} --voice {voice} --speed {speed}")
PYEOF

echo "== generating TTS =="
bash "$DIR/tts_plan.sh" || { echo "TTS GENERATION FAILED"; exit 1; }

echo "== measuring durations =="
python3 - << 'PYEOF'
import json, subprocess
d = json.load(open("/home/z/my-project/scripts/video/scenes.json"))
out = {}
for s in d["scenes"]:
    f = f"/tmp/video/{s['id']}.wav"
    p = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", f], capture_output=True, text=True)
    dur = float(p.stdout.strip())
    out[s["id"]] = {"narration": s["narration"], "caption": s["caption"],
                    "type": s["type"], "audio": round(dur, 3)}
    print(f"{s['id']}: {dur:.2f}s  |  {s['narration'][:60]}")
json.dump(out, open("/tmp/video/durations.json", "w"), indent=1)
total = sum(v["audio"] for v in out.values())
print(f"TOTAL narration: {total:.1f}s")
PYEOF
