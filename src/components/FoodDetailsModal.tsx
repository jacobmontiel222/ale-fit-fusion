import { useEffect, useState } from 'react';
import { X, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FoodItem, FoodCategory, FoodTag } from '@/types/food';
import { useTranslation } from 'react-i18next';

interface FoodDetailsModalProps {
  food: FoodItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddFood: (food: FoodItem, amount: number) => void;
  editable?: boolean;
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

export function FoodDetailsModal({ food, open, onOpenChange, onAddFood, editable = false }: FoodDetailsModalProps) {
  const [amountInput, setAmountInput] = useState('100');
  const [editableFood, setEditableFood] = useState<FoodItem | null>(food);
  const UNIT_OPTIONS = ['g', 'ml', 'unidad'];
  const { t } = useTranslation();

  useEffect(() => {
    setEditableFood(food);
    setAmountInput('100');
  }, [food]);

  const currentFood = editable ? editableFood : food;
  const unitLower = (currentFood?.servingUnit || 'g').toLowerCase();
  const baseQuantity = unitLower === 'unidad' ? 1 : 100;
  const amount = Math.max(0, parseFloat(amountInput.replace(',', '.')) || 0);
  const multiplier = amount / baseQuantity;

  useEffect(() => {
    setAmountInput(String(baseQuantity));
  }, [baseQuantity]);

  const adjustedMacros = currentFood
    ? {
        calories: Math.round(currentFood.calories * multiplier),
        protein: Math.round(currentFood.protein * multiplier * 10) / 10,
        fat: Math.round(currentFood.fat * multiplier * 10) / 10,
        carbs: Math.round(currentFood.carbs * multiplier * 10) / 10,
        fiber: currentFood.fiber ? Math.round(currentFood.fiber * multiplier * 10) / 10 : undefined,
        sugar: currentFood.sugar ? Math.round(currentFood.sugar * multiplier * 10) / 10 : undefined,
      }
    : {
        calories: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
        fiber: 0,
        sugar: 0,
      };

  const handleAdd = () => {
    if (!currentFood) return;
    onAddFood(currentFood, amount);
    onOpenChange(false);
  };

  const handleNumberChange = (field: keyof FoodItem) => (value: string) => {
    if (!editableFood) return;
    if (!/^[0-9]*[.,]?[0-9]*$/.test(value)) return;
    const parsed = parseFloat(value.replace(',', '.'));
    setEditableFood({
      ...editableFood,
      [field]: Number.isFinite(parsed) ? parsed : 0,
    });
  };

  const handleTextChange = (field: keyof FoodItem) => (value: string) => {
    if (!editableFood) return;
    setEditableFood({
      ...editableFood,
      [field]: value,
    });
  };

  if (!currentFood) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {editable ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{t('foodDetails.name')}</Label>
                    <Input
                      value={editableFood?.name || ''}
                      onChange={(e) => handleTextChange('name')(e.target.value)}
                      placeholder={t('foodDetails.namePlaceholder')}
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 space-y-2">
                      <Label className="text-sm font-semibold">{t('foodDetails.brandOptional')}</Label>
                      <Input
                        value={editableFood?.brand || ''}
                        onChange={(e) => handleTextChange('brand')(e.target.value)}
                        placeholder={t('foodDetails.brandPlaceholder')}
                      />
                    </div>
                    <div className="w-36 space-y-2">
                      <Label className="text-sm font-semibold">{t('foodDetails.baseUnit')}</Label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
                        value={editableFood?.servingUnit || 'g'}
                        onChange={(e) => handleTextChange('servingUnit')(e.target.value)}
                      >
                        {UNIT_OPTIONS.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <DialogTitle className="text-2xl mb-2">{currentFood.name}</DialogTitle>
                  {currentFood.brand && (
                    <p className="text-sm text-muted-foreground">{currentFood.brand}</p>
                  )}
                </>
              )}
              {!editable && (
                <div className="flex items-center gap-2 mt-2">
                  {CATEGORIES.find(c => c.value === currentFood.category)?.label !== 'Otros' && (
                    <Badge variant="secondary">
                      {CATEGORIES.find(c => c.value === currentFood.category)?.label}
                    </Badge>
                  )}
                  {currentFood.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {TAGS.find(t => t.value === tag)?.label || tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4 max-h-[calc(100vh-120px)] h-[calc(100vh-140px)] pb-32 overflow-y-auto">
          <Tabs defaultValue="macros" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="macros">{t('foodDetails.macrosTab')}</TabsTrigger>
              <TabsTrigger value="micros">{t('foodDetails.microsTab')}</TabsTrigger>
            </TabsList>

            <TabsContent value="macros" className="mt-4 space-y-4">
              {editable && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-sm text-muted-foreground">
                        {t('foodDetails.caloriesPerBase', { unit: currentFood.servingUnit || 'g', base: baseQuantity })}
                      </Label>
                      <Input
                        value={editableFood?.calories ?? 0}
                        inputMode="decimal"
                        pattern="[0-9]*[.,]?[0-9]*"
                        onChange={(e) => handleNumberChange('calories')(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm text-muted-foreground">{t('foodDetails.protein')}</Label>
                      <Input
                        value={editableFood?.protein ?? 0}
                        inputMode="decimal"
                        pattern="[0-9]*[.,]?[0-9]*"
                        onChange={(e) => handleNumberChange('protein')(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-sm text-muted-foreground">{t('foodDetails.fat')}</Label>
                      <Input
                        value={editableFood?.fat ?? 0}
                        inputMode="decimal"
                        pattern="[0-9]*[.,]?[0-9]*"
                        onChange={(e) => handleNumberChange('fat')(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm text-muted-foreground">{t('foodDetails.carbs')}</Label>
                      <Input
                        value={editableFood?.carbs ?? 0}
                        inputMode="decimal"
                        pattern="[0-9]*[.,]?[0-9]*"
                        onChange={(e) => handleNumberChange('carbs')(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-sm text-muted-foreground">{t('foodDetails.fiber')}</Label>
                      <Input
                        value={editableFood?.fiber ?? 0}
                        inputMode="decimal"
                        pattern="[0-9]*[.,]?[0-9]*"
                        onChange={(e) => handleNumberChange('fiber')(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm text-muted-foreground">{t('foodDetails.sugar')}</Label>
                      <Input
                        value={editableFood?.sugar ?? 0}
                        inputMode="decimal"
                        pattern="[0-9]*[.,]?[0-9]*"
                        onChange={(e) => handleNumberChange('sugar')(e.target.value)}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('foodDetails.perBaseInstruction', { unit: currentFood.servingUnit, base: baseQuantity })}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-base font-semibold">
                  {t('foodDetails.amountToAdd')}
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="amount"
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    value={amountInput}
                    placeholder={String(baseQuantity)}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (/^[0-9]*[.,]?[0-9]*$/.test(raw)) {
                        const cleaned = raw.replace(/^0+(?=\\d)/, '');
                        setAmountInput(cleaned);
                      }
                    }}
                    onBlur={() => {
                      if (amountInput === '') setAmountInput('0');
                    }}
                    className="w-32"
                  />
                  <span className="text-muted-foreground">{currentFood.servingUnit}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-semibold text-foreground">
                  {t('foodDetails.calculatedFor', { amount: amount || 0, unit: currentFood.servingUnit })}
                </div>
                <div className="p-4 rounded-lg bg-secondary/30">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{t('foodDetails.calories')}</span>
                    <span className="text-lg font-bold">{adjustedMacros.calories} kcal</span>
                  </div>
                </div>
              </div>

              {/* Macronutrientes principales */}
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t('foodDetails.protein')}</span>
                  <span className="font-semibold">{adjustedMacros.protein} g</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t('foodDetails.fat')}</span>
                  <span className="font-semibold">{adjustedMacros.fat} g</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t('foodDetails.carbs')}</span>
                  <span className="font-semibold">{adjustedMacros.carbs} g</span>
                </div>
                {adjustedMacros.fiber !== undefined && (
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">{t('foodDetails.fiber')}</span>
                    <span className="font-semibold">{adjustedMacros.fiber} g</span>
                  </div>
                )}
                {adjustedMacros.sugar !== undefined && (
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">{t('foodDetails.sugar')}</span>
                    <span className="font-semibold">{adjustedMacros.sugar} g</span>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="micros" className="mt-4 space-y-4">
              {/* Vitaminas */}
              {currentFood.micronutrients.vitamins.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    {t('foodDetails.vitamins')}
                  </h4>
                  <div className="space-y-2">
                    {currentFood.micronutrients.vitamins.map((vitamin, idx) => (
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
              {currentFood.micronutrients.minerals.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    {t('foodDetails.minerals')}
                  </h4>
                  <div className="space-y-2">
                    {currentFood.micronutrients.minerals.map((mineral, idx) => (
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

              {currentFood.micronutrients.vitamins.length === 0 && 
               currentFood.micronutrients.minerals.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>{t('foodDetails.noMicros')}</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
          <div className="mt-8 pb-4">
            <Button onClick={handleAdd} className="w-full" size="lg" disabled={amount <= 0}>
              {t('foodDetails.addAmount', { amount, unit: currentFood.servingUnit })}
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
