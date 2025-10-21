import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Lottie from "lottie-react";
import { useAuth } from "@/contexts/AuthContext";
import splashLogo from "@/assets/fy-logo.png";

const AnimatedSplash = () => {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [animationComplete, setAnimationComplete] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const navDelayRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Fallback timeout to ensure navigation happens even if animation fails
    timeoutRef.current = setTimeout(() => {
      handleNavigation();
    }, 3000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (navDelayRef.current) clearTimeout(navDelayRef.current);
    };
  }, []);

  useEffect(() => {
    if (animationComplete && !loading) {
      navDelayRef.current = setTimeout(() => {
        handleNavigation();
      }, 650);
    }
  }, [animationComplete, loading, session]);

  const handleNavigation = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Navigate based on authentication status
    if (session) {
      navigate("/", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  };

  // Smooth fade and scale animation with glow effect
  const animationData = {
    v: "5.7.4",
    fr: 60,
    ip: 0,
    op: 180,
    w: 500,
    h: 500,
    nm: "FY Splash Smooth",
    ddd: 0,
    assets: [],
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: "Outer Glow",
        sr: 1,
        ks: {
          o: {
            a: 1,
            k: [
              { t: 0, s: [0], e: [30] },
              { t: 30, s: [30], e: [30] },
              { t: 120, s: [30], e: [0] },
              { t: 150, s: [0] }
            ]
          },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [250, 250, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: {
            a: 1,
            k: [
              { t: 0, s: [80, 80, 100], e: [120, 120, 100] },
              { t: 30, s: [120, 120, 100], e: [120, 120, 100] },
              { t: 120, s: [120, 120, 100], e: [140, 140, 100] },
              { t: 150, s: [140, 140, 100] }
            ]
          }
        },
        ao: 0,
        shapes: [
          {
            ty: "gr",
            it: [
              {
                ty: "el",
                s: { a: 0, k: [250, 250] },
                p: { a: 0, k: [0, 0] }
              },
              {
                ty: "fl",
                c: { a: 0, k: [1, 1, 1, 1] },
                o: { a: 0, k: 100 }
              }
            ]
          }
        ],
        ip: 0,
        op: 180,
        st: 0
      },
      {
        ddd: 0,
        ind: 2,
        ty: 4,
        nm: "Main Circle",
        sr: 1,
        ks: {
          o: {
            a: 1,
            k: [
              { t: 0, s: [0], e: [100] },
              { t: 30, s: [100], e: [100] },
              { t: 120, s: [100], e: [0] },
              { t: 150, s: [0] }
            ]
          },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [250, 250, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: {
            a: 1,
            k: [
              { t: 0, s: [70, 70, 100], e: [105, 105, 100] },
              { t: 30, s: [105, 105, 100], e: [100, 100, 100] },
              { t: 90, s: [100, 100, 100], e: [103, 103, 100] },
              { t: 120, s: [103, 103, 100], e: [130, 130, 100] },
              { t: 150, s: [130, 130, 100] }
            ]
          }
        },
        ao: 0,
        shapes: [
          {
            ty: "gr",
            it: [
              {
                ty: "el",
                s: { a: 0, k: [220, 220] },
                p: { a: 0, k: [0, 0] }
              },
              {
                ty: "fl",
                c: { a: 0, k: [1, 1, 1, 1] },
                o: { a: 0, k: 100 }
              }
            ]
          }
        ],
        ip: 0,
        op: 180,
        st: 0
      }
    ]
  };

  const handleAnimationComplete = () => {
    setAnimationComplete(true);
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center overflow-hidden animate-fade-in"
      style={{ backgroundColor: "#0C0C0C" }}
    >
      {/* Subtle wave background pattern */}
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          background: `
            radial-gradient(ellipse 800px 600px at 20% 30%, #1A1A1A 0%, transparent 50%),
            radial-gradient(ellipse 600px 800px at 80% 70%, #1A1A1A 0%, transparent 50%)
          `,
          opacity: animationComplete ? 0 : 0.15,
        }}
      />

      {/* Animated FY logo with smooth transitions */}
      <div 
        className="relative z-10 flex items-center justify-center transition-all duration-1000"
        style={{
          opacity: animationComplete ? 0 : 1,
          transform: animationComplete ? 'scale(1.2)' : 'scale(1)',
        }}
      >
        <Lottie
          animationData={animationData}
          loop={false}
          autoplay={true}
          onComplete={handleAnimationComplete}
          style={{
            width: "320px",
            height: "320px",
          }}
          rendererSettings={{
            preserveAspectRatio: "xMidYMid meet",
          }}
        />
        {/* FY logo positioned absolutely to sync with Lottie animation */}
        <img
          src={splashLogo}
          alt="FY"
          className="absolute transition-all duration-700"
          style={{
            width: "200px",
            height: "200px",
            objectFit: "contain",
          }}
        />
      </div>
    </div>
  );
};

export default AnimatedSplash;
