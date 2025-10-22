// Utilidad para importar alimentos desde JSON o CSV

import { FoodItem } from '@/types/food';
import { foodDatabase } from './foodDatabase';

/**
 * Importa alimentos desde un array de objetos JSON
 */
export async function importFromJSON(foods: FoodItem[]): Promise<{ success: number; errors: number }> {
  let success = 0;
  let errors = 0;

  for (const food of foods) {
    try {
      await foodDatabase.addFood(food);
      success++;
    } catch (error) {
      console.error(`Error importando ${food.name}:`, error);
      errors++;
    }
  }

  return { success, errors };
}

/**
 * Importa alimentos desde un string CSV
 */
export async function importFromCSV(csvString: string): Promise<{ success: number; errors: number }> {
  const lines = csvString.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  const foods: FoodItem[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',').map(v => v.trim());
    
    try {
      const food: Partial<FoodItem> = {
        id: crypto.randomUUID(),
      };
      
      headers.forEach((header, index) => {
        const value = values[index];
        
        switch (header.toLowerCase()) {
          case 'name':
          case 'nombre':
            food.name = value;
            break;
          case 'brand':
          case 'marca':
            food.brand = value;
            break;
          case 'category':
          case 'categoria':
            food.category = value as any;
            break;
          case 'calories':
          case 'calorias':
            food.calories = parseFloat(value);
            break;
          case 'protein':
          case 'proteinas':
            food.protein = parseFloat(value);
            break;
          case 'fat':
          case 'grasas':
            food.fat = parseFloat(value);
            break;
          case 'carbs':
          case 'carbohidratos':
            food.carbs = parseFloat(value);
            break;
          case 'servingsize':
          case 'tamano':
            food.servingSize = parseFloat(value);
            break;
          case 'servingunit':
          case 'unidad':
            food.servingUnit = value;
            break;
        }
      });
      
      // Valores por defecto
      if (food.name && food.calories !== undefined) {
        foods.push({
          ...food,
          tags: food.tags || [],
          micronutrients: food.micronutrients || { vitamins: [], minerals: [] },
          servingSize: food.servingSize || 100,
          servingUnit: food.servingUnit || 'g',
        } as FoodItem);
      }
    } catch (error) {
      console.error(`Error parseando línea ${i}:`, error);
    }
  }
  
  return importFromJSON(foods);
}

/**
 * Exporta todos los alimentos a JSON
 */
export async function exportToJSON(): Promise<string> {
  const foods = await foodDatabase.getAllFoods();
  return JSON.stringify(foods, null, 2);
}

/**
 * Lee un archivo y devuelve su contenido como string
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}
