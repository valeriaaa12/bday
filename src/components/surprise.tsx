"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";

// 👉 Reusable pixel-style modal shell
function PixelModal({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-[min(92vw,680px)] rounded-[24px] bg-[#dff1ff] shadow-[0_8px_0_rgba(0,0,0,0.35)] border border-[#bfe2ff]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top-right X */}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-3 text-[#e33] hover:scale-110 transition-transform"
        >
          ✕
        </button>

        {/* Content */}
        <div className="px-8 pb-8 pt-8">
          {title && (
            <h2 className="text-center text-[#0b4aa1] text-xl md:text-2xl font-bold tracking-wide mb-6">
              {title}
            </h2>
          )}
          {children}
        </div>
      </div>

      {/* pixel crisp */}
      <style jsx global>{`
        .pixel-img {
          image-rendering: pixelated;
          image-rendering: crisp-edges;
          -webkit-user-drag: none;
          user-select: none;
        }
      `}</style>
    </div>
  );
}

// 👉 Main modal with boxes + inner text modal per choice
export default function MoodModal({
  open,
  onClose,
  boxSrc = "/images/surprise.png", // change to your pixel box image
}: {
  open: boolean;
  onClose: () => void;
  boxSrc?: string;
}) {
  const choices = [
    {
      id: "happy",
      label: "feel happy",
      msg: "Im happy that you are happy.Glad everything is going well for you, you deserve it.I want to see you win and smash every single dream you have. I want to see you overcome all of the barriers you face and see you succeed. You are destined for greatness and I want to see you achieve it.",
    },
    {
      id: "sad",
      label: "feel sad",
      msg: "No matter how hard life gets, I hope you never forget that im here for you. Remember to be gentle with yourself especially on the days you feel that you are not enough. You are enough,worthy,still loved,and still needed.",
    },
    {
      id: "angry",
      label: "feel angry",
      msg: "God is with you even on your hardest days. Just in case nobody has told you lately , you are doing great and im proud of you.",
    },
    {
      id: "frustrated",
      label: "feel frustrated",
      msg: "I believe in you. If I could give you one thing in life, I would give you the ability to see yourself through my eyes, only then would you realize how special you are.",
    },
    {
      id: "miss",
      label: "miss me ?",
      msg: "i miss you too , you will always have a special place in my heart. ",
    },
  ];

  const [subOpen, setSubOpen] = useState(false);
  const [message, setMessage] = useState<string>("");

  const handlePick = (msg: string) => {
    setMessage(msg);
    setSubOpen(true);
  };

  return (
    <>
      <PixelModal open={open} onClose={onClose} title="Choose one if you...">
        {/* Grid of 5 boxes */}
        <div className="grid grid-cols-2 gap-y-10 gap-x-10 justify-items-center max-w-[520px] mx-auto">
          {choices.slice(0, 4).map((c) => (
            <button key={c.id} className="group" onClick={() => handlePick(c.msg)}>
              <Image
                src={boxSrc}
                alt={c.label}
                width={128}
                height={128}
                className="pixel-img w-28 h-28 md:w-32 md:h-32 mx-auto"
              />
              <div className="text-[#0b4aa1] text-sm md:text-base mt-2 group-hover:underline">
                {c.label}
              </div>
            </button>
          ))}

          {/* Centered last one (row 3 col-span-2) */}
          <button
            className="group col-span-2 justify-self-center mt-2"
            onClick={() => handlePick(choices[4].msg)}
          >
            <Image
              src={boxSrc}
              alt={choices[4].label}
              width={128}
              height={128}
              className="pixel-img w-28 h-28 md:w-32 md:h-32 mx-auto"
            />
            <div className="text-[#0b4aa1] text-sm md:text-base mt-2 text-center group-hover:underline">
              {choices[4].label}
            </div>
          </button>
        </div>
      </PixelModal>

      {/* Inner message modal */}
      <PixelModal open={subOpen} onClose={() => setSubOpen(false)} title="">
        <p className="text-center text-[#0b4aa1] text-lg leading-8 px-4">
          {message}
        </p>
      </PixelModal>
    </>
  );
}
