import { Home, BarChart3, Utensils, Dumbbell, Bot } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: "Inicio", path: "/" },
    { icon: BarChart3, label: "Analytics", path: "/analytics" },
    { icon: Utensils, label: "Comidas", path: "/comidas" },
    { icon: Dumbbell, label: "Gimnasio", path: "/gimnasio" },
    { icon: Bot, label: "FityAI", path: "/fityai" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
      <div className="max-w-md mx-auto flex justify-around items-center py-3 px-4">
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-1 transition-colors"
            >
              <item.icon 
                className={`w-6 h-6 ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}
              />
              <span 
                className={`text-xs ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
