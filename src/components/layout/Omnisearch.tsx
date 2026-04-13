"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import { Search, User, MapPin, Loader2 } from "lucide-react";
import { useOmnisearch, type OmnisearchResult } from "@/hooks/useOmnisearch";
import { useTreeStore } from "@/stores/treeStore";
import { Avatar } from "@/components/ui/Avatar";

interface OmnisearchProps {
  envId: string | null;
}

function formatPersonDate(birth: string | null, death: string | null): string | null {
  const by = birth ? new Date(birth).getFullYear() : null;
  const dy = death ? new Date(death).getFullYear() : null;
  if (by && dy) return `${by} — ${dy}`;
  if (by) return `${by}`;
  return null;
}

export function Omnisearch({ envId }: OmnisearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { setOmnisearchOpen, omnisearchOpen, setTreeFocus } = useTreeStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { query, setQuery, people, places, allResults, loading, clear } =
    useOmnisearch(envId);

  const [activeIndex, setActiveIndex] = useState(-1);

  // Reset active index on results change
  useEffect(() => setActiveIndex(-1), [allResults]);

  // Focus input on open
  useEffect(() => {
    if (omnisearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      clear();
    }
  }, [omnisearchOpen]); // eslint-disable-line

  // ── Global keyboard shortcuts ────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOmnisearchOpen(!omnisearchOpen);
      }
      if (e.key === "Escape" && omnisearchOpen) {
        e.preventDefault();
        setOmnisearchOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [omnisearchOpen, setOmnisearchOpen]);

  // ── Arrow keys + Escape navigation ───────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setOmnisearchOpen(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, allResults.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
      }
      if (e.key === "Enter" && activeIndex >= 0 && allResults[activeIndex]) {
        e.preventDefault();
        handleSelect(allResults[activeIndex]);
      }
    },
    [activeIndex, allResults] // eslint-disable-line
  );

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const el = listRef.current.children[activeIndex] as HTMLElement | undefined;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  // ── Select a result ───────────────────────────────────────────────────────
  function handleSelect(result: OmnisearchResult) {
    setOmnisearchOpen(false);
    clear();

    if (!envId) return;

    if (result.kind === "person") {
      // If we're on the tree page, recentre instead of navigating
      const isOnTree = pathname?.includes("/tree");
      if (isOnTree) {
        setTreeFocus(result.id);
      } else {
        router.push(`/${envId}/people/${result.id}`);
      }
    } else {
      // Places page (not yet built — navigate when ready)
      router.push(`/${envId}/places/${result.id}`);
    }
  }

  if (!omnisearchOpen) return null;

  const hasResults = people.length > 0 || places.length > 0;
  const showEmpty = query.length >= 2 && !loading && !hasResults;

  // ── Count offset for list indexing ───────────────────────────────────────
  let globalIndex = 0;

  // Render via portal so it sits above everything
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOmnisearchOpen(false);
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-heritage-dark/30 backdrop-blur-sm animate-in fade-in duration-150" />

      {/* Palette */}
      <div className="relative w-full max-w-xl animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="rounded-2xl bg-heritage-white border border-heritage-sand/60 shadow-[0_20px_60px_rgba(74,55,40,0.25)] overflow-hidden">

          {/* Input row */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-heritage-sand/30">
            {loading ? (
              <Loader2 className="h-5 w-5 text-heritage-brown animate-spin shrink-0" />
            ) : (
              <Search className="h-5 w-5 text-heritage-brown shrink-0" />
            )}
            <input
              ref={inputRef}
              type="text"
              placeholder="Rechercher une personne, un lieu…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-base text-heritage-dark placeholder:text-heritage-brown/50 focus:outline-none font-sans"
            />
            <kbd className="hidden sm:flex items-center gap-1 rounded-md border border-heritage-sand bg-heritage-cream px-1.5 py-0.5 text-[10px] text-heritage-brown font-mono shrink-0">
              Esc
            </kbd>
          </div>

          {/* Results */}
          {(hasResults || showEmpty) && (
            <div ref={listRef} className="max-h-96 overflow-y-auto py-2">

              {/* ── Personnes ───────────────────────────────────────────── */}
              {people.length > 0 && (
                <div>
                  <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-heritage-brown/70">
                    Personnes
                  </p>
                  {people.map((p) => {
                    const idx = globalIndex++;
                    const isActive = idx === activeIndex;
                    const dateStr = formatPersonDate(p.birth_date, p.death_date);
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleSelect(p)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors
                          ${isActive ? "bg-heritage-beige" : "hover:bg-heritage-beige/50"}`}
                      >
                        <Avatar
                          src={p.photo_url}
                          firstName={p.full_name.split(" ")[0]}
                          lastName={p.full_name.split(" ").slice(1).join(" ")}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-heritage-dark truncate">
                            {p.full_name}
                          </p>
                          <p className="text-xs text-heritage-brown truncate">
                            {[p.profession, dateStr].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <User className="h-3.5 w-3.5 text-heritage-sand shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ── Lieux ───────────────────────────────────────────────── */}
              {places.length > 0 && (
                <div>
                  <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-heritage-brown/70">
                    Lieux
                  </p>
                  {places.map((l) => {
                    const idx = globalIndex++;
                    const isActive = idx === activeIndex;
                    return (
                      <button
                        key={l.id}
                        onClick={() => handleSelect(l)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors
                          ${isActive ? "bg-heritage-beige" : "hover:bg-heritage-beige/50"}`}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-heritage-beige">
                          <MapPin className="h-4 w-4 text-heritage-brown" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-heritage-dark truncate">
                            {l.name}
                          </p>
                          <p className="text-xs text-heritage-brown truncate">
                            {[l.city, l.country].filter(Boolean).join(", ")}
                          </p>
                        </div>
                        <MapPin className="h-3.5 w-3.5 text-heritage-sand shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ── Empty ───────────────────────────────────────────────── */}
              {showEmpty && (
                <div className="px-4 py-6 text-center text-sm text-heritage-brown">
                  {`Aucun résultat pour « ${query} »`}
                </div>
              )}
            </div>
          )}

          {/* Hint when no query */}
          {query.length < 2 && (
            <div className="flex items-center gap-6 px-4 py-3 text-xs text-heritage-brown/60 border-t border-heritage-sand/20">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-heritage-sand/50 bg-heritage-cream px-1 py-0.5 font-mono text-[10px]">↑↓</kbd>
                naviguer
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-heritage-sand/50 bg-heritage-cream px-1 py-0.5 font-mono text-[10px]">↵</kbd>
                sélectionner
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-heritage-sand/50 bg-heritage-cream px-1 py-0.5 font-mono text-[10px]">Esc</kbd>
                fermer
              </span>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
