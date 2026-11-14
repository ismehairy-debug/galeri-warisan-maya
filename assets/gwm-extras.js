/* ------------------------------------------------------------------
   GWM extras -- the same additions made to the Meta Quest (Unity) app, so the
   website matches it: the visitor's own hands in VR, modelled gamelan, kuih
   display, villagers playing congkak and batu seremban, the welcome grove, the
   wau bulan maker, and the batik corner where visitors colour a cloth.

   Everything is authored in the Unity app's coordinate frame (x right, y up,
   z north) inside one group that is mirrored on z, which is exactly the
   conversion the web scene went through when it was exported to Unity.
   Plain classic script: uses the global THREE (r128).
------------------------------------------------------------------- */
(function(){
  'use strict';
  const T = THREE;
  const GWMX = {};
  window.GWMX = GWMX;

  let root, camera, renderer, scene;
  let gripsRef = [];
  const people = [];
  const updaters = [];

  // ---------------------------------------------------------------- helpers
  const matCache = {};
  function mat(r, g, b, gloss, metal, opts){
    if (gloss === undefined) gloss = 0.3;
    metal = metal || 0;
    const key = [r, g, b, gloss, metal, opts && opts.key].join('|');
    if (matCache[key]) return matCache[key];
    const m = new T.MeshStandardMaterial({ color: new T.Color(r, g, b), roughness: Math.max(0.12, 1 - gloss * 0.9), metalness: metal, side: T.DoubleSide });
    if (opts && opts.map){ m.map = opts.map; m.color.set(0xffffff); }
    matCache[key] = m;
    return m;
  }
  function V(x, y, z){ return new T.Vector3(x, y, z); }
  function add(parent, mesh, x, y, z){ mesh.position.set(x || 0, y || 0, z || 0); parent.add(mesh); return mesh; }
  function box(parent, m, x, y, z, sx, sy, sz, ry){
    const o = add(parent, new T.Mesh(new T.BoxGeometry(1, 1, 1), m), x, y, z); o.scale.set(sx, sy, sz); if (ry) o.rotation.y = ry; return o;
  }
  function sph(parent, m, x, y, z, sx, sy, sz){
    const o = add(parent, new T.Mesh(new T.SphereGeometry(0.5, 16, 12), m), x, y, z); o.scale.set(sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz); return o;
  }
  // Unity-style cylinder: diameter dx, height 2*hy
  function cyl(parent, m, x, y, z, dx, hy, dz, rx, ry, rz){
    const o = add(parent, new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 2, 14), m), x, y, z); o.scale.set(dx, hy, dz);
    o.rotation.set(rx || 0, ry || 0, rz || 0); return o;
  }
  function lathe(points, segs){ return new T.LatheGeometry(points.map(p => new T.Vector2(p[0], p[1])), segs || 24); }
  function torusGeo(R, r, segs, sides){
    const pts = [];
    for (let k = 0; k <= sides; k++){ const a = Math.PI * 2 * k / sides; pts.push(new T.Vector2(R + r * Math.cos(a), r * Math.sin(a))); }
    return new T.LatheGeometry(pts, segs || 20);
  }
  function part(parent, geo, m, x, y, z, rx, ry, rz, sx, sy, sz){
    const o = add(parent, new T.Mesh(geo, m), x, y, z);
    o.rotation.set(rx || 0, ry || 0, rz || 0); o.scale.set(sx === undefined ? 1 : sx, sy === undefined ? 1 : sy, sz === undefined ? 1 : sz); return o;
  }
  // elliptical cross-sections along +Z: rings are [z, halfWidth(x), halfThickness(y)]
  function loft(rings, segs){
    segs = segs || 18;
    const pos = [], idx = [];
    for (let i = 0; i < rings.length; i++)
      for (let j = 0; j <= segs; j++){
        const a = Math.PI * 2 * j / segs;
        pos.push(Math.cos(a) * rings[i][1], Math.sin(a) * rings[i][2], rings[i][0]);
      }
    const cols = segs + 1;
    for (let i = 0; i < rings.length - 1; i++)
      for (let j = 0; j < segs; j++){
        const a = i * cols + j, b = a + 1, c = (i + 1) * cols + j, d = c + 1;
        idx.push(a, b, c, b, d, c);
      }
    const c0 = pos.length / 3; pos.push(0, 0, rings[0][0]);
    const c1 = c0 + 1; pos.push(0, 0, rings[rings.length - 1][0]);
    const last = (rings.length - 1) * cols;
    for (let j = 0; j < segs; j++){ idx.push(c0, j + 1, j); idx.push(c1, last + j, last + j + 1); }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  const smooth = u => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
  const lerpV = (a, b, u) => new T.Vector3().lerpVectors(a, b, smooth(u));

  // ---------------------------------------------------------------- hand props
  function buildKeris(){
    const g = new T.Group();
    const hiltWood = mat(0.17, 0.085, 0.04, 0.55), sheathWood = mat(0.50, 0.25, 0.09, 0.5), sheathDark = mat(0.26, 0.12, 0.05, 0.5);
    const gold = mat(0.90, 0.72, 0.24, 0.78, 0.85);
    // controller space in three: pointing forward is -z; keris authored toward +z, so flip it
    const k = new T.Group(); k.rotation.y = Math.PI; k.rotation.x = -0.14; g.add(k);
    const hilt = [[0, 0], [0.015, 0], [0.017, 0.012], [0.021, 0.030], [0.016, 0.048], [0.013, 0.064], [0.017, 0.080], [0.022, 0.094], [0.017, 0.108], [0, 0.114]];
    part(k, lathe(hilt, 14), hiltWood, 0, 0, 0, -Math.PI / 2);
    sph(k, hiltWood, 0, -0.012, -0.112, 0.02, 0.03, 0.044).rotation.x = -0.6;
    part(k, torusGeo(0.0175, 0.0042, 14, 7), gold, 0, 0, -0.012, Math.PI / 2);
    part(k, torusGeo(0.016, 0.0036, 14, 7), gold, 0, 0, -0.068, Math.PI / 2);
    part(k, lathe([[0, 0], [0.021, 0], [0.027, 0.007], [0.022, 0.013], [0.028, 0.020], [0.022, 0.030], [0, 0.030]], 16), gold, 0, 0, 0, Math.PI / 2);
    part(k, loft([[0.030, 0.026, 0.014], [0.045, 0.046, 0.020], [0.070, 0.055, 0.024], [0.100, 0.052, 0.023], [0.130, 0.042, 0.020], [0.160, 0.032, 0.016]], 20), sheathWood, 0, 0, 0);
    part(k, loft([[0.050, 0.012, 0.023], [0.080, 0.016, 0.026], [0.115, 0.012, 0.024], [0.145, 0.008, 0.019]], 12), sheathDark, 0, 0, 0);
    sph(k, gold, 0, 0, 0.082, 0.016, 0.016, 0.012);
    part(k, loft([[0.150, 0.030, 0.015], [0.200, 0.026, 0.0135], [0.260, 0.021, 0.012], [0.320, 0.017, 0.0105], [0.360, 0.0145, 0.0095]], 18), sheathWood, 0, 0, 0);
    part(k, loft([[0.155, 0.0305, 0.0155], [0.172, 0.0290, 0.0150]], 18), gold, 0, 0, 0);
    part(k, loft([[0.250, 0.0225, 0.0128], [0.262, 0.0215, 0.0124]], 18), gold, 0, 0, 0);
    part(k, loft([[0.330, 0.0165, 0.0102], [0.372, 0.0168, 0.0108], [0.394, 0.0120, 0.0085], [0.408, 0.0045, 0.0035], [0.411, 0.0005, 0.0005]], 14), gold, 0, 0, 0);
    return g;
  }

  function buildPelita(){
    const g = new T.Group();
    const brass = mat(0.86, 0.64, 0.20, 0.8, 0.85), wood = mat(0.22, 0.10, 0.05, 0.5);
    const k = new T.Group(); k.rotation.y = Math.PI; k.rotation.x = 0.2; g.add(k);
    cyl(k, wood, 0, -0.004, 0.045, 0.026, 0.060, 0.026, Math.PI / 2);
    part(k, torusGeo(0.016, 0.0045, 12, 6), brass, 0, 0, 0.098);
    const body = [[0, 0], [0.046, 0], [0.050, 0.007], [0.020, 0.014], [0.012, 0.040], [0.026, 0.052], [0.052, 0.066], [0.058, 0.082], [0.046, 0.100], [0.022, 0.108], [0.016, 0.120], [0, 0.120]];
    part(k, lathe(body, 20), brass, 0, 0, 0.145);
    cyl(k, brass, 0, 0.134, 0.145, 0.010, 0.010, 0.010);
    const flameMat = new T.MeshStandardMaterial({ color: 0xffc74d, emissive: 0xff9a2a, emissiveIntensity: 1.6, roughness: 0.4 });
    const flame = sph(k, flameMat, 0, 0.162, 0.145, 0.020, 0.046, 0.020);
    sph(k, new T.MeshBasicMaterial({ color: 0xfff6cc }), 0, 0.153, 0.145, 0.010, 0.024, 0.010);
    updaters.push((dt, t) => {
      const f = 1 + Math.sin(t * 9) * 0.10 + Math.sin(t * 20.7 + 1) * 0.07;
      flame.scale.set(0.020 * (2 - f), 0.046 * f, 0.020 * (2 - f)); flameMat.emissiveIntensity = 1.3 + 0.4 * f;
    });
    return g;
  }

  // a two-bone arm drawn with cylinders; positions are in the group's own frame
  function Limb(parent, sleeve, skin, s, len, radius){
    this.l1 = (len || 0.25) * s; this.l2 = (len || 0.25) * 0.95 * s; this.r = (radius || 0.042) * s;
    this.upper = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 1, 10), sleeve);
    this.lower = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 1, 10), sleeve);
    this.elbow = new T.Mesh(new T.SphereGeometry(0.5, 10, 8), sleeve);
    this.hand = new T.Mesh(new T.SphereGeometry(0.5, 10, 8), skin);
    const r = this.r; this.elbow.scale.setScalar(r * 2.1); this.hand.scale.set(r * 1.9, r * 1.5, r * 2.3);
    [this.upper, this.lower, this.elbow, this.hand].forEach(o => parent.add(o));
  }
  Limb.prototype.setScale = function(k){ this.l1 = this.bl1 * k; this.l2 = this.bl2 * k; };
  function seg(mesh, a, b, rad){
    const d = new T.Vector3().subVectors(b, a); const len = Math.max(d.length(), 0.001);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(V(0, 1, 0), d.divideScalar(len));
    mesh.scale.set(rad * 2, len, rad * 2);
  }
  Limb.prototype.solve = function(shoulder, target, pole){
    const to = new T.Vector3().subVectors(target, shoulder);
    const d = Math.max(0.05, Math.min(to.length(), this.l1 + this.l2 - 0.002));
    const dir = to.lengthSq() > 1e-6 ? to.clone().normalize() : V(0, -1, 0);
    const tgt = shoulder.clone().addScaledVector(dir, d);
    const a = (this.l1 * this.l1 - this.l2 * this.l2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, this.l1 * this.l1 - a * a));
    let perp = pole.clone().addScaledVector(dir, -pole.dot(dir));
    if (perp.lengthSq() < 1e-6) perp = new T.Vector3().crossVectors(dir, V(1, 0, 0));
    perp.normalize();
    const el = shoulder.clone().addScaledVector(dir, a).addScaledVector(perp, h);
    seg(this.upper, shoulder, el, this.r); seg(this.lower, el, tgt, this.r * 0.92);
    this.elbow.position.copy(el); this.hand.position.copy(tgt);
  };


  // ---------------------------------------------------------------- hands
  // A modelled hand that follows the controller (forward is -z in controller space): trigger curls the
  // index finger, grip the others, thumb folds with the thumbstick / face buttons.
  const inputState = { left: { t: 0, g: 0, th: 0 }, right: { t: 0, g: 0, th: 0 } };
  const handModels = [];
  const FANG = [[85, 95, 65], [88, 98, 68], [90, 98, 66], [92, 96, 62]];
  const HAND_TILT = 0.31;   // how the hand model sits on the controller; the batik brush is held relative to it
  function buildHand(left, sleeve){
    const g = new T.Group(); g.rotation.x = HAND_TILT;
    const skin = mat(0.84, 0.62, 0.45, 0.35), black = mat(0.035, 0.035, 0.045, 0.5), gold = mat(0.90, 0.72, 0.24, 0.8, 0.85);
    const sg = left ? -1 : 1;              // fingers fold toward the palm side (-x for the right hand)
    sph(g, skin, 0, 0, -0.032, 0.036, 0.090, 0.100); sph(g, skin, -sg * 0.004 * -1, -0.002, -0.002, 0.040, 0.074, 0.060);
    const finger = (basePos, baseRot, len, r) => {
      const pivots = []; let parent = g;
      for (let j = 0; j < 3; j++){
        const pv = new T.Group(); parent.add(pv);
        if (j === 0){ pv.position.copy(basePos); pv.rotation.set(baseRot[0], baseRot[1], 0); } else pv.position.set(0, 0, -len[j - 1]);
        const l = Math.max(len[j], 0.012);
        cyl(pv, skin, 0, 0, -l * 0.5, r * 2, l * 0.5, r * 2, Math.PI / 2); sph(pv, skin, 0, 0, 0, r * 2.1);
        pivots.push(pv); parent = pv;
      }
      return pivots;
    };
    const ys = [0.031, 0.011, -0.010, -0.029], lens = [[0.040, 0.026, 0.020], [0.044, 0.029, 0.021], [0.040, 0.027, 0.020], [0.032, 0.020, 0.016]];
    const chain = ys.map((y, i) => finger(V(0, y, -0.078), [0, 0], lens[i], i === 3 ? 0.0085 : 0.0095));
    chain.push(finger(V(0, 0.042, -0.014), [0.7, 0], [0.036, 0.028, 0], 0.0105));
    if (sleeve){
      cyl(g, black, 0, 0, 0.115, 0.062, 0.105, 0.060, Math.PI / 2);
      part(g, torusGeo(0.031, 0.0055, 14, 6), gold, 0, 0, 0.012, Math.PI / 2);
    }
    const cur = [0, 0, 0], tgt = [0, 0, 0];
    const h = { group: g, left, set(t, gr, th){ tgt[0] = t; tgt[1] = gr; tgt[2] = th; } };
    h.update = dt => {
      const k = 1 - Math.exp(-16 * dt);
      for (let i = 0; i < 3; i++) cur[i] += (tgt[i] - cur[i]) * k;
      for (let f = 0; f < 4; f++){
        const c = f === 0 ? Math.max(0.2, cur[0]) : Math.max(0.28, cur[1]);
        for (let j = 0; j < 3; j++) chain[f][j].rotation.y = sg * FANG[f][j] * Math.PI / 180 * c;
      }
      const th = Math.max(0.1, Math.max(cur[2], cur[1] * 0.6));
      chain[4][0].rotation.y = sg * (0.35 + 0.7 * th); chain[4][1].rotation.y = sg * 0.8 * th;
    };
    handModels.push(h); g.userData.hand = h;
    return g;
  }
  function pollInputs(){
    const sess = renderer && renderer.xr && renderer.xr.getSession && renderer.xr.getSession();
    if (!sess) return;
    for (const src of sess.inputSources){
      if (!src.gamepad || !src.handedness) continue;
      const b = src.gamepad.buttons, a = src.gamepad.axes;
      const stick = a.length >= 4 ? Math.hypot(a[2], a[3]) : (a.length >= 2 ? Math.hypot(a[0], a[1]) : 0);
      const face = (b[4] && b[4].pressed) || (b[5] && b[5].pressed);
      const st = inputState[src.handedness === 'left' ? 'left' : 'right'];
      st.t = b[0] ? b[0].value : 0; st.g = b[1] ? b[1].value : 0; st.th = Math.min(1, Math.max(stick * 1.4, face ? 1 : 0));
    }
  }

  // ---------------------------------------------------------------- villagers
  const SKINS = [[0.88, 0.66, 0.46], [0.78, 0.55, 0.36], [0.66, 0.45, 0.29], [0.93, 0.74, 0.55]];
  function makePerson(name, pos, s, top, bottom, headwear, skin, lean){
    const p = { s, root: new T.Group(), torso: new T.Group(), head: new T.Group() };
    p.root.position.copy(pos); root.add(p.root);
    const sk = mat.apply(null, SKINS[skin % 4].concat([0.3]));
    const topM = mat(top[0], top[1], top[2], 0.25), botM = mat(bottom[0], bottom[1], bottom[2], 0.25);
    const R = p.root;
    blob(R, 0, 0, 0.14 * s, 1.25 * s, 0.4);
    sph(R, botM, 0, 0.085 * s, 0.15 * s, 0.52 * s, 0.15 * s, 0.46 * s);
    sph(R, botM, -0.27 * s, 0.075 * s, 0.30 * s, 0.16 * s); sph(R, botM, 0.27 * s, 0.075 * s, 0.30 * s, 0.16 * s);
    sph(R, sk, -0.10 * s, 0.045 * s, 0.43 * s, 0.09 * s, 0.06 * s, 0.15 * s); sph(R, sk, 0.10 * s, 0.045 * s, 0.43 * s, 0.09 * s, 0.06 * s, 0.15 * s);
    p.torso.position.set(0, 0.14 * s, 0); p.torso.rotation.x = lean * Math.PI / 180; R.add(p.torso);
    sph(p.torso, topM, 0, 0.30 * s, 0, 0.31 * s, 0.62 * s, 0.21 * s);
    sph(p.torso, sk, 0, 0.605 * s, 0.01 * s, 0.09 * s, 0.10 * s, 0.09 * s);
    p.head.position.set(0, 0.70 * s, 0.02 * s); p.torso.add(p.head);
    sph(p.head, sk, 0, 0, 0, 0.20 * s, 0.23 * s, 0.21 * s);
    const dark = mat(0.05, 0.04, 0.04, 0.6);
    sph(p.head, dark, -0.038 * s, 0.012 * s, 0.095 * s, 0.022 * s); sph(p.head, dark, 0.038 * s, 0.012 * s, 0.095 * s, 0.022 * s);
    sph(p.head, mat(0.86, 0.42, 0.38, 0.3), 0, -0.045 * s, 0.098 * s, 0.05 * s, 0.014 * s, 0.02 * s);
    if (headwear === 1){
      cyl(p.head, mat(0.05, 0.05, 0.06, 0.4), 0, 0.105 * s, -0.005 * s, 0.20 * s, 0.052 * s, 0.20 * s);
    } else if (headwear === 2){
      sph(p.head, topM, 0, 0.015 * s, -0.012 * s, 0.235 * s, 0.26 * s, 0.23 * s);
      sph(p.torso, topM, 0, 0.56 * s, -0.01 * s, 0.40 * s, 0.20 * s, 0.26 * s);
      sph(p.head, sk, 0, 0, 0.045 * s, 0.17 * s, 0.20 * s, 0.14 * s);
      sph(p.head, dark, -0.038 * s, 0.012 * s, 0.105 * s, 0.022 * s); sph(p.head, dark, 0.038 * s, 0.012 * s, 0.105 * s, 0.022 * s);
    } else {
      sph(p.head, dark, 0, 0.04 * s, -0.018 * s, 0.215 * s, 0.20 * s, 0.215 * s);
    }
    p.armL = new Limb(root, topM, sk, s); p.armR = new Limb(root, topM, sk, s);   // arms are posed in the shared group frame
    p.armL.bl1 = p.armL.l1; p.armL.bl2 = p.armL.l2; p.armR.bl1 = p.armR.l1; p.armR.bl2 = p.armR.l2;
    p.face = function(target){ const d = target.clone().sub(p.root.position); d.y = 0; if (d.lengthSq() > 1e-4) p.root.rotation.y = Math.atan2(d.x, d.z); };
    p.local = v => { p.torso.updateWorldMatrix(true, false); return p.torso.localToWorld(v.clone()); };
    // helpers work in the shared group frame, so convert via the world matrix of root
    p.shoulder = side => rootLocal(p.torso.localToWorld(V(side * 0.17 * s, 0.52 * s, 0)));
    p.rest = side => rootLocal(p.root.localToWorld(V(0.20 * side * s, 0.20 * s, 0.34 * s)));
    p.fwd = () => { const q = new T.Vector3(0, 0, 1).applyAxisAngle(V(0, 1, 0), p.root.rotation.y); return q; };
    p.right = () => V(Math.cos(p.root.rotation.y), 0, -Math.sin(p.root.rotation.y)).multiplyScalar(-1);
    p.poleL = () => p.right().multiplyScalar(-1).add(V(0, -0.6, 0)).normalize();
    p.poleR = () => p.right().add(V(0, -0.6, 0)).normalize();
    people.push(p);
    return p;
  }
  function rootLocal(worldV){ return root.worldToLocal(worldV); }
  function blob(parent, x, y, z, size, alpha){
    if (!blob.m){
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32);
      gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      blob.m = new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false });
    }
    const q = new T.Mesh(new T.PlaneGeometry(1, 1), blob.m); q.rotation.x = -Math.PI / 2; q.scale.set(size, size, 1);
    q.position.set(x, y + 0.01, z); q.renderOrder = 1; parent.add(q); return q;
  }

  function makeMat(group, cx, cz, w, d, a, b, rim){
    const g = new T.Group(); g.position.set(cx, 0, cz); group.add(g);
    box(g, mat(rim[0], rim[1], rim[2], 0.2), 0, 0.008, 0, w + 0.10, 0.016, d + 0.10);
    const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++){ const cc = ((i + j) & 1) ? b : a; x.fillStyle = 'rgb(' + (cc[0] * 255 | 0) + ',' + (cc[1] * 255 | 0) + ',' + (cc[2] * 255 | 0) + ')'; x.fillRect(i * 4, j * 4, 4, 4); }
    const tex = new T.CanvasTexture(c); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(w * 3, d * 3);
    const m = new T.MeshStandardMaterial({ map: tex, roughness: 0.9 });
    box(g, m, 0, 0.019, 0, w, 0.006, d);
    return g;
  }

  // ---- congkak ------------------------------------------------------------
  const CYC = 5.0;
  const cg = { holes: [], seedsA: [], seedsB: [], players: [] };
  function buildCongkak(c){
    makeMat(root, c.x, c.z, 2.5, 1.8, [0.80, 0.64, 0.34], [0.66, 0.48, 0.22], [0.45, 0.20, 0.14]);
    const board = new T.Group(); board.position.set(c.x, 0.065, c.z); root.add(board); cg.board = board;
    const wood = mat(0.42, 0.22, 0.09, 0.5), hole = mat(0.10, 0.045, 0.02, 0.2), gold = mat(0.88, 0.70, 0.22, 0.7, 0.8);
    part(board, loft([[-0.62, 0.060, 0.040], [-0.55, 0.115, 0.048], [-0.40, 0.145, 0.050], [0.40, 0.145, 0.050], [0.55, 0.115, 0.048], [0.62, 0.060, 0.040]], 20), wood, 0, 0, 0, 0, Math.PI / 2, 0);
    sph(board, gold, -0.64, 0.02, 0, 0.05); sph(board, gold, 0.64, 0.02, 0, 0.05);
    for (let row = 0; row < 2; row++) for (let i = 0; i < 7; i++)
      cg.holes[row * 8 + i] = cyl(board, hole, -0.36 + i * 0.12, 0.047, row === 0 ? 0.062 : -0.062, 0.062, 0.0015, 0.062);
    cg.holes[7] = cyl(board, hole, 0.50, 0.047, 0, 0.095, 0.0015, 0.19);
    cg.holes[15] = cyl(board, hole, -0.50, 0.047, 0, 0.095, 0.0015, 0.19);
    const seedM = [mat(0.92, 0.90, 0.84, 0.5), mat(0.80, 0.12, 0.10, 0.6), mat(0.12, 0.10, 0.10, 0.6)];
    for (let i = 0; i < 8; i++) for (let pl = 0; pl < 2; pl++){
      const sd = sph(board, seedM[(i + pl) % 3], 0, 0, 0, 0.032); sd.scale.setScalar(0.0001);
      (pl === 0 ? cg.seedsA : cg.seedsB).push(sd);
    }
    cg.carried = sph(root, seedM[1], 0, 0, 0, 0.05); cg.carried.scale.setScalar(0.0001);
    cg.A = makePerson('A', V(c.x - 0.15, 0.02, c.z + 0.78), 1.0, [0.78, 0.16, 0.42], [0.35, 0.18, 0.52], 2, 0, 24);
    cg.B = makePerson('B', V(c.x + 0.15, 0.02, c.z - 0.78), 0.95, [0.18, 0.50, 0.58], [0.55, 0.30, 0.12], 1, 1, 24);
    cg.kid = makePerson('K', V(c.x + 1.10, 0.02, c.z + 0.05), 0.72, [0.95, 0.70, 0.20], [0.25, 0.30, 0.60], 0, 3, 8);
    const bp = new T.Vector3(c.x, 0, c.z);
    cg.A.face(bp); cg.B.face(bp); cg.kid.face(bp);
    addBoxCol(c.x, c.z, 0.7, 0.18);
  }
  function holeWorld(i){ return rootLocal(cg.holes[i].localToWorld(V(0, 0.012, 0))); }
  function updateCongkak(t){
    const tt = t % (CYC * 2), aActive = tt < CYC, u = aActive ? tt : tt - CYC;
    const act = aActive ? cg.A : cg.B, idle = aActive ? cg.B : cg.A;
    const seeds = aActive ? cg.seedsA : cg.seedsB, other = aActive ? cg.seedsB : cg.seedsA;
    const own = aActive ? 0 : 1, far = aActive ? 1 : 0;
    const idx = [own * 8 + 2, own * 8 + 3, own * 8 + 4, own * 8 + 5, own * 8 + 6, aActive ? 7 : 15, far * 8 + 6, far * 8 + 5];
    const stops = idx.map(holeWorld);
    const T0 = 0.8, STEP = 0.46, T1 = T0 + STEP * 8;
    const rest = act.rest(1); let hand, carried = 0;
    if (u < T0){ hand = lerpV(rest, stops[0].clone().add(V(0, 0.02, 0)), u / T0); carried = Math.max(0, Math.min(1, (u - T0 * 0.6) / (T0 * 0.4))); seeds.forEach(s => s.scale.setScalar(0.0001)); }
    else if (u < T1){
      const k = (u - T0) / STEP, i = Math.min(7, Math.floor(k)), f = k - i;
      const a = i === 0 ? stops[0] : stops[i - 1], b = stops[i];
      hand = new T.Vector3().lerpVectors(a, b, smooth(f * 1.15)).add(V(0, Math.sin(Math.min(1, f * 1.15) * Math.PI) * 0.07 + 0.02, 0));
      carried = 1 - i / 8;
      seeds.forEach((sd, s) => {
        const placed = s < i || (s === i && f > 0.45);
        const pop = (s === i && placed) ? 1 + Math.sin(Math.min(1, Math.max(0, (f - 0.45) * 4)) * Math.PI) * 0.35 : 1;
        sd.parent.worldToLocal(root.localToWorld(stops[s].clone().add(V((s % 2) * 0.012, 0.012, (Math.floor(s / 2) % 2) * 0.012))));
        const wp = root.localToWorld(stops[s].clone().add(V((s % 2) * 0.012, 0.012, (Math.floor(s / 2) % 2) * 0.012)));
        sd.position.copy(sd.parent.worldToLocal(wp)); sd.scale.setScalar(Math.max(0.0001, 0.032 * (placed ? 1 : 0) * pop));
      });
    } else {
      const f = (u - T1) / (CYC - T1);
      hand = lerpV(stops[7].clone().add(V(0, 0.04, 0)), rest, f);
      seeds.forEach(sd => sd.scale.setScalar(Math.max(0.0001, 0.032 * (1 - smooth(f * 1.6)))));
    }
    other.forEach(sd => sd.scale.multiplyScalar(0.8));
    cg.carried.position.copy(hand).add(V(0, 0.025, 0)); cg.carried.scale.setScalar(Math.max(0.0001, 0.05 * carried));
    act.armR.solve(act.shoulder(1), hand, act.poleR());
    act.armL.solve(act.shoulder(-1), act.rest(-1).add(V(0, Math.sin(t * 1.3) * 0.01, 0)), act.poleL());
    idle.armR.solve(idle.shoulder(1), idle.rest(1).add(V(0, Math.sin(t * 1.1) * 0.012, 0)), idle.poleR());
    idle.armL.solve(idle.shoulder(-1), idle.rest(-1), idle.poleL());
    nod(cg.A, t, 0); nod(cg.B, t, 1.7);
    cg.kid.armL.solve(cg.kid.shoulder(-1), cg.kid.rest(-1).add(V(0, 0.02, 0)), cg.kid.poleL());
    cg.kid.armR.solve(cg.kid.shoulder(1), cg.kid.rest(1).add(V(0, Math.max(0, Math.sin(t * 2.2)) * 0.04, 0)), cg.kid.poleR());
    cg.kid.head.rotation.set(Math.sin(t * 1.6) * 0.07, Math.sin(t * 0.7) * 0.17, 0);
  }
  function nod(p, t, ph){ p.head.rotation.set(0.25 + Math.sin(t * 1.4 + ph) * 0.05, Math.sin(t * 0.6 + ph) * 0.1, 0); }

  // ---- batu seremban ------------------------------------------------------
  const kids = [];
  function buildBatu(c){
    makeMat(root, c.x, c.z, 2.1, 2.1, [0.74, 0.55, 0.28], [0.60, 0.40, 0.18], [0.50, 0.18, 0.12]);
    const stone = mat(0.36, 0.35, 0.33, 0.25), stone2 = mat(0.50, 0.46, 0.40, 0.25);
    const tops = [[0.90, 0.32, 0.28], [0.25, 0.62, 0.45], [0.95, 0.78, 0.22]], bots = [[0.28, 0.34, 0.62], [0.55, 0.26, 0.20], [0.20, 0.45, 0.40]];
    [90, 210, 330].forEach((deg, i) => {
      const a = deg * Math.PI / 180, dir = V(Math.cos(a), 0, Math.sin(a));
      const k = { phase: i * 1.35 };
      k.p = makePerson('K' + i, V(c.x, 0.02, c.z).addScaledVector(dir, 0.78), 0.72, tops[i], bots[i], i === 1 ? 2 : (i === 2 ? 1 : 0), i + 1, 22);
      k.p.face(new T.Vector3(c.x, 0, c.z));
      k.pile = V(c.x, 0.025, c.z).addScaledVector(dir, 0.36);
      const rt = k.p.right();
      k.homeA = k.pile.clone().addScaledVector(rt, 0.035); k.homeB = k.pile.clone().addScaledVector(rt, -0.035);
      k.a = sph(root, stone, k.homeA.x, k.homeA.y, k.homeA.z, 0.036, 0.026, 0.034);
      k.b = sph(root, stone2, k.homeB.x, k.homeB.y, k.homeB.z, 0.034, 0.026, 0.036);
      for (let e = 0; e < 3; e++) sph(root, e % 2 ? stone2 : stone, k.pile.x + Math.cos(e * 2.1) * 0.06, 0.025, k.pile.z + Math.sin(e * 2.1) * 0.06, 0.034, 0.025, 0.034);
      kids.push(k);
    });
  }
  function updateKid(k, t){
    const CY = 4.2, u = (t + k.phase) % CY, p = k.p;
    const up = V(0, 1, 0), fwd = p.fwd();
    const G = k.homeA.clone().add(V(0, 0.012, 0)), G2 = k.homeB.clone().add(V(0, 0.012, 0));
    const rest = p.rest(1), hover = k.pile.clone().addScaledVector(up, 0.20).addScaledVector(fwd, -0.05);
    const catchP = k.pile.clone().addScaledVector(up, 0.32).addScaledVector(fwd, -0.02);
    let hand, aPos = k.homeA.clone(), bPos = k.homeB.clone(), aHeld = false, bHeld = false;
    const flight = f => new T.Vector3().lerpVectors(catchP.clone().add(V(0, 0.04, 0)), catchP, f).add(V(0, 4 * 0.42 * f * (1 - f), 0));
    if (u < 0.5) hand = lerpV(rest, G, u / 0.5);
    else if (u < 0.9){ hand = lerpV(G, catchP.clone().add(V(0, 0.04, 0)), (u - 0.5) / 0.4); aHeld = true; }
    else if (u < 1.3){ hand = lerpV(catchP.clone().add(V(0, 0.04, 0)), G2, (u - 0.9) / 0.4); aPos = flight((u - 0.9) / 0.8); }
    else if (u < 1.7){ hand = lerpV(G2, catchP, (u - 1.3) / 0.4); bHeld = true; aPos = flight((u - 0.9) / 0.8); }
    else if (u < 2.4){ hand = lerpV(catchP, G, (u - 1.7) / 0.7); aHeld = bHeld = true; }
    else if (u < 3.2) hand = lerpV(G, hover, (u - 2.4) / 0.8);
    else hand = lerpV(hover, rest, (u - 3.2) / 1.0);
    if (aHeld) aPos = hand.clone().add(V(0, 0.012, 0));
    if (bHeld) bPos = hand.clone().add(V(0.012, 0.012, 0));
    k.a.position.copy(aPos); k.b.position.copy(bPos);
    p.armR.solve(p.shoulder(1), hand, p.poleR());
    p.armL.solve(p.shoulder(-1), p.rest(-1), p.poleL());
    const look = (u > 0.9 && u < 1.7) ? -0.24 : 0.17;
    p.head.rotation.x += (look - p.head.rotation.x) * 0.08; p.head.rotation.y = Math.sin(t * 0.8 + k.phase) * 0.12;
  }

  // ---------------------------------------------------------------- gamelan
  const BEAT = 0.42, PATTERN = [2, 3, 4, 3, 1, 2, 3, 0, 4, 5, 4, 3, 2, 3, 1, 0];
  const gm = { keys: [], keyMats: [], flash: [0, 0, 0, 0, 0, 0, 0], lastBeat: -1, lastGong: -1, swing: 0, gflash: 0 };
  function mallet(len, head){
    const m = new T.Group();
    cyl(m, mat(0.20, 0.045, 0.03, 0.5), 0, 0, len * 0.5, 0.012, len * 0.5, 0.012, Math.PI / 2);
    sph(m, head, 0, 0, len, 0.05); root.add(m); return m;
  }
  function buildGamelan(b){
    const g = new T.Group(); g.position.copy(b); root.add(g); gm.root = g;
    const wood = mat(0.40, 0.085, 0.05, 0.55), woodDark = mat(0.20, 0.045, 0.03, 0.5), gold = mat(0.90, 0.72, 0.24, 0.78, 0.85), bronze = mat(0.74, 0.50, 0.18, 0.72, 0.85);
    // saron
    const sa = new T.Group(); sa.position.set(0.15, 0, -0.38); g.add(sa); blob(sa, 0, 0, 0, 1.5, 0.35);
    part(sa, loft([[-0.50, 0.075, 0.040], [-0.44, 0.120, 0.075], [-0.32, 0.150, 0.090], [0.32, 0.150, 0.090], [0.44, 0.120, 0.075], [0.50, 0.075, 0.040]], 18), wood, 0, 0.145, 0, 0, Math.PI / 2, 0);
    box(sa, gold, 0, 0.222, 0.150, 1.00, 0.014, 0.016); box(sa, gold, 0, 0.222, -0.150, 1.00, 0.014, 0.016);
    [-0.42, 0.42].forEach(fx => [-0.10, 0.10].forEach(fz => sph(sa, woodDark, fx, 0.04, fz, 0.07, 0.08, 0.07)));
    [-0.53, 0.53].forEach(ex => { part(sa, torusGeo(0.06, 0.012, 16, 7), gold, ex, 0.27, 0, 0, 0, Math.PI / 2); sph(sa, gold, ex, 0.34, 0, 0.04); });
    for (let i = 0; i < 7; i++){
      const len = 0.235 - i * 0.0125;
      const km = new T.MeshStandardMaterial({ color: new T.Color(0.76, 0.52, 0.19), roughness: 0.3, metalness: 0.85, emissive: 0x000000 });
      gm.keyMats.push(km);
      gm.keys.push(box(sa, km, -0.36 + i * 0.12, 0.245, 0, 0.095, 0.016, len));
      sph(sa, gold, -0.36 + i * 0.12, 0.236, len * 0.5 - 0.02, 0.014); sph(sa, gold, -0.36 + i * 0.12, 0.236, -len * 0.5 + 0.02, 0.014);
    }
    gm.saron = sa;
    // kenong
    const rk = new T.Group(); rk.position.set(0.74, 0, 0.14); g.add(rk); blob(rk, 0, 0, 0, 1.0, 0.35);
    box(rk, wood, -0.09, 0.10, 0, 0.05, 0.05, 0.62); box(rk, wood, 0.09, 0.10, 0, 0.05, 0.05, 0.62);
    [-0.29, 0.29].forEach(rz => box(rk, woodDark, 0, 0.05, rz, 0.26, 0.10, 0.05));
    const potGeo = lathe([[0, 0], [0.060, 0], [0.088, 0.018], [0.092, 0.042], [0.080, 0.062], [0.058, 0.072], [0, 0.074]], 20);
    for (let i = 0; i < 4; i++){ const sc = 1 - i * 0.07, z = -0.21 + i * 0.14; part(rk, potGeo, bronze, 0, 0.128, z, 0, 0, 0, sc, sc, sc); sph(rk, gold, 0, 0.128 + 0.074 * sc, z, 0.036, 0.022, 0.036); }
    // gong ageng
    const gs = new T.Group(); gs.position.set(-0.55, 0, 0.05); g.add(gs); blob(gs, 0, 0, 0, 1.5, 0.35);
    [-0.36, 0.36].forEach(px => { box(gs, woodDark, px, 0.03, 0, 0.07, 0.06, 0.46); cyl(gs, wood, px, 0.62, 0, 0.07, 0.58, 0.07); sph(gs, gold, px, 1.22, 0, 0.09, 0.11, 0.09); });
    cyl(gs, wood, 0, 1.12, 0, 0.05, 0.40, 0.05, 0, 0, Math.PI / 2);
    const piv = new T.Group(); piv.position.set(0, 1.12, 0); gs.add(piv); gm.piv = piv;
    cyl(piv, gold, -0.07, -0.10, 0, 0.008, 0.10, 0.008, 0, 0, -0.35); cyl(piv, gold, 0.07, -0.10, 0, 0.008, 0.10, 0.008, 0, 0, 0.35);
    gm.gongMat = new T.MeshStandardMaterial({ color: new T.Color(0.72, 0.48, 0.17), roughness: 0.25, metalness: 0.9, side: T.DoubleSide, emissive: 0x000000 });
    gm.face = part(piv, lathe([[0, 0], [0.150, -0.008], [0.260, 0.010], [0.318, 0.034], [0.322, 0.062], [0.296, 0.064], [0.250, 0.034], [0.150, 0.026], [0, 0.020]], 36), gm.gongMat, 0, -0.46, 0, Math.PI / 2, 0, 0);
    part(piv, lathe([[0, 0], [0.075, 0.004], [0.090, 0.026], [0.060, 0.052], [0, 0.060]], 20), gold, 0, -0.46, 0.012, Math.PI / 2, 0, 0);
    gm.malletA = mallet(0.30, mat(0.85, 0.78, 0.55, 0.2)); gm.malletB = mallet(0.32, mat(0.55, 0.15, 0.12, 0.2));
    gm.p1 = makePerson('PemainSaron', V(b.x + 0.15, b.y + 0.02, b.z + 0.30), 1.0, [0.72, 0.55, 0.12], [0.22, 0.12, 0.08], 1, 2, 20);
    gm.p2 = makePerson('PemainGong', V(b.x - 0.55, b.y + 0.02, b.z + 0.68), 0.96, [0.15, 0.40, 0.52], [0.38, 0.14, 0.12], 1, 0, 14);
    gm.p1.face(V(b.x + 0.15, b.y, b.z - 1)); gm.p2.face(V(b.x - 0.55, b.y, b.z - 1));
  }
  const keyTop = i => rootLocal(gm.keys[i].localToWorld(V(0, 0.5, 0))).add(V(0, 0.004, 0));
  function updateGamelan(t, dt){
    const beat = Math.floor(t / BEAT), f = t / BEAT - beat, n = PATTERN.length;
    const idx = PATTERN[beat % n], prev = PATTERN[(beat + n - 1) % n];
    const p1 = gm.p1, p2 = gm.p2;
    const dir = p1.fwd().multiplyScalar(0.92).add(V(0, -0.38, 0)).normalize();
    const tip = new T.Vector3().lerpVectors(keyTop(prev), keyTop(idx), smooth(f * 2));
    const lift = 0.11 * Math.abs(Math.cos(f * Math.PI));
    const hand = tip.clone().add(V(0, lift, 0)).addScaledVector(dir, -0.30);
    p1.armR.solve(p1.shoulder(1), hand, p1.poleR());
    gm.malletA.position.copy(hand); aim(gm.malletA, dir);
    const damp = keyTop(prev).add(V(0, 0.02 + 0.03 * Math.abs(Math.sin(f * Math.PI)), 0)).addScaledVector(p1.fwd(), -0.10);
    p1.armL.solve(p1.shoulder(-1), damp, p1.poleL());
    if (beat !== gm.lastBeat){ gm.lastBeat = beat; gm.flash[idx] = 1; }
    for (let i = 0; i < 7; i++){
      gm.flash[i] = Math.max(0, gm.flash[i] - dt * 3.2); const g = gm.flash[i] * gm.flash[i];
      gm.keyMats[i].emissive.setRGB(1.6 * g * 0.5, 0.85 * g * 0.5, 0.30 * g * 0.5);
      gm.keys[i].position.y = 0.245 - 0.004 * g;
    }
    p1.head.rotation.set(0.25 + Math.sin(t * 2) * 0.05, Math.sin(t * 0.5) * 0.1, 0);
    // gong: struck every eight beats by the second musician
    const cyc = BEAT * 8, u = t % cyc, cycNo = Math.floor(t / cyc);
    const boss = rootLocal(gm.face.localToWorld(V(0, 0.07, 0)));
    const dirB = p2.fwd().multiplyScalar(0.9).add(V(0, -0.25, 0)).normalize();
    const restB = p2.rest(1).add(V(0, 0.10, 0));
    const strike = boss.clone().addScaledVector(dirB, -0.32);
    const windUp = strike.clone().add(V(0, 0.15, 0)).addScaledVector(p2.fwd(), -0.12);
    const REACH = 0.9, HIT = 1.1;
    let hb;
    if (u < REACH) hb = lerpV(restB, windUp, u / REACH);
    else if (u < HIT) hb = lerpV(windUp, strike, (u - REACH) / (HIT - REACH));
    else if (u < HIT + 0.9) hb = lerpV(strike, restB, (u - HIT) / 0.9);
    else hb = restB;
    if (u >= HIT && gm.lastGong !== cycNo){ gm.lastGong = cycNo; gm.swing = 1; gm.gflash = 1; }
    p2.armR.solve(p2.shoulder(1), hb, p2.poleR());
    gm.malletB.position.copy(hb); aim(gm.malletB, dirB);
    p2.armL.solve(p2.shoulder(-1), p2.rest(-1), p2.poleL());
    gm.swing = Math.max(0, gm.swing - dt * 0.35); gm.gflash = Math.max(0, gm.gflash - dt * 0.9);
    gm.piv.rotation.x = Math.sin(t * 6.5) * 0.12 * gm.swing * gm.swing;
    const gf = gm.gflash * gm.gflash * 0.35; gm.gongMat.emissive.setRGB(1.5 * gf, 0.8 * gf, 0.28 * gf);
    p2.head.rotation.set(0.14 + Math.sin(t * 1.3) * 0.03, Math.sin(t * 0.4) * 0.08, 0);
  }
  function aim(obj, dir){ obj.quaternion.setFromUnitVectors(V(0, 0, 1), dir); }

  // ---------------------------------------------------------------- kuih
  const kuih = { tray: null };
  function buildKuih(c){
    const holder = new T.Group(); holder.position.copy(c); root.add(holder);
    const tray = new T.Group(); holder.add(tray); kuih.tray = tray;
    const rattan = mat(0.58, 0.37, 0.16, 0.35), rattanDark = mat(0.36, 0.21, 0.09, 0.35), leaf = mat(0.20, 0.46, 0.15, 0.45);
    part(tray, lathe([[0, 0], [0.80, 0], [0.90, 0.020], [0.94, 0.052], [0.92, 0.066], [0.88, 0.050], [0, 0.030]], 36), rattan, 0, 0, 0);
    part(tray, torusGeo(0.905, 0.012, 36, 6), rattanDark, 0, 0.05, 0);
    part(tray, lathe([[0, 0.034], [0.84, 0.036], [0.86, 0.040], [0, 0.040]], 36), leaf, 0, 0, 0);
    const R = 0.60;
    const place = (i, fn) => { const a = i * 60 * Math.PI / 180, g = new T.Group(); g.position.set(Math.cos(a) * R, 0.04, Math.sin(a) * R); g.rotation.y = (-i * 60 + 90) * Math.PI / 180; tray.add(g); fn(g); };
    // kuih lapis
    place(0, g => {
      const L = [[0.95, 0.42, 0.55], [0.98, 0.93, 0.80], [0.62, 0.78, 0.35], [0.98, 0.93, 0.80]];
      for (let piece = 0; piece < 2; piece++){
        const ox = piece === 0 ? -0.075 : 0.085, oz = piece === 0 ? 0.02 : -0.03, yaw = (piece === 0 ? 38 : 52) * Math.PI / 180;
        for (let k = 0; k < 10; k++){ const l = L[k % 4]; box(g, mat(l[0], l[1], l[2], 0.3), ox, 0.007 + k * 0.0135, oz, 0.12, 0.0132, 0.12, yaw); }
      }
    });
    // kuih keria
    place(1, g => {
      const dough = mat(0.80, 0.56, 0.26, 0.35), sugar = mat(0.98, 0.96, 0.90, 0.15);
      const tg = torusGeo(0.040, 0.018, 18, 8), sg = torusGeo(0.040, 0.0125, 18, 6);
      [[-0.055, 0.018, 0.045], [0.060, 0.018, 0.035], [0, 0.018, -0.065], [-0.012, 0.050, 0], [0.02, 0.050, -0.04]].forEach((s, i) => {
        part(g, tg, dough, s[0], s[1], s[2], (Math.random() - 0.5) * 0.2, i * 0.7, (Math.random() - 0.5) * 0.2);
        part(g, sg, sugar, s[0], s[1] + 0.011, s[2], 0, i * 0.7, 0, 1, 0.9, 1);
      });
    });
    // onde-onde
    place(2, g => {
      const green = mat(0.35, 0.62, 0.22, 0.45), coco = mat(0.97, 0.96, 0.92, 0.1), r = 0.034, pts = [];
      for (let row = 0; row < 3; row++) for (let c2 = 0; c2 <= row; c2++) pts.push(V((c2 - row * 0.5) * 2 * r * 1.02, r, row * 2 * r * 0.88 - 0.04));
      for (let row = 0; row < 2; row++) for (let c2 = 0; c2 <= row; c2++) pts.push(V((c2 - row * 0.5) * 2 * r * 1.02, r + 0.058, row * 2 * r * 0.88 - 0.012));
      pts.push(V(0, r + 0.108, 0.012));
      pts.forEach((p, i) => sph(g, i % 3 === 0 ? coco : green, p.x, p.y, p.z, 2 * r));
      sph(g, green, 0.11, r, 0.04, 2 * r); sph(g, coco, 0.10, r, -0.03, 2 * r);
    });
    // karipap
    place(3, g => {
      const pastry = mat(0.86, 0.60, 0.24, 0.4), crimp = mat(0.78, 0.50, 0.18, 0.35);
      [[-0.07, 0, 0.03], [0.07, 0, 0.04], [0, 0.036, -0.045]].forEach((pp, i) => {
        const pf = new T.Group(); pf.position.set(pp[0], pp[1] + 0.03, pp[2]); pf.rotation.y = (25 + i * 70) * Math.PI / 180; g.add(pf);
        sph(pf, pastry, 0, 0, 0, 0.105, 0.060, 0.078); box(pf, crimp, 0, -0.004, -0.034, 0.100, 0.014, 0.012);
        for (let k = -4; k <= 4; k++) box(pf, crimp, k * 0.011, 0, -0.040, 0.006, 0.016, 0.012);
      });
    });
    // kuih talam & seri muka
    const slab = (g, bot, top, bh, th, xs) => {
      for (let i = 0; i < 3; i++){
        const ox = -0.065 + i * 0.068, oz = i === 1 ? 0.05 : -0.025, yaw = (45 + (i - 1) * 7) * Math.PI / 180;
        box(g, bot, ox, bh / 2, oz, 0.085, bh, 0.085, yaw); box(g, top, ox, bh + th / 2, oz, 0.085, th, 0.085, yaw);
      }
    };
    place(4, g => slab(g, mat(0.33, 0.60, 0.30, 0.45), mat(0.97, 0.95, 0.86, 0.5), 0.044, 0.022));
    place(5, g => slab(g, mat(0.98, 0.97, 0.92, 0.3), mat(0.58, 0.80, 0.26, 0.6), 0.040, 0.029));
    updaters.push((dt) => { tray.rotation.y += 6 * Math.PI / 180 * dt; });
  }

  // ---------------------------------------------------------------- cermin
  const MIRROR = { pos: V(18.8, 0, -5.0), yaw: -Math.PI / 2, W: 0.92, H: 1.92, Y: 1.24 };
  function songketTexture(kind){
    const c = document.createElement('canvas'); c.width = 256; c.height = kind === 'border' ? 64 : 256; const g = c.getContext('2d');
    g.fillStyle = '#1e1f26'; g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = '#e8ecf6'; g.fillStyle = '#e8ecf6'; g.lineWidth = 1.5;
    if (kind === 'border'){
      for (let x = 0; x < 256; x += 32){
        g.beginPath(); g.moveTo(x, 58); g.lineTo(x + 32, 58); g.lineTo(x + 16, 10); g.closePath(); g.stroke();
        g.beginPath(); g.moveTo(x + 6, 58); g.lineTo(x + 26, 58); g.lineTo(x + 16, 25); g.closePath(); g.stroke();
        g.beginPath(); g.arc(x + 16, 46, 3, 0, 7); g.fill();
      }
      g.fillRect(0, 60, 256, 3); g.fillRect(0, 3, 256, 3);
    } else {
      const flower = (cx, cy, r) => {
        for (let k = 0; k < 8; k++){ const a = Math.PI * 2 * k / 8; g.beginPath(); g.ellipse(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.42, r * 0.34, a, 0, 7); g.stroke(); }
        g.beginPath(); g.arc(cx, cy, r * 0.28, 0, 7); g.fill();
      };
      [[64, 64, 36], [192, 192, 36], [192, 64, 24], [64, 192, 24]].forEach(f => flower(f[0], f[1], f[2]));
      [[128, 20, 0.5], [128, 108, -0.5], [20, 128, 1.2], [108, 148, 0.2], [150, 230, 0.6], [230, 130, 1.6]].forEach(l => {
        g.save(); g.translate(l[0], l[1]); g.rotate(l[2]); g.beginPath(); g.ellipse(0, 0, 28, 8, 0, 0, 7); g.stroke(); g.restore();
      });
      for (let i = 0; i < 40; i++){ g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, 1.2, 0, 7); g.fill(); }
    }
    const tex = new T.CanvasTexture(c); tex.wrapS = tex.wrapT = T.RepeatWrapping; return tex;
  }
  // materials that draw only inside the glass (stencil == 1) after it has cleared the depth buffer
  function inMirror(m){
    m.transparent = true; m.stencilWrite = true; m.stencilFunc = T.EqualStencilFunc; m.stencilRef = 1;
    m.stencilZPass = T.KeepStencilOp; m.stencilFail = T.KeepStencilOp; m.stencilZFail = T.KeepStencilOp;
    return m;
  }
  const mm = (r, g, b, gloss, metal) => inMirror(new T.MeshStandardMaterial({ color: new T.Color(r, g, b), roughness: Math.max(0.12, 1 - (gloss === undefined ? 0.3 : gloss) * 0.9), metalness: metal || 0, side: T.DoubleSide }));
  function tag(g){ g.traverse(o => { if (o.isMesh) o.renderOrder = 1002; }); return g; }
  const mir = {};
  function buildMirror(){
    const g = new T.Group(); g.position.copy(MIRROR.pos); g.rotation.y = MIRROR.yaw; root.add(g); mir.g = g;
    const wood = mat(0.30, 0.065, 0.045, 0.6), woodDark = mat(0.17, 0.04, 0.03, 0.5), gold = mat(0.90, 0.72, 0.24, 0.8, 0.85);
    blob(g, 0, 0, 0.1, 1.9, 0.4);
    box(g, woodDark, 0, 1.245, -0.035, 1.14, 2.14, 0.03);
    const y0 = 0.225, y1 = 2.265;
    box(g, wood, -0.515, (y0 + y1) / 2, 0.025, 0.11, y1 - y0 + 0.11, 0.07); box(g, wood, 0.515, (y0 + y1) / 2, 0.025, 0.11, y1 - y0 + 0.11, 0.07);
    box(g, wood, 0, y0, 0.025, 1.14, 0.11, 0.07); box(g, wood, 0, y1, 0.025, 1.14, 0.11, 0.07);
    const iw = MIRROR.W + 0.03, ih = MIRROR.H + 0.03;
    box(g, gold, -iw / 2, MIRROR.Y, 0.058, 0.018, ih, 0.018); box(g, gold, iw / 2, MIRROR.Y, 0.058, 0.018, ih, 0.018);
    box(g, gold, 0, MIRROR.Y - ih / 2, 0.058, iw, 0.018, 0.018); box(g, gold, 0, MIRROR.Y + ih / 2, 0.058, iw, 0.018, 0.018);
    box(g, gold, -0.545, (y0 + y1) / 2, 0.062, 0.014, y1 - y0 + 0.07, 0.012); box(g, gold, 0.545, (y0 + y1) / 2, 0.062, 0.014, y1 - y0 + 0.07, 0.012);
    const ros = torusGeo(0.04, 0.011, 16, 7);
    [-0.515, 0.515].forEach(cx => [y0, y1].forEach(cy => { part(g, ros, gold, cx, cy, 0.066, Math.PI / 2); sph(g, gold, cx, cy, 0.07, 0.04); }));
    const col = lathe([[0, 0], [0.060, 0], [0.065, 0.04], [0.040, 0.08], [0.030, 0.30], [0.050, 0.34], [0.030, 0.38], [0.026, 0.90], [0.046, 0.94], [0.026, 0.98], [0.026, 1.60], [0.050, 1.64], [0.026, 1.68], [0.028, 2.20], [0.050, 2.26], [0.036, 2.34], [0, 2.36]], 14);
    [-0.66, 0.66].forEach(cx => {
      part(g, col, wood, cx, 0.10, 0.02, 0, 0, 0); sph(g, gold, cx, 2.50, 0.02, 0.07, 0.09, 0.07);
      [0.44, 1.04, 1.70].forEach(by => part(g, torusGeo(0.040, 0.008, 14, 6), gold, cx, by, 0.02));
    });
    const spike = lathe([[0, 0], [0.050, 0], [0.034, 0.07], [0, 0.16]], 10);
    for (let i = -4; i <= 4; i++){
      const h = i === 0 ? 1.9 : 1 - Math.abs(i) * 0.06;
      part(g, spike, i % 2 === 0 ? gold : wood, i * 0.118, 2.32, 0.03, 0, 0, 0, i === 0 ? 1.6 : 1, h, 0.45);
    }
    part(g, lathe([[0, 0], [0.050, 0], [0.070, 0.04], [0.045, 0.09], [0.030, 0.12], [0.055, 0.16], [0.040, 0.20], [0, 0.22]], 14), gold, 0, 2.66, 0.03, 0, 0, 0, 1, 1, 0.45);
    box(g, woodDark, 0, 0.07, 0.06, 1.50, 0.14, 0.48); box(g, gold, 0, 0.145, 0.06, 1.50, 0.014, 0.48);
    [-0.68, 0.68].forEach(fx => [-0.12, 0.24].forEach(fz => sph(g, wood, fx, 0.02, fz, 0.10, 0.07, 0.10)));
    addBoxCol(MIRROR.pos.x, MIRROR.pos.z, 0.26, 0.78);

    // glass: dark gradient, stamps stencil=1; then a depth-clearing twin so the reflection is never hidden
    const cv = document.createElement('canvas'); cv.width = 16; cv.height = 128; const cx = cv.getContext('2d');
    const gr = cx.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#1f2b35'); gr.addColorStop(1, '#3d4a52'); cx.fillStyle = gr; cx.fillRect(0, 0, 16, 128);
    const glassM = new T.MeshBasicMaterial({ map: new T.CanvasTexture(cv), transparent: true, depthWrite: false, side: T.FrontSide });
    glassM.stencilWrite = true; glassM.stencilFunc = T.AlwaysStencilFunc; glassM.stencilRef = 1; glassM.stencilZPass = T.ReplaceStencilOp;
    const gq = new T.Mesh(new T.PlaneGeometry(MIRROR.W, MIRROR.H), glassM); gq.position.set(0, MIRROR.Y, 0.004); gq.renderOrder = 1000; g.add(gq);
    const clearM = new T.ShaderMaterial({
      vertexShader: 'void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'void main(){ gl_FragColor = vec4(0.0); gl_FragDepth = 1.0; }',
      depthTest: true, depthFunc: T.AlwaysDepth, depthWrite: true, colorWrite: false, transparent: true, side: T.FrontSide
    });
    clearM.stencilWrite = true; clearM.stencilFunc = T.EqualStencilFunc; clearM.stencilRef = 1; clearM.stencilZPass = T.KeepStencilOp;
    const cq = new T.Mesh(new T.PlaneGeometry(MIRROR.W, MIRROR.H), clearM); cq.position.copy(gq.position); cq.renderOrder = 1001; g.add(cq);
    // faint glare strip
    const gc = document.createElement('canvas'); gc.width = gc.height = 64; const gx = gc.getContext('2d');
    const gg = gx.createLinearGradient(0, 0, 64, 0); gg.addColorStop(0, 'rgba(255,255,255,0)'); gg.addColorStop(0.5, 'rgba(255,255,255,0.07)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
    gx.fillStyle = gg; gx.fillRect(0, 0, 64, 64);
    const glare = new T.Mesh(new T.PlaneGeometry(MIRROR.W * 0.5, MIRROR.H), new T.MeshBasicMaterial({ map: new T.CanvasTexture(gc), transparent: true, depthWrite: false }));
    glare.position.set(-0.12, MIRROR.Y, 0.012); glare.rotation.z = -0.25; glare.renderOrder = 1010; g.add(glare);

    buildAvatar(g);
  }

  function buildAvatar(mirror){
    const av = new T.Group(); mirror.add(av); mir.av = av;
    const body = new T.Group(); av.add(body); mir.body = body;
    const skin = mm(0.84, 0.62, 0.45, 0.35), cloth = mm(0.035, 0.035, 0.045, 0.5), trousers = mm(0.03, 0.03, 0.04, 0.3), gold = mm(0.90, 0.72, 0.24, 0.8, 0.85);
    const dark = mm(0.03, 0.025, 0.025, 0.5), white = mm(0.95, 0.95, 0.93, 0.3);
    const tf = songketTexture('floral'), tb = songketTexture('border'), th = songketTexture('floral');
    tf.repeat.set(3, 1.2); tb.repeat.set(3, 1); th.repeat.set(2, 0.7);
    const mk = (tex, g) => inMirror(new T.MeshStandardMaterial({ map: tex, roughness: 0.55, side: T.DoubleSide }));
    const songket = mk(tf), hem = mk(tb), songketHat = mk(th);
    [-1, 1].forEach(sx => {
      cyl(body, trousers, sx * 0.095, 0.47, 0, 0.135, 0.41, 0.135); sph(body, skin, sx * 0.095, 0.04, 0.07, 0.105, 0.075, 0.25);
    });
    part(body, lathe([[0, 1.000], [0.225, 1.000], [0.245, 0.975], [0.262, 0.78], [0.290, 0.60]], 28), songket, 0, 0, 0);
    part(body, lathe([[0.291, 0.603], [0.298, 0.515]], 28), hem, 0, 0, 0);
    part(body, torusGeo(0.235, 0.038, 24, 8), songket, 0, 1.0, 0, 0, 0, 0, 1, 1, 0.9);
    part(body, loft([[0.95, 0.215, 0.125], [1.10, 0.220, 0.125], [1.25, 0.240, 0.130], [1.38, 0.255, 0.125], [1.45, 0.215, 0.108], [1.49, 0.078, 0.062]], 22), cloth, 0, 0, 0, -Math.PI / 2);
    part(body, torusGeo(0.062, 0.018, 16, 7), cloth, 0, 1.495, 0, 0, 0, 0, 1, 1.2, 1);
    for (let i = 0; i < 3; i++) sph(body, gold, 0, 1.43 - i * 0.075, 0.118, 0.016);
    cyl(body, skin, 0, 1.535, 0, 0.10, 0.04, 0.10);
    const head = new T.Group(); head.position.set(0, 1.575, 0); body.add(head); mir.head = head;
    sph(head, skin, 0, 0.05, 0.005, 0.165, 0.215, 0.185);
    [-1, 1].forEach(sx => {
      sph(head, white, sx * 0.038, 0.085, 0.082, 0.034, 0.026, 0.02); sph(head, dark, sx * 0.038, 0.085, 0.093, 0.016);
      box(head, dark, sx * 0.040, 0.118, 0.086, 0.046, 0.008, 0.01).rotation.z = sx * -0.1; sph(head, skin, sx * 0.084, 0.05, -0.005, 0.028, 0.05, 0.03);
    });
    sph(head, skin, 0, 0.055, 0.098, 0.030, 0.042, 0.034); box(head, mm(0.55, 0.22, 0.20, 0.3), 0, 0.003, 0.088, 0.05, 0.007, 0.01);
    sph(head, dark, 0, 0.12, -0.012, 0.172, 0.12, 0.19);
    part(head, lathe([[0.094, 0.108], [0.112, 0.130], [0.120, 0.168], [0.108, 0.200], [0.075, 0.218], [0, 0.222]], 20), songketHat, 0, 0, 0, -0.1, 0, 0, 1, 1, 1.05);
    part(head, torusGeo(0.101, 0.018, 20, 7), songketHat, 0, 0.125, 0, -0.1);
    const pucuk = box(head, songketHat, 0.075, 0.250, 0.02, 0.115, 0.15, 0.06); pucuk.rotation.set(0, 0.14, -0.56);
    const lipat = box(head, songketHat, -0.015, 0.215, 0.085, 0.16, 0.075, 0.06); lipat.rotation.set(0.24, 0, 0.17);
    const holder = new T.Group(); mirror.add(holder); mir.holder = holder;
    mir.armL = new Limb(holder, cloth, skin, 1); mir.armR = new Limb(holder, cloth, skin, 1);
    [mir.armL, mir.armR].forEach(a => { a.bl1 = a.l1; a.bl2 = a.l2; });
    [mir.armL, mir.armR].forEach(a => [a.upper, a.lower, a.elbow, a.hand].forEach(o => { o.material = o.material.clone(); inMirror(o.material); o.renderOrder = 1002; }));
    mir.propR = new T.Group(); mir.propL = new T.Group(); mirror.add(mir.propR); mirror.add(mir.propL);
    // reflected right hand looks like a left hand: opposite-chirality model on each reflected pose
    mir.propR.add(buildHand(true, false)); mir.propL.add(buildHand(false, false));
    [mir.propR, mir.propL].forEach(p => p.traverse(o => { if (o.isMesh){ o.material = o.material.clone(); inMirror(o.material); o.renderOrder = 1002; } }));
    tag(av); tag(holder);
    mir.bodyYaw = 0; av.visible = false;
    [mir.armL, mir.armR].forEach(a => { a.hand.visible = false; });
  }

  const _a = new T.Vector3(), _b = new T.Vector3(), _m = new T.Matrix4(), _q = new T.Quaternion(), _o = new T.Vector3();
  const flip = v => { v.z = -v.z; return v; };
  function dirLocal(m, worldDir, origin){ // direction in the mirror's own frame
    _a.copy(origin).add(worldDir); const p1 = m.worldToLocal(_a.clone()); const p0 = m.worldToLocal(origin.clone()); return p1.sub(p0);
  }
  function updateMirror(dt, t){
    if (!mir.g) return;
    const m = mir.g;
    const eye = new T.Vector3(); camera.getWorldPosition(eye);
    const hp = m.worldToLocal(eye.clone());
    const inFront = hp.z > 0.30 && hp.z < 6 && Math.abs(hp.x) < 4.5 && hp.y > 0.45;
    mir.av.visible = inFront; mir.holder.visible = inFront; mir.propR.visible = inFront; mir.propL.visible = inFront;
    if (!inFront) return;
    const s = Math.max(0.55, Math.min(1.25, hp.y / 1.64));
    mir.av.position.set(hp.x, 0, -hp.z);
    const wf = new T.Vector3(); camera.getWorldDirection(wf);
    const wu = new T.Vector3(0, 1, 0).applyQuaternion(camera.getWorldQuaternion(_q));
    const f = flip(dirLocal(m, wf, eye)), u = flip(dirLocal(m, wu, eye));
    let yaw = Math.atan2(f.x, f.z); yaw = Math.max(-1.22, Math.min(1.22, yaw));
    mir.bodyYaw += (yaw * 0.5 - mir.bodyYaw) * (1 - Math.exp(-6 * dt));
    mir.av.rotation.y = mir.bodyYaw;
    mir.body.scale.set(s, s * (1 + Math.sin(t * 1.7) * 0.004), s);
    // head follows the visitor's head (mirrored)
    f.normalize(); u.normalize();
    _m.lookAt(f, _o.set(0, 0, 0), u); const hq = new T.Quaternion().setFromRotationMatrix(_m);
    const bodyQ = new T.Quaternion().setFromAxisAngle(V(0, 1, 0), mir.bodyYaw);
    mir.head.quaternion.copy(bodyQ.invert().multiply(hq));
    // hands (VR controllers). The visitor's right controller is the avatar's left hand
    const hands = {};
    gripsRef.forEach(gp => { if (gp.visible && gp.userData.hand) hands[gp.userData.hand] = gp; });
    const shL = V(-0.265 * s, 1.42 * s, 0).applyAxisAngle(V(0, 1, 0), mir.bodyYaw).add(mir.av.position);
    const shR = V(0.265 * s, 1.42 * s, 0).applyAxisAngle(V(0, 1, 0), mir.bodyYaw).add(mir.av.position);
    const rightDir = V(Math.cos(mir.bodyYaw), 0, -Math.sin(mir.bodyYaw)).multiplyScalar(-1);
    const target = (grip, prop, fallback) => {
      if (!grip){ prop.visible = false; return fallback; }
      grip.updateWorldMatrix(true, false);
      const wp = new T.Vector3().setFromMatrixPosition(grip.matrixWorld);
      const lp = flip(m.worldToLocal(wp));
      prop.visible = true; prop.position.copy(lp);
      const gq = new T.Quaternion(); grip.getWorldQuaternion(gq);
      const fw = flip(dirLocal(m, V(0, 0, -1).applyQuaternion(gq), wp)).normalize();
      const up = flip(dirLocal(m, V(0, 1, 0).applyQuaternion(gq), wp)).normalize();
      _m.lookAt(fw.clone().multiplyScalar(-1), _o.set(0, 0, 0), up); // controller points -z in three; props are authored to match
      prop.quaternion.setFromRotationMatrix(_m);
      return lp;
    };
    const restL = shL.clone().add(V(-0.05, -0.50 * s, 0.05)), restR = shR.clone().add(V(0.05, -0.50 * s, 0.05));
    const tR = target(hands.right, mir.propR, restL);   // visitor's right hand -> avatar's left arm
    const tL = target(hands.left, mir.propL, restR);
    mir.armL.setScale(s); mir.armR.setScale(s);
    mir.armL.solve(shL, tR, rightDir.clone().multiplyScalar(-1).add(V(0, -0.7, 0)).normalize());
    mir.armR.solve(shR, tL, rightDir.clone().add(V(0, -0.7, 0)).normalize());
  }



  // merges many transformed copies of a geometry into one mesh per material (keeps draw calls low on phones)
  function merger(){
    const groups = new Map();
    return {
      put(geo, m, x, y, z, q, sx, sy, sz){
        const mx = new T.Matrix4().compose(V(x, y, z), q || new T.Quaternion(), V(sx, sy, sz));
        let gr = groups.get(m); if (!gr){ gr = []; groups.set(m, gr); }
        gr.push([geo, mx]);
      },
      flush(parent){
        groups.forEach((items, m) => {
          const pos = [], nor = [], uv = [], idx = []; let base = 0;
          items.forEach(([geo, mx]) => {
            const p = geo.attributes.position, n = geo.attributes.normal, u = geo.attributes.uv, nm = new T.Matrix3().getNormalMatrix(mx);
            for (let i = 0; i < p.count; i++){
              const v = V(p.getX(i), p.getY(i), p.getZ(i)).applyMatrix4(mx); pos.push(v.x, v.y, v.z);
              if (n){ const nv = V(n.getX(i), n.getY(i), n.getZ(i)).applyMatrix3(nm).normalize(); nor.push(nv.x, nv.y, nv.z); }
              if (u) uv.push(u.getX(i), u.getY(i));
            }
            if (geo.index) for (let i = 0; i < geo.index.count; i++) idx.push(geo.index.getX(i) + base);
            else for (let i = 0; i < p.count; i++) idx.push(i + base);
            base += p.count;
          });
          const g = new T.BufferGeometry();
          g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
          if (nor.length) g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); else g.computeVertexNormals();
          if (uv.length === pos.length / 3 * 2) g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
          g.setIndex(idx);
          parent.add(new T.Mesh(g, m));
        });
      }
    };
  }

  // ---------------------------------------------------------------- shade tree (pokok ketapang)
  // slender barked trunk with buttress roots, six curving forked limbs, canopy of leaf clusters around the tips
  function buildTree(c){
    let seed = 23; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, rr = (a, b) => a + (b - a) * rnd();
    const g = new T.Group(); g.position.copy(c); root.add(g); const B = merger();
    // streaky bark texture
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 128; const cx = cv.getContext('2d');
    for (let x = 0; x < 64; x++){
      const base = 0.55 + 0.35 * Math.abs(Math.sin(x * 0.9 + 1.3)) * Math.abs(Math.cos(x * 0.31));
      for (let y = 0; y < 128; y += 4){
        const v = Math.min(1, 0.30 + base * 0.34 + rnd() * 0.18);
        cx.fillStyle = 'rgb(' + (88 * v * 2 | 0) + ',' + (61 * v * 2 | 0) + ',' + (38 * v * 2 | 0) + ')'; cx.fillRect(x, y, 1, 4);
      }
    }
    const btex = new T.CanvasTexture(cv); btex.wrapS = btex.wrapT = T.RepeatWrapping; btex.repeat.set(3, 2);
    const bark = new T.MeshStandardMaterial({ map: btex, roughness: 0.9, side: T.DoubleSide });
    B.put(lathe([[0, 0], [0.46, 0], [0.42, 0.25], [0.39, 0.70], [0.38, 1.40], [0.34, 2.30], [0.35, 3.10], [0.33, 3.60], [0.27, 3.95], [0, 4.05]], 14), bark, 0, 0, 0, null, 1, 1, 1);
    const seg = lathe([[1, 0], [0.66, 1], [0, 1.01]], 8);
    const qOf = dir => new T.Quaternion().setFromUnitVectors(V(0, 1, 0), dir.clone().normalize());
    const tips = [];
    for (let k = 0; k < 6; k++){
      const a = (k * 60 + rr(-10, 10)) * Math.PI / 180;
      let p = V(Math.cos(a) * 0.12, 3.35 + rr(0, 0.3), Math.sin(a) * 0.12), dir = V(Math.cos(a) * 0.45, 1, Math.sin(a) * 0.45).normalize(), r = 0.19;
      for (let s = 0; s < 3; s++){
        const len = rr(1.0, 1.5); B.put(seg, bark, p.x, p.y, p.z, qOf(dir), r, len, r);
        p = p.clone().addScaledVector(dir, len); r *= 0.66;
        dir = dir.clone().add(V(Math.cos(a), 0, Math.sin(a)).multiplyScalar(rr(0.45, 0.7))).add(V(0, rr(-0.15, 0.05), 0)).normalize();
      }
      for (let f = 0; f < 2; f++){
        const fa = a + (f === 0 ? -1 : 1) * rr(0.5, 0.9), fd = V(Math.cos(fa), rr(0.1, 0.45), Math.sin(fa)).normalize(), fl = rr(1.0, 1.6);
        B.put(seg, bark, p.x, p.y, p.z, qOf(fd), r * 0.9, fl, r * 0.9);
        tips.push(p.clone().addScaledVector(fd, fl));
      }
      tips.push(p.clone());
    }
    const prof = []; for (let i = 0; i <= 10; i++){ const a = Math.PI * i / 10, y = -Math.cos(a) * 0.5; prof.push([Math.sin(a) * 0.5, y < 0 ? y * 0.7 : y]); }
    const blobGeo = lathe(prof, 10);
    const greens = [mat(0.13, 0.32, 0.11, 0.12), mat(0.19, 0.42, 0.14, 0.12), mat(0.27, 0.54, 0.18, 0.12), mat(0.38, 0.64, 0.24, 0.12)];
    const addBlob = (p, size) => {
      const y = Math.max(p.y, 4.5 + size * 0.35), h = Math.max(0, Math.min(1, (y - 4.6) / 2.8));
      const gi = Math.max(0, Math.min(3, Math.floor(h * 4 + rr(-0.6, 0.6))));
      B.put(blobGeo, greens[gi], p.x, y, p.z, new T.Quaternion().setFromEuler(new T.Euler(rr(-0.14, 0.14), rnd() * 6.28, rr(-0.14, 0.14))), size * rr(1.0, 1.25), size * rr(0.62, 0.85), size * rr(1.0, 1.25));
    };
    tips.forEach(t => { for (let i = 0; i < 7; i++) addBlob(t.clone().add(V(rr(-1.5, 1.5), rr(0.1, 1.5), rr(-1.5, 1.5))), rr(1.5, 2.3)); });
    for (let i = 0; i < 18; i++){ const a = rnd() * 6.28, d = Math.sqrt(rnd()) * 3.0; addBlob(V(Math.cos(a) * d, 6.3 + rr(0, 1.1) * (1 - d / 3.6), Math.sin(a) * d), rr(1.6, 2.4)); }
    B.flush(g);
    blob(g, 0, 0, 0, 5.2 * 2.1, 0.30);
    addCircleCol(c.x, c.z, 0.75);
  }
  function blobShadow(parent, size, alpha){
    const q = blob(parent, 0, 0, 0, size, alpha); return q;
  }

  // ---------------------------------------------------------------- welcome board (rustic Malay) + bunga hiasan
  // Cloth banner with Jawi calligraphy on a bamboo frame, woven trays, blue lanterns, flower beds,
  // bougainvillea and fairy lights. Structure lives in the Unity-frame group; the lettering planes sit
  // directly in the scene (world frame) so the text is never mirrored by the group's z flip.
  const flora = {
    rnd: null,
    r(a, b){ return a === undefined ? this.rnd() : a + (b - a) * this.rnd(); },
    seed(n){ let s = n; this.rnd = () => (s = (s * 16807) % 2147483647) / 2147483647; },
    init(){
      if (this.sphere) return;
      const leafy = (w, len) => { const rings = w.map((x, i) => [len * i / (w.length - 1), x, 0.004]); return loft(rings, 8); };
      this.monstera = leafy([0.02, 0.20, 0.27, 0.22, 0.10, 0], 0.62);
      this.banana = leafy([0.02, 0.12, 0.17, 0.18, 0.13, 0.06, 0], 1.3);
      this.frond = leafy([0.01, 0.05, 0.06, 0.05, 0.03, 0], 0.8);
      const prof = []; for (let i = 0; i <= 8; i++){ const a = Math.PI * i / 8; prof.push([Math.sin(a) * 0.5, -Math.cos(a) * 0.5]); }
      this.sphere = lathe(prof, 9);
      this.cone = lathe([[0, 0], [0.5, 0], [0.3, 0.5], [0, 1]], 8);
      this.stem = lathe([[0.5, 0], [0.4, 1], [0, 1.01]], 5);
    },
    green(){ const t = this.r(); return t < 0.4 ? mat(0.07, 0.24, 0.10, 0.4) : (t < 0.75 ? mat(0.13, 0.38, 0.14, 0.3) : mat(0.24, 0.52, 0.17, 0.25)); },
    put(parent, geo, m, p, q, s){ const o = new T.Mesh(geo, m); o.position.copy(p); if (q) o.quaternion.copy(q); o.scale.copy(s); parent.add(o); return o; },
    stemTo(parent, from, to, rad){
      const d = new T.Vector3().subVectors(to, from), len = d.length(); if (len < 0.001) return;
      this.put(parent, this.stem, mat(0.15, 0.34, 0.12, 0.3), from, new T.Quaternion().setFromUnitVectors(V(0, 1, 0), d.divideScalar(len)), V(rad * 2, len, rad * 2));
    },
    leaf(parent, p, dir, size, kind){
      const geo = kind === 0 ? this.monstera : (kind === 1 ? this.banana : this.frond);
      const m = new T.Matrix4().lookAt(dir.clone().normalize(), V(0, 0, 0), V(0, 1, 0));
      const q = new T.Quaternion().setFromRotationMatrix(m).multiply(new T.Quaternion().setFromAxisAngle(V(0, 0, 1), this.r(-0.3, 0.3)));
      this.put(parent, geo, this.green(), p, q, V(size, size, size));
    },
    anthurium(parent, p, size){
      const red = mat(0.82, 0.07, 0.10, 0.75), q = new T.Quaternion().setFromEuler(new T.Euler(Math.PI / 2, 0, 0));
      this.put(parent, this.sphere, red, p, q, V(0.30 * size, 0.06 * size, 0.42 * size));
      this.put(parent, this.sphere, red, p.clone().add(V(0.03 * size, 0, 0)), new T.Quaternion().setFromEuler(new T.Euler(Math.PI / 2, 0.35, 0)), V(0.24 * size, 0.06 * size, 0.33 * size));
      this.put(parent, this.cone, mat(0.95, 0.84, 0.42, 0.4), p.clone().add(V(0, 0.01, 0.02)), new T.Quaternion().setFromEuler(new T.Euler(-1.2, 0, 0)), V(0.054 * size, 0.36 * size, 0.054 * size));
      this.stemTo(parent, p, V(p.x, 0, p.z), 0.007);
    },
    rose(parent, p, col, size){
      const m = mat(col[0], col[1], col[2], 0.55), id = new T.Quaternion();
      this.put(parent, this.sphere, m, p, id, V(0.10 * size, 0.10 * size, 0.10 * size));
      this.put(parent, this.sphere, m, p.clone().add(V(0, 0.035 * size, 0)), id, V(0.07 * size, 0.07 * size, 0.07 * size));
      this.stemTo(parent, p, V(p.x, 0, p.z), 0.006);
      for (let i = 0; i < 2; i++) this.leaf(parent, p.clone().add(V(0, -0.12, 0)), V(this.r(-1, 1), 0.2, this.r(-1, 1)), 0.18, 2);
    },
    heliconia(parent, p, dir, size){
      const red = mat(0.84, 0.10, 0.09, 0.6), org = mat(0.97, 0.50, 0.12, 0.55), d = dir.clone().normalize();
      for (let i = 0; i < 6; i++){
        const pp = p.clone().addScaledVector(d, 0.11 * i * size).add(V(0, 0.02 * i, 0));
        this.put(parent, this.sphere, i % 2 ? org : red, pp, new T.Quaternion().setFromEuler(new T.Euler(0, i % 2 ? 0.6 : -0.6, 0.6)), V(0.12 * size, 0.06 * size, 0.15 * size));
      }
      this.stemTo(parent, p, V(p.x, 0, p.z), 0.012);
    },
    bougainvillea(parent, a, b, n){
      const pink = mat(0.88, 0.18, 0.45, 0.4), mag = mat(0.70, 0.10, 0.45, 0.4);
      for (let i = 0; i < n; i++){
        const t = (i + this.r()) / n;
        const p = new T.Vector3().lerpVectors(a, b, t).add(V(this.r(-0.25, 0.25), this.r(-0.12, 0.12) - Math.sin(t * Math.PI) * 0.15, this.r(-0.2, 0.2)));
        for (let k = 0; k < 4; k++)
          this.put(parent, this.sphere, (i + k) % 3 ? pink : mag, p.clone().add(V(this.r(-0.04, 0.04), this.r(-0.03, 0.03), this.r(-0.04, 0.04))), new T.Quaternion().setFromEuler(new T.Euler(this.r(0, 6), this.r(0, 6), this.r(0, 6))), V(0.055, 0.012, 0.055));
        if (i % 2 === 0) this.leaf(parent, p, V(this.r(-1, 1), this.r(-0.8, 0.1), this.r(-1, 1)), 0.26, 2);
      }
    },
    reeds(parent, p, n){
      const reed = mat(0.80, 0.68, 0.50, 0.2), tuft = mat(0.66, 0.50, 0.34, 0.2);
      for (let i = 0; i < n; i++){
        const b = p.clone().add(V(this.r(-0.35, 0.35), 0, this.r(-0.35, 0.35))), h = this.r(0.7, 1.4);
        const tip = b.clone().add(V(this.r(-0.18, 0.18), h, this.r(-0.18, 0.18)));
        this.put(parent, this.stem, reed, b, new T.Quaternion().setFromUnitVectors(V(0, 1, 0), tip.clone().sub(b).normalize()), V(0.012, h, 0.012));
        this.put(parent, this.sphere, tuft, tip, null, V(0.05, 0.05, 0.16));
      }
    },
    // side = -1 / +1 keeps the bed (and the lean of its leaves) on that side of c, clear of the banner text
    bed(parent, c, radius, leaves, anth, roses, heli, colA, colB, side){
      this.init();
      const X = v => side ? Math.abs(v) * side : v;
      for (let i = 0; i < leaves; i++){
        const a = this.r(0, 6.28), d = this.r(0, radius), p = c.clone().add(V(X(Math.cos(a) * d), 0.05, Math.sin(a) * d));
        const kind = this.r() < 0.45 ? 0 : (this.r() < 0.6 ? 1 : 2), up = kind === 0 ? this.r(0.25, 0.9) : this.r(0.9, 1.8);
        this.leaf(parent, p, V(X(Math.cos(a + this.r(-0.6, 0.6))), up, Math.sin(a + this.r(-0.6, 0.6))), kind === 0 ? this.r(1.0, 1.5) : this.r(0.8, 1.2), kind);
      }
      for (let i = 0; i < anth; i++){ const a = this.r(0, 6.28), d = this.r(0.05, radius * 0.9); this.anthurium(parent, c.clone().add(V(X(Math.cos(a) * d), this.r(0.35, 0.85), Math.sin(a) * d)), this.r(0.9, 1.3)); }
      for (let i = 0; i < roses; i++){ const a = this.r(0, 6.28), d = this.r(0.05, radius * 0.95); this.rose(parent, c.clone().add(V(X(Math.cos(a) * d), this.r(0.25, 0.7), Math.sin(a) * d)), this.r() < 0.55 ? colA : colB, this.r(0.9, 1.4)); }
      for (let i = 0; i < heli; i++){ const a = this.r(0, 6.28), d = this.r(0.1, radius * 0.7); this.heliconia(parent, c.clone().add(V(X(Math.cos(a) * d), this.r(0.5, 0.9), Math.sin(a) * d)), V(X(this.r(-0.3, 0.3)), 0.8, this.r(-0.5, -0.1)), this.r(0.9, 1.3)); }
      this.reeds(parent, c.clone().add(V(X(this.r(0.1, 0.3)), 0, this.r(0.1, 0.4))), 7);
    },
    // a low border of roses and ground leaves, kept under the bottom edge of the banner
    border(parent, a, b, n, colA, colB){
      this.init();
      for (let i = 0; i < n; i++){
        const p = new T.Vector3().lerpVectors(a, b, (i + this.r(0.2, 0.8)) / n);
        this.rose(parent, p.clone().add(V(0, this.r(0.12, 0.22), this.r(-0.08, 0.08))), this.r() < 0.5 ? colA : colB, this.r(0.8, 1.1));
        this.leaf(parent, p.clone().add(V(0, 0.03, 0)), V(this.r(-1, 1), this.r(0.08, 0.18), -1), this.r(0.55, 0.8), 0);
      }
    },
    lights(parent, a, b, n, sag, m){
      for (let i = 0; i <= n; i++){ const t = i / n; this.put(parent, this.sphere, m, new T.Vector3().lerpVectors(a, b, t).add(V(0, -Math.sin(t * Math.PI) * sag, 0)), null, V(0.07, 0.07, 0.07)); }
    }
  };

  function lantern(parent, x, y, z, hanging){
    const blue = mat(0.12, 0.30, 0.66, 0.55, 0.5), glass = new T.MeshStandardMaterial({ color: 0xffe08c, emissive: 0xffb84d, emissiveIntensity: 1.4, roughness: 0.3 });
    const t = new T.Group(); t.position.set(x, y, z); parent.add(t);
    cyl(t, blue, 0, 0.02, 0, 0.14, 0.02, 0.14); cyl(t, glass, 0, 0.12, 0, 0.095, 0.095, 0.095);
    [0, 90, 180, 270].forEach(a => cyl(t, blue, Math.cos(a * Math.PI / 180) * 0.05, 0.12, Math.sin(a * Math.PI / 180) * 0.05, 0.012, 0.10, 0.012));
    cyl(t, blue, 0, 0.225, 0, 0.12, 0.018, 0.12); part(t, torusGeo(0.045, 0.006, 12, 5), blue, 0, 0.27, 0, 0, 0, Math.PI / 2);
    if (hanging) cyl(t, mat(0.30, 0.20, 0.10, 0.1), 0, 0.40, 0, 0.012, 0.14, 0.012);
  }

  function buildGate(){
    flora.seed(5); flora.init();
    const bamboo = mat(0.74, 0.62, 0.34, 0.3), rope = mat(0.30, 0.20, 0.10, 0.1), gold = mat(0.85, 0.66, 0.28, 0.6, 0.6);
    const C = V(11.4, 0, -6.5), g = new T.Group(); g.position.copy(C); g.rotation.y = -Math.PI / 2; root.add(g);   // faces the tree
    const cane = lathe([[0, 0], [0.055, 0], [0.050, 0.78], [0.066, 0.82], [0.050, 0.86], [0.050, 1.58], [0.066, 1.62], [0.050, 1.66], [0.048, 2.38], [0.064, 2.42], [0.048, 2.46], [0.046, 3.10], [0, 3.11]], 10);
    [-1.55, 1.55].forEach(px => { part(g, cane, bamboo, px, 0, 0); addCircleCol(C.x, C.z + px, 0.12); });
    cyl(g, bamboo, 0, 2.92, 0, 0.10, 1.95, 0.10, 0, 0, Math.PI / 2); cyl(g, bamboo, 1.5, 2.22, 0, 0.09, 0.45, 0.09, 0, 0, Math.PI / 2);
    [-1.55, 1.55].forEach(px => [2.92, 2.22].forEach(y => { if (!(y < 2.5 && px < 0)) part(g, torusGeo(0.062, 0.012, 12, 6), rope, px, y, 0); }));
    const CW = 2.15, CH = CW * 1.15, TOP = 2.86;
    cyl(g, mat(0.93, 0.90, 0.84, 0.1), -0.05, TOP, 0, 0.07, CW / 2 + 0.03, 0.07, 0, 0, Math.PI / 2);
    // woven bamboo trays
    const wtex = new T.TextureLoader().load('assets/images/anyaman.png'); wtex.wrapS = wtex.wrapT = T.RepeatWrapping; wtex.repeat.set(3, 3);
    const trayM = new T.MeshStandardMaterial({ map: wtex, roughness: 0.8, side: T.DoubleSide });
    const tray = lathe([[0, 0], [0.38, 0.014], [0.43, 0.034], [0.445, 0.058], [0.415, 0.058], [0.38, 0.040], [0, 0.022]], 28), rim = torusGeo(0.44, 0.011, 28, 6);
    part(g, tray, trayM, -1.45, 1.30, -0.10, -Math.PI / 2 + 0.10, 0, 0.21); part(g, tray, trayM, 1.40, 2.32, -0.10, -Math.PI / 2 - 0.07, 0, -0.14);
    part(g, rim, gold, -1.45, 1.30, -0.14, -Math.PI / 2 + 0.10, 0, 0.21); part(g, rim, gold, 1.40, 2.32, -0.14, -Math.PI / 2 - 0.07, 0, -0.14);
    lantern(g, -1.60, 0, -0.55); lantern(g, -1.15, 0, -0.80); lantern(g, -1.58, 1.80, -0.14, true); lantern(g, 1.60, 1.62, -0.14, true);
    const log = lathe([[0, 0], [0.20, 0], [0.21, 0.34], [0.17, 0.35], [0, 0.35]], 12), logM = mat(0.36, 0.24, 0.14, 0.1);
    part(g, log, logM, 0.95, 0, -0.35); part(g, log, logM, -0.55, 0, -0.55, 0, 0, 0, 0.9, 0.7, 0.9);
    // beds flank the posts and lean outward; only a low border sits in front, under the bottom edge of the cloth
    flora.bed(g, V(-1.85, 0, -0.25), 0.6, 18, 5, 5, 2, [0.98, 0.52, 0.14], [0.98, 0.74, 0.55], -1);
    flora.bed(g, V(1.85, 0, -0.20), 0.6, 16, 4, 6, 3, [0.98, 0.52, 0.14], [0.99, 0.62, 0.20], 1);
    flora.border(g, V(-1.05, 0, -0.42), V(0.95, 0, -0.42), 8, [0.98, 0.74, 0.55], [0.98, 0.52, 0.14]);
    flora.bougainvillea(g, V(-1.95, 3.0, -0.05), V(-1.45, 1.95, -0.10), 22); flora.bougainvillea(g, V(-1.9, 3.14, 0.08), V(-0.45, 3.14, 0.08), 10);
    // fairy lights from the shade tree
    const glow = new T.MeshBasicMaterial({ color: 0xfff0a8 });
    const tl = g.worldToLocal(root.localToWorld(V(15.6 - 0.3, 4.5, -6.5 + 0.3)));
    flora.lights(g, V(-1.55, 3.12, 0), tl.clone().add(V(-0.8, 0.2, 0.5)), 18, 0.6, glow);
    flora.lights(g, V(1.55, 3.12, 0), tl.clone().add(V(0.9, 0.2, -0.5)), 18, 0.6, glow);
    flora.lights(g, V(-1.55, 3.12, 0.06), V(1.55, 3.12, 0.06), 16, 0.12, glow);
    blob(g, 0, 0, -0.3, 4.2, 0.28);

    // lettering planes in the world frame (world z = -unity z); the cloth is slightly lit from the front
    const loader = new T.TextureLoader();
    const plane = (url, w, h, x, y, z, ry) => {
      const m = new T.MeshStandardMaterial({ map: loader.load(url), roughness: 0.9, side: T.FrontSide });
      const q = new T.Mesh(new T.PlaneGeometry(w, h), m); q.position.set(x, y, z); q.rotation.y = ry; scene.add(q); return q;
    };
    plane('assets/images/kain_selamat_datang.png', CW, CH, 11.4 - 0.03, TOP - CH / 2, 6.5 + 0.05, -Math.PI / 2);   // faces west, toward the balai
    plane('assets/images/kain_selamat_datang.png', CW, CH, 11.4 + 0.03, TOP - CH / 2, 6.5 + 0.05, Math.PI / 2);   // faces east, toward the tree
  }

  // ---------------------------------------------------------------- wau bulan maker
  // A craftsman on a mat east of the balai finishing a wau bulan on a bamboo easel; his right hand works
  // along the paper and dips into the glue shell, two finished wau hang on a rack behind him.
  const wm = { built: false };
  const WAU_PATH = [[0.30, 0.50], [0.20, 0.47], [0.12, 0.50], [0.10, 0.58], [0.16, 0.66], [0.24, 0.74], [0.34, 0.80], [0.42, 0.70]];
  function stick(parent, m, a, b, r){
    const d = new T.Vector3().subVectors(b, a), len = d.length();
    const o = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 2, 8), m);
    o.position.copy(a).add(b).multiplyScalar(0.5); o.quaternion.setFromUnitVectors(V(0, 1, 0), d.divideScalar(len)); o.scale.set(r * 2, len * 0.5, r * 2);
    parent.add(o); return o;
  }
  const wauTex = {};
  function wauPlane(parent, tex, pos, euler, width, bow){
    if (!wauTex[tex]) wauTex[tex] = new T.MeshStandardMaterial({ map: new T.TextureLoader().load('assets/images/' + tex + '.png'), transparent: true, alphaTest: 0.5, side: T.DoubleSide, roughness: 0.8 });
    const h = width * 1056 / 768;
    const q = new T.Mesh(new T.PlaneGeometry(1, 1), wauTex[tex]); q.position.copy(pos); q.rotation.set(euler[0], euler[1], euler[2]); q.scale.set(width, h, 1); parent.add(q);
    parent.updateMatrixWorld(true);
    const at = (u, v, z) => parent.worldToLocal(q.localToWorld(V(u - 0.5, 0.5 - v, z || 0)));
    const tas = [mat(0.85, 0.12, 0.12, 0.3), mat(0.98, 0.78, 0.20, 0.3)];
    [[0.0, 0.12], [1.0, 0.12], [0.03, 0.45], [0.97, 0.45]].forEach(uv => { for (let k = 0; k < 3; k++){ const p = at(uv[0], uv[1] + 0.03 + k * 0.025); sph(parent, tas[k % 2], p.x, p.y, p.z, 0.035, 0.05, 0.035); } });
    if (bow){
      const bamboo = mat(0.72, 0.58, 0.30, 0.3);
      let prev = null;
      for (let i = 0; i <= 8; i++){
        const t = i / 8, p = parent.worldToLocal(q.localToWorld(V((t - 0.5) * 0.95, 0.53 + Math.sin(t * Math.PI) * 0.06, -0.02)));
        if (prev) stick(parent, bamboo, prev, p, 0.008); prev = p;
      }
      stick(parent, mat(0.95, 0.95, 0.90, 0.2), parent.worldToLocal(q.localToWorld(V(-0.475, 0.53, -0.02))), parent.worldToLocal(q.localToWorld(V(0.475, 0.53, -0.02))), 0.002);
    }
    return q;
  }
  function buildWauMaker(easelPos, rackPos, yaw){
    const bamboo = mat(0.72, 0.58, 0.30, 0.3), Q = new T.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw);
    const rotate = v => v.clone().applyQuaternion(Q);
    root.updateMatrixWorld(true);
    const mc = easelPos.clone().add(rotate(V(0.2, 0, -0.55)));
    makeMat(root, mc.x, mc.z, 2.4, 2.0, [0.82, 0.66, 0.36], [0.68, 0.50, 0.24], [0.40, 0.22, 0.12]);
    const easel = new T.Group(); easel.position.copy(easelPos).add(V(0, 0.02, 0)); easel.rotation.y = yaw; root.add(easel); root.updateMatrixWorld(true);
    stick(easel, bamboo, V(-0.5, 0, -0.10), V(-0.42, 1.75, 0.24), 0.022); stick(easel, bamboo, V(0.5, 0, -0.10), V(0.42, 1.75, 0.24), 0.022);
    stick(easel, bamboo, V(0, 0, 0.75), V(0, 1.70, 0.24), 0.022); stick(easel, bamboo, V(-0.62, 0.12, -0.07), V(0.62, 0.12, -0.07), 0.018);
    wm.quad = wauPlane(easel, 'wau_kosong', V(0, 0.12 + 0.89, 0.08), [12 * Math.PI / 180, 0, 0], 1.3, false);
    const W = (u, v) => easel.worldToLocal(wm.quad.localToWorld(V(u - 0.5, 0.5 - v, -0.012)));
    stick(easel, bamboo, W(0.5, 0.03), W(0.5, 0.96), 0.008);
    const wing = [[0.02, 0.14], [0.15, 0.15], [0.30, 0.17], [0.5, 0.18], [0.70, 0.17], [0.85, 0.15], [0.98, 0.14]];
    for (let i = 1; i < wing.length; i++) stick(easel, bamboo, W(wing[i - 1][0], wing[i - 1][1]), W(wing[i][0], wing[i][1]), 0.006);
    const moon = [[0.05, 0.50], [0.10, 0.64], [0.22, 0.77], [0.36, 0.86], [0.5, 0.89], [0.64, 0.86], [0.78, 0.77], [0.90, 0.64], [0.95, 0.50]];
    for (let i = 1; i < moon.length; i++) stick(easel, bamboo, W(moon[i - 1][0], moon[i - 1][1]), W(moon[i][0], moon[i][1]), 0.006);
    // the craftsman, front-left of the easel and turned toward it
    const seat = easelPos.clone().add(rotate(V(-0.88, 0.02, -0.42)));
    wm.p = makePerson('PembuatWau', seat, 1.0, [0.80, 0.74, 0.58], [0.30, 0.20, 0.36], 1, 1, 22);
    wm.p.face(easelPos);
    root.updateMatrixWorld(true);
    const fwd = wm.p.fwd(), rt = wm.p.right();
    const toolBase = seat.clone().addScaledVector(rt, 0.42).addScaledVector(fwd, 0.18);
    wm.pot = part(root, lathe([[0, 0], [0.07, 0.01], [0.09, 0.05], [0.085, 0.075], [0.07, 0.075], [0.06, 0.04], [0, 0.03]], 14), mat(0.36, 0.22, 0.12, 0.3), toolBase.x, toolBase.y, toolBase.z);
    cyl(root, mat(0.95, 0.93, 0.85, 0.6), toolBase.x, toolBase.y + 0.055, toolBase.z, 0.12, 0.004, 0.12);
    for (let i = 0; i < 6; i++){
      const a = seat.clone().addScaledVector(rt, -0.5).addScaledVector(fwd, 0.1 + i * 0.03).add(V(0, 0.03, 0));
      stick(root, bamboo, a, a.clone().add(V(0, 0, 0.9).applyAxisAngle(V(0, 1, 0), yaw + 0.35)), 0.006);
    }
    [[0.85, 0.15, 0.15], [0.98, 0.82, 0.20], [0.20, 0.55, 0.30], [0.95, 0.93, 0.86]].forEach((c, i) => {
      const p = seat.clone().addScaledVector(rt, 0.55).addScaledVector(fwd, -0.25).add(V(0.01 * i, 0.025 + i * 0.004, 0.012 * i));
      box(root, mat(c[0], c[1], c[2], 0.2), p.x, p.y, p.z, 0.36, 0.004, 0.26, yaw + i * 0.12);
    });
    // rack with two finished wau, each with its busur
    const rack = new T.Group(); rack.position.copy(rackPos); rack.rotation.y = yaw; root.add(rack); root.updateMatrixWorld(true);
    stick(rack, bamboo, V(-1.35, 0, 0), V(-1.35, 2.9, 0), 0.035); stick(rack, bamboo, V(1.35, 0, 0), V(1.35, 2.9, 0), 0.035);
    stick(rack, bamboo, V(-1.5, 2.78, 0), V(1.5, 2.78, 0), 0.03);
    [-0.66, 0.66].forEach(x => {
      stick(rack, mat(0.30, 0.20, 0.10, 0.1), V(x, 2.78, 0), V(x, 2.42, 0), 0.004);
      wauPlane(rack, x < 0 ? 'wau_merah' : 'wau_biru', V(x, 2.42 - 0.84, 0), [0, 0, (x < 0 ? 4 : -3) * Math.PI / 180], 1.22, true);
    });
    blob(rack, 0, 0, 0, 3.0, 0.25);
    addCircleCol(easelPos.x, easelPos.z, 0.6); addBoxCol(rackPos.x, rackPos.z, 0.2, 1.45);
    wm.built = true;
  }
  function updateWau(t){
    if (!wm.built) return;
    const u = t % 9, p = wm.p;
    const W = uv => rootLocal(wm.quad.localToWorld(V(uv[0] - 0.5, 0.5 - uv[1], -0.05)));
    const pot = rootLocal(wm.pot.localToWorld(V(0, 0.07, 0)));
    let hand;
    if (u < 5.5){
      const k = u / 5.5 * (WAU_PATH.length - 1), i = Math.min(WAU_PATH.length - 2, Math.floor(k)), f = k - i;
      hand = new T.Vector3().lerpVectors(W(WAU_PATH[i]), W(WAU_PATH[i + 1]), smooth(f));
    } else if (u < 6.5) hand = lerpV(W(WAU_PATH[WAU_PATH.length - 1]), pot.clone().add(V(0, 0.12, 0)), u - 5.5);
    else if (u < 7.2) hand = pot.clone().add(V(0, 0.12 - 0.10 * Math.sin((u - 6.5) / 0.7 * Math.PI), 0));
    else hand = lerpV(pot.clone().add(V(0, 0.12, 0)), W(WAU_PATH[0]), (u - 7.2) / 1.8);
    p.armR.solve(p.shoulder(1), hand, p.poleR());
    p.armL.solve(p.shoulder(-1), W([0.46, 0.52]).add(V(0, Math.sin(t * 0.9) * 0.01, 0)), p.poleL());
    p.head.rotation.x += (0.2 - p.head.rotation.x) * 0.08; p.head.rotation.y = Math.sin(t * 0.5) * 0.15;
  }

  // ---------------------------------------------------------------- sudut batik
  // Beside the wau maker: a cloth stretched on a wooden pemidang with its motif already drawn in wax.
  // In VR a brush appears in each hand: dip it in a bowl to take up that dye, touch the cloth and the dye
  // spreads up to the wax lines; holding still lets it soak further, and the water bowl washes colour
  // off. On a flat screen the centre of the view (or a finger) is the brush: hold on the cloth to paint,
  // click a bowl to change dye. A finished cloth hangs behind as an example.
  // Same build and the same dye engine as BatikCorner.cs in the Quest app. The wax lines are not redrawn
  // here: they are loaded from batik_lilin.png, which the Quest app exports (GWMPreview.Batik), so the
  // two cloths are identical line for line. batik_siap.png is the finished cloth from the same export.
  const BW = 768, BH = 480, B_AVG = 8;   // cloth pixels; typical wicking cost of one pixel
  const DYES = [[255, 252, 244], [212, 38, 52], [236, 84, 150], [244, 130, 32], [250, 205, 48], [44, 158, 84], [26, 170, 176], [34, 96, 196], [134, 58, 168]];
  const WAX_RGB = [204, 150, 64];
  const B_WATER = 0, B_MERAH = 1, B_BIRU = 7, BOWL_DYE = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  const B_OFF = [1, -1, BW, -BW, BW + 1, BW - 1, -BW + 1, -BW - 1], B_OFA = [0, 0, 0, 0, 1, -1, 1, -1], B_OFB = [0, 0, 0, 0, BW, BW, -BW, -BW];
  function bHash(x, y){
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    return ((h ^ (h >>> 16)) & 0xffff) / 65535;
  }
  function bNoise(x, y){
    const xi = Math.floor(x), yi = Math.floor(y); let fx = x - xi, fy = y - yi;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const a = bHash(xi, yi), b = bHash(xi + 1, yi), c = bHash(xi, yi + 1), d = bHash(xi + 1, yi + 1);
    const lo = a + (b - a) * fx, hi = c + (d - c) * fx;
    return lo + (hi - lo) * fy;
  }

  // The cloth: dye wicks outward from wherever the brush touches until it meets a wax line.
  function BatikCanvas(){
    const n = BW * BH;
    this.wax = new Uint8Array(n);      // wax coverage; a barrier to dye from 128 up
    this.wall = new Uint8Array(n);     // wax barrier, or the outermost ring of pixels
    this.cost = new Uint8Array(n);     // how slowly dye wicks through this pixel
    this.grain = new Uint8Array(n);    // weave of the cloth
    this.dye = new Uint8Array(n);      // index into DYES
    this.reach = new Int16Array(n);    // how much further the dye could still travel when it got here
    this.px = new Uint8Array(n * 4);
    this.queue = new Int32Array(n); this.qHead = 0; this.qCount = 0;
    this.dirty = false; this.lastUpload = 0; this.ready = false;
    for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++){
      const i = y * BW + x;
      this.cost[i] = 5 + 7 * (0.65 * bNoise(x / 13, y / 13) + 0.35 * bNoise(x / 4.5 + 31, y / 4.5 + 17));
      this.grain[i] = 255 - (x % 3 === 0 ? 5 : 0) - (y % 3 === 0 ? 5 : 0) - Math.floor(bHash(x + 91, y + 17) * 5);
    }
    const gl2 = !!(renderer && renderer.capabilities && renderer.capabilities.isWebGL2);   // mipmaps on a non-power-of-two texture need WebGL2
    this.tex = new T.DataTexture(this.px, BW, BH, T.RGBAFormat);
    this.tex.encoding = T.sRGBEncoding; this.tex.magFilter = T.LinearFilter;
    this.tex.minFilter = gl2 ? T.LinearMipmapLinearFilter : T.LinearFilter; this.tex.generateMipmaps = gl2; this.tex.anisotropy = 4;
    this.setWax(null);
  }
  BatikCanvas.prototype.setWax = function(w){
    if (w) this.wax.set(w);
    for (let i = 0; i < this.wall.length; i++){
      const x = i % BW, y = (i / BW) | 0;
      this.wall[i] = (this.wax[i] >= 128 || x === 0 || y === 0 || x === BW - 1 || y === BH - 1) ? 1 : 0;
    }
    this.clear();
  };
  BatikCanvas.prototype.shade = function(i){
    const d = this.dye[i], D = DYES[d];
    let r = D[0], g = D[1], b = D[2];
    if (d !== 0){
      // thinner where the dye only just arrived, and a little uneven like real cloth
      let e = this.reach[i] * 2; if (e > 80) e = 80;
      const k = 176 + e - (this.cost[i] - 5) * 3, c0 = DYES[0];
      r = (c0[0] * (256 - k) + r * k) >> 8; g = (c0[1] * (256 - k) + g * k) >> 8; b = (c0[2] * (256 - k) + b * k) >> 8;
    }
    const gr = this.grain[i];
    r = (r * gr / 255) | 0; g = (g * gr / 255) | 0; b = (b * gr / 255) | 0;
    const a = this.wax[i];
    if (a > 0){ r = ((r * (255 - a) + WAX_RGB[0] * a) / 255) | 0; g = ((g * (255 - a) + WAX_RGB[1] * a) / 255) | 0; b = ((b * (255 - a) + WAX_RGB[2] * a) / 255) | 0; }
    const o = i * 4, p = this.px;
    p[o] = r; p[o + 1] = g; p[o + 2] = b; p[o + 3] = 255;
  };
  // put dye c on the cloth at pixel (fx, fy); it then wicks outward as far as budget allows
  BatikCanvas.prototype.dab = function(fx, fy, c, budget){
    const x = fx | 0, y = fy | 0;
    if (x < 1 || y < 1 || x >= BW - 1 || y >= BH - 1) return;
    let i = y * BW + x;
    if (this.wall[i]){   // the brush landed on a wax line: the dye goes to the nearest open cloth
      let best = -1, bd = 1e9;
      for (let oy = -4; oy <= 4; oy++) for (let ox = -4; ox <= 4; ox++){
        const xx = x + ox, yy = y + oy;
        if (xx < 1 || yy < 1 || xx >= BW - 1 || yy >= BH - 1) continue;
        const j = yy * BW + xx, dd = ox * ox + oy * oy;
        if (!this.wall[j] && dd < bd){ bd = dd; best = j; }
      }
      if (best < 0) return;
      i = best;
    }
    if (this.dye[i] === c && this.reach[i] >= budget) return;
    this.dye[i] = c; this.reach[i] = budget; this.shade(i);
    if (this.qCount < this.queue.length){ this.queue[(this.qHead + this.qCount) % this.queue.length] = i; this.qCount++; }
    this.dirty = true;
  };
  // the brush moved from a to b (pixels) while touching the cloth
  BatikCanvas.prototype.stroke = function(ax, ay, bx, by, c, radius){
    const budget = Math.max(1, Math.min(32000, Math.round(radius * B_AVG)));
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 3));
    for (let k = 1; k <= n; k++){ const u = k / n; this.dab(ax + (bx - ax) * u, ay + (by - ay) * u, c, budget); }
  };
  BatikCanvas.prototype.step = function(pops){
    const q = this.queue, len = q.length, wall = this.wall, dye = this.dye, reach = this.reach, cost = this.cost;
    if (pops > this.qCount) pops = this.qCount;
    for (; pops > 0; pops--){
      const i = q[this.qHead]; this.qHead = (this.qHead + 1) % len; this.qCount--;
      const r = reach[i], c = dye[i];
      if (r <= 0) continue;
      for (let k = 0; k < 8; k++){
        const j = i + B_OFF[k];
        if (wall[j]) continue;
        if (k >= 4 && (wall[i + B_OFA[k]] || wall[i + B_OFB[k]])) continue;   // never squeeze diagonally past wax
        const nb = r - (k < 4 ? cost[j] : (cost[j] * 7 / 5) | 0);
        if (nb <= 0 || (dye[j] === c && reach[j] >= nb)) continue;
        dye[j] = c; reach[j] = nb; this.shade(j);
        if (this.qCount < len){ q[(this.qHead + this.qCount) % len] = j; this.qCount++; }
      }
      this.dirty = true;
    }
  };
  // every frame: let the dye creep a little further and refresh the texture
  BatikCanvas.prototype.tick = function(now){
    if (this.qCount > 0) this.step(Math.min(40000, Math.max(6000, (this.qCount / 4) | 0)));
    if (this.dirty && now - this.lastUpload > 0.02){ this.lastUpload = now; this.dirty = false; this.tex.needsUpdate = true; }
  };
  BatikCanvas.prototype.flush = function(){
    while (this.qCount > 0) this.step(this.qCount);
    this.dirty = false; this.tex.needsUpdate = true;
  };
  // a fresh cloth: wax lines only
  BatikCanvas.prototype.clear = function(){
    this.dye.fill(0); this.reach.fill(0); this.qHead = this.qCount = 0;
    for (let i = 0; i < this.dye.length; i++) this.shade(i);
    this.dirty = false; this.tex.needsUpdate = true;
  };

  const bk = { built: false, brushes: [], bowls: [], pickables: [], painted: false, lastPaint: -999, near: false, out: [], outTimer: 0, log: [], pending: [] };
  const ptr = { down: false, press: false, touch: null, x: 0, y: 0, mode: '' };   // the mouse button or the painting finger
  bk.ptr = ptr;
  let SPECT = false;   // spectator tabs only watch: the guest's strokes arrive as messages
  const D2R = Math.PI / 180;
  const _eye = new T.Vector3(), _tip = new T.Vector3(), _bv = new T.Vector3(), _bq = new T.Quaternion(), _ndc = new T.Vector2();
  const bRay = new T.Raycaster();

  function setDye(b, dye){
    b.dye = dye;
    if (dye === B_WATER) b.bristle.color.setRGB(0.78, 0.88, 0.94);
    else b.bristle.color.setRGB(DYES[dye][0] / 255, DYES[dye][1] / 255, DYES[dye][2] / 255);
    b.bristle.color.convertSRGBToLinear();
  }
  // the brush is modelled pointing along -z (three's controller forward), tip 0.195 ahead of the hand
  function buildBrush(home){
    const b = { root: new T.Group(), home, dye: home, touching: false, last: new T.Vector2(), dwell: 0, k: 0, show: 0, buzz: 0, sent: null, skipped: null };
    cyl(b.root, mat(0.62, 0.44, 0.22, 0.4), 0, 0, -0.03, 0.017, 0.095, 0.017, Math.PI / 2);
    cyl(b.root, mat(0.86, 0.64, 0.20, 0.8, 0.85), 0, 0, -0.133, 0.022, 0.011, 0.022, Math.PI / 2);
    b.bristle = new T.MeshStandardMaterial({ roughness: 0.75, side: T.DoubleSide });
    part(b.root, lathe([[0, 0], [0.011, 0], [0.0155, 0.016], [0.011, 0.038], [0, 0.055]], 12), b.bristle, 0, 0, -0.142, -Math.PI / 2);
    b.tip = new T.Object3D(); b.tip.position.set(0, 0, -0.195); b.root.add(b.tip);
    setDye(b, home);
    return b;
  }
  // a brush for this controller, held the way the Quest app holds it relative to the hand; hidden until the guest is at the frame
  function attachBrush(gp, left){
    const b = buildBrush(left ? B_BIRU : B_MERAH);
    b.grip = gp; b.holder = new T.Group(); b.holder.rotation.x = HAND_TILT; b.holder.visible = false;
    b.root.position.set(0, -0.0021, -0.0322); b.root.rotation.x = -22 * D2R;
    b.holder.add(b.root); gp.add(b.holder); gp.userData.batikBrush = b;
    bk.brushes.push(b);
  }

  function buildBatik(pos, yaw){
    const CW = 1.4, CH = CW * BH / BW, TILT = 15 * D2R, CLOTH_Y = 0.88, LEDGE_Y = 0.70, LEDGE_Z = -0.15, RIM = 0.052;
    const wood = mat(0.44, 0.25, 0.11, 0.35), woodDark = mat(0.26, 0.13, 0.06, 0.4), bamboo = mat(0.72, 0.58, 0.30, 0.3);
    const rope = mat(0.30, 0.20, 0.10, 0.1), ceramic = mat(0.93, 0.92, 0.88, 0.65);
    const loader = new T.TextureLoader();
    const g = new T.Group(); g.position.copy(pos); g.rotation.y = yaw; root.add(g); bk.g = g;
    makeMat(g, 0, -0.45, 2.5, 1.9, [0.80, 0.66, 0.38], [0.64, 0.48, 0.24], [0.42, 0.20, 0.13]);
    blob(g, 0, 0.022, 0.30, 2.3, 0.30);

    // ---- pemidang: the cloth stretched on a wooden frame that leans back like an easel
    const up = V(0, Math.cos(TILT), Math.sin(TILT)), back = V(0, -Math.sin(TILT), Math.cos(TILT));
    const P = (along, side, behind) => V(side, CLOTH_Y, 0).addScaledVector(up, along).addScaledVector(back, behind);
    bk.canvas = new BatikCanvas();
    const cloth = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshStandardMaterial({ map: bk.canvas.tex, roughness: 0.95, side: T.DoubleSide }));
    cloth.position.copy(P(CH * 0.5, 0, 0)); cloth.rotation.x = TILT; cloth.scale.set(CW, CH, 1); g.add(cloth);
    bk.cloth = cloth; bk.pickables.push(cloth);
    const hx = CW * 0.5 + 0.05;
    const bar = (p, sx, sy, sz) => { box(g, wood, p.x, p.y, p.z, sx, sy, sz).rotation.x = TILT; };
    bar(P(-0.03, 0, 0.028), CW + 0.16, 0.06, 0.04); bar(P(CH + 0.03, 0, 0.028), CW + 0.16, 0.06, 0.04);
    [-1, 1].forEach(sx => {
      bar(P(CH * 0.5, sx * hx, 0.028), 0.06, CH + 0.12, 0.04);
      for (let k = 0; k < 6; k++){   // cord lacing the cloth to the frame
        const a = P(CH * (0.08 + k * 0.168), sx * CW * 0.5, 0);
        stick(g, rope, a.clone().addScaledVector(back, -0.004), a.clone().add(V(sx * 0.05, 0, 0)).addScaledVector(back, 0.01), 0.004);
      }
      stick(g, wood, V(sx * hx, 0, 0.03), V(sx * hx, CLOTH_Y - 0.02, 0.03), 0.028);                                   // front leg
      stick(g, wood, P(CH + 0.03, sx * hx, 0.05), V(sx * hx, 0, 0.80), 0.026);                                        // back strut
      stick(g, woodDark, V(sx * hx, 0.34, 0.03), V(sx * hx, 0.34, 0.69), 0.018);                                      // side brace
      stick(g, wood, V(sx * (hx + 0.01), 0, LEDGE_Z - 0.10), V(sx * (hx + 0.01), LEDGE_Y - 0.03, LEDGE_Z - 0.10), 0.022);   // ledge post
      stick(g, woodDark, V(sx * hx, LEDGE_Y - 0.06, LEDGE_Z - 0.10), V(sx * hx, LEDGE_Y - 0.06, 0.03), 0.016);
    });
    for (let k = 0; k < 8; k++) [-0.004, CH + 0.004].forEach(e => {
      const a = P(e, -CW * 0.5 + CW * (0.07 + k * 0.123), 0);
      stick(g, rope, a.clone().addScaledVector(back, -0.004), a.clone().addScaledVector(up, e < 0.1 ? -0.03 : 0.03).addScaledVector(back, 0.01), 0.004);
    });
    stick(g, woodDark, V(-hx, 0.90, 0.545), V(hx, 0.90, 0.545), 0.018);

    // ---- the ledge of dye bowls under the cloth: eight dyes and a bowl of water
    box(g, wood, 0, LEDGE_Y - 0.02, LEDGE_Z, CW + 0.26, 0.04, 0.27); box(g, woodDark, 0, LEDGE_Y + 0.008, LEDGE_Z - 0.128, CW + 0.26, 0.018, 0.014);
    const bowlGeo = lathe([[0, 0], [0.036, 0], [0.052, 0.016], [0.060, RIM], [0.054, RIM], [0.045, 0.020], [0, 0.014]], 20);
    BOWL_DYE.forEach((d, i) => {
      const x = -0.66 + i * 0.165, bowl = { x, y: LEDGE_Y + RIM, z: LEDGE_Z, dye: d };
      const col = d === B_WATER ? new T.Color(0.62, 0.82, 0.92) : new T.Color(DYES[d][0] / 255, DYES[d][1] / 255, DYES[d][2] / 255);
      if (d !== B_WATER) col.multiplyScalar(0.8);   // deep, like dye standing in a bowl; the open sky would otherwise wash it pale
      const dm = new T.MeshStandardMaterial({ color: col.convertSRGBToLinear(), roughness: 0.9, side: T.DoubleSide });
      [part(g, bowlGeo, ceramic, x, LEDGE_Y, LEDGE_Z), cyl(g, dm, x, LEDGE_Y + RIM - 0.012, LEDGE_Z, 0.102, 0.002, 0.102)].forEach(m => { m.userData.bowl = bowl; bk.pickables.push(m); });
      bk.bowls.push(bowl);
    });

    // ---- papan arahan (how to paint), on the far side so people walking up from the entrance can read it
    const sign = new T.Group(); sign.position.set(-1.48, 0, -0.05); sign.rotation.order = 'YXZ'; sign.rotation.set(5 * D2R, -30 * D2R, 0); g.add(sign);
    [-0.36, 0.36].forEach(sx => stick(sign, bamboo, V(sx, 0, 0.03), V(sx, 1.86, 0.03), 0.022));
    box(sign, woodDark, 0, 1.36, 0, 0.96, 0.96, 0.03);
    const signTex = loader.load('assets/images/papan_batik.png'); signTex.encoding = T.sRGBEncoding; signTex.anisotropy = 4;
    add(sign, new T.Mesh(new T.PlaneGeometry(0.90, 0.90), new T.MeshStandardMaterial({ map: signTex, roughness: 0.9, side: T.DoubleSide })), 0, 1.36, -0.017);
    blob(sign, 0, 0, 0, 1.1, 0.25);

    // ---- ampaian: a finished cloth hung high behind the frame as an example
    const line = new T.Group(); line.position.set(0, 0, 1.20); g.add(line);
    [-1.02, 1.02].forEach(sx => stick(line, bamboo, V(sx, 0, 0), V(sx, 2.78, 0), 0.035));
    stick(line, bamboo, V(-1.16, 2.62, 0), V(1.16, 2.62, 0), 0.028);
    [-1.02, 1.02].forEach(sx => part(line, torusGeo(0.042, 0.010, 12, 6), rope, sx, 2.62, 0, 0, 0, Math.PI / 2));
    bk.swing = new T.Group(); bk.swing.position.set(0, 2.60, 0); line.add(bk.swing);
    const SW = 1.72, SH = SW * BH / BW;
    const doneTex = loader.load('assets/images/batik_siap.png'); doneTex.encoding = T.sRGBEncoding; doneTex.anisotropy = 4;
    add(bk.swing, new T.Mesh(new T.PlaneGeometry(SW, SH), new T.MeshStandardMaterial({ map: doneTex, roughness: 0.95, side: T.DoubleSide })), 0, -0.02 - SH * 0.5, -0.012);
    cyl(bk.swing, mat(0.95, 0.93, 0.88, 0.05), 0, 0.02, 0, 0.068, SW * 0.5, 0.068, 0, 0, Math.PI / 2);
    blob(line, 0, 0, 0, 2.6, 0.22);

    // ---- walking: around the frame, never through the hanging cloth or the board
    root.updateMatrixWorld(true);
    const col = (x, z, r) => { const w = rootLocal(g.localToWorld(V(x, 0, z))); addCircleCol(w.x, w.z, r); };
    [-0.56, 0, 0.56].forEach(x => col(x, 0.40, 0.42));
    [-1.02, -0.51, 0, 0.51, 1.02].forEach(x => col(x, 1.20, 0.26));
    col(-1.48, -0.05, 0.42);

    // ---- the wax lines, exactly as the Quest app drew them
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = BW; c.height = BH;
        const cx = c.getContext('2d'); cx.drawImage(img, 0, 0, BW, BH);
        const d = cx.getImageData(0, 0, BW, BH).data, w = new Uint8Array(BW * BH);
        for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) w[(BH - 1 - y) * BW + x] = d[(y * BW + x) * 4];   // image rows run top down, the cloth bottom up
        bk.canvas.setWax(w);
      } catch (e){ console.warn('batik wax map unreadable, the cloth stays plain:', e); }
      batikReady();
    };
    img.onerror = batikReady;
    img.src = 'assets/images/batik_lilin.png';

    // ---- brushes: one per VR hand, and one for the mouse or a finger on flat screens
    gripsRef.forEach((gp, i) => attachBrush(gp, i === 1));
    bk.flat = buildBrush(B_MERAH); bk.flat.root.visible = false; bk.flat.root.scale.setScalar(1.6); scene.add(bk.flat.root);
    if (!SPECT) installBatikInput();
    bk.built = true;
  }
  function batikReady(){
    bk.canvas.ready = true;
    const p = bk.pending; bk.pending = [];
    p.forEach(s => bk.canvas.stroke(s[0], s[1], s[2], s[3], s[4], s[5]));
    if (p.length) bk.canvas.flush();
  }

  // what the view centre, the mouse or a finger is pointing at: the cloth, a bowl, or nothing within reach
  function batikPick(cx, cy){
    const r = renderer.domElement.getBoundingClientRect();
    _ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    bRay.setFromCamera(_ndc, camera); bRay.far = 3.2;
    const hit = bRay.intersectObjects(bk.pickables, false)[0];
    if (!hit) return null;
    return hit.object === bk.cloth ? { kind: 'cloth', point: hit.point, uv: hit.uv } : { kind: 'bowl', point: hit.point, bowl: hit.object.userData.bowl };
  }
  function installBatikInput(){
    const el = renderer.domElement;
    document.addEventListener('mousedown', e => { if (e.button === 0 && e.target === el){ ptr.down = true; ptr.press = true; ptr.x = e.clientX; ptr.y = e.clientY; } });
    document.addEventListener('mouseup', e => { if (e.button === 0 && ptr.touch === null) ptr.down = false; });
    document.addEventListener('mousemove', e => { if (ptr.touch === null){ ptr.x = e.clientX; ptr.y = e.clientY; } });
    // a finger that lands on the cloth or a bowl paints; it must not also turn the view (index.html's drag-to-look)
    document.addEventListener('touchstart', e => {
      if (!bk.near || ptr.touch !== null || renderer.xr.isPresenting) return;
      for (const tc of e.changedTouches){
        if (tc.target !== el || !batikPick(tc.clientX, tc.clientY)) continue;
        ptr.touch = tc.identifier; ptr.x = tc.clientX; ptr.y = tc.clientY; ptr.down = true; ptr.press = true;
        e.stopImmediatePropagation(); e.preventDefault();
        break;
      }
    }, { capture: true, passive: false });
    document.addEventListener('touchmove', e => {
      for (const tc of e.changedTouches) if (tc.identifier === ptr.touch){ ptr.x = tc.clientX; ptr.y = tc.clientY; e.preventDefault(); }
    }, { capture: true, passive: false });
    ['touchend', 'touchcancel'].forEach(ev => document.addEventListener(ev, e => {
      for (const tc of e.changedTouches) if (tc.identifier === ptr.touch){ ptr.touch = null; ptr.down = false; }
    }, true));
    const touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    const h = document.createElement('div'); h.id = 'batikHint';
    h.style.cssText = 'position:fixed;left:' + (touch ? 'calc(50% + 60px)' : '50%') + ';bottom:' + (touch ? 10 : 28) + 'px;transform:translateX(-50%);z-index:11;' +
      'padding:' + (touch ? '6px 14px' : '9px 20px') + ';border-radius:14px;background:rgba(20,14,6,0.74);color:#f2e2b6;border:1px solid rgba(242,217,138,0.6);' +
      'font-family:Georgia,serif;font-size:' + (touch ? 11.5 : 13) + 'px;line-height:1.5;letter-spacing:.4px;text-align:center;pointer-events:none;opacity:0;' +
      'transition:opacity .5s;width:max-content;max-width:' + (touch ? 62 : 92) + 'vw';
    h.innerHTML = touch
      ? '<b>SENTUH</b> kain untuk mewarna &nbsp;·&nbsp; sentuh mangkuk untuk tukar warna<br><i>Touch the cloth to paint · tap a bowl to change colour</i>'
      : '<b>KLIK &amp; TAHAN</b> pada kain untuk mewarna &nbsp;·&nbsp; klik mangkuk untuk tukar warna<br><i>Hold the mouse on the cloth to paint · click a bowl to change colour</i>';
    document.body.appendChild(h); bk.hint = h; bk.touchUi = touch;
  }

  // a soft "plop" as the brush goes into a bowl
  function plop(){
    try {
      const ctx = T.AudioContext.getContext(); if (!ctx || ctx.state !== 'running') return;
      const o = ctx.createOscillator(), gn = ctx.createGain(), t0 = ctx.currentTime;
      o.type = 'sine'; o.frequency.setValueAtTime(320, t0); o.frequency.linearRampToValueAtTime(1216, t0 + 0.16);
      gn.gain.setValueAtTime(0.0001, t0); gn.gain.linearRampToValueAtTime(0.3, t0 + 0.004); gn.gain.exponentialRampToValueAtTime(0.004, t0 + 0.16);
      o.connect(gn); gn.connect(ctx.destination); o.start(t0); o.stop(t0 + 0.17);
    } catch (e){}
  }
  function buzz(b, amp, ms){
    const sess = renderer.xr.getSession && renderer.xr.getSession(); if (!sess) return;
    const hand = b.grip && b.grip.userData.hand;
    for (const src of sess.inputSources){
      if (!src.gamepad || (hand && src.handedness !== hand)) continue;
      const a = src.gamepad.hapticActuators && src.gamepad.hapticActuators[0];
      if (a && a.pulse){ const p = a.pulse(amp, ms); if (p && p.catch) p.catch(() => {}); }
    }
  }

  // strokes are also handed to index.html (GWMX.onBatik) so spectators see the guest paint; holding still
  // grows the same spot every frame, so only every few steps of that growth is passed on
  function emitStroke(s){ bk.out.push(s); if (bk.log.length < 40000) bk.log.push(s); }
  function shareStroke(b, s){
    if (SPECT) return;
    const same = b.sent && b.sent[2] === s[2] && b.sent[3] === s[3] && b.sent[4] === s[4] && s[5] < b.sent[5] + 4;
    if (same){ b.skipped = s; return; }
    if (b.skipped) emitStroke(b.skipped);   // the furthest the held spot soaked before the brush moved on
    b.sent = s; b.skipped = null;
    emitStroke(s);
  }
  function endStroke(b){
    if (b.skipped) emitStroke(b.skipped);
    b.skipped = null; b.sent = null;
  }
  // one frame of a brush: on the cloth at pixel (px, py), or lifted
  function paintStep(b, touch, px, py, dt, t){
    if (!touch){ if (b.touching) endStroke(b); b.touching = false; b.dwell = 0; return; }
    let moved = b.touching ? Math.hypot(px - b.last.x, py - b.last.y) : 0;
    if (moved > 220){ endStroke(b); b.touching = false; moved = 0; }   // a jump is a new touch, not a stroke
    b.dwell = moved < 50 * dt ? Math.min(1.8, b.dwell + dt) : Math.max(0, b.dwell - dt * 3);
    let k = Math.min(1, b.dwell / 1.8); k = k * k * (3 - 2 * k); b.k = k;
    const s = [Math.round(b.touching ? b.last.x : px), Math.round(b.touching ? b.last.y : py), Math.round(px), Math.round(py), b.dye, Math.round(15 + 115 * k)];   // a held brush soaks a whole petal or leaf
    bk.canvas.stroke(s[0], s[1], s[2], s[3], s[4], s[5]);
    shareStroke(b, s);
    b.last.set(px, py); b.touching = true; bk.painted = true; bk.lastPaint = t;
  }
  // a fresh cloth and clean brushes for the next guest
  function resetBatik(tell){
    if (!bk.built) return;
    bk.canvas.clear(); bk.painted = false; bk.out = []; bk.log = []; bk.pending = [];
    bk.brushes.concat([bk.flat]).forEach(b => { setDye(b, b.home); b.touching = false; b.dwell = 0; b.sent = b.skipped = null; });
    if (tell && GWMX.onBatik) GWMX.onBatik({ type: 'batik', clear: 1 });
  }
  GWMX.resetBatik = () => resetBatik(false);
  // what a spectator who joins late needs to catch up: everything painted since the cloth was last fresh
  GWMX.batikState = () => {
    const msgs = [{ type: 'batik', clear: 1 }];
    for (let i = 0; i < bk.log.length; i += 200) msgs.push({ type: 'batik', s: bk.log.slice(i, i + 200) });
    return msgs;
  };
  GWMX.applyBatik = msg => {
    if (!bk.built || !msg) return;
    if (msg.clear){ bk.canvas.clear(); bk.pending = []; }
    if (!Array.isArray(msg.s)) return;
    if (!bk.canvas.ready){ msg.s.forEach(s => bk.pending.push(s)); return; }
    msg.s.forEach(s => { if (Array.isArray(s) && s.length >= 6) bk.canvas.stroke(s[0], s[1], s[2], s[3], s[4], s[5]); });
    if (msg.s.length > 40) bk.canvas.flush();   // a catch-up batch: settle it at once
  };

  function updateBatik(dt, t){
    if (!bk.built) return;
    const cv = bk.canvas, xr = renderer.xr.isPresenting;
    bk.swing.rotation.x = (Math.sin(t * 0.9) * 1.5 + Math.sin(t * 0.37) * 0.8) * D2R;
    camera.getWorldPosition(_eye);
    const h = bk.g.worldToLocal(_bv.copy(_eye)), d = Math.hypot(h.x, h.z + 0.5);
    bk.near = d < 2.6;
    // nobody has painted for a while and nobody is around: put up a fresh cloth
    if (!SPECT && bk.painted && d > 6 && t - bk.lastPaint > 150) resetBatik(true);

    // ---- VR: a brush in each hand
    bk.brushes.forEach(b => {
      const want = (bk.near && b.grip.visible && (xr || SPECT)) ? 1 : 0;
      b.show += Math.max(-dt * 4, Math.min(dt * 4, want - b.show));
      const s = b.show * b.show * (3 - 2 * b.show);
      b.holder.visible = s > 0.001; b.root.scale.setScalar(Math.max(s, 0.001));
      if (!xr || SPECT || b.show < 0.99 || !cv.ready){ paintStep(b, false, 0, 0, dt, t); return; }
      b.tip.getWorldPosition(_tip);
      const f = bk.g.worldToLocal(_bv.copy(_tip));
      for (const bowl of bk.bowls){   // dip the brush into a bowl to take up that dye
        const dx = f.x - bowl.x, dz = f.z - bowl.z, dy = f.y - bowl.y;
        if (dx * dx + dz * dz > 0.058 * 0.058 || dy > 0.03 || dy < -0.06) continue;
        if (b.dye !== bowl.dye){ setDye(b, bowl.dye); buzz(b, 0.55, 50); plop(); }
        break;
      }
      const l = bk.cloth.worldToLocal(_bv.copy(_tip));   // touch the cloth: the dye goes on and spreads
      const touch = Math.abs(l.x) <= 0.5 && Math.abs(l.y) <= 0.5 && l.z > -0.015 && l.z < 0.10;
      paintStep(b, touch, (l.x + 0.5) * BW, (l.y + 0.5) * BH, dt, t);
      if (touch){ b.buzz -= dt; if (b.buzz <= 0){ b.buzz = 0.07; buzz(b, 0.10 + 0.10 * b.k, 60); } }
    });

    // ---- flat screens: the view centre (mouse-look), the mouse, or a finger is the brush
    const fb = bk.flat;
    let hit = null;
    const flat = !xr && !SPECT && bk.near && cv.ready;
    if (flat && (ptr.touch !== null || !bk.touchUi || ptr.down)){
      const locked = document.pointerLockElement === renderer.domElement, r = renderer.domElement.getBoundingClientRect();
      hit = locked && ptr.touch === null ? batikPick(r.left + r.width / 2, r.top + r.height / 2) : batikPick(ptr.x, ptr.y);
    }
    if (ptr.press){
      ptr.press = false; ptr.mode = hit ? hit.kind : '';
      if (hit && hit.kind === 'bowl' && fb.dye !== hit.bowl.dye){ setDye(fb, hit.bowl.dye); plop(); }
    }
    const painting = !!hit && hit.kind === 'cloth' && ptr.down && ptr.mode === 'cloth';
    paintStep(fb, painting, painting ? hit.uv.x * BW : 0, painting ? hit.uv.y * BH : 0, dt, t);
    fb.root.visible = !!hit;
    if (hit){   // the brush comes in from the lower right of the view; its tip hovers over the spot, and touches it while painting
      camera.getWorldQuaternion(_bq);
      const toEye = _eye.clone().sub(hit.point).normalize();
      const dir = toEye.clone().multiplyScalar(0.55).addScaledVector(V(1, 0, 0).applyQuaternion(_bq), 0.5).addScaledVector(V(0, 1, 0).applyQuaternion(_bq), -0.45).normalize();
      fb.root.quaternion.setFromUnitVectors(V(0, 0, -1), dir.clone().negate());
      fb.root.position.copy(hit.point).addScaledVector(toEye, painting ? 0.004 : 0.04).addScaledVector(dir, 0.195 * 1.6);
    }
    // how to paint, shown for a few seconds each time the guest walks up, then out of the way
    bk.hintT = flat ? (bk.hintT || 0) + dt : 0;
    if (bk.hint) bk.hint.style.opacity = flat && bk.hintT < 8 && !ptr.down ? '1' : '0';

    // ---- pass the new strokes on to spectators, about 15 times a second
    bk.outTimer += dt;
    if (bk.out.length && bk.outTimer > 0.066){
      bk.outTimer = 0;
      if (GWMX.onBatik) GWMX.onBatik({ type: 'batik', s: bk.out });
      bk.out = [];
    }
    cv.tick(t);
  }

  // ---------------------------------------------------------------- install
  let addBoxCol = () => {}, addCircleCol = () => {};
  GWMX.install = function(o){
    scene = o.scene; camera = o.camera; renderer = o.renderer; gripsRef = o.kerisGrips || [];
    SPECT = !!o.spectator;
    if (o.addBoxCollider) addBoxCol = (x, z, hw, hd) => o.addBoxCollider(x, -z, hw, hd);
    if (o.addCircleCollider) addCircleCol = (x, z, r) => o.addCircleCollider(x, -z, r);
    root = new T.Group(); root.scale.set(1, 1, -1); scene.add(root);   // Unity frame -> three.js (z mirrored)

    // the visitor's own hands follow the controllers (no props)
    gripsRef.forEach(gp => {
      while (gp.children.length) gp.remove(gp.children[0]);
      gp.add(buildHand(false, true));
      gp.addEventListener('connected', e => {
        const hand = e.data && e.data.handedness;
        gp.userData.hand = hand;
        while (gp.children.length) gp.remove(gp.children[0]);
        gp.add(buildHand(hand === 'left', true));
        // the batik brush stays with the controller: red in the right hand, blue in the left, as in the Quest app
        const b = gp.userData.batikBrush;
        if (b){ gp.add(b.holder); b.home = hand === 'left' ? B_BIRU : B_MERAH; setDye(b, b.home); }
      });
    });

    buildKuih(V(8, 0.40, 2));
    buildCongkak(V(15.3, 0, -2.8));
    buildBatu(V(15.0, 0, -10.2));
    buildGamelan(V(6, 0.40, 7));
    buildWauMaker(V(13.9, 0, 1.9), V(16.4, 0, 2.2), Math.PI / 2);
    buildBatik(V(13.7, 0, 5.7), Math.PI / 2);   // beside him: guests colour a cloth already drawn in wax
    people.forEach(p => addCircleCol(p.root.position.x, p.root.position.z + 0.15, 0.45 * p.s + 0.12));
    buildTree(V(15.6, 0, -6.5));
    buildGate();
    // the modelled gamelan replaces the old flat xylophone-and-figure group
    (o.stations || []).forEach(st => { if (st.def && st.def.key === 'alatmuzik' && st.performer) st.performer.visible = false; });
  };

  GWMX._mir = mir;
  GWMX._batik = bk;   // for checking the corner from the browser console or a headless test
  GWMX._view = () => ({ camera, renderer, scene });
  GWMX.update = function(dt, t){
    if (!root) return;
    try {
      root.updateMatrixWorld(true);   // IK reads world matrices of the people it poses
      updateCongkak(t); kids.forEach(k => updateKid(k, t)); updateGamelan(t, dt); updateWau(t);
      people.forEach(p => { const k = 1 + Math.sin(t * 1.6 + p.root.position.x) * 0.012; p.torso.scale.set(1, k, 1); });
      pollInputs();
      gripsRef.forEach(gp => { const h = gp.children[0] && gp.children[0].userData.hand; if (h){ const st = inputState[h.left ? 'left' : 'right']; h.set(st.t, st.g, st.th); } });
      if (mir.propR){
        const hr = mir.propR.children[0] && mir.propR.children[0].userData.hand, hl = mir.propL.children[0] && mir.propL.children[0].userData.hand;
        if (hr) hr.set(inputState.right.t, inputState.right.g, inputState.right.th);
        if (hl) hl.set(inputState.left.t, inputState.left.g, inputState.left.th);
      }
      handModels.forEach(h => h.update(dt));
      updaters.forEach(f => f(dt, t));
      updateMirror(dt, t);
      updateBatik(dt, t);
    } catch (e){ console.error('GWMX frame error (recovered):', e); }
  };
})();
