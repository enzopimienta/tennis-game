/**
 * Antigravity Tennis Masters
 * A polished retro-arcade HTML5 Canvas Tennis Game
 * Author: Antigravity for @enzopimienta
 */

// ==========================================
// 1. SOUND SYNTHESIS ENGINE (Web Audio API)
// ==========================================
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playHit(type = 'normal') {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    let freq = 220;
    let duration = 0.08;

    if (type === 'topspin') {
      freq = 320;
      duration = 0.1;
    } else if (type === 'slice') {
      freq = 180;
      duration = 0.06;
    }

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + duration);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  playBounce() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.07);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  playNet() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.linearRampToValueAtTime(50, now + 0.12);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  playPointWin() {
    if (!this.enabled || !this.ctx) return;
    const notes = [261.63, 329.63, 392.00, 523.25]; // C E G C
    notes.forEach((freq, idx) => {
      const now = this.ctx.currentTime + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    });
  }

  playFault() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.linearRampToValueAtTime(95, now + 0.25);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }
}

// ==========================================
// 2. TENNIS GAME CONSTANTS & COURT GEOMETRY
// ==========================================
const COURT = {
  width: 900,
  height: 600,
  // Outer boundaries
  left: 170,
  right: 730,
  top: 60,
  bottom: 540,
  // Singles Sidelines
  singlesLeft: 220,
  singlesRight: 680,
  // Service Lines
  serviceTop: 180,
  serviceBottom: 420,
  // Center
  centerX: 450,
  netY: 300,
  netHeight: 28,
};

const SURFACES = {
  clay: {
    name: 'TERRE BATTUE',
    courtBg: '#b95333',
    outerBg: '#a84527',
    lineColor: '#f4ede6',
    friction: 0.985,
    bounceRestitution: 0.72,
    ballSpeedMul: 0.95
  },
  grass: {
    name: 'GAZON (WIMBLEDON)',
    courtBg: '#2d6a4f',
    outerBg: '#1b4332',
    lineColor: '#e9f5ed',
    friction: 0.992,
    bounceRestitution: 0.62,
    ballSpeedMul: 1.15
  },
  hard: {
    name: 'DUR (US OPEN)',
    courtBg: '#1d3557',
    outerBg: '#457b9d',
    lineColor: '#ffffff',
    friction: 0.988,
    bounceRestitution: 0.76,
    ballSpeedMul: 1.05
  }
};

// ==========================================
// 3. MAIN GAME STATE & ENGINE
// ==========================================
class TennisGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.sound = new SoundEngine();

    // Game Config
    this.mode = 'ai'; // 'ai' or '2p'
    this.difficulty = 'medium'; // 'easy', 'medium', 'hard'
    this.surfaceKey = 'clay';
    this.isPaused = false;
    this.gameState = 'menu'; // 'menu', 'serving', 'rally', 'point_end', 'game_over'

    // Match Score
    this.score = {
      p1Points: 0,
      p2Points: 0,
      p1Games: 0,
      p2Games: 0,
      p1Sets: 0,
      p2Sets: 0,
      server: 1, // 1 for P1, 2 for P2
      deuceSide: true // true = serve to deuce court (right to left diag)
    };

    // Entities
    this.ball = {
      x: 450,
      y: 480,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      radius: 6,
      bounceCount: 0,
      lastHitter: 1,
      inPlay: false,
      spin: 0
    };

    this.p1 = {
      id: 1,
      x: 450,
      y: 510,
      vx: 0,
      vy: 0,
      speed: 4.8,
      racketRadius: 28,
      swinging: false,
      swingType: 'normal',
      swingProgress: 0,
      score: 0
    };

    this.p2 = {
      id: 2,
      x: 450,
      y: 90,
      vx: 0,
      vy: 0,
      speed: 4.5,
      racketRadius: 28,
      swinging: false,
      swingType: 'normal',
      swingProgress: 0,
      score: 0,
      targetX: 450,
      aiTimer: 0
    };

    this.particles = [];
    this.ballTrail = [];
    this.keys = {};

    this.setupListeners();
    this.updateScoreboardUI();
    this.resizeCanvas();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupListeners() {
    window.addEventListener('keydown', (e) => {
      this.sound.init();
      this.keys[e.code] = true;

      if (e.code === 'KeyP' || e.code === 'Escape') {
        this.togglePause();
      }

      // Handle serve input
      if (this.gameState === 'serving' && !this.isPaused) {
        if (this.score.server === 1 && (e.code === 'Space' || e.code === 'KeyW' || e.code === 'KeyZ')) {
          this.triggerServe(1, e.code === 'Space' ? 'normal' : 'topspin');
        } else if (this.score.server === 2 && this.mode === '2p' && (e.code === 'KeyF' || e.code === 'KeyG')) {
          this.triggerServe(2, e.code === 'KeyF' ? 'normal' : 'topspin');
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('resize', () => this.resizeCanvas());

    // Menu Controls
    document.querySelectorAll('#mode-selector button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('#mode-selector button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.mode = e.target.dataset.mode;
        document.getElementById('difficulty-group').style.display = this.mode === 'ai' ? 'block' : 'none';
        document.getElementById('p2-label').textContent = this.mode === 'ai' ? 'IA (ALEX)' : 'JOUEUR 2';
        document.getElementById('p2-controls-hint').style.opacity = this.mode === '2p' ? '1' : '0.4';
      });
    });

    document.querySelectorAll('#diff-selector button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('#diff-selector button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.difficulty = e.target.dataset.diff;
      });
    });

    document.querySelectorAll('#court-selector button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('#court-selector button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.surfaceKey = e.target.dataset.court;
        document.getElementById('court-name').textContent = SURFACES[this.surfaceKey].name;
      });
    });

    document.getElementById('btn-start').addEventListener('click', () => {
      this.sound.init();
      this.startMatch();
    });

    document.getElementById('btn-pause').addEventListener('click', () => this.togglePause());

    const soundBtn = document.getElementById('btn-sound');
    soundBtn.addEventListener('click', () => {
      this.sound.enabled = !this.sound.enabled;
      soundBtn.textContent = this.sound.enabled ? '🔊 Son' : '🔇 Muet';
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
      this.resetMatch();
      this.startMatch();
    });
  }

  resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = COURT.width * dpr;
    this.canvas.height = COURT.height * dpr;
    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);
  }

  startMatch() {
    document.getElementById('menu-overlay').classList.add('hidden');
    this.resetMatch();
    this.prepareServe();
  }

  resetMatch() {
    this.score.p1Points = 0;
    this.score.p2Points = 0;
    this.score.p1Games = 0;
    this.score.p2Games = 0;
    this.score.p1Sets = 0;
    this.score.p2Sets = 0;
    this.score.server = 1;
    this.score.deuceSide = true;
    this.particles = [];
    this.ballTrail = [];
    this.updateScoreboardUI();
  }

  togglePause() {
    if (this.gameState === 'menu') return;
    this.isPaused = !this.isPaused;
    document.getElementById('btn-pause').textContent = this.isPaused ? '▶ Reprendre' : '⏸ Pause';
    if (this.isPaused) {
      this.showAnnouncement('PAUSE', 0);
    } else {
      this.hideAnnouncement();
    }
  }

  prepareServe() {
    this.gameState = 'serving';
    this.ball.inPlay = false;
    this.ball.bounceCount = 0;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.vz = 0;
    this.ball.z = 20;

    const serveSideX = this.score.deuceSide ? 520 : 380;

    if (this.score.server === 1) {
      this.p1.x = serveSideX;
      this.p1.y = 515;
      this.p2.x = this.score.deuceSide ? 380 : 520;
      this.p2.y = 90;
      this.ball.x = this.p1.x + 10;
      this.ball.y = this.p1.y - 15;
      document.getElementById('match-status').textContent = 'P1 au service - ESPACE pour frapper';
    } else {
      this.p2.x = serveSideX;
      this.p2.y = 85;
      this.p1.x = this.score.deuceSide ? 380 : 520;
      this.p1.y = 510;
      this.ball.x = this.p2.x + 10;
      this.ball.y = this.p2.y + 15;
      document.getElementById('match-status').textContent = this.mode === 'ai' ? "L'IA prépare son service..." : 'P2 au service - F pour frapper';

      if (this.mode === 'ai') {
        setTimeout(() => {
          if (this.gameState === 'serving' && this.score.server === 2 && !this.isPaused) {
            this.triggerServe(2, 'normal');
          }
        }, 1200);
      }
    }

    this.updateScoreboardUI();
  }

  triggerServe(server, type) {
    if (this.gameState !== 'serving') return;
    this.gameState = 'rally';
    this.ball.inPlay = true;
    this.ball.lastHitter = server;
    this.ball.bounceCount = 0;

    const targetServiceX = this.score.deuceSide ? 320 + Math.random() * 100 : 480 + Math.random() * 100;
    const surface = SURFACES[this.surfaceKey];

    if (server === 1) {
      const targetY = 240 + Math.random() * 40;
      const dx = targetServiceX - this.ball.x;
      const dy = targetY - this.ball.y;
      const dist = Math.hypot(dx, dy);
      const speed = (type === 'topspin' ? 9.5 : 8.5) * surface.ballSpeedMul;

      this.ball.vx = (dx / dist) * speed;
      this.ball.vy = (dy / dist) * speed;
      this.ball.vz = 4.5;
      this.p1.swinging = true;
      this.p1.swingProgress = 1;
      this.p1.swingType = type;
    } else {
      const targetY = 320 + Math.random() * 40;
      const dx = targetServiceX - this.ball.x;
      const dy = targetY - this.ball.y;
      const dist = Math.hypot(dx, dy);
      const speed = 8.0 * surface.ballSpeedMul;

      this.ball.vx = (dx / dist) * speed;
      this.ball.vy = (dy / dist) * speed;
      this.ball.vz = 4.5;
      this.p2.swinging = true;
      this.p2.swingProgress = 1;
      this.p2.swingType = type;
    }

    this.sound.playHit(type);
    document.getElementById('match-status').textContent = 'Échange en cours...';
  }

  // ==========================================
  // 4. PHYSICS & RALLY LOGIC
  // ==========================================
  update() {
    if (this.isPaused || this.gameState === 'menu') return;

    this.updatePlayers();

    if (this.gameState === 'rally') {
      this.updateBall();
      this.checkRacketHits();
    }

    this.updateParticles();
  }

  updatePlayers() {
    // --- Player 1 Controls ---
    let p1dx = 0;
    let p1dy = 0;
    if (this.keys['ArrowLeft']) p1dx -= 1;
    if (this.keys['ArrowRight']) p1dx += 1;
    if (this.keys['ArrowUp']) p1dy -= 1;
    if (this.keys['ArrowDown']) p1dy += 1;

    // Normalizing movement vector
    if (p1dx !== 0 && p1dy !== 0) {
      p1dx *= 0.7071;
      p1dy *= 0.7071;
    }

    this.p1.x += p1dx * this.p1.speed;
    this.p1.y += p1dy * this.p1.speed;

    // P1 Boundaries (defends bottom half)
    this.p1.x = Math.max(COURT.left - 20, Math.min(COURT.right + 20, this.p1.x));
    this.p1.y = Math.max(COURT.netY + 25, Math.min(COURT.bottom + 25, this.p1.y));

    // Player 1 Swings
    if (this.p1.swingProgress > 0) {
      this.p1.swingProgress -= 0.12;
      if (this.p1.swingProgress <= 0) this.p1.swinging = false;
    }

    if (this.gameState === 'rally') {
      if (this.keys['Space']) this.trySwing(this.p1, 'normal');
      else if (this.keys['KeyW'] || this.keys['KeyZ']) this.trySwing(this.p1, 'topspin');
      else if (this.keys['KeyX']) this.trySwing(this.p1, 'slice');
    }

    // --- Player 2 (AI or Local 2P) ---
    if (this.mode === '2p') {
      let p2dx = 0;
      let p2dy = 0;
      if (this.keys['KeyA'] || this.keys['KeyQ']) p2dx -= 1;
      if (this.keys['KeyD']) p2dx += 1;
      if (this.keys['KeyW'] || this.keys['KeyZ']) p2dy -= 1;
      if (this.keys['KeyS']) p2dy += 1;

      if (p2dx !== 0 && p2dy !== 0) {
        p2dx *= 0.7071;
        p2dy *= 0.7071;
      }

      this.p2.x += p2dx * this.p2.speed;
      this.p2.y += p2dy * this.p2.speed;

      if (this.gameState === 'rally') {
        if (this.keys['KeyF']) this.trySwing(this.p2, 'normal');
        else if (this.keys['KeyG']) this.trySwing(this.p2, 'topspin');
      }
    } else {
      this.updateAI();
    }

    // P2 Boundaries (defends top half)
    this.p2.x = Math.max(COURT.left - 20, Math.min(COURT.right + 20, this.p2.x));
    this.p2.y = Math.max(COURT.top - 15, Math.min(COURT.netY - 25, this.p2.y));

    if (this.p2.swingProgress > 0) {
      this.p2.swingProgress -= 0.12;
      if (this.p2.swingProgress <= 0) this.p2.swinging = false;
    }
  }

  updateAI() {
    const diffSettings = {
      easy: { speed: 3.4, errorMargin: 45, reactionDist: 320, attackChance: 0.2 },
      medium: { speed: 4.3, errorMargin: 20, reactionDist: 450, attackChance: 0.5 },
      hard: { speed: 5.1, errorMargin: 6, reactionDist: 580, attackChance: 0.85 }
    }[this.difficulty];

    this.p2.speed = diffSettings.speed;

    // AI positioning logic
    if (this.ball.vy < 0) {
      // Ball is coming towards AI!
      const timeToReach = Math.abs((this.p2.y - this.ball.y) / (this.ball.vy || 1));
      let predictedX = this.ball.x + this.ball.vx * timeToReach;

      // Add human-like error
      if (this.p2.aiTimer++ % 20 === 0) {
        this.p2.targetX = predictedX + (Math.random() - 0.5) * diffSettings.errorMargin;
      }

      // Move toward target
      const dx = this.p2.targetX - this.p2.x;
      if (Math.abs(dx) > 6) {
        this.p2.x += Math.sign(dx) * this.p2.speed;
      }

      // Adjust Y for ideal striking distance
      const idealY = 110;
      const dy = idealY - this.p2.y;
      if (Math.abs(dy) > 4) {
        this.p2.y += Math.sign(dy) * (this.p2.speed * 0.7);
      }

      // AI auto swing when ball is within racket range
      const dist = Math.hypot(this.ball.x - this.p2.x, this.ball.y - this.p2.y);
      if (dist < 45 && this.ball.z < 40 && this.ball.lastHitter === 1) {
        const shotType = Math.random() < diffSettings.attackChance ? 'topspin' : 'normal';
        this.trySwing(this.p2, shotType);
      }
    } else {
      // Ball moving away; recover to baseline center
      const returnX = COURT.centerX;
      const returnY = 95;
      const dx = returnX - this.p2.x;
      const dy = returnY - this.p2.y;
      if (Math.abs(dx) > 6) this.p2.x += Math.sign(dx) * (this.p2.speed * 0.6);
      if (Math.abs(dy) > 4) this.p2.y += Math.sign(dy) * (this.p2.speed * 0.6);
    }
  }

  trySwing(player, type) {
    player.swinging = true;
    player.swingType = type;
    player.swingProgress = 1;
  }

  updateBall() {
    const surface = SURFACES[this.surfaceKey];

    // Trail effect
    this.ballTrail.push({ x: this.ball.x, y: this.ball.y, z: this.ball.z, alpha: 0.6 });
    if (this.ballTrail.length > 8) this.ballTrail.shift();

    // 3D Motion
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;
    this.ball.z += this.ball.vz;

    // Gravity
    this.ball.vz -= 0.28;

    // Net interaction
    const prevY = this.ball.y - this.ball.vy;
    if ((prevY < COURT.netY && this.ball.y >= COURT.netY) || (prevY > COURT.netY && this.ball.y <= COURT.netY)) {
      if (this.ball.z < COURT.netHeight) {
        // Hit the net!
        this.sound.playNet();
        this.createParticles(this.ball.x, COURT.netY, '#ffffff', 8);
        this.ball.vy *= -0.15;
        this.ball.vx *= 0.3;
        this.ball.vz = -0.5;

        // If net fault
        setTimeout(() => {
          if (this.gameState === 'rally') {
            const winner = this.ball.lastHitter === 1 ? 2 : 1;
            this.awardPoint(winner, 'FILET !');
          }
        }, 500);
      }
    }

    // Bounce on Court
    if (this.ball.z <= 0) {
      this.ball.z = 0;
      this.ball.bounceCount++;
      this.sound.playBounce();
      this.createParticles(this.ball.x, this.ball.y, surface.courtBg, 6);

      // Bounce restitution
      this.ball.vz = -this.ball.vz * surface.bounceRestitution;
      this.ball.vx *= surface.friction;
      this.ball.vy *= surface.friction;

      // Check if bounce was in or out
      const isBounceIn = this.isInsideCourt(this.ball.x, this.ball.y);

      // First bounce check
      if (this.ball.bounceCount === 1) {
        if (!isBounceIn) {
          // Out on first bounce! Point to opponent
          const winner = this.ball.lastHitter === 1 ? 2 : 1;
          this.awardPoint(winner, 'FAUTE / HORS-JEU !');
          return;
        }
      } else if (this.ball.bounceCount >= 2) {
        // Double bounce! Hitter wins the point
        this.awardPoint(this.ball.lastHitter, 'DOUBLE REBOND !');
        return;
      }
    }

    // Out of bounds screen limits
    if (this.ball.y < 0 || this.ball.y > COURT.height || this.ball.x < 50 || this.ball.x > COURT.width - 50) {
      if (this.gameState === 'rally') {
        const winner = this.ball.lastHitter === 1 ? 2 : 1;
        this.awardPoint(winner, 'BALLE DEHORS !');
      }
    }
  }

  isInsideCourt(x, y) {
    // In singles tennis, boundary is between singlesLeft and singlesRight, and top and bottom baselines
    return (
      x >= COURT.singlesLeft &&
      x <= COURT.singlesRight &&
      y >= COURT.top &&
      y <= COURT.bottom
    );
  }

  checkRacketHits() {
    [this.p1, this.p2].forEach(player => {
      if (!player.swinging) return;

      const dist = Math.hypot(this.ball.x - player.x, this.ball.y - player.y);
      const isEligible = (player.id === 1 && this.ball.vy > 0) || (player.id === 2 && this.ball.vy < 0);

      if (dist < player.racketRadius + 18 && this.ball.z < 50 && isEligible) {
        this.hitBall(player);
      }
    });
  }

  hitBall(player) {
    const surface = SURFACES[this.surfaceKey];
    this.ball.lastHitter = player.id;
    this.ball.bounceCount = 0;

    // Contact offset determines angle
    const contactOffsetX = (this.ball.x - player.x) / player.racketRadius; // -1 to +1
    let baseSpeed = 7.5;
    let vz = 4.2;

    if (player.swingType === 'topspin') {
      baseSpeed = 9.2;
      vz = 3.8;
      this.createParticles(this.ball.x, this.ball.y, '#39ff14', 10);
    } else if (player.swingType === 'slice') {
      baseSpeed = 5.8;
      vz = 2.8;
      this.createParticles(this.ball.x, this.ball.y, '#00f0ff', 10);
    } else {
      this.createParticles(this.ball.x, this.ball.y, '#ffffff', 8);
    }

    baseSpeed *= surface.ballSpeedMul;

    // Calculate return velocities
    const angleX = contactOffsetX * 3.5;
    this.ball.vx = angleX;

    if (player.id === 1) {
      // Hitting upwards towards P2
      this.ball.vy = -baseSpeed;
    } else {
      // Hitting downwards towards P1
      this.ball.vy = baseSpeed;
    }

    this.ball.vz = vz;
    this.sound.playHit(player.swingType);
  }

  // ==========================================
  // 5. SCORING & TOURNAMENT RULES
  // ==========================================
  awardPoint(winnerId, reason) {
    this.gameState = 'point_end';
    this.sound.playPointWin();
    this.showAnnouncement(reason, 1500);

    if (winnerId === 1) {
      this.score.p1Points++;
    } else {
      this.score.p2Points++;
    }

    this.evaluateTennisScore();
    this.updateScoreboardUI();

    setTimeout(() => {
      if (this.gameState !== 'menu' && this.gameState !== 'game_over') {
        this.score.deuceSide = !this.score.deuceSide;
        this.prepareServe();
      }
    }, 1800);
  }

  evaluateTennisScore() {
    const p1 = this.score.p1Points;
    const p2 = this.score.p2Points;

    // Check for Game win
    if (p1 >= 4 && p1 - p2 >= 2) {
      this.winGame(1);
    } else if (p2 >= 4 && p2 - p1 >= 2) {
      this.winGame(2);
    }
  }

  winGame(winnerId) {
    if (winnerId === 1) {
      this.score.p1Games++;
    } else {
      this.score.p2Games++;
    }

    this.score.p1Points = 0;
    this.score.p2Points = 0;
    this.score.server = this.score.server === 1 ? 2 : 1;
    this.score.deuceSide = true;

    const winnerName = winnerId === 1 ? 'JOUEUR 1' : (this.mode === 'ai' ? 'IA' : 'JOUEUR 2');
    this.showAnnouncement(`JEU ${winnerName} !`, 2000);

    // Check for Set win (first to 3 games for quick arcade play)
    if (this.score.p1Games >= 3) {
      this.winSet(1);
    } else if (this.score.p2Games >= 3) {
      this.winSet(2);
    }
  }

  winSet(winnerId) {
    if (winnerId === 1) this.score.p1Sets++;
    else this.score.p2Sets++;

    this.score.p1Games = 0;
    this.score.p2Games = 0;

    const winnerName = winnerId === 1 ? 'JOUEUR 1' : (this.mode === 'ai' ? 'IA' : 'JOUEUR 2');
    this.gameState = 'game_over';
    this.showAnnouncement(`🏆 VICTOIRE ${winnerName} !`, 4000);

    setTimeout(() => {
      document.getElementById('menu-overlay').classList.remove('hidden');
      this.gameState = 'menu';
    }, 3500);
  }

  formatTennisPoints(p1, p2) {
    const scores = ['0', '15', '30', '40'];
    if (p1 >= 3 && p2 >= 3) {
      if (p1 === p2) return { p1: '40', p2: '40' };
      if (p1 === p2 + 1) return { p1: 'AD', p2: '40' };
      if (p2 === p1 + 1) return { p1: '40', p2: 'AD' };
    }
    return {
      p1: scores[p1] || '40',
      p2: scores[p2] || '40'
    };
  }

  updateScoreboardUI() {
    const pts = this.formatTennisPoints(this.score.p1Points, this.score.p2Points);
    document.getElementById('p1-points').textContent = pts.p1;
    document.getElementById('p2-points').textContent = pts.p2;

    document.getElementById('p1-games').textContent = this.score.p1Games;
    document.getElementById('p2-games').textContent = this.score.p2Games;

    document.getElementById('p1-sets').textContent = this.score.p1Sets;
    document.getElementById('p2-sets').textContent = this.score.p2Sets;

    document.getElementById('p1-serve').textContent = this.score.server === 1 ? '●' : '';
    document.getElementById('p2-serve').textContent = this.score.server === 2 ? '●' : '';
  }

  showAnnouncement(text, autoHideMs = 1500) {
    const el = document.getElementById('announcement');
    document.getElementById('announcement-text').textContent = text;
    el.classList.remove('hidden');

    if (autoHideMs > 0) {
      setTimeout(() => this.hideAnnouncement(), autoHideMs);
    }
  }

  hideAnnouncement() {
    document.getElementById('announcement').classList.add('hidden');
  }

  // ==========================================
  // 6. PARTICLES & VISUAL EFFECTS
  // ==========================================
  createParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 3 + 1.5,
        color,
        life: 1.0,
        decay: Math.random() * 0.05 + 0.03
      });
    }
  }

  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  // ==========================================
  // 7. RENDERING ENGINE
  // ==========================================
  draw() {
    const ctx = this.ctx;
    const surface = SURFACES[this.surfaceKey];

    // Background Surrounding Area
    ctx.fillStyle = surface.outerBg;
    ctx.fillRect(0, 0, COURT.width, COURT.height);

    // Court Infield
    ctx.fillStyle = surface.courtBg;
    ctx.fillRect(COURT.left, COURT.top, COURT.right - COURT.left, COURT.bottom - COURT.top);

    // Court Boundary Lines
    ctx.strokeStyle = surface.lineColor;
    ctx.lineWidth = 3.5;
    ctx.beginPath();

    // Doubles outer box
    ctx.strokeRect(COURT.left, COURT.top, COURT.right - COURT.left, COURT.bottom - COURT.top);

    // Singles sidelines
    ctx.moveTo(COURT.singlesLeft, COURT.top);
    ctx.lineTo(COURT.singlesLeft, COURT.bottom);
    ctx.moveTo(COURT.singlesRight, COURT.top);
    ctx.lineTo(COURT.singlesRight, COURT.bottom);

    // Service lines
    ctx.moveTo(COURT.singlesLeft, COURT.serviceTop);
    ctx.lineTo(COURT.singlesRight, COURT.serviceTop);
    ctx.moveTo(COURT.singlesLeft, COURT.serviceBottom);
    ctx.lineTo(COURT.singlesRight, COURT.serviceBottom);

    // Center service line
    ctx.moveTo(COURT.centerX, COURT.serviceTop);
    ctx.lineTo(COURT.centerX, COURT.serviceBottom);

    // Center marks at baselines
    ctx.moveTo(COURT.centerX, COURT.top);
    ctx.lineTo(COURT.centerX, COURT.top + 14);
    ctx.moveTo(COURT.centerX, COURT.bottom);
    ctx.lineTo(COURT.centerX, COURT.bottom - 14);

    ctx.stroke();

    // Net Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(COURT.left - 15, COURT.netY + 2, (COURT.right - COURT.left) + 30, 4);

    // Net Mesh
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    for (let x = COURT.left - 10; x <= COURT.right + 10; x += 10) {
      ctx.beginPath();
      ctx.moveTo(x, COURT.netY - COURT.netHeight);
      ctx.lineTo(x, COURT.netY);
      ctx.stroke();
    }

    // Top Net White Band
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(COURT.left - 15, COURT.netY - COURT.netHeight);
    ctx.lineTo(COURT.right + 15, COURT.netY - COURT.netHeight);
    ctx.stroke();

    // Net Posts
    ctx.fillStyle = '#444444';
    ctx.fillRect(COURT.left - 18, COURT.netY - COURT.netHeight - 4, 6, COURT.netHeight + 6);
    ctx.fillRect(COURT.right + 12, COURT.netY - COURT.netHeight - 4, 6, COURT.netHeight + 6);

    // Ball Trail
    this.ballTrail.forEach(t => {
      ctx.beginPath();
      ctx.arc(t.x, t.y - t.z, this.ball.radius * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 0, ${t.alpha * 0.4})`;
      ctx.fill();
    });

    // Ball Shadow (directly on court)
    ctx.beginPath();
    const shadowScale = Math.max(0.3, 1 - (this.ball.z / 120));
    ctx.ellipse(this.ball.x, this.ball.y, this.ball.radius * shadowScale * 1.3, this.ball.radius * shadowScale * 0.8, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 0, 0, ${0.45 * shadowScale})`;
    ctx.fill();

    // Ball (3D Altitude projection: drawn at y - z)
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y - this.ball.z, this.ball.radius + (this.ball.z * 0.04), 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(
      this.ball.x - 2, (this.ball.y - this.ball.z) - 2, 1,
      this.ball.x, (this.ball.y - this.ball.z), this.ball.radius + 1
    );
    grad.addColorStop(0, '#ffff55');
    grad.addColorStop(0.8, '#c7ea46');
    grad.addColorStop(1, '#8fa82b');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#627a14';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Players
    this.drawPlayer(this.p2, '#ff3366', '#ff7b00', 'IA');
    this.drawPlayer(this.p1, '#00f0ff', '#0077ff', 'P1');

    // Particles
    this.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  drawPlayer(player, primaryColor, secondaryColor, label) {
    const ctx = this.ctx;

    // Player Shadow
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 12, 16, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();

    // Racket Swing Arc (if swinging)
    if (player.swinging) {
      ctx.save();
      ctx.strokeStyle = player.swingType === 'topspin' ? '#39ff14' : (player.swingType === 'slice' ? '#00f0ff' : '#ffbe0b');
      ctx.lineWidth = 3;
      ctx.beginPath();
      const swingAngle = player.id === 1 ? -Math.PI / 2 : Math.PI / 2;
      ctx.arc(player.x, player.y, player.racketRadius + 8, swingAngle - 0.9, swingAngle + 0.9);
      ctx.stroke();
      ctx.restore();
    }

    // Player Body
    ctx.beginPath();
    ctx.arc(player.x, player.y, 14, 0, Math.PI * 2);
    const pGrad = ctx.createLinearGradient(player.x - 10, player.y - 10, player.x + 10, player.y + 10);
    pGrad.addColorStop(0, primaryColor);
    pGrad.addColorStop(1, secondaryColor);
    ctx.fillStyle = pGrad;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Player Label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, player.x, player.y);
  }

  animate() {
    this.update();
    this.draw();
    requestAnimationFrame(this.animate);
  }
}

// Instantiate game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.game = new TennisGame();
});
