import { Component, HostListener, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

// ── Pin definitions ──────────────────────────────────────────────────────────
// gx: left-right in lane (-1 to +1), gy: depth (0 = far/pins end, 1 = near/player)
const PIN_DEFS = [
  { id: 1,  gx:  0.000, gy: 0.130 },
  { id: 2,  gx: -0.072, gy: 0.104 },
  { id: 3,  gx:  0.072, gy: 0.104 },
  { id: 4,  gx: -0.144, gy: 0.078 },
  { id: 5,  gx:  0.000, gy: 0.078 },
  { id: 6,  gx:  0.144, gy: 0.078 },
  { id: 7,  gx: -0.216, gy: 0.052 },
  { id: 8,  gx: -0.072, gy: 0.052 },
  { id: 9,  gx:  0.072, gy: 0.052 },
  { id: 10, gx:  0.216, gy: 0.052 },
];

// Which pins can be chain-knocked by another pin falling
const ADJACENT: Record<number, number[]> = {
  1:  [2, 3],
  2:  [1, 4, 5],
  3:  [1, 5, 6],
  4:  [2, 7, 8],
  5:  [2, 3, 8, 9],
  6:  [3, 9, 10],
  7:  [4, 8],
  8:  [4, 5, 7, 9],
  9:  [5, 6, 8, 10],
  10: [6, 9],
};

const ARROW_GX = [-0.60, -0.30, 0, 0.30, 0.60];
const DOT_GX   = [-0.75, -0.45, -0.15, 0.15, 0.45, 0.75];

type Phase = 'setup' | 'aiming' | 'power' | 'rolling' | 'pinFall' | 'result' | 'nextPlayer' | 'gameover';

interface Pin {
  id: number; gx: number; gy: number;
  standing: boolean;
  fallDir: number;   // -1 or +1
  fallPct: number;   // 0→1 during fall animation
}

interface FrameData {
  rolls: (number | null)[];
  score: number | null;
  isStrike: boolean;
  isSpare: boolean;
}

interface Player {
  name: string;
  frames: FrameData[];
  frame: number;
  roll: number;
  downIds: Set<number>;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class AppComponent implements AfterViewInit, OnDestroy {

  // ── Scene geometry (pseudo-3D perspective) ────────────────────────────────
  // This projection system can be reused for any top-down 3D game (putt-putt etc).
  // Concept: game coords (gx, gy) → screen coords via linear perspective lerp.
  // gx: -1..+1 across the lane, gy: 0=far(pins)/1=near(player)
  // Objects scale with depth (gy), gutters converge to vanishing point.
  readonly SW = 600;
  readonly SH = 660;
  readonly VX = 300;      // vanishing point X
  readonly VY = 68;       // vanishing point Y
  readonly NEAR_Y = 590;  // screen Y at near (player) edge
  readonly FAR_HW  = 44;  // lane half-width at far end (pixels)
  readonly NEAR_HW = 148; // lane half-width at near end (pixels)
  readonly GUTTER_RATIO = 0.36; // gutter width as fraction of half-lane

  // ── State ─────────────────────────────────────────────────────
  phase: Phase = 'setup';
  playerCount = 1;
  players: Player[] = [];
  curIdx = 0;
  pins: Pin[] = [];

  ballGX = 0;
  ballGY = 1.0;
  ballVis = false;

  aimGX = 0;
  leftHeld = false;
  rightHeld = false;

  power = 0;
  powerDir = 1;

  hookAcc = 0;
  private rollSpeed = 0;
  private throwGX = 0;

  resultText = '';
  resultClass = '';

  private fallStart = 0;
  private readonly FALL_MS = 650;
  private knockedIds: number[] = [];

  private rafId = 0;
  private lastTs = 0;

  // ── Lifecycle ─────────────────────────────────────────────────

  ngAfterViewInit() {
    const loop = (ts: number) => {
      const dt = Math.min(ts - this.lastTs, 40);
      this.lastTs = ts;
      this.tick(dt, ts);
      this.rafId = requestAnimationFrame(loop);
    };
    this.lastTs = performance.now();
    this.rafId = requestAnimationFrame(loop);
  }

  ngOnDestroy() { cancelAnimationFrame(this.rafId); }

  // ── Master tick ───────────────────────────────────────────────

  private tick(dt: number, ts: number) {
    switch (this.phase) {
      case 'aiming': {
        const spd = 0.0034;
        if (this.leftHeld)  this.aimGX = Math.max(-0.88, this.aimGX - spd * dt);
        if (this.rightHeld) this.aimGX = Math.min( 0.88, this.aimGX + spd * dt);
        break;
      }
      case 'power': {
        this.power += this.powerDir * 1.6;
        if (this.power >= 100) { this.power = 100; this.powerDir = -1; }
        if (this.power <= 0)   { this.power = 0;   this.powerDir =  1; }
        break;
      }
      case 'rolling': {
        if (this.leftHeld)  this.hookAcc = Math.max(-0.30, this.hookAcc - 0.00085 * dt);
        if (this.rightHeld) this.hookAcc = Math.min( 0.30, this.hookAcc + 0.00085 * dt);
        this.ballGY -= this.rollSpeed;
        this.ballGX  = this.throwGX + this.hookAcc * (1 - this.ballGY);

        if (Math.abs(this.ballGX) > 1.04) {
          this.ballGX = Math.sign(this.ballGX) * 1.04;
          this.landBall(ts);
          return;
        }
        if (this.ballGY <= 0.045) { this.landBall(ts); return; }
        break;
      }
      case 'pinFall': {
        const t = Math.min((ts - this.fallStart) / this.FALL_MS, 1);
        for (const p of this.pins) {
          if (!p.standing && p.fallPct < 1) p.fallPct = t;
        }
        if (t >= 1) this.afterFall();
        break;
      }
    }
  }

  // ── Input ─────────────────────────────────────────────────────

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (['ArrowLeft',  'KeyA'].includes(e.code)) { this.leftHeld  = true;  e.preventDefault(); return; }
    if (['ArrowRight', 'KeyD'].includes(e.code)) { this.rightHeld = true;  e.preventDefault(); return; }
    if (e.code !== 'Space') return;
    e.preventDefault();
    if (this.phase === 'aiming')     this.beginPower();
    else if (this.phase === 'power') this.doThrow();
    else if (this.phase === 'result' || this.phase === 'nextPlayer') this.next();
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(e: KeyboardEvent) {
    if (['ArrowLeft',  'KeyA'].includes(e.code)) this.leftHeld  = false;
    if (['ArrowRight', 'KeyD'].includes(e.code)) this.rightHeld = false;
  }

  // ── Setup ─────────────────────────────────────────────────────

  startGame(n: number) {
    this.playerCount = n;
    this.players = Array.from({ length: n }, (_, i) => ({
      name: n === 1 ? 'Player' : `P${i + 1}`,
      frames: this.freshFrames(),
      frame: 0, roll: 0,
      downIds: new Set<number>(),
    }));
    this.curIdx = 0;
    this.prepFrame();
  }

  private freshFrames(): FrameData[] {
    return Array.from({ length: 10 }, () => ({
      rolls: [null, null, null], score: null, isStrike: false, isSpare: false,
    }));
  }

  private prepFrame() {
    this.resetPins();
    this.ballVis = false; this.ballGX = 0; this.ballGY = 1.0;
    this.aimGX = 0; this.hookAcc = 0;
    this.cur.downIds.clear();
    this.phase = 'aiming';
  }

  private prepNextBall() {
    this.ballVis = false; this.ballGX = 0; this.ballGY = 1.0;
    this.aimGX = 0; this.hookAcc = 0;
    this.phase = 'aiming';
  }

  private resetPins() {
    this.pins = PIN_DEFS.map(d => ({
      ...d, standing: true,
      fallDir: Math.random() > 0.5 ? 1 : -1,
      fallPct: 0,
    }));
  }

  get cur(): Player { return this.players[this.curIdx]; }

  // ── Power / Throw ─────────────────────────────────────────────

  private beginPower() {
    this.phase = 'power'; this.power = 0; this.powerDir = 1;
  }

  private doThrow() {
    this.throwGX   = this.aimGX;
    this.hookAcc   = 0;
    this.rollSpeed = 0.013 + (this.power / 100) * 0.018;
    this.ballVis   = true; this.ballGX = this.throwGX; this.ballGY = 1.0;
    this.phase     = 'rolling';
  }

  // ── Ball lands ────────────────────────────────────────────────

  private landBall(ts: number) {
    this.phase = 'pinFall';
    this.ballGY = 0.045;
    this.knockedIds = this.computeKnocked();
    for (const pin of this.pins) {
      if (this.knockedIds.includes(pin.id)) {
        pin.standing = false; pin.fallPct = 0;
        pin.fallDir  = Math.random() > 0.5 ? 1 : -1;
      }
    }
    this.fallStart = ts;
  }

  private computeKnocked(): number[] {
    const direct = new Set<number>();
    const ballR  = 0.092;
    for (const pin of this.pins) {
      if (!pin.standing) continue;
      if (Math.abs(this.ballGX - pin.gx) < ballR + 0.040) direct.add(pin.id);
    }
    const all = new Set(direct);
    for (let pass = 0; pass < 3; pass++) {
      const before = all.size;
      for (const id of Array.from(all)) {
        for (const adj of ADJACENT[id]) {
          if (all.has(adj)) continue;
          const ap = this.pins.find(p => p.id === adj);
          if (ap?.standing && Math.random() < 0.57) all.add(adj);
        }
      }
      if (all.size === before) break;
    }
    return Array.from(all);
  }

  // ── After fall animation ──────────────────────────────────────

  private afterFall() {
    const p = this.cur;
    const frame = p.frames[p.frame];

    const newDown = this.knockedIds.filter(id => !p.downIds.has(id));
    newDown.forEach(id => p.downIds.add(id));
    const count = newDown.length;
    frame.rolls[p.roll] = count;
    this.recalcScores();

    const is10th  = p.frame === 9;
    const totalDn = p.downIds.size;

    if (p.roll === 0 && count === 10) {
      frame.isStrike = true; this.resultText = 'STRIKE!'; this.resultClass = 'strike';
    } else if (p.roll > 0 && totalDn === 10 && !is10th) {
      frame.isSpare = true; this.resultText = 'SPARE!'; this.resultClass = 'spare';
    } else if (count === 0) {
      this.resultText = 'Gutter ball!'; this.resultClass = 'gutter';
    } else {
      this.resultText = `${count} pin${count !== 1 ? 's' : ''}`;
      this.resultClass = count >= 8 ? 'great' : '';
    }

    const done = this.frameDone(p);
    this.phase = (done && this.playerCount > 1) ? 'nextPlayer' : 'result';
  }

  private frameDone(p: Player): boolean {
    const fr = p.frames[p.frame];
    if (p.frame < 9) return fr.isStrike || p.roll === 1;
    if (p.roll === 0) return false;
    if (p.roll === 1) {
      const r0 = fr.rolls[0]!, r1 = fr.rolls[1]!;
      return r0 !== 10 && r0 + r1 < 10;
    }
    return true; // 3rd ball always done
  }

  // ── Advance turn ──────────────────────────────────────────────

  next() {
    const p = this.cur;
    const fr = p.frames[p.frame];
    const is10th = p.frame === 9;

    if (this.frameDone(p)) {
      const wasFrame = p.frame;
      if (this.playerCount > 1) {
        const ni = (this.curIdx + 1) % this.playerCount;
        this.curIdx = ni;
        const np = this.cur;
        // If wrapped around, advance frame
        if (ni === 0) {
          for (const pl of this.players) pl.frame++;
        }
        if (np.frame >= 10) { this.endGame(); return; }
        np.roll = 0;
        this.prepFrame();
      } else {
        p.frame++;
        p.roll = 0;
        if (p.frame >= 10) { this.endGame(); return; }
        this.prepFrame();
      }
    } else {
      p.roll++;
      if (is10th) {
        const r0 = fr.rolls[0]!, r1 = fr.rolls[1];
        // Reset pins for bonus balls
        if (p.roll === 1 && r0 === 10) {
          this.resetPins(); p.downIds.clear();
        } else if (p.roll === 2) {
          const spare10 = r0 !== 10 && (r0 + r1!) === 10;
          const dblStrike = r0 === 10 && r1 === 10;
          if (spare10 || dblStrike) { this.resetPins(); p.downIds.clear(); }
        }
      }
      this.prepNextBall();
    }
  }

  private endGame() { this.phase = 'gameover'; }

  // ── Scoring ───────────────────────────────────────────────────

  private recalcScores() {
    for (const player of this.players) {
      const rolls = this.flatRolls(player);
      let total = 0, ri = 0;
      for (let f = 0; f < 10; f++) {
        const frame = player.frames[f];
        const r1 = rolls[ri];
        if (r1 == null) { frame.score = null; break; }

        if (f < 9) {
          if (r1 === 10) {
            const b2 = rolls[ri + 1], b3 = rolls[ri + 2];
            if (b2 == null || b3 == null) { frame.score = null; ri++; continue; }
            total += 10 + b2 + b3; frame.score = total; ri++;
          } else {
            const r2 = rolls[ri + 1];
            if (r2 == null) { frame.score = null; ri += 2; continue; }
            if (r1 + r2 === 10) {
              const b3 = rolls[ri + 2];
              if (b3 == null) { frame.score = null; ri += 2; continue; }
              total += 10 + b3;
            } else {
              total += r1 + r2;
            }
            frame.score = total; ri += 2;
          }
        } else {
          let s = r1;
          const r2 = rolls[ri + 1], r3 = rolls[ri + 2];
          if (r2 != null) s += r2;
          if (r3 != null) s += r3;
          total += s; frame.score = total;
        }
      }
    }
  }

  private flatRolls(p: Player): (number | null)[] {
    const out: (number | null)[] = [];
    for (let f = 0; f < 10; f++) {
      const fr = p.frames[f];
      out.push(fr.rolls[0]);
      if (f < 9) { if (fr.rolls[0] !== 10) out.push(fr.rolls[1]); }
      else { out.push(fr.rolls[1]); out.push(fr.rolls[2]); }
    }
    return out;
  }

  // ── Projection helpers ────────────────────────────────────────

  // Core pseudo-3D projection function.
  // Reusable for any top-down perspective game:
  //   gx ∈ [-1,+1] = lateral position across the playing surface
  //   gy ∈ [0,1]   = depth (0=far end, 1=camera/near end)
  // Returns screen (x, y) and a depth scale factor.
  proj(gx: number, gy: number) {
    const t  = gy;
    const sy = this.VY + t * (this.NEAR_Y - this.VY);
    const hw = this.FAR_HW + t * (this.NEAR_HW - this.FAR_HW);
    const sx = this.VX + gx * hw;
    const sc = 0.18 + t * 0.82;
    return { x: sx, y: sy, scale: sc };
  }

  // ── SVG shape helpers ─────────────────────────────────────────

  get lanePoints(): string {
    const tl = this.proj(-1, 0), tr = this.proj(1, 0);
    const br = this.proj(1, 1), bl = this.proj(-1, 1);
    return pts(tl, tr, br, bl);
  }

  get glPoints(): string {   // left gutter
    const f = this.GUTTER_RATIO;
    const ti = this.proj(-1, 0), to = this.proj(-1 - f, 0);
    const bi = this.proj(-1, 1), bo = this.proj(-1 - f, 1);
    return pts(ti, to, bo, bi);
  }

  get grPoints(): string {   // right gutter
    const f = this.GUTTER_RATIO;
    const ti = this.proj(1, 0), to = this.proj(1 + f, 0);
    const bi = this.proj(1, 1), bo = this.proj(1 + f, 1);
    return pts(ti, to, bo, bi);
  }

  get foulLine(): string {
    const l = this.proj(-1, 0.965), r = this.proj(1, 0.965);
    return `${l.x},${l.y} ${r.x},${r.y}`;
  }

  get arrowPts(): string[] {
    return ARROW_GX.map(gx => {
      const tip = this.proj(gx, 0.310);
      const lft = this.proj(gx - 0.028, 0.285);
      const rgt = this.proj(gx + 0.028, 0.285);
      return `${tip.x},${tip.y} ${lft.x},${lft.y} ${rgt.x},${rgt.y}`;
    });
  }

  get dots() { return DOT_GX.map(gx => this.proj(gx, 0.52)); }

  get aimLinePts(): string {
    const n = this.proj(this.aimGX, 0.96);
    const f = this.proj(this.aimGX, 0.09);
    return `${n.x},${n.y} ${f.x},${f.y}`;
  }

  get aimCursor() { return this.proj(this.aimGX, 0.97); }

  get ballCircle() {
    const { x, y, scale } = this.proj(this.ballGX, this.ballGY);
    return { cx: x, cy: y, r: 14 * scale };
  }

  pinSvg(pin: Pin) {
    const { x, y, scale } = this.proj(pin.gx, pin.gy);
    const r = 9 * scale;
    const angle = pin.standing ? 0 : pin.fallDir * 88 * pin.fallPct;
    const op = pin.standing ? 1 : Math.max(0, 1 - pin.fallPct * 0.6);
    return { x, y, r, angle, op, scale };
  }

  // ── Scoreboard helpers ────────────────────────────────────────

  rollLabel(p: Player, fi: number, ri: number): string {
    const fr = p.frames[fi];
    const v = fr.rolls[ri];
    if (v == null) return '';
    if (fi < 9) {
      if (ri === 0) return v === 10 ? 'X' : v === 0 ? '-' : `${v}`;
      if (fr.rolls[0] === 10) return '';
      if ((fr.rolls[0]! + v) === 10) return '/';
      return v === 0 ? '-' : `${v}`;
    }
    // 10th frame
    if (ri === 0) return v === 10 ? 'X' : v === 0 ? '-' : `${v}`;
    if (ri === 1) {
      const r0 = fr.rolls[0]!;
      if (r0 === 10) return v === 10 ? 'X' : v === 0 ? '-' : `${v}`;
      return (r0 + v === 10) ? '/' : (v === 0 ? '-' : `${v}`);
    }
    return v === 10 ? 'X' : v === 0 ? '-' : `${v}`;
  }

  isActive(p: Player, fi: number): boolean {
    return p === this.cur && p.frame === fi;
  }

  totalScore(p: Player): number {
    return [...p.frames].reverse().find(f => f.score !== null)?.score ?? 0;
  }

  range(n: number): number[] { return Array.from({ length: n }, (_, i) => i); }

  get hint(): string {
    switch (this.phase) {
      case 'aiming':     return '← → to AIM   ·   SPACE to set power';
      case 'power':      return 'SPACE to THROW';
      case 'rolling':    return '← → to CURVE the ball';
      case 'result':
      case 'nextPlayer': return 'SPACE to continue';
      default: return '';
    }
  }

  get nextPName(): string {
    if (this.playerCount < 2) return '';
    return this.players[(this.curIdx + 1) % this.playerCount].name;
  }
}

function pts(...ps: { x: number; y: number }[]): string {
  return ps.map(p => `${p.x},${p.y}`).join(' ');
}
