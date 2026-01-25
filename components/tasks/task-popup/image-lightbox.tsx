"use client";

import { useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

interface ImageLightboxProps {
  url: string;
  fileName: string;
  onClose: () => void;
}

export function ImageLightbox({ url, fileName, onClose }: ImageLightboxProps) {
  const [mounted, setMounted] = useState(false);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    // Prevent body scroll when lightbox is open
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  const lightboxContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Image: ${fileName}`}
    >
      {/* Close button */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-4 right-4 text-white hover:bg-white/20"
        onClick={onClose}
        aria-label="Close lightbox"
      >
        <IconX className="h-5 w-5" />
      </Button>

      {/* Image container */}
      <div
        className="relative max-h-[90vh] max-w-[90vw] flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={url}
          alt={fileName}
          className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
        />
        <span className="text-white/80 text-sm">{fileName}</span>
      </div>
    </div>
  );

  // Use portal to render at document body level for proper z-index stacking
  if (!mounted) {
    return null;
  }

  return createPortal(lightboxContent, document.body);
}
