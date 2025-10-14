import { Bell, Utensils, ArrowRight, Scale, Footprints, Flame, MessageCircle, Dumbbell, User } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { CircularProgress } from "@/components/CircularProgress";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useNutrition } from "@/contexts/NutritionContext";
import { getState } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

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
  const { getTotals } = useNutrition();
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  
  const [userName, setUserName] = useState<string>("Usuario");
  const [todayWeight, setTodayWeight] = useState<number | null>(null);
  const [todaySteps, setTodaySteps] = useState<number>(0);
  const [kcalPerStep, setKcalPerStep] = useState<number>(0.045);

  // Get nutrition data for today
  const todayNutrition = getTotals(today);

  // Calculate exercise calories
  const exerciseKcal = Math.round(todaySteps * kcalPerStep);

  useEffect(() => {
    // Load user profile name
    const fetchUserProfile = async () => {
      if (user?.id) {
        const { data, error } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();
        
        if (data && !error) {
          setUserName(data.name);
        }
      }
    };
    
    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    // Load today's weight and steps
    const state = getState();
    const todayEntry = state.analyticsWeight.find(entry => entry.date === today);
    setTodayWeight(todayEntry?.kg || null);

    const todayStepsEntry = state.analyticsSteps.find(entry => entry.date === today);
    setTodaySteps(todayStepsEntry?.steps || 0);

    // Load kcalPerStep from profile
    setKcalPerStep(state.profile.kcalPerStep || 0.045);
  }, [today]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Hola, {userName} 👋</h1>
            <p className="text-muted-foreground text-sm mt-1">¡Vamos a por ello! 💪</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-card rounded-full transition-colors">
              <MessageCircle className="w-6 h-6 text-foreground" />
            </button>
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
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <CircularProgress value={todayNutrition.kcalConsumed} max={todayNutrition.kcalTarget} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-foreground mb-2">Objetivo</h2>
              <p className="text-3xl font-bold text-foreground">{todayNutrition.kcalTarget.toLocaleString('es-ES')} Kcal</p>
              <p className="text-sm font-normal text-muted-foreground mt-1">
                {Math.max(0, todayNutrition.kcalTarget - todayNutrition.kcalConsumed).toLocaleString('es-ES')} kcal restantes
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div 
              className="cursor-pointer hover:bg-secondary/50 transition-colors rounded-2xl p-4"
              onClick={() => navigate('/comidas')}
            >
              <div className="flex items-center gap-2 mb-1">
                <Utensils className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Consumidas</p>
              </div>
              <p className="text-2xl font-bold text-foreground" style={{ fontSize: 'clamp(1.25rem, 5vw, 1.5rem)' }}>
                {todayNutrition.kcalConsumed.toLocaleString('es-ES')}
              </p>
              <p className="text-xs text-muted-foreground">kcal</p>
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
            <p className="text-4xl font-bold text-foreground mb-2">{todaySteps.toLocaleString('es-ES')}</p>
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
