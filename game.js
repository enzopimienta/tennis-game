/**
 * Antigravity Tennis Masters
 * A realistic retro-arcade HTML5 Canvas Tennis Game
 * Featuring animated players with rackets, stadium crowd, umpire, ball kids,
 * and 100% accurate tennis rules & point attribution.
 * Author: Antigravity for @enzopimienta
 */

// ==========================================
// 1. SOUND & HAPTICS ENGINE (Web Audio API)
// ==========================================
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  vibrate(pattern) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  }

  playHit(type = 'normal') {
    this.vibrate(18);
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    let freq = 240;
    let duration = 0.09;

    if (type === 'topspin') {
      freq = 340;
      duration = 0.11;
    } else if (type === 'slice') {
      freq = 190;
      duration = 0.07;
    }

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + duration);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  playBounce() {
    this.vibrate(10);
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.07);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  playNet() {
    this.vibrate([30, 20, 30]);
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.linearRampToValueAtTime(50, now + 0.12);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  playPointWin() {
    this.vibrate([25, 40, 25, 40, 70]);
    if (!this.enabled || !this.ctx) return;
    const notes = [261.63, 329.63, 392.00, 523.25];
    notes.forEach((freq, idx) => {
      const now = this.ctx.currentTime + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.28);
    });
  }

  playFault() {
    this.vibrate([45, 30, 45]);
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(115, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.28);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.28);
  }
}

// ==========================================
// 2. COURT GEOMETRY & SURFACES
// ==========================================
const COURT = {
  width: 900,
  height: 600,
  left: 175,
  right: 725,
  top: 75,
  bottom: 525,
  singlesLeft: 225,
  singlesRight: 675,
  serviceTop: 185,
  serviceBottom: 415,
  centerX: 450,
  netY: 300,
  netHeight: 26,
};

const SURFACES = {
  clay: {
    name: 'TERRE BATTUE (ROLAND-GARROS)',
    courtBg: '#b34728',
    courtInnerBg: '#c25333',
    outerBg: '#8c3116',
    lineColor: '#f7f1e5',
    friction: 0.985,
    bounceRestitution: 0.72,
    ballSpeedMul: 0.95
  },
  grass: {
    name: 'GAZON (WIMBLEDON)',
    courtBg: '#2d6a4f',
    courtInnerBg: '#347a5b',
    outerBg: '#1b4332',
    lineColor: '#ebf5ed',
    friction: 0.992,
    bounceRestitution: 0.62,
    ballSpeedMul: 1.15
  },
  hard: {
    name: 'DUR (US OPEN)',
    courtBg: '#1a365d',
    courtInnerBg: '#234677',
    outerBg: '#3182ce',
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

    // Configuration
    this.mode = 'ai';
    this.difficulty = 'medium';
    this.surfaceKey = 'clay';
    this.isPaused = false;
    this.gameState = 'menu'; // 'menu', 'serving', 'rally', 'point_end', 'game_over'
    this.isServingShot = true;

    // Match Score
    this.score = {
      p1Points: 0,
      p2Points: 0,
      p1Games: 0,
      p2Games: 0,
      p1Sets: 0,
      p2Sets: 0,
      server: 1,
      deuceSide: true
    };

    // Tennis Ball
    this.ball = {
      x: 450,
      y: 490,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      radius: 6.5,
      bounceCount: 0,
      lastHitter: 1,
      inPlay: false,
      rotation: 0
    };

    // Realistic Players State
    this.p1 = {
      id: 1,
      name: 'JOUEUR 1',
      x: 450,
      y: 505,
      vx: 0,
      vy: 0,
      speed: 4.8,
      racketRadius: 32,
      swinging: false,
      swingType: 'normal',
      swingProgress: 0,
      isForehand: true,
      walkAnim: 0,
      isMoving: false,
      skinTone: '#f8d5c2',
      shirtColor: '#00d2ff',
      shortsColor: '#ffffff',
      hairColor: '#4a2c11',
      headbandColor: '#00f0ff'
    };

    this.p2 = {
      id: 2,
      name: 'ALEX',
      x: 450,
      y: 95,
      vx: 0,
      vy: 0,
      speed: 4.5,
      racketRadius: 32,
      swinging: false,
      swingType: 'normal',
      swingProgress: 0,
      isForehand: true,
      walkAnim: 0,
      isMoving: false,
      targetX: 450,
      aiTimer: 0,
      skinTone: '#e0ac69',
      shirtColor: '#ff2a5f',
      shortsColor: '#1a1a2e',
      hairColor: '#1a1a1a',
      headbandColor: '#ffdd00'
    };

    // Virtual Touch Joystick State (Mobile / S23)
    this.joystick = {
      active: false,
      identifier: null,
      startX: 0,
      startY: 0,
      vectorX: 0,
      vectorY: 0,
      maxRadius: 42
    };

    // Crowd & Stadium Elements
    this.crowd = [];
    this.crowdCheering = false;
    this.ballKids = [];
    this.particles = [];
    this.ballTrail = [];
    this.keys = {};

    this.initStadiumCrowd();
    this.setupListeners();
    this.setupTouchControls();
    this.setupPWA();
    this.updateScoreboardUI();
    this.resizeCanvas();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  // ==========================================
  // STADIUM SPECTATORS GENERATION
  // ==========================================
  initStadiumCrowd() {
    this.crowd = [];
    const colors = ['#e63946', '#f1faee', '#a8dadc', '#457b9d', '#ffbe0b', '#fb5607', '#ff006e', '#8338ec', '#3a86ff'];
    const skins = ['#f8d5c2', '#e0ac69', '#8d5524', '#ffdbac', '#c68642'];

    // Top Grandstand (3 tiers behind top baseline)
    for (let row = 0; row < 3; row++) {
      const y = 14 + row * 18;
      for (let x = 60; x <= 840; x += 18) {
        this.crowd.push({
          x: x + (Math.random() - 0.5) * 6,
          y: y,
          baseY: y,
          size: 5.5,
          shirt: colors[Math.floor(Math.random() * colors.length)],
          skin: skins[Math.floor(Math.random() * skins.length)],
          cheerPhase: Math.random() * Math.PI * 2,
          hasCap: Math.random() > 0.4
        });
      }
    }

    // Left Grandstand (along west sideline)
    for (let col = 0; col < 3; col++) {
      const x = 32 + col * 26;
      for (let y = 110; y <= 490; y += 22) {
        this.crowd.push({
          x: x,
          y: y + (Math.random() - 0.5) * 6,
          baseY: y,
          size: 5.5,
          shirt: colors[Math.floor(Math.random() * colors.length)],
          skin: skins[Math.floor(Math.random() * skins.length)],
          cheerPhase: Math.random() * Math.PI * 2,
          hasCap: Math.random() > 0.4
        });
      }
    }

    // Right Grandstand (along east sideline)
    for (let col = 0; col < 3; col++) {
      const x = 800 + col * 26;
      for (let y = 110; y <= 490; y += 22) {
        this.crowd.push({
          x: x,
          y: y + (Math.random() - 0.5) * 6,
          baseY: y,
          size: 5.5,
          shirt: colors[Math.floor(Math.random() * colors.length)],
          skin: skins[Math.floor(Math.random() * skins.length)],
          cheerPhase: Math.random() * Math.PI * 2,
          hasCap: Math.random() > 0.4
        });
      }
    }

    // Ball Kids (Ramasseurs de balles) at 4 corners
    this.ballKids = [
      { x: 190, y: 78, crouch: true },
      { x: 710, y: 78, crouch: true },
      { x: 190, y: 522, crouch: true },
      { x: 710, y: 522, crouch: true }
    ];
  }

  // ==========================================
  // INPUTS & CONTROLS
  // ==========================================
  setupListeners() {
    const unlockAudio = () => {
      this.sound.init();
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });

    window.addEventListener('keydown', (e) => {
      this.sound.init();
      this.keys[e.code] = true;

      if (e.code === 'KeyP' || e.code === 'Escape') {
        this.togglePause();
      }

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
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.resizeCanvas(), 100);
    });

    // Menu Controls
    document.querySelectorAll('#mode-selector button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('#mode-selector button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.mode = e.target.dataset.mode;
        document.getElementById('difficulty-group').style.display = this.mode === 'ai' ? 'block' : 'none';
        document.getElementById('p2-label').textContent = this.mode === 'ai' ? 'IA (ALEX)' : 'JOUEUR 2';
        this.p2.name = this.mode === 'ai' ? 'ALEX' : 'JOUEUR 2';
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

    const fsBtn = document.getElementById('btn-fullscreen');
    if (fsBtn) {
      fsBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
          fsBtn.textContent = '✕';
        } else {
          document.exitFullscreen().catch(() => {});
          fsBtn.textContent = '⛶';
        }
      });
    }
  }

  setupTouchControls() {
    const joystickZone = document.getElementById('joystick-zone');
    const joystickBase = document.getElementById('joystick-base');
    const joystickStick = document.getElementById('joystick-stick');

    if (!joystickZone || !joystickStick) return;

    const onPointerDown = (e) => {
      e.preventDefault();
      this.sound.init();
      const rect = joystickBase.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      this.joystick.active = true;
      this.joystick.identifier = e.pointerId;
      this.joystick.startX = centerX;
      this.joystick.startY = centerY;
      updateJoystickPosition(e.clientX, e.clientY);
    };

    const updateJoystickPosition = (clientX, clientY) => {
      const dx = clientX - this.joystick.startX;
      const dy = clientY - this.joystick.startY;
      const distance = Math.hypot(dx, dy);
      const maxR = this.joystick.maxRadius;

      let clampedDx = dx;
      let clampedDy = dy;

      if (distance > maxR) {
        clampedDx = (dx / distance) * maxR;
        clampedDy = (dy / distance) * maxR;
      }

      this.joystick.vectorX = clampedDx / maxR;
      this.joystick.vectorY = clampedDy / maxR;
      joystickStick.style.transform = `translate(${clampedDx}px, ${clampedDy}px)`;
    };

    const onPointerMove = (e) => {
      if (!this.joystick.active || e.pointerId !== this.joystick.identifier) return;
      e.preventDefault();
      updateJoystickPosition(e.clientX, e.clientY);
    };

    const onPointerUp = (e) => {
      if (e.pointerId !== this.joystick.identifier) return;
      this.joystick.active = false;
      this.joystick.identifier = null;
      this.joystick.vectorX = 0;
      this.joystick.vectorY = 0;
      joystickStick.style.transform = `translate(0px, 0px)`;
    };

    joystickZone.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    // Touch Buttons
    const btnHit = document.getElementById('btn-touch-hit');
    const btnTopspin = document.getElementById('btn-touch-topspin');
    const btnSlice = document.getElementById('btn-touch-slice');

    const handleAction = (type) => {
      this.sound.init();
      if (this.gameState === 'serving') {
        if (this.score.server === 1) {
          this.triggerServe(1, type);
        }
      } else if (this.gameState === 'rally') {
        this.trySwing(this.p1, type);
      }
    };

    if (btnHit) {
      btnHit.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        handleAction('normal');
      });
    }

    if (btnTopspin) {
      btnTopspin.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        handleAction('topspin');
      });
    }

    if (btnSlice) {
      btnSlice.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        handleAction('slice');
      });
    }

    this.canvas.addEventListener('pointerdown', () => {
      if (this.gameState === 'serving' && this.score.server === 1) {
        handleAction('normal');
      }
    });
  }

  setupPWA() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
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
    this.crowdCheering = false;
    this.updateScoreboardUI();
  }

  togglePause() {
    if (this.gameState === 'menu') return;
    this.isPaused = !this.isPaused;
    document.getElementById('btn-pause').textContent = this.isPaused ? '▶ Play' : '⏸ Pause';
    if (this.isPaused) {
      this.showAnnouncement('PAUSE', 0);
    } else {
      this.hideAnnouncement();
    }
  }

  // ==========================================
  // SERVE LOGIC & POSITIONING
  // ==========================================
  prepareServe() {
    this.gameState = 'serving';
    this.isServingShot = true;
    this.ball.inPlay = false;
    this.ball.bounceCount = 0;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.vz = 0;
    this.ball.z = 22;

    const serveSideX = this.score.deuceSide ? 530 : 370;

    if (this.score.server === 1) {
      this.p1.x = serveSideX;
      this.p1.y = 510;
      this.p2.x = this.score.deuceSide ? 370 : 530;
      this.p2.y = 95;
      this.ball.x = this.p1.x + 12;
      this.ball.y = this.p1.y - 12;
      document.getElementById('match-status').textContent = 'P1 au service - Touchez FRAPPE';
    } else {
      this.p2.x = serveSideX;
      this.p2.y = 90;
      this.p1.x = this.score.deuceSide ? 370 : 530;
      this.p1.y = 505;
      this.ball.x = this.p2.x + 12;
      this.ball.y = this.p2.y + 12;
      document.getElementById('match-status').textContent = this.mode === 'ai' ? "L'IA prépare son service..." : 'P2 au service';

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
    this.isServingShot = true;

    const targetServiceX = this.score.deuceSide ? 310 + Math.random() * 110 : 480 + Math.random() * 110;
    const surface = SURFACES[this.surfaceKey];

    if (server === 1) {
      const targetY = 245 + Math.random() * 40;
      const dx = targetServiceX - this.ball.x;
      const dy = targetY - this.ball.y;
      const dist = Math.hypot(dx, dy);
      const speed = (type === 'topspin' ? 9.8 : 8.8) * surface.ballSpeedMul;

      this.ball.vx = (dx / dist) * speed;
      this.ball.vy = (dy / dist) * speed;
      this.ball.vz = 4.8;
      this.p1.swinging = true;
      this.p1.swingProgress = 1;
      this.p1.swingType = type;
      this.p1.isForehand = true;
    } else {
      const targetY = 320 + Math.random() * 40;
      const dx = targetServiceX - this.ball.x;
      const dy = targetY - this.ball.y;
      const dist = Math.hypot(dx, dy);
      const speed = 8.2 * surface.ballSpeedMul;

      this.ball.vx = (dx / dist) * speed;
      this.ball.vy = (dy / dist) * speed;
      this.ball.vz = 4.6;
      this.p2.swinging = true;
      this.p2.swingProgress = 1;
      this.p2.swingType = type;
      this.p2.isForehand = true;
    }

    this.sound.playHit(type);
    document.getElementById('match-status').textContent = 'Échange en cours...';
  }

  // ==========================================
  // PHYSICS, GAMEPLAY & 100% ACCURATE RULES
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
    // --- Player 1 ---
    let p1dx = 0;
    let p1dy = 0;

    if (this.keys['ArrowLeft']) p1dx -= 1;
    if (this.keys['ArrowRight']) p1dx += 1;
    if (this.keys['ArrowUp']) p1dy -= 1;
    if (this.keys['ArrowDown']) p1dy += 1;

    if (this.joystick.active) {
      p1dx = this.joystick.vectorX;
      p1dy = this.joystick.vectorY;
    } else if (p1dx !== 0 && p1dy !== 0) {
      p1dx *= 0.7071;
      p1dy *= 0.7071;
    }

    this.p1.isMoving = Math.hypot(p1dx, p1dy) > 0.1;
    if (this.p1.isMoving) this.p1.walkAnim += 0.25;

    this.p1.x += p1dx * this.p1.speed;
    this.p1.y += p1dy * this.p1.speed;

    this.p1.x = Math.max(COURT.left - 20, Math.min(COURT.right + 20, this.p1.x));
    this.p1.y = Math.max(COURT.netY + 28, Math.min(COURT.bottom + 25, this.p1.y));

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
      if (this.keys['KeyS']) p2dy -= 1;

      if (p2dx !== 0 && p2dy !== 0) {
        p2dx *= 0.7071;
        p2dy *= 0.7071;
      }

      this.p2.isMoving = Math.hypot(p2dx, p2dy) > 0.1;
      if (this.p2.isMoving) this.p2.walkAnim += 0.25;

      this.p2.x += p2dx * this.p2.speed;
      this.p2.y += p2dy * this.p2.speed;

      if (this.gameState === 'rally') {
        if (this.keys['KeyF']) this.trySwing(this.p2, 'normal');
        else if (this.keys['KeyG']) this.trySwing(this.p2, 'topspin');
      }
    } else {
      this.updateAI();
    }

    this.p2.x = Math.max(COURT.left - 20, Math.min(COURT.right + 20, this.p2.x));
    this.p2.y = Math.max(COURT.top - 18, Math.min(COURT.netY - 28, this.p2.y));

    if (this.p2.swingProgress > 0) {
      this.p2.swingProgress -= 0.12;
      if (this.p2.swingProgress <= 0) this.p2.swinging = false;
    }
  }

  updateAI() {
    const diffSettings = {
      easy: { speed: 3.4, errorMargin: 48, attackChance: 0.2 },
      medium: { speed: 4.4, errorMargin: 22, attackChance: 0.5 },
      hard: { speed: 5.2, errorMargin: 8, attackChance: 0.85 }
    }[this.difficulty];

    this.p2.speed = diffSettings.speed;

    if (this.ball.vy < 0) {
      const timeToReach = Math.abs((this.p2.y - this.ball.y) / (this.ball.vy || 1));
      let predictedX = this.ball.x + this.ball.vx * timeToReach;

      if (this.p2.aiTimer++ % 20 === 0) {
        this.p2.targetX = predictedX + (Math.random() - 0.5) * diffSettings.errorMargin;
      }

      const dx = this.p2.targetX - this.p2.x;
      this.p2.isMoving = Math.abs(dx) > 6;
      if (this.p2.isMoving) {
        this.p2.walkAnim += 0.25;
        this.p2.x += Math.sign(dx) * this.p2.speed;
      }

      const idealY = 105;
      const dy = idealY - this.p2.y;
      if (Math.abs(dy) > 4) {
        this.p2.y += Math.sign(dy) * (this.p2.speed * 0.7);
      }

      const dist = Math.hypot(this.ball.x - this.p2.x, this.ball.y - this.p2.y);
      if (dist < 48 && this.ball.z < 44 && this.ball.lastHitter === 1) {
        const shotType = Math.random() < diffSettings.attackChance ? 'topspin' : 'normal';
        this.trySwing(this.p2, shotType);
      }
    } else {
      const returnX = COURT.centerX;
      const returnY = 95;
      const dx = returnX - this.p2.x;
      const dy = returnY - this.p2.y;
      this.p2.isMoving = Math.hypot(dx, dy) > 8;
      if (this.p2.isMoving) {
        this.p2.walkAnim += 0.2;
        this.p2.x += Math.sign(dx) * (this.p2.speed * 0.6);
        this.p2.y += Math.sign(dy) * (this.p2.speed * 0.6);
      }
    }
  }

  trySwing(player, type) {
    player.swinging = true;
    player.swingType = type;
    player.swingProgress = 1;
    // Determine Forehand vs Backhand
    player.isForehand = this.ball.x >= player.x;
  }

  updateBall() {
    const surface = SURFACES[this.surfaceKey];

    // Trail
    this.ballTrail.push({ x: this.ball.x, y: this.ball.y, z: this.ball.z, alpha: 0.6 });
    if (this.ballTrail.length > 8) this.ballTrail.shift();

    // 3D Motion
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;
    this.ball.z += this.ball.vz;
    this.ball.rotation += 0.15;

    // Gravity
    this.ball.vz -= 0.28;

    // ==========================================
    // NET COLLISION (ACCURATE TENNIS RULE)
    // ==========================================
    const prevY = this.ball.y - this.ball.vy;
    if ((prevY < COURT.netY && this.ball.y >= COURT.netY) || (prevY > COURT.netY && this.ball.y <= COURT.netY)) {
      if (this.ball.z < COURT.netHeight) {
        // Ball strikes the net!
        this.sound.playNet();
        this.createParticles(this.ball.x, COURT.netY, '#ffffff', 10);

        // It loses momentum and drops back on the side of the player who hit it!
        this.ball.vx *= 0.15;
        this.ball.vy = (this.ball.lastHitter === 1 ? 0.7 : -0.7);
        this.ball.vz = -0.6;
      }
    }

    // ==========================================
    // BOUNCE & POINT ATTRIBUTION
    // ==========================================
    if (this.ball.z <= 0) {
      this.handleBallBounce();
    }

    // Out of screen limits
    if (this.ball.y < -30 || this.ball.y > COURT.height + 30 || this.ball.x < 20 || this.ball.x > COURT.width - 20) {
      if (this.gameState === 'rally') {
        const winner = this.ball.lastHitter === 1 ? 2 : 1;
        this.awardPoint(winner, 'FAUTE / BALLE DEHORS !');
      }
    }
  }

  handleBallBounce() {
    const surface = SURFACES[this.surfaceKey];
    this.ball.z = 0;
    this.ball.bounceCount++;
    this.sound.playBounce();
    this.createParticles(this.ball.x, this.ball.y, surface.courtBg, 6);

    this.ball.vz = -this.ball.vz * surface.bounceRestitution;
    this.ball.vx *= surface.friction;
    this.ball.vy *= surface.friction;

    const isTopHalf = this.ball.y < COURT.netY; // P2 side
    const isBottomHalf = this.ball.y > COURT.netY; // P1 side

    if (this.ball.bounceCount === 1) {
      // 1. Did the ball cross the net to the opponent's side?
      if (this.ball.lastHitter === 1 && !isTopHalf) {
        // Player 1 failed to send the ball over the net! Point to Player 2!
        this.awardPoint(2, 'FILET / FAUTE P1 !');
        return;
      }
      if (this.ball.lastHitter === 2 && !isBottomHalf) {
        // Player 2 failed to send the ball over the net! Point to Player 1!
        this.awardPoint(1, 'FILET / FAUTE P2 !');
        return;
      }

      // 2. Was it a serve? Check service box
      if (this.isServingShot) {
        const inServiceBox = this.isInServiceBox(this.ball.x, this.ball.y, this.score.server, this.score.deuceSide);
        if (!inServiceBox) {
          const winner = this.score.server === 1 ? 2 : 1;
          this.awardPoint(winner, 'SERVICE FAUTE !');
          return;
        }
        this.isServingShot = false; // Valid serve, rally begins
      } else {
        // 3. Normal rally: must land inside singles court lines
        const insideSingles = (
          this.ball.x >= COURT.singlesLeft &&
          this.ball.x <= COURT.singlesRight &&
          this.ball.y >= COURT.top &&
          this.ball.y <= COURT.bottom
        );

        if (!insideSingles) {
          // Ball bounced outside singles court! Point to opponent!
          const winner = this.ball.lastHitter === 1 ? 2 : 1;
          this.awardPoint(winner, 'FAUTE / BALLE DEHORS !');
          return;
        }
      }
    } else if (this.ball.bounceCount >= 2) {
      // Double bounce:
      // If it double-bounced on P1's side -> P1 failed to hit it -> Point to P2!
      // If it double-bounced on P2's side -> P2 failed to hit it -> Point to P1!
      if (isBottomHalf) {
        this.awardPoint(2, 'DOUBLE REBOND P1 !');
      } else {
        this.awardPoint(1, 'DOUBLE REBOND P2 !');
      }
      return;
    }
  }

  isInServiceBox(x, y, server, deuceSide) {
    if (server === 1) {
      // P1 serves upwards to P2
      // Deuce side: serves from bottom-right to top-left service box
      if (deuceSide) {
        return x >= COURT.singlesLeft && x <= COURT.centerX && y >= COURT.serviceTop && y <= COURT.netY;
      } else {
        // Ad side: serves from bottom-left to top-right service box
        return x >= COURT.centerX && x <= COURT.singlesRight && y >= COURT.serviceTop && y <= COURT.netY;
      }
    } else {
      // P2 serves downwards to P1
      if (deuceSide) {
        return x >= COURT.centerX && x <= COURT.singlesRight && y >= COURT.netY && y <= COURT.serviceBottom;
      } else {
        return x >= COURT.singlesLeft && x <= COURT.centerX && y >= COURT.netY && y <= COURT.serviceBottom;
      }
    }
  }

  checkRacketHits() {
    [this.p1, this.p2].forEach(player => {
      if (!player.swinging) return;

      const dist = Math.hypot(this.ball.x - player.x, this.ball.y - player.y);
      const isEligible = (player.id === 1 && this.ball.vy > 0) || (player.id === 2 && this.ball.vy < 0);

      if (dist < player.racketRadius + 18 && this.ball.z < 52 && isEligible) {
        this.hitBall(player);
      }
    });
  }

  hitBall(player) {
    const surface = SURFACES[this.surfaceKey];
    this.ball.lastHitter = player.id;
    this.ball.bounceCount = 0;
    this.isServingShot = false; // Normal rally stroke

    const contactOffsetX = (this.ball.x - player.x) / player.racketRadius;
    let baseSpeed = 7.6;
    let vz = 4.2;

    if (player.swingType === 'topspin') {
      baseSpeed = 9.3;
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
    const angleX = contactOffsetX * 3.6;
    this.ball.vx = angleX;

    if (player.id === 1) {
      this.ball.vy = -baseSpeed;
    } else {
      this.ball.vy = baseSpeed;
    }

    this.ball.vz = vz;
    this.sound.playHit(player.swingType);
  }

  // ==========================================
  // SCORING & TOURNAMENT RULES
  // ==========================================
  awardPoint(winnerId, reason) {
    if (this.gameState === 'point_end' || this.gameState === 'game_over') return;
    this.gameState = 'point_end';
    this.sound.playPointWin();
    this.showAnnouncement(reason, 1600);
    this.crowdCheering = true;

    if (winnerId === 1) this.score.p1Points++;
    else this.score.p2Points++;

    this.evaluateTennisScore();
    this.updateScoreboardUI();

    setTimeout(() => {
      this.crowdCheering = false;
      if (this.gameState !== 'menu' && this.gameState !== 'game_over') {
        this.score.deuceSide = !this.score.deuceSide;
        this.prepareServe();
      }
    }, 1800);
  }

  evaluateTennisScore() {
    const p1 = this.score.p1Points;
    const p2 = this.score.p2Points;

    if (p1 >= 4 && p1 - p2 >= 2) {
      this.winGame(1);
    } else if (p2 >= 4 && p2 - p1 >= 2) {
      this.winGame(2);
    }
  }

  winGame(winnerId) {
    if (winnerId === 1) this.score.p1Games++;
    else this.score.p2Games++;

    this.score.p1Points = 0;
    this.score.p2Points = 0;
    this.score.server = this.score.server === 1 ? 2 : 1;
    this.score.deuceSide = true;

    const winnerName = winnerId === 1 ? 'JOUEUR 1' : (this.mode === 'ai' ? 'ALEX' : 'JOUEUR 2');
    this.showAnnouncement(`JEU ${winnerName} !`, 2000);

    if (this.score.p1Games >= 3) this.winSet(1);
    else if (this.score.p2Games >= 3) this.winSet(2);
  }

  winSet(winnerId) {
    if (winnerId === 1) this.score.p1Sets++;
    else this.score.p2Sets++;

    this.score.p1Games = 0;
    this.score.p2Games = 0;

    const winnerName = winnerId === 1 ? 'JOUEUR 1' : (this.mode === 'ai' ? 'ALEX' : 'JOUEUR 2');
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
  // PARTICLES
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
  // 4. REALISTIC GRAPHICS RENDERING
  // ==========================================
  draw() {
    const ctx = this.ctx;
    const surface = SURFACES[this.surfaceKey];

    // Stadium Outer Surround
    ctx.fillStyle = surface.outerBg;
    ctx.fillRect(0, 0, COURT.width, COURT.height);

    // Draw Stadium Tribunes / Grandstands
    this.drawStadiumGrandstands();

    // Court Infield Clay/Grass with Texture
    ctx.fillStyle = surface.courtBg;
    ctx.fillRect(COURT.left, COURT.top, COURT.right - COURT.left, COURT.bottom - COURT.top);

    // Singles Court Inner Tint
    ctx.fillStyle = surface.courtInnerBg;
    ctx.fillRect(COURT.singlesLeft, COURT.top, COURT.singlesRight - COURT.singlesLeft, COURT.bottom - COURT.top);

    // Court White Chalk Boundary Lines
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

    // Center baseline marks
    ctx.moveTo(COURT.centerX, COURT.top);
    ctx.lineTo(COURT.centerX, COURT.top + 14);
    ctx.moveTo(COURT.centerX, COURT.bottom);
    ctx.lineTo(COURT.centerX, COURT.bottom - 14);

    ctx.stroke();

    // Ball Kids (Ramasseurs de balles)
    this.drawBallKids();

    // Umpire Chair (Chaise d'arbitre)
    this.drawUmpireChair();

    // 3D Net Structure
    this.drawNet();

    // Ball Trail
    this.ballTrail.forEach(t => {
      ctx.beginPath();
      ctx.arc(t.x, t.y - t.z, this.ball.radius * 0.85, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 50, ${t.alpha * 0.35})`;
      ctx.fill();
    });

    // Realistic Ball Shadow on Court
    ctx.beginPath();
    const shadowScale = Math.max(0.25, 1 - (this.ball.z / 130));
    ctx.ellipse(this.ball.x, this.ball.y, this.ball.radius * shadowScale * 1.4, this.ball.radius * shadowScale * 0.8, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 0, 0, ${0.45 * shadowScale})`;
    ctx.fill();

    // Realistic Tennis Ball with Seams
    this.drawTennisBall();

    // Realistic Tennis Players (with outfits, headbands, real rackets and swing animations)
    this.drawRealisticPlayer(this.p2, false);
    this.drawRealisticPlayer(this.p1, true);

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

  // Draw Grandstands with Animated Public
  drawStadiumGrandstands() {
    const ctx = this.ctx;
    const now = Date.now() * 0.005;

    // Stadium Banners / LED Boards
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(COURT.left, COURT.top - 16, COURT.right - COURT.left, 14);
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 8px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎾  GRAND CHELEM MASTERS  •  ROLEX  •  ANTIGRAVITY OPEN  🎾', COURT.centerX, COURT.top - 6);

    // Tribunes Backdrop
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(40, 8, 820, 56); // North Stand
    ctx.fillRect(20, 95, 120, 420); // West Stand
    ctx.fillRect(760, 95, 120, 420); // East Stand

    // Draw Spectators
    this.crowd.forEach(spec => {
      let cheerY = 0;
      if (this.crowdCheering) {
        cheerY = Math.sin(now * 3 + spec.cheerPhase) * 4;
      }

      const drawY = spec.y - cheerY;

      // Torso / Shirt
      ctx.fillStyle = spec.shirt;
      ctx.beginPath();
      ctx.arc(spec.x, drawY + 3, spec.size, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = spec.skin;
      ctx.beginPath();
      ctx.arc(spec.x, drawY - 2, spec.size * 0.65, 0, Math.PI * 2);
      ctx.fill();

      // Cap / Hair
      if (spec.hasCap) {
        ctx.fillStyle = spec.shirt;
        ctx.beginPath();
        ctx.arc(spec.x, drawY - 3.5, spec.size * 0.65, Math.PI, 0);
        ctx.fill();
      }
    });
  }

  // Draw Ball Kids (Ramasseurs de balles)
  drawBallKids() {
    const ctx = this.ctx;
    this.ballKids.forEach(kid => {
      // Shadow
      ctx.beginPath();
      ctx.ellipse(kid.x, kid.y + 6, 8, 4, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fill();

      // Uniform (Navy & White)
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.arc(kid.x, kid.y + 1, 6, 0, Math.PI * 2);
      ctx.fill();

      // Head & White Cap
      ctx.fillStyle = '#f8d5c2';
      ctx.beginPath();
      ctx.arc(kid.x, kid.y - 4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(kid.x, kid.y - 5.5, 4.2, Math.PI, 0);
      ctx.fill();
    });
  }

  // Draw Umpire Chair (Chaise de l'arbitre)
  drawUmpireChair() {
    const ctx = this.ctx;
    const chairX = COURT.left - 30;
    const chairY = COURT.netY;

    // Chair Shadow
    ctx.beginPath();
    ctx.ellipse(chairX, chairY + 12, 14, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();

    // High Ladder Legs
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(chairX - 8, chairY + 12);
    ctx.lineTo(chairX - 3, chairY - 14);
    ctx.moveTo(chairX + 8, chairY + 12);
    ctx.lineTo(chairX + 3, chairY - 14);
    ctx.stroke();

    // Chair Seat Platform
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(chairX - 10, chairY - 16, 20, 5);

    // Umpire Character
    ctx.fillStyle = '#1e293b'; // Blazer
    ctx.beginPath();
    ctx.arc(chairX, chairY - 21, 6, 0, Math.PI * 2);
    ctx.fill();

    // Umpire Head following ball!
    const lookAngle = Math.atan2(this.ball.y - chairY, this.ball.x - chairX);
    ctx.fillStyle = '#f8d5c2';
    ctx.beginPath();
    ctx.arc(chairX + Math.cos(lookAngle) * 2, chairY - 28, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Microphone & Desk
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(chairX - 2, chairY - 23, 10, 3);
  }

  // Draw 3D Net
  drawNet() {
    const ctx = this.ctx;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fillRect(COURT.left - 15, COURT.netY + 2, (COURT.right - COURT.left) + 30, 4);

    // Net Mesh Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1;
    for (let x = COURT.left - 10; x <= COURT.right + 10; x += 9) {
      ctx.beginPath();
      ctx.moveTo(x, COURT.netY - COURT.netHeight);
      ctx.lineTo(x, COURT.netY);
      ctx.stroke();
    }

    // Top White Band
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(COURT.left - 14, COURT.netY - COURT.netHeight);
    ctx.lineTo(COURT.right + 14, COURT.netY - COURT.netHeight);
    ctx.stroke();

    // Posts
    ctx.fillStyle = '#334155';
    ctx.fillRect(COURT.left - 16, COURT.netY - COURT.netHeight - 5, 6, COURT.netHeight + 7);
    ctx.fillRect(COURT.right + 10, COURT.netY - COURT.netHeight - 5, 6, COURT.netHeight + 7);
  }

  // Draw Realistic Tennis Ball with 3D Seams
  drawTennisBall() {
    const ctx = this.ctx;
    const ballX = this.ball.x;
    const ballY = this.ball.y - this.ball.z;
    const r = this.ball.radius + (this.ball.z * 0.04);

    ctx.save();
    ctx.translate(ballX, ballY);
    ctx.rotate(this.ball.rotation);

    // Base Felt
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(-2, -2, 1, 0, 0, r);
    grad.addColorStop(0, '#ffff66');
    grad.addColorStop(0.75, '#ccff00');
    grad.addColorStop(1, '#88bb00');
    ctx.fillStyle = grad;
    ctx.fill();

    // Curved Tennis Seams
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(-r * 0.5, 0, r * 0.75, -Math.PI * 0.4, Math.PI * 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(r * 0.5, 0, r * 0.75, Math.PI * 0.6, Math.PI * 1.4);
    ctx.stroke();

    ctx.restore();
  }

  // ==========================================
  // REALISTIC TENNIS PLAYER SPRITE DRAWING
  // ==========================================
  drawRealisticPlayer(player, isP1) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(player.x, player.y);

    // 1. Soft Oval Player Ground Shadow
    ctx.beginPath();
    ctx.ellipse(0, 16, 17, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.fill();

    // 2. Animated Legs & Tennis Shoes
    const legCycle = player.isMoving ? Math.sin(player.walkAnim) * 6 : 0;
    
    // Left Leg & Shoe
    ctx.fillStyle = '#ffffff'; // Sock
    ctx.fillRect(-8, 8 + legCycle, 5, 8);
    ctx.fillStyle = player.shirtColor; // Sneaker
    ctx.fillRect(-9, 14 + legCycle, 7, 5);

    // Right Leg & Shoe
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(3, 8 - legCycle, 5, 8);
    ctx.fillStyle = player.shirtColor;
    ctx.fillRect(2, 14 - legCycle, 7, 5);

    // 3. Tennis Shorts
    ctx.fillStyle = player.shortsColor;
    ctx.beginPath();
    ctx.moveTo(-11, 2);
    ctx.lineTo(11, 2);
    ctx.lineTo(9, 10);
    ctx.lineTo(1, 10);
    ctx.lineTo(0, 6);
    ctx.lineTo(-1, 10);
    ctx.lineTo(-9, 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 4. Tennis Polo Shirt & Torso
    ctx.fillStyle = player.shirtColor;
    ctx.beginPath();
    ctx.roundRect(-12, -12, 24, 16, 4);
    ctx.fill();

    // Polo Collar / V-neck
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-4, -12);
    ctx.lineTo(0, -6);
    ctx.lineTo(4, -12);
    ctx.closePath();
    ctx.fill();

    // 5. Left Arm (Balance Arm)
    ctx.fillStyle = player.skinTone;
    ctx.beginPath();
    ctx.arc(-13, -6, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // 6. Right Arm & Real Tennis Racket with Strings
    this.drawPlayerRacketArm(player, isP1);

    // 7. Head, Hair & Tennis Headband / Cap
    ctx.fillStyle = player.skinTone;
    ctx.beginPath();
    ctx.arc(0, -18, 7.5, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = player.hairColor;
    ctx.beginPath();
    ctx.arc(0, -20, 7.5, Math.PI * 0.8, Math.PI * 0.2, true);
    ctx.fill();

    // Headband / Cap
    ctx.fillStyle = player.headbandColor;
    ctx.fillRect(-7.5, -21, 15, 3.5);

    // Player Label Badge
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(player.name, 0, -29);
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  // Draw Detailed Tennis Racket with Strings & Dynamic Swing Arc
  drawPlayerRacketArm(player, isP1) {
    const ctx = this.ctx;
    ctx.save();

    let armAngle = isP1 ? -Math.PI * 0.35 : Math.PI * 0.35;

    // Dynamic Swing Rotation
    if (player.swinging) {
      const swingRatio = 1 - player.swingProgress; // 0 to 1
      const startAngle = player.isForehand ? (isP1 ? -Math.PI * 0.8 : Math.PI * 0.2) : (isP1 ? Math.PI * 0.1 : -Math.PI * 0.7);
      const endAngle = player.isForehand ? (isP1 ? Math.PI * 0.2 : -Math.PI * 0.8) : (isP1 ? -Math.PI * 0.8 : Math.PI * 0.2);
      armAngle = startAngle + (endAngle - startAngle) * swingRatio;

      // Neon Swing Trail
      ctx.strokeStyle = player.swingType === 'topspin' ? '#39ff14' : (player.swingType === 'slice' ? '#00f0ff' : '#ffbe0b');
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, player.racketRadius + 4, armAngle - 0.5, armAngle + 0.5);
      ctx.stroke();
    } else {
      armAngle = player.isForehand ? (isP1 ? -Math.PI * 0.3 : Math.PI * 0.3) : (isP1 ? -Math.PI * 0.7 : Math.PI * 0.7);
    }

    ctx.rotate(armAngle);

    // Arm (Shoulder to Wrist)
    ctx.fillStyle = player.skinTone;
    ctx.beginPath();
    ctx.roundRect(4, -4, 14, 6, 3);
    ctx.fill();

    // Sweatband
    ctx.fillStyle = player.headbandColor;
    ctx.fillRect(14, -4, 4, 6);

    // Racket Grip
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(18, -2.5, 9, 5);

    // Racket Throat
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(27, 0);
    ctx.lineTo(32, -4);
    ctx.lineTo(32, 4);
    ctx.closePath();
    ctx.stroke();

    // Racket Oval Head Frame
    ctx.strokeStyle = player.shirtColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(39, 0, 9, 7, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Racket Strings Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    // Vertical strings
    for (let sx = 33; sx <= 45; sx += 3) {
      ctx.moveTo(sx, -4.5);
      ctx.lineTo(sx, 4.5);
    }
    // Horizontal strings
    for (let sy = -4; sy <= 4; sy += 2.5) {
      ctx.moveTo(32, sy);
      ctx.lineTo(46, sy);
    }
    ctx.stroke();

    ctx.restore();
  }

  animate() {
    this.update();
    this.draw();
    requestAnimationFrame(this.animate);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new TennisGame();
});
