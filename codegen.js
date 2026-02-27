// codegen.js
// Generates exportable code snippets from the current S (state) object.
// Depends on: engine.js (for S and buildPath reference in comments).

// ─────────────────────────────────────────────────────────────────────────────
// REACT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function genReact() {
  const {
    notchHover: nh, notchDefault: nd, notchCurve: nc,
    cornerRadius: cr, strokeWidth: sw,
    accentColor: ac, fillOnHover: fh, strokeOnly: so, invertText: it,
    speed: sp, activeCorners: corners, fx,
  } = S;

  return `import { useRef, useEffect, useState, useCallback } from 'react';

const ORIG   = 'EXPLORE NETWORK';
const GCHARS = '!<>-_\\\\/[]{}—=+*^?#ABCDEFabcdef0123456789';
const ACCENT = '${ac}';

// Builds the SVG path d-string for the morphing button outline.
function buildPath(w, h, c, r, nc, corners) {
  const cv = (nc / 100) * c * 0.8;
  const { tl, tr, br, bl } = corners;
  const s = 1; let d = '';
  d += tl ? \`M \${c} \${s} \` : \`M \${r} \${s} \`;
  if(tr){const p=cv*.9;d+=cv<.5?\`L \${w-c} \${s} L \${w-s} \${c} \`:\`L \${w-c} \${s} C \${w-c+p} \${s} \${w-s} \${c-p} \${w-s} \${c} \`;}
  else{d+=\`L \${w-r} \${s} Q \${w-s} \${s} \${w-s} \${r} \`;}
  if(br){const p=cv*.9;d+=cv<.5?\`L \${w-s} \${h-c} L \${w-c} \${h-s} \`:\`L \${w-s} \${h-c} C \${w-s} \${h-c+p} \${w-c+p} \${h-s} \${w-c} \${h-s} \`;}
  else{d+=\`L \${w-s} \${h-r} Q \${w-s} \${h-s} \${w-r} \${h-s} \`;}
  if(bl){const p=cv*.9;d+=cv<.5?\`L \${c} \${h-s} L \${s} \${h-c} \`:\`L \${c} \${h-s} C \${c-p} \${h-s} \${s} \${h-c+p} \${s} \${h-c} \`;}
  else{d+=\`L \${r} \${h-s} Q \${s} \${h-s} \${s} \${h-r} \`;}
  if(tl){const p=cv*.9;d+=cv<.5?\`L \${s} \${c} L \${c} \${s} \`:\`L \${s} \${c} C \${s} \${c-p} \${c-p} \${s} \${c} \${s} \`;}
  else{d+=\`L \${s} \${r} Q \${s} \${s} \${r} \${s} \`;}
  return d + 'Z';
}

const CFG = {
  notchHover: ${nh},   notchDefault: ${nd},
  notchCurve: ${nc},   cornerRadius: ${cr},
  strokeWidth: ${sw},  speed: ${sp.toFixed(2)},
  fillOnHover: ${fh},  strokeOnly: ${so},  invertText: ${it},
  corners: ${JSON.stringify(corners)},
  fx: {
    hud:        ${fx.hud},
    hudSize:    ${fx.hudSize},    hudOffset: ${fx.hudOffset},
    hudRadius:  ${fx.hudRadius},  hudFlip:   ${fx.hudFlip},
    ripple:     ${fx.ripple},
    ripScale:   ${fx.ripScale},   ripCount:  ${fx.ripCount},
    ripDash:    ${fx.ripDash},    ripDashLen:${fx.ripDashLen}, ripDashGap:${fx.ripDashGap},
    glitch:     ${fx.glitch},
  },
};

export default function MorphButton({ label = ORIG }) {
  const wrapRef   = useRef(null);
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const cutRef    = useRef(CFG.notchDefault);
  const hovRef    = useRef(false);
  const hudPRef   = useRef(0);
  const hudBRef   = useRef(0);
  const ripsRef   = useRef([]);
  const glitchRef = useRef(null);

  const [svgPath, setSvgPath] = useState('');
  const [isHov,   setIsHov]   = useState(false);
  const [display, setDisplay] = useState(label);

  const triggerGlitch = useCallback(() => {
    if (!CFG.fx.glitch) return;
    let frame = 0; const total = 8;
    clearInterval(glitchRef.current);
    glitchRef.current = setInterval(() => {
      if (frame >= total) { setDisplay(label); clearInterval(glitchRef.current); return; }
      const prog = frame / total;
      setDisplay(label.split('').map((ch, i) => {
        if (ch === ' ') return ' ';
        if (i < Math.floor(prog * label.length)) return ch;
        return GCHARS[Math.floor(Math.random() * GCHARS.length)];
      }).join(''));
      frame++;
    }, 42);
  }, [label]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas?.getContext('2d');

    const tick = () => {
      const target = hovRef.current ? CFG.notchHover : CFG.notchDefault;
      cutRef.current  += (target - cutRef.current) * CFG.speed;
      hudPRef.current += ((hovRef.current ? 1 : 0) - hudPRef.current) * 0.12;
      hudBRef.current += 0.024;

      if (wrapRef.current) {
        const w = wrapRef.current.offsetWidth;
        const h = wrapRef.current.offsetHeight;
        setSvgPath(buildPath(w, h, cutRef.current, CFG.cornerRadius, CFG.notchCurve, CFG.corners));

        // Ripple drawing
        if (ctx && canvas) {
          canvas.width = w; canvas.height = h;
          ctx.clearRect(0, 0, w, h);
          ripsRef.current = ripsRef.current.filter(rip => {
            if (rip.delay > 0) { rip.delay--; return true; }
            rip.progress += 0.022; rip.alpha -= 0.018;
            if (rip.alpha <= 0) return false;
            const scl  = 1 + (CFG.fx.ripScale - 1) * rip.progress;
            const sw2  = w * scl, sh2 = h * scl;
            const path = new Path2D(buildPath(sw2, sh2, cutRef.current * scl, CFG.cornerRadius * scl, CFG.notchCurve, CFG.corners));
            ctx.save();
            ctx.translate(w / 2 - sw2 / 2, h / 2 - sh2 / 2);
            ctx.strokeStyle = ACCENT; ctx.globalAlpha = rip.alpha; ctx.lineWidth = CFG.strokeWidth;
            if (CFG.fx.ripDash) { ctx.setLineDash([CFG.fx.ripDashLen, CFG.fx.ripDashGap]); ctx.lineDashOffset = -rip.progress * 60; }
            ctx.stroke(path); ctx.restore();
            return true;
          });
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(rafRef.current); clearInterval(glitchRef.current); };
  }, []);

  const fill   = isHov && CFG.fillOnHover ? ACCENT : 'transparent';
  const stroke = isHov ? ACCENT : (CFG.strokeOnly ? ACCENT : 'rgba(255,255,255,0.28)');
  const color  = isHov && CFG.invertText  ? '#000' : '#fff';

  const onEnter = () => { hovRef.current = true;  setIsHov(true);  triggerGlitch(); };
  const onLeave = () => { hovRef.current = false; setIsHov(false); if (CFG.fx.glitch) setTimeout(triggerGlitch, 80); };
  const onClick = () => {
    if (!CFG.fx.ripple) return;
    for (let i = 0; i < CFG.fx.ripCount; i++)
      ripsRef.current.push({ progress: 0, delay: i * 8, alpha: 0.85 - i * 0.15 });
  };

  return (
    <div ref={wrapRef} onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={onClick}
      style={{
        position: 'relative', display: 'inline-block', isolation: 'isolate',
        padding: '18px 46px', cursor: 'pointer', userSelect: 'none',
        fontFamily: 'monospace', fontWeight: 700, letterSpacing: '2px',
        fontSize: '13px', color, transition: 'color 0.3s',
      }}>
      <span style={{ position: 'relative', zIndex: 1 }}>{display}</span>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: -1, overflow: 'visible' }}>
        <path d={svgPath} fill={fill} stroke={stroke} strokeWidth={CFG.strokeWidth}
          style={{ transition: 'fill .35s, stroke .35s' }}/>
      </svg>
      {/* Canvas for ripple; HUD brackets would need a separate SVG overlay */}
      <canvas ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 2, pointerEvents: 'none' }}/>
    </div>
  );
}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// VANILLA HTML + JS SNIPPET
// ─────────────────────────────────────────────────────────────────────────────
function genHtml() {
  const {
    notchHover: nh, notchDefault: nd, notchCurve: nc,
    cornerRadius: cr, strokeWidth: sw,
    accentColor: ac, fillOnHover: fh, strokeOnly: so, invertText: it,
    speed: sp, activeCorners, fx,
  } = S;

  return `<div class="morph-btn" id="morphBtn">
  <span id="btnLabel">EXPLORE NETWORK</span>
  <svg><path id="btnPath"></path></svg>
  <svg id="hudSvg" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:10;"></svg>
</div>
<canvas id="ripCanvas" style="position:fixed;top:0;left:0;pointer-events:none;z-index:999;"></canvas>

<script>
const btn  = document.getElementById('morphBtn');
const path = document.getElementById('btnPath');
const hud  = document.getElementById('hudSvg');
const lbl  = document.getElementById('btnLabel');
const cv   = document.getElementById('ripCanvas');
const ctx  = cv.getContext('2d');
cv.width   = window.innerWidth;
cv.height  = window.innerHeight;

const CFG = {
  notchHover: ${nh},  notchDefault: ${nd},  notchCurve: ${nc},
  cornerRadius: ${cr}, strokeWidth: ${sw},   speed: ${sp.toFixed(2)},
  accent: '${ac}',    fillOnHover: ${fh},   strokeOnly: ${so},  invertText: ${it},
  corners: ${JSON.stringify(activeCorners)},
  fx: {
    hud: ${fx.hud},     hudSize: ${fx.hudSize},   hudOffset: ${fx.hudOffset},
    hudRadius: ${fx.hudRadius}, hudFlip: ${fx.hudFlip},
    ripple: ${fx.ripple}, ripScale: ${fx.ripScale}, ripCount: ${fx.ripCount},
    ripDash: ${fx.ripDash}, ripDashLen: ${fx.ripDashLen}, ripDashGap: ${fx.ripDashGap},
    glitch: ${fx.glitch},
  },
};

// buildPath, drawHud, drawRipples, and triggerGlitch implementations
// are identical to the React tab — wire them to this CFG object.
// See the React tab for the full source.
<\/script>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS SNIPPET
// ─────────────────────────────────────────────────────────────────────────────
function genCss() {
  return `.morph-btn {
  position: relative;
  display: inline-block;
  isolation: isolate;
  padding: 18px 46px;
  color: #fff;
  font-weight: 700;
  letter-spacing: 2px;
  font-size: 13px;
  cursor: pointer;
  user-select: none;
  font-family: 'Space Mono', monospace;
  transition: color 0.3s ease;
}
.morph-btn svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  overflow: visible;
}
.morph-btn svg path {
  transition: fill 0.35s ease, stroke 0.35s ease;
}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API used by controls.js
// ─────────────────────────────────────────────────────────────────────────────
function getCode(tab) {
  if (tab === 'react') return genReact();
  if (tab === 'html')  return genHtml();
  return genCss();
}

function updateCodeDisplay() {
  document.getElementById('codeReact').textContent = genReact();
  document.getElementById('codeHtml').textContent  = genHtml();
  document.getElementById('codeCss').textContent   = genCss();
}
