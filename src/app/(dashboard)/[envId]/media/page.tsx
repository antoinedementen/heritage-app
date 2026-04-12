"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMedia, useDeleteMedia } from "@/hooks/useMedia";
import { useToast } from "@/hooks/useToast";
import { Lightbox } from "@/components/media/Lightbox";
import { MediaUploader } from "@/components/media/MediaUploader";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import type { FileType, MediaItem } from "@/lib/supabase/queries/media";

const FILE_TYPE_LABELS: Record<FileType, string> = {
  photo: "Photo",
  video: "Vidéo",
  document: "Document",
};

// ─── Media card ────────────────────────────────────────────────────────────────
function MediaCard({
  item,
  onClick,
  onDelete,
  canEdit,
}: {
  item: MediaItem;
  onClick: () => void;
  onDelete: () => void;
  canEdit: boolean;
}) {
  const [hover, setHover] = useState(false);

  return (
    <div
      className="group relative aspect-square overflow-hidden rounded-xl bg-heritage-beige cursor-pointer"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      {item.file_type === "photo" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.file_url}
          alt={item.caption ?? ""}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : item.file_type === "video" ? (
        <div className="flex h-full items-center justify-center bg-heritage-dark">
          <span className="text-4xl text-white/60">▶</span>
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 bg-heritage-beige">
          <span className="text-3xl">📄</span>
          <span className="text-xs text-heritage-brown px-2 text-center truncate">{item.caption ?? "Document"}</span>
        </div>
      )}

      {/* Hover overlay */}
      <div className={`absolute inset-0 bg-heritage-dark/60 transition-opacity duration-200 flex flex-col justify-end p-2
        ${hover ? "opacity-100" : "opacity-0"}`}>
        {item.caption && (
          <p className="text-xs text-white font-medium line-clamp-2">{item.caption}</p>
        )}
        {(item.person_name || item.place_name) && (
          <p className="text-[10px] text-white/70 mt-0.5 truncate">
            {[item.person_name, item.place_name].filter(Boolean).join(" · ")}
          </p>
        )}
        {canEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="absolute top-2 right-2 rounded-full bg-heritage-red/80 p-1 text-white hover:bg-heritage-red transition-colors"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Type badge */}
      <div className="absolute top-2 left-2">
        <Badge variant="neutral" className="text-[9px] px-1.5 py-0.5">
          {FILE_TYPE_LABELS[item.file_type]}
        </Badge>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function MediaPage({
  params,
}: {
  params: Promise<{ envId: string }>;
}) {
  const { envId } = use(params);
  const router = useRouter();
  const toast = useToast();
  const { isGuest } = useAuth();

  const [typeFilter, setTypeFilter] = useState<FileType | "">("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);

  const { data: media = [], isLoading } = useMedia(envId, {
    fileType: typeFilter || undefined,
  });
  const deleteMedia = useDeleteMedia(envId);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMedia.mutateAsync(deleteTarget);
      toast.success("Média supprimé.");
      setDeleteTarget(null);
    } catch {
      toast.error("Impossible de supprimer ce média.");
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-heritage-dark">Médias</h1>
          <p className="mt-0.5 text-sm text-heritage-brown">
            {isLoading ? "…" : `${media.length} fichier${media.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {!isGuest && (
          <Button icon={Plus} onClick={() => setUploadOpen(true)}>
            Ajouter un média
          </Button>
        )}
      </div>

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as FileType | "")}
          options={[
            { value: "", label: "Tous les types" },
            { value: "photo", label: "Photos" },
            { value: "video", label: "Vidéos" },
            { value: "document", label: "Documents" },
          ]}
          className="w-44"
        />
      </div>

      {/* ── Masonry grid ───────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : media.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title={typeFilter ? "Aucun média de ce type" : "Aucun média"}
          description={typeFilter ? "Changez le filtre pour voir d'autres médias." : "Uploadez des photos, vidéos ou documents."}
          action={!isGuest && !typeFilter ? { label: "Ajouter un média", onClick: () => setUploadOpen(true) } : undefined}
        />
      ) : (
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
          {media.map((item, idx) => (
            <div key={item.id} className="break-inside-avoid">
              <MediaCard
                item={item}
                onClick={() => setLightboxIndex(idx)}
                onDelete={() => setDeleteTarget(item)}
                canEdit={!isGuest}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Upload modal ───────────────────────────────────────────────── */}
      <Modal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Ajouter un média"
        size="md"
      >
        <MediaUploader
          envId={envId}
          onUploaded={() => setUploadOpen(false)}
        />
      </Modal>

      {/* ── Lightbox ───────────────────────────────────────────────────── */}
      {lightboxIndex !== null && (
        <Lightbox
          items={media}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}

      {/* ── Delete confirm ─────────────────────────────────────────────── */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Supprimer le média"
        size="sm"
      >
        <p className="text-sm text-heritage-brown">
          Êtes-vous sûr de vouloir supprimer ce média ? Cette action est irréversible.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Annuler</Button>
          <Button variant="danger" onClick={handleDelete} loading={deleteMedia.isPending}>
            Supprimer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
