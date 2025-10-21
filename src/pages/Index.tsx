import { Bell, ArrowRight, Scale, Footprints, Flame, Dumbbell, User, Droplet } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { CircularProgress } from "@/components/CircularProgress";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useDashboardData } from "@/hooks/useDashboardData";

interface WeightEntry {
  date: string;
  kg: number;
}

interface StepsEntry {
  date: string;
  steps: number;
}

const Index = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useDashboardData();
  
  const kcalPerStep = 0.045;
  
  // Use data from hook with defaults
  const userName = data?.userName || "Usuario";
  const todayWeight = data?.todayWeight ?? null;
  const todaySteps = data?.todaySteps || 0;
  const todayWater = data?.todayWater || 0;
  const todayNutrition = data?.todayNutrition || {
    kcalConsumed: 0,
    kcalTarget: 2000,
    macrosG: { protein: 0, fat: 0, carbs: 0 }
  };

  // Calculate exercise calories
  const exerciseKcal = Math.round(todaySteps * kcalPerStep);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            {isLoading ? (
              <>
                <Skeleton className="h-9 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-foreground">Hola, {userName}</h1>
                <p className="text-muted-foreground text-sm mt-1">¡Vamos a por ello!</p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-card rounded-full transition-colors">
              <Bell className="w-6 h-6 text-foreground" />
            </button>
            <button 
              className="p-2 hover:bg-card rounded-full transition-colors"
              onClick={() => navigate('/profile')}
            >
              <User className="w-6 h-6 text-foreground" />
            </button>
          </div>
        </div>

        {/* Main Calories Card */}
        <StatsCard className="relative overflow-hidden">
          {isLoading ? (
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <Skeleton className="w-[140px] h-[140px] rounded-full" />
              </div>
              <div className="flex-1 p-2 -mr-2">
                <Skeleton className="h-6 w-20 mb-2" />
                <Skeleton className="h-9 w-32 mb-2" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <CircularProgress value={todayNutrition.kcalConsumed} max={todayNutrition.kcalTarget} />
              </div>
              <div 
                className="flex-1 cursor-pointer hover:bg-secondary/50 transition-colors rounded-2xl p-2 -mr-2"
                onClick={() => navigate('/comidas')}
              >
                <h2 className="text-xl font-semibold text-foreground mb-2">Objetivo</h2>
                <p className="text-3xl font-bold text-foreground">{todayNutrition.kcalTarget.toLocaleString('es-ES')} Kcal</p>
                <p className="text-sm font-normal text-muted-foreground mt-1">
                  {Math.max(0, todayNutrition.kcalTarget - todayNutrition.kcalConsumed).toLocaleString('es-ES')} kcal restantes
                </p>
              </div>
            </div>
          )}
          
          {isLoading ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl p-4">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-8 w-20 mb-1" />
                <Skeleton className="h-3 w-8" />
              </div>
              <div className="rounded-2xl p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div 
                className="cursor-pointer hover:bg-secondary/50 transition-colors rounded-2xl p-4"
                onClick={() => navigate('/analytics?focus=water')}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Droplet 
                    className="w-4 h-4" 
                    style={{ color: '#60a5fa' }}
                  />
                  <p className="text-sm text-muted-foreground">Agua Consumida</p>
                </div>
                <p className="text-2xl font-bold text-foreground" style={{ fontSize: 'clamp(1.25rem, 5vw, 1.5rem)' }}>
                  {todayWater.toLocaleString('es-ES')}
                </p>
                <p className="text-xs text-muted-foreground">ml</p>
              </div>
              
              <div 
                className="cursor-pointer hover:bg-secondary/50 transition-colors rounded-2xl p-4"
                onClick={() => navigate('/analytics?focus=steps')}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="w-4 h-4" style={{ color: '#ff6b35' }} />
                  <p className="text-sm text-muted-foreground">Quemadas</p>
                </div>
                <p className="text-2xl font-bold text-foreground" style={{ fontSize: 'clamp(1.25rem, 5vw, 1.5rem)' }}>
                  {exerciseKcal.toLocaleString('es-ES')}
                </p>
                <p className="text-xs text-muted-foreground">kcal</p>
              </div>
            </div>
          )}
        </StatsCard>

        {/* Grid of Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* Macros Card */}
          <StatsCard 
            className="cursor-pointer hover:bg-secondary/50 transition-colors"
            onClick={() => navigate('/comidas')}
          >
            {isLoading ? (
              <>
                <Skeleton className="h-6 w-16 mb-4" />
                <div className="space-y-3">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-foreground mb-4">Macros</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Proteínas (P)</span>
                    <span className="text-foreground font-semibold">{todayNutrition.macrosG.protein} g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Grasas (F)</span>
                    <span className="text-foreground font-semibold">{todayNutrition.macrosG.fat} g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Carbs (C)</span>
                    <span className="text-foreground font-semibold">{todayNutrition.macrosG.carbs} g</span>
                  </div>
                </div>
              </>
            )}
          </StatsCard>

          {/* Steps Card */}
          <StatsCard 
            className="cursor-pointer hover:bg-secondary/50 transition-colors"
            onClick={() => navigate('/analytics?focus=steps')}
          >
            {isLoading ? (
              <>
                <Skeleton className="h-6 w-20 mb-4" />
                <Skeleton className="h-10 w-32 mb-2" />
                <Skeleton className="h-4 w-28" />
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Footprints className="w-5 h-5 text-foreground" />
                  <h3 className="text-lg font-semibold text-foreground">Pasos</h3>
                </div>
                <p className="text-4xl font-bold text-foreground mb-2">{todaySteps.toLocaleString('es-ES')}</p>
                <p className="text-sm text-muted-foreground">Objetivo: 20000</p>
              </>
            )}
          </StatsCard>

          {/* Weight Card */}
          <StatsCard 
            className="py-4 cursor-pointer hover:bg-secondary/50 transition-colors"
            onClick={() => navigate('/analytics?focus=weight')}
          >
            {isLoading ? (
              <>
                <Skeleton className="h-5 w-16 mb-3" />
                <Skeleton className="h-9 w-24 mb-2" />
                <Skeleton className="h-3 w-12" />
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Scale className="w-4 h-4 text-foreground" />
                  <h3 className="text-base font-semibold text-foreground">Peso</h3>
                </div>
                {todayWeight !== null ? (
                  <>
                    <p className="text-3xl font-bold text-foreground mb-1.5">{todayWeight.toFixed(1)} Kg</p>
                    <p className="text-xs text-muted-foreground">Hoy</p>
                  </>
                ) : (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/analytics?focus=weight&add=true');
                    }}
                    className="mt-2"
                  >
                    Añadir peso
                  </Button>
                )}
              </>
            )}
          </StatsCard>

          {/* Entrenadores Card */}
          <StatsCard>
            <div className="flex items-center gap-2 mb-3">
              <Dumbbell className="w-5 h-5 text-foreground" />
              <h3 className="text-lg font-semibold text-foreground">Entrenadores</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Encuentra tu entrenador ideal.
            </p>
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
