// controls.js
// Wires every panel control to the S (state) object defined in engine.js.
// Depends on: engine.js, codegen.js.

// ─────────────────────────────────────────────────────────────────────────────
// CODE TABS + COPY BUTTON
// ─────────────────────────────────────────────────────────────────────────────
let activeTab = 'react';

document.querySelectorAll('.code-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    activeTab = tab.dataset.tab;
    document.querySelectorAll('.code-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.code-content').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + activeTab).classList.add('active');
  });
});

document.getElementById('copyBtn').addEventListener('click', () => {
  const copyBtn = document.getElementById('copyBtn');
  navigator.clipboard.writeText(getCode(activeTab)).then(() => {
    copyBtn.textContent = 'COPIED!';
    setTimeout(() => copyBtn.textContent = 'COPY', 1500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SLIDER HELPER
// Registers an input listener; calls set(value) and refreshes code output.
//
//   id        — element id of the <input type="range">
//   valId     — element id of the value badge
//   set       — callback receiving the (possibly transformed) value
//   transform — optional fn applied to the raw number before set() and display
// ─────────────────────────────────────────────────────────────────────────────
function sl(id, valId, set, transform) {
  document.getElementById(id).addEventListener('input', function () {
    const raw = +this.value;
    const val = transform ? transform(raw) : raw;
    set(val);
    document.getElementById(valId).textContent = transform ? val.toFixed(2) : raw;
    updateCodeDisplay();
  });
}

// Shape sliders
sl('notchHover',   'notchHoverVal',   v => { S.notchHover   = v; if ( S.isHovered) S.targetCut = v; });
sl('notchDefault', 'notchDefaultVal', v => { S.notchDefault = v; if (!S.isHovered) S.targetCut = v; });
sl('notchCurve',   'notchCurveVal',   v => S.notchCurve   = v);
sl('cornerRadius', 'cornerRadiusVal', v => S.cornerRadius = v);
sl('animSpeed',    'animSpeedVal',    v => S.speed        = v, v => v / 100);
sl('strokeWidth',  'strokeWidthVal',  v => S.strokeWidth  = v);

// HUD sliders
sl('hudSize',   'hudSizeVal',   v => S.fx.hudSize   = v);
sl('hudOffset', 'hudOffsetVal', v => S.fx.hudOffset = v);
sl('hudRadius', 'hudRadiusVal', v => S.fx.hudRadius = v);

// Ripple sliders
sl('ripScale',   'ripScaleVal',   v => S.fx.ripScale   = v);
sl('ripCount',   'ripCountVal',   v => S.fx.ripCount   = v);
sl('ripDashLen', 'ripDashLenVal', v => S.fx.ripDashLen = v);
sl('ripDashGap', 'ripDashGapVal', v => S.fx.ripDashGap = v);

// ─────────────────────────────────────────────────────────────────────────────
// CORNER TOGGLES
// ─────────────────────────────────────────────────────────────────────────────
const cMap = { tl: 'ci-tl', tr: 'ci-tr', br: 'ci-br', bl: 'ci-bl' };

document.querySelectorAll('.ctog').forEach(el => {
  el.addEventListener('click', () => {
    const c = el.dataset.corner;
    S.activeCorners[c] = !S.activeCorners[c];
    el.classList.toggle('active', S.activeCorners[c]);
    document.getElementById(cMap[c]).classList.toggle('on', S.activeCorners[c]);
    updateCodeDisplay();
  });
});

// Sync corner indicators to initial state
Object.entries(S.activeCorners).forEach(([c, v]) => {
  document.getElementById(cMap[c]).classList.toggle('on', v);
});

// ─────────────────────────────────────────────────────────────────────────────
// HOVER BEHAVIOR TOGGLES
// ─────────────────────────────────────────────────────────────────────────────
const behaviorMap = {
  fillToggle:   'fillOnHover',
  strokeToggle: 'strokeOnly',
  invertToggle: 'invertText',
};

Object.entries(behaviorMap).forEach(([id, prop]) => {
  document.getElementById(id).addEventListener('change', function () {
    S[prop] = this.checked;
    updateCodeDisplay();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FX TOGGLE ROWS  +  SUB-PANEL SHOW / HIDE
// ─────────────────────────────────────────────────────────────────────────────
function bindFx(checkboxId, fxKey, subPanelId) {
  const checkbox = document.getElementById(checkboxId);
  const row      = document.getElementById('fxRow-' + fxKey);
  const subPanel = subPanelId ? document.getElementById(subPanelId) : null;

  checkbox.addEventListener('change', function () {
    S.fx[fxKey] = this.checked;
    row.classList.toggle('on', this.checked);
    if (subPanel) subPanel.classList.toggle('visible', this.checked);

    // Side-effects when disabling
    if (!this.checked && fxKey === 'glitch') btnLabel.textContent = ORIG_LABEL;
    if (!this.checked && fxKey === 'hud')    hudSvg.innerHTML = '';

    updateCodeDisplay();
  });
}

bindFx('fxHud',    'hud',    'sub-hud');
bindFx('fxRipple', 'ripple', 'sub-ripple');
bindFx('fxGlitch', 'glitch', null);

// HUD flip (standalone toggle inside the HUD sub-panel)
document.getElementById('hudFlip').addEventListener('change', function () {
  S.fx.hudFlip = this.checked;
  updateCodeDisplay();
});

// Ripple dash — also shows/hides the dash-length and dash-gap rows
document.getElementById('ripDash').addEventListener('change', function () {
  S.fx.ripDash = this.checked;
  document.getElementById('dashLenRow').style.display = this.checked ? 'grid' : 'none';
  document.getElementById('dashGapRow').style.display = this.checked ? 'grid' : 'none';
  updateCodeDisplay();
});

// ─────────────────────────────────────────────────────────────────────────────
// ACCENT COLOR  (swatches + custom picker)
// ─────────────────────────────────────────────────────────────────────────────
function setColor(col) {
  S.accentColor = col;
  document.getElementById('customColor').value = col;
  updateCodeDisplay();
}

document.querySelectorAll('.sw').forEach(swatch => {
  swatch.addEventListener('click', () => {
    document.querySelectorAll('.sw').forEach(s => s.classList.remove('active'));
    swatch.classList.add('active');
    setColor(swatch.dataset.color);
  });
});

document.getElementById('customColor').addEventListener('input', function () {
  document.querySelectorAll('.sw').forEach(s => s.classList.remove('active'));
  setColor(this.value);
});

// ─────────────────────────────────────────────────────────────────────────────
// PRESETS
// Each entry mirrors the shape of S — short keys (nh/nd/etc.) expand in applyPreset.
// ─────────────────────────────────────────────────────────────────────────────
const presets = {
  avax: {
    nh: 35, nd: 12, nc: 0,  cr: 8, sp: 0.12,
    corners: { tl: 0, tr: 1, br: 1, bl: 0 },
    col: '#e84142', sw: 1.5,
    fx: { hudSize: 12, hudOffset: 6, hudRadius: 0, hudFlip: 0, ripScale: 1.6, ripCount: 2, ripDash: 0 },
  },
  sharp: {
    nh: 50, nd: 5, nc: 0, cr: 0, sp: 0.18,
    corners: { tl: 0, tr: 0, br: 1, bl: 0 },
    col: '#ff6b35', sw: 1,
    fx: { hudSize: 10, hudOffset: 8, hudRadius: 0, hudFlip: 0, ripScale: 1.5, ripCount: 1, ripDash: 0 },
  },
  curved: {
    nh: 40, nd: 15, nc: 75, cr: 6, sp: 0.10,
    corners: { tl: 0, tr: 1, br: 1, bl: 0 },
    col: '#00d4ff', sw: 1.5,
    fx: { hudSize: 14, hudOffset: 5, hudRadius: 6, hudFlip: 0, ripScale: 1.7, ripCount: 2, ripDash: 1, ripDashLen: 6, ripDashGap: 6 },
  },
  double: {
    nh: 30, nd: 10, nc: 20, cr: 4, sp: 0.10,
    corners: { tl: 1, tr: 0, br: 1, bl: 0 },
    col: '#a855f7', sw: 1.5,
    fx: { hudSize: 12, hudOffset: -4, hudRadius: 0, hudFlip: 1, ripScale: 1.6, ripCount: 2, ripDash: 0 },
  },
  brutal: {
    nh: 60, nd: 0, nc: 0, cr: 0, sp: 0.25,
    corners: { tl: 1, tr: 1, br: 1, bl: 1 },
    col: '#ffffff', sw: 1,
    fx: { hudSize: 16, hudOffset: 10, hudRadius: 0, hudFlip: 0, ripScale: 2.0, ripCount: 3, ripDash: 1, ripDashLen: 4, ripDashGap: 8 },
  },
  cyber: {
    nh: 45, nd: 15, nc: 40, cr: 2, sp: 0.15,
    corners: { tl: 1, tr: 0, br: 1, bl: 0 },
    col: '#39ff14', sw: 1,
    fx: { hudSize: 14, hudOffset: -6, hudRadius: 3, hudFlip: 1, ripScale: 1.8, ripCount: 2, ripDash: 1, ripDashLen: 8, ripDashGap: 4 },
  },
};

function applyPreset(p) {
  // Apply shape values
  S.notchHover   = p.nh;
  S.notchDefault = p.nd;
  S.notchCurve   = p.nc;
  S.cornerRadius = p.cr;
  S.speed        = p.sp;
  S.accentColor  = p.col;
  S.strokeWidth  = p.sw;
  S.activeCorners = { tl: !!p.corners.tl, tr: !!p.corners.tr, br: !!p.corners.br, bl: !!p.corners.bl };
  S.targetCut    = p.nd;

  // Apply FX values (use nullish coalescing to keep current values if preset omits a key)
  if (p.fx) {
    S.fx.hudSize    = p.fx.hudSize    ?? S.fx.hudSize;
    S.fx.hudOffset  = p.fx.hudOffset  ?? S.fx.hudOffset;
    S.fx.hudRadius  = p.fx.hudRadius  ?? S.fx.hudRadius;
    S.fx.hudFlip    = !!p.fx.hudFlip;
    S.fx.ripScale   = p.fx.ripScale   ?? S.fx.ripScale;
    S.fx.ripCount   = p.fx.ripCount   ?? S.fx.ripCount;
    S.fx.ripDash    = !!p.fx.ripDash;
    S.fx.ripDashLen = p.fx.ripDashLen ?? S.fx.ripDashLen;
    S.fx.ripDashGap = p.fx.ripDashGap ?? S.fx.ripDashGap;
  }

  // Sync all slider elements and their value badges
  const sync = (id, valId, v, isFloat = false) => {
    document.getElementById(id).value = v;
    document.getElementById(valId).textContent = isFloat ? v.toFixed(2) : v;
  };
  sync('notchHover',   'notchHoverVal',   p.nh);
  sync('notchDefault', 'notchDefaultVal', p.nd);
  sync('notchCurve',   'notchCurveVal',   p.nc);
  sync('cornerRadius', 'cornerRadiusVal', p.cr);
  sync('strokeWidth',  'strokeWidthVal',  p.sw);
  // animSpeed stores the raw 1-30 value; display shows the divided form
  document.getElementById('animSpeed').value = Math.round(p.sp * 100);
  document.getElementById('animSpeedVal').textContent = p.sp.toFixed(2);

  sync('hudSize',      'hudSizeVal',      S.fx.hudSize);
  sync('hudOffset',    'hudOffsetVal',    S.fx.hudOffset);
  sync('hudRadius',    'hudRadiusVal',    S.fx.hudRadius);
  sync('ripScale',     'ripScaleVal',     S.fx.ripScale);
  sync('ripCount',     'ripCountVal',     S.fx.ripCount);
  sync('ripDashLen',   'ripDashLenVal',   S.fx.ripDashLen);
  sync('ripDashGap',   'ripDashGapVal',   S.fx.ripDashGap);

  // Sync toggle checkboxes
  document.getElementById('hudFlip').checked = S.fx.hudFlip;
  document.getElementById('ripDash').checked = S.fx.ripDash;
  document.getElementById('dashLenRow').style.display = S.fx.ripDash ? 'grid' : 'none';
  document.getElementById('dashGapRow').style.display = S.fx.ripDash ? 'grid' : 'none';

  // Sync corner toggle UI
  Object.entries(S.activeCorners).forEach(([c, v]) => {
    document.getElementById('toggle-' + c).classList.toggle('active', v);
    document.getElementById(cMap[c]).classList.toggle('on', v);
  });

  // Sync swatch highlights
  document.querySelectorAll('.sw').forEach(s => s.classList.toggle('active', s.dataset.color === p.col));
  document.getElementById('customColor').value = p.col;

  updateCodeDisplay();
}

document.querySelectorAll('.pbtn').forEach(btn => {
  btn.addEventListener('click', () => {
    const p = presets[btn.dataset.preset];
    if (p) applyPreset(p);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────────────────
updateCodeDisplay();
loop(); // start the animation loop (defined in engine.js)
