"use client";
import React, { useEffect, useRef, useState } from "react";
import { Silkscreen } from "next/font/google";
import { useRouter } from "next/navigation";

const pixel = Silkscreen({ subsets: ["latin"], weight: "400" });

/** ========== ASSETS (ajusta a tus archivos) ========== */
const ASSETS = {
  bg: "/images/bggame.png",
  player: "/images/piskel3.png",
  car: "/images/car.png",
  goblin: "/images/greengoblin.png",
  mary: "/images/happymj.png",
  mary2: "/images/sadmj.png", // 👈 chica del modal
  btnPlay: "/images/playbt.png",       // 👈 botón verde “PLAY”
  btnExit: "/images/exitbt.png",       // 👈 botón rojo “EXIT”
};

/** ========== CONSTANTES ========== */
const VIEW = { width: 960, height: 540 };
const GROUND_H = 110;
const PLAYER = { w: 70, h: 70, x: 160 };
const PHYS = { gravity: 2200, jumpV: 900, baseSpeed: 360, maxFall: 1800 };

type Rect = { x: number; y: number; w: number; h: number };
type Obstacle = Rect & { kind: "car" | "goblin"; scored?: boolean };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const aabb = (A: Rect, B: Rect) =>
  A.x < B.x + B.w && A.x + A.w > B.x && A.y < B.y + B.h && A.y + A.h > B.y;

export default function Platformer() {
  const router = useRouter();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const [loaded, setLoaded] = useState(false);
  const [started, setStarted] = useState(false); // 👈 modal Start
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [high, setHigh] = useState(0);

  const images = useRef<{
    bg?: HTMLImageElement;
    player?: HTMLImageElement;
    car?: HTMLImageElement;
    goblin?: HTMLImageElement;
  }>({});

  const keys = useRef<Record<string, boolean>>({});
  const player = useRef({
    x: PLAYER.x,
    y: VIEW.height - GROUND_H - PLAYER.h,
    vy: 0,
    onGround: true,
  });

  const anim = useRef({ frame: 0, timer: 0, speedMs: 110 });
  const speed = useRef(PHYS.baseSpeed);
  const scroll = useRef(0);
  const obstacles = useRef<Obstacle[]>([]);
  const nextSpawnXRef = useRef(0);
  const frameRef = useRef({ w: 32, h: 32, total: 4 });

  /** ====== CARGA ====== */
  useEffect(() => {
    let alive = true;
    const load = (src: string) =>
      new Promise<HTMLImageElement>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(new Image());
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

      if (playerPng && playerPng.height > 0) {
        const frames = 4;
        const fh = Math.floor(playerPng.height / frames);
        const fw = playerPng.width;
        frameRef.current = { w: fw, h: fh, total: frames };
      }
      images.current = { bg, player: playerPng, car, goblin };
      setLoaded(true);
      setStarted(false); // mostrar modal de inicio al cargar
    })();

    return () => {
      alive = false;
    };
  }, []);

  /** ====== INPUT ====== */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keys.current[key] = true;

      // Evita scroll
      if ([" ", "space", "arrowup", "w"].includes(key)) e.preventDefault();

      // Start rápido con Space/Enter
      if (!started && [" ", "enter"].includes(key)) {
        setStarted(true);
        return;
      }

      // Restart rápido
      if (gameOver && (key === " " || key === "r" || key === "enter")) {
        handleRestart();
      }
    };
    const up = (e: KeyboardEvent) => (keys.current[e.key.toLowerCase()] = false);

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [started, gameOver]);
// 1) crea una ref y mantenla actualizada
const updateRef = useRef(update);
updateRef.current = update;

// 2) dentro del useEffect del loop, usa la ref
useEffect(() => {
  if (!loaded) return;
  const ctx = canvasRef.current?.getContext("2d");
  if (!ctx) return;

  // Hi-DPI...
  const dpr = window.devicePixelRatio || 1;
  const cw = VIEW.width, ch = VIEW.height;
  const canvas = canvasRef.current!;
  canvas.width = Math.round(cw * dpr);
  canvas.height = Math.round(ch * dpr);
  canvas.style.width = cw + "px";
  canvas.style.height = ch + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false; // ✅ sin any

  let last = performance.now();
  const step = (now: number) => {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    if (!gameOver && started) updateRef.current(dt); // ✅ usa ref
    render(ctx);
    rafRef.current = requestAnimationFrame(step);
  };
  rafRef.current = requestAnimationFrame(step);

  return () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };
  // 👇 ya NO necesita 'update'
}, [loaded, started, gameOver]);

  /** ====== UPDATE ====== */
  function update(dt: number) {
    speed.current = Math.min(speed.current + 12 * dt, 800);

    const p = player.current;
    const wantJump =
      keys.current[" "] ||
      keys.current["space"] ||
      keys.current["arrowup"] ||
      keys.current["w"];
    if (wantJump && p.onGround) {
      p.vy = -PHYS.jumpV;
      p.onGround = false;
    }

    p.vy = clamp(p.vy + PHYS.gravity * dt, -PHYS.maxFall, PHYS.maxFall);
    let ny = p.y + p.vy * dt;
    const groundY = VIEW.height - GROUND_H - PLAYER.h;
    if (ny >= groundY) {
      ny = groundY;
      p.vy = 0;
      p.onGround = true;
    }
    p.y = ny;

    scroll.current += speed.current * dt;

    // Spawn distanciado
    if (nextSpawnXRef.current === 0)
      nextSpawnXRef.current = scroll.current + VIEW.width + 400;
    if (scroll.current >= nextSpawnXRef.current) {
      const kind: Obstacle["kind"] = Math.random() < 0.7 ? "car" : "goblin";
      let img: HTMLImageElement | undefined;
      let targetH = 72;
      let yWorld: number;

      if (kind === "car") {
        img = images.current.car;
        targetH = 50;
        yWorld = VIEW.height - GROUND_H - targetH + 6;
      } else {
        img = images.current.goblin;
        targetH = 58;
        yWorld = VIEW.height - GROUND_H - targetH + 4;
      }

      const ratio = img && img.height ? img.width / img.height : 2.0;
      const h = targetH,
        w = Math.round(targetH * ratio);
      const xWorld = scroll.current + VIEW.width + 30;
      obstacles.current.push({ x: xWorld, y: yWorld, w, h, kind, scored: false });

      const minGap = 420 + Math.floor(speed.current * 0.55);
      const extra = 220 + Math.random() * 260;
      nextSpawnXRef.current = xWorld + minGap + extra;
    }

    // Puntuar +10 por obstáculo rebasado
    const playerWorldX = p.x + scroll.current;
    for (const o of obstacles.current) {
      if (!o.scored && o.x + o.w < playerWorldX) {
        o.scored = true;
        setScore((prev) => {
          const next = prev + 10;
          setHigh((h) => Math.max(h, next));
          return next;
        });
      }
    }

    // limpiar + colisión
    const camLeft = scroll.current;
    obstacles.current = obstacles.current.filter((o) => o.x - camLeft > -120);

    const playerWorld: Rect = {
      x: p.x + camLeft,
      y: p.y,
      w: PLAYER.w,
      h: PLAYER.h,
    };
    for (const o of obstacles.current) {
      if (aabb(playerWorld, o)) {
        setHigh((h) => Math.max(h, score));
        setGameOver(true);
        break;
      }
    }

    // animación
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
    ctx.clearRect(0, 0, VIEW.width, VIEW.height);

    // Backdrop parallax (tile infinito)
    const bg = images.current.bg;
    if (bg && bg.width) {
      const targetH = VIEW.height - GROUND_H;
      const scale = Math.max(targetH / bg.height, VIEW.width / bg.width); // cover
      const w = Math.floor(bg.width * scale);
      const h = Math.floor(bg.height * scale);
      const y = VIEW.height - GROUND_H - h;

      const parallax = 0.1;
      let xShift = -Math.floor((scroll.current * parallax) % w);
      if (xShift > 0) xShift -= w;
      for (let x = xShift; x < VIEW.width; x += w) {
        ctx.drawImage(bg, x, y, w, h);
      }
    }

    // Suelo
    ctx.fillStyle = "#292f39";
    ctx.fillRect(0, VIEW.height - GROUND_H, VIEW.width, GROUND_H);
    ctx.fillStyle = "#2c1a4b";
    ctx.fillRect(0, VIEW.height - GROUND_H - 14, VIEW.width, 14);

    // Obstáculos
    const camLeft = scroll.current;
    for (const o of obstacles.current) {
      const vx = Math.round(o.x - camLeft),
        vy = Math.round(o.y);
      const img = o.kind === "car" ? images.current.car : images.current.goblin;
      if (img && img.width) ctx.drawImage(img, vx, vy, o.w, o.h);
    }

    // Player
    const p = player.current,
      spr = images.current.player;
    if (spr && spr.width) {
      const fw = frameRef.current.w,
        fh = frameRef.current.h,
        sy = anim.current.frame * fh;
      ctx.drawImage(spr, 0, sy, fw, fh, p.x, p.y, PLAYER.w, PLAYER.h);
    }

    // HUD arcade (opcional visible aunque esté pausado)
    ctx.fillStyle = "#fff";
    ctx.font = "12px 'Silkscreen', monospace";
    ctx.fillText("Space/W/↑ to jump", 16, 68);
  }

  /** ====== Restart ====== */
  function handleRestart() {
    setGameOver(false);
    setScore(0);
    speed.current = PHYS.baseSpeed;
    scroll.current = 0;
    obstacles.current = [];
    nextSpawnXRef.current = 0;
    player.current = {
      x: PLAYER.x,
      y: VIEW.height - GROUND_H - PLAYER.h,
      vy: 0,
      onGround: true,
    };
    anim.current = { frame: 0, timer: 0, speedMs: 110 };
    setStarted(true); // vuelve a correr (si quieres mostrar de nuevo Start, pon setStarted(false))
  }

  /** ====== Handlers de modals ====== */
  const startGame = () => setStarted(true);
  const exitToMain = () => {
    router.push("/?main=1");
  };

  return (
    <div className={`min-h-screen bg-[#2b124c] ${pixel.className}`}>
      <header className="max-w-5xl mx-auto px-4 pt-8 pb-4">
        <h1 className="text-center text-white text-3xl font-extrabold tracking-wide drop-shadow" style={{ paddingTop: '90px' }}  >
          Jose&apos;s Adventures as Spiderman
        </h1>
      </header>

      <main className="px-4 pb-16">
        <div className="max-w-5xl mx-auto">
          {/* Ventana */}
          <div className="rounded-2xl bg-[#0b0b0cc0] border border-white/10 shadow-2xl backdrop-blur p-4">
            {/* Barra superior tipo ventana */}
            <div className="flex items-center justify-between px-3 py-2 mb-2 rounded-xl bg-[#181126]/70 border border-white/10">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-red-500/80"></span>
                <span className="size-3 rounded-full bg-yellow-500/80"></span>
                <span className="size-3 rounded-full bg-green-500/80"></span>
              </div>
              <span className="text-sm text-white/80 font-medium tracking-wide">
              
              </span>
              <div className="w-14" />
            </div>

            {/* Canvas centrado */}
            <div className="flex justify-center">
              <canvas
                ref={canvasRef}
                width={VIEW.width}
                height={VIEW.height}
                className="w-[min(100%,960px)] h-auto rounded-xl overflow-hidden shadow-lg"
                style={{ background: "transparent" }}
              />
            </div>
          </div>
        </div>
      </main>

      {/* ====== MODAL START ====== */}
      {!started && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
          <div className="relative w-[min(92vw,760px)] rounded-2xl border-4 border-[#2c1a4b] bg-[#b28bd6] shadow-[0_8px_0_#2c1a4b]">
            {/* barra superior */}
            <div className="flex items-center justify-end gap-2 px-4 py-2 border-b-4 border-[#2c1a4b]">
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded bg-white/80 grid place-items-center text-[#2c1a4b]">–</div>
                <div className="w-6 h-6 rounded bg-white/80 grid place-items-center text-[#2c1a4b]">▢</div>
                <div className="w-6 h-6 rounded bg-white/80 grid place-items-center text-[#2c1a4b]">x</div>
              </div>
            </div>

            {/* contenido */}
            <div className="grid grid-cols-[1fr_auto] gap-6 bg-[#f3e4fd] p-6 md:p-8 rounded-b-xl">
              <p className="text-[#2c1a4b] leading-7 md:leading-8 text-base md:text-lg">
                Since you want to be Spiderman so bad press space/W/⬆  to jump and avoid the obstacles to save Mary Jane (aka yo porque las dos somos pelirrojas)
                from the green goblin.
              </p>
              
               <img
                src={ASSETS.mary}
                alt="Mary Jane"
                className="h-[150px] image-pixelated select-none mx-auto col-span-2"
                draggable={false}
              />

              <div className="col-span-2 mt-4 flex items-center justify-center gap-8">
                <img
                  src={ASSETS.btnPlay}
                  alt="PLAY AGAIN"
                  className="h-16 md:h-20 cursor-pointer select-none image-pixelated"
                  onClick={handleRestart}
                  draggable={false}
                />
                <img
                  src={ASSETS.btnExit}
                  alt="EXIT"
                  className="h-16 md:h-20 cursor-pointer select-none image-pixelated"
                  onClick={exitToMain}
                  draggable={false}
                />
              
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== MODAL GAME OVER ====== */}
      {gameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="relative w-[min(92vw,760px)] rounded-2xl border-4 border-[#2c1a4b] bg-[#b28bd6] shadow-[0_8px_0_#2c1a4b]">
            <div className="flex items-center justify-end gap-2 px-4 py-2 border-b-4 border-[#2c1a4b]">
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded bg-white/80 grid place-items-center text-[#2c1a4b]">–</div>
                <div className="w-6 h-6 rounded bg-white/80 grid place-items-center text-[#2c1a4b]">▢</div>
                <div className="w-6 h-6 rounded bg-white/80 grid place-items-center text-[#2c1a4b]">x</div>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-6 bg-[#f3e4fd] p-6 md:p-8 rounded-b-xl">
              <div className="text-center col-span-2">
                <h2 className="text-2xl mb-1 text-[#2c1a4b]">GAME OVER</h2>
                <p className="text-[#2c1a4b] mb-4">Score: {score}</p>
              </div>

              <img
                src={ASSETS.mary2}
                alt="Mary Jane"
                className="h-[150px] image-pixelated select-none mx-auto col-span-2"
                draggable={false}
              />

              <div className="col-span-2 mt-4 flex items-center justify-center gap-8">
                <img
                  src={ASSETS.btnPlay}
                  alt="PLAY AGAIN"
                  className="h-16 md:h-20 cursor-pointer select-none image-pixelated"
                  onClick={handleRestart}
                  draggable={false}
                />
                <img
                  src={ASSETS.btnExit}
                  alt="EXIT"
                  className="h-16 md:h-20 cursor-pointer select-none image-pixelated"
                  onClick={exitToMain}
                  draggable={false}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* util: nitidez pixel art para <img> */}
      <style jsx global>{`
        .image-pixelated {
          image-rendering: pixelated;
          image-rendering: crisp-edges;
        }
      `}</style>
    </div>
  );
}
