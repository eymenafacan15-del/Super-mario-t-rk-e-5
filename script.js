const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let w, h, camX = 0, score = 0, lives = 3;
let isPaused = false, isGameOver = false, currentQuestion = null;

const gravity = 0.8;
const groundHeight = 120; // Kalın, çökmez zemin

const p = { 
    x: 150, y: 0, vx: 0, vy: 0, 
    w: 45, h: 45, ground: false 
};

const platforms = []; 
const enemies = [];
const keys = { a: false, d: false, w: false };

// --- TEXTURE VE RENK TANIMLARI ---
const colors = {
    sky: "#5c94fc",
    ground: "#8B4513",
    grass: "#2ecc71",
    pipe: "#27ae60",
    block: "#e67e22",
    mario: "#e74c3c",
    enemy: "#2c3e50",
    btn: "rgba(255, 255, 255, 0.3)",
    btnActive: "rgba(255, 255, 255, 0.6)"
};

const questions = [
    { q: "Hangi cümlenin sonuna soru işareti gelmelidir?", options: ["Bugün hava güzel", "Neden geç kaldın", "Eve gittim", "Okul bitti"], a: 1 },
    { q: "Bilinmeyen tarihler için hangi işaret kullanılır?", options: ["!", ".", "?", ","], a: 2 }
];

let optionButtons = [];
const touchBtns = [
    { id: 'a', x: 40, y: 0, w: 90, h: 90, icon: "◀" },
    { id: 'd', x: 150, y: 0, w: 90, h: 90, icon: "▶" },
    { id: 'w', x: 0, y: 0, w: 110, h: 110, icon: "▲" }
];

function init() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    
    // Tuş yerleşimi
    touchBtns[0].y = h - 130;
    touchBtns[1].y = h - 130;
    touchBtns[2].x = w - 150;
    touchBtns[2].y = h - 150;

    p.y = h - groundHeight - p.h;

    platforms.length = 0; enemies.length = 0;
    // ANA ZEMİN
    platforms.push({ x: 0, y: h - groundHeight, w: 20000, h: groundHeight, type: 'ground' });

    // HARİTA TASARIMI
    for (let i = 1; i < 25; i++) {
        let px = i * 700;
        platforms.push({ x: px, y: h - groundHeight - 80, w: 80, h: 80, type: 'pipe' });
        platforms.push({ x: px + 300, y: h - groundHeight - 200, w: 150, h: 40, type: 'block' });
        enemies.push({ x: px + 500, y: h - groundHeight - 45, w: 45, h: 45, vx: -3, dead: false });
    }
}

// --- DOKUNMATİK VE KONTROL SİSTEMİ ---
function handleInput(tx, ty, isDown) {
    touchBtns.forEach(btn => {
        if (tx > btn.x && tx < btn.x + btn.w && ty > btn.y && ty < btn.y + btn.h) {
            keys[btn.id] = isDown;
        }
    });

    if (isDown && isPaused && currentQuestion) {
        optionButtons.forEach((btn, i) => {
            if (tx > btn.x && tx < btn.x + btn.w && ty > btn.y && ty < btn.y + btn.h) {
                if (i === currentQuestion.a) score += 500; else lives--;
                isPaused = false;
                if (lives <= 0) location.reload();
            }
        });
    }
}

window.addEventListener('touchstart', e => { 
    e.preventDefault(); 
    Array.from(e.touches).forEach(t => handleInput(t.clientX, t.clientY, true)); 
}, { passive: false });

window.addEventListener('touchend', () => { keys.a = keys.d = keys.w = false; });
window.onmousedown = (e) => handleInput(e.clientX, e.clientY, true);
window.onmouseup = () => { keys.a = keys.d = keys.w = false; };
window.onkeydown = (e) => { let k = e.key.toLowerCase(); if(k in keys) keys[k] = true; };
window.onkeyup = (e) => { let k = e.key.toLowerCase(); if(k in keys) keys[k] = false; };

function update() {
    if (isPaused || isGameOver) return;

    if (keys.a) p.vx = -7;
    else if (keys.d) p.vx = 7;
    else p.vx *= 0.85;

    if (keys.w && p.ground) { p.vy = -20; p.ground = false; }

    p.vy += gravity;
    p.x += p.vx;
    p.y += p.vy;

    // --- GELİŞMİŞ ÇARPIŞMA (ZEMİN SORUNU ÇÖZÜMÜ) ---
    p.ground = false;
    platforms.forEach(plat => {
        // Yatayda platformun içindeyse
        if (p.x + p.w > plat.x && p.x < plat.x + plat.w) {
            // Dikeyde üstten çarpma
            if (p.y + p.h > plat.y && p.y + p.h < plat.y + p.vy + 10) {
                p.y = plat.y - p.h;
                p.vy = 0;
                p.ground = true;
            }
        }
    });

    // Canavar Takibi
    enemies.forEach(e => {
        if (e.dead) return;
        if (Math.abs(p.x - e.x) < 550) e.x += (p.x < e.x) ? -3.5 : 3.5;

        if (Math.abs(p.x - e.x) < 40 && Math.abs(p.y - e.y) < 40) {
            isPaused = true; e.dead = true;
            currentQuestion = questions[Math.floor(Math.random() * questions.length)];
            optionButtons = currentQuestion.options.map((opt, i) => ({
                x: w/2 - 150, y: h/2 - 80 + (i * 70), w: 300, h: 60, label: opt
            }));
        }
    });

    camX += (p.x - camX - w/4) * 0.1;
}

function render() {
    ctx.fillStyle = colors.sky; ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(-camX, 0);

    // NESNE ÇİZİMLERİ (TEXTURE)
    platforms.forEach(plat => {
        if (plat.type === 'ground') {
            ctx.fillStyle = colors.ground; ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            ctx.fillStyle = colors.grass; ctx.fillRect(plat.x, plat.y, plat.w, 15);
        } else if (plat.type === 'pipe') {
            ctx.fillStyle = colors.pipe; ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.fillRect(plat.x + plat.w - 20, plat.y, 20, plat.h);
        } else {
            ctx.fillStyle = colors.block; ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
        }
    });

    // Canavarlar
    enemies.forEach(e => {
        if (!e.dead) {
            ctx.fillStyle = colors.enemy; ctx.fillRect(e.x, e.y, e.w, e.h);
            ctx.fillStyle = "white"; ctx.fillRect(e.x+10, e.y+10, 8, 8); ctx.fillRect(e.x+27, e.y+10, 8, 8);
            ctx.fillStyle = "yellow"; ctx.font = "bold 24px Arial"; ctx.fillText("?", e.x + 15, e.y - 10);
        }
    });

    // Mario
    ctx.fillStyle = colors.mario; ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = "black"; ctx.fillRect(p.x+30, p.y+10, 7, 7);

    ctx.restore();

    // --- DOKUNMATİK BUTON TEXTURELARI ---
    touchBtns.forEach(btn => {
        ctx.fillStyle = keys[btn.id] ? colors.btnActive : colors.btn;
        ctx.beginPath();
        ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 20);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = "bold 40px Arial";
        ctx.textAlign = "center";
        ctx.fillText(btn.icon, btn.x + btn.w/2, btn.y + btn.h/2 + 15);
    });

    // ARAYÜZ
    ctx.fillStyle = "white"; ctx.textAlign = "left"; ctx.font = "bold 24px Arial";
    ctx.fillText(`CAN: ${lives}  SKOR: ${score}`, 30, 50);

    if (isPaused && currentQuestion) {
        ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "yellow"; ctx.textAlign = "center"; ctx.fillText(currentQuestion.q, w/2, h/2 - 130);
        optionButtons.forEach(btn => {
            ctx.fillStyle = "white"; ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 10); ctx.fill();
            ctx.fillStyle = "black"; ctx.fillText(btn.label, btn.x + btn.w/2, btn.y + 40);
        });
    }
}

function loop() { update(); render(); requestAnimationFrame(loop); }
init(); loop();
window.onresize = init;
