import { Plus, ScanLine, ArrowLeft } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { CircularProgress } from "@/components/CircularProgress";
import { BottomNav } from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";

const Comidas = () => {
  const navigate = useNavigate();

  const meals = [
    { name: "Desayuno", calories: 450 },
    { name: "Comida", calories: 720 },
    { name: "Cena", calories: 580 },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => navigate('/')}
            className="p-2 hover:bg-card rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-3xl font-bold text-foreground">Comidas</h1>
        </div>

        {/* Main Calories Summary */}
        <StatsCard className="relative overflow-hidden">
          <div className="flex flex-col items-center gap-6">
            <CircularProgress value={1428} max={2000} />
            
            <div className="w-full space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Consumidas</span>
                <span className="text-foreground font-semibold text-lg">1428 Kcal</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Restantes</span>
                <span className="text-foreground font-semibold text-lg">572 Kcal</span>
              </div>
              
              {/* Macros Distribution */}
              <div className="pt-4 border-t border-border space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Proteínas</span>
                  <span className="text-foreground font-semibold">72g</span>
                </div>
                <div className="w-full bg-progress-bg h-2 rounded-full overflow-hidden">
                  <div className="bg-progress-ring h-full rounded-full" style={{ width: "60%" }} />
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Grasas</span>
                  <span className="text-foreground font-semibold">35g</span>
                </div>
                <div className="w-full bg-progress-bg h-2 rounded-full overflow-hidden">
                  <div className="bg-progress-ring h-full rounded-full" style={{ width: "45%" }} />
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Carbohidratos</span>
                  <span className="text-foreground font-semibold">25g</span>
                </div>
                <div className="w-full bg-progress-bg h-2 rounded-full overflow-hidden">
                  <div className="bg-progress-ring h-full rounded-full" style={{ width: "30%" }} />
                </div>
              </div>
            </div>
          </div>
        </StatsCard>

        {/* Meal Cards */}
        <div className="space-y-3">
          {meals.map((meal, index) => (
            <StatsCard key={index}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-1">{meal.name}</h3>
                  <p className="text-muted-foreground text-sm">{meal.calories} Kcal</p>
                </div>
                <button className="w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:scale-105 transition-transform">
                  <Plus className="w-5 h-5 text-primary-foreground" />
                </button>
              </div>
            </StatsCard>
          ))}
        </div>

        {/* Recipes Card */}
        <StatsCard>
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <ScanLine className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Recetas</h3>
              <p className="text-sm text-muted-foreground">
                Crea y guarda tus recetas personalizadas combinando varios alimentos.
              </p>
            </div>
          </div>
        </StatsCard>
      </div>

      <BottomNav />
    </div>
  );
};

export default Comidas;
