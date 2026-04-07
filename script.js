const c = document.getElementById('g');
const x = c.getContext('2d');
let w, h, camX = 0, frame = 0, score = 0;

// --- RESİMLER ---
const marioImg = new Image();
marioImg.src = 'mario.png'; // Senin attığın resim

const conf = { grav: 1.2, frict: 0.85, jump: -25, speed: 2.2 };
const p = { x: 100, y: 0, vx: 0, vy: 0, w: 48, h: 48, g: 0, d: 1 };
const objs = [], enemies = [];

const resize = () => { w = c.width = window.innerWidth; h = c.height = window.innerHeight; };
window.onresize = resize; resize();

// DÜNYAYI OLUŞTUR (Bloklar ve Canavarlar)
const init = () => {
    // Ana Zemin
    objs.push({x: 0, y: h-60, w: 100000, h: 60, type: 'ground'});

    for(let i=1; i<150; i++) {
        let ox = i * 400 + Math.random() * 200;
        let oy = h - 200 - Math.random() * 250;
        let ow = 100 + Math.random() * 100;
        
        // Havada asılı bloklar
        objs.push({x: ox, y: oy, w: ow, h: 40, type: 'block'});

        // Her bloğun üzerine bir canavar koy
        enemies.push({
            x: ox + 10, y: oy - 45, w: 40, h: 40,
            vx: 2 + Math.random() * 3,
            startX: ox,
            range: ow - 40,
            dead: false
        });
    }
};

const loop = () => {
    frame++;
    const keys = window.keys || {l:0, r:0, u:0};

    // Mario Hareket
    if(keys.l) { p.vx -= conf.speed; p.d = -1; } 
    else if(keys.r) { p.vx += conf.speed; p.d = 1; } 
    else p.vx *= conf.frict;

    if(keys.u && p.g) { p.vy = conf.jump; p.g = 0; }
    p.vy += conf.grav; p.x += p.vx; p.y += p.vy;

    // --- ÇARPIŞMA KONTROLÜ ---
    p.g = 0;
    objs.forEach(o => {
        if(p.x < o.x + o.w && p.x + p.w > o.x && p.y + p.h > o.y && p.y + p.h < o.y + o.h + p.vy && p.vy >= 0) {
            p.y = o.y - p.h; p.vy = 0; p.g = 1;
        }
    });

    // Canavar Mantığı
    enemies.forEach(e => {
        if(e.dead) return;
        
        // Sağa sola devriye
        e.x += e.vx;
        if(e.x > e.startX + e.range || e.x < e.startX) e.vx *= -1;

        // Mario ile temas
        if(p.x < e.x + e.w && p.x + p.w > e.x && p.y < e.y + e.h && p.y + p.h > e.y) {
            if(p.vy > 5) { // Üstüne zıplarsa ölür
                e.dead = true; 
                p.vy = -15; 
                score += 100;
            } else { // Yanlardan çarparsa Mario geri fırlar (veya oyun biter)
                p.x -= 200;
                score = Math.max(0, score - 50);
            }
        }
    });

    // Kamera takibi
    camX += (p.x - camX - w/4) * 0.1;
    if(p.y > h + 100) { p.x = 100; p.y = 0; p.vx = 0; } // Düşerse başa dön

    // --- ÇİZİM ---
    x.fillStyle = '#5c94fc'; x.fillRect(0,0,w,h); // Gökyüzü

    // Blokları çiz
    objs.forEach(o => {
        x.fillStyle = o.type === 'ground' ? '#70483c' : '#ff9472';
        x.fillRect(o.x - camX, o.y, o.w, o.h);
        x.strokeStyle = 'black'; x.strokeRect(o.x - camX, o.y, o.w, o.h);
    });

    // Canavarları çiz (Kahverengi kareler - şimdilik)
    enemies.forEach(e => {
        if(!e.dead) {
            x.fillStyle = '#a52a2a';
            x.fillRect(e.x - camX, e.y, e.w, e.h);
            x.fillStyle = 'white'; // Gözler
            x.fillRect(e.x - camX + 5, e.y + 10, 8, 8);
            x.fillRect(e.x - camX + 25, e.y + 10, 8, 8);
        }
    });

    // Mario'yu çiz (Senin resmin)
    x.save();
    x.translate(p.x - camX + (p.d === -1 ? p.w : 0), p.y);
    if (p.d === -1) x.scale(-1, 1);
    x.drawImage(marioImg, 0, 0, p.w, p.h);
    x.restore();

    // Skor Tablosu
    x.fillStyle = "white"; x.font = "bold 24px Arial";
    x.fillText(`SKOR: ${score}`, 20, 40);

    requestAnimationFrame(loop);
};

// KONTROLLER
window.keys = {l:0, r:0, u:0};
window.onkeydown = e => { if(e.key=='ArrowLeft')keys.l=1; if(e.key=='ArrowRight')keys.r=1; if(e.key==' '||e.key=='ArrowUp')keys.u=1; };
window.onkeyup = e => { if(e.key=='ArrowLeft')keys.l=0; if(e.key=='ArrowRight')keys.r=0; if(e.key==' '||e.key=='ArrowUp')keys.u=0; };

init(); loop();
