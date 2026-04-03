import { useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const TAB_PATHS = ["/", "/analytics", "/comidas", "/gimnasio", "/comunidad"];
const SWIPE_THRESHOLD = 60;
// El movimiento horizontal debe ser al menos 2x mayor que el vertical
const AXIS_LOCK_RATIO = 2;

export const useSwipeNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const currentIndex = TAB_PATHS.indexOf(location.pathname);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null || currentIndex === -1) return;

    const deltaX = touchStart.current.x - e.changedTouches[0].clientX;
    const deltaY = touchStart.current.y - e.changedTouches[0].clientY;

    // Ignorar si el movimiento es mayormente vertical
    if (Math.abs(deltaY) * AXIS_LOCK_RATIO > Math.abs(deltaX)) return;

    if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;

    if (deltaX > 0 && currentIndex < TAB_PATHS.length - 1) {
      navigate(TAB_PATHS[currentIndex + 1]);
    } else if (deltaX < 0 && currentIndex > 0) {
      navigate(TAB_PATHS[currentIndex - 1]);
    }

    touchStart.current = null;
  };

  return { onTouchStart, onTouchEnd };
};
