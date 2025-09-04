"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import YouTube from "react-youtube";
import Image from "next/image";
import { Silkscreen } from "next/font/google";

const pixel = Silkscreen({ subsets: ["latin"], weight: "400" });

const YT_STATE = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 } as const;

type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getDuration: () => number;
  getCurrentTime: () => number;
  cueVideoById: (videoId: string | { videoId: string; startSeconds?: number; endSeconds?: number }) => void;
};

type ReadyEvent = { target: YTPlayer };
type StateChangeEvent = { target: YTPlayer; data: number };

type Track = { id: string; title: string; artist: string; coverUrl?: string; reason?: string; };

type Props = {
  open: boolean;
  onClose: () => void;
  playlist: Track[];
  startIndex?: number;
};

type CSSVars = React.CSSProperties & { ["--pct"]?: string; ["--c"]?: string; ["--bg"]?: string };

function toMMSS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export default function HeadphonesModal({
  open,
  onClose,
  playlist,
  startIndex = 0,
}: Props) {
  const [index, setIndex] = useState<number>(startIndex);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [current, setCurrent] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [dragging, setDragging] = useState<boolean>(false);

  const playerRef = useRef<YTPlayer | null>(null);
  const wantPlayRef = useRef<boolean>(false);
  const wasPlayingBeforeSeekRef = useRef<boolean>(false);

  const track = useMemo<Track | undefined>(() => playlist[index], [playlist, index]);

  const PRIMARY = "#3a86c8";
  const pct = duration > 0 ? Math.min(100, Math.max(0, (current / duration) * 100)) : 0;

  useEffect(() => {
    if (!open && playerRef.current) {
      try { playerRef.current.stopVideo(); } catch {}
      setIsPlaying(false);
    }
  }, [open]);

  useEffect(() => {
    const p = playerRef.current;
    if (!p || !track?.id) return;
    try {
      p.cueVideoById(track.id);
      setCurrent(0);
    } catch {}
  }, [track?.id]);

  useEffect(() => {
    const t = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      try {
        const d = p.getDuration();
        const c = p.getCurrentTime();
        if (!dragging) {
          setDuration(Number.isFinite(d) ? d : 0);
          setCurrent(Number.isFinite(c) ? c : 0);
        }
      } catch {}
    }, 300);
    return () => clearInterval(t);
  }, [dragging]);

  const onReady = (e: ReadyEvent) => {
    playerRef.current = e.target;
    setIsPlaying(false);
    if (track?.id) {
      try { e.target.cueVideoById(track.id); } catch {}
    }
  };

  const onStateChange = (e: StateChangeEvent) => {
    const s = e.data;
    if (s === YT_STATE.PLAYING) setIsPlaying(true);
    if (s === YT_STATE.PAUSED)  setIsPlaying(false);
    if (s === YT_STATE.ENDED)   handleNext();
    if (s === YT_STATE.CUED && wantPlayRef.current) {
      try { playerRef.current?.playVideo(); } catch {}
      wantPlayRef.current = false;
    }
  };

  const handlePlayPause = () => {
    const p = playerRef.current;
    if (!p) return;
    try {
      if (isPlaying) p.pauseVideo();
      else { wantPlayRef.current = true; p.playVideo(); }
    } catch {}
  };

  const handlePrev = () => {
    const p = playerRef.current;
    if (!p) return;
    try {
      const t = p.getCurrentTime();
      if (t > 3) p.seekTo(0, true);
      else {
        wantPlayRef.current = true;
        setIndex((i) => (i - 1 + playlist.length) % playlist.length);
      }
    } catch {}
  };

  const handleNext = () => {
    wantPlayRef.current = true;
    setIndex((i) => (i + 1) % playlist.length);
  };

  const handleSeekStart = () => {
    wasPlayingBeforeSeekRef.current = isPlaying;
    setDragging(true);
  };

  const handleSeekEnd = (val: number) => {
    const p = playerRef.current;
    setDragging(false);
    try {
      p?.seekTo(val, true);
      setCurrent(val);
      if (wasPlayingBeforeSeekRef.current) p?.playVideo();
    } catch {}
  };

  if (!open) return null;

  const seekStyle: CSSVars = {
    "--pct": `${pct}%`,
    "--c": PRIMARY,
    "--bg": "#dfe5ec",
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className={`modal ${pixel.className}`}>
        <button className="close" aria-label="Close" onClick={onClose}>×</button>

        <h2 className="title">Songs that remind me of you</h2>
        <div className="meta">
          <div className="song">{track?.title}</div>
          <div className="artist">{track?.artist}</div>
        </div>

        {/* Vinilo + cover (RESPONSIVE) */}
        <div className={`disc-wrap ${isPlaying ? "spinning" : ""}`}>
          <div className="disc">
            {track?.coverUrl && (
              <Image
                src={track.coverUrl}
                alt="Cover"
                fill
                sizes="(max-width: 480px) 180px, (max-width: 768px) 240px, 280px"
                className="cover"
                priority
              />
            )}
          </div>
        </div>

        {/* Controles */}
        <div className="controls">
          <input
            className="seek"
            type="range"
            min={0}
            max={Math.max(1, Math.floor(duration))}
            step={1}
            value={Math.floor(current)}
            onChange={(e) => setCurrent(Number(e.target.value))}
            onPointerDown={handleSeekStart}
            onPointerUp={(e) => handleSeekEnd(Number((e.currentTarget as HTMLInputElement).value))}
            style={seekStyle}
          />

          <div className="time">
            <span>{toMMSS(current)}</span>
            <span>{toMMSS(duration)}</span>
          </div>

          <div className="buttons">
            <button className="icon" onClick={handlePrev} aria-label="Previous">
              <svg width="24" height="24" viewBox="0 0 24 24" fill={PRIMARY}>
                <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
            </button>

            <button className="play" onClick={handlePlayPause} aria-label="Play/Pause">
              {isPlaying ? (
                <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button className="icon" onClick={handleNext} aria-label="Next">
              <svg width="24" height="24" viewBox="0 0 24 24" fill={PRIMARY}>
                <path d="M8.59 16.59 10 18l6-6-6-6-1.41 1.41L13.17 12z" />
              </svg>
            </button>
          </div>
        </div>

        {track?.reason && <p className="reason">reason: {track.reason}</p>}

        {/* YouTube oculto */}
        <div className="yt-hidden" aria-hidden="true">
          <YouTube
            videoId={track?.id}
            onReady={onReady}
            onStateChange={onStateChange}
            opts={{
              height: "180",
              width: "320",
              playerVars: { autoplay: 0, controls: 0, rel: 0, modestbranding: 1, disablekb: 1 },
            }}
          />
        </div>
      </div>

      <style jsx>{`
        .overlay {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.45);
          z-index: 9999;
          padding: 12px; /* respeta notch en móviles */
        }

        /* Ventana más pequeña y responsive */
        .modal {
          width: clamp(300px, 92vw, 480px);
          background: #e8f4ff;
          border-radius: 18px;
          padding: clamp(14px, 3vw, 22px) clamp(12px, 3vw, 20px) clamp(18px, 4vw, 28px);
          position: relative;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
          color: #0d3b66;
          text-align: center;
        }
        .close {
          position: absolute;
          top: 6px;
          right: 10px;
          border: 0;
          background: transparent;
          color: #ff4d4d;
          font-size: 24px;
          line-height: 1;
          cursor: pointer;
        }

        .title { margin: 4px 0 8px; letter-spacing: .5px; font-size: clamp(16px, 2.8vw, 20px); }
        .meta { margin-bottom: 6px; }
        .song { font-weight: 700; font-size: clamp(13px, 2.6vw, 16px); }
        .artist { opacity: .8; font-size: clamp(12px, 2.4vw, 14px); }

        /* Vinilo responsivo: usa clamp para el diámetro */
        .disc-wrap { display: grid; place-items: center; margin: 10px 0 12px; }
        .disc {
          position: relative;
          width: clamp(160px, 55vw, 280px);
          height: clamp(160px, 55vw, 280px);
          border-radius: 50%;
          background: radial-gradient(circle at 50% 50%, #222 0 32%, #111 32% 48%, #000 48% 100%);
          overflow: hidden;
        }
        .spinning .disc { animation: spin 6s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .cover {
          border-radius: 50%;
          object-fit: cover;
          box-shadow: 0 0 0 6px rgba(0,0,0,.5) inset;
        }

        .controls { margin-top: 6px; }

        .seek {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 10px;
          border-radius: 999px;
          background: linear-gradient(to right, var(--c) 0 var(--pct), var(--bg) var(--pct) 100%);
          outline: none;
        }
        .seek::-webkit-slider-runnable-track {
          height: 10px; border-radius: 999px;
          background: linear-gradient(to right, var(--c) 0 var(--pct), var(--bg) var(--pct) 100%);
        }
        .seek::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 16px; height: 16px; border-radius: 50%;
          background: var(--c); border: 2px solid #ffffff; margin-top: -3px; cursor: pointer;
        }
        .seek::-moz-range-track { height: 10px; border-radius: 999px; background: var(--bg); }
        .seek::-moz-range-progress { height: 10px; border-radius: 999px; background: var(--c); }
        .seek::-moz-range-thumb {
          width: 16px; height: 16px; border-radius: 50%;
          background: var(--c); border: 2px solid #ffffff; cursor: pointer;
        }

        .time {
          width: 100%;
          margin: 6px auto 0;
          display: flex; justify-content: space-between;
          font-size: 12px; opacity: .8;
        }

        .buttons {
          margin-top: 14px;
          display: flex; align-items: center; justify-content: center; gap: 24px;
        }
        .icon { background: transparent; border: 0; cursor: pointer; }
        .play {
          width: 58px; height: 58px; border-radius: 50%;
          border: 0; cursor: pointer; background: ${PRIMARY};
          display: grid; place-items: center; box-shadow: 0 10px 20px rgba(58,134,200,.35);
        }

        .reason { margin-top: 18px; font-size: 12px; line-height: 1.35; margin-bottom: 6px; }

        .yt-hidden {
          position: absolute; width: 1px; height: 1px; overflow: hidden;
          clip-path: inset(0 0 0 0); opacity: 0; pointer-events: none;
        }

        @media (min-width: 768px) {
          .play { width: 64px; height: 64px; }
        }
      `}</style>
    </div>
  );
}
