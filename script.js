const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let w, h, camX = 0, score = 0, lives = 3, frame = 0;
let isPaused = false; 
let isGameOver = false; 
let currentQuestion = null; 
const gravity = 0.8;
const friction = 0.88;

// --- GÖRSELLER ---
const img = { mario: new Image(), goomba: new Image(), pipe: new Image(), flag: new Image() };
img.mario.src = 'mario.png';
img.goomba.src = 'goomba.png';
img.pipe.src = 'pipe.png'; 
img.flag.src = 'flag.png'; 

const p = { x: 200, y: 100, vx: 0, vy: 0, w: 50, h: 50, ground: false, dir: 1 };
const platforms = []; 
const enemies = [];
const keys = { w: false, a: false, s: false, d: false };

const finishLineX = 9000; 

// --- TÜRKÇE: SORU İŞARETİ VE NOKTALAMA SORULARI ---
const questions = [
    { q: "Soru soran cümlelerin sonuna ne konur?", options: ["Nokta", "Soru İşareti (?)", "Ünlem", "Virgül"], a: 1 },
    { q: "Hangisi bir soru cümlesidir?", options: ["Eve geldim.", "Okul bitti.", "Neden gelmedin?", "Koşarak gitti."], a: 2 },
    { q: "'Kaç yaşındasın' cümlesinin sonuna ne gelmelidir?", options: ["?", "!", ".", ","], a: 0 },
    { q: "Bilinmeyen yer veya tarihlerin yerine ne konur?", options: ["Nokta", "Ünlem", "Soru İşareti (?)", "Virgül"], a: 2 }
];

const moveButtons = [
    { id: 'a', x: 20, y: 0, w: 85, h: 85, label: "A (SOL)" },
    { id: 'd', x: 125, y: 0, w: 85, h: 85, label: "D (SAĞ)" },
    { id: 'w', x: 0, y: 0, w: 100, h: 100, label: "W (ZIP)" }
];

let optionButtons = [];

function init() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    moveButtons[0].y = h - 110;
    moveButtons[1].y = h - 110;
    moveButtons[2].x = w - 130;
    moveButtons[2].y = h - 130;

    platforms.length = 0; enemies.length = 0;
    platforms.push({ x: 0, y: h - 100, w: 12000, h: 100, type: 'ground' });

    for(let i = 1; i < 25; i++) {
        let px = i * 650;
        // Engeller ve Borular
        if(i % 3 === 0) platforms.push({ x: px, y: h - 280, w: 150, h: 40, type: 'block' });
        if(i % 5 === 0) platforms.push({ x: px + 200, y: h - 180, w: 70, h: 80, type: 'pipe' });

        // SALDIRGAN CANAVARLAR
        enemies.push({ 
            x: px + 400, y: h - 155, w: 55, h: 55, 
            vx: -3, hasQuestion: true, dead: false, 
            range: 400, startX: px + 400 
        });
    }
}

function handleInteraction(tx, ty, isDown) {
    if(isGameOver) return;
    if (isPaused && currentQuestion) {
        if (!isDown) return;
        optionButtons.forEach((btn, index) => {
            if (tx > btn.x && tx < btn.x + btn.w && ty > btn.y && ty < btn.y + btn.h) {
                if (index === currentQuestion.a) { score += 500; } else { lives--; }
                isPaused = false; currentQuestion = null;
                if(lives <= 0) location.reload();
            }
        });
    } else {
        moveButtons.forEach(btn => {
            if (tx > btn.x && tx < btn.x + btn.w && ty > btn.y && ty < btn.y + btn.h) keys[btn.id] = isDown;
        });
    }
}

window.addEventListener('mousedown', e => handleInteraction(e.clientX, e.clientY, true));
window.addEventListener('mouseup', () => { keys.a = keys.d = keys.w = false; });
window.addEventListener('touchstart', e => { 
    e.preventDefault(); Array.from(e.touches).forEach(t => handleInteraction(t.clientX, t.clientY, true)); 
}, { passive: false });
window.addEventListener('touchend', () => { keys.a = keys.d = keys.w = false; });

window.addEventListener('keydown', e => { if(!isGameOver) { let k = e.key.toLowerCase(); if(keys.hasOwnProperty(k)) keys[k] = true; }});
window.addEventListener('keyup', e => { let k = e.key.toLowerCase(); if(keys.hasOwnProperty(k)) keys[k] = false; });

function update() {
    if(isPaused || isGameOver) { render(); requestAnimationFrame(update); return; }

    if(keys.a) { p.vx -= 1.4; p.dir = -1; }
    if(keys.d) { p.vx += 1.4; p.dir = 1; }
    if(keys.w && p.ground) { p.vy = -23; p.ground = false; }

    p.vx *= friction; p.vy += gravity;
    p.x += p.vx; p.y += p.vy;
    camX += (p.x - camX - w/3) * 0.1;

    p.ground = false;
    platforms.forEach(plat => {
        if(p.x < plat.x + plat.w && p.x + p.w > plat.x && p.y + p.h > plat.y && p.y + p.h < plat.y + 30 && p.vy >= 0) {
            p.y = plat.y - p.h; p.vy = 0; p.ground = true;
        }
    });

    enemies.forEach(e => {
        if(e.dead) return;
        
        // CANAVAR SALDIRISI: Mario yakındaysa üzerine koşar
        let dist = Math.abs(p.x - e.x);
        if(dist < 500) {
            e.vx = (p.x < e.x) ? -4.5 : 4.5; 
        }
        e.x += e.vx;

        // Çarpışma ve Soru
        if(dist < 50 && Math.abs(p.y - e.y) < 50) {
            isPaused = true;
            currentQuestion = questions[Math.floor(Math.random() * questions.length)];
            optionButtons = currentQuestion.options.map((opt, i) => ({
                x: w/2 - 160, y: h/2 - 70 + (i * 75), w: 320, h: 60, label: opt
            }));
            e.dead = true; // Soru çıktıktan sonra canavar gider
        }
    });

    if(p.x > finishLineX) isGameOver = true;
    if(p.y > h + 100) reset();

    render();
    requestAnimationFrame(update);
}

function render() {
    ctx.fillStyle = '#5c94fc'; ctx.fillRect(0, 0, w, h);
    
    platforms.forEach(plat => {
        if(plat.type === 'pipe') ctx.fillStyle = '#2ecc71'; 
        else if(plat.type === 'block') ctx.fillStyle = '#e67e22';
        else ctx.fillStyle = '#8B4513';
        ctx.fillRect(plat.x - camX, plat.y, plat.w, plat.h);
    });

    // Bayrak
    ctx.fillStyle = 'white'; ctx.fillRect(finishLineX - camX, h - 500, 10, 400);
    ctx.fillStyle = 'red'; ctx.fillRect(finishLineX - camX, h - 500, 60, 40);

    // Canavarlar ve Soru İşaretleri
    enemies.forEach(e => { 
        if(!e.dead) {
            ctx.drawImage(img.goomba, e.x - camX, e.y, e.w, e.h);
            ctx.fillStyle = "yellow"; ctx.font = "bold 25px Arial";
            ctx.fillText("?", e.x - camX + 20, e.y - 10);
        }
    });

    ctx.save();
    if(p.dir === -1) { ctx.translate(p.x - camX + p.w, p.y); ctx.scale(-1, 1); ctx.drawImage(img.mario, 0, 0, p.w, p.h); }
    else { ctx.drawImage(img.mario, p.x - camX, p.y, p.w, p.h); }
    ctx.restore();

    // Kontrol Tuşları
    ctx.globalAlpha = 0.5;
    moveButtons.forEach(btn => {
        ctx.fillStyle = "black"; ctx.beginPath(); ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 12); ctx.fill();
        ctx.fillStyle = "white"; ctx.font = "bold 18px Arial"; ctx.textAlign="center";
        ctx.fillText(btn.label, btn.x + btn.w/2, btn.y + btn.h/1.6);
    });

    // Soru Ekranı
    if (isPaused && currentQuestion) {
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = "rgba(0,0,0,0.95)"; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "yellow"; ctx.font = "bold 40px Arial"; ctx.textAlign = "center";
        ctx.fillText("??? SORU İŞARETİ ???", w/2, h/2 - 180);
        ctx.fillStyle = "white"; ctx.font = "bold 24px Arial";
        ctx.fillText(currentQuestion.q, w/2, h/2 - 110);
        optionButtons.forEach((btn, i) => {
            ctx.fillStyle = "#3498db"; ctx.beginPath(); ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 10); ctx.fill();
            ctx.fillStyle = "white"; ctx.font = "bold 19px Arial";
            ctx.fillText(btn.label, btn.x + btn.w/2, btn.y + 38);
        });
    }

    if(isGameOver) {
        ctx.fillStyle = "rgba(0,200,0,0.9)"; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "white"; ctx.font = "bold 50px Arial"; ctx.textAlign="center";
        ctx.fillText("BÖLÜMÜ TAMAMLADIN!", w/2, h/2);
        canvas.onclick = () => location.reload();
    }

    ctx.globalAlpha = 1.0; ctx.textAlign = "left";
    ctx.fillStyle = "yellow"; ctx.font = "bold 22px Arial";
    ctx.fillText(`CAN: ${lives} | PUAN: ${score}`, 20, 40);
}

function reset() { lives--; p.x = 200; p.y = 100; if(lives <= 0) location.reload(); }
init(); update();
