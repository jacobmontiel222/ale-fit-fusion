import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface MacroGoals {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  useGrams: boolean;
}

interface EditGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentGoals: MacroGoals;
  onSave: (goals: MacroGoals) => void;
}

export const EditGoalModal = ({ open, onOpenChange, currentGoals, onSave }: EditGoalModalProps) => {
  const [calories, setCalories] = useState(currentGoals.calories);
  const [protein, setProtein] = useState(currentGoals.protein);
  const [fat, setFat] = useState(currentGoals.fat);
  const [carbs, setCarbs] = useState(currentGoals.carbs);
  const [useGrams, setUseGrams] = useState(currentGoals.useGrams);

  useEffect(() => {
    setCalories(currentGoals.calories);
    setProtein(currentGoals.protein);
    setFat(currentGoals.fat);
    setCarbs(currentGoals.carbs);
    setUseGrams(currentGoals.useGrams);
  }, [currentGoals, open]);

  const calculatePercentage = (grams: number, type: 'protein' | 'fat' | 'carbs') => {
    const calPerGram = type === 'fat' ? 9 : 4;
    return ((grams * calPerGram) / calories * 100).toFixed(1);
  };

  const calculateGrams = (percentage: number, type: 'protein' | 'fat' | 'carbs') => {
    const calPerGram = type === 'fat' ? 9 : 4;
    return Math.round((percentage / 100 * calories) / calPerGram);
  };

  const totalPercentage = useGrams
    ? parseFloat(calculatePercentage(protein, 'protein')) +
      parseFloat(calculatePercentage(fat, 'fat')) +
      parseFloat(calculatePercentage(carbs, 'carbs'))
    : protein + fat + carbs;

  const derivedCalories = useGrams
    ? protein * 4 + fat * 9 + carbs * 4
    : calories;

  const calorieDiscrepancy = useGrams ? Math.abs(derivedCalories - calories) > 10 : false;

  const canSave = useGrams ? true : Math.abs(totalPercentage - 100) < 0.5;

  const handleAutoAdjust = () => {
    if (useGrams) return;
    const remaining = 100 - (protein + fat);
    setCarbs(Math.max(0, remaining));
  };

  const handleAdjustCalories = () => {
    setCalories(derivedCalories);
  };

  const handleBalanceMacros = () => {
    const targetProtein = Math.round((protein / totalPercentage) * 100);
    const targetFat = Math.round((fat / totalPercentage) * 100);
    const targetCarbs = 100 - targetProtein - targetFat;
    
    setProtein(targetProtein);
    setFat(targetFat);
    setCarbs(targetCarbs);
  };

  const handleSave = () => {
    onSave({
      calories,
      protein: useGrams ? protein : calculateGrams(protein, 'protein'),
      fat: useGrams ? fat : calculateGrams(fat, 'fat'),
      carbs: useGrams ? carbs : calculateGrams(carbs, 'carbs'),
      useGrams: false, // Always store as grams
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar objetivo</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="calories">Calorías objetivo (kcal)</Label>
            <Input
              id="calories"
              type="number"
              value={calories}
              onChange={(e) => setCalories(Math.max(0, parseInt(e.target.value) || 0))}
              min={0}
              max={10000}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Usar gramos en lugar de porcentajes</Label>
            <Switch checked={useGrams} onCheckedChange={setUseGrams} />
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="protein">
                Proteínas {useGrams ? '(g)' : '(%)'}
                {useGrams && <span className="text-muted-foreground ml-2">({calculatePercentage(protein, 'protein')}%)</span>}
              </Label>
              <Input
                id="protein"
                type="number"
                value={protein}
                onChange={(e) => setProtein(Math.max(0, parseFloat(e.target.value) || 0))}
                min={0}
                max={useGrams ? 1000 : 100}
              />
            </div>

            <div>
              <Label htmlFor="fat">
                Grasas {useGrams ? '(g)' : '(%)'}
                {useGrams && <span className="text-muted-foreground ml-2">({calculatePercentage(fat, 'fat')}%)</span>}
              </Label>
              <Input
                id="fat"
                type="number"
                value={fat}
                onChange={(e) => setFat(Math.max(0, parseFloat(e.target.value) || 0))}
                min={0}
                max={useGrams ? 1000 : 100}
              />
            </div>

            <div>
              <Label htmlFor="carbs">
                Carbohidratos {useGrams ? '(g)' : '(%)'}
                {useGrams && <span className="text-muted-foreground ml-2">({calculatePercentage(carbs, 'carbs')}%)</span>}
              </Label>
              <Input
                id="carbs"
                type="number"
                value={carbs}
                onChange={(e) => setCarbs(Math.max(0, parseFloat(e.target.value) || 0))}
                min={0}
                max={useGrams ? 1000 : 100}
              />
            </div>
          </div>

          {!useGrams && (
            <div className="flex items-center justify-between text-sm">
              <span className={totalPercentage === 100 ? "text-green-500" : "text-orange-500"}>
                Suman: {totalPercentage.toFixed(1)}%
                {totalPercentage !== 100 && ` → faltan ${(100 - totalPercentage).toFixed(1)}%`}
              </span>
              <Button variant="outline" size="sm" onClick={handleAutoAdjust}>
                Auto-ajustar restante
              </Button>
            </div>
          )}

          {calorieDiscrepancy && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Las kcal derivadas de los macros = {derivedCalories} kcal. ¿Ajustar calorías objetivo a este valor o equilibrar macros?
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" size="sm" onClick={handleAdjustCalories}>
                    Ajustar kcal
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleBalanceMacros}>
                    Equilibrar macros
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!canSave}>
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
