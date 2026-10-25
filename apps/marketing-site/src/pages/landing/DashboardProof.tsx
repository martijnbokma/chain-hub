import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { SectionHead } from './SectionHead';
import { Reveal } from '../../components/Reveal';
import dashboardOverview from '../../assets/dashboard-overview.webp';
import dashboardOverviewDark from '../../assets/dashboard-overview-dark.webp';
import dashboardLibrary from '../../assets/dashboard-library.webp';
import dashboardLibraryDark from '../../assets/dashboard-library-dark.webp';
import dashboardSettings from '../../assets/dashboard-settings.webp';
import dashboardSettingsDark from '../../assets/dashboard-settings-dark.webp';
import dashboardSkillDetail from '../../assets/dashboard-skill-detail.webp';
import dashboardSkillDetailDark from '../../assets/dashboard-skill-detail-dark.webp';
import dashboardLearnings from '../../assets/dashboard-learnings.webp';
import dashboardLearningsDark from '../../assets/dashboard-learnings-dark.webp';
import dashboardCatalog from '../../assets/dashboard-catalog.webp';
import dashboardCatalogDark from '../../assets/dashboard-catalog-dark.webp';

type LightboxImage = { light: string; dark: string; alt: string; caption: string };

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
        className="group bp-corners block w-full border border-border rounded-sm overflow-hidden bg-card cursor-zoom-in"
      >
        <img
          src={image.light}
          alt={image.alt}
          className="w-full h-auto block transition-transform duration-300 group-hover:scale-[1.03] dark:hidden"
          loading="lazy"
        />
        <img
          src={image.dark}
          alt=""
          aria-hidden="true"
          className="w-full h-auto hidden transition-transform duration-300 group-hover:scale-[1.03] dark:block"
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
      <figure
        className="bp-corners w-[min(1600px,94vw)] border border-border rounded-sm overflow-hidden bg-card"
        onClick={(event) => event.stopPropagation()}
      >
        <img src={image.light} alt={image.alt} className="w-full h-auto max-h-[78vh] object-contain block dark:hidden" />
        <img src={image.dark} alt="" aria-hidden="true" className="w-full h-auto max-h-[78vh] object-contain hidden dark:block" />
        <figcaption className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase px-5 py-3 border-t border-border flex items-center justify-between gap-4">
          <span className="truncate">{image.caption}</span>
          <span className="flex items-center gap-2 normal-case">
            {hasMultiple && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate(-1)}
                  aria-label="Previous screenshot"
                  className="p-2 rounded-sm border border-border text-foreground hover:border-ring transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="font-mono text-muted-foreground/70">
                  {index + 1} / {images.length}
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate(1)}
                  aria-label="Next screenshot"
                  className="p-2 rounded-sm border border-border text-foreground hover:border-ring transition-colors"
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
        className="absolute top-6 right-6 p-2 rounded-sm border border-border text-foreground hover:border-ring transition-colors bg-card"
      >
        <X size={20} />
      </button>
    </div>,
    document.body,
  );
}

const dashboardImages: LightboxImage[] = [
  {
    light: dashboardOverview,
    dark: dashboardOverviewDark,
    alt: 'Chain Hub dashboard overview showing hub status and asset counts',
    caption: 'Fig. 1 — Hub status, live local dashboard',
  },
  {
    light: dashboardLibrary,
    dark: dashboardLibraryDark,
    alt: 'Chain Hub dashboard library showing skills and agents',
    caption: 'Fig. 2 — Library, browsing skills and agents',
  },
  {
    light: dashboardSkillDetail,
    dark: dashboardSkillDetailDark,
    alt: 'Chain Hub skill detail view showing the design skill source',
    caption: 'Fig. 3 — Asset detail, inspecting a skill file',
  },
  {
    light: dashboardSettings,
    dark: dashboardSettingsDark,
    alt: 'Chain Hub settings page showing theme and local AI provider configuration',
    caption: 'Fig. 4 — Settings, local AI providers',
  },
  {
    light: dashboardLearnings,
    dark: dashboardLearningsDark,
    alt: 'Chain Hub learnings page showing captured events and skill reflections',
    caption: 'Fig. 5 — Learnings, captured events and reflections',
  },
  {
    light: dashboardCatalog,
    dark: dashboardCatalogDark,
    alt: 'Chain Hub catalog page showing browsable community skills and agents',
    caption: 'Fig. 6 — Catalog, community assets to install',
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
      <section id="proof" className="max-w-6xl mx-auto px-6 py-16 lg:py-20 scroll-mt-16">
        <SectionHead
          index="07"
          kicker="Detail"
          title="The real dashboard, not a mockup"
          copy="Real screenshots of the dashboard running on your machine: hub health, your files, a skill in detail, and the AI settings. Click any figure to view it full size."
        />
        <Reveal className="grid md:grid-cols-2 gap-8">
          {dashboardImages.map((image, index) => (
            <FramedFigure key={image.light} image={image} index={index} onOpen={setLightboxIndex} />
          ))}
        </Reveal>
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
