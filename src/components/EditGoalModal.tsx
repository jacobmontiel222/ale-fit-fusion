import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Info } from "lucide-react";

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
  
  // Convert grams to percentages for initial values
  const gramsToPercentage = (grams: number, type: 'protein' | 'fat' | 'carbs') => {
    const calPerGram = type === 'fat' ? 9 : 4;
    const macroCalories = grams * calPerGram;
    return Math.round((macroCalories / currentGoals.calories) * 100);
  };

  const [proteinPct, setProteinPct] = useState(gramsToPercentage(currentGoals.protein, 'protein'));
  const [fatPct, setFatPct] = useState(gramsToPercentage(currentGoals.fat, 'fat'));
  const [carbsPct, setCarbsPct] = useState(gramsToPercentage(currentGoals.carbs, 'carbs'));

  useEffect(() => {
    setCalories(currentGoals.calories);
    setProteinPct(gramsToPercentage(currentGoals.protein, 'protein'));
    setFatPct(gramsToPercentage(currentGoals.fat, 'fat'));
    setCarbsPct(gramsToPercentage(currentGoals.carbs, 'carbs'));
  }, [currentGoals, open]);

  // Calculate derived values
  const calculateGrams = (percentage: number, type: 'protein' | 'fat' | 'carbs') => {
    const calPerGram = type === 'fat' ? 9 : 4;
    const macroCalories = (percentage / 100) * calories;
    return Math.round((macroCalories / calPerGram) * 2) / 2; // Round to 0.5g
  };

  const calculateCalories = (percentage: number, type: 'protein' | 'fat' | 'carbs') => {
    return Math.round((percentage / 100) * calories);
  };

  const proteinGrams = calculateGrams(proteinPct, 'protein');
  const fatGrams = calculateGrams(fatPct, 'fat');
  const carbsGrams = calculateGrams(carbsPct, 'carbs');

  const proteinCal = calculateCalories(proteinPct, 'protein');
  const fatCal = calculateCalories(fatPct, 'fat');
  const carbsCal = calculateCalories(carbsPct, 'carbs');

  const totalPct = proteinPct + fatPct + carbsPct;
  const isValid = totalPct === 100;

  // Auto-adjust carbs when protein or fat changes
  const handleProteinChange = (value: number) => {
    const newValue = Math.max(0, Math.min(100, value));
    setProteinPct(newValue);
    
    // Auto-adjust carbs to maintain 100%
    const remaining = 100 - newValue - fatPct;
    if (remaining >= 0 && remaining <= 100) {
      setCarbsPct(remaining);
    }
  };

  const handleFatChange = (value: number) => {
    const newValue = Math.max(0, Math.min(100, value));
    setFatPct(newValue);
    
    // Auto-adjust carbs to maintain 100%
    const remaining = 100 - proteinPct - newValue;
    if (remaining >= 0 && remaining <= 100) {
      setCarbsPct(remaining);
    }
  };

  const handleCarbsChange = (value: number) => {
    const newValue = Math.max(0, Math.min(100, value));
    setCarbsPct(newValue);
  };

  const handleSave = () => {
    if (!isValid) return;

    // Recalculate grams with adjustment for rounding errors
    let finalProteinG = Math.round(calculateGrams(proteinPct, 'protein') * 2) / 2;
    let finalFatG = Math.round(calculateGrams(fatPct, 'fat') * 2) / 2;
    let finalCarbsG = Math.round(calculateGrams(carbsPct, 'carbs') * 2) / 2;

    // Check for calorie discrepancy and adjust carbs as "remainder"
    const derivedCal = (finalProteinG * 4) + (finalFatG * 9) + (finalCarbsG * 4);
    const discrepancy = calories - derivedCal;
    
    if (Math.abs(discrepancy) <= 10) {
      // Adjust carbs to match exact calories
      finalCarbsG = Math.round(((calories - (finalProteinG * 4) - (finalFatG * 9)) / 4) * 2) / 2;
    }

    onSave({
      calories,
      protein: finalProteinG,
      fat: finalFatG,
      carbs: finalCarbsG,
      useGrams: false,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar objetivo de macros</DialogTitle>
          <DialogDescription>
            Define tus macronutrientes en porcentajes. Deben sumar exactamente 100%.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Calories Goal */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <Label htmlFor="calories" className="text-base font-semibold">
              Objetivo calórico diario
            </Label>
            <Input
              id="calories"
              type="number"
              value={calories}
              onChange={(e) => setCalories(Math.max(100, parseInt(e.target.value) || 0))}
              min={100}
              max={10000}
              step={50}
              className="mt-2 text-lg font-bold"
            />
            <p className="text-xs text-muted-foreground mt-1">kcal por día</p>
          </div>

          {/* Percentage Sum Indicator */}
          <div className={`p-3 rounded-lg border-2 ${
            isValid ? 'bg-green-500/10 border-green-500/50' : 'bg-orange-500/10 border-orange-500/50'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total de macros:</span>
              <span className={`text-lg font-bold ${isValid ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                {totalPct}%
              </span>
            </div>
            {!isValid && (
              <p className="text-xs text-muted-foreground mt-1">
                {totalPct < 100 ? `Faltan ${100 - totalPct}%` : `Sobran ${totalPct - 100}%`}
              </p>
            )}
          </div>

          {/* Macros Inputs */}
          <div className="space-y-4">
            {/* Protein */}
            <div className="space-y-2 p-4 rounded-lg border border-border">
              <Label htmlFor="protein" className="text-base font-medium flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--protein))' }}></span>
                Proteínas
              </Label>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    id="protein"
                    type="number"
                    value={proteinPct}
                    onChange={(e) => handleProteinChange(parseFloat(e.target.value) || 0)}
                    min={0}
                    max={100}
                    step={1}
                    className="text-lg font-semibold"
                  />
                  <p className="text-xs text-muted-foreground mt-1">% del total</p>
                </div>
                <div className="text-right pb-1">
                  <p className="text-sm font-medium text-foreground">{proteinGrams}g</p>
                  <p className="text-xs text-muted-foreground">{proteinCal} kcal</p>
                </div>
              </div>
            </div>

            {/* Fat */}
            <div className="space-y-2 p-4 rounded-lg border border-border">
              <Label htmlFor="fat" className="text-base font-medium flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--fat))' }}></span>
                Grasas
              </Label>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    id="fat"
                    type="number"
                    value={fatPct}
                    onChange={(e) => handleFatChange(parseFloat(e.target.value) || 0)}
                    min={0}
                    max={100}
                    step={1}
                    className="text-lg font-semibold"
                  />
                  <p className="text-xs text-muted-foreground mt-1">% del total</p>
                </div>
                <div className="text-right pb-1">
                  <p className="text-sm font-medium text-foreground">{fatGrams}g</p>
                  <p className="text-xs text-muted-foreground">{fatCal} kcal</p>
                </div>
              </div>
            </div>

            {/* Carbs */}
            <div className="space-y-2 p-4 rounded-lg border border-border">
              <Label htmlFor="carbs" className="text-base font-medium flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--carbs))' }}></span>
                Carbohidratos
              </Label>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    id="carbs"
                    type="number"
                    value={carbsPct}
                    onChange={(e) => handleCarbsChange(parseFloat(e.target.value) || 0)}
                    min={0}
                    max={100}
                    step={1}
                    className="text-lg font-semibold"
                  />
                  <p className="text-xs text-muted-foreground mt-1">% del total</p>
                </div>
                <div className="text-right pb-1">
                  <p className="text-sm font-medium text-foreground">{carbsGrams}g</p>
                  <p className="text-xs text-muted-foreground">{carbsCal} kcal</p>
                </div>
              </div>
            </div>
          </div>

          {/* Help message */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Al modificar proteínas o grasas, los carbohidratos se ajustan automáticamente para mantener 100%.
            </AlertDescription>
          </Alert>

          {/* Validation Error */}
          {!isValid && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Los porcentajes deben sumar exactamente 100% para poder guardar.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!isValid}>
              Guardar cambios
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
