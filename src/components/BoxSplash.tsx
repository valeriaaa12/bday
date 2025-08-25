"use client";
type Props = { onOpen?: () => void };
export default function BoxSplash({ onOpen }: Props) {
  return (
    <main className="splash">
      <div className="box-wrap">
        <img src="/images/box.png" alt="Box" className="box" />
        <button type="button" className="open-btn" onClick={() => onOpen?.()}>
          Click to open!
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
        .box { width: 100%; height: auto; display: block; user-select: none; -webkit-user-drag: none; image-rendering: pixelated; }
        .open-btn {
          position: absolute;
          top: 50%; left: 50%; transform: translate(-50%, -50%);
          padding: 12px 24px; border: 0; border-radius: 9999px;
          background: #19467f; color: #fff; font-weight: 600; cursor: pointer;
          box-shadow: 0 6px 16px rgba(0,0,0,.15);
        }
        .open-btn:hover { opacity: .95; }
        .open-btn:active { transform: translate(-50%, -50%) scale(.98); }
      `}</style>
    </main>
  );
}
