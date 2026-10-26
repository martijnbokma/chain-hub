import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export type LightboxImage = { light: string; dark: string; alt: string; caption: string };

export function FramedFigure({
  image,
  index,
  onOpen,
}: {
  image: LightboxImage;
  index: number;
  onOpen: (index: number) => void;
}) {
  return (
    <div className="group text-left">
      <button
        type="button"
        onClick={() => onOpen(index)}
        aria-label={`${image.alt}, view full size`}
        className="block w-full border border-border rounded-sm overflow-hidden bg-card cursor-zoom-in"
      >
        <img
          src={image.light}
          alt={image.alt}
          width={2560}
          height={1154}
          className="w-full h-auto block transition-transform duration-300 group-hover:scale-[1.03] dark:hidden"
          loading="lazy"
        />
        <img
          src={image.dark}
          alt=""
          aria-hidden="true"
          width={2560}
          height={1154}
          className="w-full h-auto hidden transition-transform duration-300 group-hover:scale-[1.03] dark:block"
          loading="lazy"
        />
      </button>
      <p className="text-sm text-muted-foreground mt-3">
        {image.caption}. <span className="text-foreground underline underline-offset-4 decoration-border group-hover:decoration-foreground">View full size</span>
      </p>
    </div>
  );
}

export function ScreenshotLightbox({
  images,
  index,
  onClose,
  onNavigate,
}: {
  images: LightboxImage[];
  index: number | null;
  onClose: () => void;
  onNavigate: (direction: -1 | 1) => void;
}) {
  const isOpen = index !== null;

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') onNavigate(-1);
      if (event.key === 'ArrowRight') onNavigate(1);
    };
    document.addEventListener('keydown', onKeyDown);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [isOpen, onClose, onNavigate]);

  if (index === null) return null;
  const image = images[index];
  const hasMultiple = images.length > 1;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={image.alt}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm p-6"
      onClick={onClose}
    >
      <figure
        className="w-[min(1600px,94vw)] border border-border rounded-sm overflow-hidden bg-card"
        onClick={(event) => event.stopPropagation()}
      >
        <img src={image.light} alt={image.alt} className="w-full h-auto max-h-[78vh] object-contain block dark:hidden" />
        <img src={image.dark} alt="" aria-hidden="true" className="w-full h-auto max-h-[78vh] object-contain hidden dark:block" />
        <figcaption className="text-sm text-muted-foreground px-5 py-3 border-t border-border flex items-center justify-between gap-4">
          <span className="truncate">{image.caption}</span>
          <span className="flex items-center gap-2">
            {hasMultiple && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate(-1)}
                  aria-label="Previous screenshot"
                  className="p-2.5 rounded-sm border border-border text-foreground hover:border-ring transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="tabular-nums text-muted-foreground/70">
                  {index + 1} / {images.length}
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate(1)}
                  aria-label="Next screenshot"
                  className="p-2.5 rounded-sm border border-border text-foreground hover:border-ring transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </>
            )}
          </span>
        </figcaption>
      </figure>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-6 right-6 p-2.5 rounded-sm border border-border text-foreground hover:border-ring transition-colors bg-card"
      >
        <X size={20} />
      </button>
    </div>,
    document.body,
  );
}
