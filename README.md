# Bowling Game

A neon retro 10-pin bowling game built with Angular 20 — pseudo-3D SVG lane, full scoring, 1-2 players.

## Play Now

🎳 **Play the game:** https://timothyoverton.github.io/bowling-game/

## How to Play

1. Open the game in your browser (click the link above!)
2. Choose **1 Player** or **2 Players** (hot-seat — players swap after each frame)

### Controls

| Key | Action |
|-----|--------|
| ← → or A / D | Aim left / right |
| SPACE (1st press) | Start power meter |
| SPACE (2nd press) | Throw ball |
| ← → during roll | Curve / hook the ball |
| SPACE | Continue after result |

### Scoring

Standard 10-pin bowling rules:
- **Strike** (all 10 on 1st ball): 10 + next 2 balls as bonus
- **Spare** (all 10 on 2nd ball): 10 + next 1 ball as bonus
- **10th frame**: earn extra balls for strikes/spares — maximum 3 balls
- **Perfect game**: 12 consecutive strikes = 300

### Tips

- Aim for the **1-3 pocket** (just right of center) for strikes
- Use ← → after throwing to **curve the ball** around remaining pins
- High power isn't always better — control beats speed

## Local Development

```bash
npm install
npm start
```

Visit http://localhost:4200/

## Build and Deploy

```bash
# Build for production
npm run build:prod

# Deploy to GitHub Pages (gh-pages branch)
npm run deploy
```

---

Built with Angular 20 — SVG pseudo-3D rendering, deployed via angular-cli-ghpages

---

## 📚 For Future Claude: 3D Rendering System & Deployment Guide

### The Pseudo-3D Projection System

This game uses a **reusable pseudo-3D projection** pattern that works for any top-down perspective game: bowling, putt-putt golf, slot car racing, isometric views, etc.

#### Core concept

The playing surface is represented in **game coordinates**:
- `gx` ∈ [−1, +1] — lateral position across the surface (left to right)
- `gy` ∈ [0, 1] — depth (0 = far/far end, 1 = near/camera end)

The `proj(gx, gy)` function converts these to screen coordinates:

```typescript
// In app.ts — copy this for any top-down 3D game
readonly VX = 300;      // vanishing point X (horizontal center)
readonly VY = 68;       // vanishing point Y (how high up the horizon sits)
readonly NEAR_Y = 590;  // screen Y at the near (player) edge
readonly FAR_HW  = 44;  // lane half-width in pixels at far end
readonly NEAR_HW = 148; // lane half-width in pixels at near end

proj(gx: number, gy: number) {
  const t  = gy;                                         // 0=far, 1=near
  const sy = this.VY + t * (this.NEAR_Y - this.VY);     // screen Y (linear lerp)
  const hw = this.FAR_HW + t * (this.NEAR_HW - this.FAR_HW); // lane half-width at this depth
  const sx = this.VX + gx * hw;                         // screen X
  const sc = 0.18 + t * 0.82;                           // depth scale (0.18 at far, 1.0 near)
  return { x: sx, y: sy, scale: sc };
}
```

**To reuse for putt-putt or other games:**
- Adjust `VY` (higher = more dramatic perspective)
- Adjust `FAR_HW` / `NEAR_HW` ratio (more difference = sharper vanishing)
- The surface shape is a trapezoid: `proj(-1,0)` → `proj(1,0)` → `proj(1,1)` → `proj(-1,1)`
- Scale all object sizes by `scale` so far objects appear smaller

#### Lane floor (trapezoid)

```html
<polygon [attr.points]="lanePoints" class="lane-floor"/>
```
```typescript
get lanePoints(): string {
  const tl = this.proj(-1, 0), tr = this.proj(1, 0);
  const br = this.proj(1, 1), bl = this.proj(-1, 1);
  return `${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}`;
}
```

#### Object depth-scaling

```typescript
// Example: place and scale a circle at game position (gx, gy)
const { x, y, scale } = this.proj(gx, gy);
// circle radius = baseRadius * scale
// object z-index = Math.round(y) for correct overlap
```

#### Why SVG over DOM divs

SVG is better for pseudo-3D games because:
- Polygons and lines are first-class (trapezoid lane, aim guide, pin shapes)
- `transform` on `<g>` tags makes grouped animation easy (pin fall = rotate group)
- No z-index stacking context issues — SVG paint order is document order
- Pin shapes (rect with rx) are trivial; DOM equivalent requires clip-path tricks

---

### Complete Deployment Workflow for New Angular Games

#### 1. Setup from stub

```bash
git clone https://github.com/Timothyoverton/angular-web-stub /tmp/angular-web-stub
mkdir /home/tom/src/NEW-GAME
cd /home/tom/src/NEW-GAME
cp -r /tmp/angular-web-stub/. .
rm -rf .github   # remove workflow file — requires 'workflow' PAT scope, causes push rejection
git init
```

#### 2. Configure project name (3 places in package.json, 1 in angular.json)

```bash
sed -i 's/angular-web-stub/NEW-GAME/g' package.json angular.json
```

Also fix `src/main.ts` — stub exports `App` but Angular CLI generates `AppComponent`:
```typescript
// Change:  import { App } from './app/app';
// To:      import { AppComponent as App } from './app/app';
```

#### 3. Node.js (required — not in default PATH)

```bash
curl -fsSL https://nodejs.org/dist/v22.12.0/node-v22.12.0-linux-x64.tar.xz | tar -xJ -C /tmp
export PATH="/tmp/node-v22.12.0-linux-x64/bin:$PATH"
```

Node v22.12.0 works. Angular 20 requires ≥v20.19 or ≥v22.x. The `/tmp` location does NOT persist across reboots — re-download if `node: command not found`.

#### 4. Build & test

```bash
npm install
npm run build:prod   # warning about CSS budget >4kB is OK, not an error
```

#### 5. Create GitHub repo

```bash
PAT="YOUR_REPO_SCOPE_PAT"
curl -s -X POST \
  -H "Authorization: token $PAT" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/user/repos \
  -d '{"name":"NEW-GAME","description":"...","private":false,"auto_init":false}'
```

#### 6. Push code

```bash
git config user.email "timothyoverton+claude@gmail.com"
git config user.name "Timothy Overton"
git remote add origin "https://Timothyoverton:YOUR_REPO_SCOPE_PAT@github.com/Timothyoverton/NEW-GAME.git"
git add -A && git commit -m "Initial game"
git push -u origin master
```

#### 7. Deploy to GitHub Pages

```bash
npm run deploy   # builds + pushes dist to gh-pages branch via angular-cli-ghpages
```

GitHub Pages auto-enables when the `gh-pages` branch is created. Wait 2-5 min then visit:
```
https://timothyoverton.github.io/NEW-GAME/
```

#### ⚠️ Critical Notes

1. **Delete `.github/` before pushing** — the stub includes a workflow YAML that requires `workflow` PAT scope. Push will be rejected with a confusing error. Just `rm -rf .github`.

2. **Node not in PATH** — always `export PATH="/tmp/node-v22.12.0-linux-x64/bin:$PATH"` at the top of any session that needs npm/ng.

3. **CSS budget warning** is not an error — build still succeeds. Only `maximumError` stops the build.

4. **`main.ts` import** — stub uses `App`, Angular component is `AppComponent`. Fix the import alias.

5. **2-player flow** — for hot-seat multiplayer, track each player's frame independently. Switch `curIdx` after each complete frame. Wrap around (P2 done → P1's next frame) by incrementing all `player.frame` when index returns to 0.

6. **PATs in use:** (ask Tim for current tokens — stored in Claude project memory)
   - Repo-scope PAT — push code, deploy all games via angular-cli-ghpages
   - Gist-scope PAT — read/write the private "Virtual Tim To Do List" gist only

### 🔗 Live Game URL

```
https://timothyoverton.github.io/bowling-game/
```

---
