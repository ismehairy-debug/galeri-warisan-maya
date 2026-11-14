# Galeri Warisan Maya (The Living Heritage Gallery)

> *"Walking through time, stepping into culture."*

A WebXR virtual reality gallery experience built for **Digital Innovation Creativepreneur (DICE) 4.0**,
Category 3: Interaktif Media (AR/VR) — Tema: **Warisan**.

Anjuran: Kementerian Pendidikan Tinggi (KPT) & Universiti Sultan Zainal Abidin (UniSZA)
Diwakili oleh: Pasukan DICE 4.0 UniMAP

## Concept

An immersive VR exhibition hall where visitors physically walk through a virtual gallery.
Interactive showcases around the room bring three pillars of Malaysian performance heritage
to life through proximity-triggered spatial audio and visuals:

- **Tarian** — Traditional Dance
- **Nyanyian** — Traditional Singing
- **Silat** — Martial Arts

By using VR proximity triggers and spatial audio, this project turns passive video-viewing
into an active, intimate cultural encounter — proving that heritage doesn't belong in the
past, it lives in the future.

## Live Demo

- **Desktop:** click to enable mouse-look, then use WASD to walk
- **Meta Quest 2 (or any WebXR headset):** open the gallery in the built-in browser,
  tap "Masuk Galeri," then tap "Enter VR"

No app install, no developer mode, no Unity build required — it runs straight from the browser.

### Sudut batik / Batik corner

Outside the balai, on the east side beside the wau bulan maker, visitors can colour a batik cloth
whose motif is already drawn in wax. The dye spreads through the cloth and stops at the wax lines,
as in real hand-painted batik (batik lukis); holding still lets it soak further.

- **Desktop:** look at the cloth and hold the mouse button to paint; click a bowl to change colour
- **Phone / tablet:** touch the cloth to paint; tap a bowl to change colour
- **VR headset:** a brush appears in each hand; dip it in a bowl, then touch the cloth
- The bowl of water washes colour away

## Project Status

🚧 **Prototype stage.** The current build uses placeholder geometric "performers" and
synthesized placeholder audio tones to prove out the interaction design (room-scale
locomotion, proximity triggers, spatial audio falloff, WebXR support). Real content is
the next milestone — see Roadmap below.

## Team — Pasukan DICE 4.0 UniMAP

| Nama | Peranan |
|---|---|
| Anas Zuhairi bin Zullkeffle | Ketua Pasukan |
| Ahmad Haziq bin Ariff | Ahli Pasukan |
| Muhammad Afifi bin Muhd Shukri | Ahli Pasukan |

Mentor Akademik: Dr. Mohd Hafiz Ismail, Fakulti Kejuruteraan Elektronik, UniMAP

## Tech Stack

- [Three.js](https://threejs.org/) (r128) — 3D rendering
- [WebXR Device API](https://immersiveweb.dev/) — VR headset support
- Vanilla HTML/CSS/JS — no build step, no dependencies to install

## Running Locally

No build tools needed:

```bash
git clone <this repository's URL>
cd Galeri-Warisan-Maya-The-Living-Heritage-Gallery-
# then just open index.html in a browser
```

Desktop preview works by double-clicking `index.html` directly. **VR mode requires HTTPS**
(a secure context) — serve locally with something like `npx serve` and access it over
`https://localhost` / an ngrok tunnel if testing VR before pushing.

## Roadmap

- [ ] Replace placeholder "performer" geometry with real dance/silat footage or 3D character animation
- [ ] Replace synthesized oscillator tones with real recorded music/narration (`assets/audio/`)
- [ ] Replace procedural batik wall texture with photographed/licensed textile textures (`assets/textures/`)
- [ ] Add a fourth showcase if scope allows
- [ ] Add snap-turn / comfort options for VR locomotion
- [ ] Record a 30–60s presentation walkthrough video for judging

See `assets/README.md` for where new content files should go.

## License

Educational/competition project — Pasukan DICE 4.0 UniMAP, 2026.
