"""Brings the web copy of the FCoEE gallery up to date with the Quest app (GaleriWarisanMaya_VR).
Copies the model parts, images, captions, frame list and floor plan from the Unity project's Resources/fcoee into assets/fcoee,
and writes assets/fcoee/manifest.json (which frames have a photo, a caption or a film), which assets/gwm-fcoee.js reads.
Films are NOT copied: the web gets its own small copy (see FILMS below), made with ffmpeg at 480p so the site stays light.
Run: python tools/sync_fcoee_web.py"""
import json, os, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "..", "GaleriWarisanMaya_VR", "Assets", "GWM", "Resources", "fcoee")
DST = os.path.join(HERE, "..", "assets", "fcoee")
FILMS = {12: "wajah_filem_pendek_480p.mp4"}   # frame number -> film file in assets/fcoee (the Unity videos.txt lists the 720p names)

for sub in ("", "wall", "wall_placeholder", "caption"):
    os.makedirs(os.path.join(DST, sub), exist_ok=True)
    s = os.path.join(SRC, sub)
    for f in os.listdir(s):
        p = os.path.join(s, f)
        if os.path.isfile(p) and not f.endswith(".meta"):
            shutil.copyfile(p, os.path.join(DST, sub, f))
shutil.copyfile(os.path.join(HERE, "..", "..", "GaleriWarisanMaya_VR", "Teaser", "fcoee_floorplan.png"), os.path.join(DST, "fcoee_floorplan.png"))

def listing(sub, prefix):
    out = {}
    for f in sorted(os.listdir(os.path.join(DST, sub))):
        if f.startswith(prefix) and not f.endswith(".meta"):
            n = int(f[len(prefix):].split(".")[0]); out[n] = sub + "/" + f
    return out

man = {"photos": listing("wall", "photo_"), "captions": listing("caption", "caption_"),
       "placeholders": listing("wall_placeholder", "slot_"),
       "films": {n: f for n, f in FILMS.items() if os.path.exists(os.path.join(DST, f))}}
json.dump(man, open(os.path.join(DST, "manifest.json"), "w"), indent=1)
print("frames with a photo:", sorted(man["photos"]), "| captions:", sorted(man["captions"]), "| films:", man["films"])
