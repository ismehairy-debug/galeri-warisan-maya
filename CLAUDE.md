# Galeri Warisan Maya — project map

**Direction (set Nov 2026): the Unity Meta Quest VR headset app is the product and the only thing under active development. The web version is frozen: backup / commercial demo only. Do not add features to the web version; make changes in Unity (`GaleriWarisanMaya_VR` is the main app). Launcher: `..\Open_in_Unity.bat`.**

This repo is the **web (WebXR / three.js) source of truth**. Two sibling Unity 6 (6000.6.7f1)
projects are native Meta Quest ports of it. All live under `C:\Users\ismeh\Documents\DICE 4.0\`:

| Folder | What it is |
|---|---|
| `Galeri-Warisan-Maya-The-Living-Heritage-Gallery-` (this repo) | Web gallery: `index.html`, `spectator.html`, `ulasan.html`, `laporan-rnd.html`, `assets/` |
| `GaleriWarisanMaya_VR` | Unity Quest app (VR build). `Assets/GWM/...`, `Install_to_Quest.bat` |
| `GaleriWarisanMaya_Institusi` | Unity Quest app, institution variant (adds `Loc`, `Text`, `Fonts`, `Audio`, `Signing`) |
| `galeri-warisan-maya` | Empty git repo (no commits yet) |

## How web maps to Unity
- Scene is exported from the live web scene to `Assets/GWM/Data/scene.json` + `scene.bytes` and
  `Assets/GWM/Textures`, then `GWMBuilder` (Editor) builds `Assets/GWM/Gallery.unity`.
  Changing geometry/stations in `index.html` means re-exporting and rebuilding in Unity.
- Station videos / intro: Unity plays from `Assets/StreamingAssets/Videos/`. `IntroDirector.cs`
  has `introVideoFile` (the scene also serializes this value, so edit `Gallery.unity` too).
- Shaders `GWM/Lit` and `GWM/Unlit` imitate three.js ACES tone mapping, fog, hemisphere light.

## Intro video
Intro is `intro_commercial.mp4` everywhere (web `assets/videos/`, Unity `StreamingAssets/Videos/`, `introVideoFile` in `IntroDirector.cs` and serialized in `Gallery.unity`). The old `intro_opening.mp4` is deleted.

## Web = Quest look-alike (since 2026-11-06)
On request the website is brought up to date with the Quest app. The new content (keris/pelita hands, gamelan, kuih,
villagers, cermin Melayu) lives in `assets/gwm-extras.js`, authored in the Unity frame inside a z-mirrored group and
hooked into `index.html` (`GWMX.install` / `GWMX.update`). The Unity versions are `GWMProc.cs`, `KampungPlay.cs`,
`KuihDisplay.cs`, `MirrorAvatar.cs`. Keep the two in step when changing either.

Unity only so far (not on the web): the batik painting corner beside the wau maker, `BatikCorner.cs` (added 2026-11-12).
Guests get a brush in each hand, dip it in a dye bowl and colour a wax-drawn cloth; the dye spreads up to the wax lines.
Check it headlessly with `-executeMethod GWMPreview.Batik -previewDir <folder>`; `GWMSmokeTest.Run` also paints on it.

## Rules
- Raw phone videos must be transcoded to ~720p H.264 before use (see memory).
- Expand features in Unity first. The web copy is only brought in step when the user asks.
