import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Camera, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatsCard } from "@/components/StatsCard";
import { toast } from "@/hooks/use-toast";

interface FoodItem {
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  servingSize: number;
  servingUnit: string;
}

const mockFoods: FoodItem[] = [
  { name: "Arroz basmati", calories: 130, protein: 2.7, fat: 0.3, carbs: 28, servingSize: 100, servingUnit: "g" },
  { name: "Pechuga de pollo", calories: 165, protein: 31, fat: 3.6, carbs: 0, servingSize: 100, servingUnit: "g" },
  { name: "Yogur natural 3.5%", brand: "Danone", calories: 66, protein: 3.5, fat: 3.5, carbs: 4.7, servingSize: 100, servingUnit: "ml" },
  { name: "Huevo entero", calories: 155, protein: 13, fat: 11, carbs: 1.1, servingSize: 1, servingUnit: "unidad" },
  { name: "Plátano", calories: 89, protein: 1.1, fat: 0.3, carbs: 23, servingSize: 1, servingUnit: "unidad" },
  { name: "Almendras", calories: 579, protein: 21, fat: 50, carbs: 22, servingSize: 100, servingUnit: "g" },
];

const AddFood = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const meal = searchParams.get("meal") || "Desayuno";
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [servingAmount, setServingAmount] = useState(100);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualFood, setManualFood] = useState<FoodItem>({
    name: "",
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    servingSize: 100,
    servingUnit: "g",
  });

  const filteredFoods = mockFoods.filter(food =>
    food.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleScan = () => {
    // Mock scanner - in production this would open camera
    toast({
      title: "Escáner activado",
      description: "Funcionalidad de escáner en desarrollo. Usando datos mock...",
    });
    
    // Simulate scanned food
    const scannedFood = {
      name: "Producto escaneado",
      brand: "Marca detectada",
      calories: 250,
      protein: 8,
      fat: 12,
      carbs: 28,
      servingSize: 100,
      servingUnit: "g",
    };
    
    setSelectedFood(scannedFood);
    setServingAmount(100);
  };

  const calculateAdjustedMacros = (food: FoodItem, amount: number) => {
    const multiplier = amount / food.servingSize;
    return {
      calories: Math.round(food.calories * multiplier),
      protein: Math.round(food.protein * multiplier * 10) / 10,
      fat: Math.round(food.fat * multiplier * 10) / 10,
      carbs: Math.round(food.carbs * multiplier * 10) / 10,
    };
  };

  const handleAddFood = () => {
    const foodToAdd = selectedFood || manualFood;
    const adjustedMacros = calculateAdjustedMacros(foodToAdd, servingAmount);
    
    // Store in localStorage
    const existingMeals = JSON.parse(localStorage.getItem("meals") || "{}");
    if (!existingMeals[meal]) {
      existingMeals[meal] = [];
    }
    existingMeals[meal].push({
      ...foodToAdd,
      amount: servingAmount,
      adjustedMacros,
    });
    localStorage.setItem("meals", JSON.stringify(existingMeals));
    
    toast({
      title: "Alimento añadido",
      description: `${foodToAdd.name} añadido a ${meal}`,
    });
    
    navigate("/comidas");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/comidas")}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">
            Añadir a {meal}
          </h1>
        </div>

        {/* Search and Scan */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar alimentos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={handleScan} size="icon">
            <Camera className="w-4 h-4" />
          </Button>
        </div>

        {/* Selected or Manual Food */}
        {(selectedFood || manualEntry) && (
          <StatsCard>
            <div className="space-y-4">
              <div>
                <Label htmlFor="foodName">Nombre del producto</Label>
                <Input
                  id="foodName"
                  value={selectedFood?.name || manualFood.name}
                  onChange={(e) => {
                    if (selectedFood) {
                      setSelectedFood({ ...selectedFood, name: e.target.value });
                    } else {
                      setManualFood({ ...manualFood, name: e.target.value });
                    }
                  }}
                />
              </div>

              {selectedFood && selectedFood.brand && (
                <div>
                  <Label htmlFor="brand">Marca</Label>
                  <Input
                    id="brand"
                    value={selectedFood.brand}
                    onChange={(e) => setSelectedFood({ ...selectedFood, brand: e.target.value })}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="amount">Cantidad</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={servingAmount}
                    onChange={(e) => setServingAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    min={0}
                  />
                </div>
                <div>
                  <Label htmlFor="unit">Unidad</Label>
                  <Input
                    id="unit"
                    value={selectedFood?.servingUnit || manualFood.servingUnit}
                    onChange={(e) => {
                      if (selectedFood) {
                        setSelectedFood({ ...selectedFood, servingUnit: e.target.value });
                      } else {
                        setManualFood({ ...manualFood, servingUnit: e.target.value });
                      }
                    }}
                  />
                </div>
              </div>

              {manualEntry && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Calorías (kcal)</Label>
                    <Input
                      type="number"
                      value={manualFood.calories}
                      onChange={(e) => setManualFood({ ...manualFood, calories: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Proteínas (g)</Label>
                    <Input
                      type="number"
                      value={manualFood.protein}
                      onChange={(e) => setManualFood({ ...manualFood, protein: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Grasas (g)</Label>
                    <Input
                      type="number"
                      value={manualFood.fat}
                      onChange={(e) => setManualFood({ ...manualFood, fat: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Carbohidratos (g)</Label>
                    <Input
                      type="number"
                      value={manualFood.carbs}
                      onChange={(e) => setManualFood({ ...manualFood, carbs: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              )}

              {selectedFood && (
                <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Calorías:</span>
                    <span className="font-semibold">{calculateAdjustedMacros(selectedFood, servingAmount).calories} kcal</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Proteínas:</span>
                    <span className="font-semibold">{calculateAdjustedMacros(selectedFood, servingAmount).protein} g</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Grasas:</span>
                    <span className="font-semibold">{calculateAdjustedMacros(selectedFood, servingAmount).fat} g</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Carbohidratos:</span>
                    <span className="font-semibold">{calculateAdjustedMacros(selectedFood, servingAmount).carbs} g</span>
                  </div>
                </div>
              )}

              <Button onClick={handleAddFood} className="w-full">
                Añadir a {meal}
              </Button>
            </div>
          </StatsCard>
        )}

        {/* Manual Entry Option */}
        {!selectedFood && !manualEntry && (
          <Button
            variant="outline"
            onClick={() => setManualEntry(true)}
            className="w-full"
          >
            Entrada manual
          </Button>
        )}

        {/* Search Results */}
        {!selectedFood && !manualEntry && searchQuery && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Resultados</h3>
            {filteredFoods.map((food, index) => (
              <StatsCard key={index} className="cursor-pointer" onClick={() => {
                setSelectedFood(food);
                setServingAmount(food.servingSize);
              }}>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-foreground">{food.name}</h4>
                    {food.brand && <p className="text-xs text-muted-foreground">{food.brand}</p>}
                    <p className="text-sm text-muted-foreground mt-1">
                      {food.calories} kcal · P: {food.protein}g · G: {food.fat}g · C: {food.carbs}g
                    </p>
                    <p className="text-xs text-muted-foreground">por {food.servingSize} {food.servingUnit}</p>
                  </div>
                  <Button size="sm">Añadir</Button>
                </div>
              </StatsCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AddFood;
