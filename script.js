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
// Resimlerin isimlerini kontrol et (klasörde olmalı)
img.mario.src = 'mario.png';
img.goomba.src = 'goomba.png';
img.bro.src = 'hammer_brother.png';
img.hammer.src = 'hammer.png';

// Oyuncu Ayarları (Başlangıç pozisyonu)
const p = { x: 400, y: 100, vx: 0, vy: 0, w: 50, h: 50, ground: false, dir: 1 };
const platforms = [];
const enemies = [];
const hammers = [];
const keys = { left: false, right: false, up: false };

// --- SORU HAVUZU ---
const questions = [
    { q: "Türkiye'nin plakası kaçtır?", a: "tr" },
    { q: "8 x 9 kaç eder?", a: "72" },
    { q: "Güneş bir gezegen midir? (E/H)", a: "h" },
    { q: "Cumhuriyet kaç yılında kuruldu?", a: "1923" }
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
    
    // Tuş yerleşimi (Alt köşelere)
    touchButtons[0].y = h - 120;
    touchButtons[1].y = h - 120;
    touchButtons[2].x = w - 140;
    touchButtons[2].y = h - 140;

    platforms.length = 0;
    enemies.length = 0;

    // ANA ZEMİN
    platforms.push({ x: 0, y: h - 100, w: 40000, h: 100, color: '#8B4513' });

    // DÜNYA TASARIMI (Canavarlar zeminde ve platformda)
    for(let i = 1; i < 60; i++) {
        let px = i * 450 + Math.random() * 200;
        let onGround = Math.random() > 0.3; // Canavarların çoğu yerde
        let ey = onGround ? h - 155 : h - 350 - Math.random() * 100;
        
        if(!onGround) {
            platforms.push({ x: px - 50, y: ey + 55, w: 250, h: 40, color: '#ab4013' });
        }

        enemies.push({
            x: px, y: ey, w: 55, h: 55,
            type: (i % 6 === 0) ? 'hammer_bro' : 'goomba',
            vx: (2 + Math.random() * 2) * (Math.random() > 0.5 ? 1 : -1), // Rastgele hız
            vy: 0,
            startX: px - 100, range: 200, startY: ey,
            hasQuestion: Math.random() > 0.7, // Bazı canavarlar soru sorar
            state: 'patrol',
            dead: false, shootTimer: 0, jumpTimer: 0
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
    e.hasQuestion = false; // Bir canavar sadece bir kez soru sorar
    setTimeout(() => {
        let q = questions[Math.floor(Math.random() * questions.length)];
        let ans = prompt("DUR! Canavarın sorusunu bilmelisin:\n" + q.q);
        if(ans && ans.toLowerCase() === q.a) {
            alert("TEBRİKLER! Bildin, canavar kaçtı.");
            e.dead = true; score += 500;
        } else {
            alert("YANLIŞ! Can kaybettin.");
            lives--;
        }
        isPaused = false;
        if(lives <= 0) location.reload();
    }, 50);
}

// --- OYUN DÖNGÜSÜ (Gelişmiş Saldırı Mantığı) ---
function update() {
    if(isPaused) return; // Soru ekranındayken her şeyi durdur
    frame++;

    // Mario Hareket
    if(keys.left) { p.vx -= 1.5; p.dir = -1; }
    if(keys.right) { p.vx += 1.5; p.dir = 1; }
    if(keys.up && p.ground) { p.vy = -25; p.ground = false; }

    p.vx *= friction; p.vy += gravity;
    p.x += p.vx; p.y += p.vy;
    camX += (p.x - camX - w/3) * 0.1; // Kamera takibi

    // Zemin ve Platform Çarpışma
    p.ground = false;
    platforms.forEach(plat => {
        if(p.x < plat.x + plat.w && p.x + p.w > plat.x && 
           p.y + p.h > plat.y && p.y + p.h < plat.y + plat.h + p.vy && p.vy >= 0) {
            p.y = plat.y - p.h; p.vy = 0; p.ground = true;
        }
    });

    // --- CANAVAR SALDIRI MANTIĞI ---
    enemies.forEach(e => {
        if(e.dead) return;
        let dist = Math.abs(p.x - e.x);

        // **AGRESİF SALDIRI: Canavar sürekli Mario'yu takip eder**
        e.state = 'chase';
        e.vx = (p.x < e.x) ? -3.8 : 3.8; // Mario'nun üzerine koş (Goomba'lar hızlandı)
        e.x += e.vx;

        // **ZIPLAMA SALDIRISI: Mario yakındaysa ve canavar yerdeyse zıpla**
        e.jumpTimer++;
        if(e.jumpTimer % 120 === 0 && dist < 400 && Math.random() > 0.6) {
            // Eğer canavar zemindeyse zıplar (basit yerçekimi kontrolü)
            e.vy = -14;
        }
        e.y += e.vy; e.vy += gravity * 0.8; // Canavar yerçekimi

        // Canavar Platform Çarpışma (Platformda kalmaları için)
        let enemyGround = false;
        platforms.forEach(plat => {
            if(e.x < plat.x + plat.w && e.x + e.w > plat.x && 
               e.y + e.h > plat.y && e.y + e.h < plat.y + plat.h + e.vy && e.vy >= 0) {
                e.y = plat.y - e.h; e.vy = 0; enemyGround = true;
            }
        });
        if(e.y > h - 155) { e.y = h - 155; e.vy = 0; enemyGround = true; } // Ana zemine basma

        // **SORU SALDIRISI: Yaklaşınca soru tetikle**
        if(e.hasQuestion && dist < 65) triggerQuestion(e);

        // **HAMMER BRO SALDIRISI: Sürekli Çekiç Yağmuru**
        if(e.type === 'hammer_bro' && dist < 700) {
            e.shootTimer++;
            if(e.shootTimer % 75 === 0) { // Daha sık çekiç at
                let d = (p.x < e.x) ? -1 : 1;
                // Kavisli yukarı atış
                hammers.push({ x: e.x, y: e.y, vx: d * (5 + Math.random() * 2), vy: -18, angle: 0 });
            }
        }

        // Mario Çarpışma: Üstüne basma veya çarpma
        if(p.x < e.x + e.w && p.x + p.w > e.x && p.y < e.y + e.h && p.y + p.h > e.y) {
            if(p.vy > 5) { e.dead = true; p.vy = -15; score += 200; } // Üstüne basarak öldür
            else if(!e.hasQuestion) reset(); // Soru sormuyorsa öldürür
        }
    });

    // Çekiçlerin Hareketi ve Fiziği
    hammers.forEach((h_obj, i) => {
        h_obj.x += h_obj.vx; h_obj.y += h_obj.vy; h_obj.vy += 0.65; h_obj.angle += 0.35; // Çekiç fiziği
        if(p.x < h_obj.x + 20 && p.x + p.w > h_obj.x && p.y < h_obj.y + 20 && p.y + p.h > h_obj.y) reset(); // Çekiç değerse ölür
        if(h_obj.y > h + 300) hammers.splice(i, 1); // Ekran dışına çıkınca sil
    });

    // Mario ekran altına düşerse ölür
    if(p.y > h + 300) reset();
    render();
    requestAnimationFrame(update);
}

// --- ÇİZİM ---
function render() {
    ctx.fillStyle = '#5c94fc'; ctx.fillRect(0, 0, w, h); // Gökyüzü
    
    // Platformlar ve Zemin
    platforms.forEach(plat => {
        ctx.fillStyle = plat.color;
        ctx.fillRect(plat.x - camX, plat.y, plat.w, plat.h);
        ctx.fillStyle = '#228B22'; // Yeşil çimen
        ctx.fillRect(plat.x - camX, plat.y, plat.w, 8);
    });

    // Canavarlar ve Animasyon Efektleri
    enemies.forEach(e => {
        if(e.dead) return;
        ctx.save();
        if(e.hasQuestion) { 
            ctx.fillStyle = "yellow"; ctx.font = "bold 25px Arial";
            ctx.fillText("❓", e.x - camX + 15, e.y - 15); 
        }
        
        // Takip modundaysa hafifçe titreme (Öfke animasyonu)
        let shake = (e.state === 'chase') ? Math.sin(frame) * 4 : 0;
        
        let eImg = (e.type === 'hammer_bro' ? img.bro : img.goomba);
        ctx.drawImage(eImg, e.x - camX + shake, e.y, e.w, e.h);
        ctx.restore();
    });

    // Çekiçler (Dönme efekti)
    hammers.forEach(h_obj => {
        ctx.save();
        ctx.translate(h_obj.x - camX + 12, h_obj.y + 12);
        ctx.rotate(h_obj.angle);
        ctx.drawImage(img.hammer, -15, -15, 30, 30);
        ctx.restore();
    });

    // Mario (Yöne göre çevirme)
    ctx.save();
    if(p.dir === -1) { ctx.translate(p.x-camX+p.w, p.y); ctx.scale(-1, 1); ctx.drawImage(img.mario, 0, 0, p.w, p.h); }
    else ctx.drawImage(img.mario, p.x-camX, p.y, p.w, p.h);
    ctx.restore();

    // Dokunmatik Tuş Çizimi
    ctx.globalAlpha = 0.5;
    touchButtons.forEach(btn => {
        ctx.fillStyle = "black";
        ctx.beginPath(); ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 15); ctx.fill();
        ctx.fillStyle = "white"; ctx.font = "bold 24px Arial"; ctx.textAlign = "center";
        ctx.fillText(btn.label, btn.x + btn.w/2, btn.y + btn.h/1.6);
    });
    ctx.globalAlpha = 1.0;
    
    // UI (Skor ve Can)
    ctx.fillStyle = "white"; ctx.font = "bold 26px Arial";
    ctx.fillText(`SKOR: ${score}  |  CAN: ${lives}`, 20, 40);
}

// Oyuncu ve Bölüm Reset fonksiyonları
function reset() { 
    lives--; 
    p.x = 400; p.y = 100; p.vx = 0; p.vy = 0; 
    if(lives <= 0) { alert("OYUN BİTTİ!"); location.reload(); }
}

// Klavye Kontrolleri
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

window.addEventListener('resize', init);
init(); update();
