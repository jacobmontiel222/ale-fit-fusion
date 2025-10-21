import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const SplashScreenHandler = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [hasShownSplash, setHasShownSplash] = useState(false);

  useEffect(() => {
    // Check if splash has been shown in this session
    const splashShown = sessionStorage.getItem("splashShown");
    
    // Only show splash on initial load (not on subsequent navigations)
    if (!splashShown && location.pathname !== "/splash") {
      sessionStorage.setItem("splashShown", "true");
      navigate("/splash", { replace: true });
    } else {
      setHasShownSplash(true);
    }
  }, []);

  // Don't render children until we've decided about the splash
  if (!hasShownSplash && location.pathname !== "/splash") {
    return null;
  }

  return <>{children}</>;
};

export default SplashScreenHandler;
