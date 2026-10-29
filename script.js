/* ========================================
   NAVBAR — Scroll & Toggle
   ======================================== */
const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks = document.querySelector('.nav-links');
const allNavLinks = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
    document.getElementById('backToTop').classList.toggle('visible', window.scrollY > 600);
    updateActiveNav();
});

navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('open');
    navLinks.classList.toggle('open');
});

allNavLinks.forEach(link => {
    link.addEventListener('click', () => {
        navToggle.classList.remove('open');
        navLinks.classList.remove('open');
    });
});

function updateActiveNav() {
    const sections = document.querySelectorAll('.section, .hero');
    let current = '';
    sections.forEach(sec => {
        if (window.scrollY >= sec.offsetTop - 120) current = sec.getAttribute('id');
    });
    allNavLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + current));
}

/* ========================================
   BACK TO TOP & SCROLL INDICATOR
   ======================================== */
document.getElementById('backToTop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
const scrollIndicator = document.getElementById('scrollIndicator');
window.addEventListener('scroll', () => { if (scrollIndicator) scrollIndicator.style.opacity = window.scrollY > 200 ? '0' : '1'; }, { passive: true });

/* ========================================
   SCROLL ANIMATIONS
   ======================================== */
const animObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('animated'); animObserver.unobserve(e.target); } });
}, { threshold: 0.15 });
document.querySelectorAll('[data-animate]').forEach(el => animObserver.observe(el));

/* ========================================
   HERO PARTICLES
   ======================================== */
(function createParticles() {
    const c = document.getElementById('heroParticles'); if (!c) return;
    for (let i = 0; i < 40; i++) {
        const p = document.createElement('span'), s = Math.random() * 4 + 2;
        Object.assign(p.style, { position:'absolute', width:s+'px', height:s+'px', borderRadius:'50%',
            background:`rgba(${Math.random()>.5?'102,126,234':'240,147,251'},${Math.random()*.4+.1})`,
            left:Math.random()*100+'%', top:Math.random()*100+'%',
            animation:`fp ${Math.random()*6+4}s ease-in-out infinite alternate`, animationDelay:Math.random()*4+'s' });
        c.appendChild(p);
    }
    const st = document.createElement('style');
    st.textContent = `@keyframes fp{0%{transform:translate(0,0)scale(1);opacity:.3}100%{transform:translate(${Math.random()*60-30}px,${Math.random()*60-30}px)scale(1.4);opacity:.7}}`;
    document.head.appendChild(st);
})();

/* Smooth scroll */
document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); const t = document.querySelector(a.getAttribute('href')); if (t) t.scrollIntoView({ behavior:'smooth' }); });
});

/* ========================================
   ETC ANIMATION — ZOOM-IN INTERACTIVE
   ======================================== */
const canvas = document.getElementById('etcCanvas');
const ctx = canvas.getContext('2d');
const miniCanvas = document.getElementById('minimapCanvas');
const miniCtx = miniCanvas.getContext('2d');

let currentStep = 0;
let animSpeed = 3;
let electrons = [];
let protons = [];
let waterDrops = [];
let atpParticles = [];
let autoplay = false;
let autoTimer = null;

// DOM
const btnPrev = document.getElementById('btnPrev');
const btnNext = document.getElementById('btnNext');
const speedRange = document.getElementById('speedRange');
const autoplayToggle = document.getElementById('autoplayToggle');
const zoomBadge = document.getElementById('zoomBadge');
const explainBadge = document.getElementById('explainBadge');
const explainTitle = document.getElementById('explainTitle');
const explainDesc = document.getElementById('explainDesc');
const explainDetails = document.getElementById('explainDetails');
const explainEquation = document.getElementById('explainEquation');
const explainPanel = document.getElementById('explainPanel');
const minimapZoomBox = document.getElementById('minimapZoomBox');

// Kompleks world positions (in full-scene coords 1100x520)
const WORLD = { w: 1100, h: 520 };
const complexes = [
    { id:'I',   x:80,  y:170, w:130, h:180, color:'#3b5bdb', label:'Kompleks I',    sub:'NADH Dehidrogenase' },
    { id:'II',  x:270, y:170, w:130, h:180, color:'#5c7cfa', label:'Kompleks II',   sub:'Suksinat Dehidrogenase' },
    { id:'III', x:500, y:170, w:130, h:180, color:'#845ef7', label:'Kompleks III',  sub:'Sitokrom bc₁' },
    { id:'IV',  x:720, y:170, w:130, h:180, color:'#e64980', label:'Kompleks IV',   sub:'Sitokrom c Oksidase' },
    { id:'ATP', x:920, y:170, w:130, h:180, color:'#20c997', label:'ATP Sintase',   sub:'Fosforilasi Oksidatif' }
];

// Zoom views per step: { x, y, w, h } in world coords — what area to show
const zoomViews = [
    { x:0,   y:0,   w:1100, h:520 },  // 0: overview
    { x:10,  y:60,  w:340,  h:400 },  // 1: Kompleks I zoom
    { x:200, y:60,  w:340,  h:400 },  // 2: Kompleks II zoom
    { x:350, y:60,  w:380,  h:400 },  // 3: CoQ → III
    { x:570, y:60,  w:380,  h:400 },  // 4: Cyt c → IV
    { x:770, y:60,  w:340,  h:400 },  // 5: ATP Sintase
    { x:0,   y:0,   w:1100, h:520 }   // 6: done overview
];

// Current smooth zoom (animated)
let cam = { x:0, y:0, w:1100, h:520 };

// Step data for explanation panel
const stepData = [
    { badge:'Gambaran Umum', title:'Selamat Datang!', equation:'',
      desc:'Klik <strong>"Langkah Berikutnya"</strong> untuk menjelajahi proses transfer elektron tahap demi tahap. Setiap langkah akan <em>zoom-in</em> ke bagian yang aktif sehingga kamu bisa melihat detail perpindahan elektron dan proton.' },
    { badge:'Langkah 1 / 6', title:'Kompleks I — NADH Dehidrogenase', equation:'NADH → NAD⁺ + H⁺ + 2e⁻',
      desc:'<strong>NADH</strong> menyerahkan <strong>2 elektron</strong> berenergi tinggi ke Kompleks I. Perhatikan elektron (kuning) bergerak masuk ke kompleks! Energi transfer ini digunakan untuk <strong>memompa 4 ion H⁺</strong> (hijau) dari matriks ke ruang intermembran.' },
    { badge:'Langkah 2 / 6', title:'Kompleks II — Suksinat Dehidrogenase', equation:'FADH₂ → FAD + 2H⁺ + 2e⁻',
      desc:'<strong>FADH₂</strong> menyerahkan <strong>2 elektron</strong> ke Kompleks II. Perhatikan bahwa di sini <strong>tidak ada H⁺ yang dipompa</strong> — itulah mengapa FADH₂ menghasilkan lebih sedikit ATP dibanding NADH. Elektron kemudian diteruskan ke Ubiquinon (CoQ).' },
    { badge:'Langkah 3 / 6', title:'Ubiquinon → Kompleks III', equation:'CoQH₂ → CoQ + 2H⁺ + 2e⁻',
      desc:'<strong>Ubiquinon (CoQ)</strong> membawa elektron melintasi membran menuju Kompleks III. Lihat elektron berpindah! Kompleks III menggunakan energi ini untuk <strong>memompa 4 H⁺</strong> ke ruang intermembran melalui mekanisme <em>Q-cycle</em>.' },
    { badge:'Langkah 4 / 6', title:'Sitokrom c → Kompleks IV', equation:'4e⁻ + 4H⁺ + O₂ → 2H₂O',
      desc:'<strong>Sitokrom c</strong> membawa elektron ke Kompleks IV — perhentian terakhir! Di sini elektron bergabung dengan <strong>O₂</strong> dan <strong>H⁺</strong> membentuk <strong>air (H₂O)</strong> 💧. Kompleks IV juga memompa <strong>2 H⁺</strong>. Inilah mengapa kita butuh oksigen!' },
    { badge:'Langkah 5 / 6', title:'ATP Sintase — Kemiosmosis!', equation:'ADP + Pi → ATP ⚡',
      desc:'Gradien H⁺ yang terbentuk di ruang intermembran mendorong proton mengalir kembali ke matriks melalui <strong>ATP Sintase</strong> — seperti air memutar turbin! Energi ini mengubah <strong>ADP + Pi</strong> menjadi <strong>ATP</strong>. Satu glukosa menghasilkan ~34 ATP di sini!' },
    { badge:'Selesai! ✅', title:'Proses Selesai!', equation:'Total: ~34 ATP per glukosa',
      desc:'Kamu telah melihat seluruh proses <strong>Rantai Transpor Elektron</strong>! Dari NADH & FADH₂ → melalui 4 kompleks → H⁺ dipompa → ATP Sintase menghasilkan ATP. Klik <strong>"← Sebelumnya"</strong> untuk mengulang atau scroll ke bawah untuk mengerjakan kuis!' }
];

/* ======== DRAWING HELPERS ======== */
function roundRect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x+r,y); c.lineTo(x+w-r,y); c.quadraticCurveTo(x+w,y,x+w,y+r);
    c.lineTo(x+w,y+h-r); c.quadraticCurveTo(x+w,y+h,x+w-r,y+h); c.lineTo(x+r,y+h);
    c.quadraticCurveTo(x,y+h,x,y+h-r); c.lineTo(x,y+r); c.quadraticCurveTo(x,y,x+r,y); c.closePath();
}

function lerp(a, b, t) { return a + (b - a) * t; }

function worldToScreen(wx, wy) {
    const sx = (wx - cam.x) / cam.w * canvas.width;
    const sy = (wy - cam.y) / cam.h * canvas.height;
    return [sx, sy];
}

function worldScale() { return canvas.width / cam.w; }

/* ======== DRAW SCENE ======== */
function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, '#0c1530'); g.addColorStop(0.25, '#0a1020'); g.addColorStop(0.75, '#0a1020'); g.addColorStop(1, '#0c1530');
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/* ======== LIPID BILAYER MEMBRANE (realistic) ======== */
function drawPhospholipid(wx, wy, flip) {
    // flip=false: tails down (upper leaflet), flip=true: tails up (lower leaflet)
    const [sx, sy] = worldToScreen(wx, wy);
    const sc = worldScale();
    const headR = Math.max(2.5, 5 * sc / 5);
    const tailLen = Math.max(6, 18 * sc / 5);
    const dir = flip ? -1 : 1;
    // two tails
    ctx.strokeStyle = 'rgba(180,200,255,0.18)'; ctx.lineWidth = Math.max(1, 1.5 * sc / 5);
    ctx.beginPath(); ctx.moveTo(sx - headR*0.4, sy); ctx.lineTo(sx - headR*0.4, sy + tailLen * dir); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx + headR*0.4, sy); ctx.lineTo(sx + headR*0.4, sy + tailLen * dir * 0.9); ctx.stroke();
    // head circle
    ctx.beginPath(); ctx.arc(sx, sy, headR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(100,130,240,0.35)'; ctx.fill();
    ctx.strokeStyle = 'rgba(100,130,240,0.5)'; ctx.lineWidth = Math.max(0.5, 1 * sc / 5); ctx.stroke();
}

function drawMembrane() {
    const sc = worldScale();
    // membrane fill
    const [, my1] = worldToScreen(0, 155); const [, my2] = worldToScreen(0, 365);
    ctx.fillStyle = 'rgba(80,100,180,0.03)'; ctx.fillRect(0, my1, canvas.width, my2 - my1);
    // draw phospholipids — upper leaflet (heads up, tails down)
    for (let wx = 5; wx < WORLD.w; wx += 14) {
        drawPhospholipid(wx, 160, false);  // upper leaflet top
        drawPhospholipid(wx, 195, true);   // upper leaflet bottom
    }
    // lower leaflet
    for (let wx = 5; wx < WORLD.w; wx += 14) {
        drawPhospholipid(wx, 330, false);  // lower leaflet top
        drawPhospholipid(wx, 365, true);   // lower leaflet bottom
    }
    // labels
    const fs = Math.max(9, 13 * sc / 5);
    ctx.font = `600 ${fs}px Segoe UI`; ctx.textAlign = 'center';
    const [lx] = worldToScreen(WORLD.w / 2, 0);
    const [, ly1] = worldToScreen(0, 75); ctx.fillStyle = 'rgba(102,126,234,0.55)'; ctx.fillText('RUANG INTERMEMBRAN  (H⁺ tinggi)', lx, ly1);
    const [, ly2] = worldToScreen(0, 460); ctx.fillStyle = 'rgba(56,239,125,0.45)'; ctx.fillText('MATRIKS MITOKONDRIA  (H⁺ rendah)', lx, ly2);
}

/* ======== DRAW EACH COMPLEX — BIOLOGICAL SHAPES ======== */

// Kompleks I: L-shape (large arm into matrix + horizontal membrane domain)
function drawComplexI(isActive) {
    const c = complexes[0], sc = worldScale();
    const [sx, sy] = worldToScreen(c.x, c.y);
    const sw = c.w * sc, sh = c.h * sc;
    ctx.save();
    if (isActive) { ctx.shadowColor = '#6688ff'; ctx.shadowBlur = 20 * sc / 4; }
    const g = ctx.createLinearGradient(sx, sy, sx, sy + sh);
    g.addColorStop(0, '#3b5bdbcc'); g.addColorStop(1, '#2b4bc055');
    ctx.fillStyle = g;
    // L-shape path: horizontal bar + vertical arm going down
    ctx.beginPath();
    ctx.moveTo(sx + sw*0.05, sy + sh*0.15);
    ctx.lineTo(sx + sw*0.95, sy + sh*0.15); // top of horizontal
    ctx.quadraticCurveTo(sx + sw, sy + sh*0.15, sx + sw, sy + sh*0.30);
    ctx.lineTo(sx + sw, sy + sh*0.55); // right side down
    ctx.quadraticCurveTo(sx + sw, sy + sh*0.60, sx + sw*0.65, sy + sh*0.60);
    ctx.lineTo(sx + sw*0.55, sy + sh*0.60); // step inward
    ctx.lineTo(sx + sw*0.55, sy + sh*0.95); // vertical arm down (into matrix)
    ctx.quadraticCurveTo(sx + sw*0.55, sy + sh, sx + sw*0.50, sy + sh);
    ctx.lineTo(sx + sw*0.15, sy + sh);
    ctx.quadraticCurveTo(sx + sw*0.10, sy + sh, sx + sw*0.10, sy + sh*0.95);
    ctx.lineTo(sx + sw*0.10, sy + sh*0.60); // back up
    ctx.lineTo(sx, sy + sh*0.55);
    ctx.quadraticCurveTo(sx, sy + sh*0.50, sx, sy + sh*0.30);
    ctx.lineTo(sx, sy + sh*0.20);
    ctx.quadraticCurveTo(sx, sy + sh*0.15, sx + sw*0.05, sy + sh*0.15);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = isActive ? '#fff' : '#5577dd77'; ctx.lineWidth = Math.max(1, 2*sc/4); ctx.stroke();
    // channel hole
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    roundRect(ctx, sx+sw*0.35, sy+sh*0.22, sw*0.12, sh*0.30, 4*sc/5); ctx.fill();
    ctx.restore();
    drawComplexLabel(c, sx, sy, sw, sh, sc, isActive);
}

// Kompleks II: small oval/round (smallest complex)
function drawComplexII(isActive) {
    const c = complexes[1], sc = worldScale();
    const [sx, sy] = worldToScreen(c.x, c.y);
    const sw = c.w * sc, sh = c.h * sc;
    ctx.save();
    if (isActive) { ctx.shadowColor = '#7799ff'; ctx.shadowBlur = 18*sc/4; }
    const g = ctx.createLinearGradient(sx, sy, sx, sy+sh);
    g.addColorStop(0,'#5c7cfacc'); g.addColorStop(1,'#4a6ae055');
    ctx.fillStyle = g;
    // oval body sitting in membrane, small bump into matrix
    ctx.beginPath();
    ctx.ellipse(sx+sw*0.5, sy+sh*0.38, sw*0.45, sh*0.32, 0, 0, Math.PI*2);
    ctx.fill();
    // small arm into matrix
    roundRect(ctx, sx+sw*0.25, sy+sh*0.55, sw*0.5, sh*0.35, 10*sc/5);
    ctx.fill();
    ctx.strokeStyle = isActive ? '#fff' : '#7799ff77'; ctx.lineWidth = Math.max(1,2*sc/4);
    ctx.beginPath(); ctx.ellipse(sx+sw*0.5, sy+sh*0.38, sw*0.45, sh*0.32, 0, 0, Math.PI*2); ctx.stroke();
    roundRect(ctx, sx+sw*0.25, sy+sh*0.55, sw*0.5, sh*0.35, 10*sc/5); ctx.stroke();
    ctx.restore();
    drawComplexLabel(c, sx, sy, sw, sh, sc, isActive);
}

// Kompleks III: twin-tower dimer shape
function drawComplexIII(isActive) {
    const c = complexes[2], sc = worldScale();
    const [sx, sy] = worldToScreen(c.x, c.y);
    const sw = c.w * sc, sh = c.h * sc;
    ctx.save();
    if (isActive) { ctx.shadowColor = '#aa77ff'; ctx.shadowBlur = 20*sc/4; }
    const g = ctx.createLinearGradient(sx, sy, sx, sy+sh);
    g.addColorStop(0,'#845ef7cc'); g.addColorStop(1,'#6a45d055');
    ctx.fillStyle = g;
    // left tower
    roundRect(ctx, sx+sw*0.05, sy+sh*0.05, sw*0.38, sh*0.90, 12*sc/5); ctx.fill();
    // right tower
    roundRect(ctx, sx+sw*0.57, sy+sh*0.05, sw*0.38, sh*0.90, 12*sc/5); ctx.fill();
    // bridge
    roundRect(ctx, sx+sw*0.15, sy+sh*0.35, sw*0.70, sh*0.18, 6*sc/5); ctx.fill();
    ctx.strokeStyle = isActive ? '#fff' : '#9977ee77'; ctx.lineWidth = Math.max(1,2*sc/4);
    roundRect(ctx, sx+sw*0.05, sy+sh*0.05, sw*0.38, sh*0.90, 12*sc/5); ctx.stroke();
    roundRect(ctx, sx+sw*0.57, sy+sh*0.05, sw*0.38, sh*0.90, 12*sc/5); ctx.stroke();
    // channel holes
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    roundRect(ctx, sx+sw*0.15, sy+sh*0.50, sw*0.12, sh*0.25, 4*sc/5); ctx.fill();
    roundRect(ctx, sx+sw*0.73, sy+sh*0.50, sw*0.12, sh*0.25, 4*sc/5); ctx.fill();
    ctx.restore();
    drawComplexLabel(c, sx, sy, sw, sh, sc, isActive);
}

// Kompleks IV: dome/mushroom cap shape
function drawComplexIV(isActive) {
    const c = complexes[3], sc = worldScale();
    const [sx, sy] = worldToScreen(c.x, c.y);
    const sw = c.w * sc, sh = c.h * sc;
    ctx.save();
    if (isActive) { ctx.shadowColor = '#ff5588'; ctx.shadowBlur = 20*sc/4; }
    const g = ctx.createLinearGradient(sx, sy, sx, sy+sh);
    g.addColorStop(0,'#e64980cc'); g.addColorStop(1,'#c0356855');
    ctx.fillStyle = g;
    // dome top (half-ellipse sticking into intermembrane)
    ctx.beginPath();
    ctx.ellipse(sx+sw*0.5, sy+sh*0.30, sw*0.48, sh*0.28, 0, Math.PI, 0);
    ctx.fill();
    // body in membrane
    roundRect(ctx, sx+sw*0.10, sy+sh*0.28, sw*0.80, sh*0.40, 10*sc/5); ctx.fill();
    // stem into matrix
    roundRect(ctx, sx+sw*0.25, sy+sh*0.65, sw*0.50, sh*0.30, 8*sc/5); ctx.fill();
    ctx.strokeStyle = isActive ? '#fff' : '#ee668877'; ctx.lineWidth = Math.max(1,2*sc/4);
    ctx.beginPath(); ctx.ellipse(sx+sw*0.5, sy+sh*0.30, sw*0.48, sh*0.28, 0, Math.PI, 0); ctx.stroke();
    roundRect(ctx, sx+sw*0.10, sy+sh*0.28, sw*0.80, sh*0.40, 10*sc/5); ctx.stroke();
    roundRect(ctx, sx+sw*0.25, sy+sh*0.65, sw*0.50, sh*0.30, 8*sc/5); ctx.stroke();
    // channel
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    roundRect(ctx, sx+sw*0.40, sy+sh*0.35, sw*0.20, sh*0.25, 4*sc/5); ctx.fill();
    ctx.restore();
    drawComplexLabel(c, sx, sy, sw, sh, sc, isActive);
}

// ATP Sintase: mushroom/lollipop — head (F1) + stalk + base (Fo) in membrane
function drawATPSynthase(isActive) {
    const c = complexes[4], sc = worldScale();
    const [sx, sy] = worldToScreen(c.x, c.y);
    const sw = c.w * sc, sh = c.h * sc;
    ctx.save();
    if (isActive) { ctx.shadowColor = '#44ddaa'; ctx.shadowBlur = 20*sc/4; }
    const g = ctx.createLinearGradient(sx, sy, sx+sw, sy+sh);
    g.addColorStop(0,'#20c997cc'); g.addColorStop(1,'#15a07855');
    ctx.fillStyle = g;
    // Fo base ring (in membrane)
    ctx.beginPath();
    ctx.ellipse(sx+sw*0.5, sy+sh*0.35, sw*0.30, sh*0.14, 0, 0, Math.PI*2);
    ctx.fill();
    // stalk (gamma subunit)
    roundRect(ctx, sx+sw*0.42, sy+sh*0.45, sw*0.16, sh*0.28, 4*sc/5); ctx.fill();
    // F1 head (large sphere in matrix)
    ctx.beginPath();
    ctx.ellipse(sx+sw*0.5, sy+sh*0.82, sw*0.35, sh*0.16, 0, 0, Math.PI*2);
    ctx.fill();
    // borders
    ctx.strokeStyle = isActive ? '#fff' : '#44cc9977'; ctx.lineWidth = Math.max(1,2*sc/4);
    ctx.beginPath(); ctx.ellipse(sx+sw*0.5, sy+sh*0.35, sw*0.30, sh*0.14, 0, 0, Math.PI*2); ctx.stroke();
    roundRect(ctx, sx+sw*0.42, sy+sh*0.45, sw*0.16, sh*0.28, 4*sc/5); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(sx+sw*0.5, sy+sh*0.82, sw*0.35, sh*0.16, 0, 0, Math.PI*2); ctx.stroke();
    // channel in Fo
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(sx+sw*0.5, sy+sh*0.35, sw*0.12, sh*0.06, 0, 0, Math.PI*2); ctx.fill();
    // rotation arrow if active
    if (isActive) {
        ctx.strokeStyle = '#fffa'; ctx.lineWidth = Math.max(1, 2*sc/4);
        ctx.beginPath(); ctx.arc(sx+sw*0.5, sy+sh*0.82, sw*0.22, -0.5, 2.0); ctx.stroke();
        // arrowhead
        const ax = sx+sw*0.5 + Math.cos(2.0)*sw*0.22, ay = sy+sh*0.82 + Math.sin(2.0)*sw*0.22;
        ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(ax-5*sc/4,ay-6*sc/4); ctx.lineTo(ax+4*sc/4,ay-3*sc/4); ctx.fill();
    }
    ctx.restore();
    drawComplexLabel(c, sx, sy, sw, sh, sc, isActive);
}

/* ======== SHARED: Label on complex ======== */
function drawComplexLabel(c, sx, sy, sw, sh, sc, isActive) {
    const fs1 = Math.max(7, 13 * sc / 4);
    const fs2 = Math.max(5, 9 * sc / 4);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `800 ${fs1}px Segoe UI`; ctx.fillStyle = '#fff';
    ctx.fillText(c.label, sx + sw/2, sy + sh*0.50);
    ctx.font = `500 ${fs2}px Segoe UI`; ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(c.sub, sx + sw/2, sy + sh*0.50 + fs1*0.9);
}

/* ======== PARTICLE (same as before) ======== */
function drawParticle(wx, wy, type) {
    const [sx, sy] = worldToScreen(wx, wy);
    const sc = worldScale();
    const r = Math.max(4, (type === 'atp' ? 10 : 8) * sc / 4);
    const colors = { electron:'#f5d020', proton:'#38ef7d', water:'#4fc3f7', atp:'#f093fb' };
    const glows  = { electron:'rgba(245,208,32,0.5)', proton:'rgba(56,239,125,0.5)', water:'rgba(79,195,247,0.5)', atp:'rgba(240,147,251,0.5)' };
    const labels = { electron:'e⁻', proton:'H⁺', water:'H₂O', atp:'ATP' };
    ctx.save();
    ctx.shadowColor = glows[type]; ctx.shadowBlur = 12 * sc / 4;
    ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fillStyle = colors[type]; ctx.fill();
    ctx.font = `bold ${Math.max(5, 8*sc/4)}px Segoe UI`;
    ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(labels[type], sx, sy);
    ctx.restore();
}

/* ======== CONNECTORS (CoQ & Cyt c paths) ======== */
function drawConnectors() {
    const sc = worldScale();
    const coqY = 260;
    // CoQ path: dashed with small circle
    ctx.strokeStyle = 'rgba(240,147,251,0.3)'; ctx.lineWidth = Math.max(1, 2.5*sc/4); ctx.setLineDash([5,4]);
    let [x1] = worldToScreen(210, coqY); let [x2] = worldToScreen(500, coqY); let [, sy] = worldToScreen(0, coqY);
    ctx.beginPath(); ctx.moveTo(x1, sy); ctx.lineTo(x2, sy); ctx.stroke();
    // Cyt c path
    [x1] = worldToScreen(630, coqY); [x2] = worldToScreen(720, coqY);
    ctx.beginPath(); ctx.moveTo(x1, sy); ctx.lineTo(x2, sy); ctx.stroke();
    ctx.setLineDash([]);
    // CoQ small circle
    const [cqx, cqy] = worldToScreen(370, coqY);
    const cr = Math.max(6, 12*sc/4);
    ctx.beginPath(); ctx.arc(cqx, cqy, cr, 0, Math.PI*2);
    ctx.fillStyle = '#f093fb55'; ctx.fill(); ctx.strokeStyle = '#f093fb88'; ctx.lineWidth = Math.max(1,1.5*sc/4); ctx.stroke();
    ctx.font = `bold ${Math.max(6,9*sc/4)}px Segoe UI`; ctx.fillStyle = '#f093fb'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Q', cqx, cqy);
    // Cyt c small circle
    const [ccx, ccy] = worldToScreen(670, coqY);
    ctx.beginPath(); ctx.arc(ccx, ccy, cr, 0, Math.PI*2);
    ctx.fillStyle = '#ff884455'; ctx.fill(); ctx.strokeStyle = '#ff884488'; ctx.lineWidth = Math.max(1,1.5*sc/4); ctx.stroke();
    ctx.fillStyle = '#ff8844'; ctx.fillText('c', ccx, ccy);
}

/* ======== MAIN DRAW ======== */
const complexDrawFns = [drawComplexI, drawComplexII, drawComplexIII, drawComplexIV, drawATPSynthase];

function drawScene() {
    drawBackground();
    drawMembrane();
    drawConnectors();
    // Complexes — each with its own biological shape
    const activeIdx = currentStep >= 1 && currentStep <= 5 ? currentStep - 1 : -1;
    complexDrawFns.forEach((fn, i) => fn(i === activeIdx));
    // Particles
    electrons.forEach(p => drawParticle(p.x, p.y, 'electron'));
    protons.forEach(p => drawParticle(p.x, p.y, 'proton'));
    waterDrops.forEach(p => drawParticle(p.x, p.y, 'water'));
    atpParticles.forEach(p => drawParticle(p.x, p.y, 'atp'));
}

/* ======== MINIMAP ======== */
function drawMinimap() {
    const mw = miniCanvas.width, mh = miniCanvas.height;
    const mCtx = miniCtx;
    mCtx.clearRect(0, 0, mw, mh);
    // bg
    mCtx.fillStyle = '#0b1125'; mCtx.fillRect(0, 0, mw, mh);
    // membrane
    const my1 = 165 / WORLD.h * mh, my2 = 355 / WORLD.h * mh;
    mCtx.fillStyle = 'rgba(102,126,234,0.06)'; mCtx.fillRect(0, my1, mw, my2 - my1);
    mCtx.strokeStyle = 'rgba(102,126,234,0.25)'; mCtx.lineWidth = 1; mCtx.setLineDash([4,3]);
    mCtx.beginPath(); mCtx.moveTo(0, my1); mCtx.lineTo(mw, my1); mCtx.stroke();
    mCtx.beginPath(); mCtx.moveTo(0, my2); mCtx.lineTo(mw, my2); mCtx.stroke();
    mCtx.setLineDash([]);
    // complexes
    complexes.forEach((c, i) => {
        const mx = c.x / WORLD.w * mw, my = c.y / WORLD.h * mh;
        const msw = c.w / WORLD.w * mw, msh = c.h / WORLD.h * mh;
        const active = currentStep >= 1 && currentStep <= 5 && i === currentStep - 1;
        mCtx.fillStyle = active ? c.color : c.color + '66';
        roundRect(mCtx, mx, my, msw, msh, 4); mCtx.fill();
        mCtx.font = `bold ${Math.max(8, 10)}px Segoe UI`; mCtx.fillStyle = '#fff'; mCtx.textAlign = 'center';
        mCtx.fillText(c.id, mx + msw / 2, my + msh / 2 + 4);
    });
    // update zoom box
    if (currentStep === 0 || currentStep === 6) {
        minimapZoomBox.classList.remove('visible');
    } else {
        const zv = zoomViews[currentStep];
        minimapZoomBox.style.left = (zv.x / WORLD.w * 100) + '%';
        minimapZoomBox.style.width = (zv.w / WORLD.w * 100) + '%';
        minimapZoomBox.classList.add('visible');
    }
}

/* ======== CAMERA ANIMATION ======== */
let camAnimFrame = null;
function animateCamera(target, onDone) {
    const start = { ...cam };
    const dur = 600;
    const t0 = performance.now();
    function tick(now) {
        const p = Math.min((now - t0) / dur, 1);
        const ease = 1 - Math.pow(1 - p, 3); // ease-out
        cam.x = lerp(start.x, target.x, ease);
        cam.y = lerp(start.y, target.y, ease);
        cam.w = lerp(start.w, target.w, ease);
        cam.h = lerp(start.h, target.h, ease);
        drawScene();
        if (p < 1) camAnimFrame = requestAnimationFrame(tick);
        else if (onDone) onDone();
    }
    cancelAnimationFrame(camAnimFrame);
    requestAnimationFrame(tick);
}

/* ======== PARTICLE SPAWNING ======== */
function clearParticles() { electrons = []; protons = []; waterDrops = []; atpParticles = []; }

function spawnMoving(arr, startX, startY, endX, endY, count, speed) {
    for (let i = 0; i < count; i++) {
        arr.push({ x: startX, y: startY, tx: endX + (Math.random()-0.5)*10, ty: endY + (Math.random()-0.5)*10,
            speed: speed || 0.012, delay: i * 18, done: false });
    }
}

let particleFrame = null;
function animateParticles(onDone) {
    const spd = animSpeed * 0.5;
    function tick() {
        let allDone = true;
        [electrons, protons, waterDrops, atpParticles].forEach(arr => {
            arr.forEach(p => {
                if (p.done) return;
                if (p.delay > 0) { p.delay--; allDone = false; return; }
                p.x = lerp(p.x, p.tx, p.speed * spd);
                p.y = lerp(p.y, p.ty, p.speed * spd);
                if (Math.abs(p.x - p.tx) < 1 && Math.abs(p.y - p.ty) < 1) { p.x = p.tx; p.y = p.ty; p.done = true; }
                else allDone = false;
            });
        });
        drawScene();
        if (!allDone) particleFrame = requestAnimationFrame(tick);
        else if (onDone) onDone();
    }
    cancelAnimationFrame(particleFrame);
    requestAnimationFrame(tick);
}

/* ======== TRIGGER STEP ======== */
function goToStep(step) {
    currentStep = step;
    clearParticles();
    updateUI();
    drawMinimap();

    const target = zoomViews[step];
    animateCamera(target, () => {
        // Spawn particles for this step
        switch (step) {
            case 1: // Kompleks I
                spawnMoving(electrons, 80, 400, 145, 260, 2, 0.015);
                spawnMoving(protons, 145, 310, 145, 100, 4, 0.01);
                break;
            case 2: // Kompleks II
                spawnMoving(electrons, 270, 400, 335, 260, 2, 0.015);
                break;
            case 3: // CoQ → III
                spawnMoving(electrons, 400, 260, 565, 260, 2, 0.012);
                spawnMoving(protons, 565, 310, 565, 100, 4, 0.01);
                break;
            case 4: // Cyt c → IV
                spawnMoving(electrons, 630, 260, 785, 260, 2, 0.012);
                spawnMoving(protons, 785, 310, 785, 100, 2, 0.01);
                spawnMoving(waterDrops, 785, 350, 820, 420, 2, 0.008);
                break;
            case 5: // ATP Sintase
                spawnMoving(protons, 985, 100, 985, 310, 6, 0.01);
                spawnMoving(atpParticles, 985, 350, 985, 430, 3, 0.008);
                break;
        }
        if (step >= 1 && step <= 5) animateParticles();
    });
}

/* ======== UI UPDATE ======== */
function updateUI() {
    const d = stepData[currentStep];
    explainBadge.textContent = d.badge;
    explainTitle.textContent = d.title;
    explainDesc.innerHTML = d.desc;
    explainEquation.textContent = d.equation;
    zoomBadge.textContent = currentStep === 0 || currentStep === 6 ? '🔍 Tampilan Keseluruhan' : `🔍 Zoom: ${d.title}`;

    btnPrev.disabled = currentStep === 0;
    btnNext.disabled = currentStep === 6;
    btnNext.textContent = currentStep >= 5 ? 'Selesai ✅' : 'Langkah Berikutnya →';

    explainPanel.classList.add('highlight');
    setTimeout(() => explainPanel.classList.remove('highlight'), 800);

    // step dots
    document.querySelectorAll('.step-dot').forEach((dot, i) => {
        dot.classList.remove('active', 'completed');
        if (i < currentStep) dot.classList.add('completed');
        if (i === currentStep) dot.classList.add('active');
    });
}

/* ======== CONTROLS ======== */
btnNext.addEventListener('click', () => { if (currentStep < 6) goToStep(currentStep + 1); });
btnPrev.addEventListener('click', () => { if (currentStep > 0) goToStep(currentStep - 1); });
speedRange.addEventListener('input', e => animSpeed = parseInt(e.target.value));

autoplayToggle.addEventListener('change', () => {
    autoplay = autoplayToggle.checked;
    clearInterval(autoTimer);
    if (autoplay && currentStep < 6) {
        const interval = Math.max(2000, 5000 - animSpeed * 600);
        autoTimer = setInterval(() => {
            if (currentStep < 6) goToStep(currentStep + 1);
            else { clearInterval(autoTimer); autoplayToggle.checked = false; autoplay = false; }
        }, interval);
    }
});

// Step dots click
document.querySelectorAll('.step-dot').forEach(dot => {
    dot.addEventListener('click', () => goToStep(parseInt(dot.dataset.step)));
});

// Keyboard
document.addEventListener('keydown', e => {
    const sec = document.getElementById('animation');
    const r = sec.getBoundingClientRect();
    if (r.top > window.innerHeight || r.bottom < 0) return;
    if (e.key === 'ArrowRight' && currentStep < 6) goToStep(currentStep + 1);
    if (e.key === 'ArrowLeft' && currentStep > 0) goToStep(currentStep - 1);
});

/* ======== INIT ======== */
drawScene();
drawMinimap();
updateUI();

/* ========================================
   QUIZ SYSTEM
   ======================================== */
const quizData = [
    { question:'Di mana rantai transpor elektron berlangsung?',
      options:['Sitoplasma','Membran dalam mitokondria','Membran luar mitokondria','Nukleus'], correct:1,
      explanation:'Rantai transpor elektron terjadi di <strong>membran dalam mitokondria</strong> (krista).' },
    { question:'Molekul manakah yang menyumbangkan elektron ke Kompleks I?',
      options:['FADH₂','ATP','NADH','Sitokrom c'], correct:2,
      explanation:'<strong>NADH</strong> menyerahkan 2 elektron ke Kompleks I dan dioksidasi menjadi NAD⁺.' },
    { question:'Berapa jumlah ion H⁺ yang dipompa oleh Kompleks II?',
      options:['4 H⁺','2 H⁺','0 H⁺','6 H⁺'], correct:2,
      explanation:'Kompleks II <strong>tidak memompa H⁺</strong>, sehingga FADH₂ menghasilkan lebih sedikit ATP.' },
    { question:'Apa fungsi utama Ubiquinon (Koenzim Q)?',
      options:['Menghasilkan ATP langsung','Menerima elektron dari O₂','Membawa elektron dari Kompleks I dan II ke Kompleks III','Memecah glukosa'], correct:2,
      explanation:'Ubiquinon adalah <strong>pembawa elektron bergerak</strong> dari Kompleks I & II ke Kompleks III.' },
    { question:'Apa akseptor elektron terakhir dalam rantai transpor elektron?',
      options:['NAD⁺','CO₂','H₂O','O₂'], correct:3,
      explanation:'<strong>Oksigen (O₂)</strong> adalah akseptor terakhir, bergabung dengan H⁺ membentuk H₂O.' },
    { question:'Proses apa yang terjadi saat H⁺ mengalir melalui ATP Sintase?',
      options:['Glikolisis','Fermentasi','Kemiosmosis','Fotosintesis'], correct:2,
      explanation:'<strong>Kemiosmosis</strong> menggunakan gradien proton untuk menghasilkan ATP.' },
    { question:'Berapa total ATP dari ETC per glukosa?',
      options:['2 ATP','4 ATP','18 ATP','~34 ATP'], correct:3,
      explanation:'ETC menghasilkan sekitar <strong>34 ATP</strong> per molekul glukosa.' },
    { question:'Apa produk sampingan di Kompleks IV?',
      options:['CO₂','Etanol','H₂O (air)','Asam laktat'], correct:2,
      explanation:'Elektron + O₂ + H⁺ → <strong>air (H₂O)</strong> di Kompleks IV.' },
    { question:'Mengapa NADH menghasilkan lebih banyak ATP dibanding FADH₂?',
      options:['NADH punya lebih banyak karbon','NADH masuk di Kompleks I (4 H⁺), FADH₂ di Kompleks II (0 H⁺)','FADH₂ tidak bisa masuk mitokondria','NADH mengandung oksigen'], correct:1,
      explanation:'NADH → <strong>Kompleks I (4 H⁺)</strong>, FADH₂ → <strong>Kompleks II (0 H⁺)</strong>.' },
    { question:'Racun sianida menghambat komponen mana?',
      options:['Kompleks I','Kompleks II','ATP Sintase','Kompleks IV'], correct:3,
      explanation:'Sianida menghambat <strong>Kompleks IV</strong>, menghentikan seluruh rantai.' }
];

let quizCurrent = 0, quizAnswers = Array(quizData.length).fill(-1), quizLocked = Array(quizData.length).fill(false), quizScore = 0, quizFinished = false;
const questionText = document.getElementById('questionText'), quizOptions = document.getElementById('quizOptions');
const quizFeedback = document.getElementById('quizFeedback'), feedbackText = document.getElementById('feedbackText');
const quizProgressBar = document.getElementById('quizProgressBar'), quizProgressText = document.getElementById('quizProgressText');
const btnPrevQ = document.getElementById('btnPrevQ'), btnNextQ = document.getElementById('btnNextQ');
const quizResult = document.getElementById('quizResult'), quizQuestion = document.getElementById('quizQuestion');

function initQuiz() {
    quizCurrent = 0; quizAnswers.fill(-1); quizLocked.fill(false); quizScore = 0; quizFinished = false;
    quizQuestion.style.display = 'block'; quizOptions.style.display = 'flex';
    document.querySelector('.quiz-nav').style.display = 'flex';
    quizProgressBar.parentElement.style.display = 'block';
    quizResult.classList.remove('show'); quizResult.style.display = 'none';
    quizFeedback.classList.remove('show','correct','wrong'); quizFeedback.style.display = 'none';
    renderQuestion();
}

function renderQuestion() {
    const d = quizData[quizCurrent], total = quizData.length, letters = ['A','B','C','D'];
    quizProgressBar.style.width = ((quizCurrent+1)/total*100)+'%';
    quizProgressText.textContent = `Soal ${quizCurrent+1} / ${total}`;
    questionText.innerHTML = `<span style="color:#667eea;font-weight:700">Q${quizCurrent+1}.</span> ${d.question}`;
    quizOptions.innerHTML = '';
    d.options.forEach((opt, i) => {
        const div = document.createElement('div'); div.className = 'quiz-option';
        div.innerHTML = `<span class="option-letter">${letters[i]}</span><span>${opt}</span>`;
        if (quizLocked[quizCurrent]) {
            if (i === d.correct) div.classList.add('correct');
            else if (i === quizAnswers[quizCurrent]) div.classList.add('wrong');
        } else if (quizAnswers[quizCurrent] === i) div.classList.add('selected');
        div.addEventListener('click', () => selectOption(i)); quizOptions.appendChild(div);
    });
    if (quizLocked[quizCurrent]) showFeedback(quizAnswers[quizCurrent] === d.correct);
    else { quizFeedback.classList.remove('show','correct','wrong'); quizFeedback.style.display = 'none'; }
    btnPrevQ.disabled = quizCurrent === 0;
    btnNextQ.textContent = quizCurrent === total-1 && quizLocked[quizCurrent] ? 'Lihat Hasil 🎯' : 'Selanjutnya →';
}

function selectOption(i) {
    if (quizLocked[quizCurrent]) return;
    quizAnswers[quizCurrent] = i; quizLocked[quizCurrent] = true;
    if (i === quizData[quizCurrent].correct) quizScore++;
    renderQuestion();
}

function showFeedback(ok) {
    quizFeedback.className = 'quiz-feedback show ' + (ok ? 'correct' : 'wrong');
    quizFeedback.style.display = 'block';
    feedbackText.innerHTML = (ok ? '✅ Benar! ' : '❌ Salah! ') + quizData[quizCurrent].explanation;
}

btnNextQ.addEventListener('click', () => {
    if (quizCurrent < quizData.length-1) { quizCurrent++; renderQuestion(); }
    else if (quizLocked[quizCurrent]) showResult();
});
btnPrevQ.addEventListener('click', () => { if (quizCurrent > 0) { quizCurrent--; renderQuestion(); } });

function showResult() {
    quizFinished = true; const total = quizData.length, pct = Math.round(quizScore/total*100);
    quizQuestion.style.display = 'none'; quizOptions.style.display = 'none'; quizFeedback.style.display = 'none';
    document.querySelector('.quiz-nav').style.display = 'none'; quizProgressBar.parentElement.style.display = 'none';
    quizResult.style.display = 'block'; quizResult.classList.add('show');
    const ri = document.getElementById('resultIcon'), rt = document.getElementById('resultTitle');
    const rp = document.getElementById('resultText'), sn = document.getElementById('scoreNumber');
    sn.textContent = `${quizScore}/${total}`;
    if (pct===100){ri.textContent='🏆';rt.textContent='Sempurna!';rp.textContent='Luar biasa! Semua benar!';}
    else if(pct>=80){ri.textContent='🌟';rt.textContent='Hebat!';rp.textContent='Pemahaman sangat baik!';}
    else if(pct>=60){ri.textContent='👍';rt.textContent='Bagus!';rp.textContent='Cukup baik, coba lagi untuk skor lebih tinggi.';}
    else{ri.textContent='📚';rt.textContent='Ayo Belajar Lagi!';rp.textContent='Baca ulang materi di atas dan coba lagi.';}
}

document.getElementById('btnRetry').addEventListener('click', initQuiz);
initQuiz();
