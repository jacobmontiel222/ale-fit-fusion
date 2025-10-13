import { Bell, Utensils, TrendingUp, ArrowRight, Scale, Footprints, Flame, MessageCircle } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { CircularProgress } from "@/components/CircularProgress";
import { BottomNav } from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Hola, Nombre</h1>
            <p className="text-muted-foreground text-sm mt-1">¡Vamos a por ello!</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-card rounded-full transition-colors">
              <MessageCircle className="w-6 h-6 text-foreground" />
            </button>
            <button className="p-2 hover:bg-card rounded-full transition-colors">
              <Bell className="w-6 h-6 text-foreground" />
            </button>
          </div>
        </div>

        {/* Main Calories Card */}
        <StatsCard 
          className="relative overflow-hidden cursor-pointer hover:bg-secondary/50 transition-colors"
          onClick={() => navigate('/comidas')}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CircularProgress value={1428} max={2000} />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Objetivo</h2>
                <p className="text-3xl font-bold text-foreground">2000 Kcal</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Comidas:</span>
                  <span className="text-sm font-semibold text-foreground">572 Kcal</span>
                </div>
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4" style={{ color: '#ff6b35' }} />
                  <span className="text-sm text-muted-foreground">Ejercicio:</span>
                  <span className="text-sm font-semibold text-foreground">252 Kcal</span>
                </div>
              </div>
            </div>
          </div>
        </StatsCard>

        {/* Grid of Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* Macros Card */}
          <StatsCard 
            className="cursor-pointer hover:bg-secondary/50 transition-colors"
            onClick={() => navigate('/comidas')}
          >
            <h3 className="text-lg font-semibold text-foreground mb-4">Macros</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Proteínas (P)</span>
                <span className="text-foreground font-semibold">72 g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Grasas (F)</span>
                <span className="text-foreground font-semibold">35 g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Carbs (C)</span>
                <span className="text-foreground font-semibold">25 g</span>
              </div>
            </div>
          </StatsCard>

          {/* Steps Card */}
          <StatsCard 
            className="cursor-pointer hover:bg-secondary/50 transition-colors"
            onClick={() => navigate('/analytics?focus=steps')}
          >
            <div className="flex items-center gap-2 mb-4">
              <Footprints className="w-5 h-5 text-foreground" />
              <h3 className="text-lg font-semibold text-foreground">Pasos</h3>
            </div>
            <p className="text-4xl font-bold text-foreground mb-2">12.432</p>
            <p className="text-sm text-muted-foreground">Objetivo: 20000</p>
          </StatsCard>

          {/* Weight Card */}
          <StatsCard 
            className="py-4 cursor-pointer hover:bg-secondary/50 transition-colors"
            onClick={() => navigate('/analytics?focus=weight')}
          >
            <div className="flex items-center gap-2 mb-3">
              <Scale className="w-4 h-4 text-foreground" />
              <h3 className="text-base font-semibold text-foreground">Peso</h3>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1.5">92.5 Kg</p>
            <p className="text-xs text-accent font-semibold">-5 Kg</p>
          </StatsCard>

          {/* Progress Card */}
          <StatsCard>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-foreground" />
              <h3 className="text-lg font-semibold text-foreground">Progreso</h3>
            </div>
            <div className="h-20 flex items-end justify-between gap-1">
              {[60, 75, 65, 80, 70, 85, 90].map((height, index) => (
                <div
                  key={index}
                  className="flex-1 bg-progress-ring rounded-t"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </StatsCard>
        </div>

        {/* Gym Session Card */}
        <StatsCard 
          className="cursor-pointer hover:bg-secondary transition-colors"
          onClick={() => navigate('/gimnasio')}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-1">Gym Session</h3>
              <p className="text-sm text-muted-foreground">Trackea tu entrenamiento</p>
            </div>
            <button className="w-12 h-12 rounded-full bg-primary flex items-center justify-center hover:scale-105 transition-transform">
              <ArrowRight className="w-6 h-6 text-primary-foreground" />
            </button>
          </div>
        </StatsCard>
      </div>

      <BottomNav />
    </div>
  );
};

export default Index;
