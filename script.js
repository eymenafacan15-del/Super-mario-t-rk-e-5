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

const p = { x: 200, y: 100, vx: 0, vy: 0, w: 50, h: 50, ground: false, dir: 1 };
const platforms = [];
const enemies = [];
const hammers = [];
const keys = { left: false, right: false, up: false };

// --- SORU HAVUZU ---
const questions = [
    { q: "Güneş hangi yönden doğar?", a: "doğu" },
    { q: "6 x 7 kaç eder?", a: "42" },
    { q: "Maddenin kaç hali vardır? (3/4)", a: "3" },
    { q: "En küçük asal sayı kaçtır?", a: "2" }
];

// --- DOKUNMATİK TUŞLAR (Tahta İçin) ---
const touchButtons = [
    { id: 'left', x: 30, y: 0, w: 90, h: 90, label: '◀' },
    { id: 'right', x: 140, y: 0, w: 90, h: 90, label: '▶' },
    { id: 'up', x: 0, y: 0, w: 110, h: 110, label: 'Zıpla' }
];

function init() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    
    // Tuş yerleşimi
    touchButtons[0].y = h - 120;
    touchButtons[1].y = h - 120;
    touchButtons[2].x = w - 140;
    touchButtons[2].y = h - 140;

    platforms.length = 0;
    enemies.length = 0;

    // ANA ZEMİN
    platforms.push({ x: 0, y: h - 100, w: 30000, h: 100, color: '#8B4513' });

    // RASTGELE DÜNYA (Canavarlar zeminde ve platformda)
    for(let i = 1; i < 50; i++) {
        let px = i * 500 + Math.random() * 200;
        let onGround = Math.random() > 0.4;
        let ey = onGround ? h - 155 : h - 350 - Math.random() * 100;
        
        if(!onGround) {
            platforms.push({ x: px - 50, y: ey + 55, w: 250, h: 40, color: '#ab4013' });
        }

        enemies.push({
            x: px, y: ey, w: 55, h: 55,
            type: (i % 5 === 0) ? 'hammer_bro' : 'goomba',
            vx: 2 * (Math.random() > 0.5 ? 1 : -1),
            vy: 0,
            startX: px - 100, range: 200, startY: ey,
            hasQuestion: Math.random() > 0.6,
            state: 'patrol',
            dead: false, shootTimer: 0
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
window.addEventListener('touchend', () => { keys.left = keys.right = keys.up = false; });
window.addEventListener('mousedown', e => handleInput(e.clientX, e.clientY, true));
window.addEventListener('mouseup', () => { keys.left = keys.right = keys.up = false; });

window.addEventListener('keydown', e => {
    if(e.key === 'ArrowLeft') keys.left = true;
    if(e.key === 'ArrowRight') keys.right = true;
    if(e.key === 'ArrowUp' || e.key === ' ') keys.up = true;
});
window.addEventListener('keyup', e => {
    if(e.key === 'ArrowLeft') keys.left = false;
    if(e.key === 'ArrowRight') keys.right = false;
    if(e.key === 'ArrowUp' || e.key === ' ') keys.up = false;
});

// --- SORU SİSTEMİ ---
function triggerQuestion(e) {
    isPaused = true;
    e.hasQuestion = false;
    setTimeout(() => {
        let q = questions[Math.floor(Math.random() * questions.length)];
        let ans = prompt("CANAVARIN SORUSU:\n" + q.q);
        if(ans && ans.toLowerCase() === q.a) {
            alert("BİLDİN! Canavar yok oldu.");
            e.dead = true; score += 500;
        } else {
            alert("BİLEMEDİN! Can kaybettin.");
            lives--;
        }
        isPaused = false;
        if(lives <= 0) location.reload();
    }, 50);
}

function update() {
    if(isPaused) return;
    frame++;

    if(keys.left) { p.vx -= 1.4; p.dir = -1; }
    if(keys.right) { p.vx += 1.4; p.dir = 1; }
    if(keys.up && p.ground) { p.vy = -24; p.ground = false; }

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

        // Takip ve Soru Tetikleme
        if(dist < 300) {
            e.state = 'chase';
            e.vx = (p.x < e.x) ? -3.5 : 3.5;
            if(e.hasQuestion && dist < 60) triggerQuestion(e);
        } else {
            e.state = 'patrol';
            e.x += e.vx;
            if(e.x > e.startX + e.range || e.x < e.startX) e.vx *= -1;
        }

        // Hammer Brother Çekiç Atma
        if(e.type === 'hammer_bro' && dist < 600) {
            e.shootTimer++;
            if(e.shootTimer % 100 === 0) {
                let d = (p.x < e.x) ? -1 : 1;
                hammers.push({ x: e.x, y: e.y, vx: d * 5, vy: -15, angle: 0 });
            }
        }

        if(p.x < e.x + e.w && p.x + p.w > e.x && p.y < e.y + e.h && p.y + p.h > e.y) {
            if(p.vy > 5) { e.dead = true; p.vy = -15; score += 100; }
            else if(!e.hasQuestion) reset();
        }
    });

    hammers.forEach((h_obj, i) => {
        h_obj.x += h_obj.vx; h_obj.y += h_obj.vy; h_obj.vy += 0.6; h_obj.angle += 0.3;
        if(p.x < h_obj.x + 20 && p.x + p.w > h_obj.x && p.y < h_obj.y + 20 && p.y + p.h > h_obj.y) reset();
        if(h_obj.y > h) hammers.splice(i, 1);
    });

    if(p.y > h) reset();
    render();
    requestAnimationFrame(update);
}

function render() {
    ctx.fillStyle = '#5c94fc'; ctx.fillRect(0, 0, w, h);
    
    platforms.forEach(plat => {
        ctx.fillStyle = plat.color;
        ctx.fillRect(plat.x - camX, plat.y, plat.w, plat.h);
        ctx.fillStyle = '#228B22'; ctx.fillRect(plat.x - camX, plat.y, plat.w, 10);
    });

    enemies.forEach(e => {
        if(e.dead) return;
        ctx.save();
        if(e.hasQuestion) { ctx.font = "30px Arial"; ctx.fillText("❓", e.x - camX + 15, e.y - 15); }
        let shake = (e.state === 'chase') ? Math.sin(frame * 0.5) * 4 : 0;
        let eImg = (e.type === 'hammer_bro') ? img.bro : img.goomba;
        ctx.drawImage(eImg, e.x - camX + shake, e.y, e.w, e.h);
        ctx.restore();
    });

    hammers.forEach(h_obj => {
        ctx.save();
        ctx.translate(h_obj.x - camX + 12, h_obj.y + 12);
        ctx.rotate(h_obj.angle);
        ctx.drawImage(img.hammer, -15, -15, 30, 30);
        ctx.restore();
    });

    ctx.save();
    if(p.dir === -1) { ctx.translate(p.x-camX+p.w, p.y); ctx.scale(-1, 1); ctx.drawImage(img.mario, 0, 0, p.w, p.h); }
    else ctx.drawImage(img.mario, p.x-camX, p.y, p.w, p.h);
    ctx.restore();

    // Dokunmatik Tuş Çizimi
    ctx.globalAlpha = 0.5;
    touchButtons.forEach(btn => {
        ctx.fillStyle = "black";
        ctx.beginPath(); ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 15); ctx.fill();
        ctx.fillStyle = "white"; ctx.font = "24px Arial"; ctx.textAlign = "center";
        ctx.fillText(btn.label, btn.x + btn.w/2, btn.y + btn.h/1.6);
    });
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = "white"; ctx.font = "bold 24px Arial";
    ctx.fillText(`Puan: ${score} | Can: ${lives}`, 20, 40);
}

function reset() { lives--; p.x = 200; p.y = 100; p.vx = 0; p.vy = 0; if(lives <= 0) location.reload(); }

window.addEventListener('resize', init);
init(); update();
