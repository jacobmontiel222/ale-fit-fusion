import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Lottie from "lottie-react";
import { useAuth } from "@/contexts/AuthContext";

const AnimatedSplash = () => {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [animationComplete, setAnimationComplete] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Fallback timeout to ensure navigation happens even if animation fails
    timeoutRef.current = setTimeout(() => {
      handleNavigation();
    }, 3500);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (animationComplete && !loading) {
      handleNavigation();
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

  // Animation data inline to avoid import issues
  const animationData = {
    v: "5.7.4",
    fr: 60,
    ip: 0,
    op: 210,
    w: 500,
    h: 500,
    nm: "FY Splash",
    ddd: 0,
    assets: [],
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: "Circle",
        sr: 1,
        ks: {
          o: {
            a: 1,
            k: [
              { t: 0, s: [0] },
              { t: 72, s: [100] },
              { t: 162, s: [100] },
              { t: 210, s: [0] }
            ]
          },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [250, 250, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: {
            a: 1,
            k: [
              { t: 72, s: [97, 97, 100] },
              { t: 117, s: [100, 100, 100] },
              { t: 162, s: [97, 97, 100] }
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
                s: { a: 0, k: [200, 200] },
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
        op: 210,
        st: 0
      }
    ]
  };

  const handleAnimationComplete = () => {
    setAnimationComplete(true);
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: "#0C0C0C" }}
    >
      {/* Subtle wave background pattern */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 800px 600px at 20% 30%, #1A1A1A 0%, transparent 50%),
            radial-gradient(ellipse 600px 800px at 80% 70%, #1A1A1A 0%, transparent 50%)
          `,
          opacity: 0.15,
        }}
      />

      {/* Lottie animation with FY logo */}
      <div className="relative z-10 w-64 h-64 flex items-center justify-center">
        <Lottie
          animationData={animationData}
          loop={false}
          autoplay={true}
          onComplete={handleAnimationComplete}
          style={{
            width: "100%",
            height: "100%",
            position: "absolute",
          }}
          rendererSettings={{
            preserveAspectRatio: "xMidYMid meet",
          }}
        />
        {/* FY logo overlay */}
        <img
          src="/fy-logo.png"
          alt="FY"
          className="relative z-20 w-32 h-32 object-contain"
          style={{
            filter: "brightness(0) invert(1)",
          }}
        />
      </div>
    </div>
  );
};

export default AnimatedSplash;
