"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, Check, Loader2 } from "lucide-react";
import { useUploadMedia } from "@/hooks/useMedia";
import { useToast } from "@/hooks/useToast";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface MediaUploaderProps {
  envId: string;
  personId?: string;
  placeId?: string;
  eventId?: string;
  onUploaded?: () => void;
}

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
const ACCEPTED = ["image/*", "video/mp4", "video/webm", "application/pdf"];

export function MediaUploader({ envId, personId, placeId, eventId, onUploaded }: MediaUploaderProps) {
  const toast = useToast();
  const upload = useUploadMedia(envId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [progress, setProgress] = useState(0);

  function validateFile(file: File): string | null {
    if (file.size > MAX_SIZE) return "Le fichier dépasse la limite de 50 MB.";
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isVideo && !isPdf) return "Type de fichier non supporté.";
    return null;
  }

  function pickFile(file: File) {
    const err = validateFile(file);
    if (err) { toast.error(err); return; }
    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) pickFile(file);
  }, []); // eslint-disable-line

  async function handleUpload() {
    if (!selectedFile) return;
    setProgress(20);
    try {
      await upload.mutateAsync({
        file: selectedFile,
        meta: { person_id: personId, place_id: placeId, event_id: eventId, caption },
      });
      setProgress(100);
      toast.success("Média uploadé !");
      setSelectedFile(null);
      setPreview(null);
      setCaption("");
      setProgress(0);
      onUploaded?.();
    } catch {
      toast.error("L'upload a échoué.");
      setProgress(0);
    }
  }

  if (selectedFile) {
    return (
      <div className="rounded-xl border border-heritage-sand bg-heritage-white p-4 space-y-3">
        {/* Preview */}
        {preview ? (
          <div className="relative h-40 w-full overflow-hidden rounded-lg bg-heritage-beige">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="preview" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex h-20 items-center justify-center rounded-lg bg-heritage-beige">
            <p className="text-sm font-medium text-heritage-dark">{selectedFile.name}</p>
          </div>
        )}

        {/* Caption */}
        <Input
          label="Légende (optionnel)"
          placeholder="Décrivez ce média…"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />

        {/* Progress */}
        {progress > 0 && progress < 100 && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-heritage-beige">
            <div
              className="h-full rounded-full bg-heritage-forest transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => { setSelectedFile(null); setPreview(null); setCaption(""); }}
            className="rounded-lg border border-heritage-sand p-2 text-heritage-brown hover:bg-heritage-beige transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <Button onClick={handleUpload} loading={upload.isPending} fullWidth>
            Uploader
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed
          py-8 text-sm transition-colors
          ${dragOver
            ? "border-heritage-forest bg-heritage-forest/5 text-heritage-forest"
            : "border-heritage-sand text-heritage-brown hover:border-heritage-forest/40 hover:text-heritage-forest"
          }`}
      >
        <Upload className="h-6 w-6" />
        <span className="font-medium">Glisser-déposer ou cliquer pour choisir</span>
        <span className="text-xs opacity-70">Images, vidéos MP4, PDF — max 50 MB</span>
      </button>
    </div>
  );
}
