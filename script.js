const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let w, h, camX = 0, score = 0, lives = 3, frame = 0;
let isPaused = false; 
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
const keys = { w: false, a: false, s: false, d: false }; // WASD Sistemi

// --- 5. SINIF TÜRKÇE: NOKTALAMA İŞARETLERİ SORULARI ---
const questions = [
    { q: "Tamamlanmış cümlelerin sonuna ne konur?", a: "nokta" },
    { q: "Eş görevli kelimeleri ayırmak için ne kullanılır?", a: "virgül" },
    { q: "Korku, heyecan ve şaşma bildiren cümlelerin sonuna ne konur?", a: "ünlem" },
    { q: "Kendisiyle ilgili örnek verilecek cümlenin sonuna ne konur?", a: "iki nokta" },
    { q: "Özel adlara gelen ekleri ayırmak için ne kullanılır?", a: "kesme işareti" },
    { q: "Soru bildiren cümlelerin sonuna ne konur?", a: "soru işareti" }
];

// --- DOKUNMATİK TUŞLAR ---
const touchButtons = [
    { id: 'a', x: 30, y: 0, w: 90, h: 90, label: 'A (Sol)' },
    { id: 'd', x: 140, y: 0, w: 90, h: 90, label: 'D (Sağ)' },
    { id: 'w', x: 0, y: 0, w: 110, h: 110, label: 'W (Zıpla)' }
];

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
        let onGround = Math.random() > 0.3;
        let ey = onGround ? h - 155 : h - 350 - Math.random() * 100;
        if(!onGround) platforms.push({ x: px - 50, y: ey + 55, w: 250, h: 40, color: '#ab4013' });

        enemies.push({
            x: px, y: ey, w: 55, h: 55,
            type: (i % 6 === 0) ? 'hammer_bro' : 'goomba',
            vx: (2 + Math.random() * 2) * (Math.random() > 0.5 ? 1 : -1),
            vy: 0, startX: px - 100, range: 200, hasQuestion: Math.random() > 0.6,
            state: 'chase', dead: false, shootTimer: 0, jumpTimer: 0
        });
    }
}

// --- GİRİŞ KONTROLLERİ ---
function handleInput(tx, ty, isDown) {
    touchButtons.forEach(btn => {
        if (tx > btn.x && tx < btn.x + btn.w && ty > btn.y && ty < btn.y + btn.h) {
            keys[btn.id] = isDown;
        }
    });
}
window.addEventListener('touchstart', e => { e.preventDefault(); Array.from(e.touches).forEach(t => handleInput(t.clientX, t.clientY, true)); }, { passive: false });
window.addEventListener('touchend', () => { keys.a = keys.d = keys.w = false; });
window.addEventListener('mousedown', e => handleInput(e.clientX, e.clientY, true));
window.addEventListener('mouseup', () => { keys.a = keys.d = keys.w = false; });

window.addEventListener('keydown', e => {
    let k = e.key.toLowerCase();
    if(k === 'a' || k === 'd' || k === 'w') keys[k] = true;
});
window.addEventListener('keyup', e => {
    let k = e.key.toLowerCase();
    if(k === 'a' || k === 'd' || k === 'w') keys[k] = false;
});

// --- SORU SİSTEMİ ---
function triggerQuestion(e) {
    isPaused = true; e.hasQuestion = false;
    setTimeout(() => {
        let q = questions[Math.floor(Math.random() * questions.length)];
        let ans = prompt("TÜRKÇE SORUSU:\n" + q.q);
        if(ans && ans.toLowerCase().trim() === q.a) {
            alert("DOĞRU! Canavar kaçtı.");
            e.dead = true; score += 500;
        } else {
            alert("YANLIŞ! Cevap: " + q.a.toUpperCase());
            lives--;
        }
        isPaused = false;
        if(lives <= 0) location.reload();
    }, 50);
}

function update() {
    if(isPaused) return;
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
        let dist = Math.abs(p.x - e.x);
        e.vx = (p.x < e.x) ? -3.8 : 3.8; 
        e.x += e.vx;

        e.jumpTimer++;
        if(e.jumpTimer % 120 === 0 && dist < 400) e.vy = -14;
        e.y += e.vy; e.vy += gravity * 0.8;

        if(e.y > h - 155) { e.y = h - 155; e.vy = 0; }

        if(e.hasQuestion && dist < 65) triggerQuestion(e);

        if(e.type === 'hammer_bro' && dist < 700) {
            e.shootTimer++;
            if(e.shootTimer % 75 === 0) {
                let d = (p.x < e.x) ? -1 : 1;
                hammers.push({ x: e.x, y: e.y, vx: d * (5 + Math.random() * 2), vy: -18, angle: 0 });
            }
        }

        if(p.x < e.x + e.w && p.x + p.w > e.x && p.y < e.y + e.h && p.y + p.h > e.y) {
            if(p.vy > 5) { e.dead = true; p.vy = -15; score += 200; }
            else if(!e.hasQuestion) reset();
        }
    });

    hammers.forEach((h_obj, i) => {
        h_obj.x += h_obj.vx; h_obj.y += h_obj.vy; h_obj.vy += 0.65; h_obj.angle += 0.35;
        if(p.x < h_obj.x + 20 && p.x + p.w > h_obj.x && p.y < h_obj.y + 20 && p.y + p.h > h_obj.y) reset();
        if(h_obj.y > h + 300) hammers.splice(i, 1);
    });

    if(p.y > h + 300) reset();
    render();
    requestAnimationFrame(update);
}

function render() {
    ctx.fillStyle = '#5c94fc'; ctx.fillRect(0, 0, w, h);
    platforms.forEach(plat => {
        ctx.fillStyle = plat.color; ctx.fillRect(plat.x - camX, plat.y, plat.w, plat.h);
        ctx.fillStyle = '#228B22'; ctx.fillRect(plat.x - camX, plat.y, plat.w, 8);
    });

    enemies.forEach(e => {
        if(e.dead) return;
        ctx.save();
        if(e.hasQuestion) { ctx.fillStyle = "yellow"; ctx.font = "bold 25px Arial"; ctx.fillText("❓", e.x - camX + 15, e.y - 15); }
        let shake = Math.sin(frame) * 4;
        ctx.drawImage(e.type === 'hammer_bro' ? img.bro : img.goomba, e.x - camX + shake, e.y, e.w, e.h);
        ctx.restore();
    });

    hammers.forEach(h_obj => {
        ctx.save(); ctx.translate(h_obj.x - camX + 12, h_obj.y + 12); ctx.rotate(h_obj.angle);
        ctx.drawImage(img.hammer, -15, -15, 30, 30); ctx.restore();
    });

    ctx.save();
    if(p.dir === -1) { ctx.translate(p.x-camX+p.w, p.y); ctx.scale(-1, 1); ctx.drawImage(img.mario, 0, 0, p.w, p.h); }
    else ctx.drawImage(img.mario, p.x-camX, p.y, p.w, p.h);
    ctx.restore();

    ctx.globalAlpha = 0.5;
    touchButtons.forEach(btn => {
        ctx.fillStyle = "black"; ctx.beginPath(); ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 15); ctx.fill();
        ctx.fillStyle = "white"; ctx.font = "bold 20px Arial"; ctx.textAlign = "center";
        ctx.fillText(btn.label, btn.x + btn.w/2, btn.y + btn.h/1.6);
    });
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = "white"; ctx.font = "bold 26px Arial";
    ctx.fillText(`Puan: ${score} | Can: ${lives}`, 20, 40);
}

function reset() { lives--; p.x = 400; p.y = 100; p.vx = 0; p.vy = 0; if(lives <= 0) location.reload(); }
window.addEventListener('resize', init);
init(); update();
