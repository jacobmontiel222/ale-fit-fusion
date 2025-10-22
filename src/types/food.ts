// Tipos para la base de datos de alimentos

export interface Micronutrient {
  name: string;
  amount: number;
  unit: string;
  dailyValue?: number; // % del valor diario recomendado
}

export interface FoodItem {
  id: string;
  name: string;
  names?: {
    es?: string;
    en?: string;
    fr?: string;
    de?: string;
    it?: string;
    pt?: string;
    pl?: string;
  };
  brand?: string;
  category: FoodCategory;
  tags: FoodTag[];
  
  // Macronutrientes por 100g
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber?: number;
  sugar?: number;
  
  // Micronutrientes por 100g
  micronutrients: {
    vitamins: Micronutrient[];
    minerals: Micronutrient[];
  };
  
  // Información adicional
  servingSize: number;
  servingUnit: string;
  barcode?: string;
  
  // Metadatos
  searchTerms?: string[]; // Para mejorar búsqueda
  lastUpdated?: string;
}

export type FoodCategory = 
  | 'frutas'
  | 'verduras'
  | 'carnes'
  | 'pescados'
  | 'lacteos'
  | 'legumbres'
  | 'cereales'
  | 'frutos-secos'
  | 'bebidas'
  | 'aceites'
  | 'huevos'
  | 'otros';

export type FoodTag = 
  | 'alto-proteina'
  | 'bajo-grasa'
  | 'alto-fibra'
  | 'bajo-calorias'
  | 'vegano'
  | 'vegetariano'
  | 'sin-gluten'
  | 'sin-lactosa'
  | 'organico'
  | 'procesado';

export interface FoodSearchFilters {
  query: string;
  categories: FoodCategory[];
  tags: FoodTag[];
}

export interface FoodSearchResult {
  item: FoodItem;
  relevance: number; // Score de relevancia para ordenar resultados
}
