"use client";

import { type Person, getPersonCompleteness } from "@/lib/supabase/queries/people";
import { Avatar } from "@/components/ui/Avatar";
import { formatDate } from "@/lib/utils";

interface PersonCardProps {
  person: Person;
  onClick: () => void;
}

function CompletenessBar({
  person,
}: {
  person: Person;
}) {
  const { pct, missing } = getPersonCompleteness(person);
  const color =
    pct >= 80 ? "bg-heritage-forest" : pct >= 50 ? "bg-heritage-gold" : "bg-heritage-red";

  return (
    <div className="group relative mt-3">
      <div className="h-1 w-full rounded-full bg-heritage-beige overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Tooltip */}
      {missing.length > 0 && (
        <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden w-max max-w-[200px] -translate-x-1/2 rounded-lg bg-heritage-dark px-3 py-2 text-xs text-heritage-cream shadow-lg group-hover:block z-10">
          <p className="mb-1 font-medium">Champs manquants :</p>
          {missing.map((f) => (
            <p key={f} className="opacity-80">• {f}</p>
          ))}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-heritage-dark" />
        </div>
      )}
    </div>
  );
}

export function PersonCard({ person, onClick }: PersonCardProps) {
  const genderIcon =
    person.gender === "male" ? "♂" : person.gender === "female" ? "♀" : "⚧";
  const genderColor =
    person.gender === "male"
      ? "text-blue-500"
      : person.gender === "female"
      ? "text-pink-400"
      : "text-heritage-brown";

  const dateStr = (() => {
    if (person.birth_date && person.death_date) {
      return `${formatDate(person.birth_date)} — ${formatDate(person.death_date)}`;
    }
    if (person.birth_date) {
      return `Né${person.gender === "female" ? "e" : ""} le ${formatDate(person.birth_date)}`;
    }
    return null;
  })();

  return (
    <button
      onClick={onClick}
      className="group w-full rounded-xl bg-heritage-white border border-heritage-sand/30
        shadow-[0_2px_12px_rgba(74,55,40,0.06)] p-4 text-left
        hover:shadow-[0_4px_20px_rgba(74,55,40,0.12)] hover:-translate-y-0.5
        transition-all duration-200"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          <Avatar
            src={person.photo_url}
            firstName={person.first_name}
            lastName={person.last_name}
            size="lg"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-serif font-semibold text-heritage-dark truncate leading-tight">
              {person.first_name} {person.last_name}
            </p>
            <span className={`text-sm shrink-0 ${genderColor}`}>{genderIcon}</span>
          </div>
          {dateStr && (
            <p className="text-xs text-heritage-brown mt-0.5 leading-snug">{dateStr}</p>
          )}
          {person.profession && (
            <p className="text-xs text-heritage-brown/80 mt-0.5 truncate">{person.profession}</p>
          )}
          {!person.is_alive && (
            <span className="mt-1.5 inline-block rounded-full bg-heritage-sand/40 px-1.5 py-0.5 text-[10px] text-heritage-brown">
              Décédé{person.gender === "female" ? "e" : ""}
            </span>
          )}
        </div>
      </div>
      <CompletenessBar person={person} />
    </button>
  );
}
