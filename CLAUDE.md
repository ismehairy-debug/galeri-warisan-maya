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

### No hand models in the Quest app (2026-11-14)
The owner had the visitor's hand models taken out of the Quest app: the batik brush did not sit in the modelled hand.
`VRRig` no longer builds `GWMHand` on the controllers, and the brush now lies on the controller's aim pose
(`VRRig.leftAim` / `rightAim`, bound to `pointerPosition` / `pointerRotation`; with no controller, as in the editor, the
aim is worked out from the grip). Do not put hands back. `GWMHand` stays in `GWMProc.cs` because the mirror reflection
(`MirrorAvatar.cs`) still uses it. The web in VR mode still draws the hands and holds the brush in them: it was not
changed (web frozen), so here the two differ on purpose.

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

## Teaser film (2026-11-15)
A one-minute teaser is filmed inside the Quest app, in the Unity editor, with no headset:
- `Assets/GWM/Editor/GWMTeaser.cs` (`-executeMethod GWMTeaser.Run -teaserDir <folder> -teaserSize 1920x1080`, no `-quit`)
  enters the world and flies the visitor's camera through a list of shots, saving every frame at a fixed 30 fps. It also
  paints at the batik corner. `-teaserEvery 30` gives a quick framing check; `-teaserShots a,b` refilms only those shots.
- `GaleriWarisanMaya_VR/Teaser/make_teaser.py --frames <folder> --out <file.mp4> [--draft]` cuts the frames on the bar
  lines of the music (the cinematic track in `Assets/GWM/Audio`, 88 bpm), grades them, and adds the title, captions and
  end card (both taken from `welcome_panel.png`). The cut list and the caption wording are at the top of that file.
- Drafts are 1280x720 with a "DRAF n" tag and go to `GaleriWarisanMaya_VR/Teaser/`. The owner approves a draft before the
  full 1920x1080 export.
- Exported 2026-11-15 as `Teaser/Galeri_Warisan_Maya_teaser.mp4` (60 s, 1920x1080). Credits as the owner asked: it opens
  on a white card "In collaboration with" FCoEE and UniMAP, and ends "Presented by STEAM Education Academy" with that
  logo (`Teaser/logos/`). The presenter is STEAM Education Academy; the app itself is still named STEAM EduAction.
- Filming 1080p takes about 7 minutes and 1 GB of frames; film it in two runs of `-teaserShots` (a tool call is cut off
  at 10 minutes, and background runs die with the session). The C: drive had only 3 GB free on 2026-11-15.

### New commercial intro (draft 2026-11-15, not in the app until the owner approves)
`GaleriWarisanMaya_VR/Teaser/make_intro.py` cuts an 18-second replacement for `intro_commercial.mp4` from the `in_...`
shots in `GWMTeaser.cs` (film them with `-teaserShots in_board,in_walk,in_tarian,in_gamelan,in_istana,in_congkak,in_wau,in_bloom`).
Music is the gamelan (`alat_muzik.mp3` from 136.2 s), not the short film's cinematic track; the title lands on the big gong.
It ends on a white credits card whose wording the owner gave: Sponsored by FCoEE; In collaboration with UniMAP and FCoEE;
Presented by SEAT Education Academy (logos in `Teaser/logos/`). The final stays 1280x720, a few MB, for the headset.
`intro_DRAF1.mp4` still says "SEAT": the owner has since said the presenter is STEAM Education Academy and supplied its
logo, so correct the card before any export, and ask whether the intro should carry the teaser's credits instead.

## Rules
- Raw phone videos must be transcoded to ~720p H.264 before use (see memory).
- Expand features in Unity first. The web copy is only brought in step when the user asks.
