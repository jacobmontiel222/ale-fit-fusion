import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FoodItem, FoodCategory } from '@/types/food';

function mapSupabaseFoodToFoodItem(row: any): FoodItem {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand || undefined,
    category: row.category as FoodCategory,
    tags: row.tags || [],
    calories: row.calories,
    protein: row.protein,
    fat: row.fat,
    carbs: row.carbs,
    fiber: row.fiber || undefined,
    sugar: row.sugar || undefined,
    micronutrients: row.micronutrients || { vitamins: [], minerals: [] },
    servingSize: row.serving_size,
    servingUnit: row.serving_unit,
    barcode: row.barcode || undefined,
    searchTerms: row.search_terms || undefined,
    lastUpdated: row.last_updated || undefined,
  };
}

export function useFoodsDatabase() {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadFoods();
  }, []);

  const loadFoods = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('foods')
        .select('*')
        .order('name');

      if (queryError) throw queryError;

      const mappedFoods = (data || []).map(mapSupabaseFoodToFoodItem);
      setFoods(mappedFoods);
    } catch (err) {
      console.error('Error loading foods from Supabase:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const searchFoods = async (query: string, categories?: FoodCategory[]): Promise<FoodItem[]> => {
    try {
      let queryBuilder = supabase
        .from('foods')
        .select('*');

      // Filtrar por categorías si se especifican
      if (categories && categories.length > 0) {
        queryBuilder = queryBuilder.in('category', categories);
      }

      // Búsqueda por texto
      if (query.trim()) {
        queryBuilder = queryBuilder.or(
          `name.ilike.%${query}%,search_terms.cs.{${query.toLowerCase()}}`
        );
      }

      const { data, error: queryError } = await queryBuilder
        .order('name')
        .limit(50);

      if (queryError) throw queryError;

      return (data || []).map(mapSupabaseFoodToFoodItem);
    } catch (err) {
      console.error('Error searching foods:', err);
      return [];
    }
  };

  const getFoodById = async (id: string): Promise<FoodItem | null> => {
    try {
      const { data, error: queryError } = await supabase
        .from('foods')
        .select('*')
        .eq('id', id)
        .single();

      if (queryError) throw queryError;
      if (!data) return null;

      return mapSupabaseFoodToFoodItem(data);
    } catch (err) {
      console.error('Error getting food by id:', err);
      return null;
    }
  };

  return {
    foods,
    loading,
    error,
    searchFoods,
    getFoodById,
    reload: loadFoods,
  };
}
