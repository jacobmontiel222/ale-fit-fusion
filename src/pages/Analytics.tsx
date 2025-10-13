import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Scale, Footprints } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { StatsCard } from "@/components/StatsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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

  const [weightRange, setWeightRange] = useState<7 | 14 | 30>(7);
  const [stepsRange, setStepsRange] = useState<7 | 14 | 30>(7);
  const [showAddWeight, setShowAddWeight] = useState(false);
  const [newWeight, setNewWeight] = useState("");
  const [newWeightDate, setNewWeightDate] = useState(new Date().toISOString().split('T')[0]);

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

  // Scroll to focused section
  useEffect(() => {
    if (focusSection) {
      setTimeout(() => {
        const element = document.getElementById(focusSection);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [focusSection]);

  const getFilteredData = <T extends { date: string }>(data: T[], range: number): T[] => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - range + 1);
    return data.filter(entry => new Date(entry.date) >= cutoffDate);
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

  const filteredWeightData = getFilteredData(weightData, weightRange);
  const filteredStepsData = getFilteredData(stepsData, stepsRange);

  const formatChartData = (data: WeightEntry[] | StepsEntry[]) => {
    return data.map(entry => ({
      ...entry,
      day: new Date(entry.date).getDate().toString()
    }));
  };

  const weightChartData = formatChartData(filteredWeightData);
  const stepsChartData = formatChartData(filteredStepsData);

  const weightDelta = filteredWeightData.length >= 2 
    ? (filteredWeightData[filteredWeightData.length - 1].kg - filteredWeightData[0].kg).toFixed(1)
    : "0.0";

  const lastWeight = filteredWeightData.length > 0 
    ? filteredWeightData[filteredWeightData.length - 1]
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
              <Scale className="w-5 h-5 text-accent" />
              <h2 className="text-xl font-semibold text-foreground">Peso</h2>
            </div>
            <Button size="sm" onClick={() => setShowAddWeight(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Añadir
            </Button>
          </div>

          {/* Range Selector */}
          <div className="flex gap-2 mb-4">
            {([7, 14, 30] as const).map(days => (
              <Button
                key={days}
                variant={weightRange === days ? "default" : "outline"}
                size="sm"
                onClick={() => setWeightRange(days)}
                className="flex-1"
              >
                {days}d
              </Button>
            ))}
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
                  domain={['dataMin - 0.5', 'dataMax + 0.5']}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="kg" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--accent))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Última medición</p>
              <p className="text-lg font-semibold text-foreground">
                {lastWeight ? `${lastWeight.kg.toFixed(1)} kg` : '-'}
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
              <p className="text-xs text-muted-foreground">{weightRange} días</p>
            </div>
          </div>
        </StatsCard>

        {/* Steps Card */}
        <StatsCard id="steps">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Footprints className="w-5 h-5 text-accent" />
              <h2 className="text-xl font-semibold text-foreground">Pasos</h2>
            </div>
          </div>

          {/* Range Selector */}
          <div className="flex gap-2 mb-4">
            {([7, 14, 30] as const).map(days => (
              <Button
                key={days}
                variant={stepsRange === days ? "default" : "outline"}
                size="sm"
                onClick={() => setStepsRange(days)}
                className="flex-1"
              >
                {days}d
              </Button>
            ))}
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
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar 
                  dataKey="steps" 
                  fill="hsl(var(--accent))"
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
              <p className="text-xs text-muted-foreground">{stepsRange} días</p>
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
