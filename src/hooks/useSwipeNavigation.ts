import { useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const TAB_PATHS = ["/", "/analytics", "/comidas", "/gimnasio", "/comunidad"];
const SWIPE_THRESHOLD = 60;

export const useSwipeNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const touchStartX = useRef<number | null>(null);

  const currentIndex = TAB_PATHS.indexOf(location.pathname);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || currentIndex === -1) return;

    const delta = touchStartX.current - e.changedTouches[0].clientX;

    if (Math.abs(delta) < SWIPE_THRESHOLD) return;

    if (delta > 0 && currentIndex < TAB_PATHS.length - 1) {
      navigate(TAB_PATHS[currentIndex + 1]);
    } else if (delta < 0 && currentIndex > 0) {
      navigate(TAB_PATHS[currentIndex - 1]);
    }

    touchStartX.current = null;
  };

  return { onTouchStart, onTouchEnd };
};
