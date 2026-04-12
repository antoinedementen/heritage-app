"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { getInitials } from "@/lib/utils";
import type { Person } from "@/lib/supabase/queries/people";

interface PersonNodeData {
  person: Person;
  showDates?: boolean;
  isFocus?: boolean;
  isHighlighted?: boolean;
  isOnPath?: boolean;
}

const GENDER_BORDER: Record<string, string> = {
  male:   "border-heritage-forest",
  female: "border-heritage-gold",
  other:  "border-heritage-brown",
};

const GENDER_BG: Record<string, string> = {
  male:   "bg-heritage-forest",
  female: "bg-heritage-gold",
  other:  "bg-heritage-brown",
};

function formatTreeDate(date: string | null) {
  if (!date) return null;
  const d = new Date(date);
  return d.getFullYear().toString();
}

export const PersonNode = memo(function PersonNode({ data, selected }: NodeProps<PersonNodeData>) {
  const { person, showDates = true, isFocus = false, isHighlighted = false, isOnPath = false } = data;
  const borderColor = isOnPath ? "border-heritage-gold" : GENDER_BORDER[person.gender] ?? "border-heritage-sand";
  const bgColor = GENDER_BG[person.gender] ?? "bg-heritage-brown";

  const birthYear = formatTreeDate(person.birth_date);
  const deathYear = formatTreeDate(person.death_date);
  const dateStr =
    showDates && (birthYear || deathYear)
      ? [birthYear ?? "?", !person.is_alive ? (deathYear ?? "?") : null].filter(Boolean).join(" — ")
      : null;

  return (
    <div
      className={`
        relative w-[168px] rounded-xl bg-heritage-white
        border-2 ${borderColor}
        shadow-[0_2px_12px_rgba(74,55,40,0.08)]
        transition-all duration-150
        ${selected ? "shadow-[0_4px_24px_rgba(74,55,40,0.18)] border-[3px]" : ""}
        ${isFocus ? "ring-2 ring-offset-2 ring-heritage-forest/40" : ""}
        ${isHighlighted ? "animate-pulse ring-4 ring-heritage-gold" : ""}
        ${isOnPath ? "bg-heritage-gold/10 shadow-[0_0_0_3px_rgba(184,150,12,0.4)]" : ""}
        cursor-pointer select-none
      `}
    >
      <Handle type="target" position={Position.Top} id="top" className="!bg-heritage-sand !border-0 !w-2 !h-2 !-top-1" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-heritage-sand !border-0 !w-2 !h-2 !-bottom-1" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-heritage-sand !border-0 !w-2 !h-2 !-right-1" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-heritage-sand !border-0 !w-2 !h-2 !-left-1" />

      <div className="flex items-center gap-2 p-2.5">
        {/* Avatar */}
        <div className="shrink-0">
          {person.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={person.photo_url}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${bgColor} text-white text-xs font-semibold select-none`}>
              {getInitials(person.first_name, person.last_name)}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="truncate text-xs font-semibold text-heritage-dark leading-tight">
            {person.first_name}
          </p>
          <p className="truncate text-xs font-semibold text-heritage-dark leading-tight">
            {person.last_name}
          </p>
          {dateStr && (
            <p className="mt-0.5 truncate text-[10px] text-heritage-brown leading-tight">
              {dateStr}
            </p>
          )}
        </div>
      </div>

      {/* Focus indicator */}
      {isFocus && (
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-heritage-forest px-2 py-0.5 text-[9px] text-white font-medium">
          Focus
        </div>
      )}
    </div>
  );
});
