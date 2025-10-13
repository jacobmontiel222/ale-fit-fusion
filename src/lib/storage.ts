// Local storage persistence layer
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

interface Profile {
  name?: string;
  weightUnit: 'kg' | 'lb';
  height?: number;
}

interface Goals {
  dailyCalories: number;
  protein: number;
  fat: number;
  carbs: number;
}

interface WeightEntry {
  date: string;
  kg: number;
}

interface StepsEntry {
  date: string;
  steps: number;
}

interface AppState {
  profile: Profile;
  goals: Goals;
  analyticsWeight: WeightEntry[];
  analyticsSteps: StepsEntry[];
  meals: any[];
  recipes: any[];
}

const DEFAULT_STATE: AppState = {
  profile: {
    weightUnit: 'kg',
  },
  goals: {
    dailyCalories: 2000,
    protein: 150,
    fat: 67,
    carbs: 250,
  },
  analyticsWeight: [],
  analyticsSteps: [],
  meals: [],
  recipes: [],
};

// Get full state
export function getState(): AppState {
  const profile = localStorage.getItem('profile');
  const goals = localStorage.getItem('goals');
  const analyticsWeight = localStorage.getItem('analyticsWeight');
  const analyticsSteps = localStorage.getItem('analyticsSteps');
  const meals = localStorage.getItem('meals');
  const recipes = localStorage.getItem('recipes');

  return {
    profile: profile ? JSON.parse(profile) : DEFAULT_STATE.profile,
    goals: goals ? JSON.parse(goals) : DEFAULT_STATE.goals,
    analyticsWeight: analyticsWeight ? JSON.parse(analyticsWeight) : DEFAULT_STATE.analyticsWeight,
    analyticsSteps: analyticsSteps ? JSON.parse(analyticsSteps) : DEFAULT_STATE.analyticsSteps,
    meals: meals ? JSON.parse(meals) : DEFAULT_STATE.meals,
    recipes: recipes ? JSON.parse(recipes) : DEFAULT_STATE.recipes,
  };
}

// Update state partially
export function setState(patch: Partial<AppState>) {
  Object.entries(patch).forEach(([key, value]) => {
    localStorage.setItem(key, JSON.stringify(value));
  });
}

// Upsert weight entry
export function upsertWeight({ dateISO, kg }: { dateISO: string; kg: number }) {
  const state = getState();
  const index = state.analyticsWeight.findIndex(entry => entry.date === dateISO);
  
  if (index >= 0) {
    state.analyticsWeight[index] = { date: dateISO, kg };
  } else {
    state.analyticsWeight.push({ date: dateISO, kg });
  }
  
  state.analyticsWeight.sort((a, b) => a.date.localeCompare(b.date));
  localStorage.setItem('analyticsWeight', JSON.stringify(state.analyticsWeight));
}

// Upsert steps entry
export function upsertSteps({ dateISO, steps }: { dateISO: string; steps: number }) {
  const state = getState();
  const index = state.analyticsSteps.findIndex(entry => entry.date === dateISO);
  
  if (index >= 0) {
    state.analyticsSteps[index] = { date: dateISO, steps };
  } else {
    state.analyticsSteps.push({ date: dateISO, steps });
  }
  
  state.analyticsSteps.sort((a, b) => a.date.localeCompare(b.date));
  localStorage.setItem('analyticsSteps', JSON.stringify(state.analyticsSteps));
}

// Get date range
export function getRange(type: string, now: Date = new Date()): { start: Date; end: Date; days: string[] } {
  let start: Date;
  let end: Date;

  switch (type) {
    case 'Esta semana':
      start = startOfWeek(now, { locale: es });
      end = endOfWeek(now, { locale: es });
      break;
    case 'La semana pasada':
      const lastWeekDate = new Date(now);
      lastWeekDate.setDate(now.getDate() - 7);
      start = startOfWeek(lastWeekDate, { locale: es });
      end = endOfWeek(lastWeekDate, { locale: es });
      break;
    case 'Este mes':
      start = startOfMonth(now);
      end = endOfMonth(now);
      break;
    case 'El mes pasado':
      const lastMonth = subMonths(now, 1);
      start = startOfMonth(lastMonth);
      end = endOfMonth(lastMonth);
      break;
    case 'Últimos 3 meses':
      start = subMonths(now, 3);
      end = now;
      break;
    case 'Últimos 6 meses':
      start = subMonths(now, 6);
      end = now;
      break;
    default:
      start = startOfWeek(now, { locale: es });
      end = endOfWeek(now, { locale: es });
  }

  const days = eachDayOfInterval({ start, end }).map(date => format(date, 'yyyy-MM-dd'));
  
  return { start, end, days };
}

// Export all data as JSON
export function exportJSON(): string {
  const state = getState();
  return JSON.stringify(state, null, 2);
}

// Import and merge JSON data
export function importJSON(jsonString: string): boolean {
  try {
    const imported = JSON.parse(jsonString) as Partial<AppState>;
    
    // Merge weight data
    if (imported.analyticsWeight) {
      const current = getState().analyticsWeight;
      const merged = [...current];
      
      imported.analyticsWeight.forEach(entry => {
        const index = merged.findIndex(e => e.date === entry.date);
        if (index >= 0) {
          merged[index] = entry;
        } else {
          merged.push(entry);
        }
      });
      
      merged.sort((a, b) => a.date.localeCompare(b.date));
      localStorage.setItem('analyticsWeight', JSON.stringify(merged));
    }
    
    // Merge steps data
    if (imported.analyticsSteps) {
      const current = getState().analyticsSteps;
      const merged = [...current];
      
      imported.analyticsSteps.forEach(entry => {
        const index = merged.findIndex(e => e.date === entry.date);
        if (index >= 0) {
          merged[index] = entry;
        } else {
          merged.push(entry);
        }
      });
      
      merged.sort((a, b) => a.date.localeCompare(b.date));
      localStorage.setItem('analyticsSteps', JSON.stringify(merged));
    }
    
    // Merge other data
    if (imported.profile) {
      localStorage.setItem('profile', JSON.stringify({ ...getState().profile, ...imported.profile }));
    }
    if (imported.goals) {
      localStorage.setItem('goals', JSON.stringify({ ...getState().goals, ...imported.goals }));
    }
    if (imported.meals) {
      localStorage.setItem('meals', JSON.stringify(imported.meals));
    }
    if (imported.recipes) {
      localStorage.setItem('recipes', JSON.stringify(imported.recipes));
    }
    
    return true;
  } catch (error) {
    console.error('Error importing JSON:', error);
    return false;
  }
}

// Save profile
export function saveProfile(partial: Partial<Profile>) {
  const current = getState().profile;
  localStorage.setItem('profile', JSON.stringify({ ...current, ...partial }));
}

// Save goals
export function saveGoals(partial: Partial<Goals>) {
  const current = getState().goals;
  localStorage.setItem('goals', JSON.stringify({ ...current, ...partial }));
}
