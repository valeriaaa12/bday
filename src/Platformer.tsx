"use client";
import React, { useEffect, useRef, useState } from "react";

/** ========== ASSETS en /public/images ========== */
const ASSETS = {
  bg: "/images/bggame.png",         // fondo ciudad (lo usamos por CSS)
  player: "/images/piskel3.png",    // spritesheet vertical (4 frames)
  car: "/images/car.png",           // obstáculo 1
  goblin: "/images/greengoblin.png" // obstáculo 2
};

/** ========== CONSTANTES ========== */
const VIEW = { width: 960, height: 540 };
const GROUND_H = 110; // altura del suelo visible
const PLAYER = { w: 70, h: 70, x: 160 }; // tamaño en pantalla del jugador

const PHYS = {
  gravity: 2200,
  jumpV: 900,
  baseSpeed: 360,   // velocidad inicial del mundo
  maxFall: 1800,
};

type Rect = { x: number; y: number; w: number; h: number };
type Obstacle = Rect & { kind: "car" | "goblin"; scored?: boolean };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const aabb = (A: Rect, B: Rect) =>
  A.x < B.x + B.w && A.x + A.w > B.x && A.y < B.y + B.h && A.y + A.h > B.y;

export default function Platformer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const [loaded, setLoaded] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [high, setHigh] = useState(0);

  // imágenes
  const images = useRef<{
    bg?: HTMLImageElement;
    player?: HTMLImageElement;
    car?: HTMLImageElement;
    goblin?: HTMLImageElement;
  }>({});

  // input
  const keys = useRef<Record<string, boolean>>({});

  // jugador
  const player = useRef({
    x: PLAYER.x,
    y: VIEW.height - GROUND_H - PLAYER.h,
    vy: 0,
    onGround: true,
  });

  // animación del spritesheet vertical
  const anim = useRef({ frame: 0, timer: 0, speedMs: 110 });

  // mundo
  const speed = useRef(PHYS.baseSpeed); // irá aumentando
  const scroll = useRef(0);
  const obstacles = useRef<Obstacle[]>([]);
  const spawnTimer = useRef(0);
// genera el próximo obstáculo cuando el mundo haya avanzado hasta esta X
const nextSpawnXRef = useRef(0);

  // Detecta tamaño real de cada frame del spritesheet vertical
  const frameRef = useRef({ w: 32, h: 32, total: 4 });

  /** ====== CARGA de imágenes ====== */
  useEffect(() => {
    let alive = true;
    const load = (src: string) =>
      new Promise<HTMLImageElement>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => {
          console.warn("No se pudo cargar:", src);
          resolve(new Image());
        };
        img.src = src;
      });

    (async () => {
      const [bg, playerPng, car, goblin] = await Promise.all([
        load(ASSETS.bg),
        load(ASSETS.player),
        load(ASSETS.car),
        load(ASSETS.goblin),
      ]);
      if (!alive) return;

      // Auto-detect del tamaño de frame (4 frames verticales)
      if (playerPng && playerPng.height > 0) {
        const frames = 4;
        const fh = Math.floor(playerPng.height / frames);
        const fw = playerPng.width; // una columna
        frameRef.current = { w: fw, h: fh, total: frames };
      }

      images.current = { bg, player: playerPng, car, goblin };
      setLoaded(true);
    })();

    return () => { alive = false; };
  }, []);

  /** ====== INPUT ====== */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
      if ([" ", "space", "arrowup", "w"].includes(e.key.toLowerCase())) e.preventDefault();
      // restart rápido desde Game Over
      if (gameOver && (e.key === " " || e.key.toLowerCase() === "r")) handleRestart();
    };
    const up = (e: KeyboardEvent) => (keys.current[e.key.toLowerCase()] = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [gameOver]);

  /** ====== LOOP ====== */
  useEffect(() => {
    if (!loaded) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      if (!gameOver) update(dt);
      render(ctx);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
  }, [loaded, gameOver]);

  /** ====== UPDATE ====== */
  function update(dt: number) {
    // puntuación + velocidad creciente

    speed.current = Math.min(speed.current + 12 * dt, 800); // acelera suavemente

    // salto
    const p = player.current;
    const wantJump =
      keys.current[" "] || keys.current["space"] || keys.current["arrowup"] || keys.current["w"];
    if (wantJump && p.onGround) {
      p.vy = -PHYS.jumpV;
      p.onGround = false;
    }

    // física vertical
    p.vy = clamp(p.vy + PHYS.gravity * dt, -PHYS.maxFall, PHYS.maxFall);
    let ny = p.y + p.vy * dt;
    const groundY = VIEW.height - GROUND_H - PLAYER.h;
    if (ny >= groundY) {
      ny = groundY;
      p.vy = 0;
      p.onGround = true;
    }
    p.y = ny;
    // ======= Puntuar al rebasar obstáculos =======
const playerWorldX = p.x + scroll.current; // X del jugador en coordenadas de mundo
for (const o of obstacles.current) {
  // cuando el borde derecho del obstáculo ya quedó detrás del jugador
  if (!o.scored && (o.x + o.w) < playerWorldX) {
    o.scored = true;
    setScore((prev) => {
      const next = prev + 10;
      setHigh((h) => Math.max(h, next)); // actualiza "Best"
      return next;
    });
  }
}

    // desplazar mundo
    scroll.current += speed.current * dt;

    // ==== SPAWN con separación mínima por distancia =========================
// si es la primera vez, agenda el primer spawn un poco adelante
if (nextSpawnXRef.current === 0) {
  nextSpawnXRef.current = scroll.current + VIEW.width + 400;
}

// cuando el mundo (scroll) haya llegado al “punto de spawn”, crea obstáculo
if (scroll.current >= nextSpawnXRef.current) {
  // 70% car, 30% goblin (ajusta el peso a tu gusto)
  const kind: Obstacle["kind"] = Math.random() < 0.7 ? "car" : "goblin";

  // tamaño y posición
  let img: HTMLImageElement | undefined;
  let targetH = 72;
  let yWorld: number;

  if (kind === "car") {
    img = images.current.car;
    targetH = 50   ;
    yWorld = VIEW.height - GROUND_H - targetH + 6;
  } else {
    img = images.current.goblin;
    targetH = 58;
    yWorld = VIEW.height - GROUND_H - targetH + 4;
  }

  const ratio = img && img.height ? img.width / img.height : 2.0;
  const h = targetH;
  const w = Math.round(targetH * ratio);

  const xWorld = scroll.current + VIEW.width + 30;
  obstacles.current.push({ x: xWorld, y: yWorld, w, h, kind, scored: false });


  // === agenda el siguiente spawn con separación mínima ===
  // cuanto más rápido, más grande la separación para dar tiempo de reacción
  const minGap = 420 + Math.floor(speed.current * 0.55); // px
  const extra   = 220 + Math.random() * 260;             // aleatorio
  const gap     = minGap + extra;

  nextSpawnXRef.current = xWorld + gap;
}



    // limpiar obstáculos fuera de pantalla
    const camLeft = scroll.current;
    obstacles.current = obstacles.current.filter((o) => o.x - camLeft > -120);

    // colisión
    const playerWorld: Rect = { x: p.x + camLeft, y: p.y, w: PLAYER.w, h: PLAYER.h };
    for (const o of obstacles.current) {
      if (aabb(playerWorld, o)) {
        setHigh((h) => Math.max(h, score));
        setGameOver(true);
        break;
      }
    }

    // animación: en aire -> 3; en suelo -> alterna 1↔2
    if (!p.onGround) {
      anim.current.frame = 3;
      anim.current.timer = 0;
    } else {
      anim.current.timer += dt * 1000;
      if (anim.current.timer > anim.current.speedMs) {
        anim.current.frame = anim.current.frame === 1 ? 2 : 1;
        anim.current.timer = 0;
      }
    }
  }

  /** ====== RENDER ====== */
  function render(ctx: CanvasRenderingContext2D) {
    // Canvas transparente: solo limpiamos
    (ctx as any).imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, VIEW.width, VIEW.height);

    // ===== Suelo (se dibuja sobre el fondo CSS) =====
    ctx.fillStyle = "#292f39";
    ctx.fillRect(0, VIEW.height - GROUND_H, VIEW.width, GROUND_H);
    ctx.fillStyle = "#2c1a4b";
    ctx.fillRect(0, VIEW.height - GROUND_H - 14, VIEW.width, 14);

    // ===== Obstáculos =====
    const camLeft = scroll.current;
    for (const o of obstacles.current) {
      const vx = Math.round(o.x - camLeft);
      const vy = Math.round(o.y);

      let img: HTMLImageElement | undefined =
        o.kind === "car" ? images.current.car : images.current.goblin;

      if (img && img.width) {
        ctx.drawImage(img, vx, vy, o.w, o.h);
      } else {
        ctx.fillStyle = o.kind === "car" ? "#e23d3d" : "#5cd35c";
        ctx.fillRect(vx, vy, o.w, o.h);
      }
    }

    // ===== Jugador (spritesheet vertical auto-detect) =====
    const p = player.current;
    const spr = images.current.player;
    if (spr && spr.width) {
      const fw = frameRef.current.w;  // p.ej. 140
      const fh = frameRef.current.h;  // p.ej. 140
      const sy = anim.current.frame * fh;

      // tamaño en pantalla (escalado a gusto)
      const destW = PLAYER.w;
      const destH = PLAYER.h;

      ctx.drawImage(spr, 0, sy, fw, fh, p.x, p.y, destW, destH);
    } else {
      ctx.fillStyle = "#333"; ctx.fillRect(p.x, p.y, PLAYER.w, PLAYER.h);
    }

    // ===== HUD =====
    ctx.fillStyle = "#fff";
    ctx.font = "16px ui-sans-serif, system-ui";
    ctx.fillText("Space/W/↑ to jump", 16, 68);
  }

  /** ====== Restart desde el modal ====== */
  function handleRestart() {
    setGameOver(false);
    setScore(0);
    speed.current = PHYS.baseSpeed;
    scroll.current = 0;
    obstacles.current = [];
    spawnTimer.current = 0;
    player.current = {
      x: PLAYER.x,
      y: VIEW.height - GROUND_H - PLAYER.h,
      vy: 0,
      onGround: true,
    };
    anim.current = { frame: 0, timer: 0, speedMs: 110 };
  }

  return (
    <div className="w-full flex flex-col items-center gap-3 p-4">
      <h1 className="text-2xl font-bold text-white">Endless Runner</h1>

      {/* Contenedor con FONDO FIJO por CSS */}
      <div
        className="relative rounded-2xl shadow-xl overflow-hidden border border-white/10"
        style={{
          backgroundImage: "url('/images/bggame.png')",
          backgroundPosition: "center bottom",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
        }}
      >
        <canvas
          ref={canvasRef}
          width={VIEW.width}
          height={VIEW.height}
          className="block w-[min(96vw,960px)] h-auto"
          style={{ background: "transparent" }}
        />

        {!loaded && (
          <div className="absolute inset-0 grid place-items-center bg-black/40 backdrop-blur-sm">
            <div className="px-4 py-2 rounded-xl bg-white/90 text-gray-800 shadow">
              Loading PNGs…
            </div>
          </div>
        )}

        {/* ===== Modal Game Over ===== */}
        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="rounded-2xl bg-white px-6 py-5 text-center max-w-sm shadow-2xl">
              <h2 className="text-2xl font-bold mb-2">Game Over</h2>
              <p className="mb-1">Score: <b>{score}</b></p>
              <button
                onClick={handleRestart}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
              >
                Restart
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        body { background:#0b0b0c; }
      `}</style>
    </div>
  );
}
