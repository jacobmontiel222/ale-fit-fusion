import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Scale, Footprints } from "lucide-react";
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

const Analytics = () => {
  const [searchParams] = useSearchParams();
  const focusSection = searchParams.get('focus');
  const shouldAddWeight = searchParams.get('add') === 'true';

  type DateRange = 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'last3Months' | 'last6Months';
  const [weightRange, setWeightRange] = useState<DateRange>('thisWeek');
  const [stepsRange, setStepsRange] = useState<DateRange>('thisWeek');
  const [showAddWeight, setShowAddWeight] = useState(false);
  const [newWeight, setNewWeight] = useState("");
  const [newWeightDate, setNewWeightDate] = useState(new Date().toISOString().split('T')[0]);

  // Color scheme
  const COLORS = {
    weight: "hsl(var(--chart-1))",
    steps: "hsl(var(--chart-2))",
  };

  // Initialize mock data
  const [weightData, setWeightData] = useState<WeightEntry[]>(() => {
    const stored = localStorage.getItem("analyticsWeight");
    if (stored) return JSON.parse(stored);
    
    // Generate mock data for the last 30 days
    const mockData: WeightEntry[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      mockData.push({
        date: date.toISOString().split('T')[0],
        kg: 73 - (i * 0.025) + (Math.random() * 0.4 - 0.2)
      });
    }
    localStorage.setItem("analyticsWeight", JSON.stringify(mockData));
    return mockData;
  });

  const [stepsData, setStepsData] = useState<StepsEntry[]>(() => {
    const stored = localStorage.getItem("analyticsSteps");
    if (stored) return JSON.parse(stored);
    
    // Generate mock data for the last 30 days
    const mockData: StepsEntry[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      mockData.push({
        date: date.toISOString().split('T')[0],
        steps: Math.floor(6000 + Math.random() * 6000)
      });
    }
    localStorage.setItem("analyticsSteps", JSON.stringify(mockData));
    return mockData;
  });

  // Scroll to focused section and open add weight dialog if needed
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
  }, [focusSection, shouldAddWeight]);

  const getDateRange = (range: DateRange): { startDate: Date; endDate: Date } => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (range) {
      case 'thisWeek':
        startDate = startOfWeek(today, { weekStartsOn: 1 });
        endDate = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case 'lastWeek':
        const lastWeekStart = subWeeks(today, 1);
        startDate = startOfWeek(lastWeekStart, { weekStartsOn: 1 });
        endDate = endOfWeek(lastWeekStart, { weekStartsOn: 1 });
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
    return days.map(day => day.toISOString().split('T')[0]);
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

  const addWeight = () => {
    if (!newWeight || isNaN(Number(newWeight))) return;
    
    const newEntry: WeightEntry = {
      date: newWeightDate,
      kg: Number(newWeight)
    };
    
    const updatedData = [...weightData, newEntry].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    setWeightData(updatedData);
    localStorage.setItem("analyticsWeight", JSON.stringify(updatedData));
    setShowAddWeight(false);
    setNewWeight("");
    setNewWeightDate(new Date().toISOString().split('T')[0]);
  };

  const filteredWeightData = getFilteredDataWithAllDays(weightData, weightRange, { kg: null as any });
  const filteredStepsData = getFilteredDataWithAllDays(stepsData, stepsRange, { steps: 0 });

  const formatChartData = (data: WeightEntry[] | StepsEntry[]) => {
    return data.map(entry => ({
      ...entry,
      day: format(new Date(entry.date), 'd', { locale: es })
    }));
  };

  const calculateNiceYAxisTicks = (data: WeightEntry[]): number[] => {
    const validData = data.filter(d => d.kg !== null);
    if (validData.length === 0) return [70, 71, 72, 73, 74, 75];
    
    const minWeight = Math.min(...validData.map(d => d.kg));
    const maxWeight = Math.max(...validData.map(d => d.kg));
    
    const rangeMin = Math.floor(minWeight * 2) / 2; // Round down to nearest 0.5
    const rangeMax = Math.ceil(maxWeight * 2) / 2; // Round up to nearest 0.5
    
    const ticks: number[] = [];
    for (let i = rangeMin; i <= rangeMax; i += 0.5) {
      ticks.push(i);
    }
    
    return ticks;
  };

  const weightChartData = formatChartData(filteredWeightData);
  const stepsChartData = formatChartData(filteredStepsData);
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
                  tickFormatter={(value) => `${value.toFixed(2)} kg`}
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
      </div>

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
