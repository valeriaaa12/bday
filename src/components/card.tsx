"use client";
import React, { useEffect } from "react";
import { Silkscreen } from "next/font/google";

const pixel = Silkscreen({ subsets: ["latin"], weight: "400" });

type BirthdayModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
};

export default function BirthdayModal({
  open,
  onClose,
  title = "Happy Birthday Jose",
  children,
}: BirthdayModalProps) {
  // ESC para cerrar
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 ${pixel.className}`}
      role="dialog"
      aria-modal="true"
      onClick={onClose}             
    >
      <div
        className="relative w-[min(92vw,760px)] rounded-2xl border-4 border-[#0b4aa1] bg-[#dff1ff] shadow-[0_8px_0_#0b4aa1]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra superior */}
        <div className="flex items-center justify-end gap-2 px-4 py-2 border-b-4 border-[#0b4aa1]">
          <div className="flex gap-2">
            <button
              type="button"
              className="w-6 h-6 rounded bg-white/80 grid place-items-center text-[#0b4aa1]"
              aria-label="Minimize"
            >
              –
            </button>
            <button
              type="button"
              className="w-6 h-6 rounded bg-white/80 grid place-items-center text-[#0b4aa1]"
              aria-label="Maximize"
            >
              ▢
            </button>
            <button
              type="button"
              className="w-6 h-6 rounded bg-white/90 hover:bg-white grid place-items-center text-[#0b4aa1] font-bold"
              aria-label="Close"
              onClick={onClose}            
            >
              x
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="grid grid-cols-[1fr_auto] gap-6 bg-[#dff1ff] p-6 md:p-8 rounded-b-xl">
          <div className="text-center col-span-2">
            <h2 className="text-2xl mb-1 text-[#0b4aa1]">{title}</h2>
            {children ?? (
              <p className="text-[#0b4aa1] mb-4">No soy muy buena con las palabras pero queria desearte feliz cumpleaños y que la pases bonito con las personas que te quieren.
Espero que sigas trabajando en vos y que logres todas tus metas, ya que yo se lo mucho que te esforzas día con día para mejorar. Le agradezco a la vida por haberte conocido ya que gracias a vos aprendí muchas cosas como the fact that I can be seen and loved , entre muchas otras. Sos una persona con grandes cualidades and even if you told me about the darkness inside you , I would still look at you like you are the sun. Espero que cualquier cosa que te preocupe ahorita o te llene de angustia se resuelva y que así tu vida se llene de paz porque deseo que solo cosas buenas lleguen a tu vida. Espero Dios te siga cuidando,te ayude y te llene de bendiciones porque te mereces eso y mucho mas. Love you.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
