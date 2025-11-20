/**
 * Flappy Chicken - Game Logic
 */

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Game State
let frames = 0;
let gameSpeed = 1.0;
const state = {
    current: 0,
    getReady: 0,
    game: 1,
    over: 2
};

// Game Control
const startBtn = document.getElementById('restart-btn');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreDisplay = document.getElementById('score-display');
const finalScoreEl = document.getElementById('final-score');
const bestScoreEl = document.getElementById('best-score');
const hud = document.getElementById('hud');

// Event Listeners
startBtn.addEventListener('click', resetGame);
document.addEventListener('keydown', function (e) {
    if (e.code === 'Space') {
        handleInput();
    }
});
document.addEventListener('touchstart', function (e) {
    // Prevent default to avoid scrolling/zooming on some devices
    if (e.target.tagName !== 'BUTTON') {
        e.preventDefault();
    }
    handleInput();
}, { passive: false });

function handleInput() {
    switch (state.current) {
        case state.getReady:
            state.current = state.game;
            startScreen.classList.add('hidden');
            startScreen.classList.remove('active');
            hud.classList.remove('hidden');
            break;
        case state.game:
            chicken.flap();
            break;
        case state.over:
            // Optional: Press space to restart on game over
            resetGame();
            break;
    }
}

function resetGame() {
    chicken.reset();
    pipes.reset();
    score.reset();
    state.current = state.getReady;
    state.newHighScore = false;
    state.celebrating = false;
    gameSpeed = 1.0;
    powerups.reset();
    powerups.pipesPassed = 0; // Reset pipe counter
    powerups.nextSpawnAt = 5; // First spawn after 5th pipe

    gameOverScreen.classList.add('hidden');
    gameOverScreen.classList.remove('active');
    startScreen.classList.remove('hidden');
    startScreen.classList.add('active');
    
    // Show HUD in Get Ready state
    hud.classList.remove('hidden');
    
    // Reset Visuals
    document.getElementById('matrix-overlay').classList.remove('active');
    document.getElementById('neo-text').classList.remove('animate');
    
    frames = 0;
}

// Game Objects
const score = {
    best: localStorage.getItem('flappy_chicken_best') || 0,
    value: 0,

    draw: function () {
        if (state.current == state.game) {
            scoreDisplay.innerText = this.value;
            scoreDisplay.style.display = 'block';
        } else if (state.current == state.over) {
            scoreDisplay.style.display = 'none'; // Hide during game over
            finalScoreEl.innerText = this.value;
            bestScoreEl.innerText = this.best;
        } else {
            scoreDisplay.style.display = 'none'; // Hide on start screen
        }
    },

    reset: function () {
        this.value = 0;
        scoreDisplay.innerText = 0;
    }
};

const chicken = {
    x: 50,
    y: 150,
    radius: 12,
    velocity: 0,
    gravity: 0.25,
    gravity: 0.25,
    jump: 4.6,
    isNeo: false,

    draw: function () {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Rotation based on velocity
        let rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 0.1)));
        ctx.rotate(rotation);

        // Body
        ctx.fillStyle = "#FFD700";
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius * 1.2, this.radius, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#b59b00";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Neo Trench Coat (Body Extension)
        if (this.isNeo) {
            ctx.fillStyle = "#111";
            ctx.beginPath();
            // Flowing coat behind - using bezier curves for better flow
            ctx.moveTo(-2, 5);
            ctx.quadraticCurveTo(-15, 2, -20, 12); // Top curve
            ctx.lineTo(-15, 18); // Bottom edge
            ctx.quadraticCurveTo(-5, 15, 0, 12); // Bottom curve back to body
            ctx.fill();
            
            // Collar
            ctx.beginPath();
            ctx.moveTo(2, -5);
            ctx.lineTo(-5, -8);
            ctx.lineTo(-5, -2);
            ctx.fill();
        }

        // Wing (Animated)
        if (this.isNeo) {
            ctx.fillStyle = "#111"; // Black wing for coat
        } else {
            ctx.fillStyle = "#FCE68A"; // Normal wing
        }
        ctx.beginPath();
        let wingY = (frames % 10 < 5) ? -5 : 2; // Simple flap animation
        ctx.ellipse(-5, wingY, 8, 5, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Eye
        ctx.fillStyle = "#FFF";
        ctx.beginPath();
        ctx.arc(6, -6, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Pupil / Dead Eyes
        ctx.fillStyle = "#000";
        ctx.beginPath();
        if (state.current == state.over) {
            // X eyes for death
            ctx.lineWidth = 2;
            ctx.moveTo(6, -8);
            ctx.lineTo(10, -4);
            ctx.moveTo(10, -8);
            ctx.lineTo(6, -4);
            ctx.stroke();
        } else {
            ctx.arc(8, -6, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Neo Sunglasses
        if (this.isNeo) {
            ctx.fillStyle = "#000";
            ctx.beginPath();
            // Left lens
            ctx.ellipse(4, -6, 3, 2, 0, 0, Math.PI * 2);
            // Right lens (slightly offset for perspective, but 2D)
            ctx.ellipse(8, -6, 3, 2, 0, 0, Math.PI * 2);
            // Frame
            ctx.moveTo(1, -6);
            ctx.lineTo(11, -6);
            ctx.strokeStyle = "#111";
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fill();
        }

        // Beak
        ctx.fillStyle = "#FF6B6B";
        ctx.beginPath();
        ctx.moveTo(8, 2);
        ctx.lineTo(18, 6);
        ctx.lineTo(8, 10);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    },

    update: function (timeScale) {
        // Movement
        this.velocity += this.gravity * timeScale;
        this.y += this.velocity * timeScale;

        // Collision with floor
        if (this.y + this.radius >= canvas.height) {
            if (state.current == state.game) {
                this.y = canvas.height - this.radius;
                gameOver();
            } else if (state.current == state.over) {
                // Let it fall off screen
                if (this.y > canvas.height + 50 && !gameOverScreen.classList.contains('active')) {
                    showGameOverScreen();
                }
            }
        }

        // Collision with ceiling
        if (this.y - this.radius <= 0) {
            this.y = this.radius;
            this.velocity = 0;
        }
    },

    flap: function () {
        this.velocity = -this.jump;
    },

    reset: function () {
        this.y = 150;
        this.velocity = 0;
        this.rotation = 0;
        this.isNeo = false;
    }
};

const pipes = {
    position: [],
    w: 50,
    h: 400, // Max height
    gap: 120,
    dx: 2,

    draw: function () {
        for (let i = 0; i < this.position.length; i++) {
            let p = this.position[i];
            let topY = p.y;
            let bottomY = p.y + this.h + this.gap;

            // Pipe Colors
            const lightGreen = "#55e07e";
            const darkGreen = "#008000";
            const border = "#004400";

            // Helper to draw a single pipe segment
            const drawPipe = (x, y, w, h, isTop) => {
                // Calculate actual height to extend off-screen
                // If top pipe, draw from -1000 to y+h
                // If bottom pipe, draw from y to canvas.height + 1000

                let drawY = isTop ? -1000 : y;
                let drawH = isTop ? (y + h) - (-1000) : 2000; // Large enough to cover screen

                // Main body gradient
                let grad = ctx.createLinearGradient(x, drawY, x + w, drawY);
                grad.addColorStop(0, darkGreen);
                grad.addColorStop(0.1, lightGreen);
                grad.addColorStop(0.4, lightGreen);
                grad.addColorStop(1, darkGreen);

                ctx.fillStyle = grad;
                ctx.fillRect(x, drawY, w, drawH);

                // Border
                ctx.strokeStyle = border;
                ctx.lineWidth = 2;
                ctx.strokeRect(x, drawY, w, drawH);

                // Rim
                const rimHeight = 24;
                const rimOverhang = 4;
                // Rim is always at the "gap" end
                let rimY = isTop ? y + h - rimHeight : y;

                let rimGrad = ctx.createLinearGradient(x - rimOverhang, rimY, x + w + rimOverhang, rimY);
                rimGrad.addColorStop(0, darkGreen);
                rimGrad.addColorStop(0.1, lightGreen);
                rimGrad.addColorStop(0.4, lightGreen);
                rimGrad.addColorStop(1, darkGreen);

                ctx.fillStyle = rimGrad;
                ctx.fillRect(x - rimOverhang, rimY, w + rimOverhang * 2, rimHeight);
                ctx.strokeRect(x - rimOverhang, rimY, w + rimOverhang * 2, rimHeight);
            };

            // Top Pipe
            // p.y is the top coordinate of the pipe object, but we want the bottom of the top pipe to be at p.y + this.h
            // The gap starts at p.y + this.h
            drawPipe(p.x, p.y, this.w, this.h, true);

            // Bottom Pipe
            drawPipe(p.x, bottomY, this.w, this.h, false);
        }
    },

    spawn: function () {
        // Progressive Difficulty with slightly reduced range for fairness
        const center = canvas.height / 2;
        const maxOffset = canvas.height / 4; // Reduced from 1/3 to 1/4 for fairer placement

        // Difficulty factor: 0.3 to 1.0 based on score (caps at score 40)
        const difficulty = 0.3 + Math.min(score.value / 40, 1.0) * 0.7;

        // Initial range is small (centered), grows with difficulty
        const range = 50 + (maxOffset * difficulty);

        // Random offset within the calculated range
        const offset = (Math.random() - 0.5) * range;

        // Calculate pipe y position (this is the top of the gap)
        const pipeY = center + offset - this.h - (this.gap / 2);

        this.position.push({
            x: canvas.width,
            y: pipeY,
            passed: false
        });
    },

    update: function (timeScale) {
        // Spawn logic moved to main loop with timer

        for (let i = 0; i < this.position.length; i++) {
            let p = this.position[i];
            p.x -= this.dx * timeScale;

            // Collision Logic
            let bottomPipeY = p.y + this.h + this.gap;

            // Hit Pipe
            if (chicken.x + chicken.radius > p.x &&
                chicken.x - chicken.radius < p.x + this.w &&
                (chicken.y - chicken.radius < p.y + this.h ||
                    chicken.y + chicken.radius > bottomPipeY)) {
                gameOver();
            }

            // Score Update
            // Only count pipes that haven't been passed yet
            if (!p.passed && chicken.x > p.x + this.w) {
                p.passed = true;
                score.value++;

                // Track for power-up spawning
                powerups.pipesPassed++;

                // Spawn power-up if we've reached the threshold
                if (powerups.pipesPassed >= powerups.nextSpawnAt) {
                    powerups.spawn();
                }

                score.draw();
                // achievements.check(score.value); // Assuming achievements is defined elsewhere

                let isHighScore = false;
                // High Score Check
                if (score.value > score.best) {
                    // Only trigger if it's a new high score (and greater than 0)
                    if (score.best > 0) isHighScore = true;
                    score.best = score.value;
                    localStorage.setItem('flappy_chicken_best', score.best);
                }

                triggerScoreAnimation(score.value % 10 === 0, isHighScore);
            }

            // Remove off-screen pipes
            if (p.x + this.w <= 0) {
                this.position.shift();
            }
        }
    },

    reset: function () {
        this.position = [];
    }
};

function gameOver() {
    state.current = state.over;
    hud.classList.add('hidden');
    // Don't show screen yet, wait for ground impact
    chicken.velocity = 0; // Small pop up before fall? Or just fall?
    // Let's give it a small bump up for effect
    chicken.velocity = -2;
}

function showGameOverScreen() {
    gameOverScreen.classList.remove('hidden');
    gameOverScreen.classList.add('active');
    score.draw(); // Update final score UI

    const titleEl = document.getElementById('game-over-title');

    if (state.newHighScore) {
        // titleEl.innerText = "NEW HIGH SCORE"; // Old way
        titleEl.innerHTML = ''; // Clear for spans
        titleEl.style.color = "#FFD700"; // Gold
        state.celebrating = true;

        const text = "NEW HIGH SCORE";
        const center = text.length / 2;

        for (let i = 0; i < text.length; i++) {
            const span = document.createElement('span');
            span.innerText = text[i];
            span.className = 'jumping-letter';

            // Arc Logic: Parabola y = a(x-h)^2 + k
            // We want middle (h) to be higher (negative top)
            const distFromCenter = Math.abs(i - center);
            const arcOffset = -1 * (20 - distFromCenter * 2); // 20px peak, drops 2px per char

            span.style.top = `${arcOffset}px`;

            // Wave delay
            span.style.animationDelay = `${i * 0.1}s`;

            // Spacing for spaces
            if (text[i] === ' ') {
                span.style.width = '15px';
            }

            titleEl.appendChild(span);
        }

    } else {
        titleEl.innerText = "Game Over";
        titleEl.style.color = "var(--primary-color)";
        state.celebrating = false;
    }

    // Medals
    const medalContainer = document.getElementById('medal-container');
    medalContainer.innerHTML = '';

    let medal = null;
    if (score.value >= 50) medal = { color: '#E5E4E2', name: 'Platinum' }; // Platinum
    else if (score.value >= 20) medal = { color: '#FFD700', name: 'Gold' }; // Gold
    else if (score.value >= 10) medal = { color: '#C0C0C0', name: 'Silver' }; // Silver
    else if (score.value >= 5) medal = { color: '#CD7F32', name: 'Bronze' }; // Bronze

    if (medal) {
        const medalEl = document.createElement('div');
        medalEl.style.width = '60px';
        medalEl.style.height = '60px';
        medalEl.style.borderRadius = '50%';
        medalEl.style.background = `linear-gradient(45deg, ${medal.color}, #FFF)`;
        medalEl.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
        medalEl.style.border = '4px solid #FFF';
        medalEl.style.display = 'flex';
        medalEl.style.justifyContent = 'center';
        medalEl.style.alignItems = 'center';
        medalEl.title = medal.name;

        if (state.newHighScore) {
            medalEl.classList.add('shine-effect');
        }

        // Simple star icon inside
        medalEl.innerHTML = '<div style="width: 20px; height: 20px; background: #FFF; clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);"></div>';

        medalContainer.appendChild(medalEl);

        // Add label
        const label = document.createElement('div');
        label.innerText = medal.name;
        label.style.color = '#FFF';
        label.style.marginTop = '10px';
        label.style.fontWeight = 'bold';
        medalContainer.appendChild(label);
        medalContainer.style.display = 'flex';
        medalContainer.style.flexDirection = 'column';
        medalContainer.style.alignItems = 'center';
    }
}



// Particle System
const particles = {
    items: [],

    spawn: function (x, y, count = 5) {
        for (let i = 0; i < count; i++) {
            this.items.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 1.0,
                color: `hsl(${Math.random() * 60 + 30}, 100%, 50%)`
            });
        }
    },

    update: function (timeScale) {
        for (let i = this.items.length - 1; i >= 0; i--) {
            let p = this.items[i];
            p.x += p.vx * timeScale;
            p.y += p.vy * timeScale;
            p.life -= 0.02 * timeScale;

            if (p.life <= 0) {
                this.items.splice(i, 1);
            }
        }
    },

    draw: function () {
        for (let p of this.items) {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }
};

// Power-up System
const powerups = {
    items: [],
    pipesPassed: 0, // Track pipes passed for spawning
    nextSpawnAt: 5, // First spawn after 5th pipe

    spawn: function () {
        // Check for pipes at the spawn location (canvas.width)
        // We want to spawn in the gap if there is a pipe, but with clearance
        let spawnY = 0;
        const pillHeight = 15;
        const clearance = 25; // Minimum distance from pipes
        
        // Find the last pipe
        const lastPipe = pipes.position[pipes.position.length - 1];
        
        // If a pipe is near the right edge (within 100px), spawn inside its gap with clearance
        if (lastPipe && lastPipe.x > canvas.width - 100) {
             // Center of the gap with clearance from top and bottom pipes
             const gapTop = lastPipe.y + pipes.h;
             const gapBottom = lastPipe.y + pipes.h + pipes.gap;
             const safeGapSize = pipes.gap - (clearance * 2) - pillHeight;
             
             if (safeGapSize > 0) {
                 // Spawn in safe zone (center of gap with clearance)
                 spawnY = gapTop + clearance + (safeGapSize / 2);
             } else {
                 // Gap too small, spawn in center screen instead
                 spawnY = canvas.height / 2;
             }
        } else {
            // No pipe near edge, spawn randomly in safe zone
            const center = canvas.height / 2;
            const range = 200;
            spawnY = center + (Math.random() * range - range/2);
        }
        
        this.items.push({
            x: canvas.width,
            y: spawnY,
            type: 'snail',
            w: 30,
            h: 15
        });
        
        // Set next spawn: randomly 5-9 pipes from now (avg ~7)
        this.nextSpawnAt = this.pipesPassed + 5 + Math.floor(Math.random() * 5);
    },

    update: function (timeScale) {
        // No timer-based spawning anymore - it's now handled by pipe passing

        for (let i = this.items.length - 1; i >= 0; i--) {
            let p = this.items[i];
            p.x -= 2 * timeScale; // Move same speed as pipes/ground

            // Collision with Chicken
            if (
                chicken.x + chicken.radius > p.x &&
                chicken.x - chicken.radius < p.x + p.w &&
                chicken.y + chicken.radius > p.y &&
                chicken.y - chicken.radius < p.y + p.h
            ) {
                this.activate(p.type);
                this.items.splice(i, 1);
                continue;
            }

            // Remove off-screen
            if (p.x + p.w < 0) {
                this.items.splice(i, 1);
            }
        }
    },

    activate: function (type) {
        if (type === 'snail') {
            gameSpeed = 0.5;
            chicken.isNeo = true;
            
            // Visual Effects
            document.getElementById('matrix-overlay').classList.add('active');
            const neoText = document.getElementById('neo-text');
            neoText.classList.remove('animate'); // Reset
            void neoText.offsetWidth; // Trigger reflow
            neoText.classList.add('animate');
            
            // Reset after 5 seconds
            setTimeout(() => {
                if (state.current == state.game) {
                    gameSpeed = 1.0;
                    chicken.isNeo = false;
                    document.getElementById('matrix-overlay').classList.remove('active');
                }
            }, 5000);
        }
    },

    draw: function () {
        for (let p of this.items) {
            if (p.type === 'snail') {
                // Draw Pill (Red for Matrix reference)
                ctx.fillStyle = "#FF0000"; 
                ctx.beginPath();
                ctx.roundRect(p.x, p.y, p.w, p.h, 10);
                ctx.fill();
                ctx.strokeStyle = "#800000";
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Matrix code effect inside? - Removed per user request
                // ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
                // ctx.font = "10px monospace";
                // ctx.fillText("10", p.x + 5, p.y + 11);
            }
        }
    },

    reset: function () {
        this.items = [];
        this.spawnTimer = 0;
    }
};

// Achievements System
const achievements = {
    milestones: [10, 20, 50, 100],
    unlocked: JSON.parse(localStorage.getItem('flappy_chicken_achievements') || '[]'),

    check: function (currentScore) {
        if (this.milestones.includes(currentScore) && !this.unlocked.includes(currentScore)) {
            this.unlock(currentScore);
        }
    },

    unlock: function (scoreVal) {
        this.unlocked.push(scoreVal);
        localStorage.setItem('flappy_chicken_achievements', JSON.stringify(this.unlocked));
        this.showNotification(`Unlocked: ${scoreVal} Club!`);
        particles.spawn(canvas.width / 2, 100, 20); // Celebration confetti
    },

    showNotification: function (text) {
        const notif = document.createElement('div');
        notif.className = 'achievement-notif';
        notif.innerText = text;
        document.body.appendChild(notif);

        setTimeout(() => {
            notif.classList.add('fade-out');
            setTimeout(() => notif.remove(), 1000);
        }, 2000);
    }
};

// Update Chicken flap to spawn particles
const originalFlap = chicken.flap;
chicken.flap = function () {
    originalFlap.call(this);
    particles.spawn(this.x - 10, this.y + 5, 3);
};



// Procedural Background
const bg = {
    clouds: [],
    buildings: [],

    init: function () {
        // Init Clouds
        for (let i = 0; i < 5; i++) {
            this.clouds.push({
                x: Math.random() * canvas.width,
                y: Math.random() * 200,
                s: Math.random() * 0.5 + 0.5,
                dx: Math.random() * 0.5 + 0.1
            });
        }

        // Init Cityscape - Sparse buildings with gaps and predetermined windows
        let x = 0;
        while (x < canvas.width + 200) { // Extend past screen to prevent pop-in
            let w = 40 + Math.random() * 60; // 40-100px wide
            let h = 150 + Math.random() * 150; // 150-300px tall
            
            // Generate fixed window positions for this building
            let windows = this.generateWindows(w, h);
            
            this.buildings.push({ x: x, w: w, h: h, windows: windows });
            x += w + (30 + Math.random() * 50); // Add 30-80px gap between buildings
        }
    },
    
    generateWindows: function(buildingW, buildingH) {
        // Generate 5-10 fixed window positions
        const numWindows = 5 + Math.floor(Math.random() * 6); // 5-10 windows
        const windows = [];
        const margin = 8;
        
        for (let i = 0; i < numWindows; i++) {
            const windowW = 8 + Math.random() * 4; // 8-12px wide
            const windowH = 10 + Math.random() * 6; // 10-16px tall
            const wx = margin + Math.random() * (buildingW - windowW - margin * 2);
            const wy = margin + Math.random() * (buildingH - windowH - margin * 2);
            
            windows.push({ x: wx, y: wy, w: windowW, h: windowH });
        }
        
        return windows;
    },

    update: function (timeScale) {
        // Update Clouds
        this.clouds.forEach(c => {
            c.x -= c.dx * timeScale;
            if (c.x < -100) c.x = canvas.width + 100;
        });

        // Scroll Buildings (Parallax)
        if (state.current == state.game) {
            this.buildings.forEach(b => {
                b.x -= 0.5 * timeScale;
            });

            // Recycle buildings - add gap to prevent pop-in
            if (this.buildings[0].x + this.buildings[0].w < -50) {
                let first = this.buildings.shift();
                let last = this.buildings[this.buildings.length - 1];
                first.w = 40 + Math.random() * 60; // Randomize width
                first.h = 150 + Math.random() * 150; // Randomize height
                first.windows = this.generateWindows(first.w, first.h); // Generate new windows
                first.x = last.x + last.w + (30 + Math.random() * 50); // Add gap
                this.buildings.push(first);
            }
        }
    },

    draw: function () {
        // Sky Background (Fill instead of clear to ensure visibility)
        let grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, "#4FACFE");
        grad.addColorStop(1, "#00F2FE");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Clouds (More visible)
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        this.clouds.forEach(c => {
            ctx.beginPath();
            ctx.arc(c.x, c.y, 30 * c.s, 0, Math.PI * 2);
            ctx.arc(c.x + 25 * c.s, c.y - 10 * c.s, 35 * c.s, 0, Math.PI * 2);
            ctx.arc(c.x + 50 * c.s, c.y, 30 * c.s, 0, Math.PI * 2);
            ctx.fill();
        });

        // Fireworks (Behind buildings)
        fireworks.draw();

        // Cityscape (Silhouette) - Dark buildings with sky-reflecting windows
        let groundY = canvas.height;
        this.buildings.forEach(b => {
            // Draw building body
            ctx.fillStyle = "rgba(50, 50, 50, 0.8)";
            ctx.fillRect(b.x, groundY - b.h, b.w, b.h);
            
            // Draw windows from stored positions (no random - prevents shimmering)
            ctx.fillStyle = "rgba(79, 172, 254, 0.5)"; // Sky blue with transparency
            
            if (b.windows) {
                b.windows.forEach(win => {
                    ctx.fillRect(
                        b.x + win.x,
                        groundY - b.h + win.y,
                        win.w,
                        win.h
                    );
                });
            }
        });
    }
};

// Fireworks System
const fireworks = {
    items: [],

    spawn: function (x, y) {
        const color = `hsl(${Math.random() * 360}, 100%, 50%)`;
        const particleCount = 30;
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 / particleCount) * i;
            const speed = Math.random() * 3 + 2;
            this.items.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                color: color,
                gravity: 0.1
            });
        }
    },

    update: function (timeScale) {
        for (let i = this.items.length - 1; i >= 0; i--) {
            let p = this.items[i];
            p.x += p.vx * timeScale;
            p.y += p.vy * timeScale;
            p.vy += p.gravity * timeScale; // Gravity
            p.life -= 0.02 * timeScale;

            if (p.life <= 0) {
                this.items.splice(i, 1);
            }
        }
    },

    draw: function () {
        for (let p of this.items) {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }
};
bg.init();

function drawBackground(timeScale) {
    bg.update(timeScale);

    // Continuous fireworks if celebrating
    if (state.celebrating) {
        if (Math.random() < 0.05) { // 5% chance per frame (approx 3 per sec at 60fps)
            fireworks.spawn(
                Math.random() * canvas.width,
                Math.random() * (canvas.height / 2)
            );
        }
    }

    fireworks.update(timeScale); // Update fireworks
    bg.draw();
}

// Score Animation Helper
function triggerScoreAnimation(isTen, isHighScore) {
    const scoreEl = document.getElementById('score-display');

    // Reset animation
    scoreEl.style.animation = 'none';
    scoreEl.offsetHeight; // Trigger reflow

    if (isHighScore) {
        // Fireworks!
        fireworks.spawn(canvas.width / 2, canvas.height / 3);
        fireworks.spawn(canvas.width / 4, canvas.height / 4);
        fireworks.spawn(3 * canvas.width / 4, canvas.height / 4);
        scoreEl.style.color = '#FFD700'; // Gold
        scoreEl.style.textShadow = '0 0 10px #FFD700';

        // Mark as new high score for game over screen
        state.newHighScore = true;
    }

    if (isTen) {
        scoreEl.style.animation = 'score-bump-big 0.5s ease-out';
        particles.spawn(canvas.width / 2, 100, 15); // Confetti
    } else {
        scoreEl.style.animation = 'score-bump 0.2s ease-out';
    }
}

// Game Loop with Delta Time
let lastTime = 0;
let spawnTimer = 0;

function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    // Normalize to 60 FPS (approx 16.67ms per frame)
    const timeScale = (deltaTime / (1000 / 60)) * gameSpeed;

    // Resize canvas to fit container (MUST be before drawing!)
    const container = document.getElementById('game-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    // Background
    drawBackground(timeScale);

    chicken.draw();

    if (state.current == state.getReady) {
        // Draw simple ground or idle animation
    }

    if (state.current == state.game) {
        pipes.update(timeScale);
        pipes.draw();
        chicken.update(timeScale);
        particles.update(timeScale);
        particles.draw();
        powerups.update(timeScale);
        powerups.draw();
        achievements.check(score.value);

        // Pipe Spawning (Time-based)
        spawnTimer += deltaTime;
        if (spawnTimer > 2000) { // Spawn every 2 seconds
            pipes.spawn();
            spawnTimer = 0;
        }
    }

    if (state.current == state.over) {
        pipes.draw();
        particles.draw();
        chicken.update(timeScale); // Allow chicken to keep falling
        chicken.draw();
    }

    // Always draw score
    score.draw();

    frames++; // Keep for animation frames (visual only)
    requestAnimationFrame(loop);
}

// Start loop
requestAnimationFrame(loop);
