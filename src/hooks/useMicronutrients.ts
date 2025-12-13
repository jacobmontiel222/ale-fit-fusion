import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MicronutrientData {
  key: string;
  label: string;
  value: number;
  unit: string;
  max?: number;
}

const MICRONUTRIENT_CONFIG: MicronutrientData[] = [
  { key: 'fiber_g', label: 'Dietary fibres', unit: 'g' },
  { key: 'sodium_mg', label: 'Sodium', unit: 'mg', max: 2300 },
  { key: 'potassium_mg', label: 'Potassium', unit: 'mg', max: 3500 },
  { key: 'calcium_mg', label: 'Calcium', unit: 'mg', max: 1000 },
  { key: 'magnesium_mg', label: 'Magnesium', unit: 'mg', max: 400 },
  { key: 'phosphorus_mg', label: 'Phosphorus', unit: 'mg', max: 700 },
  { key: 'iron_mg', label: 'Iron', unit: 'mg', max: 18 },
  { key: 'zinc_mg', label: 'Zinc', unit: 'mg', max: 11 },
  { key: 'selenium_ug', label: 'Selenium', unit: 'μg', max: 55 },
  { key: 'vit_a_re_ug', label: 'Vitamin A (RE)', unit: 'μg', max: 900 },
  { key: 'vit_a_rae_ug', label: 'Vitamin A (RAE)', unit: 'μg', max: 900 },
  { key: 'vit_b1_mg', label: 'Vitamin B1', unit: 'mg', max: 1.2 },
  { key: 'vit_b2_mg', label: 'Vitamin B2', unit: 'mg', max: 1.3 },
  { key: 'vit_b6_mg', label: 'Vitamin B6', unit: 'mg', max: 1.7 },
  { key: 'vit_b12_ug', label: 'Vitamin B12', unit: 'μg', max: 2.4 },
  { key: 'vit_b3_niacin_mg', label: 'Vitamin B3 (Niacin)', unit: 'mg', max: 16 },
  { key: 'vit_b9_folate_ug', label: 'Vitamin B9 (Folate)', unit: 'μg', max: 400 },
  { key: 'vit_b5_pantothenic_mg', label: 'Vitamin B5 (Pantothenic)', unit: 'mg', max: 5 },
  { key: 'vit_c_mg', label: 'Vitamin C', unit: 'mg', max: 90 },
  { key: 'vit_d_ug', label: 'Vitamin D', unit: 'μg', max: 15 },
  { key: 'vit_e_mg', label: 'Vitamin E', unit: 'mg', max: 15 },
];

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
          .select('*')
          .eq('user_id', user.id)
          .eq('date', date);

        if (error) {
          console.error('Error fetching meals:', error);
          return;
        }

        setHasMeals(!!(meals && meals.length));

        if (!meals || meals.length === 0) {
          setMicronutrients(MICRONUTRIENT_CONFIG.map(cfg => ({ ...cfg, value: 0 })));
          return;
        }

        const totals: Record<string, number> = {};
        MICRONUTRIENT_CONFIG.forEach(cfg => { totals[cfg.key] = 0; });

        meals.forEach((meal) => {
          MICRONUTRIENT_CONFIG.forEach(cfg => {
            const val = Number((meal as any)[cfg.key]) || 0;
            totals[cfg.key] = (totals[cfg.key] || 0) + val;
          });
        });

        const micronutrientsData: MicronutrientData[] = MICRONUTRIENT_CONFIG.map(cfg => ({
          ...cfg,
          value: Math.round((totals[cfg.key] || 0) * 10) / 10,
        }));

        setMicronutrients(micronutrientsData);
      } catch (error) {
        console.error('Error calculating micronutrients:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMicronutrients();

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
