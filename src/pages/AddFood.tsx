import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Camera, Search, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatsCard } from "@/components/StatsCard";
import { toast } from "@/hooks/use-toast";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { getFoodHistory, addToHistory, type HistoryItem } from "@/lib/foodHistory";
import { addMealItem, type MealItem } from "@/lib/meals";

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
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [foodHistory, setFoodHistory] = useState<HistoryItem[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<any>(null);
  
  useEffect(() => {
    setFoodHistory(getFoodHistory());
  }, []);

  const filteredFoods = mockFoods.filter(food =>
    food.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stopScanner = () => {
    try {
      controlsRef.current?.stop();
    } catch {}
    setScanning(false);
  };

  useEffect(() => {
    return () => stopScanner();
  }, []);

  const startScanner = async () => {
    setScannerOpen(true);
    setScanning(true);
    if (!readerRef.current) {
      readerRef.current = new BrowserMultiFormatReader();
    }
    await new Promise(r => setTimeout(r, 50));
    
    try {
      await readerRef.current.decodeFromVideoDevice(undefined, videoRef.current!, async (result, err, controls) => {
        if (!result) return;
        controlsRef.current = controls;
        const barcode = result.getText();
        if (!/^\d{8,14}$/.test(barcode)) return;
        
        controls?.stop();
        stopScanner();
        setScannerOpen(false);
        
        try {
          const url = import.meta.env.VITE_N8N_BARCODE_URL ?? "https://jacobfityourself.app.n8n.cloud/webhook-test/barcode";
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ barcode })
          });
          const data = await res.json();
          
          console.log("📦 Datos recibidos del webhook:", data);
          console.log("📊 per_100g:", data.per_100g);
          
          // El webhook devuelve un array, tomamos el primer elemento
          const productData = Array.isArray(data) ? data[0] : data;
          
          if (productData?.error) {
            toast({
              title: "No encontrado",
              description: "No hay coincidencias para este código.",
            });
            return;
          }
          
          const item: FoodItem = {
            name: productData.name ?? "Producto",
            brand: productData.brand ?? "",
            calories: productData.per_100g?.kcal ?? 0,
            protein: productData.per_100g?.protein ?? 0,  // Sin el sufijo _g
            fat: productData.per_100g?.fat ?? 0,          // Sin el sufijo _g
            carbs: productData.per_100g?.carbs ?? 0,      // Sin el sufijo _g
            servingSize: 100,
            servingUnit: "g",
          };
          
          setSelectedFood(item);
          setServingAmount(item.servingSize);
          
          toast({
            title: "Escaneado",
            description: `${item.name} detectado`,
          });
        } catch {
          toast({
            title: "Error",
            description: "Fallo al consultar el producto.",
            variant: "destructive",
          });
        }
      });
    } catch (error) {
      toast({
        title: "Error de cámara",
        description: "Autoriza la cámara o usa HTTPS.",
        variant: "destructive",
      });
      setScannerOpen(false);
      setScanning(false);
    }
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
    
    // Check if adding to recipe
    if (meal === "recipe") {
      // Add to recipe items in sessionStorage temporarily
      const recipeItem = {
        name: foodToAdd.name,
        amount: servingAmount,
        unit: foodToAdd.servingUnit,
        calories: adjustedMacros.calories,
        protein: adjustedMacros.protein,
        fat: adjustedMacros.fat,
        carbs: adjustedMacros.carbs,
      };
      
      const pendingRecipeItems = JSON.parse(sessionStorage.getItem("pendingRecipeItems") || "[]");
      pendingRecipeItems.push(recipeItem);
      sessionStorage.setItem("pendingRecipeItems", JSON.stringify(pendingRecipeItems));
      
      navigate("/create-recipe");
      return;
    }
    
    // Add to food history
    addToHistory({
      name: foodToAdd.name,
      brand: foodToAdd.brand,
      calories: foodToAdd.calories,
      protein: foodToAdd.protein,
      fat: foodToAdd.fat,
      carbs: foodToAdd.carbs,
      servingSize: foodToAdd.servingSize,
      servingUnit: foodToAdd.servingUnit,
      meal: meal,
    });
    
    // Add to daily meals
    const today = new Date().toISOString().split('T')[0];
    const mealItem: MealItem = {
      name: foodToAdd.name,
      brand: foodToAdd.brand,
      calories: adjustedMacros.calories,
      protein: adjustedMacros.protein,
      fat: adjustedMacros.fat,
      carbs: adjustedMacros.carbs,
      amount: servingAmount,
      unit: foodToAdd.servingUnit,
      addedAt: new Date().toISOString(),
    };
    
    addMealItem(today, meal as 'Desayuno' | 'Comida' | 'Cena', mealItem);
    
    toast({
      title: "Alimento añadido",
      description: `${foodToAdd.name} añadido a ${meal}`,
    });
    
    navigate("/comidas");
  };
  
  const handleHistoryItemClick = (item: HistoryItem) => {
    setSelectedFood({
      name: item.name,
      brand: item.brand,
      calories: item.calories,
      protein: item.protein,
      fat: item.fat,
      carbs: item.carbs,
      servingSize: item.servingSize,
      servingUnit: item.servingUnit,
    });
    setServingAmount(item.servingSize);
    setManualEntry(false);
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
          <Button onClick={startScanner} size="icon">
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
        
        {/* Food History */}
        {!selectedFood && !manualEntry && !searchQuery && foodHistory.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Clock className="w-4 h-4" />
              <h3>Historial reciente</h3>
            </div>
            {foodHistory.slice(0, 10).map((item) => (
              <StatsCard 
                key={item.id} 
                className="cursor-pointer hover:bg-secondary/50 transition-colors" 
                onClick={() => handleHistoryItemClick(item)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{item.name}</h4>
                    {item.brand && <p className="text-xs text-muted-foreground">{item.brand}</p>}
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.calories} kcal · P: {item.protein}g · G: {item.fat}g · C: {item.carbs}g
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.servingSize} {item.servingUnit} · {item.meal}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost">Añadir</Button>
                </div>
              </StatsCard>
            ))}
          </div>
        )}
      </div>

      {/* Scanner Modal */}
      {scannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
          <div className="flex items-center justify-between p-4 text-white">
            <span className="font-semibold">Escanea el código de barras</span>
            <Button
              variant="secondary"
              onClick={() => {
                stopScanner();
                setScannerOpen(false);
              }}
            >
              Cerrar
            </Button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          </div>
          <div className="p-4 text-center text-white">
            {scanning ? "Apunta al código…" : "Preparando cámara…"}
          </div>
        </div>
      )}
    </div>
  );
};

export default AddFood;
