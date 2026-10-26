import { TitleblockBar } from '../components/PageChrome';
import { AssetsSection } from './landing/AssetsSection';
import { ByoModelSection } from './landing/ByoModelSection';
import { CliDashboardSection } from './landing/CliDashboardSection';
import { CtaSection } from './landing/CtaSection';
import { DashboardProof } from './landing/DashboardProof';
import { HeroSection } from './landing/HeroSection';
import { HowItWorksSection } from './landing/HowItWorksSection';
import { LearnSyncSection } from './landing/LearnSyncSection';
import { ProblemSection } from './landing/ProblemSection';

export function LandingPage() {
  return (
    <div className="min-h-dvh">
      <TitleblockBar />
      <HeroSection />
      <ProblemSection />
      <AssetsSection />
      <HowItWorksSection />
      <CliDashboardSection />
      <LearnSyncSection />
      <ByoModelSection />
      <DashboardProof />
      <CtaSection />
    </div>
  );
}
