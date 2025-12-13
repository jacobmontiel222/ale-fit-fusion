import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Scale, Footprints, Droplet } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, eachDayOfInterval, format } from "date-fns";
import { es } from "date-fns/locale";
import { BottomNav } from "@/components/BottomNav";
import { StatsCard } from "@/components/StatsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps, Scatter } from "recharts";
import { useTranslation } from "react-i18next";

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
  const { t, i18n } = useTranslation();
  const focusSection = searchParams.get('focus');
  const shouldAddWeight = searchParams.get('add') === 'true';

  type DateRange = 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'last3Months' | 'last6Months';
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

      // Notifica a otras pantallas para que refresquen pasos
      window.dispatchEvent(new Event('stepsUpdated'));
    } catch (e) {
      console.error('Error saving steps', e);
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
      const data = payload[0].payload as WeightEntry & { day: string };
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold text-foreground mb-1">
            {new Date(data.date).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}
          </p>
          <p className="text-base font-bold" style={{ color: COLORS.weight }}>
            {data.kg.toFixed(2)} kg
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

  const weightConfig = getWeightYAxisConfig(filteredWeightData);
  const stepsConfig = getStepsYAxisConfig(filteredStepsData);
  const waterConfig = getWaterYAxisConfig();

  const weightChartData = formatChartData(filteredWeightData);
  const stepsChartData = formatChartData(filteredStepsData);
  const waterChartData = formatChartData(filteredWaterData);

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

    if (!error) {
      const newEntry: WaterEntry = {
        date: newWaterDate,
        ml: newTotal
      };
      
      const updatedData = [...waterData.filter(w => w.date !== newWaterDate), newEntry].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      setWaterData(updatedData);
      setShowAddWater(false);
      setNewWaterAmount("");
      setNewWaterDate(format(new Date(), 'yyyy-MM-dd'));
    }
  };

  function formatChartData(data: WeightEntry[] | StepsEntry[] | WaterEntry[]) {
    return data.map(entry => ({
      ...entry,
      day: format(new Date(entry.date), 'd', { locale: es })
    }));
  }

  function calculateNiceYAxisTicks(data: WeightEntry[]): number[] {
    const validData = data.filter(d => d.kg !== null);
    if (validData.length === 0) return [-3, 0, 3];

    const minW = Math.min(...validData.map(d => d.kg));
    const maxW = Math.max(...validData.map(d => d.kg));
    const range = maxW - minW;
    const mid = (minW + maxW) / 2;
    const base = Math.round(mid);

    let halfRange = 3;
    if (range <= 1.5) halfRange = 2;
    else if (range <= 3) halfRange = 3;
    else halfRange = Math.min(5, Math.ceil(range / 2) + 1);

    const min = base - halfRange;
    const max = base + halfRange;
    const step = range <= 2 ? 0.5 : 1;

    const ticks: number[] = [];
    for (let v = min; v <= max + 1e-6; v += step) {
      ticks.push(Number(v.toFixed(1)));
    }
    return ticks;
  }

  function getWeightYAxisConfig(data: WeightEntry[]) {
    const ticks = calculateNiceYAxisTicks(data);
    const domain: [number, number] = [ticks[0] ?? -3, ticks[ticks.length - 1] ?? 3];
    const baseline = data.find(d => d.kg != null)?.kg ?? 0;
    return { ticks, domain, baseline };
  }

  function getStepsYAxisConfig(data: StepsEntry[]) {
    const values = data.map(d => d.steps);
    const maxVal = values.length ? Math.max(...values) : 0;
    const step = 5000;
    let maxY = Math.ceil(maxVal / step) * step || step;
    if (maxY < 20000) {
      maxY = 20000;
    }
    if (maxY - maxVal < step * 0.15) {
      maxY += step;
    }
    const ticks: number[] = [];
    for (let v = 0; v <= maxY; v += step) {
      ticks.push(v);
    }
    return { domain: [0, maxY] as [number, number], ticks };
  }

  function getWaterYAxisConfig() {
    const max = 6000;
    const ticks = [0, 2000, 4000, 6000];
    return { domain: [0, max] as [number, number], ticks };
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
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant={weightRange === 'thisWeek' ? "default" : "outline"}
              size="sm"
              onClick={() => setWeightRange('thisWeek')}
            >
              {t('analytics.thisWeek')}
            </Button>
            <Button
              variant={weightRange === 'lastWeek' ? "default" : "outline"}
              size="sm"
              onClick={() => setWeightRange('lastWeek')}
            >
              {t('analytics.lastWeek')}
            </Button>
            <Button
              variant={weightRange === 'thisMonth' ? "default" : "outline"}
              size="sm"
              onClick={() => setWeightRange('thisMonth')}
            >
              {t('analytics.thisMonth')}
            </Button>
            <Button
              variant={weightRange === 'lastMonth' ? "default" : "outline"}
              size="sm"
              onClick={() => setWeightRange('lastMonth')}
            >
              {t('analytics.lastMonth')}
            </Button>
            <Button
              variant={weightRange === 'last3Months' ? "default" : "outline"}
              size="sm"
              onClick={() => setWeightRange('last3Months')}
            >
              {t('analytics.last3Months')}
            </Button>
            <Button
              variant={weightRange === 'last6Months' ? "default" : "outline"}
              size="sm"
              onClick={() => setWeightRange('last6Months')}
            >
              {t('analytics.last6Months')}
            </Button>
          </div>

          {/* Chart */}
          <div className="h-48 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={animatedWeightData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="day" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  ticks={weightConfig.ticks}
                  domain={weightConfig.domain}
                  tickFormatter={(value) => {
                    const v = Number(value);
                    return Number.isInteger(v) ? v.toString() : v.toFixed(1);
                  }}
                  width={56}
                />
                <Tooltip content={<WeightTooltip />} />
                <Scatter
                  dataKey="kg"
                  fill={COLORS.weight}
                  shape="circle"
                  isAnimationActive={false}
                  connectNulls
                />
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
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant={stepsRange === 'thisWeek' ? "default" : "outline"}
              size="sm"
              onClick={() => setStepsRange('thisWeek')}
            >
              {t('analytics.thisWeek')}
            </Button>
            <Button
              variant={stepsRange === 'lastWeek' ? "default" : "outline"}
              size="sm"
              onClick={() => setStepsRange('lastWeek')}
            >
              {t('analytics.lastWeek')}
            </Button>
            <Button
              variant={stepsRange === 'thisMonth' ? "default" : "outline"}
              size="sm"
              onClick={() => setStepsRange('thisMonth')}
            >
              {t('analytics.thisMonth')}
            </Button>
            <Button
              variant={stepsRange === 'lastMonth' ? "default" : "outline"}
              size="sm"
              onClick={() => setStepsRange('lastMonth')}
            >
              {t('analytics.lastMonth')}
            </Button>
          </div>

          {/* Chart */}
          <div className="h-48 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={animatedStepsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="day" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  ticks={stepsConfig.ticks}
                  domain={stepsConfig.domain}
                  tickFormatter={(val) => Number(val).toLocaleString(i18n.language)}
                  width={60}
                />
                <Tooltip content={<StepsTooltip />} />
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
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="steps-date">{t('analytics.date')}</Label>
                <Input
                  id="steps-date"
                  type="date"
                  value={newStepsDate}
                  onChange={(e) => setNewStepsDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
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
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowAddSteps(false)} disabled={savingSteps}>
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
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant={waterRange === 'thisWeek' ? "default" : "outline"}
              size="sm"
              onClick={() => setWaterRange('thisWeek')}
            >
              {t('analytics.thisWeek')}
            </Button>
            <Button
              variant={waterRange === 'lastWeek' ? "default" : "outline"}
              size="sm"
              onClick={() => setWaterRange('lastWeek')}
            >
              {t('analytics.lastWeek')}
            </Button>
            <Button
              variant={waterRange === 'thisMonth' ? "default" : "outline"}
              size="sm"
              onClick={() => setWaterRange('thisMonth')}
            >
              {t('analytics.thisMonth')}
            </Button>
            <Button
              variant={waterRange === 'lastMonth' ? "default" : "outline"}
              size="sm"
              onClick={() => setWaterRange('lastMonth')}
            >
              {t('analytics.lastMonth')}
            </Button>
          </div>

          {/* Chart */}
          <div className="h-48 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={animatedWaterData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="day" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => Number(value).toLocaleString(i18n.language)}
                  ticks={waterConfig.ticks}
                  domain={waterConfig.domain}
                  width={70}
                />
                <Tooltip content={<WaterTooltip />} />
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
