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
  // Use string for inputs to allow empty state
  const [caloriesInput, setCaloriesInput] = useState(String(currentGoals.calories));
  
  // Convert grams to percentages for initial values
  const gramsToPercentage = (grams: number, cals: number, type: 'protein' | 'fat' | 'carbs') => {
    if (cals === 0) return 0;
    const calPerGram = type === 'fat' ? 9 : 4;
    const macroCalories = grams * calPerGram;
    return Math.round((macroCalories / cals) * 100);
  };

  const [proteinPctInput, setProteinPctInput] = useState(
    String(gramsToPercentage(currentGoals.protein, currentGoals.calories, 'protein'))
  );
  const [fatPctInput, setFatPctInput] = useState(
    String(gramsToPercentage(currentGoals.fat, currentGoals.calories, 'fat'))
  );
  const [carbsPctInput, setCarbsPctInput] = useState(
    String(gramsToPercentage(currentGoals.carbs, currentGoals.calories, 'carbs'))
  );

  useEffect(() => {
    setCaloriesInput(String(currentGoals.calories));
    setProteinPctInput(String(gramsToPercentage(currentGoals.protein, currentGoals.calories, 'protein')));
    setFatPctInput(String(gramsToPercentage(currentGoals.fat, currentGoals.calories, 'fat')));
    setCarbsPctInput(String(gramsToPercentage(currentGoals.carbs, currentGoals.calories, 'carbs')));
  }, [currentGoals, open]);

  // Parse values with fallback
  const calories = Math.max(100, parseFloat(caloriesInput) || 0);
  const proteinPct = Math.max(0, Math.min(100, parseFloat(proteinPctInput) || 0));
  const fatPct = Math.max(0, Math.min(100, parseFloat(fatPctInput) || 0));
  const carbsPct = Math.max(0, Math.min(100, parseFloat(carbsPctInput) || 0));

  // Calculate derived values
  const calculateGrams = (percentage: number, type: 'protein' | 'fat' | 'carbs') => {
    const calPerGram = type === 'fat' ? 9 : 4;
    const macroCalories = (percentage / 100) * calories;
    return Math.round((macroCalories / calPerGram) * 2) / 2; // Round to 0.5g
  };

  const calculateCalories = (percentage: number) => {
    return Math.round((percentage / 100) * calories);
  };

  const proteinGrams = calculateGrams(proteinPct, 'protein');
  const fatGrams = calculateGrams(fatPct, 'fat');
  const carbsGrams = calculateGrams(carbsPct, 'carbs');

  const proteinCal = calculateCalories(proteinPct);
  const fatCal = calculateCalories(fatPct);
  const carbsCal = calculateCalories(carbsPct);

  const totalPct = proteinPct + fatPct + carbsPct;
  const isValid = Math.abs(totalPct - 100) < 0.1; // Allow small rounding errors

  // Auto-adjust carbs when protein or fat changes
  const handleProteinChange = (value: string) => {
    setProteinPctInput(value);
    
    const newProtein = parseFloat(value) || 0;
    if (newProtein >= 0 && newProtein <= 100) {
      const currentFat = parseFloat(fatPctInput) || 0;
      const remaining = 100 - newProtein - currentFat;
      if (remaining >= 0 && remaining <= 100) {
        setCarbsPctInput(String(remaining));
      }
    }
  };

  const handleFatChange = (value: string) => {
    setFatPctInput(value);
    
    const newFat = parseFloat(value) || 0;
    if (newFat >= 0 && newFat <= 100) {
      const currentProtein = parseFloat(proteinPctInput) || 0;
      const remaining = 100 - currentProtein - newFat;
      if (remaining >= 0 && remaining <= 100) {
        setCarbsPctInput(String(remaining));
      }
    }
  };

  const handleCarbsChange = (value: string) => {
    setCarbsPctInput(value);
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
      calories: Math.round(calories),
      protein: Math.round(finalProteinG),
      fat: Math.round(finalFatG),
      carbs: Math.round(finalCarbsG),
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
              value={caloriesInput}
              onChange={(e) => setCaloriesInput(e.target.value)}
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
                {totalPct.toFixed(1)}%
              </span>
            </div>
            {!isValid && (
              <p className="text-xs text-muted-foreground mt-1">
                {totalPct < 100 ? `Faltan ${(100 - totalPct).toFixed(1)}%` : `Sobran ${(totalPct - 100).toFixed(1)}%`}
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
                    value={proteinPctInput}
                    onChange={(e) => handleProteinChange(e.target.value)}
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
                    value={fatPctInput}
                    onChange={(e) => handleFatChange(e.target.value)}
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
                    value={carbsPctInput}
                    onChange={(e) => handleCarbsChange(e.target.value)}
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
