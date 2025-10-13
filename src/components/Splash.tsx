import { useEffect, useState } from 'react';
import splashLogo from '@/assets/splash-logo.png';

interface SplashProps {
  onComplete: () => void;
}

export function Splash({ onComplete }: SplashProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const minTime = 500;
    const maxTime = 1500;
    const startTime = Date.now();

    // Wait for minimum time and state to be ready
    const timer = setTimeout(() => {
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, minTime - elapsed);

      setTimeout(() => {
        setFadeOut(true);
        setTimeout(onComplete, 300); // fade-out duration
      }, remainingTime);
    }, Math.min(minTime, maxTime));

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#2d2f33] transition-opacity duration-300 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <img
        src={splashLogo}
        alt="FitYourself"
        className="w-64 h-auto"
      />
    </div>
  );
}
