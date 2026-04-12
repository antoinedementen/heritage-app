"use client";

import { useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { createPortal } from "react-dom";
import type { MediaItem } from "@/lib/supabase/queries/media";

interface LightboxProps {
  items: MediaItem[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function Lightbox({ items, currentIndex, onClose, onNavigate }: LightboxProps) {
  const item = items[currentIndex];

  const prev = useCallback(() => {
    if (currentIndex > 0) onNavigate(currentIndex - 1);
  }, [currentIndex, onNavigate]);

  const next = useCallback(() => {
    if (currentIndex < items.length - 1) onNavigate(currentIndex + 1);
  }, [currentIndex, items.length, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, prev, next]);

  if (!item) return null;

  const subtitle = [item.person_name, item.place_name].filter(Boolean).join(" · ");

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex-1 min-w-0">
          {item.caption && (
            <p className="text-sm font-medium text-white truncate">{item.caption}</p>
          )}
          {subtitle && (
            <p className="text-xs text-white/60 truncate">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <span className="text-xs text-white/40">
            {currentIndex + 1} / {items.length}
          </span>
          <a
            href={item.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg p-2 text-white/60 hover:bg-white/10 transition-colors"
            title="Télécharger"
          >
            <Download className="h-4 w-4" />
          </a>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/60 hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main media area */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-12">
        {/* Prev */}
        {currentIndex > 0 && (
          <button
            onClick={prev}
            className="absolute left-2 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Media */}
        <div className="max-h-full max-w-full flex items-center justify-center">
          {item.file_type === "photo" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.file_url}
              alt={item.caption ?? ""}
              className="max-h-[80vh] max-w-full rounded-lg object-contain"
            />
          )}
          {item.file_type === "video" && (
            <video
              src={item.file_url}
              controls
              className="max-h-[80vh] max-w-full rounded-lg"
            />
          )}
          {item.file_type === "document" && (
            <div className="flex flex-col items-center gap-4 rounded-xl bg-white/10 p-12 text-center">
              <p className="text-lg font-medium text-white">Document PDF</p>
              {item.caption && <p className="text-sm text-white/60">{item.caption}</p>}
              <a
                href={item.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg bg-heritage-forest px-4 py-2 text-sm text-white hover:bg-heritage-leaf transition-colors"
              >
                <Download className="h-4 w-4" />
                Télécharger
              </a>
            </div>
          )}
        </div>

        {/* Next */}
        {currentIndex < items.length - 1 && (
          <button
            onClick={next}
            className="absolute right-2 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Thumbnails strip */}
      {items.length > 1 && (
        <div className="flex shrink-0 justify-center gap-2 overflow-x-auto px-4 py-3">
          {items.map((m, i) => (
            <button
              key={m.id}
              onClick={() => onNavigate(i)}
              className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg transition-all
                ${i === currentIndex ? "ring-2 ring-white scale-110" : "opacity-50 hover:opacity-80"}`}
            >
              {m.file_type === "photo" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.file_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-white/10">
                  <span className="text-[10px] text-white">
                    {m.file_type === "video" ? "▶" : "PDF"}
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}
