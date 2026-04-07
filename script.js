const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let w, h, camX = 0, score = 0, lives = 3, frame = 0;
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

// --- BÖLÜM SONU (BAYRAK) ---
const finishLineX = 8000; // Bayrak 8000. pikselde

// --- TÜRKÇE SORULARI ---
const questions = [
    { q: "Cümlenin sonuna ne konur?", options: ["Nokta (.)", "Virgül", "Soru İşareti", "Ünlem"], a: 0 },
    { q: "Soru sorarken hangisini kullanırız?", options: ["Nokta", "Soru İşareti (?)", "Ünlem", "Virgül"], a: 1 },
    { q: "Korku ve heyecan işareti nedir?", options: ["Virgül", "Nokta", "Ünlem (!)", "İki Nokta"], a: 2 },
    { q: "Özel isimlere gelen ekleri ne ayırır?", options: ["Nokta", "Kesme İşareti (')", "Virgül", "Ünlem"], a: 1 }
];

const moveButtons = [
    { id: 'a', x: 20, y: 0, w: 80, h: 80, label: "SOL (A)" },
    { id: 'd', x: 120, y: 0, w: 80, h: 80, label: "SAĞ (D)" },
    { id: 'w', x: 0, y: 0, w: 100, h: 100, label: "ZIPLA (W)" }
];

let optionButtons = [];

function init() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    moveButtons[0].y = h - 100;
    moveButtons[1].y = h - 100;
    moveButtons[2].x = w - 120;
    moveButtons[2].y = h - 120;

    platforms.length = 0; enemies.length = 0;
    
    // ANA ZEMİN
    platforms.push({ x: 0, y: h - 100, w: 10000, h: 100, type: 'ground' });

    // --- HARİTA TASARIMI: BORULAR VE ENGELLER ---
    for(let i = 1; i < 20; i++) {
        let px = i * 400;
        
        // 1. Havada duran tuğla bloklar
        if(i % 2 === 0) {
            platforms.push({ x: px, y: h - 280, w: 150, h: 40, type: 'block' });
        }

        // 2. Yeşil Borular (Engel)
        if(i % 4 === 0) {
            platforms.push({ x: px + 200, y: h - 180, w: 70, h: 80, type: 'pipe' });
        }

        // 3. Canavarlar
        enemies.push({ x: px + 100, y: h - 155, w: 55, h: 55, hasQuestion: true, dead: false });
    }
}

function handleInteraction(tx, ty, isDown) {
    if(isGameOver) return;
    if (isPaused && currentQuestion) {
        if (!isDown) return;
        optionButtons.forEach((btn, index) => {
            if (tx > btn.x && tx < btn.x + btn.w && ty > btn.y && ty < btn.y + btn.h) {
                if (index === currentQuestion.a) score += 500; else lives--;
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

    if(keys.a) { p.vx -= 1.5; p.dir = -1; }
    if(keys.d) { p.vx += 1.5; p.dir = 1; }
    if(keys.w && p.ground) { p.vy = -23; p.ground = false; }

    p.vx *= friction; p.vy += gravity;
    p.x += p.vx; p.y += p.vy;
    camX += (p.x - camX - w/3) * 0.1;

    p.ground = false;
    platforms.forEach(plat => {
        // Üzerine Basma (Platform/Boru/Zemin)
        if(p.x < plat.x + plat.w && p.x + p.w > plat.x && p.y + p.h > plat.y && p.y + p.h < plat.y + 30 && p.vy >= 0) {
            p.y = plat.y - p.h; p.vy = 0; p.ground = true;
        }
        // Yanlardan Çarpma (Engel olma durumu)
        if(plat.type !== 'ground' && p.y + p.h > plat.y + 10 && p.y < plat.y + plat.h - 10) {
            if(p.x + p.w > plat.x && p.x < plat.x + 10) { p.x = plat.x - p.w; p.vx = 0; }
            if(p.x < plat.x + plat.w && p.x > plat.x + plat.w - 10) { p.x = plat.x + plat.w; p.vx = 0; }
        }
    });

    enemies.forEach(e => {
        if(!e.dead && Math.abs(p.x - e.x) < 50 && Math.abs(p.y - e.y) < 50 && e.hasQuestion) {
            isPaused = true; e.hasQuestion = false;
            currentQuestion = questions[Math.floor(Math.random() * questions.length)];
            optionButtons = currentQuestion.options.map((opt, i) => ({
                x: w/2 - 150, y: h/2 - 80 + (i * 70), w: 300, h: 55, label: opt
            }));
        }
    });

    // BAYRAĞA ULAŞMA (Harita Sonu)
    if(p.x > finishLineX) { isGameOver = true; score += 1000; }

    render();
    requestAnimationFrame(update);
}

function render() {
    ctx.fillStyle = '#5c94fc'; ctx.fillRect(0, 0, w, h);
    
    // Engeller, Borular ve Zemin
    platforms.forEach(plat => {
        if(plat.type === 'pipe') ctx.fillStyle = '#2ecc71'; 
        else if(plat.type === 'block') ctx.fillStyle = '#e67e22';
        else ctx.fillStyle = '#8B4513';
        
        ctx.fillRect(plat.x - camX, plat.y, plat.w, plat.h);
        ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(plat.x - camX, plat.y, plat.w, 5);
    });

    // Bayrak Direği
    ctx.fillStyle = 'white'; ctx.fillRect(finishLineX - camX, h - 500, 10, 400);
    ctx.fillStyle = 'red'; ctx.fillRect(finishLineX - camX, h - 500, 60, 40);

    enemies.forEach(e => { if(!e.dead) ctx.drawImage(img.goomba, e.x - camX, e.y, e.w, e.h); });

    ctx.save();
    if(p.dir === -1) { ctx.translate(p.x - camX + p.w, p.y); ctx.scale(-1, 1); ctx.drawImage(img.mario, 0, 0, p.w, p.h); }
    else { ctx.drawImage(img.mario, p.x - camX, p.y, p.w, p.h); }
    ctx.restore();

    // Kontroller
    ctx.globalAlpha = 0.5;
    moveButtons.forEach(btn => {
        ctx.fillStyle = "black"; ctx.beginPath(); ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 10); ctx.fill();
        ctx.fillStyle = "white"; ctx.font = "bold 16px Arial"; ctx.textAlign="center";
        ctx.fillText(btn.label, btn.x + btn.w/2, btn.y + btn.h/1.6);
    });

    // Soru Paneli
    if (isPaused && currentQuestion) {
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = "rgba(0,0,0,0.9)"; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "white"; ctx.font = "bold 24px Arial"; ctx.textAlign = "center";
        ctx.fillText(currentQuestion.q, w/2, h/2 - 140);
        optionButtons.forEach((btn, i) => {
            ctx.fillStyle = "#3498db"; ctx.beginPath(); ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 10); ctx.fill();
            ctx.fillStyle = "white"; ctx.font = "bold 18px Arial";
            ctx.fillText(btn.label, btn.x + btn.w/2, btn.y + 35);
        });
    }

    // Oyun Bitti (Bayrak)
    if(isGameOver) {
        ctx.globalAlpha = 0.8; ctx.fillStyle = "green"; ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1.0; ctx.fillStyle = "white"; ctx.font = "bold 50px Arial"; ctx.textAlign="center";
        ctx.fillText("BÖLÜM BİTTİ! TEBRİKLER!", w/2, h/2);
        ctx.font = "20px Arial"; ctx.fillText("Yeniden başlamak için ekrana tıkla", w/2, h/2 + 60);
        canvas.onclick = () => location.reload();
    }

    ctx.globalAlpha = 1.0; ctx.textAlign = "left";
    ctx.fillStyle = "yellow"; ctx.font = "bold 22px Arial";
    ctx.fillText(`CAN: ${lives} | PUAN: ${score}`, 20, 40);
}

init(); update();
