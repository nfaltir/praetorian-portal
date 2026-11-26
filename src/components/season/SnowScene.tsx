"use client";

/*
  CHRISTMAS BACKDROP
  A bright winter scene behind the portal: a warm glare in the sky,
  northern-lights curtains in Christmas colors (gold turning rose, with a
  faint evergreen curtain behind), out-of-focus lights drifting and
  twinkling, a snowfield along the bottom, and falling snow with depth.
  Gusts sway the snow, flakes part around the pointer, and they drift with
  scrolling.

  Two canvases, no libraries:
  - sky: one WebGL shader drawn at about a third of screen resolution
    (everything in it is soft, so the browser's upscaling is free blur)
    and only every other frame
  - snow: Canvas 2D sprites, about 20 to 150 flakes depending on screen size
  Sits behind all content (no pointer events, hidden from screen readers).
  Reduce Motion gets one still frame. Pauses by itself in background tabs.
  If WebGL is unavailable, the CSS background in globals.css shows instead.
*/
import { useEffect, useRef } from "react";

const SKY_SCALE = 0.35;
const MAX_DPR = 2;
const POINTER_RADIUS = 130;

export function SnowScene() {
  const skyRef = useRef<HTMLCanvasElement>(null);
  const snowRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const skyCanvas = skyRef.current;
    const snowCanvas = snowRef.current;
    if (!skyCanvas || !snowCanvas) return;
    return startScene(skyCanvas, snowCanvas);
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed top-0 left-0 -z-10 h-lvh w-full overflow-hidden">
      <canvas ref={skyRef} className="absolute inset-0 size-full" />
      <canvas ref={snowRef} className="absolute inset-0 size-full" />
    </div>
  );
}

type Pointer = { x: number; y: number; vx: number; vy: number; t: number };

function startScene(skyCanvas: HTMLCanvasElement, snowCanvas: HTMLCanvasElement): () => void {
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sky = createSky(skyCanvas);
  const snow = createSnow(snowCanvas);
  if (!snow) {
    sky?.dispose();
    return () => {};
  }

  let windOffset = 0;

  const resize = () => {
    const w = snowCanvas.clientWidth;
    const h = snowCanvas.clientHeight;
    if (!w || !h) return;
    sky?.resize(w, h);
    snow.resize(w, h);
    if (still) {
      sky?.draw(40, 0);
      snow.draw();
    }
  };
  const observer = new ResizeObserver(resize);
  observer.observe(snowCanvas);
  resize();

  if (still) {
    return () => {
      observer.disconnect();
      sky?.dispose();
    };
  }

  const pointer: Pointer = { x: -9999, y: -9999, vx: 0, vy: 0, t: 0 };
  const onPointer = (e: PointerEvent) => {
    const now = performance.now();
    const gap = now - pointer.t;
    if (pointer.t && gap < 100) {
      const dt = Math.max(16, gap) / 1000;
      pointer.vx = (e.clientX - pointer.x) / dt;
      pointer.vy = (e.clientY - pointer.y) / dt;
    }
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.t = now;
  };

  let lastScroll = window.scrollY;
  let scrollDelta = 0;
  const onScroll = () => {
    scrollDelta += window.scrollY - lastScroll;
    lastScroll = window.scrollY;
  };

  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });

  const start = performance.now();
  let last = start;
  let frame = 0;
  let raf = 0;

  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = (now - start) / 1000;
    const wind = gust(t);
    windOffset += wind * dt;

    const fade = Math.pow(0.02, dt);
    pointer.vx *= fade;
    pointer.vy *= fade;

    snow.step(dt, t, wind, pointer, scrollDelta);
    scrollDelta = 0;
    snow.draw();
    if (sky && (frame++ & 1) === 0) sky.draw(t, windOffset);

    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(raf);
    observer.disconnect();
    window.removeEventListener("pointermove", onPointer);
    window.removeEventListener("scroll", onScroll);
    sky?.dispose();
  };
}

/* Wind in px per second: a steady drift with slow, uneven swells */
function gust(t: number): number {
  return 10 + 9 * Math.sin(t * 0.13) + 5 * Math.sin(t * 0.31 + 1.7) + 3 * Math.sin(t * 0.73 + 0.4);
}

/* ---------- Snow (Canvas 2D) ---------- */

type Flake = {
  x: number;
  y: number;
  z: number; // depth: 0 far, 1 near
  size: number;
  fall: number;
  phase: number;
  sway: number;
  swaySpeed: number;
  pushX: number;
  pushY: number;
};

function createSnow(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const sprite = makeFlakeSprite();
  let w = 0;
  let h = 0;
  let dpr = 1;
  const flakes: Flake[] = [];

  const make = (anywhere: boolean): Flake => {
    const z = Math.random() ** 1.6; // more far flakes than near ones
    return {
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : -10 - Math.random() * 40,
      z,
      size: 1.8 + z * z * 4.6,
      fall: 14 + z * 46 + Math.random() * 6,
      phase: Math.random() * Math.PI * 2,
      sway: 6 + Math.random() * 14,
      swaySpeed: 0.4 + Math.random() * 0.9,
      pushX: 0,
      pushY: 0,
    };
  };

  return {
    resize(nw: number, nh: number) {
      w = nw;
      h = nh;
      dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const target = Math.round(Math.min(150, Math.max(22, (w * h) / 12000)));
      while (flakes.length < target) flakes.push(make(true));
      flakes.length = target;
    },

    step(dt: number, t: number, wind: number, pointer: Pointer, scroll: number) {
      const keep = Math.pow(0.08, dt);
      const r2 = POINTER_RADIUS * POINTER_RADIUS;
      for (const f of flakes) {
        const depth = 0.35 + 0.65 * f.z;

        const dx = f.x - pointer.x;
        const dy = f.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < r2 && d2 > 1) {
          const d = Math.sqrt(d2);
          const k = (1 - d / POINTER_RADIUS) ** 2 * depth;
          f.pushX += ((dx / d) * 260 + pointer.vx * 0.6) * k * dt;
          f.pushY += ((dy / d) * 260 + pointer.vy * 0.6) * k * dt;
        }
        f.pushX *= keep;
        f.pushY *= keep;

        f.x += (wind * depth + Math.cos(t * f.swaySpeed + f.phase) * f.sway * 0.6 + f.pushX) * dt;
        f.y += (f.fall + f.pushY) * dt - scroll * (0.15 + 0.5 * f.z);

        if (f.y > h + 12) Object.assign(f, make(false));
        else if (f.y < -60) f.y = h + 10;
        if (f.x > w + 20) f.x -= w + 40;
        else if (f.x < -20) f.x += w + 40;
      }
    },

    draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      for (const f of flakes) {
        const near = f.z > 0.82;
        const r = near ? f.size * 2.2 : f.size; // close flakes are out of focus
        ctx.globalAlpha = near ? 0.35 : 0.45 + 0.55 * f.z;
        ctx.drawImage(sprite, f.x - r, f.y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
    },
  };
}

function makeFlakeSprite(): HTMLCanvasElement {
  const s = document.createElement("canvas");
  s.width = 64;
  s.height = 64;
  const c = s.getContext("2d");
  if (c) {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255, 255, 255, 1)");
    g.addColorStop(0.5, "rgba(255, 255, 255, 0.75)");
    g.addColorStop(1, "rgba(220, 226, 238, 0)");
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
  }
  return s;
}

/* ---------- Sky, aurora, lights and snowfield (WebGL) ---------- */

const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uTime;
uniform float uWind;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  float t = uTime;
  float drift = uWind * 0.0025;

  // Sky: warm white glare at the top, soft lavender toward the edges
  vec3 col = mix(vec3(0.9, 0.88, 0.92), vec3(0.99, 0.96, 0.93), smoothstep(0.2, 1.0, uv.y));
  vec2 g = (uv - vec2(0.45, 0.95)) * vec2(aspect * 0.8, 1.0);
  col = mix(col, vec3(1.0, 0.99, 0.96), exp(-dot(g, g) * 1.6));

  // Aurora: curtains with a crisp lower edge that fade upward, streaked
  // with vertical rays. Gold at the base turning rose, and a fainter
  // evergreen curtain behind it.
  float x = uv.x * aspect;
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    float base = 0.5 + fi * 0.1
      + 0.06 * sin(x * (1.6 - fi * 0.5) + t * 0.06 + fi * 2.4)
      + 0.035 * sin(x * 3.7 - t * 0.045 + 1.0 + fi)
      + 0.05 * (fbm(vec2(x * 0.8 - drift + fi * 9.0, t * 0.025)) - 0.5);
    float height = 0.2 + 0.08 * fi;
    float above = uv.y - base;
    float curtain = smoothstep(-0.035, 0.025, above) * exp(-max(above, 0.0) / height);
    float rays = pow(fbm(vec2(x * 9.0 - drift * 4.0 + t * 0.05 + fi * 3.0, t * 0.08)), 1.4) * 1.6;
    float shimmer = 0.8 + 0.2 * sin(t * (0.3 + fi * 0.1) + x * 2.0);
    vec3 lo = i == 0 ? vec3(1.0, 0.8, 0.45) : vec3(0.5, 0.78, 0.6);
    vec3 hi = i == 0 ? vec3(0.93, 0.4, 0.48) : vec3(1.0, 0.85, 0.55);
    vec3 c = mix(lo, hi, clamp(above / height, 0.0, 1.0));
    float strength = i == 0 ? 0.45 : 0.22;
    col = mix(col, c, clamp(curtain * rays * shimmer * strength, 0.0, 0.85));
  }

  // Bokeh lights: luminous discs with a soft halo, drifting and twinkling.
  // Smaller and fewer on portrait screens so phones don't look crowded.
  float portrait = clamp(aspect, 0.45, 1.0);
  for (int i = 0; i < 26; i++) {
    float fi = float(i);
    float h1 = hash(vec2(fi, 3.7));
    float h2 = hash(vec2(fi, 9.1));
    float h3 = hash(vec2(fi, 5.3));
    vec2 c = vec2(fract(h1 + t * (0.002 + 0.004 * h3) + drift * 0.3), 0.36 + 0.56 * h2);
    c.y += 0.015 * sin(t * (0.2 + 0.2 * h3) + fi);
    vec2 d = (uv - c) * vec2(aspect, 1.0);
    d.x = d.x - aspect * floor(d.x / aspect + 0.5);
    float r = (0.02 + 0.055 * h3 * h3) * portrait;
    float dist = length(d);
    float disc = smoothstep(r, r * 0.8, dist) * (0.82 + 0.18 * smoothstep(r * 0.3, r * 0.95, dist));
    float halo = exp(-pow(dist / (r * 2.2), 2.0)) * 0.35;
    float twinkle = 0.6 + 0.4 * sin(t * (0.4 + 0.6 * h1) + fi * 2.3);
    vec3 bc = h2 < 0.35 ? vec3(1.0, 0.84, 0.58)
            : h2 < 0.6 ? vec3(1.0, 0.76, 0.64)
            : h2 < 0.85 ? vec3(1.0, 0.97, 0.9)
            : vec3(0.98, 0.72, 0.72);
    float shown = step(hash(vec2(fi, 2.9)), 0.35 + 0.65 * portrait);
    float a = (disc * 0.75 + halo) * twinkle * (0.95 - 0.35 * h3) * shown;
    col = mix(col, bc, clamp(a, 0.0, 0.7));
  }

  // Low haze drifting along the horizon
  float haze = fbm(vec2(x * 2.0 - drift * 2.0, uv.y * 5.0 + t * 0.02));
  // Haze disabled with the snowfield
  //   col = mix(col, vec3(0.99, 0.97, 0.96), smoothstep(0.45, 0.27, uv.y) * smoothstep(0.15, 0.27, uv.y) * haze * 0.6);

  // Snowfield: bright horizon, cool shaded drifts toward the front
  float horizon = 0.26 + 0.012 * sin(x * 2.4 + 1.3) + 0.008 * sin(x * 5.1);
  float ground = smoothstep(horizon + 0.003, horizon - 0.003, uv.y);
  float depth = clamp((horizon - uv.y) / horizon, 0.0, 1.0);
  float ridge = sin(x * 2.2 - uv.y * 22.0 + 3.0 * fbm(vec2(x * 1.5, uv.y * 4.0)));
  vec3 snow = mix(vec3(0.97, 0.965, 0.97), vec3(0.95, 0.96, 0.98), smoothstep(0.0, 1.0, depth));
  snow += vec3(0.025) * smoothstep(0.5, 1.0, ridge) * (1.0 - depth * 0.5);
  snow -= vec3(0.01, 0.008, 0.003) * smoothstep(0.2, -0.6, ridge) * depth;
  // Snowfield disabled: the sky fades to warm white instead
  col = mix(col, vec3(0.995, 0.985, 0.975), smoothstep(0.35, 0.0, uv.y));

  gl_FragColor = vec4(col, 1.0);
}
`;

function createSky(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  });
  if (!gl) return null;

  const shader = (type: number, src: string) => {
    const s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = shader(gl.VERTEX_SHADER, VERTEX);
  const fs = shader(gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(program, "uRes");
  const uTime = gl.getUniformLocation(program, "uTime");
  const uWind = gl.getUniformLocation(program, "uWind");

  let lost = false;
  const onLost = (e: Event) => {
    e.preventDefault();
    lost = true;
  };
  canvas.addEventListener("webglcontextlost", onLost);

  return {
    resize(w: number, h: number) {
      canvas.width = Math.max(1, Math.round(w * SKY_SCALE));
      canvas.height = Math.max(1, Math.round(h * SKY_SCALE));
      if (lost) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    },
    draw(time: number, wind: number) {
      if (lost) return;
      gl.uniform1f(uTime, time);
      gl.uniform1f(uWind, wind);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      canvas.removeEventListener("webglcontextlost", onLost);
      if (lost) return;
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      // The context itself is kept: React may mount this canvas again
      // (Strict Mode in development), and a lost context cannot be reused.
    },
  };
}
