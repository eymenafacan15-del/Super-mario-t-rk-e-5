const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let w, h, camX = 0, score = 0, lives = 3;
let isPaused = false; 
let isGameOver = false; 
let currentQuestion = null; 

// Karakter (Mario)
const p = { 
    x: 100, y: 0, vx: 0, vy: 0, 
    w: 40, h: 40, ground: false 
};

const platforms = []; 
const enemies = [];
const keys = { a: false, d: false, w: false };

// Harita Ayarları
const groundH = 80;
const finishLineX = 6000;

// Soru İşareti Soruları
const questions = [
    { q: "Hangi cümlenin sonuna soru işareti gelmelidir?", options: ["Eve geldim", "Neden sustun", "Hava güzel", "Koşarak git"], a: 1 },
    { q: "Soru eki olan '-mu' nasıl yazılır?", options: ["Bitişik", "Ayrı", "Hiç yazılmaz", "Altı çizili"], a: 1 },
    { q: "Kaç yaşındasın (...) Boşluğa ne gelir?", options: ["!", ".", "?", ","], a: 2 }
];

let optionButtons = [];

function init() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    p.y = h - groundH - p.h; // Başlangıçta zeminde başlat

    platforms.length = 0;
    enemies.length = 0;

    // ANA ZEMİN: Kesinlikle düşmeyi engeller
    platforms.push({ x: 0, y: h - groundH, w: 10000, h: groundH, type: 'ground' });

    // Engeller (Borular ve Havada Bloklar)
    for (let i = 1; i < 20; i++) {
        let px = i * 600;
        // Borular (Yeşil Engel)
        platforms.push({ x: px, y: h - groundH - 70, w: 70, h: 70, type: 'pipe' });
        // Havada Bloklar
        platforms.push({ x: px + 300, y: h - groundH - 180, w: 120, h: 30, type: 'block' });
        // Saldırgan Canavarlar
        enemies.push({ x: px + 500, y: h - groundH - 40, w: 40, h: 40, vx: -2, dead: false });
    }
}

// Klavye ve Dokunmatik
window.onkeydown = (e) => { const k = e.key.toLowerCase(); if(k in keys) keys[k] = true; };
window.onkeyup = (e) => { const k = e.key.toLowerCase(); if(k in keys) keys[k] = false; };

window.onmousedown = (e) => {
    if (isPaused && currentQuestion) {
        optionButtons.forEach((btn, i) => {
            if (e.clientX > btn.x && e.clientX < btn.x + btn.w && e.clientY > btn.y && e.clientY < btn.y + btn.h) {
                if (i === currentQuestion.a) score += 500; else lives--;
                isPaused = false;
                if (lives <= 0) location.reload();
            }
        });
    }
};

function update() {
    if (isPaused || isGameOver) return;

    // Hareket
    if (keys.a) p.vx = -6;
    else if (keys.d) p.vx = 6;
    else p.vx *= 0.8;

    if (keys.w && p.ground) { p.vy = -18; p.ground = false; }

    p.vy += 0.8; // Yerçekimi
    p.x += p.vx;
    p.y += p.vy;

    // ZEMİN VE ENGEL ÇARPIŞMASI (Hata payı sıfırlandı)
    p.ground = false;
    platforms.forEach(plat => {
        if (p.x < plat.x + plat.w && p.x + p.w > plat.x &&
            p.y + p.h > plat.y && p.y + p.h < plat.y + 30 && p.vy >= 0) {
            p.y = plat.y - p.h;
            p.vy = 0;
            p.ground = true;
        }
    });

    // Canavar Saldırısı
    enemies.forEach(e => {
        if (e.dead) return;
        let dist = p.x - e.x;
        if (Math.abs(dist) < 500) e.x += (dist > 0) ? 3 : -3; // Mario'ya koşar

        if (Math.abs(p.x - e.x) < 35 && Math.abs(p.y - e.y) < 35) {
            isPaused = true;
            e.dead = true;
            currentQuestion = questions[Math.floor(Math.random() * questions.length)];
            optionButtons = currentQuestion.options.map((opt, i) => ({
                x: w / 2 - 120, y: h / 2 - 60 + (i * 65), w: 240, h: 55, label: opt
            }));
        }
    });

    // Kamera ve Kazanma
    camX += (p.x - camX - w / 4) * 0.1;
    if (p.x > finishLineX) isGameOver = true;
}

function render() {
    ctx.fillStyle = '#5c94fc'; ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(-camX, 0);

    // Platformlar
    platforms.forEach(plat => {
        ctx.fillStyle = plat.type === 'ground' ? '#8B4513' : (plat.type === 'pipe' ? '#2ecc71' : '#e67e22');
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
    });

    // Bayrak
    ctx.fillStyle = 'red'; ctx.fillRect(finishLineX, h - groundH - 300, 60, 40);
    ctx.fillStyle = 'white'; ctx.fillRect(finishLineX, h - groundH - 300, 6, 300);

    // Canavarlar
    enemies.forEach(e => {
        if (!e.dead) {
            ctx.fillStyle = 'purple'; ctx.fillRect(e.x, e.y, e.w, e.h);
            ctx.fillStyle = 'yellow'; ctx.font = 'bold 20px Arial'; ctx.fillText('?', e.x + 12, e.y - 10);
        }
    });

    // Mario
    ctx.fillStyle = 'red'; ctx.fillRect(p.x, p.y, p.w, p.h);

    ctx.restore();

    // Arayüz
    ctx.fillStyle = 'white'; ctx.font = 'bold 22px Arial';
    ctx.fillText(`CAN: ${lives}  SKOR: ${score}`, 20, 40);

    if (isPaused && currentQuestion) {
        ctx.fillStyle = 'rgba(0,0,0,0.9)'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'yellow'; ctx.textAlign = 'center';
        ctx.fillText(currentQuestion.q, w / 2, h / 2 - 100);
        optionButtons.forEach(btn => {
            ctx.fillStyle = 'white'; ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
            ctx.fillStyle = 'black'; ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + 35);
        });
        ctx.textAlign = 'left';
    }

    if (isGameOver) {
        ctx.fillStyle = 'rgba(0,200,0,0.8)'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'white'; ctx.textAlign = 'center';
        ctx.fillText("BÖLÜMÜ GEÇTİN!", w / 2, h / 2);
    }
}

function loop() { update(); render(); requestAnimationFrame(loop); }
init(); loop();
window.onresize = init;
