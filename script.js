const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let w, h, camX = 0, score = 0, lives = 3, frame = 0;
let isPaused = false; 
let currentQuestion = null; 
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
    { q: "Özel adlara getirilen ekleri ayırmak için ne kullanılır?", options: ["Nokta", "Virgül", "Kesme İşareti", "Ünlem"], a: 2 },
    { q: "Cümle sonuna nokta konan yere '?' gelirse o cümle nedir?", options: ["Ünlem", "Soru", "Devrik", "Eksiltili"], a: 1 },
    { q: "Anlatım olarak tamamlanmamış cümlelerin sonuna ne konur?", options: ["Nokta", "Üç Nokta", "İki Nokta", "Virgül"], a: 1 },
    { q: "Hitap kelimelerinden (Sevgili Anneciğim) sonra ne konur?", options: ["Soru İşareti", "Nokta", "Ünlem", "Virgül"], a: 3 },
    { q: "Korku, acı ve şaşkınlık belirten cümlenin sonu hangisidir?", options: ["!", "?", ".", ":"], a: 0 }
];

// --- BUTONLAR ---
const touchButtons = [
    { id: 'a', x: 30, y: 0, w: 90, h: 90, label: '◀' },
    { id: 'd', x: 140, y: 0, w: 90, h: 90, label: '▶' },
    { id: 'w', x: 0, y: 0, w: 110, h: 110, label: 'Zıpla' }
];

// Soru Şıkları Butonları
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

    for(let i = 1; i < 40; i++) {
        let px = i * 600 + Math.random() * 300;
        enemies.push({
            x: px, y: h - 155, w: 55, h: 55,
            type: (i % 5 === 0) ? 'hammer_bro' : 'goomba',
            vx: -3.5, vy: 0, hasQuestion: true, dead: false
        });
    }
}

// --- DOKUNMATİK VE TIKLAMA YÖNETİMİ ---
function handlePress(tx, ty) {
    if (isPaused && currentQuestion) {
        // Şık butonlarına tıklandı mı?
        optionButtons.forEach((btn, index) => {
            if (tx > btn.x && tx < btn.x + btn.w && ty > btn.y && ty < btn.y + btn.h) {
                if (index === currentQuestion.a) {
                    alert("TEBRİKLER! Doğru Cevap.");
                    score += 500;
                } else {
                    alert("YANLIŞ! Bir canın gitti.");
                    lives--;
                }
                isPaused = false;
                currentQuestion = null;
                if (lives <= 0) location.reload();
            }
        });
    } else {
        // Hareket butonları
        touchButtons.forEach(btn => {
            if (tx > btn.x && tx < btn.x + btn.w && ty > btn.y && ty < btn.y + btn.h) {
                keys[btn.id] = true;
            }
        });
    }
}

window.addEventListener('mousedown', e => handlePress(e.clientX, e.clientY));
window.addEventListener('mouseup', () => { keys.a = keys.d = keys.w = false; });
window.addEventListener('touchstart', e => { 
    e.preventDefault(); 
    Array.from(e.touches).forEach(t => handlePress(t.clientX, t.clientY)); 
}, { passive: false });
window.addEventListener('touchend', () => { keys.a = keys.d = keys.w = false; });

// Klavye WASD
window.addEventListener('keydown', e => { let k = e.key.toLowerCase(); if(keys.hasOwnProperty(k)) keys[k] = true; });
window.addEventListener('keyup', e => { let k = e.key.toLowerCase(); if(keys.hasOwnProperty(k)) keys[k] = false; });

function triggerQuestion(e) {
    isPaused = true;
    e.hasQuestion = false;
    currentQuestion = questions[Math.floor(Math.random() * questions.length)];
    
    optionButtons.length = 0;
    const bw = 350, bh = 60;
    currentQuestion.options.forEach((opt, i) => {
        optionButtons.push({
            x: w / 2 - bw / 2,
            y: h / 2 - 40 + (i * 75),
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
        if(p.x < plat.x + plat.w && p.x + p.w > plat.x && p.y + p.h > plat.y && p.y + p.h < plat.y + 20 && p.vy >= 0) {
            p.y = plat.y - p.h; p.vy = 0; p.ground = true;
        }
    });

    enemies.forEach(e => {
        if(e.dead) return;
        e.x += (p.x < e.x) ? -3.5 : 3.5; // Agresif takip
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
        ctx.fillStyle = 'green'; ctx.fillRect(plat.x - camX, plat.y, plat.w, 10);
    });

    // Canavarlar
    enemies.forEach(e => {
        if(e.dead) return;
        if(e.hasQuestion) { ctx.font = "30px Arial"; ctx.fillText("❓", e.x - camX + 10, e.y - 15); }
        ctx.drawImage(e.type === 'hammer_bro' ? img.bro : img.goomba, e.x - camX, e.y, e.w, e.h);
    });

    // Mario
    ctx.save();
    if(p.dir === -1) { ctx.translate(p.x - camX + p.w, p.y); ctx.scale(-1, 1); ctx.drawImage(img.mario, 0, 0, p.w, p.h); }
    else { ctx.drawImage(img.mario, p.x - camX, p.y, p.w, p.h); }
    ctx.restore();

    // Kontrol Tuşları
    ctx.globalAlpha = 0.5;
    touchButtons.forEach(btn => {
        ctx.fillStyle = "black"; ctx.beginPath(); ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 15); ctx.fill();
        ctx.fillStyle = "white"; ctx.font = "bold 20px Arial"; ctx.textAlign = "center";
        ctx.fillText(btn.label, btn.x + btn.w/2, btn.y + btn.h/1.6);
    });

    // --- SORU VE ŞIK PANELİ ---
    if (isPaused && currentQuestion) {
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = "white";
        ctx.beginPath(); ctx.roundRect(w/2 - 300, h/2 - 250, 600, 500, 20); ctx.fill(); // Arka Panel
        
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = "#2c3e50";
        ctx.font = "bold 22px Arial";
        ctx.textAlign = "center";
        
        // Uzun soruları ikiye bölmek için basit bir mantık
        let words = currentQuestion.q.split(" ");
        ctx.fillText(words.slice(0, 5).join(" "), w/2, h/2 - 180);
        ctx.fillText(words.slice(5).join(" "), w/2, h/2 - 150);

        optionButtons.forEach((btn, i) => {
            ctx.fillStyle = "#3498db";
            ctx.beginPath(); ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 10); ctx.fill();
            ctx.fillStyle = "white";
            ctx.font = "bold 18px Arial";
            ctx.fillText(`${["A", "B", "C", "D"][i]}) ${btn.label}`, btn.x + btn.w/2, btn.y + 38);
        });
    }

    ctx.globalAlpha = 1.0; ctx.textAlign = "left";
    ctx.fillStyle = "white"; ctx.font = "bold 24px Arial";
    ctx.fillText(`Puan: ${score} | Can: ${lives}`, 20, 40);
}

function reset() { lives--; p.x = 400; p.y = 100; if(lives <= 0) location.reload(); }
init(); update();
