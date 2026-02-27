// engine.js
// Core animation engine — no DOM wiring beyond the elements it directly drives.
// Import order: this file must load BEFORE controls.js.

// ─────────────────────────────────────────────────────────────────────────────
// ELEMENT REFS
// ─────────────────────────────────────────────────────────────────────────────
const btn       = document.getElementById('techBtn');
const pathEl    = document.getElementById('morphPath');
const btnLabel  = document.getElementById('btnLabel');
const hudSvg    = document.getElementById('hudSvg');
const ripCanvas = document.getElementById('ripCanvas');
const ripCtx    = ripCanvas.getContext('2d');
const previewEl = document.getElementById('previewEl');

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL STATE  (S)
// controls.js reads and writes this object; engine.js consumes it each frame.
// ─────────────────────────────────────────────────────────────────────────────
const S = {
  // animation
  currentCut:   12,
  targetCut:    12,
  speed:        0.12,

  // shape
  notchHover:   35,
  notchDefault: 12,
  notchCurve:   0,
  cornerRadius: 8,
  strokeWidth:  1.5,

  // which corners receive the notch cut
  activeCorners: { tl: false, tr: true, br: true, bl: false },

  // colour & fill
  accentColor:  '#e84142',
  fillOnHover:  true,
  strokeOnly:   false,
  invertText:   false,
  isHovered:    false,

  // FX — all sub-features live here so presets can override them atomically
  fx: {
    hud:        true,
    ripple:     true,
    glitch:     true,

    // HUD bracket options
    hudSize:    12,
    hudOffset:  6,     // negative = brackets overlap the button
    hudRadius:  0,     // 0 = sharp elbow, > 0 = arc
    hudFlip:    false, // true = arms point outward instead of inward

    // Ripple options
    ripScale:   1.6,   // max scale the silhouette reaches
    ripCount:   2,     // how many concentric ripples per click
    ripDash:    false,
    ripDashLen: 6,
    ripDashGap: 6,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PATH BUILDER
// Constructs the SVG `d` string for the morphing button shape.
// Called every frame (for the live button) and on every click (for ripple copies).
//
//   w, h         — bounding box dimensions in px
//   c            — current notch cut size
//   cornerRadius — radius for non-notched corners
//   notchCurve   — 0 = sharp notch lines, 100 = fully bezier-curved notch
//   corners      — { tl, tr, br, bl } booleans — which corners have the notch
// ─────────────────────────────────────────────────────────────────────────────
function buildPath(w, h, c, cornerRadius, notchCurve, corners) {
  const r  = cornerRadius;
  const s  = 1; // 1px inset so the stroke doesn't clip at the SVG edge
  const cv = (notchCurve / 100) * c * 0.8; // bezier pull amount
  const { tl, tr, br, bl } = corners;
  let d = '';

  // Start point — top-left corner
  d += tl ? `M ${c} ${s} ` : `M ${r} ${s} `;

  // Top-right
  if (tr) {
    const p = cv * 0.9;
    d += cv < 0.5
      ? `L ${w - c} ${s} L ${w - s} ${c} `                                     // sharp
      : `L ${w - c} ${s} C ${w - c + p} ${s} ${w - s} ${c - p} ${w - s} ${c} `; // curved
  } else {
    d += `L ${w - r} ${s} Q ${w - s} ${s} ${w - s} ${r} `;
  }

  // Bottom-right
  if (br) {
    const p = cv * 0.9;
    d += cv < 0.5
      ? `L ${w - s} ${h - c} L ${w - c} ${h - s} `
      : `L ${w - s} ${h - c} C ${w - s} ${h - c + p} ${w - c + p} ${h - s} ${w - c} ${h - s} `;
  } else {
    d += `L ${w - s} ${h - r} Q ${w - s} ${h - s} ${w - r} ${h - s} `;
  }

  // Bottom-left
  if (bl) {
    const p = cv * 0.9;
    d += cv < 0.5
      ? `L ${c} ${h - s} L ${s} ${h - c} `
      : `L ${c} ${h - s} C ${c - p} ${h - s} ${s} ${h - c + p} ${s} ${h - c} `;
  } else {
    d += `L ${r} ${h - s} Q ${s} ${h - s} ${s} ${h - r} `;
  }

  // Top-left (closing)
  if (tl) {
    const p = cv * 0.9;
    d += cv < 0.5
      ? `L ${s} ${c} L ${c} ${s} `
      : `L ${s} ${c} C ${s} ${c - p} ${c - p} ${s} ${c} ${s} `;
  } else {
    d += `L ${s} ${r} Q ${s} ${s} ${r} ${s} `;
  }

  return d + 'Z';
}

// ─────────────────────────────────────────────────────────────────────────────
// HUD CORNER BRACKETS
// Draws L-shaped tick marks at the four corners of the button via an inline SVG.
//
// Options (all from S.fx):
//   hudOffset — positive pushes brackets outside; negative overlaps the button
//   hudSize   — arm length in px
//   hudRadius — 0 = square elbow; >0 = arc at the corner using SVG A command
//   hudFlip   — false = arms face inward (classic targeting HUD)
//               true  = arms face outward (decorative / spiky)
// ─────────────────────────────────────────────────────────────────────────────
let hudPulse  = 0; // lerps 0→1 on hover, drives size & opacity snap
let hudBreath = 0; // monotonically increases to drive idle breathing opacity

function drawHud() {
  if (!S.fx.hud) {
    hudSvg.innerHTML = '';
    return;
  }

  const w   = btn.offsetWidth;
  const h   = btn.offsetHeight;
  const col = S.accentColor;
  const { hudSize, hudOffset, hudRadius, hudFlip } = S.fx;

  // Idle: brackets breathe softly. On hover: they snap fully opaque.
  const breathe = 0.32 + 0.16 * Math.sin(hudBreath);
  const opacity = S.isHovered ? 0.95 : breathe;
  const sw      = 1 + hudPulse * 0.9; // stroke thickens slightly on hover

  const off = hudOffset;
  const sz  = hudSize;
  const rr  = Math.min(hudRadius, sz * 0.95); // clamp radius to arm length

  // Each corner: anchor point (x, y) and the sign of each arm direction
  const corners = [
    { x: -off,      y: -off,      hSign: -1, vSign: -1 }, // TL
    { x: w + off,   y: -off,      hSign:  1, vSign: -1 }, // TR
    { x: w + off,   y: h + off,   hSign:  1, vSign:  1 }, // BR
    { x: -off,      y: h + off,   hSign: -1, vSign:  1 }, // BL
  ];

  let markup = '';

  corners.forEach(({ x, y, hSign, vSign }) => {
    // hudFlip reverses the arm direction — brackets become outward spikes
    const hDir = hudFlip ? -hSign : hSign;
    const vDir = hudFlip ? -vSign : vSign;

    if (rr < 0.5) {
      // ── Sharp elbow — simple polyline ──
      const ax = x + hDir * sz;
      const bx = x;
      const by = y + vDir * sz;
      markup += `<polyline
        points="${ax},${y} ${x},${y} ${bx},${by}"
        fill="none" stroke="${col}"
        stroke-width="${sw.toFixed(2)}" stroke-linecap="square"
        opacity="${opacity.toFixed(3)}"/>`;

    } else {
      // ── Rounded elbow — arc at meeting point ──
      // Arm start (outer end of horizontal arm)
      const hStartX = x + hDir * sz;
      const hStartY = y;
      // Approach the corner, leaving room for the arc
      const hEndX   = x + hDir * rr;
      const hEndY   = y;
      // Arc landing point (start of vertical arm)
      const vStartX = x;
      const vStartY = y + vDir * rr;
      // Arm end (outer end of vertical arm)
      const vEndX   = x;
      const vEndY   = y + vDir * sz;

      // Sweep flag so the arc curves inward toward the button centre
      const sharpSweep = (hSign === -1 && vSign === -1) ? 1
                       : (hSign ===  1 && vSign === -1) ? 0
                       : (hSign ===  1 && vSign ===  1) ? 1
                       :                                   0;
      const sweep = hudFlip ? (1 - sharpSweep) : sharpSweep;

      markup += `<path
        d="M ${hStartX} ${hStartY}
           L ${hEndX} ${hEndY}
           A ${rr} ${rr} 0 0 ${sweep} ${vStartX} ${vStartY}
           L ${vEndX} ${vEndY}"
        fill="none" stroke="${col}"
        stroke-width="${sw.toFixed(2)}" stroke-linecap="round"
        opacity="${opacity.toFixed(3)}"/>`;
    }
  });

  hudSvg.innerHTML = markup;
}

// ─────────────────────────────────────────────────────────────────────────────
// RIPPLE
// On click, stamps the current button silhouette onto a canvas and scales it
// outward from the button's centre. Supports multiple concentric rings and
// optional dashed stroke with marching-ants animation.
// ─────────────────────────────────────────────────────────────────────────────
let ripples = [];

function spawnRipple() {
  if (!S.fx.ripple) return;
  for (let i = 0; i < S.fx.ripCount; i++) {
    ripples.push({
      progress: 0,
      delay:    i * 8,             // stagger each ring by 8 frames
      alpha:    0.85 - i * 0.15,   // outer rings slightly more transparent
    });
  }
}

function resizeRipCanvas() {
  const r         = previewEl.getBoundingClientRect();
  ripCanvas.width  = r.width;
  ripCanvas.height = r.height;
}

function drawRipples() {
  ripCtx.clearRect(0, 0, ripCanvas.width, ripCanvas.height);
  if (!S.fx.ripple || !ripples.length) return;

  const bRect = btn.getBoundingClientRect();
  const pRect = previewEl.getBoundingClientRect();

  // Button centre in canvas-space
  const cx = bRect.left - pRect.left + bRect.width  / 2;
  const cy = bRect.top  - pRect.top  + bRect.height / 2;
  const bw = bRect.width;
  const bh = bRect.height;

  ripples = ripples.filter(rip => {
    if (rip.delay > 0) { rip.delay--; return true; }

    rip.progress += 0.022;
    rip.alpha    -= 0.018;
    if (rip.alpha <= 0 || rip.progress >= 1) return false;

    // Scale factor grows from 1.0 → ripScale over the ripple's lifetime
    const scl = 1 + (S.fx.ripScale - 1) * rip.progress;

    // Rebuild the path at the new (scaled) dimensions so the shape stays accurate
    const scaledW = bw * scl;
    const scaledH = bh * scl;
    const d = buildPath(
      scaledW, scaledH,
      S.currentCut * scl,
      S.cornerRadius * scl,
      S.notchCurve,
      S.activeCorners
    );

    ripCtx.save();
    // Translate so the scaled shape remains centred on the original button centre
    ripCtx.translate(cx - scaledW / 2, cy - scaledH / 2);
    ripCtx.strokeStyle = S.accentColor;
    ripCtx.globalAlpha = rip.alpha;
    ripCtx.lineWidth   = S.strokeWidth;

    if (S.fx.ripDash) {
      ripCtx.setLineDash([S.fx.ripDashLen, S.fx.ripDashGap]);
      ripCtx.lineDashOffset = -rip.progress * 60; // marching-ants animation
    } else {
      ripCtx.setLineDash([]);
    }

    ripCtx.stroke(new Path2D(d));
    ripCtx.restore();
    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TEXT GLITCH
// Scrambles the button label with random characters, then resolves
// left-to-right back to the original text.
// ─────────────────────────────────────────────────────────────────────────────
const ORIG_LABEL = 'EXPLORE NETWORK';
const GCHARS     = '!<>-_\\/[]{}—=+*^?#@$ABCDEFabcdef0123456789';
let   glitchTimer = null;

function triggerGlitch() {
  if (!S.fx.glitch) return;

  let frame = 0;
  const total = 8;
  clearInterval(glitchTimer);

  glitchTimer = setInterval(() => {
    if (frame >= total) {
      btnLabel.textContent = ORIG_LABEL;
      clearInterval(glitchTimer);
      return;
    }

    const progress = frame / total;
    btnLabel.textContent = ORIG_LABEL.split('').map((ch, i) => {
      if (ch === ' ') return ' '; // preserve spaces
      if (i < Math.floor(progress * ORIG_LABEL.length)) return ch; // already resolved
      return GCHARS[Math.floor(Math.random() * GCHARS.length)];
    }).join('');

    frame++;
  }, 42);
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATION LOOP
// Runs at rAF cadence. Lerps currentCut toward targetCut, updates the SVG
// path, applies fill/stroke, and delegates to HUD + ripple drawers.
// ─────────────────────────────────────────────────────────────────────────────
function loop() {
  // Smooth the notch cut value toward its target
  S.currentCut += (S.targetCut - S.currentCut) * S.speed;

  // HUD animation drivers
  hudPulse  += ((S.isHovered ? 1 : 0) - hudPulse) * 0.12;
  hudBreath += 0.024;

  // Update button SVG path
  const w = btn.offsetWidth;
  const h = btn.offsetHeight;
  pathEl.setAttribute('d', buildPath(w, h, S.currentCut, S.cornerRadius, S.notchCurve, S.activeCorners));
  pathEl.style.strokeWidth  = S.strokeWidth;
  pathEl.style.transition   = 'fill 0.35s, stroke 0.35s';

  // Fill and stroke react to hover + user settings
  const col = S.accentColor;
  pathEl.style.fill   = (S.isHovered && S.fillOnHover) ? col : 'transparent';
  pathEl.style.stroke = S.isHovered ? col : (S.strokeOnly ? col : 'rgba(255,255,255,0.28)');

  drawHud();
  drawRipples();
  requestAnimationFrame(loop);
}

// ─────────────────────────────────────────────────────────────────────────────
// BUTTON EVENT LISTENERS
// ─────────────────────────────────────────────────────────────────────────────
btn.addEventListener('mouseenter', () => {
  S.isHovered  = true;
  S.targetCut  = S.notchHover;
  if (S.invertText) btn.style.color = '#000';
  triggerGlitch();
});

btn.addEventListener('mouseleave', () => {
  S.isHovered  = false;
  S.targetCut  = S.notchDefault;
  btn.style.color = '#fff';
  if (S.fx.glitch) setTimeout(triggerGlitch, 80);
});

btn.addEventListener('click', spawnRipple);

window.addEventListener('resize', resizeRipCanvas);
resizeRipCanvas();
