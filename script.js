const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let w, h, camX = 0, score = 0, lives = 3;
let isPaused = false; 
let isGameOver = false; 
let currentQuestion = null; 
const gravity = 0.8;
const friction = 0.88;

// --- GÖRSELLER ---
const img = { mario: new Image(), goomba: new Image(), pipe: new Image(), flag: new Image() };
img.mario.src = 'mario.png';
img.goomba.src = 'goomba.png';
img.pipe.src = 'pipe.png'; 
img.flag.src = 'flag.png'; 

const p = { x: 200, y: 100, vx: 0, vy: 0, w: 50, h: 50, ground: false, dir: 1 };
const platforms = []; 
const enemies = [];
const keys = { w: false, a: false, s: false, d: false };

const finishLineX = 8500; // Bayrak mesafesi

// --- SORU İŞARETİ ODAKLI SORULAR ---
const questions = [
    { q: "Hangi cümlenin sonuna '?' gelmelidir?", options: ["Bugün çok yorgunum", "Nereye gidiyorsun", "Kitabı okudum", "Hava çok güzel"], a: 1 },
    { q: "Soru eki olan '-mı/-mi' nasıl yazılır?", options: ["Bitşik yazılır", "Kelimeye eklenir", "Her zaman ayrı yazılır", "Yazılmaz"], a: 2 },
    { q: "Hangisi bir soru cümlesidir?", options: ["Eyvah, düştüm!", "Dışarı çıkalım mı?", "Okula gittim.", "Seni seviyorum."], a: 1 },
    { q: "Bilinmeyen tarihleri belirtmek için ne kullanılır?", options: ["Ünlem", "Nokta", "Soru İşareti (?)", "Virgül"], a: 2 }
];

const moveButtons = [
    { id: 'a', x: 20, y: 0, w: 85, h: 85, label: "SOL (A)" },
    { id: 'd', x: 125, y: 0, w: 85, h: 85, label: "SAĞ (D)" },
    { id: 'w', x: 0, y: 0, w: 110, h: 110, label: "ZIPLA (W)" }
];

let optionButtons = [];

function init() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    moveButtons[0].y = h - 110;
    moveButtons[1].y = h - 110;
    moveButtons[2].x = w - 140;
    moveButtons[2].y = h - 140;

    platforms.length = 0; enemies.length = 0;
    platforms.push({ x: 0, y: h - 100, w: 10000, h: 100, type: 'ground' });

    for(let i = 1; i < 20; i++) {
        let px = i * 600;
        // Engeller (Borular ve Bloklar)
        if(i % 3 === 0) platforms.push({ x: px, y: h - 250, w: 120, h: 40, type: 'block' });
        if(i % 5 === 0) platforms.push({ x: px + 200, y: h - 180, w: 80, h: 80, type: 'pipe' });

        // SALDIRGAN CANAVARLAR
        enemies.push({ 
            x: px + 400, y: h - 155, w: 55, h: 55, 
            vx: -2, hasQuestion: true, dead: false 
        });
    }
}

function handleInteraction(tx, ty, isDown) {
    if(isGameOver) return;
    if (isPaused && currentQuestion) {
        if (!isDown) return;
        optionButtons.forEach((btn, index) => {
            if (tx > btn.x && tx < btn.x + btn.w && ty > btn.y && ty < btn.y + btn.h) {
                if (index === currentQuestion.a) { score += 500; } else { lives--; }
                isPaused = false; currentQuestion = null;
                if(lives <= 0) location.reload();
            }
        });
    } else {
        moveButtons.forEach(btn => {
            if (tx > btn.x && tx < btn.x + btn.w && ty > btn.y && ty < btn.y + btn.h) keys[btn.id] = isDown;
        });
    }
}

window.addEventListener('mousedown', e => handleInteraction(e.clientX, e.clientY, true));
window.addEventListener('mouseup', () => { keys.a = keys.d = keys.w = false; });
window.addEventListener('touchstart', e => { 
    e.preventDefault(); Array.from(e.touches).forEach(t => handleInteraction(t.clientX, t.clientY, true)); 
}, { passive: false });
window.addEventListener('touchend', () => { keys.a = keys.d = keys.w = false; });

window.addEventListener('keydown', e => { if(!isGameOver) { let k = e.key.toLowerCase(); if(keys.hasOwnProperty(k)) keys[k] = true; }});
window.addEventListener('keyup', e => { let k = e.key.toLowerCase(); if(keys.hasOwnProperty(k)) keys[k] = false; });

function update() {
    if(isPaused || isGameOver) { render(); requestAnimationFrame(update); return; }

    if(keys.a) { p.vx -= 1.4; p.dir = -1; }
    if(keys.d) { p.vx += 1.4; p.dir = 1; }
    if(keys.w && p.ground) { p.vy = -23; p.ground = false; }

    p.vx *= friction; p.vy += gravity;
    p.x += p.vx; p.y += p.vy;
    camX += (p.x - camX - w/3) * 0.1;

    p.ground = false;
    platforms.forEach(plat => {
        if(p.x < plat.x + plat.w && p.x + p.w > plat.x && p.y + p.h > plat.y && p.y + p.h < plat.y + 30 && p.vy >= 0) {
            p.y = plat.y - p.h; p.vy = 0; p.ground = true;
        }
    });

    enemies.forEach(e => {
        if(e.dead) return;
        
        // --- CANAVAR ZEKA (SALDIRI) ---
        let dist = p.x - e.x;
        if(Math.abs(dist) < 600) { // Mario yakındaysa ona doğru koş
            e.vx = dist > 0 ? 4 : -4;
        }
        e.x += e.vx;

        // Çarpışma ve Soru Ekranı
        if(Math.abs(p.x - e.x) < 50 && Math.abs(p.y - e.y) < 50) {
            isPaused = true;
            currentQuestion = questions[Math.floor(Math.random() * questions.length)];
            optionButtons = currentQuestion.options.map((opt, i) => ({
                x: w/2 - 160, y: h/2 - 80 + (i * 70), w: 320, h: 60, label: opt
            }));
            e.dead = true; // Soru çözülünce canavar kaybolur
        }
    });

    if(p.x > finishLineX) isGameOver = true;
    if(p.y > h + 100) reset();

    render();
    requestAnimationFrame(update);
}

function render() {
    ctx.fillStyle = '#5c94fc'; ctx.fillRect(0, 0, w, h); // Arkaplan
    
    platforms.forEach(plat => {
        if(plat.type === 'pipe') ctx.fillStyle = '#2ecc71'; 
        else if(plat.type === 'block') ctx.fillStyle = '#e67e22';
        else ctx.fillStyle = '#8B4513';
        ctx.fillRect(plat.x - camX, plat.y, plat.w, plat.h);
    });

    // Bayrak
    ctx.fillStyle = 'white'; ctx.fillRect(finishLineX - camX, h - 500, 10, 400);
    ctx.fillStyle = 'red'; ctx.fillRect(finishLineX - camX, h - 500, 60, 40);

    // Canavarlar ve üzerindeki "?" işaretleri
    enemies.forEach(e => { 
        if(!e.dead) {
            ctx.drawImage(img.goomba, e.x - camX, e.y, e.w, e.h);
            ctx.fillStyle = "yellow"; ctx.font = "bold 30px Arial";
            ctx.fillText("?", e.x - camX + 15, e.y - 15);
        }
    });

    // Mario
    ctx.save();
    if(p.dir === -1) { ctx.translate(p.x - camX + p.w, p.y); ctx.scale(-1, 1); ctx.drawImage(img.mario, 0, 0, p.w, p.h); }
    else { ctx.drawImage(img.mario, p.x - camX, p.y, p.w, p.h); }
    ctx.restore();

    // Kontrol Tuşları
    ctx.globalAlpha = 0.5;
    moveButtons.forEach(btn => {
        ctx.fillStyle = "black"; ctx.beginPath(); ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 10); ctx.fill();
        ctx.fillStyle = "white"; ctx.font = "bold 18px Arial"; ctx.textAlign="center";
        ctx.fillText(btn.label, btn.x + btn.w/2, btn.y + btn.h/1.6);
    });

    // --- SORU EKRANI ---
    if (isPaused && currentQuestion) {
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = "rgba(0,0,0,0.95)"; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "yellow"; ctx.font = "bold 45px Arial"; ctx.textAlign = "center";
        ctx.fillText("??? SORU İŞARETİ PANİK ???", w/2, h/2 - 160);
        ctx.fillStyle = "white"; ctx.font = "bold 24px Arial";
        ctx.fillText(currentQuestion.q, w/2, h/2 - 100);
        optionButtons.forEach((btn, i) => {
            ctx.fillStyle = "#3498db"; ctx.beginPath(); ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 10); ctx.fill();
            ctx.fillStyle = "white"; ctx.font = "bold 20px Arial";
            ctx.fillText(btn.label, btn.x + btn.w/2, btn.y + 38);
        });
    }

    if(isGameOver) {
        ctx.fillStyle = "rgba(0,150,0,0.9)"; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "white"; ctx.font = "bold 40px Arial"; ctx.textAlign="center";
        ctx.fillText("BÖLÜMÜ GEÇTİN! HARİKASIN!", w/2, h/2);
        canvas.onclick = () => location.reload();
    }

    ctx.globalAlpha = 1.0; ctx.textAlign = "left";
    ctx.fillStyle = "yellow"; ctx.font = "bold 22px Arial";
    ctx.fillText(`CAN: ${lives} | SKOR: ${score}`, 20, 40);
}

function reset() { lives--; p.x = 200; p.y = 100; if(lives <= 0) location.reload(); }
init(); update();
window.onresize = init;
