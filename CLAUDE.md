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

On flat screens the web shows the intro the way the Quest app does (since 2026-11-14): the video, then the short film, on a
16:9 screen floating in a white room with a halo tinted by the picture, a shadow and a floor reflection (`#introStage` CSS
and `setupIntroGlow()` in `index.html`). It is no longer stretched edge to edge.

Testing the web headlessly: every MASUK click starts the cast and sends a Telegram message to the owner
(`postCastLinkToTelegram`). Block `api.telegram.org` and the PeerJS script in the test browser before clicking it.

## Web = Quest look-alike (since 2026-11-06)
On request the website is brought up to date with the Quest app. The new content (the visitor's hands, gamelan, kuih,
villagers, welcome grove, wau maker, batik corner) lives in `assets/gwm-extras.js`, authored in the Unity frame inside a
z-mirrored group and hooked into `index.html` (`GWMX.install` / `GWMX.update`). The Unity versions are `GWMProc.cs`,
`KampungPlay.cs`, `KuihDisplay.cs`, `MirrorAvatar.cs`, `BatikCorner.cs`. Keep the two in step when changing either.

### Batik painting corner (Unity 2026-11-12, web 2026-11-14)
Beside the wau maker. Guests dip a brush in a dye bowl and colour a wax-drawn cloth; the dye spreads up to the wax lines.
- Unity: `BatikCorner.cs` (class `BatikCanvas` draws the motif and runs the dye). Check it headlessly with
  `-executeMethod GWMPreview.Batik -previewDir <folder>`; `GWMSmokeTest.Run` also paints on it.
- Web: the "sudut batik" section of `assets/gwm-extras.js`, same build and same dye engine. The web does NOT redraw the
  motif: it loads the wax lines from `assets/images/batik_lilin.png` and shows `assets/images/batik_siap.png` as the
  finished example. Both come out of `GWMPreview.Batik` (`batik_wax.png`, `batik_cloth_finished.png`), so after changing
  the motif in Unity, re-run it and copy the two files over (`papan_batik.png` is the sign, the same file as Unity's).
- Web only: on a flat screen the view centre (mouse-look), the mouse or a finger is the brush, and bowls are clicked.
  Strokes are sent to spectators (`GWMX.onBatik` / `GWMX.applyBatik` / `GWMX.batikState`, hooked in `index.html`).

### Plants
`scatterVegetation()` in `index.html` no longer scatters at random: the loose palms, banana plants and bamboo stand at the
positions the Unity scene was exported with, so the two match and nothing can land on the exhibits east of the balai.

## Rules
- Raw phone videos must be transcoded to ~720p H.264 before use (see memory).
- Expand features in Unity first. The web copy is only brought in step when the user asks.
