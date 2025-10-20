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
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from "recharts";

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

  // Color scheme
  const COLORS = {
    weight: "hsl(var(--chart-1))",
    steps: "hsl(var(--chart-2))",
    water: "#60a5fa",
  };

  // Load data from Supabase
  const [weightData, setWeightData] = useState<WeightEntry[]>([]);
  const [stepsData, setStepsData] = useState<StepsEntry[]>([]);
  const [waterData, setWaterData] = useState<WaterEntry[]>([]);

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
    };

    loadData();
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
  }, [focusSection, shouldAddWeight]);

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
            {new Date(data.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
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
            {new Date(data.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          </p>
          <p className="text-base font-bold" style={{ color: COLORS.steps }}>
            {data.steps.toLocaleString('es-ES')} pasos
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
            {new Date(data.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          </p>
          <p className="text-base font-bold" style={{ color: COLORS.water }}>
            {data.ml.toLocaleString('es-ES')} ml
          </p>
        </div>
      );
    }
    return null;
  };

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

  const filteredWeightData = getFilteredDataWithAllDays(weightData, weightRange, { kg: null as any });
  const filteredStepsData = getFilteredDataWithAllDays(stepsData, stepsRange, { steps: 0 });
  const filteredWaterData = getFilteredDataWithAllDays(waterData, waterRange, { ml: 0 });

  const formatChartData = (data: WeightEntry[] | StepsEntry[] | WaterEntry[]) => {
    return data.map(entry => ({
      ...entry,
      day: format(new Date(entry.date), 'd', { locale: es })
    }));
  };

  const calculateNiceYAxisTicks = (data: WeightEntry[]): number[] => {
    const validData = data.filter(d => d.kg !== null);
    if (validData.length === 0) return [65, 70, 75, 80, 85];
    
    const minWeight = Math.min(...validData.map(d => d.kg));
    const maxWeight = Math.max(...validData.map(d => d.kg));
    
    // Add 2kg margin above and below
    const rangeMin = Math.floor(minWeight - 2);
    const rangeMax = Math.ceil(maxWeight + 2);
    
    // Use 2kg increments for cleaner display
    const ticks: number[] = [];
    for (let i = rangeMin; i <= rangeMax; i += 2) {
      ticks.push(i);
    }
    
    return ticks;
  };

  const weightChartData = formatChartData(filteredWeightData);
  const stepsChartData = formatChartData(filteredStepsData);
  const waterChartData = formatChartData(filteredWaterData);
  const weightYAxisTicks = calculateNiceYAxisTicks(filteredWeightData);

  const validWeightData = filteredWeightData.filter(d => d.kg !== null);
  const weightDelta = validWeightData.length >= 2 
    ? (validWeightData[validWeightData.length - 1].kg - validWeightData[0].kg).toFixed(1)
    : "0.0";

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

  // Calculate nice Y-axis ticks for water (1000ml intervals)
  const calculateWaterYAxisTicks = (data: WaterEntry[]): number[] => {
    if (data.length === 0) return [0, 1000, 2000, 3000];
    
    const maxWater = Math.max(...data.map(d => d.ml));
    const maxTick = Math.ceil(maxWater / 1000) * 1000 + 1000; // Round up to next 1000 and add one more
    
    const ticks: number[] = [];
    for (let i = 0; i <= maxTick; i += 1000) {
      ticks.push(i);
    }
    
    return ticks;
  };

  const waterYAxisTicks = calculateWaterYAxisTicks(filteredWaterData);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        <h1 className="text-3xl font-bold text-foreground mb-6">Analytics</h1>

        {/* Weight Card */}
        <StatsCard id="weight">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5" style={{ color: COLORS.weight }} />
              <h2 className="text-xl font-semibold text-foreground">Peso</h2>
            </div>
            <Button size="sm" onClick={() => setShowAddWeight(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Añadir
            </Button>
          </div>

          {/* Range Selector */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant={weightRange === 'thisWeek' ? "default" : "outline"}
              size="sm"
              onClick={() => setWeightRange('thisWeek')}
            >
              Esta semana
            </Button>
            <Button
              variant={weightRange === 'lastWeek' ? "default" : "outline"}
              size="sm"
              onClick={() => setWeightRange('lastWeek')}
            >
              La semana pasada
            </Button>
            <Button
              variant={weightRange === 'thisMonth' ? "default" : "outline"}
              size="sm"
              onClick={() => setWeightRange('thisMonth')}
            >
              Este mes
            </Button>
            <Button
              variant={weightRange === 'lastMonth' ? "default" : "outline"}
              size="sm"
              onClick={() => setWeightRange('lastMonth')}
            >
              El mes pasado
            </Button>
            <Button
              variant={weightRange === 'last3Months' ? "default" : "outline"}
              size="sm"
              onClick={() => setWeightRange('last3Months')}
            >
              Últimos 3 meses
            </Button>
            <Button
              variant={weightRange === 'last6Months' ? "default" : "outline"}
              size="sm"
              onClick={() => setWeightRange('last6Months')}
            >
              Últimos 6 meses
            </Button>
          </div>

          {/* Chart */}
          <div className="h-48 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="day" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  ticks={weightYAxisTicks}
                  domain={[weightYAxisTicks[0], weightYAxisTicks[weightYAxisTicks.length - 1]]}
                  tickFormatter={(value) => `${value.toFixed(1)} kg`}
                  width={60}
                />
                <Tooltip content={<WeightTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="kg" 
                  stroke={COLORS.weight}
                  strokeWidth={3}
                  dot={{ fill: COLORS.weight, r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Última medición</p>
              <p className="text-lg font-semibold text-foreground">
                {lastWeight ? `${lastWeight.kg.toFixed(2)} kg` : '-'}
              </p>
              {lastWeight && (
                <p className="text-xs text-muted-foreground">
                  {new Date(lastWeight.date).toLocaleDateString('es-ES')}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Variación</p>
              <p className={`text-lg font-semibold ${Number(weightDelta) < 0 ? 'text-accent' : 'text-foreground'}`}>
                {Number(weightDelta) > 0 ? '+' : ''}{weightDelta} kg
              </p>
              <p className="text-xs text-muted-foreground">
                {weightRange === 'thisWeek' ? 'Esta semana' : 
                 weightRange === 'lastWeek' ? 'La semana pasada' :
                 weightRange === 'thisMonth' ? 'Este mes' :
                 weightRange === 'lastMonth' ? 'El mes pasado' :
                 weightRange === 'last3Months' ? 'Últimos 3 meses' : 'Últimos 6 meses'}
              </p>
            </div>
          </div>
        </StatsCard>

        {/* Steps Card */}
        <StatsCard id="steps">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Footprints className="w-5 h-5" style={{ color: COLORS.steps }} />
              <h2 className="text-xl font-semibold text-foreground">Pasos</h2>
            </div>
          </div>

          {/* Range Selector */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant={stepsRange === 'thisWeek' ? "default" : "outline"}
              size="sm"
              onClick={() => setStepsRange('thisWeek')}
            >
              Esta semana
            </Button>
            <Button
              variant={stepsRange === 'lastWeek' ? "default" : "outline"}
              size="sm"
              onClick={() => setStepsRange('lastWeek')}
            >
              La semana pasada
            </Button>
            <Button
              variant={stepsRange === 'thisMonth' ? "default" : "outline"}
              size="sm"
              onClick={() => setStepsRange('thisMonth')}
            >
              Este mes
            </Button>
            <Button
              variant={stepsRange === 'lastMonth' ? "default" : "outline"}
              size="sm"
              onClick={() => setStepsRange('lastMonth')}
            >
              El mes pasado
            </Button>
          </div>

          {/* Chart */}
          <div className="h-48 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stepsChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="day" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip content={<StepsTooltip />} />
                <Bar 
                  dataKey="steps" 
                  fill={COLORS.steps}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Promedio diario</p>
              <p className="text-lg font-semibold text-foreground">
                {stepsAverage.toLocaleString('es-ES')}
              </p>
              <p className="text-xs text-muted-foreground">
                {stepsRange === 'thisWeek' ? 'Esta semana' : 
                 stepsRange === 'lastWeek' ? 'La semana pasada' :
                 stepsRange === 'thisMonth' ? 'Este mes' : 'El mes pasado'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Máximo</p>
              <p className="text-lg font-semibold text-foreground">
                {stepsMax.toLocaleString('es-ES')}
              </p>
              <p className="text-xs text-muted-foreground">En el periodo</p>
            </div>
          </div>
        </StatsCard>

        {/* Water Card */}
        <StatsCard id="water">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Droplet className="w-5 h-5" style={{ color: COLORS.water }} />
              <h2 className="text-xl font-semibold text-foreground">Agua</h2>
            </div>
            <Button size="sm" onClick={() => setShowAddWater(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Añadir
            </Button>
          </div>

          {/* Range Selector */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant={waterRange === 'thisWeek' ? "default" : "outline"}
              size="sm"
              onClick={() => setWaterRange('thisWeek')}
            >
              Esta semana
            </Button>
            <Button
              variant={waterRange === 'lastWeek' ? "default" : "outline"}
              size="sm"
              onClick={() => setWaterRange('lastWeek')}
            >
              La semana pasada
            </Button>
            <Button
              variant={waterRange === 'thisMonth' ? "default" : "outline"}
              size="sm"
              onClick={() => setWaterRange('thisMonth')}
            >
              Este mes
            </Button>
            <Button
              variant={waterRange === 'lastMonth' ? "default" : "outline"}
              size="sm"
              onClick={() => setWaterRange('lastMonth')}
            >
              El mes pasado
            </Button>
          </div>

          {/* Chart */}
          <div className="h-48 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="day" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `${value} ml`}
                  ticks={waterYAxisTicks}
                  domain={[0, waterYAxisTicks[waterYAxisTicks.length - 1]]}
                />
                <Tooltip content={<WaterTooltip />} />
                <Bar 
                  dataKey="ml" 
                  fill={COLORS.water}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Promedio diario</p>
              <p className="text-lg font-semibold text-foreground">
                {waterAverage.toLocaleString('es-ES')} ml
              </p>
              <p className="text-xs text-muted-foreground">
                {waterRange === 'thisWeek' ? 'Esta semana' : 
                 waterRange === 'lastWeek' ? 'La semana pasada' :
                 waterRange === 'thisMonth' ? 'Este mes' : 'El mes pasado'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total</p>
              <p className="text-lg font-semibold text-foreground">
                {waterTotal.toLocaleString('es-ES')} ml
              </p>
              <p className="text-xs text-muted-foreground">En el periodo</p>
            </div>
          </div>
        </StatsCard>
      </div>

      {/* Add Water Dialog */}
      <Dialog open={showAddWater} onOpenChange={setShowAddWater}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir Agua</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="water-amount">Cantidad (ml)</Label>
              <Input
                id="water-amount"
                type="number"
                placeholder="250"
                value={newWaterAmount}
                onChange={(e) => setNewWaterAmount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="water-date">Fecha</Label>
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
              Cancelar
            </Button>
            <Button onClick={addWater}>Añadir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Weight Dialog */}
      <Dialog open={showAddWeight} onOpenChange={setShowAddWeight}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir peso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="weight">Peso (kg)</Label>
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
              <Label htmlFor="date">Fecha</Label>
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
              Cancelar
            </Button>
            <Button onClick={addWeight}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Analytics;
