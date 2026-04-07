const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let w, h, camX = 0, score = 0, lives = 3;
let isPaused = false, isGameOver = false, currentQuestion = null;

// --- OYUN AYARLARI ---
const gravity = 0.8;
const groundY_Offset = 100; // Zeminin ekranın altından yüksekliği

const p = { 
    x: 100, y: 0, vx: 0, vy: 0, 
    w: 45, h: 45, ground: false, color: "#e74c3c" 
};

const platforms = []; 
const enemies = [];
const keys = { a: false, d: false, w: false };

// --- SORULAR ---
const questions = [
    { q: "Soru cümlesinin sonuna ne gelir?", options: [" Nokta (.)", " Soru İşareti (?)", " Ünlem (!)", " Virgül (,)"], a: 1 },
    { q: "Hangisi bir soru kelimesidir?", options: [" Koştu", " Elma", " Nasıl", " Güzel"], a: 2 }
];

let optionButtons = [];

// --- DOKUNMATİK TUŞLAR (TEXTURE GİBİ ÇİZİLECEK) ---
const touchButtons = [
    { id: 'a', x: 30, y: 0, w: 80, h: 80, label: "◀", color: "#34495e" },
    { id: 'd', x: 130, y: 0, w: 80, h: 80, label: "▶", color: "#34495e" },
    { id: 'w', x: 0, y: 0, w: 100, h: 100, label: "▲", color: "#2c3e50" }
];

function init() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    
    // Tuş yerleşimi
    touchButtons[0].y = h - 110;
    touchButtons[1].y = h - 110;
    touchButtons[2].x = w - 130;
    touchButtons[2].y = h - 130;

    p.y = h - groundY_Offset - p.h - 50; // Mario'yu zeminin biraz üstünde başlat

    platforms.length = 0; enemies.length = 0;
    
    // ZEMİN (Texture: Kahverengi + Çizgiler)
    platforms.push({ x: 0, y: h - groundY_Offset, w: 20000, h: groundY_Offset, type: 'ground' });

    // ENGELLER (Borular ve Bloklar)
    for (let i = 1; i < 30; i++) {
        let px = i * 600;
        // Yeşil Boru (Texture: Yeşil Gradyan)
        platforms.push({ x: px, y: h - groundY_Offset - 80, w: 80, h: 80, type: 'pipe' });
        // Havada Blok (Texture: Tuğla Deseni)
        if(i % 2 === 0) {
            platforms.push({ x: px + 250, y: h - groundY_Offset - 220, w: 120, h: 40, type: 'block' });
        }
        // Canavar (Texture: Siyah + Gözler)
        enemies.push({ x: px + 400, y: h - groundY_Offset - 40, w: 40, h: 40, vx: -2.5, dead: false });
    }
}

// --- ETKİLEŞİM ---
function checkTouch(tx, ty, isDown) {
    touchButtons.forEach(btn => {
        if (tx > btn.x && tx < btn.x + btn.w && ty > btn.y && ty < btn.y + btn.h) {
            keys[btn.id] = isDown;
        }
    });
}

window.onmousedown = (e) => {
    checkTouch(e.clientX, e.clientY, true);
    if (isPaused && currentQuestion) {
        optionButtons.forEach((btn, i) => {
            if (e.clientX > btn.x && e.clientX < btn.x + btn.w && e.clientY > btn.y && e.clientY < btn.y + btn.h) {
                if (i === currentQuestion.a) score += 100; else lives--;
                isPaused = false;
                if (lives <= 0) location.reload();
            }
        });
    }
};
window.onmouseup = () => { keys.a = keys.d = keys.w = false; };
window.ontouchstart = (e) => { Array.from(e.touches).forEach(t => checkTouch(t.clientX, t.clientY, true)); };
window.ontouchend = () => { keys.a = keys.d = keys.w = false; };
window.onkeydown = (e) => { let k = e.key.toLowerCase(); if(k in keys) keys[k] = true; };
window.onkeyup = (e) => { let k = e.key.toLowerCase(); if(k in keys) keys[k] = false; };

function update() {
    if (isPaused || isGameOver) return;

    // Hareket
    if (keys.a) p.vx = -7;
    else if (keys.d) p.vx = 7;
    else p.vx *= 0.85;

    if (keys.w && p.ground) { p.vy = -20; p.ground = false; }

    p.vy += gravity;
    p.x += p.vx;
    p.y += p.vy;

    // --- KESİN ÇARPIŞMA SİSTEMİ ---
    p.ground = false;
    platforms.forEach(plat => {
        // Karakter platformun hizasındaysa
        if (p.x + p.w > plat.x && p.x < plat.x + plat.w) {
            // Üstten çarpma (Zemine basma)
            if (p.y + p.h > plat.y && p.y + p.h < plat.y + p.vy + 10) {
                p.y = plat.y - p.h;
                p.vy = 0;
                p.ground = true;
            }
            // Alttan çarpma (Kafa atma)
            else if (p.y < plat.y + plat.h && p.y > plat.y + plat.h + p.vy - 10) {
                p.y = plat.y + plat.h;
                p.vy = 2;
            }
        }
    });

    // Canavarlar
    enemies.forEach(e => {
        if (e.dead) return;
        if (Math.abs(p.x - e.x) < 600) e.x += (p.x < e.x) ? -3.5 : 3.5;
        if (Math.abs(p.x - e.x) < 40 && Math.abs(p.y - e.y) < 40) {
            isPaused = true; e.dead = true;
            currentQuestion = questions[Math.floor(Math.random() * questions.length)];
            optionButtons = currentQuestion.options.map((opt, i) => ({
                x: w/2 - 150, y: h/2 - 80 + (i * 65), w: 300, h: 55, label: opt
            }));
        }
    });

    camX += (p.x - camX - w / 4) * 0.1;
    if (p.x > 18000) isGameOver = true;
}

function drawTexture(type, x, y, width, height) {
    if (type === 'ground') {
        ctx.fillStyle = "#8B4513"; ctx.fillRect(x, y, width, height);
        ctx.fillStyle = "#5D2906"; ctx.fillRect(x, y, width, 5); // Üst çizgi
    } else if (type === 'pipe') {
        ctx.fillStyle = "#2ecc71"; ctx.fillRect(x, y, width, height);
        ctx.fillStyle = "#27ae60"; ctx.fillRect(x + width - 15, y, 15, height); // Gölge
    } else if (type === 'block') {
        ctx.fillStyle = "#e67e22"; ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = "#d35400"; ctx.strokeRect(x, y, width, height); // Tuğla kenarı
    }
}

function render() {
    ctx.fillStyle = "#5c94fc"; ctx.fillRect(0, 0, w, h); // GÖKYÜZÜ

    ctx.save();
    ctx.translate(-camX, 0);

    // Platformları Dokuyla Çiz
    platforms.forEach(plat => {
        drawTexture(plat.type, plat.x, plat.y, plat.w, plat.h);
    });

    // Canavar Texture
    enemies.forEach(e => {
        if (!e.dead) {
            ctx.fillStyle = "#2c3e50"; ctx.fillRect(e.x, e.y, e.w, e.h);
            ctx.fillStyle = "white"; ctx.fillRect(e.x+10, e.y+10, 5, 5); ctx.fillRect(e.x+25, e.y+10, 5, 5); // Gözler
            ctx.fillStyle = "yellow"; ctx.fillText("?", e.x + 15, e.y - 10);
        }
    });

    // Mario Texture
    ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = "black"; ctx.fillRect(p.x+30, p.y+10, 8, 8); // Göz

    ctx.restore();

    // --- DOKUNMATİK TUŞLAR (Texturelu Butonlar) ---
    ctx.globalAlpha = 0.7;
    touchButtons.forEach(btn => {
        ctx.fillStyle = btn.color;
        ctx.beginPath(); ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 15); ctx.fill();
        ctx.fillStyle = "white"; ctx.font = "bold 30px Arial"; ctx.textAlign = "center";
        ctx.fillText(btn.label, btn.x + btn.w/2, btn.y + btn.h/2 + 10);
    });
    ctx.globalAlpha = 1.0;

    // Skor ve Soru Paneli
    ctx.fillStyle = "white"; ctx.font = "20px Arial"; ctx.textAlign = "left";
    ctx.fillText(`PUAN: ${score}  CAN: ${lives}`, 30, 40);

    if (isPaused && currentQuestion) {
        ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "yellow"; ctx.textAlign = "center"; ctx.font = "24px Arial";
        ctx.fillText(currentQuestion.q, w/2, h/2 - 120);
        optionButtons.forEach(btn => {
            ctx.fillStyle = "white"; ctx.beginPath(); ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 10); ctx.fill();
            ctx.fillStyle = "black"; ctx.fillText(btn.label, btn.x + btn.w/2, btn.y + 35);
        });
    }
}

function loop() { update(); render(); requestAnimationFrame(loop); }
init(); loop();
window.onresize = init;
