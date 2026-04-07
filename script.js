const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let w, h, camX = 0, score = 0, lives = 3, frame = 0;
let isPaused = false; 
let currentQuestion = null; // Aktif soruyu tutar
const gravity = 0.8;
const friction = 0.88;

// --- GÖRSELLER ---
const img = {
    mario: new Image(), goomba: new Image(), 
    bro: new Image(), hammer: new Image()
};
img.mario.src = 'mario.png';
img.goomba.src = 'goomba.png';
img.bro.src = 'hammer_brother.png';
img.hammer.src = 'hammer.png';

const p = { x: 400, y: 100, vx: 0, vy: 0, w: 50, h: 50, ground: false, dir: 1 };
const platforms = [];
const enemies = [];
const hammers = [];
const keys = { w: false, a: false, s: false, d: false };

// --- 5. SINIF TÜRKÇE: ŞIKLI SORULAR ---
const questions = [
    { q: "Tamamlanmış cümlelerin sonuna hangisi konur?", options: ["Nokta", "Virgül", "Ünlem", "Soru İşareti"], a: 0 },
    { q: "Eş görevli kelimeleri ayırmak için hangisi kullanılır?", options: ["Nokta", "Virgül", "İki Nokta", "Üç Nokta"], a: 1 },
    { q: "Heyecan, korku bildiren cümlelerin sonuna ne konur?", options: ["Nokta", "Virgül", "Ünlem", "Soru İşareti"], a: 2 },
    { q: "Özel adlara gelen ekleri hangisiyle ayırırız?", options: ["Virgül", "Nokta", "Kesme İşareti", "Ünlem"], a: 2 },
    { q: "Soru anlamı taşıyan cümlelerin sonuna ne gelir?", options: ["Soru İşareti", "Nokta", "Ünlem", "İki Nokta"], a: 0 }
];

// --- BUTONLAR ---
const touchButtons = [
    { id: 'a', x: 30, y: 0, w: 90, h: 90, label: 'A' },
    { id: 'd', x: 140, y: 0, w: 90, h: 90, label: 'D' },
    { id: 'w', x: 0, y: 0, w: 110, h: 110, label: 'W' }
];

// Soru Şıkları Butonları (Ekranın ortasında çıkacak)
const optionButtons = [];

function init() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    touchButtons[0].y = h - 120;
    touchButtons[1].y = h - 120;
    touchButtons[2].x = w - 140;
    touchButtons[2].y = h - 140;

    platforms.length = 0; enemies.length = 0;
    platforms.push({ x: 0, y: h - 100, w: 40000, h: 100, color: '#8B4513' });

    for(let i = 1; i < 60; i++) {
        let px = i * 450 + Math.random() * 200;
        let ey = h - 155; 
        enemies.push({
            x: px, y: ey, w: 55, h: 55,
            type: (i % 6 === 0) ? 'hammer_bro' : 'goomba',
            vx: (2 + Math.random() * 2) * (Math.random() > 0.5 ? 1 : -1),
            vy: 0, hasQuestion: Math.random() > 0.6,
            dead: false, shootTimer: 0
        });
    }
}

// --- TIKLAMA VE DOKUNMA KONTROLÜ ---
function checkClick(tx, ty) {
    if (isPaused && currentQuestion) {
        // Soru ekranındaki şıklara tıklama kontrolü
        optionButtons.forEach((btn, index) => {
            if (tx > btn.x && tx < btn.x + btn.w && ty > btn.y && ty < btn.y + btn.h) {
                if (index === currentQuestion.a) {
                    alert("DOĞRU! +500 Puan");
                    score += 500;
                } else {
                    alert("YANLIŞ! Can kaybettin.");
                    lives--;
                }
                isPaused = false;
                currentQuestion = null;
                if(lives <= 0) location.reload();
            }
        });
        return;
    }
    // Hareket tuşları kontrolü
    touchButtons.forEach(btn => {
        if (tx > btn.x && tx < btn.x + btn.w && ty > btn.y && ty < btn.y + btn.h) {
            keys[btn.id] = true;
        }
    });
}

window.addEventListener('mousedown', e => checkClick(e.clientX, e.clientY));
window.addEventListener('mouseup', () => { keys.a = keys.d = keys.w = false; });
window.addEventListener('touchstart', e => { e.preventDefault(); Array.from(e.touches).forEach(t => checkClick(t.clientX, t.clientY)); }, { passive: false });
window.addEventListener('touchend', () => { keys.a = keys.d = keys.w = false; });

// Klavye
window.addEventListener('keydown', e => { let k = e.key.toLowerCase(); if(keys.hasOwnProperty(k)) keys[k] = true; });
window.addEventListener('keyup', e => { let k = e.key.toLowerCase(); if(keys.hasOwnProperty(k)) keys[k] = false; });

function triggerQuestion(e) {
    isPaused = true;
    e.hasQuestion = false;
    currentQuestion = questions[Math.floor(Math.random() * questions.length)];
    
    // Şık butonlarını oluştur
    optionButtons.length = 0;
    const bw = 300, bh = 50;
    currentQuestion.options.forEach((opt, i) => {
        optionButtons.push({
            x: w / 2 - bw / 2,
            y: h / 2 - 50 + (i * 60),
            w: bw, h: bh, label: opt
        });
    });
}

function update() {
    if(isPaused) { render(); return; }
    frame++;

    if(keys.a) { p.vx -= 1.5; p.dir = -1; }
    if(keys.d) { p.vx += 1.5; p.dir = 1; }
    if(keys.w && p.ground) { p.vy = -25; p.ground = false; }

    p.vx *= friction; p.vy += gravity;
    p.x += p.vx; p.y += p.vy;
    camX += (p.x - camX - w/3) * 0.1;

    p.ground = false;
    platforms.forEach(plat => {
        if(p.x < plat.x + plat.w && p.x + p.w > plat.x && 
           p.y + p.h > plat.y && p.y + p.h < plat.y + plat.h + p.vy && p.vy >= 0) {
            p.y = plat.y - p.h; p.vy = 0; p.ground = true;
        }
    });

    enemies.forEach(e => {
        if(e.dead) return;
        e.x += e.vx; 
        if(Math.abs(p.x - e.x) < 60 && e.hasQuestion) triggerQuestion(e);
        if(p.x < e.x + e.w && p.x + p.w > e.x && p.y < e.y + e.h && p.y + p.h > e.y) {
            if(p.vy > 5) { e.dead = true; p.vy = -15; score += 100; }
            else if(!e.hasQuestion) reset();
        }
    });

    render();
    requestAnimationFrame(update);
}

function render() {
    ctx.fillStyle = '#5c94fc'; ctx.fillRect(0, 0, w, h);
    
    // Zemin
    platforms.forEach(plat => {
        ctx.fillStyle = plat.color; ctx.fillRect(plat.x - camX, plat.y, plat.w, plat.h);
    });

    // Canavarlar
    enemies.forEach(e => {
        if(e.dead) return;
        if(e.hasQuestion) { ctx.font = "30px Arial"; ctx.fillText("❓", e.x - camX + 10, e.y - 10); }
        ctx.drawImage(e.type === 'hammer_bro' ? img.bro : img.goomba, e.x - camX, e.y, e.w, e.h);
    });

    // Mario
    ctx.drawImage(img.mario, p.x - camX, p.y, p.w, p.h);

    // Hareket Tuşları
    ctx.globalAlpha = 0.5;
    touchButtons.forEach(btn => {
        ctx.fillStyle = "black"; ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
        ctx.fillStyle = "white"; ctx.font = "20px Arial"; ctx.fillText(btn.label, btn.x + 20, btn.y + 55);
    });

    // --- SORU PANELİ (Eğer oyun durduysa) ---
    if (isPaused && currentQuestion) {
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = "white";
        ctx.fillRect(w / 2 - 250, h / 2 - 200, 500, 400); // Panel arka planı
        
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = "black";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.fillText(currentQuestion.q, w / 2, h / 2 - 120);

        optionButtons.forEach((btn, i) => {
            ctx.fillStyle = "#2ecc71";
            ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
            ctx.fillStyle = "white";
            ctx.fillText(`${["A", "B", "C", "D"][i]}) ${btn.label}`, btn.x + btn.w / 2, btn.y + 32);
        });
        ctx.textAlign = "left";
    }

    ctx.globalAlpha = 1.0;
    ctx.fillStyle = "white"; ctx.font = "24px Arial";
    ctx.fillText(`Puan: ${score} | Can: ${lives}`, 20, 40);
}

function reset() { lives--; p.x = 400; p.y = 100; if(lives <= 0) location.reload(); }
init(); update();
