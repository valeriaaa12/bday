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
  mary2: "/images/sadmj.png",
  btnPlay: "/images/playbt.png",
  btnExit: "/images/exitbt.png",
};

/** ========== CONSTANTES ========== */
const VIEW = { width: 960, height: 540 };
const GROUND_H = 110;
const PLAYER = { w: 70, h: 70, x: 160 };
const PHYS = { gravity: 2200, jumpV: 900, baseSpeed: 370, maxFall: 1800 };

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
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [, setHigh] = useState(0);

  const images = useRef<{ bg?: HTMLImageElement; player?: HTMLImageElement; car?: HTMLImageElement; goblin?: HTMLImageElement; }>({});
  const keys = useRef<Record<string, boolean>>({});
  const player = useRef({ x: PLAYER.x, y: VIEW.height - GROUND_H - PLAYER.h, vy: 0, onGround: true });

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
      setStarted(false); // mostrar modal de inicio
    })();

    return () => { alive = false; };
  }, []);

 function getDifficulty(score: number) {
  const level = Math.floor(score / 40); // sube de nivel cada 40 pts

  // Velocidad
  const accel = 12 + level * 2;
  const maxSpeed = Math.min(1400, 800 + level * 60);

  // Frecuencia (distancias entre grupos)
  const minGapBase = Math.max(180, 420 - level * 22);
  const extraRange  = Math.max(80, 260 - level * 12);
  const spawnLead   = Math.max(140, 400 - level * 16);

  // Separación mínima segura en función de la velocidad
  const speedGapFactor = 0.35 + level * 0.035;

  // Tamaño del grupo (cuántos por ráfaga)
  const groupMin = 1;
  const groupMax = Math.min(4, 2 + Math.floor(level / 2)); // 1–4 según nivel

  // Gap entre obstáculos del mismo grupo
  const intraGapBase = Math.max(140, 260 - level * 15); // base “saltable”
  const intraGapRand = Math.max(40, 120 - level * 8);   // variación
  const intraSpeedFactor = 0.12; // agrega un pelín con la velocidad

  // Control de saturación en pantalla
  const maxActive = Math.min(10, 4 + level); // límite superior

  return {
    level, accel, maxSpeed,
    minGapBase, extraRange, spawnLead, speedGapFactor,
    groupMin, groupMax, intraGapBase, intraGapRand, intraSpeedFactor,
    maxActive
  };
}


  /** ====== INPUT ====== */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keys.current[key] = true;

      if ([" ", "space", "arrowup", "w"].includes(key)) e.preventDefault();

      if (!started && [" ", "enter"].includes(key)) {
        setStarted(true);
        return;
      }
      if (gameOver && (key === " " || key === "r" || key === "enter")) handleRestart();
    };
    const up = (e: KeyboardEvent) => (keys.current[e.key.toLowerCase()] = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [started, gameOver]);

  // mantener update estable sin dependencia en effect
  const updateRef = useRef(update);
  updateRef.current = update;

  /** ====== LOOP ====== */
  useEffect(() => {
    if (!loaded) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cw = VIEW.width, ch = VIEW.height;
    const canvas = canvasRef.current!;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    canvas.style.width = cw + "px";
    canvas.style.height = ch + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    (ctx as CanvasRenderingContext2D).imageSmoothingEnabled = false;

    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      if (!gameOver && started) updateRef.current(dt);
      render(ctx);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);

    return () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  }, [loaded, started, gameOver]);

  /** ====== UPDATE ====== */
  function update(dt: number) {
    const D = getDifficulty(score);
    speed.current = Math.min(speed.current + D.accel * dt, D.maxSpeed);


    const p = player.current;
    const wantJump = keys.current[" "] || keys.current["space"] || keys.current["arrowup"] || keys.current["w"];
    if (wantJump && p.onGround) { p.vy = -PHYS.jumpV; p.onGround = false; }

    p.vy = clamp(p.vy + PHYS.gravity * dt, -PHYS.maxFall, PHYS.maxFall);
    let ny = p.y + p.vy * dt;
    const groundY = VIEW.height - GROUND_H - PLAYER.h;
    if (ny >= groundY) { ny = groundY; p.vy = 0; p.onGround = true; }
    p.y = ny;

    scroll.current += speed.current * dt;

    // Spawn distanciado
// ===== Spawning por ráfagas (grupos), con separación segura =====
if (nextSpawnXRef.current === 0) {
  nextSpawnXRef.current = scroll.current + VIEW.width + 400;
}

if (scroll.current >= nextSpawnXRef.current) {
  const camLeft = scroll.current;
  const camRight = camLeft + VIEW.width;

  // 1) Cuenta de obstáculos activos (en cámara o un poco adelante)
  const active = obstacles.current.filter(o => (o.x + o.w) > camLeft && o.x < camRight + 800).length;
  const canSpawn = Math.max(0, D.maxActive - active);
  if (canSpawn <= 0) {
    // Reprograma un poco más adelante si está saturado
    nextSpawnXRef.current = camRight + 200;
  } else {
    // 2) Punto base por delante de la cámara
    const baseSpawnX = scroll.current + VIEW.width + D.spawnLead;

    // 3) Ultimo obstáculo (el de mayor X)
    const last = obstacles.current.length
      ? obstacles.current.reduce((a, b) => (a.x > b.x ? a : b))
      : undefined;

    // 4) Gap mínimo absoluto respecto al último, para NO solapar grupos
    const minWorldGap =
      (last ? last.w : 0) +
      D.minGapBase +
      speed.current * D.speedGapFactor;

    // 5) Primer X seguro del grupo
    let curX = last ? Math.max(baseSpawnX, last.x + minWorldGap) : baseSpawnX;

    // 6) Cuántos vamos a spawnear en ESTE grupo
    const want = Math.floor(Math.random() * (D.groupMax - D.groupMin + 1)) + D.groupMin;
    const count = Math.max(1, Math.min(canSpawn, want));

    for (let k = 0; k < count; k++) {
      // Decide el tipo
      const kind: Obstacle["kind"] = Math.random() < 0.6 ? "car" : "goblin";

      // Dimensiones y Y
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
      const h = targetH;
      const w = Math.round(targetH * ratio);

      // Inserta obstáculo k en X segura actual
      obstacles.current.push({ x: curX, y: yWorld, w, h, kind, scored: false });

      // Calcula la separación mínima para el SIGUIENTE del grupo
      const intraGap =
        D.intraGapBase +
        Math.random() * D.intraGapRand +
        speed.current * D.intraSpeedFactor;

      // El siguiente X del grupo debe estar detrás del "curX + w + intraGap"
      curX = curX + w + intraGap;
    }

    // 7) Programa la próxima ráfaga (grupo siguiente)
    const gapHastaSiguienteGrupo =
      D.minGapBase + Math.random() * D.extraRange + speed.current * 0.18;
    nextSpawnXRef.current = curX + gapHastaSiguienteGrupo;
  }
}


    // Puntuar
    const playerWorldX = p.x + scroll.current;
    for (const o of obstacles.current) {
      if (!o.scored && (o.x + o.w) < playerWorldX) {
        o.scored = true;
        setScore(prev => { const next = prev + 10; setHigh(h => Math.max(h, next)); return next; });
      }
    }

    // limpiar + colisión
    const camLeft = scroll.current;
    obstacles.current = obstacles.current.filter(o => o.x - camLeft > -120);

    const playerWorld: Rect = { x: p.x + camLeft, y: p.y, w: PLAYER.w, h: PLAYER.h };
    for (const o of obstacles.current) {
      if (aabb(playerWorld, o)) { setHigh(h => Math.max(h, score)); setGameOver(true); break; }
    }

    // animación
    if (!p.onGround) { anim.current.frame = 3; anim.current.timer = 0; }
    else { anim.current.timer += dt * 1000; if (anim.current.timer > anim.current.speedMs) { anim.current.frame = anim.current.frame === 1 ? 2 : 1; anim.current.timer = 0; } }
  }

  /** ====== RENDER ====== */
  function render(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, VIEW.width, VIEW.height);

    // Fondo parallax
    const bg = images.current.bg;
    if (bg && bg.width) {
      const targetH = VIEW.height - GROUND_H;
      const scale = Math.max(targetH / bg.height, VIEW.width / bg.width);
      const w = Math.floor(bg.width * scale);
      const h = Math.floor(bg.height * scale);
      const y = VIEW.height - GROUND_H - h;
      const parallax = 0.1;
      let xShift = -Math.floor((scroll.current * parallax) % w);
      if (xShift > 0) xShift -= w;
      for (let x = xShift; x < VIEW.width; x += w) ctx.drawImage(bg, x, y, w, h);
    }

    // Suelo
    ctx.fillStyle = "#292f39"; ctx.fillRect(0, VIEW.height - GROUND_H, VIEW.width, GROUND_H);
    ctx.fillStyle = "#2c1a4b"; ctx.fillRect(0, VIEW.height - GROUND_H - 14, VIEW.width, 14);

    // Obstáculos
    const camLeft = scroll.current;
    for (const o of obstacles.current) {
      const vx = Math.round(o.x - camLeft), vy = Math.round(o.y);
      const img = o.kind === "car" ? images.current.car : images.current.goblin;
      if (img && img.width) ctx.drawImage(img, vx, vy, o.w, o.h);
    }

    // Player
    const p = player.current, spr = images.current.player;
    if (spr && spr.width) {
      const fw = frameRef.current.w, fh = frameRef.current.h, sy = anim.current.frame * fh;
      ctx.drawImage(spr, 0, sy, fw, fh, p.x, p.y, PLAYER.w, PLAYER.h);
    }

    // HUD
    ctx.fillStyle = "#fff"; ctx.font = "12px 'Silkscreen', monospace";
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
    player.current = { x: PLAYER.x, y: VIEW.height - GROUND_H - PLAYER.h, vy: 0, onGround: true };
    anim.current = { frame: 0, timer: 0, speedMs: 110 };
    setStarted(true);
  }

  const exitToMain = () => { router.push("/?main=1"); };

  return (
    <div className={`min-h-screen bg-[#2b124c] ${pixel.className}`}>
      {/* CONTENEDOR CENTRADO EN PANTALLA */}
      <div className="min-h-screen w-full px-4 py-8 flex items-center justify-center">
        <div className="w-full" style={{ maxWidth: "min(1100px, 96vw)" }}>
          {/* TÍTULO CENTRADO */}
          <h1 className="text-center text-white text-[clamp(20px,4vw,32px)] font-extrabold tracking-wide drop-shadow mb-4">
            Jose&apos;s Adventures as Spiderman
          </h1>

          {/* VENTANA DEL JUEGO CENTRADA Y RESPONSIVE */}
          <div className="mx-auto rounded-2xl bg-[#0b0b0cc0] border border-white/10 shadow-2xl backdrop-blur p-3 md:p-4"
               style={{ width: "clamp(320px, 96vw, 1000px)" }}>
            {/* Barra superior */}
            <div className="flex items-center justify-between px-3 py-2 mb-2 rounded-xl bg-[#181126]/70 border border-white/10">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-red-500/80" />
                <span className="size-3 rounded-full bg-yellow-500/80" />
                <span className="size-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-sm text-white/60">Spidey Runner</span>
              <div className="w-14" />
            </div>

            {/* Canvas responsivo */}
            <div className="flex justify-center">
              <canvas
                ref={canvasRef}
                width={VIEW.width}
                height={VIEW.height}
                className="w-full h-auto rounded-xl overflow-hidden shadow-lg"
                style={{ maxWidth: "960px", background: "transparent" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ====== MODAL START ====== */}
      {!started && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-3">
          <div className="relative w-[clamp(300px,92vw,680px)] rounded-2xl border-4 border-[#2c1a4b] bg-[#b28bd6] shadow-[0_8px_0_#2c1a4b]">
            {/* barra superior */}
            <div className="flex items-center justify-end gap-2 px-4 py-2 border-b-4 border-[#2c1a4b]">
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded bg-white/80 grid place-items-center text-[#2c1a4b]">–</div>
                <div className="w-6 h-6 rounded bg-white/80 grid place-items-center text-[#2c1a4b]">▢</div>
                <div className="w-6 h-6 rounded bg-white/80 grid place-items-center text-[#2c1a4b]">x</div>
              </div>
            </div>

            {/* contenido */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-5 bg-[#f3e4fd] p-5 md:p-7 rounded-b-xl">
              <p className="text-[#2c1a4b] leading-7 md:leading-8 text-[clamp(14px,2.6vw,18px)]">
                Since you want to be Spiderman so bad press Space/W/⬆ to jump and avoid the obstacles
                to save Mary Jane (aka yo por pelirrojas va) from the Green Goblin.
              </p>

              <img
                src={ASSETS.mary}
                alt="Mary Jane"
                className="h-[140px] md:h-[160px] image-pixelated select-none mx-auto"
                draggable={false}
              />

              <div className="col-span-full mt-2 flex flex-wrap items-center justify-center gap-6">
                <img
                  src={ASSETS.btnPlay}
                  alt="PLAY"
                  className="h-14 md:h-16 cursor-pointer select-none image-pixelated"
                  onClick={handleRestart}
                  draggable={false}
                />
                <img
                  src={ASSETS.btnExit}
                  alt="EXIT"
                  className="h-14 md:h-16 cursor-pointer select-none image-pixelated"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3">
          <div className="relative w-[clamp(300px,92vw,680px)] rounded-2xl border-4 border-[#2c1a4b] bg-[#b28bd6] shadow-[0_8px_0_#2c1a4b]">
            <div className="flex items-center justify-end gap-2 px-4 py-2 border-b-4 border-[#2c1a4b]">
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded bg-white/80 grid place-items-center text-[#2c1a4b]">–</div>
                <div className="w-6 h-6 rounded bg-white/80 grid place-items-center text-[#2c1a4b]">▢</div>
                <div className="w-6 h-6 rounded bg-white/80 grid place-items-center text-[#2c1a4b]">x</div>
              </div>
            </div>

            <div className="grid grid-cols-1 items-center gap-5 bg-[#f3e4fd] p-5 md:p-7 rounded-b-xl">
              <div className="text-center">
                <h2 className="text-[clamp(18px,4vw,24px)] mb-1 text-[#2c1a4b]">GAME OVER</h2>
                <p className="text-[#2c1a4b] mb-2 text-[clamp(14px,3vw,16px)]">Score: {score}</p>
              </div>

              <img
                src={ASSETS.mary2}
                alt="Mary Jane"
                className="h-[140px] md:h-[160px] image-pixelated select-none mx-auto"
                draggable={false}
              />

              <div className="mt-2 flex flex-wrap items-center justify-center gap-6">
                <img
                  src={ASSETS.btnPlay}
                  alt="PLAY AGAIN"
                  className="h-14 md:h-16 cursor-pointer select-none image-pixelated"
                  onClick={handleRestart}
                  draggable={false}
                />
                <img
                  src={ASSETS.btnExit}
                  alt="EXIT"
                  className="h-14 md:h-16 cursor-pointer select-none image-pixelated"
                  onClick={exitToMain}
                  draggable={false}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* nitidez pixel art para <img> */}
      <style jsx global>{`
        .image-pixelated {
          image-rendering: pixelated;
          image-rendering: crisp-edges;
        }
      `}</style>
    </div>
  );
}
