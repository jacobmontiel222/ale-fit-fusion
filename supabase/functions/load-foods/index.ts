import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FoodData {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  tags: string[];
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number | null;
  sugar: number | null;
  micronutrients: {
    vitamins: Array<{ name: string; amount: number; unit: string }>;
    minerals: Array<{ name: string; amount: number; unit: string }>;
  };
  serving_size: number;
  serving_unit: string;
  barcode: string | null;
  search_terms: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Check if foods already exist
    const { count } = await supabaseAdmin
      .from('foods')
      .select('*', { count: 'exact', head: true })

    if (count && count > 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Ya hay ${count} alimentos en la base de datos` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the foods data from the request
    const { foods } = await req.json() as { foods: FoodData[] }

    if (!foods || !Array.isArray(foods) || foods.length === 0) {
      throw new Error('No se proporcionaron alimentos para cargar')
    }

    console.log(`Cargando ${foods.length} alimentos...`)

    // Insert in batches of 100
    const batchSize = 100
    let totalInserted = 0

    for (let i = 0; i < foods.length; i += batchSize) {
      const batch = foods.slice(i, i + batchSize)
      
      const { error } = await supabaseAdmin
        .from('foods')
        .insert(batch)

      if (error) {
        console.error(`Error insertando lote ${i / batchSize + 1}:`, error)
        throw error
      }

      totalInserted += batch.length
      console.log(`✅ Lote ${i / batchSize + 1}/${Math.ceil(foods.length / batchSize)} completado`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${totalInserted} alimentos cargados exitosamente` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
