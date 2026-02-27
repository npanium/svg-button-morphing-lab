## Demo: https://npanium.github.io/svg-button-morphing-lab/

# SVG Button Morphing Lab

An interactive browser tool for designing and exporting animated SVG buttons with notched corners, HUD bracket overlays, click ripple effects, and text glitch — all configurable in real time with a live code export in React, HTML/JS, and CSS.

 <image src="screenshot.png" width={800px}>

## Usage

Open `index.html` in any modern browser. No build step, no dependencies, no server required.

---

## Controls

**Notch Shape**
Adjusts the core button geometry. Notch size sets how deep the corner cuts are at rest and on hover. Curvature slides the notch from a sharp angular cut to a smooth bezier curve. Corner Radius controls the roundness of non-notched corners. Animation Speed sets how quickly the notch lerps between states.

**Active Corners**
Toggles which of the four corners receive the notch cut. Any combination is valid.

**Hover Behavior**
Fill on hover floods the shape with the accent color. Stroke color only keeps the fill transparent and colors the stroke instead. Invert text flips the label to black when the button is filled.

**FX — HUD Corner Brackets**
Draws L-shaped tick marks at each corner of the button, rendered as an SVG overlay. Bracket Size controls arm length. Offset pushes the brackets outward from the button edge — negative values overlap into the button. Corner Radius rounds the bracket elbow from a sharp right angle to an arc. Flip Outward reverses the arm direction so brackets point away from the button centre.

**FX — Click Ripple**
On click, stamps the current button silhouette as a canvas path and scales it outward. Scale Amount sets the maximum size the ripple reaches. Ripple Count spawns multiple concentric rings per click. Dashed Stroke switches to a dashed line with independently controlled dash length and gap; the dash offset animates as the ripple expands.

**FX — Text Glitch**
Scrambles the button label with random characters on mouse enter and leave, resolving left-to-right back to the original text over eight frames.

**Accent Color**
Eight preset swatches plus a custom color picker. All FX, stroke, and fill colors derive from this single value.

**Presets**
Six named configurations that snapshot shape, corner, speed, color, and FX settings together.

---

## Code Export

The panel at the bottom of the preview updates live as you configure. Three tabs are available:

- **React** — a self-contained functional component with hooks, inline styles, and a requestAnimationFrame loop. Copy and drop into any React project.
- **HTML + JS** — a vanilla implementation with the full CFG object pre-populated. Includes the buildPath function and all animation logic.
- **CSS** — the base styles for the `.morph-btn` class.

---

## File Structure

```
index.html    Markup and script imports. No inline logic.
styles.css    All visual styles and design tokens.
engine.js     State object, path builder, HUD, ripple, glitch, animation loop.
codegen.js    React / HTML+JS / CSS snippet generators.
controls.js   UI wiring — sliders, toggles, presets, color picker, tabs.
```

Scripts load in dependency order: `engine.js` → `codegen.js` → `controls.js`.

---

## Browser Support

Requires support for `Path2D`, `canvas`, and `requestAnimationFrame`. Works in all current versions of Chrome, Firefox, Safari, and Edge.
