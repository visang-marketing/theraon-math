/* 더 라온수학 — 3D 카드 장면 (Three.js r186, 정적 사이트용 ES 모듈)
   [data-s3d="ineq|chart|essay|calc|exams"] 고민 카드 5장, [data-s3d="hero"] 첫 화면 시험지.
   - 화면에 보일 때만 그린다. 처음 보일 때 한 번 장면을 재생하고, 그 뒤엔 카메라가 천천히 흔들린다(마우스 없어도 움직임).
   - WebGL이 안 되면 아무것도 하지 않는다 → 기존 2D 그림이 그대로 보인다.
   - 움직임 줄이기 설정이면 마지막 장면 한 장만 그린다. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = matchMedia('(max-width: 768px)').matches;
const hosts = document.querySelectorAll('[data-s3d]');
const glOk = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();
const CAPTURE = new URLSearchParams(location.search).has('capture3d');


/* ================= 공통 도구 ================= */
const HAND = '"Nanum Pen Script", cursive', SANS = '"Pretendard Variable", Pretendard, sans-serif';
const ease = t => 1 - Math.pow(1 - t, 3), easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), mix = (a, b, p) => a + (b - a) * p;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function stage(host, o) {
  const canvas = document.createElement('canvas'); canvas.className = 's3d'; canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = o.exposure || 1;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = o.env ?? 0.35; pm.dispose();
  const camera = new THREE.PerspectiveCamera(o.fov || 30, 1, 0.1, 80);
  // 빛: 위 왼쪽 주광(그림자) + 뒤쪽 테두리 빛 + 하늘/바닥 채움
  const key = new THREE.SpotLight(0xfff0d8, o.keyI ?? 260, 34, 0.6, 0.8, 1.6);
  key.position.copy(o.keyPos || V(-3.4, 9.6, 2.8)); key.target.position.copy(o.look || V(0, 0, 0)); scene.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048); key.shadow.radius = 5; key.shadow.bias = -0.0003; key.shadow.normalBias = 0.02; key.shadow.camera.near = 2; key.shadow.camera.far = 28;
  const rim = new THREE.DirectionalLight(0xd8ecff, o.rimI ?? 0.9); rim.position.set(5, 4, -7); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xe3efe8, o.ground || 0x0c1d16, o.hemiI ?? 0.3));
  // 책상: 어두운 카드는 진짜 바닥(빛 웅덩이), 밝은 카드는 그림자만
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), o.desk === 'shadow'
    ? new THREE.ShadowMaterial({ opacity: o.shadow ?? 0.22 })
    : new THREE.MeshStandardMaterial({ color: o.desk, roughness: 0.86 }));
  desk.rotation.x = -Math.PI / 2; desk.receiveShadow = true; scene.add(desk);

  const st = { scene, renderer, camera, key, frames: [], t: 0, started: false, done: o.dur || 5, cam: o.cam, look: o.look || V(0, 0, 0), drift: o.drift ?? 1 };
  const aim = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  host.addEventListener('pointermove', e => { const r = host.getBoundingClientRect(); aim.x = (e.clientX - r.left) / r.width - .5; aim.y = (e.clientY - r.top) / r.height - .5; });
  host.addEventListener('pointerleave', () => { aim.x = aim.y = 0; });
  function resize() { const r = host.getBoundingClientRect(); if (!r.width) return; renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; if (o.frame) o.frame(camera, st); camera.updateProjectionMatrix(); }
  new ResizeObserver(resize).observe(host); resize();
  let t0 = null, idle0 = performance.now();
  function frame(now) {
    if (t0 === null) t0 = now;
    st.t = reduce ? st.done + 1 : (now - t0) / 1000;
    const it = (now - idle0) / 1000, d = reduce ? 0 : st.drift;
    cur.x += (aim.x - cur.x) * 0.05; cur.y += (aim.y - cur.y) * 0.05;
    // 마우스가 없어도 천천히 도는 카메라(8~11초 주기)
    camera.position.set(st.cam.x + (Math.sin(it * 0.55) * 0.55 + cur.x * 1.1) * d, st.cam.y + (Math.sin(it * 0.42 + 1) * 0.18 - cur.y * 0.6) * d, st.cam.z + (Math.cos(it * 0.47) * 0.35 + cur.y * 0.8) * d);
    camera.lookAt(st.look);
    st.frames.forEach(f => f(st.t, it));
    renderer.render(scene, camera);
  }
  st.renderAt = sec => { t0 = performance.now() - sec * 1000; idle0 = performance.now() - sec * 1000; frame(performance.now()); };
  if (CAPTURE) { window.__s3d = window.__s3d || []; window.__s3d.push(st); host.classList.add('is-3d'); return st; }
  if (reduce) { requestAnimationFrame(() => { frame(performance.now()); host.classList.add('is-3d'); }); return st; }
  new IntersectionObserver(es => {
    const on = es[0].isIntersecting;
    if (on && !st.started) { st.started = true; t0 = null; host.classList.add('is-3d'); }
    renderer.setAnimationLoop(on ? frame : null);
  }, { threshold: 0.35 }).observe(host);
  return st;
}

// 종이 결(그레인) — 크기별로 한 번만 만든다
const grains = {};
function grain(w, h, warm = 0) {
  const k = w + 'x' + h + warm; if (grains[k]) return grains[k];
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); const img = g.createImageData(w, h);
  for (let i = 0; i < img.data.length; i += 4) { const n = 244 + Math.random() * 11; img.data[i] = n; img.data[i + 1] = n - 1 - warm; img.data[i + 2] = n - 6 - warm * 2; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  // 종이 섬유 결
  g.globalAlpha = 0.05; g.strokeStyle = '#8a7f6c';
  for (let i = 0; i < w * h / 4000; i++) { const x = Math.random() * w, y = Math.random() * h, a = Math.random() * Math.PI, l = 6 + Math.random() * 18; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  g.globalAlpha = 1; return (grains[k] = c);
}

// 시험지·답안지·연습장: 캔버스에 그린 종이 + 결(범프) + 들린 모서리
function makePaper(o) {
  const W = o.w || 3.2, H = o.h || 4.2, CW = o.cw || 1024, CH = Math.round(CW * H / W);
  const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH; const ctx = cv.getContext('2d');
  const base = grain(CW, CH, o.warm || 0);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const bump = new THREE.CanvasTexture(base);
  const geo = new THREE.PlaneGeometry(W, H, 40, 52), pos = geo.attributes.position, curl = o.curl ?? 0.24;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); pos.setZ(i, 0.05 * (x / (W / 2)) ** 2 + curl * Math.max(0, (x - W / 2 + 1) / 1) ** 2 * Math.max(0, (y - H / 2 + 1.3) / 1.3) ** 1.5); }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ map: tex, bumpMap: bump, bumpScale: 0.6, roughness: 0.9, side: THREE.DoubleSide, color: o.tint || 0xffffff });
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = mesh.receiveShadow = true;
  const group = new THREE.Group(); group.add(mesh); group.rotation.x = -Math.PI / 2;
  let last = '';
  return {
    group, mesh, ctx, CW, CH,
    redraw(stateKey, fn) { if (stateKey === last) return; last = stateKey; ctx.drawImage(base, 0, 0); fn(ctx, CW, CH); tex.needsUpdate = true; },
    world(u, v, lift = 0) { group.updateMatrixWorld(true); const w = mesh.localToWorld(V((u / CW - .5) * W, (.5 - v / CH) * H, 0.012)); w.y += lift; return w; },
  };
}
// 종이 아래 접지 그림자(물체가 바닥에 붙어 보이게)
function contact(scene, w, h, x, z, rot = 0, op = 0.35) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 10, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity: op, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.rotation.z = rot; m.position.set(x, 0.003, z); scene.add(m); return m;
}
// 빨간 펜: 회전체(선반 가공처럼 매끈한 단면) + 금속 클립·촉
function makePen() {
  const pen = new THREE.Group(), body = new THREE.Group();
  const red = new THREE.MeshPhysicalMaterial({ color: 0xc4232d, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 });
  const black = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.7 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xdedede, metalness: 1, roughness: 0.18 });
  const lathe = (pts, mat) => { const m = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 48), mat); m.castShadow = true; body.add(m); return m; };
  lathe([[0, 0], [0.012, 0.012], [0.02, 0.06], [0.034, 0.11]], metal);                       // 촉
  lathe([[0.034, 0.11], [0.05, 0.16], [0.058, 0.24], [0.06, 0.26]], metal);                   // 받침
  lathe([[0.06, 0.26], [0.074, 0.3], [0.072, 0.55], [0.076, 0.8], [0.078, 0.82]], black);     // 그립
  lathe([[0.078, 0.82], [0.082, 0.86], [0.082, 2.0], [0.084, 2.02]], red);                     // 몸통
  lathe([[0.084, 2.02], [0.087, 2.04], [0.087, 2.42], [0.07, 2.5], [0.03, 2.53], [0, 2.535]], red); // 뚜껑
  lathe([[0.085, 2.0], [0.089, 2.01], [0.089, 2.06], [0.085, 2.07]], metal);                  // 금속 띠
  const clip = new THREE.Mesh(new RoundedBoxGeometry(0.035, 0.55, 0.025, 3, 0.01), metal); clip.position.set(0, 2.2, 0.1); clip.castShadow = true; body.add(clip);
  body.rotation.set(0.62, 0, -0.38); pen.add(body); pen.scale.setScalar(1.45);
  pen.userData.body = body; return pen;
}
// 잉크 획: t0~t1 동안 pts(p)를 따라 그려진다. type 'text'면 글자가 왼쪽부터 드러난다
function inkProgress(s, t) { return easeIO(clamp((t - s.t0) / (s.t1 - s.t0))); }
function drawInk(g, strokes, t) {
  for (const s of strokes) {
    const p = inkProgress(s, t); if (p <= 0) continue;
    if (s.type === 'text') {
      g.save(); g.font = s.font; const w = g.measureText(s.text).width;
      g.beginPath(); g.rect(s.x - 10, s.y - s.size * 1.2, (w + 20) * p, s.size * 1.7); g.clip();
      g.fillStyle = s.color || '#D6303A'; g.fillText(s.text, s.x, s.y); g.restore(); continue;
    }
    g.strokeStyle = s.color || '#D6303A'; g.lineWidth = s.w || 11; g.lineCap = g.lineJoin = 'round';
    g.beginPath(); const n = 64; for (let i = 0; i <= n * p; i++) { const [u, v] = s.pts(i / n); i ? g.lineTo(u, v) : g.moveTo(u, v); } g.stroke();
  }
}
// 펜 끝 위치: 획을 따라 쓰고, 획 사이엔 살짝 들어 옮기고, 끝나면 옆으로 빠져 둥실
function penPose(paper, strokes, t, rest, park) {
  const tipOf = (s, p) => s.type === 'text' ? paper.world(s.x + p * s.width, s.y - s.size * 0.25 + Math.sin(p * 40) * s.size * 0.12) : paper.world(...s.pts(p));
  const first = strokes[0], lastS = strokes[strokes.length - 1];
  if (t < first.t0) { const p = easeIO(clamp((t - (first.t0 - 0.75)) / 0.75)); return { pos: rest.clone().lerp(tipOf(first, 0).add(V(0, 0.25, 0)), p), writing: false }; }
  for (let i = 0; i < strokes.length; i++) {
    const s = strokes[i];
    if (t <= s.t1) {
      if (t >= s.t0) return { pos: tipOf(s, easeIO(clamp((t - s.t0) / (s.t1 - s.t0)))), writing: true };
      const prev = strokes[i - 1], h = clamp((t - prev.t1) / (s.t0 - prev.t1)); const a = tipOf(prev, 1), b = tipOf(s, 0);
      const pos = a.lerp(b, easeIO(h)); pos.y += Math.sin(h * Math.PI) * 0.32; return { pos, writing: false };
    }
  }
  const po = easeIO(clamp((t - lastS.t1) / 0.8)); return { pos: tipOf(lastS, 1).lerp(park, po), writing: false, parked: po >= 1 };
}
function animatePen(pen, pose, t, it) {
  pen.position.copy(pose.pos);
  const b = pen.userData.body;
  b.rotation.z = -0.38 + (pose.writing ? Math.sin(t * 38) * 0.008 : 0);
  if (pose.parked) { pen.position.y += Math.sin(it * 1.4) * 0.05; b.rotation.z += Math.sin(it * 1.1) * 0.03; }
}
// 손글씨·인쇄 글자
const txt = (g, s, x, y, font, color) => { g.font = font; g.fillStyle = color; g.fillText(s, x, y); };
function sheetHead(g, CW, left, right, size = 38) {
  g.fillStyle = '#8a8a8a'; g.font = `600 ${size}px ${SANS}`; g.fillText(left, 90, 118); g.textAlign = 'right'; g.fillText(right, CW - 90, 118); g.textAlign = 'left';
  g.fillStyle = '#1b1b1b'; g.fillRect(90, 148, CW - 180, 6);
}
function ellipsePts(cx, cy, rx, ry, start = -2.4, turn = 2.15) { return p => { const a = start + p * Math.PI * turn, w = 1 + 0.05 * Math.sin(a * 3); return [cx + Math.cos(a) * rx * w, cy + Math.sin(a) * ry * w]; }; }
const line = (x0, y0, x1, y1) => p => [x0 + (x1 - x0) * p, y0 + (y1 - y0) * p];
// 시험지가 위에서 살짝 돌며 내려앉음
function settle(group, t, x, z, rz, from = 1.1, dur = 0.9, delay = 0) {
  const d = ease(clamp((t - delay) / dur));
  group.position.set(x, from * (1 - d) + 0.01, z - 0.7 * (1 - d)); group.rotation.z = rz + 0.32 * (1 - d); group.rotation.x = -Math.PI / 2 + 0.25 * (1 - d);
}
function underSheets(scene, W, H, items) {
  for (const [dx, dz, r, c] of items) { const m = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 })); m.rotation.x = -Math.PI / 2; m.rotation.z = r; m.position.set(dx, 0.004, dz); m.castShadow = m.receiveShadow = true; scene.add(m); }
}

/* ================= 1. 부등식: 음수로 나눌 때 부등호 방향 ================= */
function ineq(host) {
  const st = stage(host, { desk: 0x173528, cam: V(0.6, 8.6, 9.4), look: V(0.35, 0, -0.9), ground: 0x0c1d16 });
  const P = makePaper({}); st.scene.add(P.group); underSheets(st.scene, 3.2, 4.2, [[0.48, 0.92, 0.09, 0xeeeae2], [0.16, 1.0, -0.06, 0xe6e2da]]);
  contact(st.scene, 4.6, 5.6, 0.35, 0.95, -0.05, 0.4);
  const g = P.ctx; g.font = `128px ${HAND}`;
  const L2 = '∴ ', MISS = 'x > −3', mx = 114 + g.measureText(L2).width, mw = g.measureText(MISS).width;
  const S = [
    { t0: 1.45, t1: 2.45, pts: ellipsePts(mx + mw / 2, 650, mw / 2 + 44, 82), w: 11 },
    { t0: 2.75, t1: 3.0, pts: line(785, 270, 915, 400), w: 11 },
    { t0: 3.15, t1: 3.42, pts: line(915, 270, 785, 400), w: 11 },
    { t0: 3.6, t1: 4.3, type: 'text', text: '부호 방향!', x: 560, y: 850, size: 86, font: `86px ${HAND}`, width: 330 },
  ];
  const pen = makePen(); st.scene.add(pen); st.done = 5.2;
  st.frames.push((t, it) => {
    settle(P.group, t, 0.3, 0.9, -0.05);
    P.redraw(S.map(s => inkProgress(s, t).toFixed(2)).join(), (g, CW) => {
      sheetHead(g, CW, '2학기 중간고사 · 수학', '중2 ○반 ○번');
      txt(g, '4. 부등식 −2x + 1 > 7 을 푸시오.', 90, 262, `700 48px ${SANS}`, '#1f1f1f');
      txt(g, '−2x > 6', 100, 500, `128px ${HAND}`, '#2B3A8C'); txt(g, L2 + MISS, 114, 690, `128px ${HAND}`, '#2B3A8C');
      g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 2; for (let y = 930; y < 1290; y += 96) { g.beginPath(); g.moveTo(90, y); g.lineTo(CW - 90, y); g.stroke(); }
      drawInk(g, S, t);
    });
    animatePen(pen, penPose(P, S, t, V(2.0, 1.1, 1.9), V(1.25, 0.55, 1.35)), t, it);
  });
}

/* ================= 2. 진도는 쌓이는데 점수 선은 그대로 ================= */
function chart(host) {
  const st = stage(host, { desk: 'shadow', shadow: 0.2, cam: V(0.4, 8.2, 9.6), look: V(0.2, 0, -0.7), ground: 0xbfc5c2, hemiI: 0.6, env: 0.5, exposure: 1.05, keyI: 200 });
  const P = makePaper({ w: 3.3, h: 2.6, cw: 1024, curl: 0.12 }); st.scene.add(P.group); contact(st.scene, 4.4, 3.6, -0.55, 1.15, 0, 0.25);
  // 점수 선(파란 잉크)이 왼쪽부터 그려짐, 거의 평평
  const pts = [[120, 470], [330, 448], [540, 462], [750, 440], [930, 452]];
  const scoreLine = { t0: 1.2, t1: 2.6, color: '#2B3A8C', w: 10, pts: p => { const f = p * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), r = f - i; return [mix(pts[i][0], pts[i + 1][0], r), mix(pts[i][1], pts[i + 1][1], r)]; } };
  // 진도 = 책 더미(1학기 → 2학기, 계속 쌓임)
  const colors = [0x1f4d3a, 0xd9cfb8, 0x2e9e6a, 0xc4232d, 0x284b8f, 0xe8c45a];
  const books = colors.map((c, i) => {
    const b = new THREE.Group();
    const cover = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.2, 1.1, 3, 0.03), new THREE.MeshStandardMaterial({ color: c, roughness: 0.55 }));
    const pages = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.15, 1.04), new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: 0.95 })); pages.position.x = 0.03;
    cover.castShadow = pages.castShadow = cover.receiveShadow = true; b.add(cover, pages); st.scene.add(b); return b;
  });
  const tag = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 112; const g = c.getContext('2d'); g.fillStyle = '#1f4d3a'; g.beginPath(); g.roundRect(4, 4, 248, 104, 20); g.fill(); g.fillStyle = '#FFE27A'; g.font = `700 60px ${SANS}`; g.textAlign = 'center'; g.fillText('진도', 128, 76); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.35), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(c), transparent: true, roughness: 0.6 })); m.material.map.colorSpace = THREE.SRGBColorSpace; st.scene.add(m); return m; })();
  st.done = 4.8;
  st.frames.push((t, it) => {
    settle(P.group, t, -0.55, 1.15, 0.04, 0.9, 0.8);
    P.redraw(inkProgress(scoreLine, t).toFixed(2), (g, CW, CH) => {
      g.strokeStyle = 'rgba(31,77,58,.13)'; g.lineWidth = 2; for (let x = 60; x < CW; x += 64) { g.beginPath(); g.moveTo(x, 60); g.lineTo(x, CH - 120); g.stroke(); } for (let y = 60; y < CH - 110; y += 64) { g.beginPath(); g.moveTo(60, y); g.lineTo(CW - 60, y); g.stroke(); }
      txt(g, '점수', 70, 120, `700 44px ${SANS}`, '#2B3A8C');
      ['1학기 중간', '기말', '2학기'].forEach((s, i) => { g.textAlign = 'center'; txt(g, s, [130, 540, 920][i], CH - 60, `500 38px ${SANS}`, '#666'); }); g.textAlign = 'left';
      drawInk(g, [scoreLine], t);
      const p = inkProgress(scoreLine, t); pts.forEach(([x, y], i) => { if (p >= i / (pts.length - 1) - 0.001) { g.fillStyle = '#fff'; g.strokeStyle = '#2B3A8C'; g.lineWidth = 8; g.beginPath(); g.arc(x, y, 16, 0, 7); g.fill(); g.stroke(); } });
      if (p >= 1) txt(g, '그대로…', 780, 560, `80px ${HAND}`, '#D6303A');
    });
    books.forEach((b, i) => { const d = ease(clamp((t - 0.6 - i * 0.32) / 0.55)); b.position.set(1.75 + Math.sin(i * 2.1) * 0.06, 0.1 + i * 0.205 + 1.6 * (1 - d), 0.55 + Math.cos(i * 1.7) * 0.05); b.rotation.y = 0.35 + Math.sin(i * 1.3) * 0.12 + 0.5 * (1 - d); b.visible = d > 0; });
    const top = ease(clamp((t - 0.6 - colors.length * 0.32) / 0.5));
    tag.position.set(1.75, 0.1 + colors.length * 0.205 + 0.35 + 0.4 * (1 - top), 0.55); tag.lookAt(st.camera.position); tag.visible = top > 0; tag.position.y += Math.sin(it * 1.6) * 0.04 * top;
  });
}

/* ================= 3. 서술형: 답만 쓰고 풀이 없음 → −3 도장 ================= */
function essay(host) {
  const st = stage(host, { desk: 0x1c5640, cam: V(0.5, 8.6, 9.4), look: V(0.3, 0, -0.9), ground: 0x123a2a, keyI: 230 });
  const P = makePaper({}); st.scene.add(P.group); contact(st.scene, 4.6, 5.6, 0.35, 0.95, -0.05, 0.4);
  // 고무 도장: 나무 손잡이 + 검은 몸체 + 빨간 고무
  const stamp = new THREE.Group();
  const wood = new THREE.MeshPhysicalMaterial({ color: 0x8a5a36, roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  const knob = new THREE.Mesh(new THREE.LatheGeometry([[0, 1.3], [0.2, 1.28], [0.27, 1.15], [0.2, 0.98], [0.12, 0.85], [0.13, 0.55], [0.2, 0.5], [0, 0.5]].map(([r, y]) => new THREE.Vector2(r, y)), 40), wood);
  const base = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.28, 0.62, 4, 0.06), new THREE.MeshStandardMaterial({ color: 0x1d1d1d, roughness: 0.5 })); base.position.y = 0.36;
  const rubber = new THREE.Mesh(new RoundedBoxGeometry(0.88, 0.1, 0.55, 3, 0.03), new THREE.MeshStandardMaterial({ color: 0xb3262e, roughness: 0.7 })); rubber.position.y = 0.2;
  [knob, base, rubber].forEach(m => { m.castShadow = true; stamp.add(m); }); st.scene.add(stamp);
  const press = 2.2, S = [{ t0: 3.3, t1: 4.2, type: 'text', text: '풀이 과정이 없음', x: 100, y: 1170, size: 88, font: `88px ${HAND}`, width: 560 }];
  const pen = makePen(); st.scene.add(pen); st.done = 5;
  st.frames.push((t, it) => {
    settle(P.group, t, 0.3, 0.9, -0.04);
    const pressed = t >= press;
    P.redraw((pressed ? 1 : 0) + S.map(s => inkProgress(s, t).toFixed(2)).join(), (g, CW) => {
      g.fillStyle = '#1f1f1f'; g.beginPath(); g.roundRect(90, 70, 190, 64, 12); g.fill(); txt(g, '서술형 2', 112, 116, `700 38px ${SANS}`, '#fff');
      txt(g, '연립방정식 x + y = 5, 2x − y = 4의', 90, 230, `700 44px ${SANS}`, '#1f1f1f'); txt(g, '해를 구하시오. (풀이 과정을 쓰시오)', 90, 292, `700 44px ${SANS}`, '#1f1f1f');
      g.strokeStyle = 'rgba(0,0,0,.1)'; g.lineWidth = 2; for (let y = 520; y < 1060; y += 96) { g.beginPath(); g.moveTo(90, y); g.lineTo(CW - 90, y); g.stroke(); }
      txt(g, '답: x = 3, y = 2', 100, 470, `120px ${HAND}`, '#2B3A8C');
      if (pressed) { g.save(); g.translate(790, 600); g.rotate(-0.18); g.strokeStyle = 'rgba(200,35,45,.88)'; g.lineWidth = 12; g.beginPath(); g.ellipse(0, 0, 150, 120, 0, 0, 7); g.stroke(); g.fillStyle = 'rgba(200,35,45,.9)'; g.font = `800 150px ${SANS}`; g.textAlign = 'center'; g.fillText('−3', 0, 52); g.restore();
        g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * .5})`; g.fillRect(640 + Math.random() * 300, 470 + Math.random() * 260, 3 + Math.random() * 6, 2 + Math.random() * 4); } g.globalCompositeOperation = 'source-over'; }
      drawInk(g, S, t);
    });
    // 도장: 위에서 내려와 꾹 → 들림 → 옆으로 비킴
    const at = P.world(790, 600); const down = clamp((t - (press - 0.5)) / 0.5), up = clamp((t - press - 0.12) / 0.5), away = clamp((t - press - 0.7) / 0.7);
    stamp.position.set(at.x + 1.6 * ease(away), mix(2.2, 0, Math.pow(down, 2.2)) + 0.9 * ease(up) - 0.05 * Math.sin(clamp((t - press) / 0.12) * Math.PI) + Math.sin(it * 1.2) * 0.04 * away, at.z - 0.5 * ease(away));
    stamp.rotation.z = -0.18 + 0.2 * ease(away); stamp.rotation.x = 0.06 * (1 - down);
    stamp.scale.y = 1 - 0.06 * Math.sin(clamp((t - press) / 0.14) * Math.PI);
    animatePen(pen, penPose(P, S, t, V(2.4, 1.3, 2.4), V(1.3, 0.55, 1.45)), t, it);
  });
}

/* ================= 4. 계산: 지수법칙 실수 ================= */
function calc(host) {
  const st = stage(host, { desk: 'shadow', shadow: 0.22, cam: V(0.5, 8.6, 9.4), look: V(0.3, 0, -0.9), ground: 0xc8d9cf, hemiI: 0.6, env: 0.5, keyI: 210 });
  const P = makePaper({ curl: 0.18, warm: 3 }); st.scene.add(P.group); contact(st.scene, 4.6, 5.6, 0.35, 0.95, -0.04, 0.28);
  underSheets(st.scene, 3.2, 4.2, [[0.5, 0.95, 0.08, 0xf1ede4]]);
  const g = P.ctx; g.font = `120px ${HAND}`; const pre = '= −6a', mx = 100 + g.measureText(pre).width;
  const S = [
    { t0: 1.45, t1: 2.3, pts: ellipsePts(mx + 14, 470, 68, 78), w: 10 },
    { t0: 2.6, t1: 3.5, type: 'text', text: '지수끼리 더하기 → a⁵', x: 300, y: 690, size: 80, font: `80px ${HAND}`, width: 560 },
  ];
  const pen = makePen(); st.scene.add(pen); st.done = 4.6;
  st.frames.push((t, it) => {
    settle(P.group, t, 0.3, 0.9, -0.04);
    P.redraw(S.map(s => inkProgress(s, t).toFixed(2)).join(), (g, CW) => {
      g.strokeStyle = 'rgba(46,158,106,.22)'; g.lineWidth = 2; for (let y = 180; y < 1300; y += 84) { g.beginPath(); g.moveTo(60, y); g.lineTo(CW - 60, y); g.stroke(); }
      g.strokeStyle = 'rgba(229,72,77,.35)'; g.beginPath(); g.moveTo(80, 60); g.lineTo(80, 1300); g.stroke();
      txt(g, '연습', 110, 130, `700 42px ${SANS}`, '#1f4d3a');
      txt(g, '(−3a²) × 2a³', 100, 330, `120px ${HAND}`, '#2B3A8C');
      txt(g, pre, 100, 520, `120px ${HAND}`, '#2B3A8C'); txt(g, '6', mx, 470, `80px ${HAND}`, '#2B3A8C');
      drawInk(g, S, t);
    });
    animatePen(pen, penPose(P, S, t, V(2.1, 1.1, 2.0), V(1.3, 0.55, 1.4)), t, it);
  });
}

/* ================= 5. 첫 시험: 중학교 시험지 묶음이 날아와 부채꼴로 ================= */
function exams(host) {
  const st = stage(host, { desk: 0x173528, cam: V(0.4, 8.4, 9.2), look: V(0.2, 0, -0.8), ground: 0x0c1d16 });
  const papers = [0, 1, 2].map(i => {
    const P = makePaper({ w: 2.7, h: 3.5, curl: 0.08 + i * 0.04 });
    P.redraw('x', (g, CW) => {
      g.textAlign = 'center'; txt(g, '1학기 중간고사', CW / 2, 230, `800 104px ${SANS}`, '#1b1b1b');
      txt(g, '1학년 수학 · 선택형 18 · 서술형 4', CW / 2, 330, `500 50px ${SANS}`, '#666'); g.textAlign = 'left';
      g.fillStyle = '#1b1b1b'; g.fillRect(90, 380, CW - 180, 8);
      g.fillStyle = '#e6e6e6'; [0.9, 0.7, 0.85, 0.5, 0.8, 0.6].forEach((w, k) => { g.beginPath(); g.roundRect(90, 470 + k * 120, (CW - 180) * w, 34, 8); g.fill(); });
    });
    st.scene.add(P.group); return P;
  });
  contact(st.scene, 6.2, 5.4, 0.1, 1.1, 0, 0.42); st.done = 3.5;
  const fan = [[-0.95, 1.25, 0.24], [1.15, 1.2, -0.2], [0.1, 1.0, -0.03]];
  st.frames.push((t, it) => {
    papers.forEach((P, i) => {
      const d = ease(clamp((t - 0.25 - i * 0.35) / 0.8)), spread = easeIO(clamp((t - 1.6) / 0.9));
      const [fx, fz, fr] = fan[i];
      P.group.position.set(mix(0.3, fx, spread) + 2.5 * (1 - d), 0.01 + i * 0.012 + 1.6 * (1 - d) + (i === 2 ? Math.sin(it * 1.3) * 0.02 * spread : 0), mix(0.9, fz, spread) - 1.2 * (1 - d));
      P.group.rotation.z = mix(0.04 * (i - 1), fr, spread) - 0.8 * (1 - d); P.group.rotation.x = -Math.PI / 2 + 0.3 * (1 - d);
    });
  });
}

/* ================= 첫 화면: 중2 시험지 + 빨간 펜 + 포스트잇 ================= */
function hero(host) {
  const st = stage(host, {
    desk: 'shadow', shadow: 0.2, ground: 0xc8d9cf, hemiI: 0.65, env: 0.55, exposure: 1.05, keyI: 230, keyPos: V(-4.5, 10, 3.5),
    cam: V(-0.2, 9.5, 8.2), look: V(-0.2, 0, -0.3), fov: 26,
    frame: (cam, st) => { const wide = cam.aspect > 1.8; st.cam = wide ? V(1.6, 7.6, 7.4) : V(0.2, 9.8, 8.6); st.look = wide ? V(1.6, 0, -0.2) : V(0.2, 0, -0.4); cam.fov = wide ? 24 : 30; },
  });
  const P = makePaper({ w: 4.4, h: 3.9, cw: 1280, curl: 0.07 }); st.scene.add(P.group); contact(st.scene, 6.2, 5.4, -0.3, 0.2, 0, 0.3);
  const g = P.ctx; g.font = `130px ${HAND}`; const pre = '= 6x − 3y − 2x ', mx = 100 + g.measureText(pre).width, mw = g.measureText('− 6y').width;
  const S = [
    { t0: 1.6, t1: 2.5, pts: ellipsePts(mx + mw / 2, 520, mw / 2 + 40, 78), w: 11 },
    { t0: 2.75, t1: 3.7, type: 'text', text: '여기, 부호에서 막혔네', x: 520, y: 900, size: 90, font: `90px ${HAND}`, width: 650 },
    { t0: 3.95, t1: 4.15, pts: line(1080, 330, 1020, 440), w: 11 },
    { t0: 4.15, t1: 4.35, pts: line(1020, 440, 1140, 440), w: 11 },
    { t0: 4.35, t1: 4.55, pts: line(1140, 440, 1080, 330), w: 11 },
  ];
  const pen = makePen(); st.scene.add(pen);
  // 포스트잇
  const N = makePaper({ w: 1.5, h: 1.5, cw: 512, curl: 0.02, tint: 0xffe27a });
  N.redraw('n', (g) => { g.fillStyle = 'rgba(255,226,122,.92)'; g.fillRect(0, 0, 512, 512); txt(g, '"엄마, 이거', 40, 210, `104px ${HAND}`, '#4A3B00'); txt(g, '다 배운 건데…"', 40, 350, `104px ${HAND}`, '#4A3B00'); });
  st.scene.add(N.group); st.done = 5.4;
  st.frames.push((t, it) => {
    settle(P.group, t, -0.3, 0.2, -0.045, 1.0, 0.9);
    const nd = ease(clamp((t - 0.6) / 0.7)); N.group.position.set(2.3, 0.14 + 0.8 * (1 - nd) + Math.sin(it * 0.9) * 0.01, 1.75); N.group.rotation.z = 0.14 - 0.5 * (1 - nd); N.group.rotation.x = -Math.PI / 2 + 0.2 * (1 - nd);
    P.redraw(S.map(s => inkProgress(s, t).toFixed(2)).join(), (g, CW) => {
      sheetHead(g, CW, '2학기 중간고사 · 수학', '중2 ○반 ○번', 40);
      txt(g, '5. 다음 식을 간단히 하시오.', 90, 250, `700 52px ${SANS}`, '#1f1f1f');
      txt(g, '3(2x − y) − 2(x − 3y)', 90, 370, `600 64px ${SANS}`, '#1f1f1f');
      txt(g, pre + '− 6y', 100, 560, `130px ${HAND}`, '#2B3A8C'); txt(g, '= 4x − 9y', 100, 730, `130px ${HAND}`, '#2B3A8C');
      drawInk(g, S, t);
    });
    animatePen(pen, penPose(P, S, t, V(3.4, 1.4, 2.0), V(2.35, 0.6, 1.25)), t, it);
  });
}

/* ================= 시작 (모든 도구가 정의된 뒤) ================= */
if (hosts.length && glOk) {
  await Promise.race([Promise.all([document.fonts.load('80px "Nanum Pen Script"'), document.fonts.load('700 40px "Pretendard Variable"')]), new Promise(r => setTimeout(r, 2500))]).catch(() => {});
  const BUILD = { ineq, chart, essay, calc, exams, hero };
  hosts.forEach(h => { const fn = BUILD[h.dataset.s3d]; if (fn) try { fn(h); } catch (e) { console.warn('3D 장면 실패', h.dataset.s3d, e); } });
}
