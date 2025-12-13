import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Barcode, Search, Clock, Camera, Plus, Star, Trash2, ClipboardPen, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatsCard } from "@/components/StatsCard";
import { toast } from "sonner";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { getFoodHistory, addToHistory, type HistoryItem, removeFromHistory } from "@/lib/foodHistory";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { FoodDetailsModal } from "@/components/FoodDetailsModal";
import { FoodItem as FoodItemType } from "@/types/food";
import { foodDatabase } from "@/lib/foodDatabase";
import { searchFoods } from "@/lib/foodSearch";
import { useTranslation } from "react-i18next";
import { initializeFoodDatabase } from "@/lib/initFoodDatabase";
import { useProfile } from "@/hooks/useProfile";
import { useRef as useReactRef } from "react";
import { Micronutrient } from "@/types/food";

const CAMERA_PERMISSION_KEY = "cameraPermissionGranted";
const PROCESSING_SPINNER_SIZE = "w-12 h-12";
const SWIPE_DELETE_THRESHOLD = 80;
const SWIPE_MAX_OFFSET = 140;

interface FoodItem {
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber?: number;
  sugar?: number;
  servingSize: number;
  servingUnit: string;
  barcode?: string;
  vitamins?: Micronutrient[];
  minerals?: Micronutrient[];
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
  const { profile } = useProfile();
  const { t, i18n } = useTranslation();
  const meal = searchParams.get("meal") || t('meals.breakfast');
  const selectedDate = searchParams.get("date") || new Date().toISOString().split('T')[0];
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [servingAmount, setServingAmount] = useState(100);
  const [servingAmountInput, setServingAmountInput] = useState('100');
  const [manualEntry, setManualEntry] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [foodHistory, setFoodHistory] = useState<HistoryItem[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<any>(null);
  const processingScanRef = useRef(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDatabaseFood, setSelectedDatabaseFood] = useState<FoodItemType | null>(null);
  const [databaseFoods, setDatabaseFoods] = useState<FoodItemType[]>([]);
  const [searchResults, setSearchResults] = useState<FoodItemType[]>([]);
  const [localSearchResults, setLocalSearchResults] = useState<FoodItemType[]>([]);
  const [communityResults, setCommunityResults] = useState<FoodItemType[]>([]);
  const [favorites, setFavorites] = useState<FoodItemType[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [detailsEditable, setDetailsEditable] = useState(false);
  const [historySwipeOffset, setHistorySwipeOffset] = useState<Record<string, number>>({});
  const [historyRemoving, setHistoryRemoving] = useState<Record<string, boolean>>({});
  const historyTouchStart = useReactRef<Record<string, number>>({});
  const historySwipeTriggered = useReactRef(false);
  const historyForCurrentMeal = foodHistory.filter(item => item.meal === meal);
  const displayedHistory = historyForCurrentMeal.slice(0, 8);
  
  // Helper para obtener el nombre del alimento en el idioma actual
  const getFoodName = (food: FoodItemType): string => {
    if (food.names) {
      const langKey = i18n.language as keyof typeof food.names;
      return food.names[langKey] || food.name;
    }
    return food.name;
  };

  const getFoodKey = (food: Partial<FoodItemType>): string => {
    return food.barcode || food.id || `${food.name}:${food.brand || ''}:${food.servingUnit}:${food.servingSize}`;
  };

  const historyToFoodItem = (item: HistoryItem): FoodItemType => ({
    id: `history-${item.name}-${item.brand || ''}-${item.servingSize}-${item.servingUnit}`,
    name: item.name,
    brand: item.brand || undefined,
    category: 'otros',
    tags: [],
    calories: item.calories,
    protein: item.protein,
    fat: item.fat,
    carbs: item.carbs,
    micronutrients: { vitamins: [], minerals: [] },
    servingSize: item.servingSize,
    servingUnit: item.servingUnit,
    barcode: (item as any)?.barcode || undefined,
    searchTerms: [],
    lastUpdated: undefined,
  });

  const mapMicrosFromSource = (source: any): { vitamins: Micronutrient[]; minerals: Micronutrient[] } => {
    const vitamins: Micronutrient[] = [];
    const minerals: Micronutrient[] = [];

    const addMicro = (collection: Micronutrient[], name: string, value: any, unit: string) => {
      const num = Number(value);
      if (!Number.isFinite(num) || num === 0) return;
      collection.push({ name, amount: num, unit });
    };

    // Minerals
    addMicro(minerals, "Sodium", source.sodium_mg, "mg");
    addMicro(minerals, "Potassium", source.potassium_mg, "mg");
    addMicro(minerals, "Calcium", source.calcium_mg, "mg");
    addMicro(minerals, "Magnesium", source.magnesium_mg, "mg");
    addMicro(minerals, "Phosphorus", source.phosphorus_mg, "mg");
    addMicro(minerals, "Iron", source.iron_mg, "mg");
    addMicro(minerals, "Zinc", source.zinc_mg, "mg");
    addMicro(minerals, "Selenium", source.selenium_ug, "μg");

    // Vitamins
    addMicro(vitamins, "Vitamin A (RE)", source.vit_a_re_ug, "μg");
    addMicro(vitamins, "Vitamin A (RAE)", source.vit_a_rae_ug, "μg");
    addMicro(vitamins, "Vitamin B1", source.vit_b1_mg, "mg");
    addMicro(vitamins, "Vitamin B2", source.vit_b2_mg, "mg");
    addMicro(vitamins, "Vitamin B6", source.vit_b6_mg, "mg");
    addMicro(vitamins, "Vitamin B12", source.vit_b12_ug, "μg");
    addMicro(vitamins, "Vitamin B3 (Niacin)", source.vit_b3_niacin_mg, "mg");
    addMicro(vitamins, "Vitamin B9 (Folate)", source.vit_b9_folate_ug, "μg");
    addMicro(vitamins, "Vitamin B5 (Pantothenic)", source.vit_b5_pantothenic_mg, "mg");
    addMicro(vitamins, "Vitamin C", source.vit_c_mg, "mg");
    addMicro(vitamins, "Vitamin D", source.vit_d_ug, "μg");
    addMicro(vitamins, "Vitamin E", source.vit_e_mg, "mg");

    return { vitamins, minerals };
  };

  const scannedFoodToFoodItemType = (food: FoodItem): FoodItemType => ({
    id: `scan-${food.name}-${food.brand || ''}-${Date.now()}`,
    name: food.name,
    brand: food.brand || undefined,
    category: 'otros',
    tags: [],
    calories: food.calories,
    protein: food.protein,
    fat: food.fat,
    carbs: food.carbs,
    fiber: food.fiber,
    sugar: food.sugar,
    micronutrients: mapMicrosFromSource({
      vitamins: food.vitamins,
      minerals: food.minerals,
      sodium_mg: (food as any).sodium_mg,
      potassium_mg: (food as any).potassium_mg,
      calcium_mg: (food as any).calcium_mg,
      magnesium_mg: (food as any).magnesium_mg,
      phosphorus_mg: (food as any).phosphorus_mg,
      iron_mg: (food as any).iron_mg,
      zinc_mg: (food as any).zinc_mg,
      selenium_ug: (food as any).selenium_ug,
      vit_a_re_ug: (food as any).vit_a_re_ug,
      vit_a_rae_ug: (food as any).vit_a_rae_ug,
      vit_b1_mg: (food as any).vit_b1_mg,
      vit_b2_mg: (food as any).vit_b2_mg,
      vit_b6_mg: (food as any).vit_b6_mg,
      vit_b12_ug: (food as any).vit_b12_ug,
      vit_b3_niacin_mg: (food as any).vit_b3_niacin_mg,
      vit_b9_folate_ug: (food as any).vit_b9_folate_ug,
      vit_b5_pantothenic_mg: (food as any).vit_b5_pantothenic_mg,
      vit_c_mg: (food as any).vit_c_mg,
      vit_d_ug: (food as any).vit_d_ug,
      vit_e_mg: (food as any).vit_e_mg,
    }),
    servingSize: food.servingSize,
    servingUnit: food.servingUnit,
    barcode: food.barcode,
    searchTerms: [],
    lastUpdated: undefined,
  });

  const buildEditableFood = (seed?: Partial<FoodItemType>): FoodItemType => ({
    id: seed?.id || `manual-${Date.now()}`,
    name: seed?.name || '',
    brand: seed?.brand,
    category: seed?.category || 'otros',
    tags: seed?.tags || [],
    calories: seed?.calories ?? 0,
    protein: seed?.protein ?? 0,
    fat: seed?.fat ?? 0,
    carbs: seed?.carbs ?? 0,
    fiber: seed?.fiber,
    sugar: seed?.sugar,
    micronutrients: seed?.micronutrients || { vitamins: [], minerals: [] },
    servingSize: seed?.servingSize ?? 100,
    servingUnit: seed?.servingUnit || 'g',
    barcode: seed?.barcode,
    searchTerms: seed?.searchTerms || [],
    lastUpdated: seed?.lastUpdated,
  });

  const persistFavorites = (list: FoodItemType[]) => {
    if (!user?.id) return;
    setFavorites(list);
    localStorage.setItem(`favorites_${user.id}`, JSON.stringify(list));
  };

  const toggleFavorite = (food: FoodItemType, opts?: { confirmRemoval?: boolean }) => {
    if (!user?.id) {
      toast.error(t('addFood.loginRequiredFavorites'));
      return;
    }
    const key = getFoodKey(food);
    const exists = favorites.some(f => getFoodKey(f) === key);

    if (exists) {
      if (opts?.confirmRemoval && !window.confirm(t('addFood.removeFavoriteConfirm'))) {
        return;
      }
      persistFavorites(favorites.filter(f => getFoodKey(f) !== key));
      return;
    }

    persistFavorites([...favorites, food]);
  };

  const isFavorite = (food: Partial<FoodItemType>) => {
    const key = getFoodKey(food);
    return favorites.some(f => getFoodKey(f) === key);
  };

  const removeHistoryItem = (id: string) => {
    removeFromHistory(id);
    setFoodHistory(prev => prev.filter(item => item.id !== id));
    setHistorySwipeOffset(prev => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
    setHistoryRemoving(prev => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleHistorySwipeStart = (id: string, clientX: number) => {
    historyTouchStart.current[id] = clientX;
    historySwipeTriggered.current = false;
  };

  const handleHistorySwipeMove = (id: string, clientX: number) => {
    const startX = historyTouchStart.current[id];
    if (startX === undefined) return;
    const delta = clientX - startX;
    if (delta < 0) {
      setHistorySwipeOffset(prev => ({
        ...prev,
        [id]: Math.max(delta, -SWIPE_MAX_OFFSET),
      }));
    } else {
      setHistorySwipeOffset(prev => ({
        ...prev,
        [id]: 0,
      }));
    }
  };

  const handleHistorySwipeEnd = (id: string, clientX: number) => {
    const startX = historyTouchStart.current[id] ?? clientX;
    const delta = startX - clientX;
    delete historyTouchStart.current[id];

    if (delta > SWIPE_DELETE_THRESHOLD) {
      historySwipeTriggered.current = true;
      setHistoryRemoving(prev => ({ ...prev, [id]: true }));
      setHistorySwipeOffset(prev => ({ ...prev, [id]: -SWIPE_MAX_OFFSET }));
      setTimeout(() => removeHistoryItem(id), 200);
      return;
    }
    // Reset position if no delete
    setHistorySwipeOffset(prev => ({
      ...prev,
      [id]: 0,
    }));
  };
  
  useEffect(() => {
    setFoodHistory(getFoodHistory());
  }, []);

  // Cargar favoritos por usuario
  useEffect(() => {
    if (!user?.id) {
      setFavorites([]);
      return;
    }
    try {
      const stored = localStorage.getItem(`favorites_${user.id}`);
      setFavorites(stored ? JSON.parse(stored) : []);
    } catch {
      setFavorites([]);
    }
  }, [user?.id]);

  // Reset view when se abre la pantalla con otro meal/fecha
  useEffect(() => {
    setShowFavorites(false);
    setManualEntry(false);
    setSelectedFood(null);
  }, [meal, selectedDate]);
  
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

  // Buscar en la base de datos local cuando cambia el query
  useEffect(() => {
    if (!searchQuery.trim() || databaseFoods.length === 0) {
      setLocalSearchResults([]);
      return;
    }

    const results = searchFoods(databaseFoods, {
      query: searchQuery,
      categories: [],
      tags: [],
    }, 0.3);

    setLocalSearchResults(results.map(r => r.item).slice(0, 20));
  }, [searchQuery, databaseFoods]);

  // Combinar resultados comunitarios + locales (prioridad comunidad)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const seen = new Set<string>();
    const combined: FoodItemType[] = [];

    communityResults.forEach((item) => {
      const key = item.barcode || item.id;
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(item);
      }
    });

    localSearchResults.forEach((item) => {
      const key = item.barcode || item.id;
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(item);
      }
    });

    setSearchResults(combined);
  }, [searchQuery, communityResults, localSearchResults]);

  const stopScanner = () => {
    try {
      controlsRef.current?.stop();
    } catch {}
    setScanning(false);
  };

  useEffect(() => {
    return () => stopScanner();
  }, []);

  // Buscar alimentos comunitarios en Supabase
  useEffect(() => {
    let active = true;

    const fetchCommunityFoods = async () => {
      if (!searchQuery.trim()) {
        setCommunityResults([]);
        return;
      }

      try {
        const queryText = searchQuery.trim();
        const { data, error } = await supabase
          .from('community_foods')
          .select('id, barcode, name, brand, base_serving, base_unit, calories, protein, carbs, fat, updated_at')
          .or(`name.ilike.%${queryText}%,brand.ilike.%${queryText}%`)
          .order('name')
          .limit(30);

        if (error) throw error;

        if (!active) return;

        const mapped = (data || []).map((row) => ({
          id: row.id,
          name: row.name,
          brand: row.brand || undefined,
          category: 'otros',
          tags: [],
          calories: Number(row.calories) || 0,
          protein: Number(row.protein) || 0,
          fat: Number(row.fat) || 0,
          carbs: Number(row.carbs) || 0,
          micronutrients: { vitamins: [], minerals: [] },
          servingSize: Number(row.base_serving) || 100,
          servingUnit: row.base_unit || 'g',
          barcode: row.barcode || undefined,
          searchTerms: [],
          lastUpdated: row.updated_at || undefined,
        } as FoodItemType));

        setCommunityResults(mapped);
      } catch (error) {
        console.error('Error buscando alimentos comunitarios:', error);
        if (active) setCommunityResults([]);
      }
    };

    fetchCommunityFoods();

    return () => {
      active = false;
    };
  }, [searchQuery]);

  const markCameraGranted = () => {
    localStorage.setItem(CAMERA_PERMISSION_KEY, "true");
  };

  const checkCameraPermission = async (): Promise<boolean | null> => {
    if (!navigator.permissions || !('query' in navigator.permissions)) {
      return null;
    }

    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      if (result.state === "granted") {
        markCameraGranted();
        return true;
      }
      if (result.state === "denied") {
        return false;
      }
      return null;
    } catch {
      return null;
    }
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error(t('addFood.cameraUnavailable'));
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      stream.getTracks().forEach((track) => track.stop());
      markCameraGranted();
      return true;
    } catch {
      return false;
    }
  };

  const ensureCameraPermission = async (): Promise<boolean> => {
    const stored = localStorage.getItem(CAMERA_PERMISSION_KEY);
    if (stored === "true") {
      const state = await checkCameraPermission();
      if (state === false) {
        localStorage.removeItem(CAMERA_PERMISSION_KEY);
        return false;
      }
      // Stored flag plus non-denied system state is enough to proceed without re-prompt.
      return true;
    }

    const permissionState = await checkCameraPermission();
    if (permissionState === true) {
      return true;
    }

    return requestCameraPermission();
  };

  const handleOpenCamera = () => {
    photoInputRef.current?.click();
  };

  const handlePhotoSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);

      const res = await fetch("https://jacobfityourself.app.n8n.cloud/webhook/analyze-food", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Request failed");
      }

      const data = await res.json();
      const { protein, fat, carbs, calories } = data || {};
      if (
        protein === undefined ||
        fat === undefined ||
        carbs === undefined ||
        calories === undefined
      ) {
        throw new Error("Invalid response");
      }

      openManualModal({
        name: "",
        protein: Number(protein) || 0,
        fat: Number(fat) || 0,
        carbs: Number(carbs) || 0,
        calories: Number(calories) || 0,
      });

      toast.success(t('addFood.photoSuccess'));
    } catch (error) {
      console.error("Error uploading photo", error);
      toast.error(t('addFood.photoError'));
    } finally {
      setIsUploadingPhoto(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const upsertCommunityFood = async (food: FoodItem, source: 'scan' | 'manual') => {
    if (!profile?.share_foods_with_community) return;

    const unit = (food.servingUnit || '').toLowerCase();
    if (unit !== 'g' && unit !== 'ml') {
      console.warn('Saltando compartir: unidad no permitida', unit);
      return;
    }

    try {
      const { error } = await supabase
        .from('community_foods')
        .upsert({
          barcode: food.barcode || null,
          name: food.name,
          brand: food.brand || null,
          base_serving: food.servingSize || 100,
          base_unit: unit,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          created_by: user?.id || null,
          source,
        }, {
          onConflict: 'barcode',
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error compartiendo alimento con la comunidad:', error);
    }
  };

  const startScanner = async () => {
    processingScanRef.current = false;
    setIsProcessingScan(false);

    const hasPermission = await ensureCameraPermission();
    if (!hasPermission) {
      toast.error(t('addFood.cameraAuthorize'));
      setScannerOpen(false);
      setScanning(false);
      return;
    }

    setScannerOpen(true);
    setScanning(true);
    if (!readerRef.current) {
      readerRef.current = new BrowserMultiFormatReader();
    }
    await new Promise(r => setTimeout(r, 50));
    
    try {
      await readerRef.current.decodeFromVideoDevice(undefined, videoRef.current!, async (result, err, controls) => {
        if (!result || processingScanRef.current) return;
        controlsRef.current = controls;
        const barcode = result.getText();
        if (!/^\d{8,14}$/.test(barcode)) return;
        
        processingScanRef.current = true;
        setIsProcessingScan(true);
        setScanning(false);
        controls?.stop();
        stopScanner();
        
        try {
          const url = import.meta.env.VITE_N8N_BARCODE_URL ?? "https://jacobfityourself.app.n8n.cloud/webhook/barcode";
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ barcode })
          });
          const data = await res.json();
          
          console.log("?? Datos recibidos del webhook:", data);
          console.log("?? per_100g:", data?.per_100g);
          
          // El webhook devuelve un array, tomamos el primer elemento
          const productData = Array.isArray(data) ? data[0] : data;
          
          if (productData?.error) {
            toast.error(t('addFood.barcodeNoMatches'));
            setIsProcessingScan(false);
            setScannerOpen(false);
            processingScanRef.current = false;
            return;
          }
          
          const per100 = productData?.per_100g ?? productData ?? {};
          const item: FoodItem = {
            name: productData.name ?? t('addFood.defaultProductName'),
            brand: productData.brand ?? "",
            calories: per100.kcal ?? per100.calories ?? 0,
            protein: per100.protein ?? per100.protein_g ?? 0,
            fat: per100.fat ?? per100.fat_g ?? 0,
            carbs: per100.carbs ?? per100.carbs_g ?? 0,
            sugar: per100.sugars_g ?? per100.sugar ?? 0,
            fiber: per100.fiber_g ?? per100.fiber ?? 0,
            servingSize: 100,
            servingUnit: "g",
            barcode,
            vitamins: [],
            minerals: [],
          };
          
          setSelectedFood(null);
          setManualEntry(false);
          const mapped = scannedFoodToFoodItemType(item);
          handleSelectFromDatabase(mapped);
          toast.success(t('addFood.scanDetected', { item: item.name }));
          setIsProcessingScan(false);
          setScannerOpen(false);
          processingScanRef.current = false;
        } catch {
          toast.error(t('addFood.scanLookupError'));
          setIsProcessingScan(false);
          setScannerOpen(false);
          processingScanRef.current = false;
        }
      });
    } catch (error) {
      toast.error(t('addFood.cameraHttps'));
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
      toast.error(t('addFood.loginRequiredMeals'));
      return;
    }

    const foodToAdd = selectedFood;
    if (!Number.isFinite(servingAmount) || servingAmount <= 0) {
      toast.error(t('addFood.invalidAmount'));
      return;
    }
    if (!foodToAdd) {
      toast.error(t('addFood.invalidAmount'));
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
      toast.error(t('addFood.addError'));
      console.error(error);
      return;
    }
    
    // Compartir con comunidad si aplica (no bloquea el flujo)
    const source: 'scan' | 'manual' = foodToAdd.barcode ? 'scan' : 'manual';
    upsertCommunityFood(foodToAdd, source);

    // Trigger meals update event
    window.dispatchEvent(new CustomEvent('mealsUpdated'));
    
    toast.success(t('addFood.addSuccess', { food: foodToAdd.name, meal }));
    navigate("/comidas");
  };
  
  const handleHistoryItemClick = (item: HistoryItem) => {
    if (historySwipeTriggered.current) {
      historySwipeTriggered.current = false;
      return;
    }
    const food = historyToFoodItem(item);
    handleSelectFromDatabase(food);
  };
  
  // Manejar selección de alimento desde la base de datos
  const handleSelectFromDatabase = (food: FoodItemType) => {
    setDetailsEditable(false);
    setManualEntry(false);
    setSelectedDatabaseFood(food);
    setShowDetailsModal(true);
  };

  const openManualModal = (seed?: Partial<FoodItemType>) => {
    setShowFavorites(false);
    setSelectedFood(null);
    setDetailsEditable(true);
    setManualEntry(true);
    setSelectedDatabaseFood(buildEditableFood(seed));
    setShowDetailsModal(true);
  };

  const handleDetailsOpenChange = (open: boolean) => {
    setShowDetailsModal(open);
    if (!open) {
      setSelectedDatabaseFood(null);
      setDetailsEditable(false);
      setManualEntry(false);
    }
  };
  
  // Añadir alimento desde la base de datos
  const handleAddFromDatabase = async (food: FoodItemType, amount: number) => {
    if (!user) {
      toast.error(t('addFood.loginRequiredMeals'));
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t('addFood.invalidAmount'));
      return;
    }

    const baseSize = food.servingSize || 100;
    const multiplier = amount / baseSize;
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
      toast.error(t('addFood.addError'));
      console.error(error);
      return;
    }
    
    // Trigger meals update event
    window.dispatchEvent(new CustomEvent('mealsUpdated'));
    
    toast.success(t('addFood.addSuccess', { food: food.name, meal }));
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

        {/* Search and Controls */}
        <div className="flex items-center gap-2 flex-nowrap">
          <div className="flex-1 min-w-[140px] max-w-[220px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('addFood.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <Button onClick={handleOpenCamera} size="icon" variant="outline" disabled={isUploadingPhoto} title={t('addFood.photoCapture')}>
            <Camera className="w-4 h-4" />
          </Button>
          <Button onClick={startScanner} size="icon" title={t('addFood.scanBarcode')}>
            <Barcode className="w-4 h-4" />
          </Button>
          <Button
            variant={manualEntry ? "default" : "outline"}
            size="icon"
            className="h-10 w-10"
            title={t('addFood.manualEntry')}
            aria-label={t('addFood.manualEntry')}
            onClick={() => {
              openManualModal();
            }}
          >
            <ClipboardPen className="w-4 h-4" />
          </Button>
          <Button
            variant={showFavorites ? "default" : "outline"}
            size="icon"
            className="h-10 w-10"
            title={t('addFood.myFoods')}
            aria-label={t('addFood.myFoods')}
            onClick={() => {
              setManualEntry(false);
              setSelectedFood(null);
              setShowFavorites((prev) => !prev);
            }}
          >
            <Bookmark className="w-4 h-4" />
          </Button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoSelected}
          />
        </div>

        {/* Selected Food (escaneado o elegido) */}
        {selectedFood && (
          <StatsCard>
            <div className="space-y-4">
              <div>
                <Label htmlFor="foodName">{t('addFood.productName')}</Label>
                <Input
                  id="foodName"
                  value={selectedFood?.name || ""}
                  onChange={(e) => setSelectedFood(selectedFood ? { ...selectedFood, name: e.target.value } : null)}
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
                    value={selectedFood?.servingUnit || ''}
                    onChange={(e) => {
                      if (selectedFood) {
                        setSelectedFood({ ...selectedFood, servingUnit: e.target.value });
                      }
                    }}
                  />
                </div>
              </div>

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

        {/* Favorites list */}
        {!selectedFood && showFavorites && !manualEntry && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">
                {t('addFood.myFoods')}
              </h3>
              <Button size="sm" variant="ghost" onClick={() => setShowFavorites(false)}>
                {t('common.cancel')}
              </Button>
            </div>
            {favorites.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground text-sm">
                {t('addFood.noFavorites')}
              </p>
            ) : (
              favorites.map((food) => (
                <StatsCard
                  key={getFoodKey(food)}
                  className="cursor-pointer hover:bg-secondary/60 transition-colors px-3 py-0.5 h-full"
                  onClick={() => handleSelectFromDatabase(food)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-foreground leading-tight truncate">{getFoodName(food)}</h4>
                        {food.brand && <span className="text-[11px] text-muted-foreground truncate">· {food.brand}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground font-semibold flex items-center gap-2">
                        <span>{food.calories} kcal | {food.protein}P {food.fat}G {food.carbs}C</span>
                        <span className="text-[11px] text-muted-foreground">({t('foodSearch.per')} {food.servingSize} {food.servingUnit})</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectFromDatabase(food);
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(food, { confirmRemoval: true });
                        }}
                      >
                        <Star
                          className={`w-4 h-4 ${isFavorite(food) ? 'text-primary fill-primary' : 'text-muted-foreground'}`}
                        />
                      </Button>
                    </div>
                  </div>
                </StatsCard>
              ))
            )}
          </div>
        )}

        {/* Search Results - mostrar resultados de la base de datos */}
        {!selectedFood && !manualEntry && !showFavorites && searchQuery && searchResults.length > 0 && (
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
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{getFoodName(food)}</h4>
                    {food.brand && <p className="text-xs text-muted-foreground">{food.brand}</p>}
                    <p className="text-sm text-muted-foreground mt-1">
                      {food.calories} kcal Жњ P: {food.protein}g Жњ G: {food.fat}g Жњ C: {food.carbs}g
                    </p>
                    <p className="text-xs text-muted-foreground">{t('foodSearch.per')} {food.servingSize} {food.servingUnit}</p>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectFromDatabase(food);
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(food);
                      }}
                    >
                      <Star className={`w-4 h-4 ${isFavorite(food) ? 'text-primary fill-primary' : 'text-muted-foreground'}`} />
                    </Button>
                  </div>
                </div>
              </StatsCard>
            ))}
          </div>
        )}

        {!selectedFood && !manualEntry && !showFavorites && searchQuery && searchResults.length === 0 && databaseFoods.length > 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>{t('addFood.noResults', { query: searchQuery })}</p>
            <p className="text-sm mt-1">{t('addFood.tryOther')}</p>
          </div>
        )}
        
        {/* Food History */}
        {!selectedFood && !manualEntry && !showFavorites && !searchQuery && displayedHistory.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Clock className="w-4 h-4" />
              <h3>{t('addFood.recentHistory')}</h3>
            </div>
            <div className="flex flex-col gap-2">
              {displayedHistory.map((item) => {
                const offset = historySwipeOffset[item.id] || 0;
                const progress = Math.min(Math.abs(offset) / SWIPE_DELETE_THRESHOLD, 1);
                const removing = historyRemoving[item.id];

                return (
                  <div
                    key={item.id}
                    className="relative overflow-hidden h-full"
                    style={{
                      maxHeight: removing ? 0 : 500,
                      opacity: removing ? 0 : 1,
                      transition: removing
                        ? 'max-height 0.25s ease, opacity 0.2s ease'
                        : 'max-height 0.25s ease',
                    }}
                  >
                    <div
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                      style={{
                        width: `${Math.max(48, Math.abs(offset))}px`,
                        backgroundColor:
                          Math.abs(offset) >= SWIPE_DELETE_THRESHOLD
                            ? '#ef4444'
                            : `rgba(239, 68, 68, ${progress * 0.7})`,
                        justifyContent: 'flex-end',
                        pointerEvents: 'none',
                      }}
                    >
                      <Trash2
                        className="w-5 h-5"
                        style={{
                          color: 'white',
                          opacity: progress,
                          transform: `scale(${0.8 + 0.4 * progress})`,
                          transition: 'opacity 0.1s ease, transform 0.1s ease',
                        }}
                      />
                    </div>
                    <StatsCard 
                      className="cursor-pointer hover:bg-secondary/60 transition-colors px-3 py-0.5 h-full"
                      onClick={() => handleHistoryItemClick(item)}
                      onTouchStart={(e) => handleHistorySwipeStart(item.id, e.touches[0]?.clientX || 0)}
                      onTouchMove={(e) => handleHistorySwipeMove(item.id, e.touches[0]?.clientX || 0)}
                      onTouchEnd={(e) => handleHistorySwipeEnd(item.id, e.changedTouches[0]?.clientX || 0)}
                      onMouseDown={(e) => handleHistorySwipeStart(item.id, e.clientX)}
                      onMouseMove={(e) => handleHistorySwipeMove(item.id, e.clientX)}
                      onMouseUp={(e) => handleHistorySwipeEnd(item.id, e.clientX)}
                      style={{
                        transform: removing ? 'translateX(-120%)' : `translateX(${offset}px)`,
                        transition: removing
                          ? 'transform 0.2s ease, opacity 0.2s ease'
                          : offset === 0
                            ? 'transform 0.15s ease-out'
                            : 'transform 0s',
                        opacity: removing ? 0 : 1,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-foreground leading-tight truncate">{item.name}</h4>
                            {item.brand && <span className="text-[11px] text-muted-foreground truncate">· {item.brand}</span>}
                          </div>
                          <p className="text-xs text-muted-foreground font-semibold">
                            {item.calories} kcal | {item.protein}P {item.fat}G {item.carbs}C
                          </p>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleHistoryItemClick(item);
                            }}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              const food = historyToFoodItem(item);
                              toggleFavorite(food);
                            }}
                          >
                            <Star
                              className={`w-4 h-4 ${isFavorite(historyToFoodItem(item)) ? 'text-primary fill-primary' : 'text-muted-foreground'}`}
                            />
                          </Button>
                        </div>
                      </div>
                    </StatsCard>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Scanner Modal */}
      {scannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
          {!isProcessingScan ? (
            <>
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
              <div className="relative flex-1 flex items-center justify-center">
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-56 h-36 border-2 border-white rounded-lg opacity-80" />
                </div>
              </div>
              <div className="p-4 text-center text-white">
                {scanning ? t('addFood.pointToCode') : t('addFood.preparingCamera')}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-white px-6">
              <div className={`${PROCESSING_SPINNER_SIZE} border-4 border-white/30 border-t-white rounded-full animate-spin`} />
              <div className="text-center space-y-1">
                <p className="text-lg font-semibold">
                  {t('addFood.processingBarcode')}
                </p>
                <p className="text-sm text-white/80">
                  {t('addFood.processingWait')}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {isUploadingPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center gap-4 text-white px-6">
          <div className={`${PROCESSING_SPINNER_SIZE} border-4 border-white/30 border-t-white rounded-full animate-spin`} />
          <div className="text-center space-y-1">
            <p className="text-lg font-semibold">
              {t('addFood.processingPhoto')}
            </p>
            <p className="text-sm text-white/80">
              {t('addFood.processingPhotoWait')}
            </p>
          </div>
        </div>
      )}
      
      
      <FoodDetailsModal
        food={selectedDatabaseFood}
        open={showDetailsModal}
        onOpenChange={handleDetailsOpenChange}
        onAddFood={handleAddFromDatabase}
        editable={detailsEditable}
      />
    </div>
  );
};

export default AddFood;
