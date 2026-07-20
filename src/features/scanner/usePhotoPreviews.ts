import { useEffect, useState } from "react";
import type { ScanPhotos } from "@/lib/schemas";

type Previews = Record<keyof ScanPhotos, string | null>;

const KEYS: (keyof ScanPhotos)[] = ["front", "back", "strand"];

export function usePhotoPreviews(photos: ScanPhotos): Previews {
  const [previews, setPreviews] = useState<Previews>({ front: null, back: null, strand: null });

  useEffect(() => {
    const next: Previews = { front: null, back: null, strand: null };
    for (const key of KEYS) {
      const file = photos[key];
      if (file) next[key] = URL.createObjectURL(file);
    }
    setPreviews(next);

    return () => {
      for (const key of KEYS) {
        const url = next[key];
        if (url) URL.revokeObjectURL(url);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.front, photos.back, photos.strand]);

  return previews;
}
