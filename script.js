const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// --- DEĞİŞKENLER ---
let w, h, camX = 0, score = 0, lives = 3;
const gravity = 0.8;
const friction = 0.88;

// --- GÖRSELLER ---
const img = {
    mario: new Image(), goomba: new Image(), bro: new Image(), hammer: new Image()
};
// Resimlerin isimlerini kontrol et (mario.png, goomba.png vb. klasörde olmalı)
img.mario.src = 'mario.png';
img.goomba.src = 'goomba.png';
img.bro.src = 'hammer_brother.png';
img.hammer.src = 'hammer.png';

// Oyuncu Ayarları
const p = { 
    x: 200, y: 100, vx: 0, vy: 0, 
    w: 50, h: 50, ground: false, dir: 1 
};

const platforms = [];
const enemies = [];
const hammers = [];
const keys = { left: false, right: false, up: false };

// --- DOKUNMATİK TUŞLAR ---
const touchButtons = [
    { id: 'left', x: 20, y: 0, w: 100, h: 100, label: '◀' },
    { id: 'right', x: 140, y: 0, w: 100, h: 100, label: '▶' },
    { id: 'up', x: 0, y: 0, w: 130, h: 130, label: 'ZIPLA' }
];

function init() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;

    // Tuş yerleşimi
    touchButtons[0].y = h - 130;
    touchButtons[1].y = h - 130;
    touchButtons[2].x = w - 160;
    touchButtons[2].y = h - 160;

    platforms.length = 0;
    // ANA ZEMİN
    platforms.push({ x: 0, y: h - 100, w: 10000, h: 100, color: '#8B4513' });

    // Rastgele Platformlar
    for(let i = 1; i < 30; i++) {
        let px = i * 600;
        let py = h - 250 - Math.random() * 200;
        let pw = 250;
        platforms.push({ x: px, y: py, w: pw, h: 40, color: '#ab4013' });
        
        // Düşman ekle
        enemies.push({
            x: px + 100, y: py - 60, w: 50, h: 60, 
            type: i % 3 === 0 ? 'hammer_bro' : 'goomba', 
            vx: 2, vy: 0, startX: px, range: 150, startY: py - 60,
            timer: 0, dead: false
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

window.addEventListener('touchstart', e => {
    e.preventDefault();
    Array.from(e.touches).forEach(t => handleInput(t.clientX, t.clientY, true));
}, { passive: false });
window.addEventListener('touchend', () => { keys.left = keys.right = keys.up = false; });
window.addEventListener('mousedown', e => handleInput(e.clientX, e.clientY, true));
window.addEventListener('mouseup', () => { keys.left = keys.right = keys.up = false; });

// --- GÜNCELLEME ---
function update() {
    if(keys.left) { p.vx -= 1.5; p.dir = -1; }
    if(keys.right) { p.vx += 1.5; p.dir = 1; }
    if(keys.up && p.ground) { p.vy = -25; p.ground = false; }

    p.vx *= friction;
    p.vy += gravity;
    p.x += p.vx;
    p.y += p.vy;

    camX += (p.x - camX - w/4) * 0.1;

    // Zemin Çarpışma
    p.ground = false;
    platforms.forEach(plat => {
        if(p.x < plat.x + plat.w && p.x + p.w > plat.x && 
           p.y + p.h > plat.y && p.y + p.h < plat.y + plat.h + p.vy && p.vy >= 0) {
            p.y = plat.y - p.h;
            p.vy = 0;
            p.ground = true;
        }
    });

    // Düşmanlar ve Çekiçler
    enemies.forEach(e => {
        if(e.dead) return;
        e.x += e.vx;
        if(e.x > e.startX + e.range || e.x < e.startX) e.vx *= -1;

        if(e.type === 'hammer_bro') {
            e.timer++;
            if(e.timer % 90 === 0) {
                let d = p.x < e.x ? -1 : 1;
                hammers.push({ x: e.x, y: e.y, vx: d * 5, vy: -15, angle: 0 });
            }
        }
        // Mario Ölme
        if(p.x < e.x + e.w && p.x + p.w > e.x && p.y < e.y + e.h && p.y + p.h > e.y) {
            if(p.vy > 5) { e.dead = true; p.vy = -15; score += 200; }
            else reset();
        }
    });

    hammers.forEach((h_obj, i) => {
        h_obj.x += h_obj.vx; h_obj.y += h_obj.vy; h_obj.vy += 0.7; h_obj.angle += 0.2;
        if(p.x < h_obj.x + 20 && p.x + p.w > h_obj.x && p.y < h_obj.y + 20 && p.y + p.h > h_obj.y) reset();
        if(h_obj.y > h) hammers.splice(i, 1);
    });

    if(p.y > h) reset();
    render();
    requestAnimationFrame(update);
}

// --- ÇİZİM ---
function render() {
    ctx.fillStyle = '#5c94fc'; // Gökyüzü
    ctx.fillRect(0, 0, w, h);
    
    platforms.forEach(plat => {
        ctx.fillStyle = plat.color;
        ctx.fillRect(plat.x - camX, plat.y, plat.w, plat.h);
        ctx.fillStyle = '#228B22'; // Çimen
        ctx.fillRect(plat.x - camX, plat.y, plat.w, 10);
    });

    enemies.forEach(e => {
        if(e.dead) return;
        ctx.fillStyle = e.type === 'hammer_bro' ? 'green' : 'red';
        // Resim varsa çiz, yoksa kare çiz
        if(img.goomba.complete && img.goomba.width > 0) {
            let eImg = e.type === 'hammer_bro' ? img.bro : img.goomba;
            ctx.drawImage(eImg, e.x - camX, e.y, e.w, e.h);
        } else {
            ctx.fillRect(e.x - camX, e.y, e.w, e.h);
        }
    });

    hammers.forEach(h_obj => {
        ctx.fillStyle = 'gray';
        ctx.fillRect(h_obj.x - camX, h_obj.y, 20, 20);
    });

    // MARİO ÇİZİMİ (Kritik Bölge)
    ctx.save();
    if (img.mario.complete && img.mario.width > 0) {
        if(p.dir === -1) {
            ctx.translate(p.x - camX + p.w, p.y);
            ctx.scale(-1, 1);
            ctx.drawImage(img.mario, 0, 0, p.w, p.h);
        } else {
            ctx.drawImage(img.mario, p.x - camX, p.y, p.w, p.h);
        }
    } else {
        // RESİM YOKSA KIRMIZI KARE ÇİZ (Oyuncunun nerede olduğunu görmek için)
        ctx.fillStyle = 'red';
        ctx.fillRect(p.x - camX, p.y, p.w, p.h);
        ctx.fillStyle = 'white';
        ctx.fillText("MARIO", p.x - camX, p.y - 5);
    }
    ctx.restore();

    // Arayüz ve Butonlar
    ctx.globalAlpha = 0.6;
    touchButtons.forEach(btn => {
        ctx.fillStyle = "black";
        ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
        ctx.fillStyle = "white";
        ctx.font = "20px Arial";
        ctx.fillText(btn.label, btn.x + 10, btn.y + 60);
    });
    ctx.globalAlpha = 1.0;
    
    ctx.fillStyle = "white";
    ctx.font = "30px Arial";
    ctx.fillText(`SKOR: ${score}  CAN: ${lives}`, 20, 40);
}

function reset() {
    lives--;
    if(lives <= 0) { alert("OYUN BİTTİ!"); location.reload(); }
    p.x = 200; p.y = 100; p.vx = 0; p.vy = 0;
}

window.addEventListener('resize', init);
init();
update();
