import { logger } from "@/lib/logger";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Scale, Footprints, Droplet } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, eachDayOfInterval, format } from "date-fns";
import { es } from "date-fns/locale";
import { BottomNav } from "@/components/BottomNav";
import { StatsCard } from "@/components/StatsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps, Scatter, ReferenceLine } from "recharts";
import { useTranslation } from "react-i18next";
import { useProfile } from "@/hooks/useProfile";

interface WeightEntry {
  date: string;
  kg: number;
}

interface StepsEntry {
  date: string;
  steps: number;
}

interface WaterEntry {
  date: string;
  ml: number;
}

const Analytics = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const focusSection = searchParams.get('focus');
  const shouldAddWeight = searchParams.get('add') === 'true';

  type DateRange = 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'last3Months' | 'last6Months' | 'all';
  const [weightRange, setWeightRange] = useState<DateRange>('thisWeek');
  const [stepsRange, setStepsRange] = useState<DateRange>('thisWeek');
  const [waterRange, setWaterRange] = useState<DateRange>('thisWeek');
  const [showAddWeight, setShowAddWeight] = useState(false);
  const [newWeight, setNewWeight] = useState("");
  const [newWeightDate, setNewWeightDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showAddWater, setShowAddWater] = useState(false);
  const [newWaterAmount, setNewWaterAmount] = useState("");
  const [newWaterDate, setNewWaterDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [targetWeightGoal, setTargetWeightGoal] = useState<number | null>(null);
  const [savingSteps, setSavingSteps] = useState(false);
  const [weightProgress, setWeightProgress] = useState(0);
  const [stepsProgress, setStepsProgress] = useState(0);
  const [waterProgress, setWaterProgress] = useState(0);
  const { profile } = useProfile();

  const bumpSeeds = () => {
    const duration = 900;
    const start = performance.now();
    setWeightProgress(0);
    setStepsProgress(0);
    setWaterProgress(0);
    const step = (ts: number) => {
      const progress = Math.min(1, (ts - start) / duration);
      setWeightProgress(progress);
      setStepsProgress(progress);
      setWaterProgress(progress);
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  };

  // Color scheme
  const COLORS = {
    weight: "#8B7CF6",
    steps: "#ff6b35",
    water: "#60a5fa",
  };

  // Load data from Supabase
  const [weightData, setWeightData] = useState<WeightEntry[]>([]);
  const [stepsData, setStepsData] = useState<StepsEntry[]>([]);
  const [waterData, setWaterData] = useState<WaterEntry[]>([]);
  const [showAddSteps, setShowAddSteps] = useState(false);
  const [newStepsAmount, setNewStepsAmount] = useState("");
  const [newStepsDate, setNewStepsDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      // Load weight data
      const { data: weights } = await supabase
        .from('daily_weight')
        .select('date, weight')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (weights) {
        setWeightData(weights.map(w => ({ date: w.date, kg: Number(w.weight) })));
      }

      // Load steps data
      const { data: steps } = await supabase
        .from('daily_steps')
        .select('date, steps')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (steps) {
        setStepsData(steps.map(s => ({ date: s.date, steps: s.steps })));
      }

      // Load water data
      const { data: water } = await supabase
        .from('daily_water_intake')
        .select('date, ml_consumed')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (water) {
        setWaterData(water.map(w => ({ date: w.date, ml: w.ml_consumed })));
      }

      const { data: profileRow } = await supabase
        .from('profiles')
        .select('target_weight')
        .eq('id', user.id)
        .maybeSingle();
      const target = profileRow?.target_weight ?? null;
      setTargetWeightGoal(target);
    };

    loadData();

    const handleWaterUpdated = () => loadData();
    window.addEventListener('waterUpdated', handleWaterUpdated);
    return () => window.removeEventListener('waterUpdated', handleWaterUpdated);
  }, [user]);

  // Scroll to focused section and open add dialogs if needed
  useEffect(() => {
    if (focusSection) {
      setTimeout(() => {
        const element = document.getElementById(focusSection);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
    if (shouldAddWeight && focusSection === 'weight') {
      setShowAddWeight(true);
    }
      if (focusSection === 'water') {
        // Could add auto-open for water dialog here if needed
      }
    if (focusSection === 'steps') {
      // Could auto-open steps dialog if needed
    }
  }, [focusSection, shouldAddWeight]);

  const handleAddSteps = async () => {
    if (!user?.id || !newStepsAmount || !newStepsDate) return;
    setSavingSteps(true);
    try {
      const stepsValue = Number(newStepsAmount);
      if (Number.isNaN(stepsValue) || stepsValue < 0) throw new Error('Invalid steps');

      const { data: existing } = await supabase
        .from('daily_steps')
        .select('steps')
        .eq('user_id', user.id)
        .eq('date', newStepsDate)
        .maybeSingle();

      const newTotal = (existing?.steps || 0) + stepsValue;

      const { error } = await supabase
        .from('daily_steps')
        .upsert({
          user_id: user.id,
          date: newStepsDate,
          steps: newTotal,
        }, { onConflict: 'user_id,date' });

      if (error) throw error;

      const { data: steps } = await supabase
        .from('daily_steps')
        .select('date, steps')
        .eq('user_id', user.id)
        .order('date', { ascending: true });
      if (steps) setStepsData(steps.map(s => ({ date: s.date, steps: s.steps })));

      setShowAddSteps(false);
      setNewStepsAmount("");
      queryClient.invalidateQueries({ queryKey: ['dashboard', user.id] });
      queryClient.invalidateQueries({ queryKey: ['gamification', user.id] });
    } catch (e) {
      logger.error('Error saving steps', e);
      toast({ title: 'Error al guardar pasos', description: String((e as any)?.message || e), variant: 'destructive' });
    } finally {
      setSavingSteps(false);
    }
  };

  const getDateRange = (range: DateRange): { startDate: Date; endDate: Date } => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (range) {
      case 'thisWeek':
        // Asegurar que la semana va de lunes a domingo
        startDate = startOfWeek(today, { weekStartsOn: 1, locale: es });
        endDate = endOfWeek(today, { weekStartsOn: 1, locale: es });
        break;
      case 'lastWeek':
        const lastWeekStart = subWeeks(today, 1);
        startDate = startOfWeek(lastWeekStart, { weekStartsOn: 1, locale: es });
        endDate = endOfWeek(lastWeekStart, { weekStartsOn: 1, locale: es });
        break;
      case 'thisMonth':
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
        break;
      case 'lastMonth':
        const lastMonth = subMonths(today, 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
        break;
      case 'last3Months':
        startDate = subMonths(today, 3);
        endDate = today;
        break;
      case 'last6Months':
        startDate = subMonths(today, 6);
        endDate = today;
        break;
      case 'all':
        startDate = subMonths(today, 24);
        endDate = today;
        break;
    }

    return { startDate, endDate };
  };

  const getAllDaysInRange = (startDate: Date, endDate: Date): string[] => {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
  return days.map(day => format(day, 'yyyy-MM-dd'));
  };

  const getFilteredDataWithAllDays = <T extends { date: string }>(
    data: T[],
    range: DateRange,
    fillValue: Partial<T>
  ): T[] => {
    const { startDate, endDate } = getDateRange(range);
    const allDays = getAllDaysInRange(startDate, endDate);
    
    return allDays.map(date => {
      const existingEntry = data.find(entry => entry.date === date);
      return existingEntry || { date, ...fillValue } as T;
    });
  };

  // Custom tooltip components
  const WeightTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as WeightEntry & { day: string; kgPredicted?: number };
      const kg = data.kg ?? data.kgPredicted ?? null;
      if (kg === null) return null;
      const isPredicted = data.kg === null;
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold text-foreground mb-1">
            {new Date(data.date).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}
          </p>
          <p className="text-base font-bold" style={{ color: COLORS.weight, opacity: isPredicted ? 0.6 : 1 }}>
            {kg.toFixed(2)} kg{isPredicted ? ' (est.)' : ''}
          </p>
        </div>
      );
    }
    return null;
  };

  const StepsTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as StepsEntry & { day: string };
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold text-foreground mb-1">
            {new Date(data.date).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}
          </p>
          <p className="text-base font-bold" style={{ color: COLORS.steps }}>
            {data.steps.toLocaleString(i18n.language)} {t('analytics.steps').toLowerCase()}
          </p>
        </div>
      );
    }
    return null;
  };

  const WaterTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as WaterEntry & { day: string };
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold text-foreground mb-1">
            {new Date(data.date).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}
          </p>
          <p className="text-base font-bold" style={{ color: COLORS.water }}>
            {data.ml.toLocaleString(i18n.language)} ml
          </p>
        </div>
      );
    }
    return null;
  };

  const filteredWeightData = getFilteredDataWithAllDays(weightData, weightRange, { kg: null as any });
  const filteredStepsData = getFilteredDataWithAllDays(stepsData, stepsRange, { steps: 0 });
  const filteredWaterData = getFilteredDataWithAllDays(waterData, waterRange, { ml: 0 });

  const { startDate: weightStartDate } = getDateRange(weightRange);
  const prevWeightEntry = [...weightData]
    .filter(d => new Date(d.date) < weightStartDate)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .pop();

  const stepsGoal = profile?.steps_goal ?? 20000;
  const waterGoal = profile?.water_goal_ml ?? 2000;

  const weightDataForChart = prevWeightEntry ? [prevWeightEntry, ...filteredWeightData] : filteredWeightData;

  const weightConfig = getWeightYAxisConfig(weightDataForChart);
  const stepsConfig = getStepsYAxisConfig(filteredStepsData, stepsGoal);
  const waterConfig = getWaterYAxisConfig(filteredWaterData, waterGoal);

  const weightChartData = formatChartData(weightDataForChart, weightRange).map((entry, idx) => {
    if (prevWeightEntry && idx === 0) {
      return { ...entry, day: "", isPadding: true };
    }
    return entry;
  });
  const stepsChartData = formatChartData(filteredStepsData, stepsRange);
  const waterChartData = formatChartData(filteredWaterData, waterRange);

  const sanitizedWeightData = weightChartData.map((entry) => {
    if (!Number.isFinite(entry.kg)) return { ...entry, kg: null as any };
    return entry;
  });

  const hasWeightData = sanitizedWeightData.some((entry) => entry.kg !== null);

  const animatedWeightData = sanitizedWeightData.map((entry) => {
    if (!hasWeightData || entry.kg === null) return { ...entry, kg: null as any };
    return {
      ...entry,
      kg: weightConfig.baseline + (entry.kg - weightConfig.baseline) * weightProgress,
    };
  });

  const combinedWeightData = computeWeightTrendLine(animatedWeightData);
  const combinedWeightConfig = weightConfig;

  const animatedStepsData = stepsChartData.map((entry) => ({
    ...entry,
    steps: entry.steps * stepsProgress,
  }));

  const animatedWaterData = waterChartData.map((entry) => ({
    ...entry,
    ml: entry.ml * waterProgress,
  }));

  useEffect(() => {
    const hasData = weightData.length > 0 || stepsData.length > 0 || waterData.length > 0;
    if (!hasData) return;
    bumpSeeds();
  }, [weightData, stepsData, waterData, weightRange, stepsRange, waterRange]);

  const addWeight = async () => {
    if (!newWeight || isNaN(Number(newWeight)) || !user) return;

    const { error } = await supabase
      .from('daily_weight')
      .upsert({
        user_id: user.id,
        date: newWeightDate,
        weight: Number(newWeight)
      }, {
        onConflict: 'user_id,date'
      });

    if (error) {
      toast({ title: 'Error al guardar peso', description: error.message, variant: 'destructive' });
      return;
    }

    if (!error) {
      // Update current_weight in profiles table
      await supabase
        .from('profiles')
        .update({
          current_weight: Number(newWeight)
        })
        .eq('id', user.id);

      const newEntry: WeightEntry = {
        date: newWeightDate,
        kg: Number(newWeight)
      };
      
      const updatedData = [...weightData.filter(w => w.date !== newWeightDate), newEntry].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      setWeightData(updatedData);
      queryClient.invalidateQueries({ queryKey: ['gamification', user.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', user.id] });
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      setShowAddWeight(false);
      setNewWeight("");
      setNewWeightDate(format(new Date(), 'yyyy-MM-dd'));
    }
  };

  const addWater = async () => {
    if (!newWaterAmount || isNaN(Number(newWaterAmount)) || !user) return;
    
    // Get existing water data for the selected date
    const { data: existingWater } = await supabase
      .from('daily_water_intake')
      .select('ml_consumed')
      .eq('user_id', user.id)
      .eq('date', newWaterDate)
      .maybeSingle();

    const currentAmount = existingWater?.ml_consumed || 0;
    const newTotal = currentAmount + Number(newWaterAmount);

    const { error } = await supabase
      .from('daily_water_intake')
      .upsert({
        user_id: user.id,
        date: newWaterDate,
        ml_consumed: newTotal
      }, {
        onConflict: 'user_id,date'
      });

    if (error) {
      toast({ title: 'Error al guardar agua', description: error.message, variant: 'destructive' });
      return;
    }

    if (!error) {
      const newEntry: WaterEntry = {
        date: newWaterDate,
        ml: newTotal
      };
      
      const updatedData = [...waterData.filter(w => w.date !== newWaterDate), newEntry].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      setWaterData(updatedData);
      queryClient.invalidateQueries({ queryKey: ['dashboard', user.id] });
      queryClient.invalidateQueries({ queryKey: ['gamification', user.id] });
      setShowAddWater(false);
      setNewWaterAmount("");
      setNewWaterDate(format(new Date(), 'yyyy-MM-dd'));
    }
  };

  function getXLabel(dateStr: string, range: DateRange): string {
    const d = new Date(dateStr);
    if (range === 'thisWeek' || range === 'lastWeek') {
      return format(d, 'EEE', { locale: es }); // Lun, Mar...
    }
    if (range === 'lastMonth' || range === 'thisMonth') {
      return format(d, 'd MMM', { locale: es }); // 4 abr
    }
    return format(d, 'MMM yy', { locale: es }); // abr 25
  }

  function getXInterval(dataLength: number, range: DateRange): number | 'preserveStartEnd' {
    if (range === 'thisWeek' || range === 'lastWeek') return 0; // muestra todos (7 días)
    if (range === 'lastMonth' || range === 'thisMonth') return Math.floor(dataLength / 5);
    if (range === 'last3Months') return Math.floor(dataLength / 6);
    return Math.floor(dataLength / 5);
  }

  function formatChartData(data: WeightEntry[] | StepsEntry[] | WaterEntry[], range: DateRange) {
    return data.map(entry => ({
      ...entry,
      day: getXLabel(entry.date, range),
    }));
  }

  function getWeightYAxisConfig(data: WeightEntry[]) {
    const valid = data.filter(d => d.kg !== null && Number.isFinite(d.kg));
    if (valid.length === 0) {
      return { ticks: [60, 70, 80], domain: [60, 80] as [number, number], baseline: 70 };
    }
    const minW = Math.min(...valid.map(d => d.kg));
    const maxW = Math.max(...valid.map(d => d.kg));
    const spread = maxW - minW;
    const padding = Math.max(spread * 0.2, 0.5);
    const rawMin = minW - padding;
    const rawMax = maxW + padding;
    const step = spread <= 2 ? 0.5 : spread <= 6 ? 1 : 2;
    const domainMin = Math.floor(rawMin / step) * step;
    const domainMax = Math.ceil(rawMax / step) * step;
    const ticks: number[] = [];
    for (let v = domainMin; v <= domainMax + 1e-9; v += step) {
      ticks.push(Number(v.toFixed(1)));
    }
    const baseline = valid[0].kg;
    return { ticks, domain: [domainMin, domainMax] as [number, number], baseline };
  }

  function getStepsYAxisConfig(data: StepsEntry[], goal: number) {
    const values = data.map(d => d.steps);
    const maxVal = values.length ? Math.max(...values) : 0;
    const top = Math.max(maxVal, goal || 0);
    const step = top <= 10000 ? 2000 : top <= 30000 ? 5000 : 10000;
    const maxY = Math.ceil((top * 1.15) / step) * step;
    const ticks: number[] = [];
    for (let v = 0; v <= maxY; v += step) ticks.push(v);
    return { domain: [0, maxY] as [number, number], ticks };
  }

  function computeWeightTrendLine(data: (WeightEntry & { day?: string })[]) {
    const valid = data.filter(d => d.kg !== null && Number.isFinite(d.kg));
    if (valid.length < 2) return data.map(d => ({ ...d, kgTrend: undefined as number | undefined }));
    const t0 = new Date(valid[0].date).getTime();
    const xs = valid.map(d => (new Date(d.date).getTime() - t0) / 86400000);
    const ys = valid.map(d => d.kg);
    const n = xs.length;
    const sumX = xs.reduce((a, b) => a + b, 0);
    const sumY = ys.reduce((a, b) => a + b, 0);
    const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
    const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);
    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return data.map(d => ({ ...d, kgTrend: undefined as number | undefined }));
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    return data.map(d => {
      const x = (new Date(d.date).getTime() - t0) / 86400000;
      return {
        ...d,
        kgTrend: Math.round((slope * x + intercept) * 100) / 100,
      };
    });
  }

  function getWaterYAxisConfig(data: WaterEntry[], goal: number) {
    const values = data.map(d => d.ml);
    const maxVal = values.length ? Math.max(...values) : 0;
    const top = Math.max(maxVal, goal || 0, 1000);
    const step = top <= 3000 ? 500 : 1000;
    const maxY = Math.ceil((top * 1.15) / step) * step;
    const ticks: number[] = [];
    for (let v = 0; v <= maxY; v += step) ticks.push(v);
    return { domain: [0, maxY] as [number, number], ticks };
  }

  const validWeightData = filteredWeightData.filter(d => d.kg !== null);
  const weightDelta = validWeightData.length >= 2 
    ? validWeightData[validWeightData.length - 1].kg - validWeightData[0].kg
    : null;

  const startWeight = validWeightData.length >= 1 ? validWeightData[0].kg : null;
  const endWeight = validWeightData.length >= 1 ? validWeightData[validWeightData.length - 1].kg : null;
  const weightTrendClass = (() => {
    if (targetWeightGoal == null || startWeight == null || endWeight == null) {
      return 'text-foreground';
    }
    const before = Math.abs(targetWeightGoal - startWeight);
    const after = Math.abs(targetWeightGoal - endWeight);
    if (after < before) return 'text-green-500';
    if (after > before) return 'text-destructive';
    return 'text-foreground';
  })();

  const lastWeight = validWeightData.length > 0 
    ? validWeightData[validWeightData.length - 1]
    : null;

  const stepsAverage = filteredStepsData.length > 0
    ? Math.round(filteredStepsData.reduce((sum, entry) => sum + entry.steps, 0) / filteredStepsData.length)
    : 0;

  const stepsMax = filteredStepsData.length > 0
    ? Math.max(...filteredStepsData.map(entry => entry.steps))
    : 0;

  const waterTotal = filteredWaterData.reduce((sum, entry) => sum + entry.ml, 0);
  const waterAverage = filteredWaterData.length > 0
    ? Math.round(waterTotal / filteredWaterData.length)
    : 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        <h1 className="text-3xl font-bold text-foreground mb-6">{t('analytics.title')}</h1>

        {/* Weight Card */}
        <StatsCard id="weight">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5" style={{ color: COLORS.weight }} />
              <h2 className="text-xl font-semibold text-foreground">{t('analytics.weight')}</h2>
            </div>
            <Button size="sm" onClick={() => setShowAddWeight(true)} aria-label={t('common.add')}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Range Selector */}
          {(() => {
            const opts = [
              { key: 'thisWeek', label: '1W' },
              { key: 'lastMonth', label: '1M' },
              { key: 'last3Months', label: '3M' },
              { key: 'last6Months', label: '6M' },
              { key: 'all', label: 'All' },
            ] as const;
            return (
              <div className="flex bg-muted/40 rounded-full p-1 mb-4 gap-0.5">
                {opts.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setWeightRange(key)}
                    className={`flex-1 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                      weightRange === key
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            );
          })()}

          {/* Legend */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1.5">
              <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke={COLORS.weight} strokeWidth="2.5" strokeLinecap="round" /></svg>
              <span className="text-xs text-muted-foreground">Registrado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke={COLORS.weight} strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" opacity="0.5" /></svg>
              <span className="text-xs text-muted-foreground">Tendencia</span>
            </div>
          </div>

          {/* Chart */}
          <div className="h-48 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={combinedWeightData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="day"
                  stroke="hsl(var(--border))"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickFormatter={(v, idx) => (weightChartData[idx]?.isPadding ? '' : v)}
                  interval={getXInterval(weightChartData.length, weightRange)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="hsl(var(--border))"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  ticks={combinedWeightConfig.ticks}
                  domain={combinedWeightConfig.domain}
                  tickFormatter={(v) => {
                    const n = Number(v);
                    return Number.isInteger(n) ? String(n) : n.toFixed(1);
                  }}
                  width={40}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<WeightTooltip />} />
                <Line
                  type="monotone"
                  dataKey="kg"
                  stroke={COLORS.weight}
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="kgTrend"
                  stroke={COLORS.weight}
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  strokeOpacity={0.45}
                  dot={false}
                  activeDot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('analytics.lastMeasurement')}</p>
              <p className="text-lg font-semibold text-foreground">
                {lastWeight ? `${lastWeight.kg.toFixed(2)} kg` : '-'}
              </p>
              {lastWeight && (
                <p className="text-xs text-muted-foreground">
                  {new Date(lastWeight.date).toLocaleDateString(i18n.language)}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('analytics.variation')}</p>
              <p className={`text-lg font-semibold ${weightTrendClass}`}>
                {weightDelta === null ? '-' : `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)} kg`}
              </p>
              <p className="text-xs text-muted-foreground">
                {weightRange === 'thisWeek' ? t('analytics.thisWeek') : 
                 weightRange === 'lastWeek' ? t('analytics.lastWeek') :
                 weightRange === 'thisMonth' ? t('analytics.thisMonth') :
                 weightRange === 'lastMonth' ? t('analytics.lastMonth') :
                 weightRange === 'last3Months' ? t('analytics.last3Months') : t('analytics.last6Months')}
              </p>
            </div>
          </div>
        </StatsCard>

        {/* Steps Card */}
        <StatsCard id="steps">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Footprints className="w-5 h-5" style={{ color: COLORS.steps }} />
              <h2 className="text-xl font-semibold text-foreground">{t('analytics.steps')}</h2>
            </div>
            <Button size="sm" onClick={() => setShowAddSteps(true)} aria-label={t('common.add')}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Range Selector */}
          {(() => {
            const opts = [
              { key: 'thisWeek', label: '1W' },
              { key: 'lastMonth', label: '1M' },
              { key: 'last3Months', label: '3M' },
              { key: 'last6Months', label: '6M' },
              { key: 'all', label: 'All' },
            ] as const;
            return (
              <div className="flex bg-muted/40 rounded-full p-1 mb-4 gap-0.5">
                {opts.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setStepsRange(key)}
                    className={`flex-1 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                      stepsRange === key
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            );
          })()}

          {/* Chart */}
          <div className="h-48 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={animatedStepsData}
                margin={{ top: 16, right: 8, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="day"
                  stroke="hsl(var(--border))"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  interval={getXInterval(stepsChartData.length, stepsRange)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="hsl(var(--border))"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  ticks={stepsConfig.ticks}
                  domain={stepsConfig.domain}
                  tickFormatter={(val) => {
                    const n = Number(val);
                    return n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(n);
                  }}
                  width={36}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<StepsTooltip />} />
                <ReferenceLine
                  y={stepsGoal}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="4 4"
                />
                <Bar 
                  dataKey="steps" 
                  fill={COLORS.steps}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('analytics.average')}</p>
              <p className="text-lg font-semibold text-foreground">
                {stepsAverage.toLocaleString(i18n.language)}
              </p>
              <p className="text-xs text-muted-foreground">
                {stepsRange === 'thisWeek' ? t('analytics.thisWeek') : 
                 stepsRange === 'lastWeek' ? t('analytics.lastWeek') :
                 stepsRange === 'thisMonth' ? t('analytics.thisMonth') : t('analytics.lastMonth')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('analytics.max')}</p>
              <p className="text-lg font-semibold text-foreground">
                {stepsMax.toLocaleString(i18n.language)}
              </p>
              <p className="text-xs text-muted-foreground">{stepsRange === 'thisWeek' ? t('analytics.thisWeek') : 
                 stepsRange === 'lastWeek' ? t('analytics.lastWeek') :
                 stepsRange === 'thisMonth' ? t('analytics.thisMonth') : t('analytics.lastMonth')}</p>
            </div>
          </div>
        </StatsCard>

        {/* Add Steps Dialog */}
        <Dialog open={showAddSteps} onOpenChange={setShowAddSteps}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('analytics.addSteps', 'Añadir pasos')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="steps-amount">{t('analytics.steps')}</Label>
                <Input
                  id="steps-amount"
                  type="number"
                  inputMode="numeric"
                  value={newStepsAmount}
                  onChange={(e) => setNewStepsAmount(e.target.value)}
                  placeholder="8000"
                />
              </div>
              <div>
                <Label htmlFor="steps-date">{t('analytics.date')}</Label>
                <Input
                  id="steps-date"
                  type="date"
                  value={newStepsDate}
                  onChange={(e) => setNewStepsDate(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddSteps(false)} disabled={savingSteps}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleAddSteps} disabled={savingSteps || !newStepsAmount}>
                {savingSteps ? t('profile.saving') : t('common.add')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Water Card */}
        <StatsCard id="water">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Droplet className="w-5 h-5" style={{ color: COLORS.water }} />
              <h2 className="text-xl font-semibold text-foreground">{t('analytics.water')}</h2>
            </div>
            <Button size="sm" onClick={() => setShowAddWater(true)} aria-label={t('common.add')}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Range Selector */}
          {(() => {
            const opts = [
              { key: 'thisWeek', label: '1W' },
              { key: 'lastMonth', label: '1M' },
              { key: 'last3Months', label: '3M' },
              { key: 'last6Months', label: '6M' },
              { key: 'all', label: 'All' },
            ] as const;
            return (
              <div className="flex bg-muted/40 rounded-full p-1 mb-4 gap-0.5">
                {opts.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setWaterRange(key)}
                    className={`flex-1 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                      waterRange === key
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            );
          })()}

          {/* Chart */}
          <div className="h-48 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={animatedWaterData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="day"
                  stroke="hsl(var(--border))"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  interval={getXInterval(waterChartData.length, waterRange)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="hsl(var(--border))"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  ticks={waterConfig.ticks}
                  domain={waterConfig.domain}
                  tickFormatter={(val) => {
                    const n = Number(val);
                    return n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}L` : `${n}`;
                  }}
                  width={36}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<WaterTooltip />} />
                <ReferenceLine
                  y={waterGoal}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="4 4"
                />
                <Bar 
                  dataKey="ml" 
                  fill={COLORS.water}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('analytics.average')}</p>
              <p className="text-lg font-semibold text-foreground">
                {waterAverage.toLocaleString(i18n.language)} ml
              </p>
              <p className="text-xs text-muted-foreground">
                {waterRange === 'thisWeek' ? t('analytics.thisWeek') : 
                 waterRange === 'lastWeek' ? t('analytics.lastWeek') :
                 waterRange === 'thisMonth' ? t('analytics.thisMonth') : t('analytics.lastMonth')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('analytics.total')}</p>
              <p className="text-lg font-semibold text-foreground">
                {waterTotal.toLocaleString(i18n.language)} ml
              </p>
              <p className="text-xs text-muted-foreground">{waterRange === 'thisWeek' ? t('analytics.thisWeek') : 
                 waterRange === 'lastWeek' ? t('analytics.lastWeek') :
                 waterRange === 'thisMonth' ? t('analytics.thisMonth') : t('analytics.lastMonth')}</p>
            </div>
          </div>
        </StatsCard>
      </div>

      {/* Add Water Dialog */}
      <Dialog open={showAddWater} onOpenChange={setShowAddWater}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('analytics.addWater')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="water-amount">{t('analytics.amount')} (ml)</Label>
              <Input
                id="water-amount"
                type="number"
                placeholder="250"
                value={newWaterAmount}
                onChange={(e) => setNewWaterAmount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="water-date">{t('analytics.date')}</Label>
              <Input
                id="water-date"
                type="date"
                value={newWaterDate}
                onChange={(e) => setNewWaterDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddWater(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={addWater}>{t('common.add')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Weight Dialog */}
      <Dialog open={showAddWeight} onOpenChange={setShowAddWeight}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('analytics.addWeight')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="weight">{t('analytics.weight')} (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder="72.5"
              />
            </div>
            <div>
              <Label htmlFor="date">{t('analytics.date')}</Label>
              <Input
                id="date"
                type="date"
                value={newWeightDate}
                onChange={(e) => setNewWeightDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddWeight(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={addWeight}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Analytics;
