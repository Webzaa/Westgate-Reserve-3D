import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Preloader } from "@/components/Preloader";
import { CinematicJourney } from "@/components/CinematicJourney";
import { MobileEnquiry } from "@/components/MobileEnquiry";
import { Footer } from "@/sections/Footer";
import { captureMarketingData } from "@/lib/marketing";
import { track, trackScrollMilestones } from "@/lib/analytics";

export default function Home() {
  const [loadProgress, setLoadProgress] = useState(0);
  const [assetsReady, setAssetsReady] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    captureMarketingData();
    track("page_view");
    return trackScrollMilestones();
  }, []);

  useEffect(() => {
    if (started) track("hero_view");
  }, [started]);

  const onLoadProgress = useCallback(
    (r: number) => setLoadProgress((p) => Math.max(p, r)),
    [],
  );
  const onAssetsReady = useCallback(() => setAssetsReady(true), []);
  const onDone = useCallback(() => setStarted(true), []);

  return (
    <div id="top">
      <Preloader
        progress={loadProgress}
        assetsReady={assetsReady}
        onDone={onDone}
      />

      <Header />

      {/* Cinematic video/scroll engine intentionally left unchanged. */}
      <CinematicJourney
        started={started}
        onLoadProgress={onLoadProgress}
        onAssetsReady={onAssetsReady}
      />


      <Footer />

      {/* Phones only: sticky bottom "Enquire Now" bar + popup form. */}
      <MobileEnquiry enabled={started} />
    </div>
  );
}
