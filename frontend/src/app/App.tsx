import { useEffect, lazy, Suspense, useCallback, useState } from "react";

import IntroScreen from "../screens/IntroScreen";
import type { AppScreen, GeneratedBuilderCard } from "./app-types";

const loadCreateScreen = () => import("../screens/CreateCardScreen");
const loadResultScreen = () => import("../screens/GeneratedCardScreen");

const CreateCardScreen = lazy(loadCreateScreen);
const GeneratedCardScreen = lazy(loadResultScreen);

function prefetchBuilderFlow(): void {
  void Promise.allSettled([
    loadCreateScreen(),
    loadResultScreen(),
    import("../features/card-renderer").then(({ preloadBuilderCardAssets }) =>
      preloadBuilderCardAssets(),
    ),
  ]);

  if ("fonts" in document) {
    void document.fonts.load('700 64px "Imbue"');
    void document.fonts.load('500 24px "Victor Mono"');
    void document.fonts.load('700 120px "Imbue"');
  }
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>("intro");
  const [isSwipingToCreate, setIsSwipingToCreate] = useState(false);
  const [card, setCard] = useState<GeneratedBuilderCard | null>(null);

  useEffect(() => {
    prefetchBuilderFlow();
  }, []);

  const startCreating = useCallback(() => {
    setCard(null);
    setScreen("create");
    setIsSwipingToCreate(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const triggerIntroSwipe = useCallback(() => {
    setIsSwipingToCreate(true);
    window.setTimeout(() => {
      setCard(null);
      setScreen("create");
      setIsSwipingToCreate(false);
      window.scrollTo({ top: 0, behavior: "auto" });
    }, 1180);
  }, []);

  const showGeneratedCard = useCallback((generated: GeneratedBuilderCard) => {
    setCard(generated);
    setScreen("result");
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  return (
    <main className="app-main-content">
      {(screen === "intro" || isSwipingToCreate) && (
        <div
          className={
            isSwipingToCreate
              ? "app-screen-layer-outgoing"
              : "app-screen-layer-current"
          }
          aria-hidden={isSwipingToCreate ? "true" : undefined}
        >
          <IntroScreen
            onComplete={triggerIntroSwipe}
            onPrefetch={prefetchBuilderFlow}
          />
        </div>
      )}

      {(screen === "create" || isSwipingToCreate) && (
        <div
          className={
            isSwipingToCreate
              ? "app-screen-layer-incoming"
              : ""
          }
          aria-hidden={screen === "intro" ? "true" : undefined}
        >
          <Suspense fallback={null}>
            <CreateCardScreen
              onGenerated={showGeneratedCard}
              isTransitioning={screen === "intro" || isSwipingToCreate}
            />
          </Suspense>
        </div>
      )}

      {screen === "result" && card && (
        <Suspense fallback={null}>
          <GeneratedCardScreen card={card} onMakeAnother={startCreating} />
        </Suspense>
      )}
    </main>
  );
}
