"use client";

import { useState } from "react";
import { EVENT_TYPE_COLORS, EVENT_TYPE_LABELS, type FamilyEvent, type EventType } from "@/lib/supabase/queries/events";
import { Avatar } from "./Avatar";
import { formatDate } from "@/lib/utils";

interface TimelineProps {
  events: FamilyEvent[];
  onPersonClick?: (id: string) => void;
  onPlaceClick?: (id: string) => void;
  className?: string;
}

function EventDot({ type, isHovered }: { type: EventType; isHovered: boolean }) {
  const { dot } = EVENT_TYPE_COLORS[type] ?? EVENT_TYPE_COLORS.other;
  return (
    <div
      className={`absolute -left-[22px] mt-1 h-4 w-4 rounded-full border-2 border-heritage-white transition-transform duration-150
        ${dot} ${isHovered ? "scale-125" : "scale-100"}`}
    />
  );
}

function EventCard({ event, onPersonClick, onPlaceClick }: {
  event: FamilyEvent;
  onPersonClick?: (id: string) => void;
  onPlaceClick?: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const colors = EVENT_TYPE_COLORS[event.event_type] ?? EVENT_TYPE_COLORS.other;

  return (
    <li
      className="relative ml-6"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <EventDot type={event.event_type} isHovered={hovered} />

      <div className={`rounded-xl border bg-heritage-white p-3.5 shadow-sm transition-shadow duration-150
        ${hovered ? "shadow-[0_4px_20px_rgba(74,55,40,0.10)]" : "border-heritage-sand/40"}`}>

        {/* Header row */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${colors.badge}`}>
              {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
            </span>
            {event.event_date && (
              <span className="text-xs text-heritage-brown">{formatDate(event.event_date)}</span>
            )}
            {event.end_date && (
              <span className="text-xs text-heritage-brown">→ {formatDate(event.end_date)}</span>
            )}
          </div>
        </div>

        {/* Title */}
        <p className="mt-1.5 text-sm font-semibold text-heritage-dark">{event.title}</p>

        {/* Description */}
        {event.description && (
          <p className="mt-0.5 text-xs text-heritage-brown leading-relaxed">{event.description}</p>
        )}

        {/* Footer: person + place */}
        <div className="mt-2 flex flex-wrap gap-3">
          {event.person_name && event.person_id && (
            <button
              onClick={() => onPersonClick?.(event.person_id!)}
              className="flex items-center gap-1.5 text-xs text-heritage-forest hover:underline"
            >
              <Avatar
                src={event.person_photo ?? null}
                firstName={event.person_name.split(" ")[0]}
                lastName={event.person_name.split(" ").slice(1).join(" ")}
                size="sm"
              />
              {event.person_name}
            </button>
          )}
          {event.place_name && event.place_id && (
            <button
              onClick={() => onPlaceClick?.(event.place_id!)}
              className="flex items-center gap-1.5 text-xs text-heritage-brown hover:underline"
            >
              <span className="text-heritage-sand">📍</span>
              {event.place_name}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

export function Timeline({ events, onPersonClick, onPlaceClick, className = "" }: TimelineProps) {
  if (events.length === 0) {
    return <p className="text-sm text-heritage-brown py-2">Aucun événement enregistré.</p>;
  }

  // Group by year
  const byYear = new Map<string, FamilyEvent[]>();
  for (const e of events) {
    const year = e.event_date ? new Date(e.event_date).getFullYear().toString() : "Date inconnue";
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(e);
  }

  return (
    <div className={`relative border-l-2 border-heritage-sand/40 ml-2 ${className}`}>
      {[...byYear.entries()].map(([year, yearEvents]) => (
        <div key={year} className="mb-6">
          {/* Year marker */}
          <div className="relative -left-[30px] mb-3 inline-flex items-center">
            <span className="rounded-full bg-heritage-forest px-2.5 py-0.5 text-xs font-semibold text-white">
              {year}
            </span>
          </div>
          <ul className="space-y-3">
            {yearEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onPersonClick={onPersonClick}
                onPlaceClick={onPlaceClick}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
