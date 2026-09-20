1. **Mapping.** [The file](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:1418) already animates this title. `renderHero()` exposes `waveH`, `chopH`, `period`, `score`, and `tier.key`; `chopH` comes from `windWave`, falling back to `waveHeight`. `ref.swell`, `ref.swellPeriod`, and `ref.windKmh` also exist. Follow `waveScene()`’s distinction: chop controls turbulence; total height controls gentle displacement. These are expressive proxies, not measured shore energy.

   Normalize chop: `q=clamp(chopH/0.6,0,1)`. Cycle: `clamp(1.8T/(1+0.7q),4,18)` seconds. Gradient width decreases 480→300%; travel increases ±3→±12 percentage points. Height 0–2m increases halo displacement 1→4px. Score 0–100 raises halo opacity .12→.28; `deluxe` adds .04.

2. **Technique.** Keep a stationary pink→mauve→purple base meeting at ה|פ; move a translucent highlight above it. Use two stacked gradient backgrounds with normal compositing, **no `mix-blend-mode`**. Broad stops soften the transition across adjacent letters. Animate `background-position` with the easing below; translate only the halo pseudo-element. Avoid `filter:blur` directly on text.

3. **Integration.** Replace existing motion rules and remove `${seaMotionVars(ref, score)}` from the score’s inline style, otherwise its properties override inheritance. Insert the JS inside `renderHero()` after existing variable declarations. It sets all five properties on `hero`. Reuse the existing Page Visibility listener toggling `body.bg`; initialize that class as shown.

4. **Pitfalls.** Keep prefixed clipping/fill for Safari; test inline-block spans and Hebrew font rendering. Changing the existing `letter-spacing:1px` changes span widths and gradient sampling. [Clipping guidance](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/background-clip). Remove the current filtered `drop-shadow`; `text-shadow` still paints glyph halos. Prefer a fixed `box-shadow` on a transformed pseudo-element. Background-position still repaints: this tiny area targets 60fps, but requires phone profiling; `will-change` cannot guarantee acceleration. [Performance guidance](https://web.dev/articles/animations-guide).

```css
.hero-score .sc-title{position:relative;isolation:isolate}
.hero-score .sc-title-txt{filter:none}
.hero-score .sc-title-txt :is(.w1,.w2){
  display:inline-block;color:transparent;-webkit-text-fill-color:transparent;
  background-image:linear-gradient(90deg,transparent,#ffffff30,transparent),var(--base);
  background-size:var(--sea-stretch,420%) 100%,100% 100%;
  background-position:50% 50%,center;
  -webkit-background-clip:text;background-clip:text;
  animation:titleDrift var(--sea-cycle,12s) cubic-bezier(.45,0,.55,1) infinite;
  will-change:auto;
}
.hero-score .w1{--base:linear-gradient(to left,#ff9db0 20%,#d49bdb)}
.hero-score .w2{--base:linear-gradient(to left,#d49bdb,#b08cff 80%)}
.hero-score .sc-title::before{
  content:"";position:absolute;inset:6px;border-radius:inherit;
  z-index:-1;pointer-events:none;box-shadow:0 0 12px 2px #b08cff;
  opacity:var(--sea-glow,.2);
  animation:titleHalo var(--sea-cycle,12s) ease-in-out infinite;
}
@keyframes titleDrift{
  0%,100%{background-position:calc(50% - var(--sea-travel,3%)) 50%,center}
  50%{background-position:calc(50% + var(--sea-travel,3%)) 50%,center}
}
@keyframes titleHalo{
  0%,100%{transform:translateY(0)}
  50%{transform:translateY(calc(-1 * var(--sea-bob,1px)))}
}
body.bg .hero-score .sc-title-txt :is(.w1,.w2),
body.bg .hero-score .sc-title::before{animation-play-state:paused}
@media(prefers-reduced-motion:reduce){
  .hero-score .sc-title-txt :is(.w1,.w2),
  .hero-score .sc-title::before{animation:none}
}
```

```js
// Inside renderHero(); retain its existing declarations.
const limit = (v,a,b) => Math.max(a,Math.min(b,v));
const q = limit(chopH/0.6,0,1);
const T = limit(ref?.wavePeriod ?? ref?.swellPeriod ?? 6,3,12);
const s = limit((score ?? 50)/100,0,1);
hero.style.setProperty("--sea-cycle",`${limit(1.8*T/(1+.7*q),4,18)}s`);
hero.style.setProperty("--sea-stretch",`${480-180*q}%`);
hero.style.setProperty("--sea-travel",`${3+9*q}%`);
hero.style.setProperty("--sea-bob",`${1+3*limit(waveH/2,0,1)}px`);
hero.style.setProperty("--sea-glow",.12+.16*s+(tier?.key==="deluxe"?.04:0));
document.body.classList.toggle("bg",document.hidden);
```

Codex session ID: 01a0be7d-1623-7241-a1cd-080b2b2527bf
Resume in Codex: codex resume 01a0be7d-1623-7241-a1cd-080b2b2527bf
