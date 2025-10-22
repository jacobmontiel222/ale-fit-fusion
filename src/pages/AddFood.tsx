import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Barcode, Search, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatsCard } from "@/components/StatsCard";
import { toast } from "sonner";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { getFoodHistory, addToHistory, type HistoryItem } from "@/lib/foodHistory";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { FoodDetailsModal } from "@/components/FoodDetailsModal";
import { FoodItem as FoodItemType } from "@/types/food";
import { foodDatabase } from "@/lib/foodDatabase";
import { searchFoods } from "@/lib/foodSearch";
import { useTranslation } from "react-i18next";
import { initializeFoodDatabase } from "@/lib/initFoodDatabase";

interface FoodItem {
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  servingSize: number;
  servingUnit: string;
  barcode?: string;
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
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const meal = searchParams.get("meal") || t('meals.breakfast');
  const selectedDate = searchParams.get("date") || new Date().toISOString().split('T')[0];
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [servingAmount, setServingAmount] = useState(100);
  const [servingAmountInput, setServingAmountInput] = useState('100');
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
  
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDatabaseFood, setSelectedDatabaseFood] = useState<FoodItemType | null>(null);
  const [databaseFoods, setDatabaseFoods] = useState<FoodItemType[]>([]);
  const [searchResults, setSearchResults] = useState<FoodItemType[]>([]);
  
  // Helper para obtener el nombre del alimento en el idioma actual
  const getFoodName = (food: FoodItemType): string => {
    if (food.names) {
      const langKey = i18n.language as keyof typeof food.names;
      return food.names[langKey] || food.name;
    }
    return food.name;
  };
  
  useEffect(() => {
    setFoodHistory(getFoodHistory());
  }, []);
  
  // Cargar base de datos de alimentos y recargar cuando cambie el idioma
  useEffect(() => {
    const loadFoodDatabase = async () => {
      try {
        // Limpiar y recargar con el idioma actual
        await foodDatabase.clearAll();
        await initializeFoodDatabase(i18n.language);
        
        const foods = await foodDatabase.getAllFoods();
        setDatabaseFoods(foods);
        console.log(`Loaded ${foods.length} foods in ${i18n.language}`);
      } catch (error) {
        console.error('Error cargando base de datos de alimentos:', error);
      }
    };
    
    loadFoodDatabase();
  }, [i18n.language]);

  // Buscar en la base de datos cuando cambia el query
  useEffect(() => {
    if (!searchQuery.trim() || databaseFoods.length === 0) {
      setSearchResults([]);
      return;
    }

    const results = searchFoods(databaseFoods, {
      query: searchQuery,
      categories: [],
      tags: [],
    }, 0.3);

    setSearchResults(results.map(r => r.item).slice(0, 20));
  }, [searchQuery, databaseFoods]);

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
          const url = import.meta.env.VITE_N8N_BARCODE_URL ?? "https://jacobfityourself.app.n8n.cloud/webhook/barcode";
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
            toast.error("No hay coincidencias para este código.");
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
          toast.success(`${item.name} detectado`);
        } catch {
          toast.error("Fallo al consultar el producto.");
        }
      });
    } catch (error) {
      toast.error("Autoriza la cámara o usa HTTPS.");
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

  const handleAddFood = async () => {
    if (!user) {
      toast.error("Debes iniciar sesión para añadir comidas");
      return;
    }

    const foodToAdd = selectedFood || manualFood;
    if (!Number.isFinite(servingAmount) || servingAmount <= 0) {
      toast.error("Introduce una cantidad válida mayor que 0");
      return;
    }
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
    
    // Add to Supabase meal_entries
    const { error } = await supabase
      .from('meal_entries')
      .insert({
        user_id: user.id,
        date: selectedDate,
        meal_type: meal,
        food_name: foodToAdd.name,
        brand: foodToAdd.brand || null,
        amount: servingAmount,
        unit: foodToAdd.servingUnit,
        calories: adjustedMacros.calories,
        protein: adjustedMacros.protein,
        fat: adjustedMacros.fat,
        carbs: adjustedMacros.carbs,
        barcode: foodToAdd.barcode || null,
        entry_method: 'manual'
      });

    if (error) {
      toast.error("Error al añadir el alimento");
      console.error(error);
      return;
    }
    
    // Trigger meals update event
    window.dispatchEvent(new CustomEvent('mealsUpdated'));
    
    toast.success(`${foodToAdd.name} añadido a ${meal}`);
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
    setServingAmountInput(String(item.servingSize));
  };
  
  // Manejar selección de alimento desde la base de datos
  const handleSelectFromDatabase = (food: FoodItemType) => {
    setSelectedDatabaseFood(food);
    setShowDetailsModal(true);
  };
  
  // Añadir alimento desde la base de datos
  const handleAddFromDatabase = async (food: FoodItemType, amount: number) => {
    if (!user) {
      toast.error("Debes iniciar sesión para añadir comidas");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Introduce una cantidad válida mayor que 0");
      return;
    }

    const multiplier = amount / 100; // La base de datos tiene valores por 100g
    const adjustedMacros = {
      calories: Math.round(food.calories * multiplier),
      protein: Math.round(food.protein * multiplier * 10) / 10,
      fat: Math.round(food.fat * multiplier * 10) / 10,
      carbs: Math.round(food.carbs * multiplier * 10) / 10,
    };
    
    // Calcular micronutrientes ajustados
    console.log('🍎 Alimento desde DB:', food.name);
    console.log('🔬 Micronutrientes originales:', food.micronutrients);
    
    const adjustedMicronutrients = {
      vitamins: food.micronutrients.vitamins.map(v => ({
        name: v.name,
        amount: Math.round(v.amount * multiplier * 100) / 100,
        unit: v.unit,
        dailyValue: v.dailyValue
      })),
      minerals: food.micronutrients.minerals.map(m => ({
        name: m.name,
        amount: Math.round(m.amount * multiplier * 100) / 100,
        unit: m.unit,
        dailyValue: m.dailyValue
      }))
    };
    
    console.log('📊 Micronutrientes ajustados a guardar:', adjustedMicronutrients);
    
    // Check if adding to recipe
    if (meal === "recipe") {
      const recipeItem = {
        name: food.name,
        amount: amount,
        unit: food.servingUnit,
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
      name: food.name,
      brand: food.brand,
      calories: food.calories,
      protein: food.protein,
      fat: food.fat,
      carbs: food.carbs,
      servingSize: food.servingSize,
      servingUnit: food.servingUnit,
      meal: meal,
    });
    
    // Add to Supabase meal_entries
    const { error } = await supabase
      .from('meal_entries')
      .insert({
        user_id: user.id,
        date: selectedDate,
        meal_type: meal,
        food_name: food.name,
        brand: food.brand || null,
        amount: amount,
        unit: food.servingUnit,
        calories: adjustedMacros.calories,
        protein: adjustedMacros.protein,
        fat: adjustedMacros.fat,
        carbs: adjustedMacros.carbs,
        barcode: food.barcode || null,
        entry_method: 'database',
        micronutrients: adjustedMicronutrients
      });

    if (error) {
      toast.error("Error al añadir el alimento");
      console.error(error);
      return;
    }
    
    // Trigger meals update event
    window.dispatchEvent(new CustomEvent('mealsUpdated'));
    
    toast.success(`${food.name} añadido a ${meal}`);
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
            {t('addFood.title', { meal })}
          </h1>
        </div>

        {/* Search and Scan */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('addFood.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={startScanner} size="icon" title={t('addFood.scanBarcode')}>
            <Barcode className="w-4 h-4" />
          </Button>
        </div>

        {/* Selected or Manual Food */}
        {(selectedFood || manualEntry) && (
          <StatsCard>
            <div className="space-y-4">
              <div>
                <Label htmlFor="foodName">{t('addFood.productName')}</Label>
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
                  <Label htmlFor="brand">{t('addFood.brand')}</Label>
                  <Input
                    id="brand"
                    value={selectedFood.brand}
                    onChange={(e) => setSelectedFood({ ...selectedFood, brand: e.target.value })}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="amount">{t('addFood.amount')}</Label>
                  <Input
                    id="amount"
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    value={servingAmountInput}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (/^[0-9]*[.,]?[0-9]*$/.test(raw)) {
                        const cleaned = raw.replace(/^0+(?=\d)/, '');
                        setServingAmountInput(cleaned);
                        const parsed = parseFloat(cleaned.replace(',', '.'));
                        if (!isNaN(parsed)) setServingAmount(parsed);
                      }
                    }}
                    onBlur={() => {
                      if (servingAmountInput === '') {
                        setServingAmountInput('0');
                        setServingAmount(0);
                      }
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="unit">{t('addFood.unit')}</Label>
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
                    <Label>{t('addFood.calories')}</Label>
                    <Input
                      type="number"
                      value={manualFood.calories}
                      onChange={(e) => {
                        const val = e.target.value;
                        setManualFood({ ...manualFood, calories: val === '' ? 0 : parseFloat(val) });
                      }}
                    />
                  </div>
                  <div>
                    <Label>{t('addFood.protein')}</Label>
                    <Input
                      type="number"
                      value={manualFood.protein}
                      onChange={(e) => {
                        const val = e.target.value;
                        setManualFood({ ...manualFood, protein: val === '' ? 0 : parseFloat(val) });
                      }}
                    />
                  </div>
                  <div>
                    <Label>{t('addFood.fat')}</Label>
                    <Input
                      type="number"
                      value={manualFood.fat}
                      onChange={(e) => {
                        const val = e.target.value;
                        setManualFood({ ...manualFood, fat: val === '' ? 0 : parseFloat(val) });
                      }}
                    />
                  </div>
                  <div>
                    <Label>{t('addFood.carbs')}</Label>
                    <Input
                      type="number"
                      value={manualFood.carbs}
                      onChange={(e) => {
                        const val = e.target.value;
                        setManualFood({ ...manualFood, carbs: val === '' ? 0 : parseFloat(val) });
                      }}
                    />
                  </div>
                </div>
              )}

              {selectedFood && (
                <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('addFood.calories')}:</span>
                    <span className="font-semibold">{calculateAdjustedMacros(selectedFood, servingAmount).calories} kcal</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('addFood.protein')}:</span>
                    <span className="font-semibold">{calculateAdjustedMacros(selectedFood, servingAmount).protein} g</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('addFood.fat')}:</span>
                    <span className="font-semibold">{calculateAdjustedMacros(selectedFood, servingAmount).fat} g</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('addFood.carbs')}:</span>
                    <span className="font-semibold">{calculateAdjustedMacros(selectedFood, servingAmount).carbs} g</span>
                  </div>
                </div>
              )}

              <Button onClick={handleAddFood} className="w-full">
                {t('addFood.addTo', { meal })}
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
            {t('addFood.manualEntry')}
          </Button>
        )}

        {/* Search Results - mostrar resultados de la base de datos */}
        {!selectedFood && !manualEntry && searchQuery && searchResults.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              {t('addFood.results')} ({searchResults.length})
            </h3>
            {searchResults.map((food) => (
              <StatsCard 
                key={food.id} 
                className="cursor-pointer hover:border-primary transition-colors" 
                onClick={() => handleSelectFromDatabase(food)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-foreground">{getFoodName(food)}</h4>
                    {food.brand && <p className="text-xs text-muted-foreground">{food.brand}</p>}
                    <p className="text-sm text-muted-foreground mt-1">
                      {food.calories} kcal · P: {food.protein}g · G: {food.fat}g · C: {food.carbs}g
                    </p>
                    <p className="text-xs text-muted-foreground">{t('foodSearch.per')} {food.servingSize} {food.servingUnit}</p>
                  </div>
                </div>
              </StatsCard>
            ))}
          </div>
        )}

        {!selectedFood && !manualEntry && searchQuery && searchResults.length === 0 && databaseFoods.length > 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>{t('addFood.noResults', { query: searchQuery })}</p>
            <p className="text-sm mt-1">{t('addFood.tryOther')}</p>
          </div>
        )}
        
        {/* Food History */}
        {!selectedFood && !manualEntry && !searchQuery && foodHistory.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Clock className="w-4 h-4" />
              <h3>{t('addFood.recentHistory')}</h3>
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
                  <Button size="sm" variant="ghost">{t('addFood.add')}</Button>
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
            <span className="font-semibold">{t('addFood.scanBarcodeLabel')}</span>
            <Button
              variant="secondary"
              onClick={() => {
                stopScanner();
                setScannerOpen(false);
              }}
            >
              {t('addFood.close')}
            </Button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          </div>
          <div className="p-4 text-center text-white">
            {scanning ? t('addFood.pointToCode') : t('addFood.preparingCamera')}
          </div>
        </div>
      )}
      
      
      <FoodDetailsModal
        food={selectedDatabaseFood}
        open={showDetailsModal}
        onOpenChange={setShowDetailsModal}
        onAddFood={handleAddFromDatabase}
      />
    </div>
  );
};

export default AddFood;
