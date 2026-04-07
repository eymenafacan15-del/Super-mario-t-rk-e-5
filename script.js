const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// --- DEĞİŞKENLER VE AYARLAR ---
let w, h, camX = 0, score = 0, lives = 3, frame = 0;
const gravity = 0.8;
const friction = 0.88;

// --- GÖRSELLER ---
const img = {
    mario: new Image(), goomba: new Image(), koopa: new Image(),
    bullet: new Image(), bro: new Image(), hammer: new Image()
};
img.mario.src = 'mario.png';
img.goomba.src = 'goomba.png';
img.koopa.src = 'koopa.png';
img.bullet.src = 'bullet.png';
img.bro.src = 'hammer_brother.png';
img.hammer.src = 'hammer.png';

const p = { x: 100, y: 0, vx: 0, vy: 0, w: 48, h: 48, ground: false, dir: 1 };
const platforms = [];
const enemies = [];
const hammers = [];
const keys = { left: false, right: false, up: false };

// --- DOKUNMATİK TUŞLAR (Tahta İçin) ---
const touchButtons = [
    { id: 'left', x: 40, y: 0, w: 90, h: 90, label: '◀' },
    { id: 'right', x: 150, y: 0, w: 90, h: 90, label: '▶' },
    { id: 'up', x: 0, y: 0, w: 110, h: 110, label: 'Zıpla' }
];

function init() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;

    // Tuş konumlarını ekrana göre ayarla
    touchButtons[0].y = h - 130;
    touchButtons[1].y = h - 130;
    touchButtons[2].x = w - 150;
    touchButtons[2].y = h - 150;

    // Zemin ve Bölüm Tasarımı
    platforms.push({ x: 0, y: h - 60, w: 15000, h: 60, color: '#70483c' });
    for(let i = 1; i < 50; i++) {
        let px = i * 500 + Math.random() * 100;
        let py = h - 180 - Math.random() * 220;
        let pw = 180 + Math.random() * 120;
        platforms.push({ x: px, y: py, w: pw, h: 40, color: '#ab4013' });

        // Düşman Yerleştirme
        let type = i % 4 === 0 ? 'hammer_bro' : (i % 7 === 0 ? 'bullet' : 'goomba');
        enemies.push({
            x: px + 40, y: py - 60, w: 45, h: 55, 
            type: type, vx: type === 'bullet' ? 7 : 1.8, vy: 0, 
            startX: px, range: pw - 60, startY: py - 60,
            timer: 0, dead: false
        });
    }
}

// --- ETKİLEŞİM SİSTEMİ (Mouse & Touch) ---
function handleInput(tx, ty, isDown) {
    touchButtons.forEach(btn => {
        if (tx > btn.x && tx < btn.x + btn.w && ty > btn.y && ty < btn.y + btn.h) {
            keys[btn.id] = isDown;
        }
    });
}

window.addEventListener('touchstart', e => {
    e.preventDefault();
    Array.from(e.touches).forEach(t => handleInput(t.clientX, t.clientY, true));
}, { passive: false });

window.addEventListener('touchend', e => {
    keys.left = keys.right = keys.up = false;
});

window.addEventListener('mousedown', e => handleInput(e.clientX, e.clientY, true));
window.addEventListener('mouseup', () => keys.left = keys.right = keys.up = false);

// Klavye desteği de kalsın
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

// --- OYUN MANTIĞI ---
function update() {
    frame++;
    if(keys.left) { p.vx -= 1.3; p.dir = -1; }
    if(keys.right) { p.vx += 1.3; p.dir = 1; }
    if(keys.up && p.ground) { p.vy = -23; p.ground = false; }

    p.vx *= friction;
    p.vy += gravity;
    p.x += p.vx;
    p.y += p.vy;

    camX += (p.x - camX - w/3) * 0.1;

    // Platform Çarpışmaları
    p.ground = false;
    platforms.forEach(plat => {
        if(p.x < plat.x + plat.w && p.x + p.w > plat.x && 
           p.y + p.h > plat.y && p.y + p.h < plat.y + plat.h + p.vy && p.vy >= 0) {
            p.y = plat.y - p.h;
            p.vy = 0;
            p.ground = true;
        }
    });

    // Düşman ve Çekiç Yönetimi
    enemies.forEach(e => {
        if(e.dead) return;
        e.x += e.vx;
        if(e.type !== 'bullet' && (e.x > e.startX + e.range || e.x < e.startX)) e.vx *= -1;

        if(e.type === 'hammer_bro') {
            e.timer++;
            if(e.timer % 85 === 0) { // Çekiç fırlat
                let d = p.x < e.x ? -1 : 1;
                hammers.push({ x: e.x, y: e.y, vx: d * 5, vy: -16, angle: 0 });
            }
            if(e.timer % 140 === 0) e.vy = -12; // Zıpla
            e.y += e.vy; e.vy += 0.7;
            if(e.y > e.startY) { e.y = e.startY; e.vy = 0; }
        }

        // Mario Çarpışma
        if(p.x < e.x + e.w && p.x + p.w > e.x && p.y < e.y + e.h && p.y + p.h > e.y) {
            if(p.vy > 6) { e.dead = true; p.vy = -14; score += 200; }
            else reset();
        }
    });

    hammers.forEach((h_obj, i) => {
        h_obj.x += h_obj.vx; h_obj.y += h_obj.vy; h_obj.vy += 0.65; h_obj.angle += 0.3;
        if(p.x < h_obj.x + 20 && p.x + p.w > h_obj.x && p.y < h_obj.y + 20 && p.y + p.h > h_obj.y) reset();
        if(h_obj.y > h + 200) hammers.splice(i, 1);
    });

    if(p.y > h + 200) reset();
    render();
    requestAnimationFrame(update);
}

// --- GÖRSEL ÇİZİM ---
function render() {
    ctx.clearRect(0, 0, w, h);
    
    // Platformlar
    platforms.forEach(plat => {
        ctx.fillStyle = plat.color;
        ctx.fillRect(plat.x - camX, plat.y, plat.w, plat.h);
    });

    // Düşmanlar
    enemies.forEach(e => {
        if(e.dead) return;
        let eImg = img[e.type === 'hammer_bro' ? 'bro' : (e.type === 'bullet' ? 'bullet' : 'goomba')];
        ctx.drawImage(eImg, e.x - camX, e.y, e.w, e.h);
    });

    // Çekiçler
    hammers.forEach(h_obj => {
        ctx.save();
        ctx.translate(h_obj.x - camX + 12, h_obj.y + 12);
        ctx.rotate(h_obj.angle);
        ctx.drawImage(img.hammer, -12, -12, 24, 24);
        ctx.restore();
    });

    // Mario
    ctx.save();
    if(p.dir === -1) {
        ctx.translate(p.x - camX + p.w, p.y);
        ctx.scale(-1, 1);
        ctx.drawImage(img.mario, 0, 0, p.w, p.h);
    } else {
        ctx.drawImage(img.mario, p.x - camX, p.y, p.w, p.h);
    }
    ctx.restore();

    // Dokunmatik Butonları Çiz
    ctx.globalAlpha = 0.4;
    touchButtons.forEach(btn => {
        ctx.fillStyle = "#222";
        ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
        ctx.fillStyle = "white";
        ctx.font = "bold 25px Arial";
        ctx.textAlign = "center";
        ctx.fillText(btn.label, btn.x + btn.w/2, btn.y + btn.h/1.7);
    });
    ctx.globalAlpha = 1.0;

    document.getElementById('score').innerText = score;
    document.getElementById('lives').innerText = lives;
}

function reset() {
    lives--;
    if(lives <= 0) { alert("Oyun Bitti! Skor: " + score); location.reload(); }
    p.x = 100; p.y = 0; p.vx = 0; p.vy = 0;
}

window.addEventListener('resize', init);
init();
update();
