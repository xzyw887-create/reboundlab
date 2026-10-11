import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { LandingContent } from "@/components/LandingContent";
import { getMarketLandingStats } from "@/lib/marketLandingStats";

export default async function LandingPage() {
  let marketStats: Awaited<ReturnType<typeof getMarketLandingStats>> | null = null;
  try {
    marketStats = await getMarketLandingStats();
  } catch {
    marketStats = null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <LandingContent marketStats={marketStats} />
      <SiteFooter />
    </div>
  );
}
