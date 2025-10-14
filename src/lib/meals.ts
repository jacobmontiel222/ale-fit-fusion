// Meals management with daily persistence
export interface MealItem {
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  amount: number;
  unit: string;
  addedAt: string;
}

export interface DailyMeals {
  [date: string]: {
    Desayuno: MealItem[];
    Comida: MealItem[];
    Cena: MealItem[];
  };
}

const MEALS_KEY = 'dailyMeals';

export function getDailyMeals(dateISO: string): { Desayuno: MealItem[]; Comida: MealItem[]; Cena: MealItem[] } {
  try {
    const allMeals: DailyMeals = JSON.parse(localStorage.getItem(MEALS_KEY) || '{}');
    return allMeals[dateISO] || {
      Desayuno: [],
      Comida: [],
      Cena: [],
    };
  } catch {
    return {
      Desayuno: [],
      Comida: [],
      Cena: [],
    };
  }
}

export function addMealItem(dateISO: string, meal: 'Desayuno' | 'Comida' | 'Cena', item: MealItem): void {
  try {
    const allMeals: DailyMeals = JSON.parse(localStorage.getItem(MEALS_KEY) || '{}');
    
    if (!allMeals[dateISO]) {
      allMeals[dateISO] = {
        Desayuno: [],
        Comida: [],
        Cena: [],
      };
    }
    
    allMeals[dateISO][meal].push(item);
    localStorage.setItem(MEALS_KEY, JSON.stringify(allMeals));
  } catch (error) {
    console.error('Error adding meal item:', error);
  }
}

export function removeMealItem(dateISO: string, meal: 'Desayuno' | 'Comida' | 'Cena', index: number): void {
  try {
    const allMeals: DailyMeals = JSON.parse(localStorage.getItem(MEALS_KEY) || '{}');
    
    if (allMeals[dateISO] && allMeals[dateISO][meal]) {
      allMeals[dateISO][meal].splice(index, 1);
      localStorage.setItem(MEALS_KEY, JSON.stringify(allMeals));
    }
  } catch (error) {
    console.error('Error removing meal item:', error);
  }
}

export function getMealTotals(items: MealItem[]): { calories: number; protein: number; fat: number; carbs: number } {
  return items.reduce(
    (totals, item) => ({
      calories: totals.calories + item.calories,
      protein: totals.protein + item.protein,
      fat: totals.fat + item.fat,
      carbs: totals.carbs + item.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );
}
