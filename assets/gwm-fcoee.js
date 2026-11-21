/* ------------------------------------------------------------------
   GWM FCoEE gallery -- the company showcase hall added to the Meta Quest (Unity) app on 2026-11-21 (FcoeeGallery.cs), for the website.
   A modern white-and-timber exhibition hall east of the kampung with its door facing the balai. The building is the Sketchfab
   model "art gallery" by chibi chan (CC BY 4.0, credit plaque inside the door; licence in assets/fcoee/fcoee_gallery_LICENSE.txt).
   The model files are the same OBJ parts the Quest app uses (tools/sync_fcoee_web.py copies them), hung with 31 numbered frames
   (assets/fcoee/slots.txt, floor plan in assets/fcoee/fcoee_floorplan.png): a frame shows wall/photo_NN when there is one and a
   placeholder card otherwise; manifest.json says which. The short film WAJAH plays on the screen in the niche.
   Authored in the Unity frame like the rest of the extras (GWMX.api.root is the z-mirrored group). Needs OBJLoader.
------------------------------------------------------------------- */
(function(){
  'use strict';
  const T = THREE, GWMX = window.GWMX;
  if (!GWMX) return;
  let A;
  const PLACE = { x: 31, y: 0.02, z: 0, yaw: Math.PI / 2, scale: 0.55 };   // the same as FcoeeGallery.cs: door faces the balai (west)
  const S = PLACE.scale, EYE_Y = 1.40, BASE = 'assets/fcoee/';
  const fc = { hall: null, screens: [], news: [] };
  const V = (x, y, z) => new T.Vector3(x, y, z);

  function loadTex(url, srgb){
    const t = new T.TextureLoader().load(url); if (srgb !== false) t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t;
  }
  const box = (parent, m, xa, xb, ya, yb, za, zb, name) => { const o = A.box(parent, m, (xa + xb) / 2, (ya + yb) / 2, (za + zb) / 2, xb - xa, yb - ya, zb - za); if (name) o.name = name; return o; };

  function clad(parent, xa, xb, za, zb, m){   // dark stone plinth, plaster body, timber fascia
    box(parent, m.stone, xa, xb, 0, 0.9, za, zb);
    box(parent, m.plaster, xa, xb, 0.9, 6.7, za, zb);
    box(parent, m.timber, xa - 0.05, xb + 0.05, 6.7, 7.3, za - 0.05, zb + 0.05);
  }

  function build(){
    const root = A.root;
    const hall = new T.Group(); hall.name = 'FCoEE_Gallery';
    hall.position.set(PLACE.x, PLACE.y, PLACE.z); hall.rotation.y = PLACE.yaw; hall.scale.setScalar(S);
    root.add(hall); fc.hall = hall;
    const m = { plaster: A.mat(0.94, 0.92, 0.87, 0.2), timber: A.mat(0.24, 0.14, 0.08, 0.35), stone: A.mat(0.34, 0.32, 0.30, 0.2) };

    // ---- the model: its x axis is mirrored when it enters the Unity frame (as Unity's own importer does)
    const model = new T.Group(); model.scale.x = -1; hall.add(model);
    const baked = loadTex(BASE + 'fcoee_gallery_baked.png');
    const parts = {
      Material001: new T.MeshBasicMaterial({ map: baked, side: T.DoubleSide }),
      glossy_white: new T.MeshStandardMaterial({ color: new T.Color(0.90, 0.89, 0.86).convertSRGBToLinear(), roughness: 0.65, metalness: 0, side: T.DoubleSide }),
      Base: new T.MeshStandardMaterial({ color: new T.Color(0.12, 0.11, 0.10).convertSRGBToLinear(), roughness: 0.7, metalness: 0.2, side: T.DoubleSide }),
      light: new T.MeshBasicMaterial({ color: new T.Color(1.0, 0.98, 0.92), side: T.DoubleSide })
    };
    const loader = new T.OBJLoader();
    Object.keys(parts).forEach(name => loader.load(BASE + 'fcoee_gallery_' + name + '.obj', obj => {
      obj.traverse(o => { if (o.isMesh){ o.material = parts[name]; o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; } });
      model.add(obj);
    }, undefined, e => console.warn('FCoEE part ' + name + ' failed', e)));

    // ---- the outside: plaster and timber over every outer wall, doorway and niche left open
    const ext = new T.Group(); hall.add(ext);
    const Tn = 0.30, O = 0.03, W = 21.9, ZS = -18.93, ZN = 28.42, ZE = 33.96, ND = 3.67, DOOR = 2.5, DH = 5.0;
    clad(ext, -W - O - Tn, -W - O, ZS - O - Tn, ZN + O + Tn, m);
    clad(ext, W + O, W + O + Tn, ZS - O - Tn, ZN + O + Tn, m);
    clad(ext, -W - O - Tn, -ND, ZN + O, ZN + O + Tn, m); clad(ext, ND, W + O + Tn, ZN + O, ZN + O + Tn, m);
    clad(ext, -W - O - Tn, -DOOR, ZS - O - Tn, ZS - O, m); clad(ext, DOOR, W + O + Tn, ZS - O - Tn, ZS - O, m);
    box(ext, m.plaster, -DOOR, DOOR, DH, 7.0, ZS - O - Tn, ZS - O); box(ext, m.timber, -DOOR, DOOR, 7.0, 7.3, ZS - O - Tn - 0.05, ZS - O + 0.05);
    [-DOOR - 0.12, DOOR].forEach(sx => box(ext, m.timber, sx, sx + 0.12, 0, DH + 0.1, ZS - O - Tn - 0.06, ZS - O + 0.06));
    clad(ext, -ND - O - Tn, -ND - O, ZN, ZE + O + Tn, m); clad(ext, ND + O, ND + O + Tn, ZN, ZE + O + Tn, m);
    clad(ext, -ND - O - Tn, ND + O + Tn, ZE + O, ZE + O + Tn, m);
    // the sign over the door (a plane faces the viewer on its +z; the door looks out along -z)
    const sign = new T.Mesh(new T.PlaneGeometry(8.6, 8.6 * 288 / 1600), new T.MeshBasicMaterial({ map: loadTex(BASE + 'fcoee_sign.png'), side: T.DoubleSide }));
    sign.position.set(0, 6.02, ZS - O - Tn - 0.09); ext.add(sign);
    box(ext, m.timber, -4.45, 4.45, 5.15, 6.9, ZS - O - Tn - 0.07, ZS - O - Tn - 0.03);

    // ---- walking: the shell's walls and partitions as boxes (model units -> the Unity frame)
    A.root.updateMatrixWorld(true);
    const turned = Math.abs(Math.sin(PLACE.yaw)) > 0.7;
    const col = (cx, cz, hw, hd) => { const w = A.rootLocal(hall.localToWorld(V(cx, 0, cz))); A.addBoxCol(w.x, w.z, (turned ? hd : hw) * S, (turned ? hw : hd) * S); };
    const zc = (ZS + ZN) / 2, zl = (ZN - ZS) / 2;
    col(-W, zc, 0.35, zl); col(W, zc, 0.35, zl);
    col((-W - ND) / 2, ZN, (W - ND) / 2, 0.35); col((W + ND) / 2, ZN, (W - ND) / 2, 0.35);
    col((-W - DOOR) / 2, ZS, (W - DOOR) / 2, 0.35); col((W + DOOR) / 2, ZS, (W - DOOR) / 2, 0.35);
    const nz = (ZN + ZE) / 2, nl = (ZE - ZN) / 2;
    col(-ND, nz, 0.35, nl); col(ND, nz, 0.35, nl); col(0, ZE, ND, 0.35);
    [-10, 0, 10].forEach(z => { col(-10, z, 4, 0.25); col(10, z, 4, 0.25); });
    col(20.375, -10, 1.6, 0.25); col(20.375, 10, 1.6, 0.25); col(-20.375, 0, 1.6, 0.25);   // the stubs, mirrored like the model
    GWMX.worldLimit = 52; GWMX.worldRadius = 54;   // the hall lies beyond the old 40 m square; index.html's clampToRoom reads these

    clearPlants();
    // the mountain and tree models of the scene arrive after this point (they load asynchronously): sweep again as they land
    [2500, 6000, 12000, 25000, 45000].forEach(ms => setTimeout(clearPlants, ms));
    buildFrames();
    buildCredit();
  }

  // ---- the world's loose plants were scattered before the hall existed: hide those inside it, cut the rest out of merged meshes
  function inFootprint(world, margin){
    const l = fc.hall.worldToLocal(world.clone()); margin = margin || 0;
    return Math.abs(l.x) < 24.5 + margin && l.z > -21.5 - margin && l.z < 36 + margin;   // the same limits as FcoeeGallery.cs
  }
  function clearPlants(){
    const hall = fc.hall; let hid = 0, cut = 0, inst = 0; const bb = new T.Box3(), c = new T.Vector3(), sz = new T.Vector3();
    A.scene.updateMatrixWorld(true);
    const footBox = new T.Box3(); [[-24.5, -21.5], [24.5, -21.5], [-24.5, 36], [24.5, 36]].forEach(p => footBox.expandByPoint(hall.localToWorld(V(p[0], 0, p[1])))); footBox.min.y = -5; footBox.max.y = 60;
    const im = new T.Matrix4(), ip = new T.Vector3(), zero = new T.Matrix4().makeScale(0, 0, 0), hide = [], trim = [];
    A.scene.traverse(o => {
      if (!o.visible || !(o.isMesh || o.isInstancedMesh)) return;
      for (let p = o.parent; p; p = p.parent) if (p === hall) return;
      if (o.isInstancedMesh){   // instanced plants: shrink the instances that stand in the footprint to nothing
        let changed = false;
        for (let i = 0; i < o.count; i++){ o.getMatrixAt(i, im); ip.setFromMatrixPosition(im).applyMatrix4(o.matrixWorld); if (inFootprint(ip)){ o.setMatrixAt(i, zero); changed = true; inst++; } }
        if (changed) o.instanceMatrix.needsUpdate = true;
        return;
      }
      bb.setFromObject(o); if (bb.isEmpty() || !bb.intersectsBox(footBox)) return;
      bb.getSize(sz); bb.getCenter(c);
      if (sz.x <= 14 && sz.z <= 14 && sz.y <= 40 && inFootprint(c)) hide.push(o);              // a loose plant standing in the hall
      else if (sz.y > 1.5 && o.geometry && o.geometry.attributes.position) trim.push(o);     // a merged mesh (trees of the mountain foot) reaching into it
    });
    hide.forEach(o => { if (!window.GWM_NOHIDE){ o.visible = false; hid++; } });
    trim.forEach(o => { if (cutGeometry(o)) cut++; });
    clearPlants.quiet = true;
    if (hid + cut + inst || !clearPlants.quiet) console.log('FCoEE gallery: hid ' + hid + ' loose objects and ' + inst + ' instances, cut the footprint out of ' + cut + ' meshes');
  }
  function cutGeometry(mesh){
    if (window.GWM_NOCUT) return false;   // for tracking down drawing problems from a test page
    const g = mesh.geometry, pos = g.attributes.position; if (!pos) return false;
    const idx = g.index ? g.index.array : null, n = idx ? idx.length : pos.count, keep = [], a = new T.Vector3(), b = new T.Vector3(), d = new T.Vector3(), cen = new T.Vector3();
    let any = false; mesh.updateMatrixWorld(true);
    for (let i = 0; i + 2 < n; i += 3){
      const i0 = idx ? idx[i] : i, i1 = idx ? idx[i + 1] : i + 1, i2 = idx ? idx[i + 2] : i + 2;
      a.fromBufferAttribute(pos, i0); b.fromBufferAttribute(pos, i1); d.fromBufferAttribute(pos, i2);
      a.applyMatrix4(mesh.matrixWorld); b.applyMatrix4(mesh.matrixWorld); d.applyMatrix4(mesh.matrixWorld);
      cen.copy(a).add(b).add(d).multiplyScalar(1 / 3);
      // only small triangles (leaves, rocks, trunks): a sky or ground triangle is metres wide and must stay
      if (inFootprint(cen) && cen.y > -0.3 && a.distanceToSquared(b) < 16 && b.distanceToSquared(d) < 16 && a.distanceToSquared(d) < 16){ any = true; continue; }
      keep.push(i0, i1, i2);
    }
    if (!any) return false;
    const ng = g.clone(); ng.setIndex(keep); mesh.geometry = ng;   // a copy: the shared geometry is untouched
    return true;
  }

  // ================================================================ picture frames
  function frameGroup(parent, pos, yawDeg, tex, w, h){
    const g = new T.Group(); g.position.copy(pos); g.rotation.y = yawDeg * Math.PI / 180; g.scale.setScalar(1 / S); parent.add(g);   // metres inside; local -z is the side you look from
    const card = A.mat(0.96, 0.95, 0.92, 0.1), timber = A.mat(0.24, 0.14, 0.08, 0.35), B = 0.045, M = 0.07;
    box(g, card, -(w + 2 * M) / 2, (w + 2 * M) / 2, -(h + 2 * M) / 2, (h + 2 * M) / 2, 0, 0.02);
    const pic = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex, side: T.DoubleSide })); pic.position.set(0, 0, -0.003); g.add(pic);
    const ow = w + 2 * M, oh = h + 2 * M;
    box(g, timber, -ow / 2 - B, ow / 2 + B, oh / 2, oh / 2 + B, -0.042, 0.018); box(g, timber, -ow / 2 - B, ow / 2 + B, -oh / 2 - B, -oh / 2, -0.042, 0.018);
    box(g, timber, -ow / 2 - B, -ow / 2, -oh / 2, oh / 2, -0.042, 0.018); box(g, timber, ow / 2, ow / 2 + B, -oh / 2, oh / 2, -0.042, 0.018);
    return { g, pic };
  }

  function buildFrames(){
    Promise.all([fetch(BASE + 'slots.txt').then(r => r.text()), fetch(BASE + 'manifest.json').then(r => r.json())]).then(([txt, man]) => {
      const wall = new T.Group(); fc.hall.add(wall); let n = 0;
      txt.split('\n').forEach(line => {
        const t = line.trim().split(' '); if (t.length < 4) return;
        n++; const slot = n, x = parseFloat(t[0]), z = parseFloat(t[1]), big = t[3] === '1', panel = slot >= 20;
        const yaw = t[2] === '+z' ? 180 : t[2] === '-z' ? 0 : t[2] === '+x' ? -90 : 90;
        const photoUrl = man.photos[slot] && BASE + man.photos[slot], film = man.films[slot];
        const url = photoUrl || (man.placeholders[slot] && BASE + man.placeholders[slot]); if (!url) return;
        const place = img => {
          const asp = img.width / img.height, maxW = big ? 2.8 : 1.9, maxH = panel ? 1.4 : 1.9;
          let w = Math.min(maxW, maxH * asp), h = w / asp;
          if (!photoUrl){ w = big ? 2.4 : 1.5; h = w / asp; }
          if (film){ w = big ? 2.7 : 1.9; h = w * 9 / 16; }
          const tex = new T.Texture(img); tex.encoding = T.sRGBEncoding; tex.anisotropy = 4; tex.needsUpdate = true;
          const f = frameGroup(wall, V(x, EYE_Y / S, z), yaw, tex, w, h);
          if (man.captions[slot]){
            const ci = new Image(); ci.onload = () => {
              const cw = Math.min(1.5, w + 0.2), ch = cw * ci.height / ci.width, ct = new T.Texture(ci); ct.encoding = T.sRGBEncoding; ct.needsUpdate = true;
              const cp = new T.Mesh(new T.PlaneGeometry(cw, ch), new T.MeshBasicMaterial({ map: ct, side: T.DoubleSide })); cp.position.set(0, -(h / 2 + 0.07 + 0.045 + 0.06 + ch / 2), -0.01); f.g.add(cp);
            }; ci.src = BASE + man.captions[slot];
          }
          if (film) fc.screens.push({ slot, g: f.g, pic: f.pic, poster: tex, file: BASE + film, video: null, vtex: null, playing: false });
          if (slot === 21 || slot === 23) fc.news.push(f.g);
        };
        const img = new Image(); img.onload = () => place(img); img.src = url;
      });
    }).catch(e => console.warn('FCoEE frames failed', e));
  }
  function buildCredit(){
    const img = new Image();
    img.onload = () => {
      const tex = new T.Texture(img); tex.encoding = T.sRGBEncoding; tex.needsUpdate = true;
      frameGroup(fc.hall, V(4.9, 1.25 / S, -18.93 + 0.03), 180, tex, 0.60, 0.60 * img.height / img.width);
    };
    img.src = BASE + 'fcoee_credit.png';
  }

  // ================================================================ the film on the niche screen
  const _p = new T.Vector3(), _c = new T.Vector3();
  function updateScreens(dt){
    if (!fc.screens.length) return;
    A.camera.getWorldPosition(_c);
    fc.screens.forEach(s => {
      s.g.getWorldPosition(_p); const d = _c.distanceTo(_p);
      if (d < 7){
        if (!s.video){
          const v = document.createElement('video'); v.src = s.file; v.loop = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.crossOrigin = 'anonymous'; v.preload = 'auto';
          s.video = v; s.vtex = new T.VideoTexture(v); s.vtex.encoding = T.sRGBEncoding; s.vtex.minFilter = T.LinearFilter;
        }
        if (!s.playing){
          s.playing = true;
          const pr = s.video.play(); if (pr && pr.catch) pr.catch(() => { s.playing = false; });
          s.pic.material.map = s.vtex; s.pic.material.needsUpdate = true;
        }
        s.video.volume = Math.max(0, Math.min(1, 1 - (d - 1.5) / 5.5));   // the sound comes from the screen: louder as you walk up
      } else if (d > 11 && s.playing){
        s.playing = false; s.video.pause();
        s.pic.material.map = s.poster; s.pic.material.needsUpdate = true;
      }
    });
  }


  // ================================================================ berita: the HEPA UniMAP post and its keratan akhbar
  // The post is the owner's Facebook embed. Under it hang the newspaper clippings in Malay and in Jawi (frames 21 and 23 of the hall,
  // the two that face the door): assets/fcoee/wall/photo_21.png and photo_23.png, drawn by Tools/make_news.py in the Quest project
  // once the text of the post is known. Until then the panel says they are coming.
  const FB_POST = 'https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2Fhepaunimap%2Fposts%2Fpfbid02jLNVAPKia1qofBnrXmS6BJz9J9APD8YBj7kDjj4UKSJQR5iHQ37St6gja82UKLfyl&show_text=true&width=500';
  const FB_SHARE = 'https://www.facebook.com/share/p/1F9pgVpkVR/';
  let newsEl = null; const haveClips = { my: false, jawi: false };
  function openNews(){
    if (document.pointerLockElement) document.exitPointerLock();
    if (!newsEl) buildNewsPanel();
    const f = newsEl.querySelector('iframe'); if (!f.getAttribute('src')) f.src = FB_POST;   // loaded the first time it is opened
    newsEl.style.display = 'flex';
  }
  function buildNewsPanel(){
    const el = document.createElement('div'); el.id = 'beritaPanel'; newsEl = el;
    el.style.cssText = 'position:fixed;inset:0;z-index:60;display:none;align-items:flex-start;justify-content:center;background:rgba(10,6,3,0.82);overflow:auto;padding:26px 12px;font-family:Georgia,serif;color:#f2e2b6';
    const clip = (id, label, ok) => ok
      ? '<figure style="margin:0 0 16px"><img src="assets/fcoee/wall/' + id + '.png" style="width:100%;max-width:640px;border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,.6)"><figcaption style="font-size:12px;opacity:.8;margin-top:4px">' + label + '</figcaption></figure>'
      : '<div style="margin:0 0 16px;padding:18px;border:1px dashed rgba(242,217,138,.5);border-radius:8px;font-size:13px;opacity:.8">' + label + '<br><i>akan ditambah / coming soon</i></div>';
    el.innerHTML = '<div style="width:min(1180px,100%);background:#1b120a;border:1px solid rgba(242,217,138,.5);border-radius:14px;padding:18px 20px;box-sizing:border-box">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px"><div><b style="font-size:20px;letter-spacing:1px">BERITA · NEWS</b><br><i style="font-size:12.5px;opacity:.85">Keratan akhbar dalam bahasa Melayu dan Jawi / newspaper clippings in Malay and Jawi</i></div>' +
      '<button id="beritaClose" style="cursor:pointer;background:none;color:#f2e2b6;border:1px solid rgba(242,217,138,.7);border-radius:10px;padding:6px 14px;font:inherit">TUTUP / CLOSE ✕</button></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:22px;align-items:flex-start">' +
      '<div style="flex:0 0 auto"><iframe style="border:none;overflow:hidden;max-width:100%" width="500" height="754" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>' +
      '<div style="font-size:12px;margin-top:6px"><a href="' + FB_SHARE + '" target="_blank" rel="noopener" style="color:#f2d98a">Buka di Facebook / open on Facebook ↗</a></div></div>' +
      '<div style="flex:1 1 320px;min-width:280px"><b style="font-size:15px">Keratan akhbar / Newspaper clipping</b><div style="height:10px"></div>' +
      clip('photo_21', 'Bahasa Melayu', haveClips.my) + clip('photo_23', 'Jawi', haveClips.jawi) + '</div></div></div>';
    document.body.appendChild(el);
    const close = () => { el.style.display = 'none'; };
    el.querySelector('#beritaClose').addEventListener('click', close);
    el.addEventListener('mousedown', e => { if (e.target === el) close(); });
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && el.style.display !== 'none') close(); });
  }
  function installNews(){
    fetch(BASE + 'manifest.json').then(r => r.json()).then(m => { haveClips.my = !!m.photos[21]; haveClips.jawi = !!m.photos[23]; }).catch(() => {});
    // a link on the start screen, a small button inside the world, and a click on the two clippings in the hall
    const start = document.getElementById('startScreen');
    if (start){
      const a = document.createElement('a'); a.id = 'beritaLink'; a.href = '#'; a.textContent = 'BERITA · KERATAN AKHBAR (MELAYU & JAWI) ↗';
      a.style.cssText = 'margin-top:10px;color:#f2d98a;font-size:12px;letter-spacing:1px;text-decoration:underline;text-underline-offset:3px;cursor:pointer;display:block;text-align:center';
      a.addEventListener('click', e => { e.preventDefault(); openNews(); });
      const r = document.getElementById('rndReportLink'); if (r && r.parentNode) r.parentNode.insertBefore(a, r); else start.appendChild(a);
    }
    if (!A.SPECT){
      const b = document.createElement('button'); b.id = 'beritaBtn'; b.innerHTML = '<b>BERITA</b> · News';
      b.style.cssText = 'position:fixed;left:14px;bottom:14px;z-index:11;display:none;padding:7px 14px;border-radius:12px;background:rgba(20,14,6,0.8);color:#f2e2b6;border:1px solid rgba(242,217,138,0.6);font-family:Georgia,serif;font-size:12px;cursor:pointer';
      b.addEventListener('click', openNews); document.body.appendChild(b); fc.btn = b;
      const el = A.renderer.domElement, ray = new T.Raycaster(), ndc = new T.Vector2();
      document.addEventListener('mousedown', e => {
        if (e.button !== 0 || e.target !== el || !fc.news.length || A.renderer.xr.isPresenting) return;
        const r = el.getBoundingClientRect();
        if (document.pointerLockElement === el) ndc.set(0, 0); else ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, A.camera); ray.far = 6;
        if (ray.intersectObjects(fc.news, true).length) openNews();
      });
    }
  }

  GWMX.installFcoee = function(){
    A = GWMX.api;
    if (!T.OBJLoader){ console.warn('FCoEE gallery needs OBJLoader.js'); return; }
    try { build(); } catch (e){ console.error('FCoEE gallery', e); }
    try { installNews(); } catch (e){ console.error('FCoEE news', e); }
  };
  GWMX.updateFcoee = function(dt){
    if (!A) return;
    if (fc.hall) updateScreens(dt);
    if (fc.btn){ const st = document.getElementById('startScreen'); fc.btn.style.display = (!st || st.style.display === 'none') && !A.renderer.xr.isPresenting ? 'block' : 'none'; }
  };
  GWMX._fcoee = fc;
})();
