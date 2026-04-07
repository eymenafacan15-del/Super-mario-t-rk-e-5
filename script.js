const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let w, h, camX = 0, score = 0, lives = 3;
let isPaused = false, isGameOver = false, currentQuestion = null;

// Oyun Ayarları
const groundHeight = 100; // Zeminin kalınlığı
const gravity = 0.8;
const finishLineX = 7000;

const p = { 
    x: 100, y: 0, vx: 0, vy: 0, 
    w: 40, h: 40, ground: false 
};

const platforms = []; 
const enemies = [];
const keys = { a: false, d: false, w: false };

// Soru Bankası
const questions = [
    { q: "Hangi cümlenin sonuna '?' gelmeli?", options: ["Seni seviyorum", "Neredesin", "Okula git", "Ders çalış"], a: 1 },
    { q: "Soru eki hangisidir?", options: ["-ler", "-de", "-mi", "-ki"], a: 2 }
];

let optionButtons = [];

function init() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    
    // Mario'yu havadan başlat, zemine düşecek
    p.y = h / 2; 

    platforms.length = 0; enemies.length = 0;
    
    // ANA ZEMİN: Ekranın en altına yapışık
    platforms.push({ x: 0, y: h - groundHeight, w: 15000, h: groundHeight, type: 'ground' });

    // Engeller (Borular ve Havada Duran Tuğlalar)
    for (let i = 1; i < 20; i++) {
        let px = i * 600;
        platforms.push({ x: px, y: h - groundHeight - 80, w: 80, h: 80, type: 'pipe' }); // Boru
        platforms.push({ x: px + 300, y: h - groundHeight - 200, w: 150, h: 30, type: 'block' }); // Tuğla
        enemies.push({ x: px + 450, y: h - groundHeight - 40, w: 40, h: 40, vx: -3, dead: false });
    }
}

// Giriş Kontrolleri
window.onkeydown = (e) => { let k = e.key.toLowerCase(); if(k in keys) keys[k] = true; };
window.onkeyup = (e) => { let k = e.key.toLowerCase(); if(k in keys) keys[k] = false; };

window.onclick = (e) => {
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

    // Hareket Mekaniği
    if (keys.a) p.vx = -6;
    else if (keys.d) p.vx = 6;
    else p.vx *= 0.8;

    if (keys.w && p.ground) {
        p.vy = -18;
        p.ground = false;
    }

    p.vy += gravity;
    p.x += p.vx;
    p.y += p.vy;

    // --- ZEMİN VE ENGEL ÇARPIŞMA SİSTEMİ ---
    p.ground = false;
    platforms.forEach(plat => {
        // Karakterin ayakları platformun üstündeyse ve düşüyorsa
        if (p.x + p.w > plat.x && p.x < plat.x + plat.w &&
            p.y + p.h > plat.y && p.y + p.h < plat.y + p.vy + 5) {
            p.y = plat.y - p.h;
            p.vy = 0;
            p.ground = true;
        }
    });

    // Canavar Saldırısı ve Soru
    enemies.forEach(e => {
        if (e.dead) return;
        if (Math.abs(p.x - e.x) < 500) e.x += (p.x < e.x) ? -3 : 3; // Mario'yu takip et

        if (Math.abs(p.x - e.x) < 35 && Math.abs(p.y - e.y) < 35) {
            isPaused = true;
            e.dead = true;
            currentQuestion = questions[Math.floor(Math.random() * questions.length)];
            optionButtons = currentQuestion.options.map((opt, i) => ({
                x: w/2 - 120, y: h/2 - 60 + (i * 65), w: 240, h: 50, label: opt
            }));
        }
    });

    camX += (p.x - camX - w / 4) * 0.1;
    if (p.x > finishLineX) isGameOver = true;
}

function render() {
    ctx.fillStyle = '#5c94fc'; ctx.fillRect(0, 0, w, h); // Gökyüzü

    ctx.save();
    ctx.translate(-camX, 0);

    // Zemin ve Engeller
    platforms.forEach(plat => {
        ctx.fillStyle = (plat.type === 'ground') ? '#8B4513' : (plat.type === 'pipe' ? '#2ecc71' : '#e67e22');
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
    });

    // Bayrak
    ctx.fillStyle = 'red'; ctx.fillRect(finishLineX, h - groundHeight - 300, 60, 40);
    ctx.fillStyle = 'white'; ctx.fillRect(finishLineX, h - groundHeight - 300, 5, 300);

    // Canavarlar
    enemies.forEach(e => {
        if (!e.dead) {
            ctx.fillStyle = 'black'; ctx.fillRect(e.x, e.y, e.w, e.h);
            ctx.fillStyle = 'yellow'; ctx.font = '20px Arial'; ctx.fillText('?', e.x + 15, e.y - 10);
        }
    });

    // Mario
    ctx.fillStyle = 'white'; ctx.fillRect(p.x, p.y, p.w, p.h);

    ctx.restore();

    // Skor ve Soru Ekranı
    ctx.fillStyle = 'white'; ctx.font = '20px Arial';
    ctx.fillText(`CAN: ${lives}  PUAN: ${score}`, 20, 40);

    if (isPaused && currentQuestion) {
        ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'yellow'; ctx.textAlign = 'center';
        ctx.fillText(currentQuestion.q, w / 2, h / 2 - 100);
        optionButtons.forEach(btn => {
            ctx.fillStyle = 'white'; ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
            ctx.fillStyle = 'black'; ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + 30);
        });
        ctx.textAlign = 'left';
    }

    if (isGameOver) {
        ctx.fillStyle = 'green'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'white'; ctx.textAlign = 'center';
        ctx.fillText("BÖLÜM BİTTİ!", w / 2, h / 2);
    }
}

function loop() { update(); render(); requestAnimationFrame(loop); }
init(); loop();
window.onresize = init;
