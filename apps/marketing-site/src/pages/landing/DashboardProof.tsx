import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import dashboardOverview from '../../assets/dashboard-overview.webp';
import dashboardLibrary from '../../assets/dashboard-library.webp';
import dashboardSettings from '../../assets/dashboard-settings.webp';
import dashboardSkillDetail from '../../assets/dashboard-skill-detail.webp';

type LightboxImage = { src: string; alt: string; caption: string };

function FramedFigure({
  image,
  index,
  onOpen,
}: {
  image: LightboxImage;
  index: number;
  onOpen: (index: number) => void;
}) {
  return (
    <div className="text-left">
      <button
        type="button"
        onClick={() => onOpen(index)}
        aria-label={`${image.alt} — view full size`}
        className="group bp-corners block w-full border border-border rounded-sm overflow-hidden bg-card aspect-[16/10] cursor-zoom-in"
      >
        <img
          src={image.src}
          alt={image.alt}
          className="w-full h-full object-cover object-top block transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />
      </button>
      <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase mt-3">
        {image.caption} — <span className="text-primary">view full size</span>
      </p>
    </div>
  );
}

function Lightbox({
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
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-6 right-6 p-2 rounded-sm border border-border text-foreground hover:border-ring transition-colors bg-card"
      >
        <X size={20} />
      </button>

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onNavigate(-1);
            }}
            aria-label="Previous screenshot"
            className="absolute left-6 top-1/2 -translate-y-1/2 p-2 rounded-sm border border-border text-foreground hover:border-ring transition-colors bg-card"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onNavigate(1);
            }}
            aria-label="Next screenshot"
            className="absolute right-6 top-1/2 -translate-y-1/2 p-2 rounded-sm border border-border text-foreground hover:border-ring transition-colors bg-card"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      <figure
        className="bp-corners max-w-5xl w-full border border-border rounded-sm overflow-hidden bg-card"
        onClick={(event) => event.stopPropagation()}
      >
        <img src={image.src} alt={image.alt} className="w-full h-auto block" />
        <figcaption className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase px-5 py-3 border-t border-border flex items-center justify-between">
          <span>{image.caption}</span>
          {hasMultiple && (
            <span className="text-muted-foreground/70">
              {index + 1} / {images.length}
            </span>
          )}
        </figcaption>
      </figure>
    </div>,
    document.body,
  );
}

const dashboardImages: LightboxImage[] = [
  {
    src: dashboardOverview,
    alt: 'Chain Hub dashboard overview showing hub status and asset counts',
    caption: 'Fig. 1 — Hub status, live local dashboard',
  },
  {
    src: dashboardLibrary,
    alt: 'Chain Hub dashboard library showing skills and agents',
    caption: 'Fig. 2 — Library, browsing skills and agents',
  },
  {
    src: dashboardSkillDetail,
    alt: 'Chain Hub skill detail view showing the agent-browser skill source',
    caption: 'Fig. 3 — Asset detail, inspecting a skill file',
  },
  {
    src: dashboardSettings,
    alt: 'Chain Hub settings page showing theme and local AI provider configuration',
    caption: 'Fig. 4 — Settings, local AI providers',
  },
];

/** "Detail" section: dashboard screenshots that open in a keyboard-navigable lightbox. */
export function DashboardProof() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const navigateLightbox = useCallback((direction: -1 | 1) => {
    setLightboxIndex((current) => {
      if (current === null) return current;
      return (current + direction + dashboardImages.length) % dashboardImages.length;
    });
  }, []);

  return (
    <>
      <section id="proof" className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-8">
          Detail — the real local dashboard, not a mockup
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          {dashboardImages.map((image, index) => (
            <FramedFigure key={image.src} image={image} index={index} onOpen={setLightboxIndex} />
          ))}
        </div>
      </section>

      <Lightbox
        images={dashboardImages}
        index={lightboxIndex}
        onClose={closeLightbox}
        onNavigate={navigateLightbox}
      />
    </>
  );
}
