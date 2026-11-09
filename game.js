'use strict';
// Team 2 Brawl — 2D platform fighter MVP. No dependencies: one canvas, fixed 60 Hz simulation.
(() => {
  // ---------------------------------------------------------------- canvas
  const W = 1280, H = 720;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  function fit() {
    const dpr = window.devicePixelRatio || 1;
    const s = Math.min(innerWidth / W, innerHeight / H);
    canvas.style.width = Math.floor(W * s) + 'px';
    canvas.style.height = Math.floor(H * s) + 'px';
    canvas.width = Math.floor(W * s * dpr);
    canvas.height = Math.floor(H * s * dpr);
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  }
  addEventListener('resize', fit);
  fit();

  // ---------------------------------------------------------------- tuning
  const G = 0.6, MAX_FALL = 12, FAST_FALL = 17;
  const RUN = 6.2, AIR_ACC = 0.6, AIR_MAX = 5.5;
  const JUMP = -14, SHORT_HOP = -9.5, DJUMP = -12.5, JSQ = 4; // JSQ = jump-squat frames
  const HW = 20, FH = 70;                                      // fighter half-width, height
  const STOCKS = 3;

  const STAGE = {
    solids: [{ x: 240, y: 560, w: 800, h: 60 }],
    plats: [{ x: 330, y: 420, w: 200 }, { x: 750, y: 420, w: 200 }, { x: 540, y: 290, w: 200 }],
  };
  const MAIN = STAGE.solids[0];
  const BLAST = { l: -110, r: W + 110, t: -220, b: H + 120 };
  const SPAWNS = [{ x: 440, y: 560 }, { x: 840, y: 560 }];

  // box: hitbox centre offset from the fighter's feet (x is mirrored by facing).
  // angle: launch angle in degrees, 0 = forward, 90 = up, negative = down.
  // both: hits on both sides; launch direction follows where the target stands.
  const MOVES = {
    jab:    { dmg: 4,  base: 3,   growth: 0.05, angle: 30,  start: 3,  active: 3, end: 8,  box: { x: 32, y: -48, w: 42, h: 24 } },
    utilt:  { dmg: 5,  base: 4,   growth: 0.06, angle: 85,  start: 4,  active: 4, end: 10, box: { x: 6,  y: -92, w: 56, h: 34 } },
    dtilt:  { dmg: 5,  base: 3.5, growth: 0.05, angle: 20,  start: 4,  active: 3, end: 10, box: { x: 34, y: -12, w: 48, h: 18 } },
    dair:   { dmg: 7,  base: 4,   growth: 0.08, angle: -75, start: 6,  active: 5, end: 12, box: { x: 0,  y: 10,  w: 46, h: 28 } },
    fsmash: { dmg: 14, base: 6,   growth: 0.15, angle: 38,  start: 14, active: 4, end: 20, box: { x: 44, y: -46, w: 62, h: 36 } },
    usmash: { dmg: 12, base: 6,   growth: 0.17, angle: 88,  start: 10, active: 5, end: 18, box: { x: 0,  y: -98, w: 66, h: 44 }, airBoost: -14 },
    dsmash: { dmg: 11, base: 5,   growth: 0.13, angle: 25,  start: 12, active: 4, end: 20, box: { x: 0,  y: -14, w: 132, h: 22 }, both: true },
  };
  for (const k in MOVES) MOVES[k].name = k;

  // ---------------------------------------------------------------- audio
  let actx = null;
  function unlockAudio() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* no audio */ } }
    else if (actx.state === 'suspended') actx.resume();
  }
  function tone(freq, dur, type = 'square', vol = 0.06, slide = 1) {
    if (!actx) return;
    const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide !== 1) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(actx.destination);
    o.start(t); o.stop(t + dur);
  }
  const sfx = {
    jump: () => tone(420, 0.09, 'sine', 0.05, 1.8),
    swing: () => tone(180, 0.07, 'triangle', 0.03, 2),
    hit: (d) => { tone(260 - d * 8, 0.14, 'square', 0.05 + d * 0.006, 0.4); tone(90, 0.12, 'sawtooth', 0.05, 0.5); },
    block: () => tone(900, 0.07, 'triangle', 0.05, 0.7),
    brk: () => tone(600, 0.5, 'sawtooth', 0.08, 0.2),
    ko: () => { tone(140, 0.7, 'sawtooth', 0.12, 0.25); tone(70, 0.8, 'square', 0.08, 0.5); },
    beep: (hi) => tone(hi ? 880 : 440, 0.15, 'square', 0.05),
  };

  // ---------------------------------------------------------------- input
  const GAME_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Slash', 'Period', 'Comma', 'Backquote']);
  const keys = new Set();
  const pressedKeys = new Set();
  addEventListener('keydown', (e) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (!e.repeat) pressedKeys.add(e.code);
    keys.add(e.code);
    unlockAudio();
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  addEventListener('pointerdown', unlockAudio);

  const KEYMAPS = [
    { left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'], light: ['KeyF'], heavy: ['KeyG'], shield: ['KeyH'] },
    { left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
      light: ['Comma', 'Numpad1'], heavy: ['Period', 'Numpad2'], shield: ['Slash', 'Numpad3'] },
  ];

  const pads = () => (navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : []);
  let padPrev = new Set(), padNow = new Set();
  function pollPads() {
    padPrev = padNow; padNow = new Set();
    pads().forEach((p, i) => p.buttons.forEach((b, n) => { if (b.pressed) padNow.add(i + ':' + n); }));
  }
  const padPressed = (n) => [...padNow].some((k) => k.endsWith(':' + n) && !padPrev.has(k));

  class HumanCtrl {
    constructor(i) { this.i = i; }
    held() {
      const m = KEYMAPS[this.i], s = {};
      for (const k in m) s[k] = m[k].some((c) => keys.has(c));
      const gp = pads()[this.i];
      if (gp) {
        const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
        const b = (n) => !!(gp.buttons[n] && gp.buttons[n].pressed);
        s.left = s.left || ax < -0.4 || b(14);
        s.right = s.right || ax > 0.4 || b(15);
        s.down = s.down || ay > 0.5 || b(13);
        s.up = s.up || ay < -0.6 || b(12) || b(0) || b(3);  // stick up / A / Y jump
        s.light = s.light || b(2);                           // X
        s.heavy = s.heavy || b(1);                           // B
        s.shield = s.shield || b(4) || b(5) || b(6) || b(7); // shoulders / triggers
      }
      return s;
    }
  }

  // Simple CPU: chases, attacks in range, shields sometimes and recovers to the stage.
  class CpuCtrl {
    constructor() { this.cd = 40; this.shieldT = 0; this.lastUp = false; this.lastHeavy = false; }
    held(f, g) {
      const s = { left: false, right: false, up: false, down: false, light: false, heavy: false, shield: false };
      const toward = (x) => { if (x < f.x - 8) s.left = true; else if (x > f.x + 8) s.right = true; };
      if (this.cd > 0) this.cd--;
      const o = g.fighters.find((x) => x !== f);

      // recovery
      const below = f.y > MAIN.y + 4;
      const offstage = f.x < MAIN.x + 10 || f.x > MAIN.x + MAIN.w - 10 || below;
      if (!f.ground && offstage) {
        const under = below && f.x > MAIN.x - HW && f.x < MAIN.x + MAIN.w + HW;
        toward(under ? (f.x < W / 2 ? MAIN.x - 40 : MAIN.x + MAIN.w + 40) : W / 2);
        if (f.vy > -1 && f.y > MAIN.y - 60) {
          if (f.jumps > 0 && !this.lastUp) s.up = true;
          else if (f.jumps === 0 && !f.usedBoost && !this.lastHeavy && !under) { s.up = true; s.heavy = true; }
        }
        this.lastUp = s.up; this.lastHeavy = s.heavy;
        return s;
      }
      this.lastUp = this.lastHeavy = false;
      if (!o || o.dead) { toward(W / 2); return s; }

      const dx = o.x - f.x, dy = o.y - f.y, adx = Math.abs(dx);
      if (f.ground && o.move && o.mt < o.move.start && adx < 130 && Math.abs(dy) < 90 && Math.random() < 0.12) this.shieldT = 14;
      if (this.shieldT > 0) { this.shieldT--; s.shield = true; return s; }

      const tx = Math.max(MAIN.x + 30, Math.min(MAIN.x + MAIN.w - 30, o.x));
      if (adx > 55) toward(tx);
      if (f.ground && dy < -90 && adx < 170 && Math.random() < 0.06) s.up = true;
      if (!f.ground && dy < -60 && f.jumps > 0 && f.vy > 0 && Math.random() < 0.08) s.up = true;
      if (f.ground && f.onPlat && dy > 40 && Math.random() < 0.03) s.down = true;

      if (this.cd === 0 && adx < 95 && Math.abs(dy) < 85) {
        s.left = dx < 0; s.right = dx >= 0;
        const r = Math.random();
        if (dy < -45) { s.up = true; s[r < 0.5 ? 'light' : 'heavy'] = true; }
        else if (!f.ground && dy > 25) { s.down = true; s.light = true; }
        else if (o.dmg > 80 && r < 0.5) s.heavy = true;
        else if (r < 0.2) { s.down = true; s.heavy = true; }
        else s.light = true;
        this.cd = 16 + ((Math.random() * 30) | 0);
      }
      return s;
    }
  }

  // ---------------------------------------------------------------- game state
  const game = {
    state: 'menu', mode: 1, fighters: [], parts: [],
    hitstop: 0, shake: 0, countdown: 0, goT: 0, overT: 0,
    winner: null, paused: false, debug: false, frame: 0,
  };
  window.__game = game; // handy for debugging in the console

  function burst(x, y, color, n, speed, size = 4, life = 30) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.3 + Math.random());
      game.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, color, size: size * (0.5 + Math.random()) });
    }
  }

  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  // ---------------------------------------------------------------- fighter
  class Fighter {
    constructor(idx, name, color, ctrl) {
      Object.assign(this, { idx, name, color, ctrl, stocks: STOCKS, prev: {} });
      this.reset(SPAWNS[idx]);
    }
    reset(sp) {
      Object.assign(this, {
        x: sp.x, y: sp.y, vx: 0, vy: 0, facing: this.idx === 0 ? 1 : -1,
        ground: true, onPlat: false, jumps: 1, usedBoost: false, fastfall: false,
        dmg: 0, move: null, mt: 0, hitList: [], hitstun: 0, jsq: 0, dropT: 0,
        shielding: false, shieldHP: 100, broken: 0, invuln: 0, dead: false, respawnT: 0,
      });
    }
    respawn() {
      this.reset({ x: W / 2, y: 120 });
      this.ground = false; this.invuln = 120;
    }
    hurtbox() { return { x: this.x - HW, y: this.y - FH, w: HW * 2, h: FH }; }
    hitbox() {
      const m = this.move;
      if (!m || this.mt < m.start || this.mt >= m.start + m.active) return null;
      const b = m.box;
      return { x: this.x + b.x * this.facing - b.w / 2, y: this.y + b.y - b.h / 2, w: b.w, h: b.h };
    }
    readInput(g) {
      const h = this.ctrl.held(this, g), p = {};
      for (const k in h) p[k] = h[k] && !this.prev[k];
      this.prev = h;
      return { h, p };
    }

    update(g) {
      const { h, p } = this.readInput(g);
      if (this.dead) {
        if (--this.respawnT <= 0 && this.stocks > 0) this.respawn();
        return;
      }
      if (this.invuln > 0) this.invuln--;
      if (this.dropT > 0) this.dropT--;
      this.shielding = false;

      if (this.broken > 0) { this.broken--; this.vx *= 0.85; }
      else if (this.hitstun > 0) {
        this.hitstun--;
        this.vx *= 0.975;
        if (Math.hypot(this.vx, this.vy) > 9 && g.frame % 2 === 0) burst(this.x, this.y - FH / 2, 'rgba(255,255,255,0.6)', 1, 0.5, 6, 20);
      } else this.control(h, p);

      if (!this.shielding) this.shieldHP = Math.min(100, this.shieldHP + 0.12);

      this.vy += G;
      const cap = this.hitstun > 0 ? MAX_FALL + 6 : this.fastfall ? FAST_FALL : MAX_FALL;
      if (this.vy > cap) this.vy = cap;
      this.physics();

      if (this.x < BLAST.l || this.x > BLAST.r || this.y > BLAST.b || (this.y < BLAST.t && this.hitstun > 0)) this.die(g);
    }

    control(h, p) {
      const dir = (h.right ? 1 : 0) - (h.left ? 1 : 0);

      if (this.move) {
        this.mt++;
        const m = this.move;
        if (this.mt >= m.start + m.active + m.end) this.move = null;
        if (this.ground) this.vx *= 0.82;
        else this.vx = Math.max(-AIR_MAX, Math.min(AIR_MAX, this.vx + dir * 0.25));
        return;
      }

      if (h.shield && this.ground && this.jsq === 0) {
        this.shielding = true;
        this.shieldHP -= 0.28;
        this.vx *= 0.7;
        if (this.shieldHP <= 0) this.breakShield();
        else if (p.up) this.jsq = JSQ; // jump out of shield
        return;
      }

      if (p.light || p.heavy) {
        const m = p.light
          ? (h.up ? 'utilt' : h.down ? (this.ground ? 'dtilt' : 'dair') : 'jab')
          : (h.up ? 'usmash' : h.down ? 'dsmash' : 'fsmash');
        this.startMove(MOVES[m], dir);
        return;
      }

      if (this.jsq > 0) {
        this.vx *= 0.9;
        if (--this.jsq === 0) {
          this.vy = h.up ? JUMP : SHORT_HOP; // release before lift-off for a short hop
          this.ground = false;
          sfx.jump();
          burst(this.x, this.y, 'rgba(255,255,255,0.5)', 6, 2, 4, 18);
        }
        return;
      }

      if (p.up) {
        if (this.ground) this.jsq = JSQ;
        else if (this.jumps > 0) {
          this.jumps--; this.vy = DJUMP; this.fastfall = false;
          sfx.jump();
          burst(this.x, this.y, 'rgba(255,255,255,0.5)', 8, 2.5, 4, 18);
        }
      }

      if (this.ground) {
        this.vx += (dir * RUN - this.vx) * (dir ? 0.3 : 0.25);
        if (dir) this.facing = dir;
        if (p.down && this.onPlat) { this.dropT = 12; this.ground = false; }
      } else {
        if (dir) this.vx = Math.max(-AIR_MAX, Math.min(AIR_MAX, this.vx + dir * AIR_ACC));
        else this.vx *= 0.97;
        if (p.down && this.vy > -3) this.fastfall = true;
      }
    }

    startMove(m, dir) {
      if (dir) this.facing = dir;
      this.move = m; this.mt = 0; this.hitList = []; this.jsq = 0;
      if (m.airBoost && !this.ground && !this.usedBoost) {
        this.vy = m.airBoost; this.usedBoost = true; this.fastfall = false;
      }
      sfx.swing();
    }

    breakShield() {
      this.broken = 150; this.shieldHP = 30; this.vy = -9; this.ground = false;
      sfx.brk();
      burst(this.x, this.y - FH / 2, this.color, 24, 6, 5, 40);
    }

    physics() {
      const prevY = this.y;
      this.x += this.vx;
      for (const s of STAGE.solids) {
        if (overlap(this.hurtbox(), s)) {
          this.x = this.x < s.x + s.w / 2 ? s.x - HW : s.x + s.w + HW;
          this.vx = 0;
        }
      }
      this.y += this.vy;
      const wasGround = this.ground;
      this.ground = false; this.onPlat = false;
      for (const s of STAGE.solids) {
        if (!overlap(this.hurtbox(), s)) continue;
        if (this.vy >= 0 && prevY <= s.y + 0.01) this.land(s.y, false);
        else if (this.vy < 0) { this.y = s.y + s.h + FH; this.vy = 0; }
      }
      if (this.dropT <= 0 && this.vy >= 0) {
        for (const pl of STAGE.plats) {
          if (prevY <= pl.y + 0.01 && this.y >= pl.y && this.x > pl.x - 4 && this.x < pl.x + pl.w + 4) this.land(pl.y, true);
        }
      }
      if (this.ground && !wasGround && this.move && !this.move.both && this.mt < this.move.start) {
        // landing cancels an aerial that has not come out yet
        this.move = null;
      }
    }

    land(y, plat) {
      if (this.hitstun > 0 && this.vy > 7) { // bounce off the floor when launched into it
        this.y = y; this.vy = -this.vy * 0.45; this.ground = false;
        burst(this.x, y, 'rgba(255,255,255,0.6)', 8, 3, 4, 20);
        return;
      }
      if (this.vy > 6) burst(this.x, y, 'rgba(255,255,255,0.35)', 4, 1.5, 3, 14);
      this.y = y; this.vy = 0; this.ground = true; this.onPlat = plat;
      this.jumps = 1; this.usedBoost = false; this.fastfall = false;
    }

    die(g) {
      this.stocks--; this.dead = true; this.respawnT = 70;
      const cx = Math.max(20, Math.min(W - 20, this.x)), cy = Math.max(20, Math.min(H - 20, this.y - FH / 2));
      burst(cx, cy, this.color, 40, 9, 7, 50);
      burst(cx, cy, '#fff', 20, 6, 5, 40);
      g.shake = 22;
      sfx.ko();
    }
  }

  function tryHit(a, d, g) {
    const hb = a.hitbox();
    if (!hb || d.dead || d.invuln > 0 || a.hitList.includes(d) || !overlap(hb, d.hurtbox())) return;
    const m = a.move;
    a.hitList.push(d);
    const dirX = m.both ? (Math.sign(d.x - a.x) || a.facing) : a.facing;
    const cx = (hb.x + hb.w / 2 + d.x) / 2, cy = (hb.y + hb.h / 2 + d.y - FH / 2) / 2;

    if (d.shielding) {
      d.shieldHP -= m.dmg * 1.6;
      d.vx = dirX * (2 + m.dmg * 0.25);
      g.hitstop = 4;
      sfx.block();
      burst(cx, cy, '#bfe3ff', 6, 3, 3, 16);
      if (d.shieldHP <= 0) d.breakShield();
      return;
    }

    d.dmg += m.dmg;
    const kb = m.base + d.dmg * m.growth;
    const ang = m.angle * Math.PI / 180;
    d.vx = Math.cos(ang) * kb * dirX;
    d.vy = -Math.sin(ang) * kb;
    if (d.ground && d.vy > 0) d.vy = -d.vy * 0.7; // spikes on grounded targets pop them up
    d.hitstun = Math.floor(kb * 2.4) + 6;
    d.ground = false; d.move = null; d.jsq = 0; d.fastfall = false; d.broken = 0;
    d.jumps = 1; d.usedBoost = false; // getting hit restores recovery options

    g.hitstop = Math.min(14, 3 + Math.floor(m.dmg * 0.6));
    g.shake = Math.max(g.shake, Math.min(16, kb * 0.6));
    sfx.hit(m.dmg);
    burst(cx, cy, a.color, 8 + m.dmg, 3 + kb * 0.25, 4, 26);
    burst(cx, cy, '#fff', 6, 2 + kb * 0.15, 3, 18);
  }

  // ---------------------------------------------------------------- flow
  function startMatch(mode) {
    game.mode = mode;
    const red = '#ff5a5f', blue = '#3fa7ff';
    game.fighters = mode === 0
      ? [new Fighter(0, 'CPU 1', red, new CpuCtrl()), new Fighter(1, 'CPU 2', blue, new CpuCtrl())]
      : [new Fighter(0, 'P1', red, new HumanCtrl(0)),
         new Fighter(1, mode === 1 ? 'CPU' : 'P2', blue, mode === 1 ? new CpuCtrl() : new HumanCtrl(1))];
    game.parts = []; game.hitstop = 0; game.shake = 0;
    game.countdown = 180; game.goT = 0; game.winner = null; game.paused = false; game.state = 'playing';
  }

  const pressed = (...codes) => codes.some((c) => pressedKeys.has(c));

  function update() {
    game.frame++;
    pollPads();
    if (pressed('Backquote')) game.debug = !game.debug;

    if (game.state === 'menu') {
      if (pressed('Digit1', 'Numpad1')) startMatch(1);
      else if (pressed('Digit2', 'Numpad2')) startMatch(2);
      else if (pressed('Digit0', 'Numpad0')) startMatch(0);
      else if (padPressed(9) || padPressed(0)) startMatch(pads().length >= 2 ? 2 : 1);
      return;
    }

    if (game.state === 'over') {
      game.overT++;
      stepParticles();
      if (game.overT > 45) {
        if (pressed('Enter', 'Space') || padPressed(9) || padPressed(0)) startMatch(game.mode);
        else if (pressed('Escape') || padPressed(8)) game.state = 'menu';
      }
      return;
    }

    // playing
    if (pressed('KeyP', 'Escape') || padPressed(9)) {
      if (game.paused && pressed('Escape')) { game.state = 'menu'; return; }
      game.paused = !game.paused;
    }
    if (game.paused) return;

    if (game.countdown > 0) {
      if (game.countdown % 60 === 0) sfx.beep(false);
      game.countdown--;
      if (game.countdown === 0) { game.goT = 45; sfx.beep(true); }
      for (const f of game.fighters) f.readInput(game); // swallow inputs held during the countdown
      return;
    }
    if (game.goT > 0) game.goT--;
    if (game.hitstop > 0) { game.hitstop--; return; }

    for (const f of game.fighters) f.update(game);
    for (const a of game.fighters) for (const d of game.fighters) if (a !== d) tryHit(a, d, game);
    stepParticles();
    game.shake *= 0.85;

    const alive = game.fighters.filter((f) => f.stocks > 0);
    if (alive.length <= 1) { game.state = 'over'; game.winner = alive[0] || null; game.overT = 0; }
  }

  function stepParticles() {
    for (const p of game.parts) { p.x += p.vx; p.y += p.vy; p.vx *= 0.92; p.vy = p.vy * 0.92 + 0.08; p.life--; }
    game.parts = game.parts.filter((p) => p.life > 0);
  }

  // ---------------------------------------------------------------- drawing
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  const STARS = Array.from({ length: 70 }, (_, i) => ({ x: (i * 397) % W, y: (i * 211) % 520, r: (i % 3) * 0.6 + 0.6 }));
  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#16123a'); g.addColorStop(0.6, '#3a2259'); g.addColorStop(1, '#6b2f5c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (const s of STARS) {
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(game.frame * 0.03 + s.x);
      ctx.fillStyle = '#fff'; ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#2a1a45';
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 80) ctx.lineTo(x, 520 + Math.sin(x * 0.011) * 40 + Math.sin(x * 0.037) * 18);
    ctx.lineTo(W, H); ctx.fill();
  }

  function drawStage() {
    for (const s of STAGE.solids) {
      const g = ctx.createLinearGradient(0, s.y, 0, s.y + s.h + 60);
      g.addColorStop(0, '#5a4a7a'); g.addColorStop(1, '#241a38');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + s.w, s.y); ctx.lineTo(s.x + s.w - 40, s.y + s.h + 50); ctx.lineTo(s.x + 40, s.y + s.h + 50);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#9be37a'; ctx.fillRect(s.x, s.y, s.w, 8);
      ctx.fillStyle = '#6cc04a'; ctx.fillRect(s.x, s.y + 8, s.w, 4);
    }
    for (const p of STAGE.plats) {
      ctx.fillStyle = '#c9b6ff'; rr(p.x, p.y, p.w, 10, 5); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(p.x + 8, p.y + 10, p.w - 16, 4);
    }
  }

  function drawFighter(f) {
    if (f.dead) return;
    const { x, y } = f;
    ctx.save();
    if (f.invuln > 0 && (game.frame >> 2) % 2) ctx.globalAlpha = 0.45;

    // attack visuals (behind the body)
    const m = f.move;
    if (m) {
      const bx = x + m.box.x * f.facing, by = y + m.box.y;
      const sides = m.both ? [1, -1] : [1];
      for (const sgn of sides) {
        const ex = m.both ? x + sgn * m.box.w / 2 * 0.8 : bx;
        if (f.mt < m.start) { // telegraph
          ctx.fillStyle = f.color; ctx.globalAlpha *= 0.25 + 0.5 * (f.mt / m.start);
          ctx.beginPath(); ctx.arc(ex, by, 6 + 10 * (f.mt / m.start), 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = f.invuln > 0 && (game.frame >> 2) % 2 ? 0.45 : 1;
        } else {
          const t = f.mt < m.start + m.active ? 1 : Math.max(0, 1 - (f.mt - m.start - m.active) / m.end);
          const sx = x, sy = y - FH * 0.6;
          const hx = sx + (ex - sx) * t, hy = sy + (by - sy) * t;
          ctx.strokeStyle = shade(f.color, -40); ctx.lineWidth = 12; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx, hy); ctx.stroke();
          ctx.fillStyle = shade(f.color, 30); ctx.beginPath(); ctx.arc(hx, hy, 10, 0, Math.PI * 2); ctx.fill();
          if (f.mt < m.start + m.active) {
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            const w = m.both ? m.box.w / 2 : m.box.w;
            rr(m.both ? (sgn > 0 ? x : x - w) : bx - w / 2, by - m.box.h / 2, w, m.box.h, 10); ctx.fill();
          }
        }
      }
    }

    // body (squashes during jump-squat, stretches when rising)
    const sq = f.jsq > 0 ? 0.85 : !f.ground && f.vy < -6 ? 1.08 : 1;
    const bw = HW * 2 / Math.sqrt(sq), bh = FH * sq;
    const flash = f.hitstun > 0 && (game.frame >> 1) % 2;
    ctx.fillStyle = flash ? '#ffffff' : f.color;
    rr(x - bw / 2, y - bh, bw, bh, 12); ctx.fill();
    ctx.strokeStyle = shade(f.color, -70); ctx.lineWidth = 3; ctx.stroke();
    // belt
    ctx.fillStyle = shade(f.color, -50); ctx.fillRect(x - bw / 2 + 2, y - bh * 0.38, bw - 4, 6);
    // visor + eye
    const ey = y - bh + 18;
    ctx.fillStyle = '#1b1530'; rr(x - 14 + f.facing * 4, ey - 7, 28, 14, 6); ctx.fill();
    ctx.fillStyle = f.hitstun > 0 ? '#ff4' : '#fff';
    ctx.fillRect(x + f.facing * 9 - 3, ey - 3, 6, 6);

    // shield bubble
    if (f.shielding) {
      const r = 22 + 30 * (f.shieldHP / 100);
      ctx.fillStyle = hexA(f.color, 0.35); ctx.strokeStyle = hexA('#ffffff', 0.7); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y - FH / 2, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    // dizzy stars after a shield break
    if (f.broken > 0) {
      for (let i = 0; i < 3; i++) {
        const a = game.frame * 0.12 + i * 2.1;
        ctx.fillStyle = '#ffe14a';
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * 22, y - FH - 12 + Math.sin(a) * 6, 4, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();

    // name tag
    ctx.fillStyle = f.color; ctx.font = 'bold 14px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(f.name, x, y - FH - (f.broken > 0 ? 26 : 10));

    if (game.debug) {
      const hb = f.hurtbox();
      ctx.strokeStyle = '#0f0'; ctx.lineWidth = 1; ctx.strokeRect(hb.x, hb.y, hb.w, hb.h);
      const hit = f.hitbox();
      if (hit) { ctx.strokeStyle = '#f00'; ctx.strokeRect(hit.x, hit.y, hit.w, hit.h); }
    }
  }

  function drawOffscreen(f) {
    if (f.dead) return;
    const cy = f.y - FH / 2;
    if (f.x > 0 && f.x < W && cy > 0 && cy < H) return;
    const px = Math.max(24, Math.min(W - 24, f.x)), py = Math.max(24, Math.min(H - 24, cy));
    const a = Math.atan2(cy - py, f.x - px);
    ctx.save(); ctx.translate(px, py);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(a); ctx.fillStyle = f.color;
    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(4, -9); ctx.lineTo(4, 9); ctx.fill();
    ctx.restore();
    ctx.fillStyle = f.color; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(f.name, px, py + 4);
  }

  function drawHUD() {
    game.fighters.forEach((f, i) => {
      const w = 220, h = 70, x = W / 2 + (i === 0 ? -w - 30 : 30), y = H - h - 14;
      ctx.fillStyle = 'rgba(10,8,25,0.7)'; rr(x, y, w, h, 12); ctx.fill();
      ctx.fillStyle = f.color; rr(x, y, 8, h, 4); ctx.fill();
      ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText(f.name, x + 20, y + 24);
      for (let s = 0; s < STOCKS; s++) {
        ctx.fillStyle = s < f.stocks ? f.color : 'rgba(255,255,255,0.15)';
        ctx.beginPath(); ctx.arc(x + 26 + s * 18, y + 48, 6, 0, Math.PI * 2); ctx.fill();
      }
      const t = Math.min(1, f.dmg / 150);
      ctx.fillStyle = `rgb(255,${Math.round(255 - 200 * t)},${Math.round(255 - 235 * t)})`;
      ctx.font = 'bold 40px system-ui, sans-serif'; ctx.textAlign = 'right';
      const jig = game.hitstop > 0 && f.hitstun > 0 ? (Math.random() - 0.5) * 6 : 0;
      ctx.fillText(f.dead && f.stocks === 0 ? '—' : Math.floor(f.dmg) + '%', x + w - 14 + jig, y + 52);
    });
  }

  function centerText(text, y, size, color = '#fff', weight = 'bold') {
    ctx.font = `${weight} ${size}px system-ui, sans-serif`; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillText(text, W / 2 + 3, y + 3);
    ctx.fillStyle = color; ctx.fillText(text, W / 2, y);
  }

  function drawMenu() {
    ctx.fillStyle = 'rgba(8,6,20,0.82)'; ctx.fillRect(0, 0, W, H);
    centerText('TEAM 2 BRAWL', 170, 84, '#ffd25a', '900');
    centerText('Knock your opponent off the stage. Higher damage % = they fly further.', 220, 20, '#e8e0ff', '500');
    centerText('Press 1 — vs CPU     ·     Press 2 — 2 players', 300, 30);
    centerText('(gamepads work too: press Start · 0 = watch CPU vs CPU)', 336, 16, '#b9addb', '500');

    const rows = [
      ['', 'Player 1', 'Player 2', 'Gamepad'],
      ['Move', 'A / D', '← / →', 'Stick / D-pad'],
      ['Jump (×2)', 'W', '↑', 'A / Y / stick up'],
      ['Drop / fast fall', 'S', '↓', 'Down'],
      ['Light attack', 'F', ', or Num1', 'X'],
      ['Heavy attack', 'G', '. or Num2', 'B'],
      ['Shield', 'H', '/ or Num3', 'Shoulders'],
    ];
    const cols = [330, 560, 760, 960];
    rows.forEach((r, i) => {
      r.forEach((c, j) => {
        ctx.font = (i === 0 || j === 0 ? 'bold ' : '') + '18px system-ui, sans-serif';
        ctx.textAlign = j === 0 ? 'left' : 'center';
        ctx.fillStyle = i === 0 ? '#ffd25a' : '#fff';
        ctx.fillText(c, j === 0 ? cols[0] - 90 : cols[j], 400 + i * 30);
      });
    });
    centerText('Hold ↑ or ↓ while attacking for up / down moves. Up + heavy in the air boosts you back to the stage.', 640, 16, '#b9addb', '500');
    centerText('P: pause · Esc: menu · `: show hitboxes', 668, 14, '#8f84b3', '500');
  }

  function draw() {
    ctx.save();
    if (game.shake > 0.5) ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
    drawBackground();
    drawStage();
    if (game.state !== 'menu') {
      for (const f of game.fighters) drawFighter(f);
      for (const p of game.parts) {
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    if (game.state === 'menu') { drawMenu(); return; }
    for (const f of game.fighters) drawOffscreen(f);
    drawHUD();

    if (game.countdown > 0) centerText(String(Math.ceil(game.countdown / 60)), H / 2 - 40, 120, '#ffd25a', '900');
    else if (game.goT > 0) centerText('GO!', H / 2 - 40, 120, '#9be37a', '900');
    if (game.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, H);
      centerText('PAUSED', H / 2 - 20, 72);
      centerText('P: resume · Esc: quit to menu', H / 2 + 30, 20, '#ddd', '500');
    }
    if (game.state === 'over') {
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, W, H);
      const wn = game.winner;
      centerText(wn ? `${wn.name} WINS!` : 'DRAW!', H / 2 - 40, 96, wn ? wn.color : '#fff', '900');
      if (game.overT > 45) centerText('Enter / Start: rematch · Esc: menu', H / 2 + 20, 22, '#eee', '500');
    }
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const c = (v) => Math.max(0, Math.min(255, v + amt));
    return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
  }
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  }

  // ---------------------------------------------------------------- loop
  const STEP = 1000 / 60;
  let last = performance.now(), acc = 0;
  function loop(t) {
    acc += Math.min(100, t - last); last = t;
    while (acc >= STEP) { update(); pressedKeys.clear(); acc -= STEP; }
    draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
