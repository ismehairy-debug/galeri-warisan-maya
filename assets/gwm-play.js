/* ------------------------------------------------------------------
   GWM play -- the play activities added to the Meta Quest (Unity) app on 2026-11-21, for the website:
     * the children (and two grown-ups) at congkak and batu seremban laugh, giggle and cheer; the voices are
       built here from a simple voice model, the same one as KidsVoice.cs
     * the kuih can be picked up and eaten (three bites)
     * the craftsman's wau bulan can be painted (colour pots on a table beside the easel) and flown
   Loaded after gwm-extras.js, whose helpers it borrows through GWMX.api. Authored in the Unity frame.
------------------------------------------------------------------- */
(function(){
  'use strict';
  const T = THREE, GWMX = window.GWMX;
  if (!GWMX) return;
  let A, spect = false;
  const SR = 22050, D2R = Math.PI / 180;

  // ================================================================ sound
  let rs = 7;
  const rnd = () => { rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0; return rs / 4294967296; };
  const fr = (lo, hi) => lo + rnd() * (hi - lo);
  const resn = (f, c, bw) => { const d = (f - c) / bw; return 1 / (1 + d * d); };
  const VA = [[1000, 1650, 3300], [850, 1400, 2900], [730, 1200, 2550]];
  const VE = [[640, 2500, 3400], [560, 2200, 3000], [500, 1850, 2600]];
  const VI = [[380, 3000, 3700], [330, 2750, 3300], [300, 2300, 3000]];
  const WHO = { kid: 0, woman: 1, man: 2 };

  // one voiced sound: harmonics of a gliding pitch weighted by three formant peaks that glide too, plus a little noise through the same formants
  function addVoice(buf, start, dur, f0a, f0b, vib, fa, fb, amp, rel, decay, breath){
    const i0 = Math.max(0, Math.floor(start * SR)); let n = Math.floor(dur * SR); n = Math.min(n, buf.length - i0); if (n <= 0) return;
    const BLOCK = 64, maxH = 26, gain = new Float32Array(maxH + 1);
    let master = 0, f0n = f0a, jitter = 0;
    const y1 = [0, 0, 0], y2 = [0, 0, 0], b1 = [0, 0, 0], b2 = [0, 0, 0], ga = [0, 0, 0];
    const att = 0.014, vibPhase = rnd() * 6.28;
    for (let i = 0; i < n; i++){
      const u = i / n, tt = i / SR;
      if (i % BLOCK === 0){
        jitter += (fr(-1, 1) * 0.012 - jitter) * 0.3;
        let f0c = f0a + (f0b - f0a) * (u * (2 - u));
        f0c *= 1 + jitter + vib * Math.sin(vibPhase + tt * 2 * Math.PI * 6.2);
        const F1 = fa[0] + (fb[0] - fa[0]) * u, F2 = fa[1] + (fb[1] - fa[1]) * u, F3 = fa[2] + (fb[2] - fa[2]) * u;
        const h = Math.max(4, Math.min(maxH, Math.floor(4800 / f0c)));
        for (let k = 1; k <= maxH; k++){
          if (k > h){ gain[k] = 0; continue; }
          const fk = k * f0c;
          gain[k] = (resn(fk, F1, 90) + resn(fk, F2, 150) * 0.55 + resn(fk, F3, 220) * 0.30 + 0.04) / Math.pow(k, 0.85);
        }
        f0n = f0c;
        const fm = [F1, F2, F3];
        for (let r = 0; r < 3; r++){
          const rr = Math.exp(-Math.PI * (r === 0 ? 120 : 220) / SR), th = 2 * Math.PI * fm[r] / SR;
          b1[r] = 2 * rr * Math.cos(th); b2[r] = -rr * rr; ga[r] = (1 - rr) * (r === 0 ? 1.0 : 0.8);
        }
      }
      master += 2 * Math.PI * f0n / SR; if (master > 2 * Math.PI * 64) master -= 2 * Math.PI * 64;
      let voiced = 0;
      for (let k = 1; k <= maxH; k++){ if (gain[k] <= 0) break; voiced += gain[k] * Math.sin(master * k); }
      const x = rnd() * 2 - 1; let noise = 0;
      for (let r = 0; r < 3; r++){ const y = ga[r] * x + b1[r] * y1[r] + b2[r] * y2[r]; y2[r] = y1[r]; y1[r] = y; noise += y; }
      const puff = Math.exp(-tt * 38);
      const s = voiced * (1 - breath * 0.5) * 0.55 + noise * breath * (0.9 + 3.0 * puff) * 0.9;
      const e = Math.min(1, tt / att) * Math.min(1, (dur - tt) / Math.max(rel, 0.004)) * Math.exp(-decay * tt);
      buf[i0 + i] += s * e * amp * 0.5;
    }
  }
  function baseF0(who, v){
    if (who === 0) return [430, 520, 380][v % 3] * fr(0.97, 1.04);
    if (who === 1) return 235 * fr(0.95, 1.05);
    return 122 * fr(0.95, 1.06);
  }
  function laugh(who, v){   // "ha ha ha ha": short breathy bursts that weaken and slow down a little, each with falling pitch
    const f0 = baseF0(who, v), bursts = who === 0 ? 5 + v : 4, period = who === 0 ? 0.165 + 0.012 * v : 0.21;
    const buf = new Float32Array(Math.floor(SR * (bursts * period + 0.45)));
    let t = 0.02, amp = 1;
    for (let b = 0; b < bursts; b++){
      const top = f0 * (b === 0 ? 1.18 : 1) * (1 - 0.012 * b), vowel = (b % 3 === 2) ? VE[who] : VA[who];
      addVoice(buf, t, period * 0.78, top, top * 0.80, 0.012, vowel, vowel, amp, 0.010, 14, 0.55);
      t += period * (1 + 0.045 * b) * fr(0.94, 1.06); amp *= 0.86;
    }
    return buf;
  }
  function giggle(who, v){
    const f0 = baseF0(who, v) * 1.25, bursts = 7 + v, period = 0.118;
    const buf = new Float32Array(Math.floor(SR * (bursts * period + 0.35)));
    let t = 0.02, amp = 0.75;
    for (let b = 0; b < bursts; b++){
      const vowel = (b % 2 === 0) ? VE[who] : VI[who];
      addVoice(buf, t, period * 0.7, f0 * (1 + 0.05 * Math.sin(b * 1.7)), f0 * 0.88, 0.02, vowel, vowel, amp, 0.008, 34, 0.8);
      t += period * fr(0.92, 1.1); amp *= (b < bursts - 3) ? 1.0 : 0.8;
    }
    return buf;
  }
  function cheer(who, v){   // "yeay!": one rising shout from "ye" to "ay", or three voices together
    const f0 = baseF0(who, v), voices = v === 0 ? 1 : 3, dur = 0.78;
    const buf = new Float32Array(Math.floor(SR * (dur + 0.45)));
    for (let k = 0; k < voices; k++){
      const start = k * fr(0.03, 0.07), pitch = f0 * (k === 0 ? 1 : fr(0.88, 1.2));
      addVoice(buf, start, 0.24, pitch * 0.92, pitch * 1.28, 0.03, VI[who], VE[who], 0.9, 0.02, 0, 0.35);
      addVoice(buf, start + 0.22, dur - 0.22, pitch * 1.28, pitch * 1.02, 0.035, VE[who], VI[who], 1, 0.12, 1.4, 0.25);
    }
    return buf;
  }
  function toBuffer(data){
    const ctx = T.AudioContext.getContext();
    let peak = 0.0001; for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
    const g = 0.8 / peak, b = ctx.createBuffer(1, data.length, SR), o = b.getChannelData(0);
    for (let i = 0; i < data.length; i++) o[i] = Math.tanh(data[i] * g * 1.2) * 0.85;
    return b;
  }
  const voiceCache = {};
  function pickVoice(kind, whoName){
    const who = WHO[whoName], key = kind + whoName;
    if (!voiceCache[key]){
      const n = kind === 'cheer' ? 2 : 3, set = [];
      for (let v = 0; v < n; v++) set.push(toBuffer(kind === 'laugh' ? laugh(who, v) : kind === 'giggle' ? giggle(who, v) : cheer(who, v)));
      voiceCache[key] = set;
    }
    const set = voiceCache[key]; return set[Math.floor(Math.random() * set.length)];
  }
  // build the clips a little after the world appears, one at a time, so no frame stalls
  function warmVoices(){
    const jobs = [['laugh', 'kid'], ['cheer', 'kid'], ['giggle', 'kid'], ['laugh', 'woman'], ['laugh', 'man']];
    const next = () => { const j = jobs.shift(); if (!j) return; try { if (T.AudioContext.getContext()) pickVoice(j[0], j[1]); } catch (e){} setTimeout(next, 400); };
    setTimeout(next, 2500);
  }

  // a bite: a soft crack, a short chew and a low thump
  function makeCrunch(seed){
    const n = Math.floor(SR * 0.34), d = new Float32Array(n); let lp = 0;
    const clicks = [], amps = [];
    for (let k = 0; k < 6; k++){ clicks.push(rnd() * 0.11); amps.push(0.5 + rnd() * 0.5); }
    for (let i = 0; i < n; i++){
      const t = i / SR, x = rnd() * 2 - 1; lp += (x - lp) * 0.42;
      let s = lp * Math.exp(-t * 16) * 0.55;
      for (let k = 0; k < 6; k++){ const dt = t - clicks[k]; if (dt > 0 && dt < 0.03) s += x * amps[k] * Math.exp(-dt * 260) * 0.8; }
      s += Math.sin(2 * Math.PI * (120 + 15 * seed) * t) * Math.exp(-t * 34) * 0.5;
      if (t > 0.17) s += lp * Math.exp(-(t - 0.17) * 22) * 0.35;
      d[i] = s * Math.min(1, t / 0.002);
    }
    const ctx = T.AudioContext.getContext(), b = ctx.createBuffer(1, n, SR), o = b.getChannelData(0);
    for (let i = 0; i < n; i++) o[i] = d[i] * 0.8;
    return b;
  }
  let crunches = null;
  function playFlat(buf, vol){
    try {
      const ctx = T.AudioContext.getContext(); if (!ctx || ctx.state !== 'running') return;
      const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf; g.gain.value = vol; s.connect(g); g.connect(ctx.destination); s.start();
    } catch (e){}
  }
  function crunch(){
    try {
      if (!crunches) crunches = [makeCrunch(1), makeCrunch(2), makeCrunch(3)];
      playFlat(crunches[Math.floor(Math.random() * 3)], 0.9);
    } catch (e){}
  }
  function makeWhoosh(){
    const n = Math.floor(SR * 1.1), d = new Float32Array(n); let lp = 0, lp2 = 0;
    for (let i = 0; i < n; i++){
      const t = i / SR, x = rnd() * 2 - 1, env = Math.sin(Math.min(1, t / 1.1) * Math.PI), k = 0.04 + (0.28 - 0.04) * env;
      lp += (x - lp) * k; lp2 += (lp - lp2) * k; d[i] = lp2 * 5 * env;
    }
    const ctx = T.AudioContext.getContext(), b = ctx.createBuffer(1, n, SR), o = b.getChannelData(0); o.set(d); return b;
  }
  function makeHum(){   // the dengung of the busur: a low reedy hum that wavers (exactly 3 s, so the loop closes)
    const n = SR * 3, ctx = T.AudioContext.getContext(), b = ctx.createBuffer(1, n, SR), o = b.getChannelData(0);
    for (let i = 0; i < n; i++){
      const t = i / SR, f = 168 * (1 + 0.015 * Math.sin(2 * Math.PI * 3 * t));
      const s = Math.sin(2 * Math.PI * f * t) + 0.55 * Math.sin(2 * Math.PI * 2 * f * t + 0.6) + 0.30 * Math.sin(2 * Math.PI * 3 * f * t) + 0.12 * Math.sin(2 * Math.PI * 5 * f * t);
      o[i] = s * (0.78 + 0.22 * Math.sin(2 * Math.PI * 6 * t + 1.3)) * 0.28;
    }
    return b;
  }

  // ---- who speaks, and from where
  const cues = []; let clock = 0;
  function listener(){
    if (listener.l) return listener.l;
    A.camera.traverse(o => { if (o.type === 'AudioListener' && !listener.l) listener.l = o; });
    return listener.l;
  }
  function whoIs(p){ return p === A.cg.A ? 'woman' : p === A.cg.B ? 'man' : 'kid'; }
  GWMX.say = function(person, kind, delay){ cues.push({ at: clock + (delay || 0), p: person, kind }); };
  function playCues(t){
    clock = t;
    for (let i = cues.length - 1; i >= 0; i--){
      const c = cues[i]; if (t < c.at) continue;
      cues.splice(i, 1);
      const p = c.p, L = listener();
      if (!L || !L.context || L.context.state !== 'running' || t < (p.nextVoice || 0)) continue;
      try {
        if (!p.voiceAud){ p.voiceAud = new T.PositionalAudio(L); p.voiceAud.setRefDistance(1.5); p.voiceAud.setMaxDistance(20); p.voiceAud.setRolloffFactor(1.1); p.head.add(p.voiceAud); }
        const a = p.voiceAud; if (a.isPlaying) continue;
        const who = whoIs(p), buf = pickVoice(c.kind, who);
        a.setBuffer(buf); a.setVolume(who === 'kid' ? 0.9 : 0.7); a.setPlaybackRate(0.96 + Math.random() * 0.10); a.play();
        p.nextVoice = t + buf.duration + 0.8;
      } catch (e){ console.warn('voice', e); }
    }
  }

  // ================================================================ kuih
  const ku = { items: [], held: [null, null], flatHeld: null, prev: [false, false], lastBite: [0, 0], hint: null, count: 0 };
  const ray = new T.Raycaster(), _ndc = new T.Vector2(), _a = new T.Vector3(), _b = new T.Vector3(), _q = new T.Quaternion(), _c = new T.Vector3();

  function pointerNdc(e){
    const r = A.renderer.domElement.getBoundingClientRect();
    if (document.pointerLockElement === A.renderer.domElement) _ndc.set(0, 0);
    else _ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    return _ndc;
  }
  function itemOf(obj){
    for (const it of ku.items){ let o = obj; while (o){ if (o === it.g) return it; o = o.parent; } }
    return null;
  }
  function grab(it, holder){
    it.holder = holder; it.returning = false;
    holder.attach(it.g);   // keeps where it is in the world
    it.g.scale.setScalar(Math.max(0.05, it.sizeNow));
  }
  function drop(it){
    it.holder = null; it.returning = true;
    A.kuih.tray.attach(it.g);
    it.g.scale.setScalar(Math.max(0.05, it.sizeNow));
  }
  function bite(it){
    it.bites++; it.size = Math.max(0, 1 - it.bites / 3); crunch();
    if (it.bites >= 3){
      it.eaten = true; it.respawn = clock + 12; ku.count++;
      if (ku.flatHeld === it) ku.flatHeld = null;
      for (let h = 0; h < 2; h++) if (ku.held[h] === it) ku.held[h] = null;
      it.holder = null; A.kuih.tray.attach(it.g);
    }
  }
  function installKuih(){
    ku.items = A.kuih.items.map(g => ({ g, bites: 0, eaten: false, respawn: 0, size: 1, sizeNow: 1, hover: 0, lp: g.position.clone(), lq: g.quaternion.clone(), holder: null, returning: false }));
    if (spect) return;
    const el = A.renderer.domElement;
    document.addEventListener('mousedown', e => {
      if (e.button !== 0 || e.target !== el || A.renderer.xr.isPresenting) return;
      if (ku.flatHeld){ bite(ku.flatHeld); return; }
      A.camera.getWorldPosition(_a);
      A.kuih.tray.getWorldPosition(_b);
      if (_a.distanceTo(_b) > 4.5) return;
      ray.setFromCamera(pointerNdc(e), A.camera); ray.far = 3.4;
      const live = ku.items.filter(i => !i.eaten && !i.holder && i.sizeNow > 0.3).map(i => i.g);
      const hit = ray.intersectObjects(live, true)[0];
      const it = hit && itemOf(hit.object);
      if (it){ ku.flatHeld = it; grab(it, A.scene); }
    });
    const touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    const h = document.createElement('div'); h.id = 'kuihHint';
    h.style.cssText = 'position:fixed;left:50%;bottom:' + (touch ? 10 : 28) + 'px;transform:translateX(-50%);z-index:11;padding:8px 18px;border-radius:14px;background:rgba(20,14,6,0.74);color:#f2e2b6;border:1px solid rgba(242,217,138,0.6);font-family:Georgia,serif;font-size:13px;line-height:1.5;text-align:center;pointer-events:none;opacity:0;transition:opacity .5s;width:max-content;max-width:90vw';
    document.body.appendChild(h); ku.hint = h;
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && ku.flatHeld){ drop(ku.flatHeld); ku.flatHeld = null; } });
  }
  function mouth(){ A.camera.getWorldPosition(_c); A.camera.getWorldQuaternion(_q); return _c.clone().addScaledVector(new T.Vector3(0, 0, -1).applyQuaternion(_q), 0.09).add(new T.Vector3(0, -0.13, 0)); }
  function updateKuih(dt, t){
    if (spect) return;
    const xr = A.renderer.xr.isPresenting;
    A.camera.getWorldPosition(_a); A.kuih.tray.getWorldPosition(_b);
    const nearTray = _a.distanceTo(_b) < 4.5;
    // flat screens: the picked-up kuih floats in front of the face
    const f = ku.flatHeld;
    if (f && !xr){
      A.camera.getWorldQuaternion(_q);
      const tgt = A.camera.localToWorld(new T.Vector3(0.0, -0.17 - 0.03 * Math.sin(t * 2), -0.52));
      const k = 1 - Math.exp(-12 * dt);
      f.g.position.lerp(tgt, k); f.g.quaternion.slerp(_q.clone().multiply(new T.Quaternion().setFromEuler(new T.Euler(-0.5, 0, 0))), k);
      if (nearTray === false && _a.distanceTo(_b) > 6.5){ drop(f); ku.flatHeld = null; }
    }
    // VR: grip or trigger picks a kuih up from the tray; at the mouth it is bitten
    if (xr){
      for (let h = 0; h < 2; h++){
        const gp = A.gripsRef[h]; if (!gp) continue;
        const hand = gp.userData.hand || (h === 1 ? 'right' : 'left'), st = A.inputState[hand === 'left' ? 'left' : 'right'];
        const squeeze = Math.max(st.t, st.g) > 0.6, edge = squeeze && !ku.prev[h]; ku.prev[h] = squeeze;
        gp.getWorldPosition(_a); gp.getWorldQuaternion(_q);
        const hp = _a.clone().addScaledVector(new T.Vector3(0, 0, -1).applyQuaternion(_q), 0.10);
        if (!ku.held[h]){
          let best = null, bs = 0.30;
          ku.items.forEach(it => { if (it.eaten || it.holder || it.returning || it.sizeNow < 0.2) return; it.g.getWorldPosition(_b); const d = hp.distanceTo(_b.add(new T.Vector3(0, 0.05, 0))); if (d < bs){ bs = d; best = it; } });
          ku.items.forEach(it => { it.hover += ((it === best ? 1 : 0) - it.hover) * Math.min(1, dt * 6); });
          if (edge && best){ ku.held[h] = best; grab(best, gp); A.buzz({ grip: gp }, 0.3, 50); }
        } else {
          const it = ku.held[h];
          if (!squeeze){ drop(it); ku.held[h] = null; continue; }
          const k = 1 - Math.exp(-14 * dt);
          it.g.position.lerp(new T.Vector3(0, 0.02, -0.20), k); it.g.quaternion.slerp(new T.Quaternion(), k);
          it.g.getWorldPosition(_b);
          if (_b.distanceTo(mouth()) < 0.21 && clock - ku.lastBite[h] > 0.8){ ku.lastBite[h] = clock; bite(it); A.buzz({ grip: gp }, 0.45, 70); }
        }
      }
    }
    // the tray: eaten pieces come back, loose ones go home, the one under the pointer swells a little
    ku.items.forEach(it => {
      if (it.eaten){
        it.sizeNow = Math.max(0, it.sizeNow - dt * 5); it.g.scale.setScalar(Math.max(0.0001, it.sizeNow));
        if (it.sizeNow <= 0.01) it.g.visible = false;
        if (clock > it.respawn){ it.eaten = false; it.bites = 0; it.size = 1; it.sizeNow = 0; it.g.visible = true; it.g.position.copy(it.lp); it.g.quaternion.copy(it.lq); }
        return;
      }
      if (it.returning){
        const k = 1 - Math.exp(-9 * dt);
        it.g.position.lerp(it.lp, k); it.g.quaternion.slerp(it.lq, k);
        if (it.g.position.distanceToSquared(it.lp) < 1e-4){ it.returning = false; it.g.position.copy(it.lp); it.g.quaternion.copy(it.lq); }
      }
      it.sizeNow += (it.size - it.sizeNow) * Math.min(1, dt * 3);
      it.g.scale.setScalar(Math.max(0.0001, it.sizeNow * (1 + 0.10 * (it.hover || 0))));
    });
    if (ku.hint){
      const flat = !xr && nearTray;
      ku.hint.innerHTML = ku.flatHeld ? '<b>KLIK</b> untuk menggigit &nbsp;·&nbsp; <b>Esc</b> untuk letak semula<br><i>Click to bite · Esc to put it back</i>'
        : '<b>KLIK</b> pada kuih untuk mengambilnya<br><i>Click a kuih to pick it up and eat it</i>';
      ku.hintT = flat ? (ku.hintT || 0) + dt : 0;
      ku.hint.style.opacity = flat && (ku.flatHeld || ku.hintT < 10) ? '1' : '0';
    }
  }

  // ================================================================ wau: paint and fly
  const wp = { built: false, near: false, flyer: null, soaring: false };
  const POT_DYE = [1, 3, 4, 5, 7, 8, 0];   // merah, jingga, kuning, hijau, biru, ungu, water (the batik dye numbers)
  const TABLE_X = 1.12, TABLE_Y = 0.70, TABLE_Z = -0.18, POT_R = 0.058, RIM = 0.052;
  const wptr = { down: false, press: false, x: 0, y: 0, mode: '' };

  function hashN(x, y){ let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) & 0xffff) / 65535; }
  function installWau(){
    const wm = A.wm; if (!wm.built || !wm.easel) return;
    const easel = wm.easel, quad = wm.quad, loader = new T.TextureLoader();
    wp.easel = easel; wp.quad = quad;
    // the paper as a canvas we can paint on
    const img = new Image();
    img.onload = () => {
      try {
        const W = img.width, H = img.height, c = document.createElement('canvas'); c.width = W; c.height = H;
        const cx = c.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0);
        wp.W = W; wp.H = H; wp.canvas = c; wp.ctx = cx;
        wp.base = cx.getImageData(0, 0, W, H); wp.cur = cx.getImageData(0, 0, W, H);
        wp.paper = new Uint8Array(W * H);
        const d = wp.base.data;
        for (let i = 0; i < W * H; i++){ const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2], a = d[i * 4 + 3]; wp.paper[i] = (a >= 235 && r >= 205 && g >= 195 && b >= 155 && r - b < 70) ? 1 : 0; }   // the cream paper only
        wp.tex = new T.CanvasTexture(c); wp.tex.anisotropy = 4;   // read like the other wau: the paper keeps the look it had before it could be painted
        quad.material = new T.MeshStandardMaterial({ map: wp.tex, transparent: true, alphaTest: 0.5, side: T.DoubleSide, roughness: 0.8 });
        wp.ready = true;
      } catch (e){ console.warn('wau paper unreadable, it stays plain:', e); }
    };
    img.src = 'assets/images/wau_kosong.png';

    // ---- the table of colour pots, right of the easel
    const wood = A.mat(0.44, 0.25, 0.11, 0.35), woodDark = A.mat(0.26, 0.13, 0.06, 0.4), bamboo = A.mat(0.72, 0.58, 0.30, 0.3), ceramic = A.mat(0.93, 0.92, 0.88, 0.65);
    const table = new T.Group(); table.position.set(TABLE_X, 0, TABLE_Z); easel.add(table); wp.table = table;
    A.box(table, wood, 0, TABLE_Y - 0.02, 0, 1.00, 0.04, 0.30); A.box(table, woodDark, 0, TABLE_Y + 0.008, -0.143, 1.00, 0.018, 0.014);
    [-0.46, 0.46].forEach(sx => [-0.11, 0.11].forEach(sz => A.stick(table, bamboo, A.V(sx, 0, sz), A.V(sx, TABLE_Y - 0.04, sz), 0.022)));
    A.blob(table, 0, 0.02, 0, 1.3, 0.30);
    const bowlGeo = A.lathe([[0, 0], [0.036, 0], [0.052, 0.016], [0.060, RIM], [0.054, RIM], [0.045, 0.020], [0, 0.014]], 20);
    wp.pots = []; wp.pickables = [quad];
    POT_DYE.forEach((d, i) => {
      const x = -0.39 + i * 0.13, pot = { x, y: TABLE_Y + RIM, z: 0, dye: d };
      const col = d === A.B_WATER ? new T.Color(0.62, 0.82, 0.92) : new T.Color(A.DYES[d][0] / 255, A.DYES[d][1] / 255, A.DYES[d][2] / 255);
      if (d !== A.B_WATER) col.multiplyScalar(0.8);
      const dm = new T.MeshStandardMaterial({ color: col.convertSRGBToLinear(), roughness: 0.9, side: T.DoubleSide });
      [A.part(table, bowlGeo, ceramic, x, TABLE_Y, 0), A.cyl(table, dm, x, TABLE_Y + RIM - 0.012, 0, 0.102, 0.002, 0.102)].forEach(m => { m.userData.pot = pot; wp.pickables.push(m); });
      wp.pots.push(pot);
    });
    // ---- the board that says how
    const sign = new T.Group(); sign.position.set(2.15, 0, -0.70); sign.rotation.order = 'YXZ'; sign.rotation.set(5 * D2R, 32 * D2R, 0); easel.add(sign);
    [-0.30, 0.30].forEach(sx => A.stick(sign, bamboo, A.V(sx, 0, 0.03), A.V(sx, 1.55, 0.03), 0.022));
    A.box(sign, woodDark, 0, 1.12, 0, 0.82, 0.82, 0.03);
    const st = loader.load('assets/images/papan_wau.png'); st.encoding = T.sRGBEncoding; st.anisotropy = 4;
    A.add(sign, new T.Mesh(new T.PlaneGeometry(0.77, 0.77), new T.MeshStandardMaterial({ map: st, roughness: 0.9, side: T.DoubleSide })), 0, 1.12, -0.017);
    A.blob(sign, 0, 0, 0, 0.9, 0.25);
    A.root.updateMatrixWorld(true);
    const sw = A.rootLocal(easel.localToWorld(A.V(2.15, 0, -0.70))); A.addCircleCol(sw.x, sw.z, 0.38);

    // ---- brushes: one per VR hand and one for the mouse or a finger
    wp.brushes = [];
    A.gripsRef.forEach((gp, i) => {
      const b = A.buildBrush(i === 1 ? A.B_MERAH : A.B_BIRU); b.grip = gp; b.holder = new T.Group(); b.holder.rotation.x = A.HAND_TILT; b.holder.visible = false;
      b.root.position.set(0, -0.0021, -0.0322); b.root.rotation.x = -22 * D2R; b.holder.add(b.root); gp.add(b.holder); wp.brushes.push(b);
      gp.addEventListener('connected', e => { const hand = e.data && e.data.handedness; b.home = hand === 'left' ? A.B_BIRU : A.B_MERAH; A.setDye(b, b.home); gp.add(b.holder); });
    });
    wp.flat = A.buildBrush(A.B_MERAH); wp.flat.root.visible = false; wp.flat.root.scale.setScalar(1.6); A.scene.add(wp.flat.root);
    if (!spect) installWauInput();
    buildKite();
    wp.built = true;
  }

  // ---- pointer: the view centre (mouse-look), the mouse or a finger
  function wauPick(cx, cy){
    const r = A.renderer.domElement.getBoundingClientRect();
    _ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(_ndc, A.camera); ray.far = 3.2;
    const hit = ray.intersectObjects(wp.pickables, false)[0];
    if (!hit) return null;
    return hit.object === wp.quad ? { kind: 'paper', point: hit.point, uv: hit.uv } : { kind: 'pot', point: hit.point, pot: hit.object.userData.pot };
  }
  function installWauInput(){
    const el = A.renderer.domElement;
    document.addEventListener('mousedown', e => { if (e.button === 0 && e.target === el){ wptr.down = true; wptr.press = true; wptr.x = e.clientX; wptr.y = e.clientY; } });
    document.addEventListener('mouseup', e => { if (e.button === 0 && wptr.touch === undefined) wptr.down = false; });
    document.addEventListener('mousemove', e => { if (wptr.touch === undefined){ wptr.x = e.clientX; wptr.y = e.clientY; } });
    document.addEventListener('touchstart', e => {
      if (!wp.near || wptr.touch !== undefined || A.renderer.xr.isPresenting || !wp.ready) return;
      for (const tc of e.changedTouches){
        if (tc.target !== el || !wauPick(tc.clientX, tc.clientY)) continue;
        wptr.touch = tc.identifier; wptr.x = tc.clientX; wptr.y = tc.clientY; wptr.down = true; wptr.press = true;
        e.stopImmediatePropagation(); e.preventDefault(); break;
      }
    }, { capture: true, passive: false });
    document.addEventListener('touchmove', e => { for (const tc of e.changedTouches) if (tc.identifier === wptr.touch){ wptr.x = tc.clientX; wptr.y = tc.clientY; e.preventDefault(); } }, { capture: true, passive: false });
    ['touchend', 'touchcancel'].forEach(ev => document.addEventListener(ev, e => { for (const tc of e.changedTouches) if (tc.identifier === wptr.touch){ wptr.touch = undefined; wptr.down = false; } }, true));
    // buttons for flying the wau
    const box = document.createElement('div'); box.id = 'wauBtns';
    box.style.cssText = 'position:fixed;right:18px;bottom:24px;z-index:12;display:flex;flex-direction:column;gap:8px;align-items:flex-end;pointer-events:none';
    const mk = (id, my, en) => { const b = document.createElement('button'); b.id = id; b.innerHTML = '<b>' + my + '</b><br><i>' + en + '</i>';
      b.style.cssText = 'pointer-events:auto;display:none;padding:8px 16px;border-radius:14px;background:rgba(20,14,6,0.82);color:#f2e2b6;border:1px solid rgba(242,217,138,0.7);font-family:Georgia,serif;font-size:12.5px;line-height:1.35;cursor:pointer;text-align:center';
      box.appendChild(b); return b; };
    wp.btnFly = mk('wauFly', 'TERBANGKAN WAU', 'Fly the wau'); wp.btnReel = mk('wauReel', 'TARIK TALI (tahan)', 'Wind the string in (hold)'); wp.btnLet = mk('wauLet', 'LEPASKAN', 'Let it go');
    document.body.appendChild(box);
    wp.btnFly.addEventListener('click', () => { if (!wp.flyer && !wp.soaring && wp.near) launch({ flat: true }); });
    wp.btnLet.addEventListener('click', () => { if (wp.flyer) release(); });
    const reel = v => () => { wp.reel = v; };
    wp.btnReel.addEventListener('mousedown', reel(1)); wp.btnReel.addEventListener('touchstart', reel(1), { passive: true });
    ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(ev => wp.btnReel.addEventListener(ev, reel(0)));
    window.addEventListener('keydown', e => { if (e.key === 'r' || e.key === 'R') wp.reel = 1; });
    window.addEventListener('keyup', e => { if (e.key === 'r' || e.key === 'R') wp.reel = 0; });
  }

  // ---- painting on the paper (the same as WauPlay.cs)
  function dab(fx, fy, dye, r){
    const W = wp.W, H = wp.H, cur = wp.cur.data, base = wp.base.data, paper = wp.paper;
    const x0 = Math.max(0, Math.floor(fx - r - 2)), x1 = Math.min(W - 1, Math.floor(fx + r + 2)), y0 = Math.max(0, Math.floor(fy - r - 2)), y1 = Math.min(H - 1, Math.floor(fy + r + 2));
    const dc = A.DYES[dye];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++){
      const i = y * W + x; if (!paper[i]) continue;
      const dx = x + 0.5 - fx, dy = y + 0.5 - fy, cov = Math.min(1, Math.max(0, (r - Math.sqrt(dx * dx + dy * dy)) / 1.6 + 0.5));
      if (cov <= 0) continue;
      const k = Math.floor(256 * cov * 0.94), o = i * 4;
      let tr, tg, tb;
      if (dye === A.B_WATER){ tr = base[o]; tg = base[o + 1]; tb = base[o + 2]; }
      else { const v = 0.93 + 0.07 * hashN(x, y); tr = dc[0] * v; tg = dc[1] * v; tb = dc[2] * v; }
      cur[o] = (cur[o] * (256 - k) + tr * k) >> 8; cur[o + 1] = (cur[o + 1] * (256 - k) + tg * k) >> 8; cur[o + 2] = (cur[o + 2] * (256 - k) + tb * k) >> 8;
    }
    wp.dirty = true;
  }
  function stroke(ax, ay, bx, by, dye, r){
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / Math.max(2, r * 0.45)));
    for (let k = 1; k <= n; k++) dab(ax + (bx - ax) * k / n, ay + (by - ay) * k / n, dye, r);
  }
  function paintStep(b, touch, px, py, dt, t){
    if (!touch){ b.touching = false; b.dwell = 0; return; }
    let moved = b.touching ? Math.hypot(px - b.last.x, py - b.last.y) : 0;
    if (moved > 260){ b.touching = false; moved = 0; }
    b.dwell = moved < 40 * dt ? Math.min(1.5, b.dwell + dt) : Math.max(0, b.dwell - dt * 3);
    let k = Math.min(1, b.dwell / 1.5); k = k * k * (3 - 2 * k); b.k = k;
    stroke(b.touching ? b.last.x : px, b.touching ? b.last.y : py, px, py, b.dye, 13 + 24 * k);
    b.last.set(px, py); b.touching = true; wp.painted = true; wp.lastPaint = t;
  }
  function clearPaint(){
    if (!wp.ready) return;
    wp.cur.data.set(wp.base.data); wp.ctx.putImageData(wp.cur, 0, 0); wp.tex.needsUpdate = true; wp.painted = false;
  }

  // ---- the kite
  const KW = 0.80, KH = KW * 1056 / 768;
  function buildKite(){
    const k = new T.Group(); k.visible = false; A.scene.add(k); wp.kite = k;
    wp.kiteMat = new T.MeshStandardMaterial({ transparent: true, alphaTest: 0.5, side: T.DoubleSide, roughness: 0.8 });
    const q = new T.Mesh(new T.PlaneGeometry(1, 1), wp.kiteMat); q.scale.set(KW, KH, 1); k.add(q); wp.kiteQuad = q;
    const bam = A.mat(0.72, 0.58, 0.30, 0.3); let prev = null;
    for (let i = 0; i <= 8; i++){ const t = i / 8, p = A.V((t - 0.5) * KW * 0.95, KH * (0.53 + Math.sin(t * Math.PI) * 0.06), 0.02); if (prev) A.stick(k, bam, prev, p, 0.005); prev = p; }
    const tas = [A.mat(0.85, 0.12, 0.12, 0.3), A.mat(0.98, 0.78, 0.20, 0.3)];
    [[0.0, 0.12], [1.0, 0.12], [0.03, 0.45], [0.97, 0.45]].forEach(uv => { for (let j = 0; j < 3; j++) A.sph(k, tas[j % 2], (uv[0] - 0.5) * KW, (0.5 - uv[1] - 0.03 - j * 0.025) * KH, 0, 0.025, 0.035, 0.025); });
    wp.tail = []; for (let i = 0; i < 9; i++){ const s = A.sph(A.scene, tas[i % 2], 0, 0, 0, 0.05, 0.075, 0.05); s.visible = false; wp.tail.push(s); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(30), 3));
    wp.line = new T.Line(g, new T.LineBasicMaterial({ color: 0xf5f2e6 })); wp.line.frustumCulled = false; wp.line.visible = false; A.scene.add(wp.line);
    wp.kitePos = new T.Vector3(); wp.kiteVel = new T.Vector3();
  }
  function setKite(on){ wp.kite.visible = on; wp.line.visible = on; wp.tail.forEach(s => { s.visible = on; }); if (!on && wp.hum){ try { wp.hum.stop(); } catch (e){} wp.hum = null; } }
  function launch(by){
    if (!wp.ready || wp.flyer) return;
    wp.flyer = by; wp.soaring = false;
    // freeze what has been painted onto the kite, then give the easel a fresh paper
    wp.ctx.putImageData(wp.cur, 0, 0);
    const c = document.createElement('canvas'); c.width = wp.W; c.height = wp.H; c.getContext('2d').drawImage(wp.canvas, 0, 0);
    if (wp.kiteTex) wp.kiteTex.dispose();
    wp.kiteTex = new T.CanvasTexture(c); wp.kiteMat.map = wp.kiteTex; wp.kiteMat.needsUpdate = true;
    clearPaint();
    wp.quad.getWorldPosition(wp.kitePos); wp.kiteVel.set(0, 0, 0);
    wp.len = 2.2; wp.launchT = 0; wp.kT = Math.random() * 10;
    wp.windAz = Math.PI / 2;   // downwind: away from where the visitors stand (the Unity +x direction)
    setKite(true); wp.kite.position.copy(wp.kitePos);
    wp.quad.visible = false; setTimeout(() => { wp.quad.visible = true; }, 1200);
    try {
      const L = listener(), ctx = L && L.context;
      if (ctx && ctx.state === 'running'){
        if (!wp.whoosh){ wp.whoosh = makeWhoosh(); wp.humBuf = makeHum(); }
        playFlat(wp.whoosh, 0.9);
        const a = new T.PositionalAudio(L); a.setBuffer(wp.humBuf); a.setLoop(true); a.setVolume(0); a.setRefDistance(1); a.setMaxDistance(14); a.setRolloffFactor(1.1);
        wp.kite.add(a); a.play(); wp.hum = a;
      }
    } catch (e){}
    if (by.grip) A.buzz({ grip: by.grip }, 0.7, 150);
  }
  function release(){
    wp.soaring = true; wp.soarT = 0; wp.soarFrom = wp.kitePos.clone(); wp.flyer = null;
    if (wp.whoosh) playFlat(wp.whoosh, 0.6);
  }
  const _hand = new T.Vector3(), _dir = new T.Vector3();
  function handPos(by, out){
    if (by.grip){ by.grip.getWorldPosition(out); A.camera.getWorldQuaternion(_q); by.grip.getWorldQuaternion(_q); return out.addScaledVector(new T.Vector3(0, 0, -1).applyQuaternion(_q), 0.04); }
    A.camera.getWorldPosition(out); A.camera.getWorldQuaternion(_q);
    return out.addScaledVector(new T.Vector3(0.26, -0.38, -0.25).applyQuaternion(_q), 1);   // the reel, held low on the right
  }
  function orientKite(from){
    _dir.subVectors(wp.kitePos, from); if (_dir.lengthSq() < 1e-4) _dir.set(0, 1, 0); _dir.normalize();
    // the face (towards +z of the plane) looks back at the holder, tipped back with the wind, and rocks as it flies
    const m = new T.Matrix4().lookAt(from, wp.kitePos, new T.Vector3(0, 1, 0));
    wp.kite.quaternion.setFromRotationMatrix(m);
    wp.kite.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler((-28 + Math.sin(wp.kT * 1.35 + 0.8) * 5) * D2R, 0, Math.sin(wp.kT * 1.9) * 9 * D2R)));
    wp.kite.position.copy(wp.kitePos);
  }
  function drawString(a, slack){
    const attach = wp.kite.localToWorld(new T.Vector3(0, -0.05, 0.03)), pos = wp.line.geometry.attributes.position;
    for (let i = 0; i < 10; i++){
      const u = i / 9, p = new T.Vector3().lerpVectors(a, attach, u);
      p.y -= Math.sin(u * Math.PI) * slack * (0.6 + 0.4 * Math.sin(wp.kT * 1.1 + u * 3));
      pos.setXYZ(i, p.x, p.y, p.z);
    }
    pos.needsUpdate = true; wp.line.visible = true;
  }
  function moveTail(dt){
    const anchor = wp.kite.localToWorld(new T.Vector3(0, -0.62, 0)); let prev = anchor;
    wp.tail.forEach((s, i) => {
      const d = s.position.clone().sub(prev); let want;
      if (d.lengthSq() < 1e-6) want = prev.clone().add(new T.Vector3(0, -0.11, 0)); else want = prev.clone().addScaledVector(d.normalize(), 0.11);
      want.y -= 0.02; want.x += Math.sin(wp.kT * 3 + i * 0.9) * 0.012; want.z += Math.cos(wp.kT * 3 + i * 0.9) * 0.012;
      s.position.lerp(want, 1 - Math.exp(-16 * dt)); prev = s.position;
    });
  }
  function updateKite(dt, t){
    const xr = A.renderer.xr.isPresenting;
    if (wp.flyer){
      wp.kT += dt; wp.launchT += dt;
      let reel = wp.reel ? 1 : 0;
      if (wp.flyer.grip){ const h = wp.flyer.grip.userData.hand, st = A.inputState[h === 'left' ? 'left' : 'right']; reel = st.t > 0.3 ? st.t : 0; if (Math.max(st.g, 0) < 0.4) { release(); return; } }
      wp.len = Math.min(9.5, Math.max(1.6, wp.len + (reel > 0.3 ? -3.2 * reel : 0.9) * dt));
      handPos(wp.flyer, _hand);
      const az = wp.windAz + 0.35 * Math.sin(wp.kT * 0.55) + 0.15 * Math.sin(wp.kT * 1.3 + 1);
      let el = (52 + 10 * Math.sin(wp.kT * 0.8) + 5 * Math.sin(wp.kT * 2.1)) * D2R;
      el = Math.max(el, 0.45 + 0.30 * Math.min(1, wp.launchT / 1.5));
      const tension = Math.min(1, wp.launchT / 1.2);
      const target = new T.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(wp.len * tension).add(_hand).add(new T.Vector3(0, (1 - tension) * 0.2, 0));
      const acc = target.clone().sub(wp.kitePos).multiplyScalar(14).addScaledVector(wp.kiteVel, -4.6);   // lags behind the hand and overshoots a little, like a real kite
      wp.kiteVel.addScaledVector(acc, dt); wp.kitePos.addScaledVector(wp.kiteVel, dt);
      const off = wp.kitePos.clone().sub(_hand); if (off.length() > wp.len) wp.kitePos.copy(_hand).addScaledVector(off.normalize(), wp.len);
      if (wp.kitePos.y < 0.4) wp.kitePos.y = 0.4;
      orientKite(_hand); drawString(_hand, (1 - tension) * 0.8 + 0.010 * wp.len);
      const height = Math.min(1, Math.max(0, (wp.kitePos.y - 1.5) / 4));
      if (wp.hum){ wp.hum.setVolume(wp.hum.getVolume() + (0.10 + 0.40 * height - wp.hum.getVolume()) * 0.1); wp.hum.setPlaybackRate(0.9 + 0.2 * Math.min(1, wp.kiteVel.length() / 4) + 0.1 * height); }
      if (wp.flyer.grip && Math.sin(t * 9) > 0.6) A.buzz({ grip: wp.flyer.grip }, 0.04 + 0.10 * Math.min(1, wp.kiteVel.length() / 3), 50);
      moveTail(dt);
    } else if (wp.soaring){
      wp.soarT += dt; wp.kT += dt;
      const u = Math.min(1, wp.soarT / 4.5), wind = new T.Vector3(Math.sin(wp.windAz), 0.45, Math.cos(wp.windAz)).normalize();
      wp.kitePos.copy(wp.soarFrom).addScaledVector(wind, u * u * 26 + u * 2).add(new T.Vector3(0, Math.sin(u * 5) * 0.4, 0));
      orientKite(wp.kitePos.clone().addScaledVector(wind, -3));
      const s = 1 - 0.75 * u; wp.kiteQuad.scale.set(KW * s, KH * s, 1);
      wp.line.visible = false;
      if (wp.hum) wp.hum.setVolume(Math.max(0, wp.hum.getVolume() - dt * 0.4));
      moveTail(dt);
      if (u >= 1){ wp.soaring = false; setKite(false); wp.kiteQuad.scale.set(KW, KH, 1); }
    }
    // buttons
    if (wp.btnFly){
      const flat = !xr && wp.near && wp.ready;
      wp.btnFly.style.display = flat && !wp.flyer && !wp.soaring ? 'block' : 'none';
      wp.btnReel.style.display = wp.flyer && !xr ? 'block' : 'none';
      wp.btnLet.style.display = wp.flyer && !xr ? 'block' : 'none';
    }
  }

  // ---- VR: squeeze the grip at the wau to launch it
  const gprev = [false, false];
  function vrLaunch(){
    for (let h = 0; h < 2; h++){
      const gp = A.gripsRef[h]; if (!gp) continue;
      const hand = gp.userData.hand || (h === 1 ? 'right' : 'left'), st = A.inputState[hand === 'left' ? 'left' : 'right'], other = A.inputState[hand === 'left' ? 'right' : 'left'];
      const pressed = st.g > 0.75, edge = pressed && !gprev[h]; gprev[h] = pressed;
      if (!edge || wp.flyer || wp.soaring || other.g > 0.75 || !wp.quad.visible) continue;
      gp.getWorldPosition(_a); const l = wp.quad.worldToLocal(_a.clone());
      if (Math.abs(l.x) < 0.62 && Math.abs(l.y) < 0.62 && l.z > -0.60 && l.z < 0.25) launch({ grip: gp });
    }
  }

  const _eye = new T.Vector3(), _tip = new T.Vector3(), _bv = new T.Vector3(), _bq = new T.Quaternion();
  function updateWau(dt, t){
    if (!wp.built) return;
    const xr = A.renderer.xr.isPresenting;
    A.camera.getWorldPosition(_eye);
    const h = wp.easel.worldToLocal(_bv.copy(_eye)), d = Math.hypot(h.x - 0.5, h.z + 0.85);
    wp.near = d < 2.0 && !A.bk.near;
    if (!spect && wp.painted && d > 7 && t - wp.lastPaint > 150) clearPaint();
    if (wp.ready && !spect){
      // ---- VR brushes
      wp.brushes.forEach(b => {
        const hidden = wp.flyer && wp.flyer.grip === b.grip;
        const want = (wp.near && b.grip.visible && xr && !hidden) ? 1 : 0;
        b.show += Math.max(-dt * 4, Math.min(dt * 4, want - b.show));
        const s = b.show * b.show * (3 - 2 * b.show);
        b.holder.visible = s > 0.001; b.root.scale.setScalar(Math.max(s, 0.001));
        if (!xr || b.show < 0.99){ paintStep(b, false, 0, 0, dt, t); return; }
        b.tip.getWorldPosition(_tip);
        const f = wp.table.worldToLocal(_bv.copy(_tip));
        for (const pot of wp.pots){
          const dx = f.x - pot.x, dz = f.z - pot.z, dy = f.y - pot.y;
          if (dx * dx + dz * dz > POT_R * POT_R || dy > 0.03 || dy < -0.06) continue;
          if (b.dye !== pot.dye){ A.setDye(b, pot.dye); A.buzz(b, 0.55, 50); A.plop(); }
          break;
        }
        const l = wp.quad.worldToLocal(_bv.copy(_tip));
        const touch = wp.quad.visible && Math.abs(l.x) <= 0.5 && Math.abs(l.y) <= 0.5 && l.z > -0.015 && l.z < 0.10;
        paintStep(b, touch, (l.x + 0.5) * wp.W, (0.5 - l.y) * wp.H, dt, t);
        if (touch){ b.buzz -= dt; if (b.buzz <= 0){ b.buzz = 0.07; A.buzz(b, 0.08 + 0.08 * b.k, 60); } }
      });
      // ---- flat screens
      const fb = wp.flat, flat = !xr && wp.near;
      let hit = null;
      if (flat && (wptr.touch !== undefined || wptr.down || !('ontouchstart' in window))){
        const locked = document.pointerLockElement === A.renderer.domElement, r = A.renderer.domElement.getBoundingClientRect();
        hit = locked && wptr.touch === undefined ? wauPick(r.left + r.width / 2, r.top + r.height / 2) : wauPick(wptr.x, wptr.y);
      }
      if (wptr.press){
        wptr.press = false; wptr.mode = hit ? hit.kind : '';
        if (hit && hit.kind === 'pot' && fb.dye !== hit.pot.dye){ A.setDye(fb, hit.pot.dye); A.plop(); }
      }
      const painting = !!hit && hit.kind === 'paper' && wptr.down && wptr.mode === 'paper' && wp.quad.visible;
      paintStep(fb, painting, painting ? hit.uv.x * wp.W : 0, painting ? (1 - hit.uv.y) * wp.H : 0, dt, t);
      fb.root.visible = !!hit && wp.quad.visible;
      if (hit){
        A.camera.getWorldQuaternion(_bq);
        const toEye = _eye.clone().sub(hit.point).normalize();
        const dir = toEye.clone().multiplyScalar(0.55).addScaledVector(new T.Vector3(1, 0, 0).applyQuaternion(_bq), 0.5).addScaledVector(new T.Vector3(0, 1, 0).applyQuaternion(_bq), -0.45).normalize();
        fb.root.quaternion.setFromUnitVectors(new T.Vector3(0, 0, -1), dir.clone().negate());
        fb.root.position.copy(hit.point).addScaledVector(toEye, painting ? 0.004 : 0.04).addScaledVector(dir, 0.195 * 1.6);
      }
      wp.hintT = flat ? (wp.hintT || 0) + dt : 0;
      if (wp.hint) wp.hint.style.opacity = flat && wp.hintT < 8 && !wptr.down && !wp.flyer ? '1' : '0';
      if (wp.dirty && t - (wp.lastUp || 0) > 0.033){ wp.lastUp = t; wp.dirty = false; wp.ctx.putImageData(wp.cur, 0, 0); wp.tex.needsUpdate = true; }
      vrLaunch();
    }
    updateKite(dt, t);
  }
  GWMX.resetPlay = () => {
    if (wp.built){ clearPaint(); wp.flyer = null; wp.soaring = false; setKite(false); wp.quad.visible = true; }
    ku.flatHeld = null; ku.held = [null, null];
    ku.items.forEach(it => { it.eaten = false; it.bites = 0; it.size = it.sizeNow = 1; it.holder = null; it.returning = false; it.hover = 0; A.kuih.tray.attach(it.g); it.g.position.copy(it.lp); it.g.quaternion.copy(it.lq); it.g.scale.setScalar(1); it.g.visible = true; });
  };
  GWMX.resetWau = () => { if (wp.built){ clearPaint(); wp.flyer = null; wp.soaring = false; setKite(false); wp.quad.visible = true; } };

  // ================================================================ install / update
  GWMX.installPlay = function(o){
    A = GWMX.api; spect = !!A.SPECT;
    try { installKuih(); } catch (e){ console.error('kuih', e); }
    try { installWau(); } catch (e){ console.error('wau', e); }
    if (!spect){
      const touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
      const h = document.createElement('div'); h.id = 'wauHint';
      h.style.cssText = 'position:fixed;left:50%;bottom:' + (touch ? 10 : 28) + 'px;transform:translateX(-50%);z-index:11;padding:8px 18px;border-radius:14px;background:rgba(20,14,6,0.74);color:#f2e2b6;border:1px solid rgba(242,217,138,0.6);font-family:Georgia,serif;font-size:13px;line-height:1.5;text-align:center;pointer-events:none;opacity:0;transition:opacity .5s;width:max-content;max-width:90vw';
      h.innerHTML = touch ? '<b>SENTUH</b> kertas wau untuk mewarna · sentuh pasu untuk tukar warna<br><i>Touch the paper to paint · tap a pot to change colour · then fly it</i>'
        : '<b>KLIK &amp; TAHAN</b> pada kertas wau untuk mewarna · klik pasu untuk tukar warna<br><i>Hold the mouse on the paper to paint · click a pot to change colour · then press FLY</i>';
      document.body.appendChild(h); wp.hint = h;
    }
    warmVoices();
  };
  GWMX.updatePlay = function(dt, t){
    if (!A) return;
    clock = t;
    playCues(t);
    try { updateKuih(dt, t); } catch (e){ console.error('kuih update', e); }
    try { updateWau(dt, t); } catch (e){ console.error('wau update', e); }
  };
  GWMX._play = { wp, ku, test: {   // for checking the activities from a headless browser
    stroke: (u0, v0, u1, v1, dye, r) => { stroke(u0 * wp.W, (1 - v0) * wp.H, u0 * wp.W, (1 - v0) * wp.H, dye, r); stroke(u0 * wp.W, (1 - v0) * wp.H, u1 * wp.W, (1 - v1) * wp.H, dye, r); wp.ctx.putImageData(wp.cur, 0, 0); wp.tex.needsUpdate = true; },
    launch: () => launch({ flat: true }), release, bite: i => bite(ku.items[i]), grab: i => { ku.flatHeld = ku.items[i]; grab(ku.items[i], A.scene); },
    say: (p, k) => GWMX.say(p, k, 0), cues: () => cues.length, voiceInfo: p => ({ has: !!p.voiceAud, playing: p.voiceAud && p.voiceAud.isPlaying, next: p.nextVoice, buf: p.voiceAud && p.voiceAud.buffer && +p.voiceAud.buffer.duration.toFixed(2) }) } };
})();
