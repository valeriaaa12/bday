"use client";


import { Silkscreen } from "next/font/google";
import React, { useState } from "react";
import HeadphonesModal from "../components/music"; 
const pixel = Silkscreen({ subsets: ["latin"], weight: "400" });


type IconItem = { src: string; alt: string; onClick?: () => void; };

const ICONS_BASE: IconItem[] = [
  { src: "/images/letter.png",   alt: "Letter for you" },
  { src: "/images/musica.png",   alt: "Songs for you" },  // <- headphones
  { src: "/images/reminder.png", alt: "Reminders for you" },
  { src: "/images/spidey.png",   alt: "Spidey game" },
];

export default function LandingPage() {
     const [songsOpen, setSongsOpen] = useState(false);

  const playlist = [
    { id: "2u2Z07ujyD8", title: "Favorite Girl", artist: "Justin Bieber", coverUrl: "/images/2.png", reason: "me acuerdo cuando dijiste que era de tus favoritas y la ibas cantando en el carro" },
    { id: "Y2QUKEt2p98", title: "Columbia", artist: "Quevedo", coverUrl: "/images/1.png" , reason:"vos sabes, especialmente el min 1:01" },
    { id: "MiAoetOXKcY", title: "Say Yes to Heaven", artist: "Lana del Rey", coverUrl: "/images/3.png",reason:"self-explanatory solo lee la letra" },
    { id: "c3JHH6Hc_io", title: "Lucky Ones", artist: "Lana del Rey", coverUrl: "/images/4.png", reason:"This is how I felt being with you (lee la letra jajaja)" },
    { id: "iKejQrGq04w", title: "Unwritten", artist: "Natasha Bedingfield", coverUrl: "/images/5.png", reason:"ifykyk jajaja" },
    { id: "mtep_hqXltU", title: "TU CHAT", artist: "QUEVEDO", coverUrl: "/images/6.png", reason:"self-explanatory pt.2" },
    { id: "8obld3JrBNM", title: "COSAS QUE NO TE DIJE", artist: "Saiko", coverUrl: "/images/7.png", reason:"...yeah..." },
    { id: "-0qX2nxwsP4", title: "BUENAS NOCHES", artist: "Quevedo", coverUrl: "/images/8.png", reason:"mención honorífica, obvio la tenia que incluir" },
  ];

const ICONS: IconItem[] = ICONS_BASE.map((i) =>
    i.alt === "Songs for you" ? { ...i, onClick: () => setSongsOpen(true) } : i
  );


  return (
    <main className={`${pixel.className} landing`}>
      <p className="hint" >Press any icon!</p>

      
      <div className="icons">
        {ICONS.map((i) => (
          <button key={i.src} className="iconBtn" aria-label={i.alt} onClick={i.onClick}>
            <img src={i.src} alt={i.alt} draggable={false} />
          </button>
        ))}
      </div>

      <HeadphonesModal open={songsOpen} onClose={() => setSongsOpen(false)} playlist={playlist} />

      <style jsx>{`
        .landing {
          min-height: 100svh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding-top: clamp(24px, 8vh, 72px);
          background: url("/images/back1.jpg") center / cover no-repeat fixed;
        }

        .hint {
          color: #fff;
          font-weight: 900;
          letter-spacing: 1px; /* a bit more retro */
          text-shadow: 0 2px 0 rgba(0, 0, 0, 0.28);
          margin: 0;
          font-size: clamp(14px, 2.6vw, 22px);
          margin-top: clamp(160px, 2.6vw, 22px);
        }

        .icons {
          margin-top: clamp(24px, 10vh, 80px);
          display: flex;
          align-items: flex-end;
          gap: clamp(16px, 6vw, 72px);
        }

        .iconBtn {
          position: relative;
          background: transparent;
          border: 0;
          padding: 0;
          cursor: pointer;
          transition: transform 150ms ease;
        }

        /* default size for icons */
        .iconBtn img {
          width: clamp(84px, 15vw, 180px);
          height: auto;
          display: block;
          image-rendering: pixelated;
          -webkit-user-drag: none;
          user-select: none;
        }

        /* Spidey smaller */
        .iconBtn img.spidey {
          width: clamp(70px, 12vw, 150px);
        }

        /* shadow ellipse */
        .iconBtn::after {
          content: "";
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          bottom: -14px;
          width: 60%;
          height: 12px;
          background: rgba(0, 0, 0, 0.22);
          border-radius: 999px;
          filter: blur(2px);
        }

        .iconBtn:hover { transform: translateY(-6px); }
        .iconBtn:active { transform: translateY(-2px); }

        @media (max-width: 600px) {
          .icons { gap: 24px; }
          .iconBtn img { width: clamp(70px, 22vw, 120px); }
          .iconBtn img.spidey { width: clamp(62px, 18vw, 110px); }
        }
      `}</style>
    </main>
  );
}
