import { useCallback, useState } from 'react';
import { SectionHead } from './SectionHead';
import { FramedFigure, ScreenshotLightbox, type LightboxImage } from './ScreenshotLightbox';
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

const dashboardImages: LightboxImage[] = [
  {
    light: dashboardOverview,
    dark: dashboardOverviewDark,
    alt: 'Chain Hub dashboard overview showing hub status and asset counts',
    caption: 'Hub status on a live local dashboard',
  },
  {
    light: dashboardLibrary,
    dark: dashboardLibraryDark,
    alt: 'Chain Hub dashboard library showing skills and agents',
    caption: 'The library, browsing skills and agents',
  },
  {
    light: dashboardSkillDetail,
    dark: dashboardSkillDetailDark,
    alt: 'Chain Hub skill detail view showing the design skill source',
    caption: 'Asset detail, inspecting a skill file',
  },
  {
    light: dashboardSettings,
    dark: dashboardSettingsDark,
    alt: 'Chain Hub settings page showing theme and local AI provider configuration',
    caption: 'Settings, local AI providers',
  },
  {
    light: dashboardLearnings,
    dark: dashboardLearningsDark,
    alt: 'Chain Hub learnings page showing captured events and skill reflections',
    caption: 'Learnings, captured events and reflections',
  },
  {
    light: dashboardCatalog,
    dark: dashboardCatalogDark,
    alt: 'Chain Hub catalog page showing browsable community skills and agents',
    caption: 'The catalog, community assets to install',
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
      <section id="proof" className="border-b border-border scroll-mt-20">
        <div className="max-w-6xl mx-auto px-6 py-20 lg:py-28">
        <SectionHead
          index="07"
          kicker="Proof"
          title="The real dashboard, not a mockup"
          copy="Real screenshots of the dashboard running on your machine: hub health, your files, a skill in detail, and the AI settings. Click any figure to view it full size."
        />
        <Reveal className="grid md:grid-cols-2 gap-8">
          {dashboardImages.map((image, index) => (
            <FramedFigure key={image.light} image={image} index={index} onOpen={setLightboxIndex} />
          ))}
        </Reveal>
        </div>
      </section>

      <ScreenshotLightbox
        images={dashboardImages}
        index={lightboxIndex}
        onClose={closeLightbox}
        onNavigate={navigateLightbox}
      />
    </>
  );
}
