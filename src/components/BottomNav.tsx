import { Home, BarChart3, Utensils, Dumbbell, UserRound } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const navItems = [
    { icon: Home, label: t('navigation.home'), path: "/" },
    { icon: BarChart3, label: t('navigation.analytics'), path: "/analytics" },
    { icon: Utensils, label: t('navigation.meals'), path: "/comidas" },
    { icon: Dumbbell, label: t('navigation.gym'), path: "/gimnasio" },
    { icon: UserRound, label: t('navigation.coach'), path: "/coaches" },
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
              aria-label={item.label}
              className="flex-1 flex items-center justify-center transition-colors"
            >
              <item.icon 
                className={`w-6 h-6 ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
};
