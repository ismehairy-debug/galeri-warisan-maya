# Assets

This folder is where real content replaces the current placeholders. Keep it organized
by type so the swap-in later is a quick, obvious job.

## /videos
Real footage or looping animation clips for each showcase (Tarian, Nyanyian, Silat).
Recommended: short (10-30s) looping clips, MP4/H.264, 1080p or lower for smooth
playback on the Quest 2's browser. Loaded in code via `THREE.VideoTexture`.

## /audio
Real recorded music, narration, or sound effects per showcase, to replace the
placeholder oscillator tones. MP3 or OGG recommended. Loaded via
`THREE.AudioLoader` + `THREE.PositionalAudio`.

## /textures
Any real photographed or licensed textile/wall textures (batik, songket, etc.) to
replace the current procedurally-drawn placeholder pattern. PNG/JPG, ideally
seamless/tileable, 512x512 or 1024x1024.

## Naming convention

Use the station key as a prefix so it's obvious what maps to what:

```
tarian_clip.mp4       tarian_audio.mp3       tarian_texture.jpg
nyanyian_clip.mp4      nyanyian_audio.mp3     nyanyian_texture.jpg
silat_clip.mp4          silat_audio.mp3         silat_texture.jpg
```

## Licensing note

Since this is a competition submission, make sure any footage/audio/textures you
add here are either originally created by the team, properly licensed, or royalty-free
with attribution given where required — this matters for judging and for avoiding
copyright issues down the line.
