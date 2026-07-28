import { useEffect, useState } from "react";

export function usePhotoPreview(photo: File | null): string | null {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!photo) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  return preview;
}
