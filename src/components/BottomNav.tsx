import { Home, BarChart3, Utensils, Dumbbell, Users } from "lucide-react";

export const BottomNav = () => {
  const navItems = [
    { icon: Home, label: "Inicio", active: true },
    { icon: BarChart3, label: "Analytics", active: false },
    { icon: Utensils, label: "Comidas", active: false },
    { icon: Dumbbell, label: "Gimnasio", active: false },
    { icon: Users, label: "Comunidad", active: false },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
      <div className="max-w-md mx-auto flex justify-around items-center py-3 px-4">
        {navItems.map((item, index) => (
          <button
            key={index}
            className="flex flex-col items-center gap-1 transition-colors"
          >
            <item.icon 
              className={`w-6 h-6 ${
                item.active ? "text-foreground" : "text-muted-foreground"
              }`}
            />
            <span 
              className={`text-xs ${
                item.active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
};
