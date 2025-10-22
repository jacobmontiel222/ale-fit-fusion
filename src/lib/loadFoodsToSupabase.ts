// Script para cargar alimentos del CSV a Supabase (ejecutar una sola vez)
import { supabase } from '@/integrations/supabase/client';
import { FoodItem, FoodCategory, FoodTag } from '@/types/food';

const CATEGORY_MAP: Record<string, FoodCategory> = {
  'bebidas': 'bebidas',
  'cereales': 'cereales',
  'frutas': 'frutas',
  'verduras': 'verduras',
  'carnes': 'carnes',
  'pescados': 'pescados',
  'lacteos': 'lacteos',
  'legumbres': 'legumbres',
  'frutos-secos': 'frutos-secos',
  'aceites': 'aceites',
  'huevos': 'huevos',
};

const TAG_MAP: Record<string, FoodTag> = {
  'gluten_free': 'sin-gluten',
  'contains_gluten': 'procesado',
  'high_protein': 'alto-proteina',
  'low_fat': 'bajo-grasa',
  'vegan': 'vegano',
  'vegetarian': 'vegetariano',
  'organic': 'organico',
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseTags(tagsStr: string): FoodTag[] {
  try {
    const cleanStr = tagsStr.replace(/[\[\]"]/g, '');
    if (!cleanStr) return [];
    
    const tags = cleanStr.split(',').map(t => t.trim());
    return tags
      .map(tag => TAG_MAP[tag])
      .filter(Boolean) as FoodTag[];
  } catch {
    return [];
  }
}

async function parseCSVToFoodItems(csvText: string): Promise<any[]> {
  const lines = csvText.split('\n').filter(line => line.trim());
  const headers = parseCSVLine(lines[0]);
  
  const foods: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i]);
      if (values.length < headers.length) continue;

      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });

      const category = CATEGORY_MAP[row.category_es] || 'otros';
      const tags = parseTags(row.tags);

      const food = {
        id: row.id,
        name: row.name_es,
        brand: null,
        category,
        tags,
        calories: parseFloat(row.kcal) || 0,
        protein: parseFloat(row.protein_g) || 0,
        fat: parseFloat(row.fat_g) || 0,
        carbs: parseFloat(row.carbs_g) || 0,
        fiber: parseFloat(row.fiber_g) || null,
        sugar: parseFloat(row.sugars_g) || null,
        micronutrients: {
          vitamins: [
            { name: 'Vitamina A', amount: parseFloat(row.vit_a_ug) || 0, unit: 'μg' },
            { name: 'Vitamina C', amount: parseFloat(row.vit_c_mg) || 0, unit: 'mg' },
            { name: 'Vitamina D', amount: parseFloat(row.vit_d_IU) || 0, unit: 'IU' },
            { name: 'Vitamina E', amount: parseFloat(row.vit_e_mg) || 0, unit: 'mg' },
            { name: 'Vitamina K', amount: parseFloat(row.vit_k_ug) || 0, unit: 'μg' },
            { name: 'Tiamina (B1)', amount: parseFloat(row.b1_mg) || 0, unit: 'mg' },
            { name: 'Riboflavina (B2)', amount: parseFloat(row.b2_mg) || 0, unit: 'mg' },
            { name: 'Niacina (B3)', amount: parseFloat(row.b3_mg) || 0, unit: 'mg' },
            { name: 'Ácido Pantoténico (B5)', amount: parseFloat(row.b5_mg) || 0, unit: 'mg' },
            { name: 'Piridoxina (B6)', amount: parseFloat(row.b6_mg) || 0, unit: 'mg' },
            { name: 'Folato (B9)', amount: parseFloat(row.b9_ug) || 0, unit: 'μg' },
            { name: 'Cobalamina (B12)', amount: parseFloat(row.b12_ug) || 0, unit: 'μg' },
          ].filter(v => v.amount > 0),
          minerals: [
            { name: 'Calcio', amount: parseFloat(row.ca_mg) || 0, unit: 'mg' },
            { name: 'Magnesio', amount: parseFloat(row.mg_mg) || 0, unit: 'mg' },
            { name: 'Potasio', amount: parseFloat(row.k_mg) || 0, unit: 'mg' },
            { name: 'Sodio', amount: parseFloat(row.na_mg) || 0, unit: 'mg' },
            { name: 'Fósforo', amount: parseFloat(row.p_mg) || 0, unit: 'mg' },
            { name: 'Hierro', amount: parseFloat(row.fe_mg) || 0, unit: 'mg' },
            { name: 'Zinc', amount: parseFloat(row.zn_mg) || 0, unit: 'mg' },
            { name: 'Cobre', amount: parseFloat(row.cu_mg) || 0, unit: 'mg' },
            { name: 'Manganeso', amount: parseFloat(row.mn_mg) || 0, unit: 'mg' },
            { name: 'Selenio', amount: parseFloat(row.se_ug) || 0, unit: 'μg' },
            { name: 'Yodo', amount: parseFloat(row.iod_ug) || 0, unit: 'μg' },
          ].filter(m => m.amount > 0),
        },
        serving_size: 100,
        serving_unit: 'g',
        search_terms: [row.search_norm, row.name_es.toLowerCase()].filter(Boolean),
        barcode: null,
      };

      foods.push(food);
    } catch (error) {
      console.error(`Error parsing line ${i}:`, error);
    }
  }

  return foods;
}

export async function loadFoodsToSupabase(): Promise<void> {
  try {
    console.log('🔄 Verificando si ya hay alimentos en Supabase...');
    
    // Verificar si ya hay datos
    const { count } = await supabase
      .from('foods')
      .select('*', { count: 'exact', head: true });
    
    if (count && count > 0) {
      console.log(`✅ Ya hay ${count} alimentos en Supabase`);
      return;
    }

    console.log('📥 Cargando CSV de alimentos...');
    const response = await fetch('/src/data/foods_database.csv');
    const csvText = await response.text();
    
    console.log('🔄 Procesando CSV...');
    const foods = await parseCSVToFoodItems(csvText);
    
    console.log(`📤 Subiendo ${foods.length} alimentos a Supabase...`);
    
    // Insertar en lotes de 100 para evitar timeouts
    const batchSize = 100;
    for (let i = 0; i < foods.length; i += batchSize) {
      const batch = foods.slice(i, i + batchSize);
      const { error } = await supabase
        .from('foods')
        .insert(batch);
      
      if (error) {
        console.error(`Error insertando lote ${i / batchSize + 1}:`, error);
        throw error;
      }
      
      console.log(`✅ Lote ${i / batchSize + 1}/${Math.ceil(foods.length / batchSize)} completado`);
    }
    
    console.log('🎉 Base de datos de alimentos cargada exitosamente en Supabase!');
  } catch (error) {
    console.error('❌ Error cargando alimentos a Supabase:', error);
    throw error;
  }
}
