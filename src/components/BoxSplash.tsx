"use client";

import React from "react";
import { useRouter } from "next/navigation";

type BoxSplashProps = {
  src?: string;
  alt?: string;
  buttonText?: string;
  maxWidth?: number | string;
  /** Ruta a la que quieres ir cuando se hace click */
  navigateTo?: string;
  /** Callback opcional adicional */
  onOpen?: () => void;
};

export default function BoxSplash({
  src = "/images/box.png",
  alt = "Box",
  buttonText = "Click to open!",
  maxWidth = 720,
  navigateTo,
  onOpen,
}: BoxSplashProps) {
  const router = useRouter();
  const max = typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth ?? "720px";

  const handleClick = () => {
    onOpen?.();
    if (navigateTo) router.push(navigateTo);
  };

  return (
    <main className="splash">
      <div className="box-wrap" style={{ width: `min(90vw, ${max})` }}>
        <img src={src} alt={alt} className="box" />
        <button className="open-btn" onClick={handleClick}>
          {buttonText}
        </button>
      </div>

      <style jsx>{`
        .splash {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff;
        }
        .box-wrap { position: relative; }
        .box {
          width: 100%;
          height: auto;
          display: block;
          user-select: none;
          -webkit-user-drag: none;
          image-rendering: pixelated;
        }
        .open-btn {
          position: absolute;
          top: 60%;
          left: 50%;
          transform: translate(-50%, -50%);
          padding: 12px 24px;
          border: 0;
          border-radius: 9999px;
          background: #b9d9e6;
          color: #fff;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 6px 16px rgba(0,0,0,.15);
        }
        .open-btn:hover { opacity: .95; }
        .open-btn:active { transform: translate(-50%, -50%) scale(.98); }
      `}</style>
    </main>
  );
}
