import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MicronutrientData {
  name: string;
  current: number;
  goal: number;
  unit: string;
}

// Valores diarios recomendados (RDA)
const MICRONUTRIENT_GOALS: Record<string, { goal: number; unit: string }> = {
  // Vitaminas
  'Vitamina A': { goal: 900, unit: 'μg' },
  'Vitamina C': { goal: 90, unit: 'mg' },
  'Vitamina D': { goal: 600, unit: 'IU' },
  'Vitamina E': { goal: 15, unit: 'mg' },
  'Vitamina K': { goal: 120, unit: 'μg' },
  'Tiamina (B1)': { goal: 1.2, unit: 'mg' },
  'Riboflavina (B2)': { goal: 1.3, unit: 'mg' },
  'Niacina (B3)': { goal: 16, unit: 'mg' },
  'Ácido Pantoténico (B5)': { goal: 5, unit: 'mg' },
  'Piridoxina (B6)': { goal: 1.7, unit: 'mg' },
  'Folato (B9)': { goal: 400, unit: 'μg' },
  'Cobalamina (B12)': { goal: 2.4, unit: 'μg' },
  // Minerales
  'Calcio': { goal: 1000, unit: 'mg' },
  'Magnesio': { goal: 400, unit: 'mg' },
  'Potasio': { goal: 3500, unit: 'mg' },
  'Sodio': { goal: 2300, unit: 'mg' },
  'Fósforo': { goal: 700, unit: 'mg' },
  'Hierro': { goal: 18, unit: 'mg' },
  'Zinc': { goal: 11, unit: 'mg' },
  'Cobre': { goal: 0.9, unit: 'mg' },
  'Manganeso': { goal: 2.3, unit: 'mg' },
  'Selenio': { goal: 55, unit: 'μg' },
  'Yodo': { goal: 150, unit: 'μg' },
};

export function useMicronutrients(date: string) {
  const { user } = useAuth();
  const [micronutrients, setMicronutrients] = useState<MicronutrientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMeals, setHasMeals] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchMicronutrients = async () => {
      try {
        setLoading(true);

        const { data: meals, error } = await supabase
          .from('meal_entries')
          .select('micronutrients')
          .eq('user_id', user.id)
          .eq('date', date);

        if (error) {
          console.error('Error fetching meals:', error);
          return;
        }

        setHasMeals(meals && meals.length > 0);

        if (!meals || meals.length === 0) {
          setMicronutrients([]);
          return;
        }

        // Sumar todos los micronutrientes del día
        const totals: Record<string, number> = {};

        console.log('📊 Procesando micronutrientes de', meals.length, 'comidas');

        meals.forEach(meal => {
          if (meal.micronutrients && typeof meal.micronutrients === 'object') {
            console.log('🍽️ Micronutrientes de comida:', meal.micronutrients);
            const micros = meal.micronutrients as {
              vitamins?: Array<{ name: string; amount: number; unit: string }>;
              minerals?: Array<{ name: string; amount: number; unit: string }>;
            };

            // Sumar vitaminas
            if (micros.vitamins) {
              micros.vitamins.forEach(vitamin => {
                if (vitamin.amount > 0) {
                  totals[vitamin.name] = (totals[vitamin.name] || 0) + vitamin.amount;
                }
              });
            }

            // Sumar minerales
            if (micros.minerals) {
              micros.minerals.forEach(mineral => {
                if (mineral.amount > 0) {
                  totals[mineral.name] = (totals[mineral.name] || 0) + mineral.amount;
                }
              });
            }
          }
        });

        // Convertir a formato de datos para la UI
        const micronutrientsData: MicronutrientData[] = Object.keys(MICRONUTRIENT_GOALS)
          .map(name => ({
            name,
            current: Math.round((totals[name] || 0) * 10) / 10,
            goal: MICRONUTRIENT_GOALS[name].goal,
            unit: MICRONUTRIENT_GOALS[name].unit,
          }))
          .filter(m => m.current > 0) // Solo mostrar los que tienen algún valor
          .sort((a, b) => (b.current / b.goal) - (a.current / a.goal)); // Ordenar por % completado descendente

        console.log('✅ Micronutrientes calculados:', micronutrientsData.length, 'items');
        setMicronutrients(micronutrientsData);
      } catch (error) {
        console.error('Error calculating micronutrients:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMicronutrients();

    // Escuchar actualizaciones de comidas
    const handleMealsUpdate = () => {
      fetchMicronutrients();
    };

    window.addEventListener('mealsUpdated', handleMealsUpdate);

    return () => {
      window.removeEventListener('mealsUpdated', handleMealsUpdate);
    };
  }, [user, date]);

  return { micronutrients, loading, hasMeals };
}
