import { useState } from 'react';
import { X, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FoodItem, FoodCategory, FoodTag } from '@/types/food';

interface FoodDetailsModalProps {
  food: FoodItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddFood: (food: FoodItem, amount: number) => void;
}

const CATEGORIES: { value: FoodCategory; label: string }[] = [
  { value: 'frutas', label: 'Frutas' },
  { value: 'verduras', label: 'Verduras' },
  { value: 'carnes', label: 'Carnes' },
  { value: 'pescados', label: 'Pescados' },
  { value: 'lacteos', label: 'Lácteos' },
  { value: 'legumbres', label: 'Legumbres' },
  { value: 'cereales', label: 'Cereales' },
  { value: 'frutos-secos', label: 'Frutos secos' },
  { value: 'bebidas', label: 'Bebidas' },
  { value: 'aceites', label: 'Aceites' },
  { value: 'huevos', label: 'Huevos' },
  { value: 'otros', label: 'Otros' },
];

const TAGS: { value: FoodTag; label: string }[] = [
  { value: 'alto-proteina', label: 'Alto en proteína' },
  { value: 'bajo-grasa', label: 'Bajo en grasa' },
  { value: 'alto-fibra', label: 'Alto en fibra' },
  { value: 'bajo-calorias', label: 'Bajo en calorías' },
  { value: 'vegano', label: 'Vegano' },
  { value: 'vegetariano', label: 'Vegetariano' },
  { value: 'sin-gluten', label: 'Sin gluten' },
  { value: 'sin-lactosa', label: 'Sin lactosa' },
];

export function FoodDetailsModal({ food, open, onOpenChange, onAddFood }: FoodDetailsModalProps) {
  const [amountInput, setAmountInput] = useState('100');

  if (!food) return null;

  const amount = Math.max(0, parseFloat(amountInput.replace(',', '.')) || 0);
  const multiplier = amount / 100;

  const adjustedMacros = {
    calories: Math.round(food.calories * multiplier),
    protein: Math.round(food.protein * multiplier * 10) / 10,
    fat: Math.round(food.fat * multiplier * 10) / 10,
    carbs: Math.round(food.carbs * multiplier * 10) / 10,
    fiber: food.fiber ? Math.round(food.fiber * multiplier * 10) / 10 : undefined,
    sugar: food.sugar ? Math.round(food.sugar * multiplier * 10) / 10 : undefined,
  };

  const handleAdd = () => {
    onAddFood(food, amount);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">{food.name}</DialogTitle>
              {food.brand && (
                <p className="text-sm text-muted-foreground">{food.brand}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">
                  {CATEGORIES.find(c => c.value === food.category)?.label}
                </Badge>
                {food.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {TAGS.find(t => t.value === tag)?.label || tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          {/* Cantidad */}
          <div className="mb-6">
            <Label htmlFor="amount" className="text-base font-semibold mb-2 block">
              Cantidad
            </Label>
            <div className="flex items-center gap-3">
              <Input
                id="amount"
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                value={amountInput}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (/^[0-9]*[.,]?[0-9]*$/.test(raw)) {
                    const cleaned = raw.replace(/^0+(?=\d)/, '');
                    setAmountInput(cleaned);
                  }
                }}
                onBlur={() => {
                  if (amountInput === '') setAmountInput('0');
                }}
                className="w-32"
              />
              <span className="text-muted-foreground">{food.servingUnit}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Valores nutricionales por 100 {food.servingUnit}
            </p>
          </div>

          <Tabs defaultValue="macros" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="macros">Macronutrientes</TabsTrigger>
              <TabsTrigger value="micros">Micronutrientes</TabsTrigger>
            </TabsList>

            <TabsContent value="macros" className="mt-4 space-y-4">
              {/* Calorías */}
              <div className="p-4 rounded-lg bg-secondary/30">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Calorías</span>
                  <span className="text-lg font-bold">{adjustedMacros.calories} kcal</span>
                </div>
              </div>

              {/* Macronutrientes principales */}
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Proteínas</span>
                  <span className="font-semibold">{adjustedMacros.protein} g</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Grasas</span>
                  <span className="font-semibold">{adjustedMacros.fat} g</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Carbohidratos</span>
                  <span className="font-semibold">{adjustedMacros.carbs} g</span>
                </div>
                {adjustedMacros.fiber !== undefined && (
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Fibra</span>
                    <span className="font-semibold">{adjustedMacros.fiber} g</span>
                  </div>
                )}
                {adjustedMacros.sugar !== undefined && (
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Azúcares</span>
                    <span className="font-semibold">{adjustedMacros.sugar} g</span>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="micros" className="mt-4 space-y-4">
              {/* Vitaminas */}
              {food.micronutrients.vitamins.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Vitaminas
                  </h4>
                  <div className="space-y-2">
                    {food.micronutrients.vitamins.map((vitamin, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">{vitamin.name}</span>
                        <div className="text-right">
                          <span className="font-semibold">
                            {(vitamin.amount * multiplier).toFixed(2)} {vitamin.unit}
                          </span>
                          {vitamin.dailyValue && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({Math.round(vitamin.dailyValue * multiplier)}% VD)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Minerales */}
              {food.micronutrients.minerals.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Minerales
                  </h4>
                  <div className="space-y-2">
                    {food.micronutrients.minerals.map((mineral, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">{mineral.name}</span>
                        <div className="text-right">
                          <span className="font-semibold">
                            {(mineral.amount * multiplier).toFixed(2)} {mineral.unit}
                          </span>
                          {mineral.dailyValue && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({Math.round(mineral.dailyValue * multiplier)}% VD)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {food.micronutrients.vitamins.length === 0 && 
               food.micronutrients.minerals.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No hay información de micronutrientes disponible</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </ScrollArea>

        {/* Footer con botón de añadir */}
        <div className="px-6 py-4 border-t border-border">
          <Button onClick={handleAdd} className="w-full" size="lg" disabled={amount <= 0}>
            Añadir {amount} {food.servingUnit}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
