"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

type ModalSize = "sm" | "md" | "lg";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: ModalSize;
  children: React.ReactNode;
}

const sizeMap: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export function Modal({
  isOpen,
  onClose,
  title,
  size = "md",
  children,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Ferme au clic sur l'overlay
  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  // Focus trap + Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first) return;
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleKeyDown);
    // Auto-focus first focusable element
    setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      first?.focus();
    }, 10);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  // Bloque le scroll du body
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center
        bg-heritage-dark/40 backdrop-blur-[2px] sm:p-4
        animate-in fade-in duration-150"
    >
      <div
        ref={panelRef}
        className={`relative w-full ${sizeMap[size]} bg-heritage-white
          rounded-t-2xl sm:rounded-2xl
          shadow-[0_-4px_32px_rgba(74,55,40,0.15)] sm:shadow-[0_20px_60px_rgba(74,55,40,0.2)]
          border border-heritage-sand/30
          max-h-[92dvh] sm:max-h-[85vh] flex flex-col
          animate-in slide-in-from-bottom sm:zoom-in-95 fade-in duration-200`}
      >
        {/* Drag handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="h-1 w-10 rounded-full bg-heritage-sand" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 pt-4 pb-4 border-b border-heritage-sand/30 shrink-0">
            <h2 id="modal-title" className="font-serif text-xl font-semibold text-heritage-dark">
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="Fermer"
              className="rounded-lg p-1.5 text-heritage-brown hover:bg-heritage-beige
                hover:text-heritage-dark transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {!title && (
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="absolute right-4 top-4 rounded-lg p-1.5
              text-heritage-brown hover:bg-heritage-beige hover:text-heritage-dark transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>,
    document.body
  );
}
