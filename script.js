const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let w, h, camX = 0, score = 0, lives = 3, frame = 0;
const gravity = 0.8;
const friction = 0.88;

// --- GÖRSELLER ---
const img = {
    mario: new Image(), goomba: new Image(), koopa: new Image(),
    bullet: new Image(), bro: new Image(), hammer: new Image()
};
// Resim yollarının klasöründeki isimlerle aynı olduğundan emin ol
img.mario.src = 'mario.png';
img.goomba.src = 'goomba.png';
img.koopa.src = 'koopa.png';
img.bullet.src = 'bullet.png';
img.bro.src = 'hammer_brother.png';
img.hammer.src = 'hammer.png';

const p = { x: 100, y: 0, vx: 0, vy: 0, w: 45, h: 45, ground: false, dir: 1 };
const platforms = [];
const enemies = [];
const hammers = [];
const keys = { left: false, right: false, up: false };

function init() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;

    // Ana Zemin
    platforms.push({ x: 0, y: h - 60, w: 10000, h: 60, color: '#70483c' });

    // Rastgele Bölüm Oluşturma
    for(let i = 1; i < 40; i++) {
        let px = i * 450 + Math.random() * 100;
        let py = h - 150 - Math.random() * 200;
        let pw = 160 + Math.random() * 100;
        platforms.push({ x: px, y: py, w: pw, h: 35, color: '#ab4013' });

        // Hammer Brother (Her 3 platformda bir)
        if(i % 3 === 0) {
            enemies.push({
                x: px + 30, y: py - 60, w: 45, h: 60, 
                type: 'hammer_bro', vx: 1.5, vy: 0, 
                startX: px, range: pw - 50, startY: py - 60,
                timer: 0, dead: false
            });
        } else {
            enemies.push({
                x: px + 10, y: py - 45, w: 40, h: 40, 
                type: 'goomba', vx: 2, startX: px, range: pw - 40, dead: false
            });
        }
    }
}

function update() {
    frame++;
    if(keys.left) { p.vx -= 1.2; p.dir = -1; }
    if(keys.right) { p.vx += 1.2; p.dir = 1; }
    if(keys.up && p.ground) { p.vy = -22; p.ground = false; }

    p.vx *= friction;
    p.vy += gravity;
    p.x += p.vx;
    p.y += p.vy;

    camX += (p.x - camX - w/3) * 0.1;

    // Zemin ve Platform Çarpışması
    p.ground = false;
    platforms.forEach(plat => {
        if(p.x < plat.x + plat.w && p.x + p.w > plat.x && 
           p.y + p.h > plat.y && p.y + p.h < plat.y + plat.h + p.vy && p.vy >= 0) {
            p.y = plat.y - p.h;
            p.vy = 0;
            p.ground = true;
        }
    });

    // Düşmanlar ve Hammer Bro Mekaniği
    enemies.forEach(e => {
        if(e.dead) return;
        e.x += e.vx;
        if(e.x > e.startX + e.range || e.x < e.startX) e.vx *= -1;

        if(e.type === 'hammer_bro') {
            e.timer++;
            // Çekiç fırlatma: Mario'nun yönüne göre kavisli
            if(e.timer % 90 === 0) { 
                let d = (p.x < e.x) ? -1 : 1;
                hammers.push({ x: e.x, y: e.y, vx: d * 5, vy: -15, angle: 0 });
            }
            // Zıplama hareketi
            if(e.timer % 130 === 0) e.vy = -10;
            e.y += e.vy; e.vy += 0.6;
            if(e.y > e.startY) { e.y = e.startY; e.vy = 0; }
        }

        // Mario Çarpışma (Üstten basma kontrolü)
        if(p.x < e.x + e.w && p.x + p.w > e.x && p.y < e.y + e.h && p.y + p.h > e.y) {
            if(p.vy > 5) { 
                e.dead = true; p.vy = -12; score += 200; 
            } else { reset(); }
        }
    });

    // Çekiçlerin Hareketi ve Fiziği
    hammers.forEach((h_obj, i) => {
        h_obj.x += h_obj.vx; 
        h_obj.y += h_obj.vy; 
        h_obj.vy += 0.6; // Çekiç yerçekimi
        h_obj.angle += 0.25; // Dönme efekti
        
        // Çekiç çarpışma
        if(p.x < h_obj.x + 20 && p.x + p.w > h_obj.x && p.y < h_obj.y + 20 && p.y + p.h > h_obj.y) reset();
        if(h_obj.y > h + 100) hammers.splice(i, 1);
    });

    if(p.y > h + 100) reset();
    render();
    requestAnimationFrame(update);
}

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
        let enemyImg = e.type === 'hammer_bro' ? img.bro : img.goomba;
        ctx.drawImage(enemyImg, e.x - camX, e.y, e.w, e.h);
    });

    // Çekiçler
    hammers.forEach(h_obj => {
        ctx.save();
        ctx.translate(h_obj.x - camX + 10, h_obj.y + 10);
        ctx.rotate(h_obj.angle);
        ctx.drawImage(img.hammer, -10, -10, 25, 25);
        ctx.restore();
    });

    // Mario Çizimi (Yöne göre çevirme)
    ctx.save();
    if(p.dir === -1) {
        ctx.translate(p.x - camX + p.w, p.y);
        ctx.scale(-1, 1);
        ctx.drawImage(img.mario, 0, 0, p.w, p.h);
    } else {
        ctx.drawImage(img.mario, p.x - camX, p.y, p.w, p.h);
    }
    ctx.restore();

    document.getElementById('score').innerText = score;
    document.getElementById('lives').innerText = lives;
}

function reset() {
    lives--;
    if(lives <= 0) { 
        alert("Oyun Bitti! Skorun: " + score); 
        location.reload(); 
    }
    p.x = 100; p.y = 0; p.vx = 0; p.vy = 0;
}

// Kontroller
window.addEventListener('keydown', e => {
    if(e.key === 'ArrowLeft') keys.left = true;
    if(e.key === 'ArrowRight') keys.right = true;
    if(e.key === 'ArrowUp' || e.key === ' ') keys.up = true;
});
window.addEventListener('keyup', e => {
    if(e.key === 'ArrowLeft') keys.left = false;
    if(e.key === 'ArrowRight') keys.right = false;
    // --- 1. DOKUNMATİK TUŞ TANIMLAMALARI ---
const touchButtons = [
    { id: 'left', x: 50, y: 0, w: 80, h: 80, label: '◀' },
    { id: 'right', x: 150, y: 0, w: 80, h: 80, label: '▶' },
    { id: 'up', x: 0, y: 0, w: 100, h: 100, label: '▲' } // Zıplama sağda olacak
];

// Tuşların konumlarını ekranın altına göre ayarla
const updateButtonPositions = () => {
    const bottomY = h - 120;
    touchButtons[0].y = bottomY; // Sol ok
    touchButtons[1].y = bottomY; // Sağ ok
    touchButtons[2].x = w - 150; // Zıplama tuşu en sağda
    touchButtons[2].y = bottomY - 20;
};

// --- 2. DOKUNMATİK OLAYLARI (MOUSE & TOUCH) ---
const handleInteraction = (ix, iy, isDown) => {
    touchButtons.forEach(btn => {
        if (ix > btn.x && ix < btn.x + btn.w && iy > btn.y && iy < btn.y + btn.h) {
            if (btn.id === 'left') keys.left = isDown;
            if (btn.id === 'right') keys.right = isDown;
            if (btn.id === 'up') keys.up = isDown;
        }
    });
};

// Mouse ve Dokunma dinleyicileri
window.addEventListener('mousedown', (e) => handleInteraction(e.clientX, e.clientY, true));
window.addEventListener('mouseup', () => { keys.left = false; keys.right = false; keys.up = false; });
window.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    handleInteraction(touch.clientX, touch.clientY, true);
}, { passive: false });
window.addEventListener('touchend', () => { keys.left = false; keys.right = false; keys.up = false; });

// --- 3. TUŞLARI EKRANA ÇİZME (render fonksiyonunun içine ekle) ---
function drawControls() {
    ctx.globalAlpha = 0.5; // Tuşlar yarı saydam olsun
    touchButtons.forEach(btn => {
        ctx.fillStyle = "#333";
        ctx.beginPath();
        ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 15);
        ctx.fill();
        
        ctx.fillStyle = "white";
        ctx.font = "bold 40px Arial";
        ctx.textAlign = "center";
        ctx.fillText(btn.label, btn.x + btn.w/2, btn.y + btn.h/1.5);
    });
    ctx.globalAlpha = 1.0;
}

// --- 4. ANA DÖNGÜ GÜNCELLEMESİ ---
// init() fonksiyonunun sonuna şunu ekle:
updateButtonPositions();

// render() fonksiyonunun en sonuna şunu ekle:
drawControls();
    if(e.key === 'ArrowUp' || e.key === ' ') keys.up = false;
});

init();
update();
