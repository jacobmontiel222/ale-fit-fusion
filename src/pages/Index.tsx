import { useEffect, useState } from "react";
import { Bell, ArrowRight, Scale, Footprints, Flame, User, Droplet, Bot } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { CircularProgress } from "@/components/CircularProgress";
import { ProgressRing } from "@/components/ProgressRing";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useTranslation } from "react-i18next";
import { trackAnalyticsEvent, FITAI_OPEN_FROM_HOME_HEADER_EVENT, FITAI_OPEN_FROM_TAB_EVENT } from "@/lib/analytics";
import { FITAI_UNREAD_KEY, getFitAIUnread, setFitAIUnread } from "@/lib/fitai";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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
  const { data, isLoading, refetch } = useDashboardData();
  const { t } = useTranslation();
  const [hasFitAIUnread, setHasFitAIUnread] = useState(false);
  const { user } = useAuth();
  const [showAddWater, setShowAddWater] = useState(false);
  const [waterInput, setWaterInput] = useState("");
  const [savingWater, setSavingWater] = useState(false);
  const [showAddSteps, setShowAddSteps] = useState(false);
  const [newStepsAmount, setNewStepsAmount] = useState("");
  const [savingSteps, setSavingSteps] = useState(false);
  const todayISO = new Date().toISOString().split('T')[0];
  const [animateMacros, setAnimateMacros] = useState(false);
  const [animatedWater, setAnimatedWater] = useState(0);
  const [animatedBurn, setAnimatedBurn] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncUnread = () => {
      setHasFitAIUnread(getFitAIUnread());
    };

    syncUnread();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === FITAI_UNREAD_KEY) {
        syncUnread();
      }
    };

    const customHandler = ((event: CustomEvent<{ value?: boolean }>) => {
      if (typeof event.detail?.value === "boolean") {
        setHasFitAIUnread(event.detail.value);
      }
    }) as unknown as EventListener;

    window.addEventListener("storage", handleStorage);
    window.addEventListener("fityai:unread-changed", customHandler);
    const handleWaterUpdated = () => refetch();
    const handleStepsUpdated = () => refetch();
    window.addEventListener("waterUpdated", handleWaterUpdated);
    window.addEventListener("stepsUpdated", handleStepsUpdated);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("fityai:unread-changed", customHandler);
      window.removeEventListener("waterUpdated", handleWaterUpdated);
      window.removeEventListener("stepsUpdated", handleStepsUpdated);
    };
  }, [refetch]);

  const handleOpenFitAI = () => {
    setFitAIUnread(false);
    setHasFitAIUnread(false);
    trackAnalyticsEvent(FITAI_OPEN_FROM_HOME_HEADER_EVENT);
    trackAnalyticsEvent(FITAI_OPEN_FROM_TAB_EVENT, {
      deprecated: true,
      source: "home_header",
    });
    navigate("/fityai");
  };
  
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
  const waterGoal = data?.waterGoal || 2000;
  const burnGoal = data?.burnGoal || 500;

  // Calorías por paso ajustadas por peso (fallback a constante si no hay peso)
  const kcalPerStep = todayWeight
    ? Math.min(0.08, Math.max(0.02, todayWeight * 0.00065))
    : 0.045;
  
  // Calculate exercise calories
  const exerciseKcal = Math.round(todaySteps * kcalPerStep);
  const waterProgress = Math.min(todayWater / (waterGoal || 1), 1);
  const burnProgress = Math.min(exerciseKcal / (burnGoal || 1), 1);

  const proteinCals = todayNutrition.macrosG.protein * 4;
  const fatCals = todayNutrition.macrosG.fat * 9;
  const carbCals = todayNutrition.macrosG.carbs * 4;
  const totalMacroCals = proteinCals + fatCals + carbCals;
  const calorieGoal = todayNutrition.kcalTarget || 1;

  const getMacroWidth = (macroCals: number) => {
    if (calorieGoal <= 0 || macroCals <= 0) return 0;
    if (totalMacroCals <= 0) return 0;
    const scale = totalMacroCals > calorieGoal ? calorieGoal / totalMacroCals : 1;
    return Math.min(100, (macroCals * scale / calorieGoal) * 100);
  };

  useEffect(() => {
    setAnimateMacros(false);
    const timer = setTimeout(() => setAnimateMacros(true), 50);
    return () => clearTimeout(timer);
  }, [
    todayNutrition.macrosG.protein,
    todayNutrition.macrosG.fat,
    todayNutrition.macrosG.carbs,
    todayNutrition.kcalTarget,
  ]);

  const handleSaveWater = async () => {
    if (!user?.id) return;
    const amount = Number(waterInput);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setSavingWater(true);
    try {
      const { data: existing } = await supabase
        .from('daily_water_intake')
        .select('ml_consumed')
        .eq('user_id', user.id)
        .eq('date', todayISO)
        .maybeSingle();
      const newTotal = (existing?.ml_consumed || 0) + amount;
      const { error } = await supabase
        .from('daily_water_intake')
        .upsert(
          {
            user_id: user.id,
            date: todayISO,
            ml_consumed: newTotal,
          },
          { onConflict: 'user_id,date' },
        );
      if (error) throw error;
      await refetch();
      window.dispatchEvent(new Event('waterUpdated'));
      setShowAddWater(false);
      setWaterInput("");
    } catch (err) {
      console.error('Error saving water', err);
    } finally {
      setSavingWater(false);
    }
  };

  const handleAddSteps = async () => {
    if (!user?.id) return;
    const stepsValue = Number(newStepsAmount);
    if (!Number.isFinite(stepsValue) || stepsValue <= 0) return;
    setSavingSteps(true);
    try {
      const { data: existing } = await supabase
        .from('daily_steps')
        .select('steps')
        .eq('user_id', user.id)
        .eq('date', todayISO)
        .maybeSingle();

      const newTotal = (existing?.steps || 0) + stepsValue;

      const { error } = await supabase
        .from('daily_steps')
        .upsert(
          {
            user_id: user.id,
            date: todayISO,
            steps: newTotal,
          },
          { onConflict: 'user_id,date' },
        );
      if (error) throw error;
      await refetch();
      window.dispatchEvent(new Event('stepsUpdated'));
      setShowAddSteps(false);
      setNewStepsAmount("");
    } catch (err) {
      console.error('Error saving steps', err);
    } finally {
      setSavingSteps(false);
    }
  };

  useEffect(() => {
    setAnimatedWater(0);
    setAnimatedBurn(0);
    const timer = setTimeout(() => {
      setAnimatedWater(todayWater);
      setAnimatedBurn(exerciseKcal);
    }, 50);
    return () => clearTimeout(timer);
  }, [todayWater, exerciseKcal]);

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
                <h1 className="text-3xl font-bold text-foreground">{t('dashboard.title', { name: userName })}</h1>
                <p className="text-muted-foreground text-sm mt-1">{t('dashboard.motto')}</p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenFitAI}
              className="relative rounded-full p-1 transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={t('accessibility.openFitAI')}
            >
              <Bot className="w-6 h-6 text-foreground" />
              {hasFitAIUnread && (
                <span className="absolute -top-0.5 -right-0.5 inline-flex h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" />
              )}
            </button>
            <button className="p-2 hover:bg-card rounded-full transition-colors" type="button">
              <Bell className="w-6 h-6 text-foreground" />
            </button>
            <button 
              type="button"
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
                <h2 className="text-xl font-semibold text-foreground mb-2">{t('dashboard.goal')}</h2>
                <p className="text-3xl font-bold text-foreground">{todayNutrition.kcalTarget.toLocaleString('es-ES')} Kcal</p>
                <p className="text-sm font-normal text-muted-foreground mt-1">
                  {Math.max(0, todayNutrition.kcalTarget - todayNutrition.kcalConsumed).toLocaleString('es-ES')} kcal {t('dashboard.remaining')}
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
                className="cursor-pointer hover:bg-secondary/50 transition-colors rounded-2xl p-3 flex items-center gap-3"
                onClick={() => setShowAddWater(true)}
              >
                <ProgressRing
                  value={animatedWater}
                  max={waterGoal}
                  size={60}
                  strokeWidth={6}
                  label={null}
                  strokeColor="#60a5fa"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Droplet className="w-4 h-4" style={{ color: '#60a5fa' }} />
                    <p className="text-sm text-muted-foreground">{t('dashboard.waterShort', 'Agua')}</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold leading-none" style={{ fontSize: 'clamp(1.2rem, 5vw, 1.4rem)' }}>
                      {todayWater.toLocaleString('es-ES')}
                    </span>
                    <span className="text-xs text-muted-foreground">ml</span>
                  </div>
                </div>
              </div>
              
              <div 
                className="cursor-pointer hover:bg-secondary/50 transition-colors rounded-2xl p-3 flex items-center gap-3"
                onClick={() => setShowAddSteps(true)}
              >
                <ProgressRing
                  value={animatedBurn}
                  max={burnGoal}
                  size={60}
                  strokeWidth={6}
                  label={null}
                  strokeColor="#ff6b35"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Flame className="w-4 h-4" style={{ color: '#ff6b35' }} />
                    <p className="text-sm text-muted-foreground">{t('dashboard.burned')}</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold leading-none" style={{ fontSize: 'clamp(1.2rem, 5vw, 1.4rem)' }}>
                      {exerciseKcal.toLocaleString('es-ES')}
                    </span>
                    <span className="text-xs text-muted-foreground">kcal</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </StatsCard>

        {/* Macros horizontal card */}
        <StatsCard
          className="cursor-pointer hover:bg-secondary/50 transition-colors py-2.5"
          onClick={() => navigate('/comidas')}
        >
          {isLoading ? (
            <>
              <div className="flex items-center gap-3 mb-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-16" />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-base font-semibold text-foreground leading-tight whitespace-nowrap">
                  {t('dashboard.macros')}
                </h3>
                <div
                  role="progressbar"
                  aria-valuenow={totalMacroCals}
                  aria-valuemin={0}
                  aria-valuemax={calorieGoal}
                  className="h-2 w-full rounded-full bg-muted/60 overflow-hidden flex"
                >
                  <div
                    className="h-full transition-all duration-700 ease-out"
                    style={{ width: `${animateMacros ? getMacroWidth(proteinCals) : 0}%`, backgroundColor: 'hsl(var(--protein))' }}
                  />
                  <div
                    className="h-full transition-all duration-700 ease-out"
                    style={{ width: `${animateMacros ? getMacroWidth(fatCals) : 0}%`, backgroundColor: 'hsl(var(--fat))' }}
                  />
                  <div
                    className="h-full transition-all duration-700 ease-out"
                    style={{ width: `${animateMacros ? getMacroWidth(carbCals) : 0}%`, backgroundColor: 'hsl(var(--carbs))' }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex items-center justify-center gap-1.5 text-center flex-nowrap">
                  <span className="text-muted-foreground text-xs leading-none whitespace-nowrap">{t('dashboard.proteins')}</span>
                  <span className="text-foreground text-sm font-semibold leading-none whitespace-nowrap">
                    {todayNutrition.macrosG.protein} g
                  </span>
                </div>
                <div className="flex items-center justify-center gap-1.5 text-center flex-nowrap">
                  <span className="text-muted-foreground text-xs leading-none whitespace-nowrap">{t('dashboard.fats')}</span>
                  <span className="text-foreground text-sm font-semibold leading-none whitespace-nowrap">
                    {todayNutrition.macrosG.fat} g
                  </span>
                </div>
                <div className="flex items-center justify-center gap-1.5 text-center flex-nowrap">
                  <span className="text-muted-foreground text-xs leading-none whitespace-nowrap">{t('dashboard.carbs')}</span>
                  <span className="text-foreground text-sm font-semibold leading-none whitespace-nowrap">
                    {todayNutrition.macrosG.carbs} g
                  </span>
                </div>
              </div>
            </>
          )}
        </StatsCard>

        {/* Weight + Steps row */}
        <div className="grid grid-cols-2 gap-3 items-stretch">
          <StatsCard 
            className="py-2.5 cursor-pointer hover:bg-secondary/50 transition-colors h-full min-w-0"
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
                  <h3 className="text-base font-semibold text-foreground leading-none">{t('dashboard.weight')}</h3>
                </div>
                {todayWeight !== null ? (
                  <>
                    <p className="text-3xl font-bold text-foreground mb-1.5 leading-none">{todayWeight.toFixed(1)} Kg</p>
                    <p className="text-xs text-muted-foreground">{t('common.today')}</p>
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
                    {t('dashboard.addWeight')}
                  </Button>
                )}
              </>
            )}
          </StatsCard>

          <StatsCard 
            className="py-2.5 cursor-pointer hover:bg-secondary/50 transition-colors h-full min-w-0"
            onClick={() => setShowAddSteps(true)}
          >
            {isLoading ? (
              <>
                <Skeleton className="h-6 w-20 mb-4" />
                <Skeleton className="h-10 w-32 mb-2" />
                <Skeleton className="h-4 w-28" />
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Footprints className="w-4 h-4 text-foreground" />
                  <h3 className="text-base font-semibold text-foreground leading-none">{t('dashboard.steps')}</h3>
                </div>
                <p className="text-3xl font-bold text-foreground mb-1.5 leading-none">{todaySteps.toLocaleString('es-ES')}</p>
                <p className="text-xs text-muted-foreground">{t('dashboard.stepsGoal')}</p>
              </>
            )}
          </StatsCard>
        </div>

        {/* Gym Session Card */}
        <StatsCard 
          className="cursor-pointer hover:bg-secondary transition-colors"
          onClick={() => navigate('/gimnasio')}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-1">{t('dashboard.gymSession')}</h3>
              <p className="text-sm text-muted-foreground">{t('dashboard.trackWorkout')}</p>
            </div>
            <button className="w-12 h-12 rounded-full bg-primary flex items-center justify-center hover:scale-105 transition-transform">
              <ArrowRight className="w-6 h-6 text-primary-foreground" />
            </button>
          </div>
        </StatsCard>
      </div>

      <BottomNav />

      {/* Add Water Dialog */}
      <Dialog open={showAddWater} onOpenChange={setShowAddWater}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dashboard.waterShort', 'Agua')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              id="water-amount"
              type="number"
              inputMode="numeric"
              value={waterInput}
              onChange={(e) => setWaterInput(e.target.value)}
              placeholder="300"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddWater(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveWater} disabled={!waterInput || savingWater}>
              {savingWater ? t('profile.saving') : t('common.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Steps Dialog (matching water style) */}
      <Dialog open={showAddSteps} onOpenChange={setShowAddSteps}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dashboard.steps')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              id="steps-amount"
              type="number"
              inputMode="numeric"
              value={newStepsAmount}
              onChange={(e) => setNewStepsAmount(e.target.value)}
              placeholder="8000"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddSteps(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddSteps} disabled={!newStepsAmount || savingSteps}>
              {savingSteps ? t('profile.saving') : t('common.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
