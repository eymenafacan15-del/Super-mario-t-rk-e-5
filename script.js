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

// Mario Başlangıç (Havada başlar, zemine düşer)
const p = { x: 100, y: 50, vx: 0, vy: 0, w: 48, h: 48, ground: false, dir: 1 };
const platforms = [];
const enemies = [];
const hammers = [];
const keys = { left: false, right: false, up: false };

// --- DOKUNMATİK TUŞLAR (Dokunmatik Tahta İçin) ---
const touchButtons = [
    { id: 'left', x: 40, y: 0, w: 100, h: 100, label: '◀' },
    { id: 'right', x: 160, y: 0, w: 100, h: 100, label: '▶' },
    { id: 'up', x: 0, y: 0, w: 120, h: 120, label: 'Zıpla' }
];

function init() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;

    // Tuş konumlarını ekranın altına sabitle
    touchButtons[0].y = h - 140;
    touchButtons[1].y = h - 140;
    touchButtons[2].x = w - 160;
    touchButtons[2].y = h - 160;

    platforms.length = 0; // Sıfırla
    
    // ANA ZEMİN (Kalın ve belirgin)
    platforms.push({ 
        x: 0, 
        y: h - 100, 
        w: 50000, 
        h: 100, 
        color: '#8B4513' // Kahverengi toprak
    });

    // RASTGELE PLATFORMLAR VE DÜŞMANLAR
    for(let i = 1; i < 60; i++) {
        let px = i * 550 + Math.random() * 150;
        let py = h - 250 - Math.random() * 250;
        let pw = 200 + Math.random() * 150;
        
        platforms.push({ x: px, y: py, w: pw, h: 45, color: '#ab4013' });

        // Düşman Tipi Belirle
        let type = i % 4 === 0 ? 'hammer_bro' : (i % 6 === 0 ? 'bullet' : 'goomba');
        enemies.push({
            x: px + 50, y: py - 70, w: 45, h: 55, 
            type: type, vx: type === 'bullet' ? 8 : 2, vy: 0, 
            startX: px, range: pw - 60, startY: py - 60,
            timer: 0, dead: false
        });
    }
}

// --- GİRİŞ KONTROLLERİ (MOUSE, TOUCH, KEYBOARD) ---
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

// --- GÜNCELLEME DÖNGÜSÜ ---
function update() {
    frame++;
    if(keys.left) { p.vx -= 1.4; p.dir = -1; }
    if(keys.right) { p.vx += 1.4; p.dir = 1; }
    if(keys.up && p.ground) { p.vy = -24; p.ground = false; }

    p.vx *= friction;
    p.vy += gravity;
    p.x += p.vx;
    p.y += p.vy;

    camX += (p.x - camX - w/3) * 0.1;

    // Çarpışma Kontrolü (Platformlar)
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
            if(e.timer % 80 === 0) { // Kavisli Çekiç Atma
                let d = p.x < e.x ? -1 : 1;
                hammers.push({ x: e.x, y: e.y, vx: d * 6, vy: -18, angle: 0 });
            }
            if(e.timer % 120 === 0) e.vy = -14; // Zıplama
            e.y += e.vy; e.vy += 0.8;
            if(e.y > e.startY) { e.y = e.startY; e.vy = 0; }
        }

        if(p.x < e.x + e.w && p.x + p.w > e.x && p.y < e.y + e.h && p.y + p.h > e.y) {
            if(p.vy > 6) { e.dead = true; p.vy = -15; score += 200; }
            else reset();
        }
    });

    hammers.forEach((h_obj, i) => {
        h_obj.x += h_obj.vx; h_obj.y += h_obj.vy; h_obj.vy += 0.7; h_obj.angle += 0.35;
        if(p.x < h_obj.x + 20 && p.x + p.w > h_obj.x && p.y < h_obj.y + 20 && p.y + p.h > h_obj.y) reset();
        if(h_obj.y > h + 300) hammers.splice(i, 1);
    });

    if(p.y > h + 300) reset();
    render();
    requestAnimationFrame(update);
}

// --- ÇİZİM ---
function render() {
    // Arka plan (Gökyüzü)
    ctx.fillStyle = '#5c94fc';
    ctx.fillRect(0, 0, w, h);
    
    // Platformlar ve Zemin
    platforms.forEach(plat => {
        ctx.fillStyle = plat.color;
        ctx.fillRect(plat.x - camX, plat.y, plat.w, plat.h);
        // Üst kısma yeşil çimen şeridi
        ctx.fillStyle = '#228B22';
        ctx.fillRect(plat.x - camX, plat.y, plat.w, 8);
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
        ctx.drawImage(img.hammer, -15, -15, 30, 30);
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

    // Dokunmatik Butonlar (Yarı saydam siyah)
    ctx.globalAlpha = 0.5;
    touchButtons.forEach(btn => {
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 20);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = "bold 30px Arial";
        ctx.textAlign = "center";
        ctx.fillText(btn.label, btn.x + btn.w/2, btn.y + btn.h/1.6);
    });
    ctx.globalAlpha = 1.0;

    document.getElementById('score').innerText = score;
    document.getElementById('lives').innerText = lives;
}

function reset() {
    lives--;
    if(lives <= 0) { alert("Oyun Bitti! Skorun: " + score); location.reload(); }
    p.x = 100; p.y = 50; p.vx = 0; p.vy = 0;
}

window.addEventListener('resize', init);
init();
update();
