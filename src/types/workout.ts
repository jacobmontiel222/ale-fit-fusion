export interface Exercise {
  id: string
  name: string
  routine_part: string
  subcategory: string
  equipment: string
  movement_pattern: string
  notes: string | null
  muscle_weights: Record<string, number>
  is_custom: boolean
}

export interface Routine {
  id: string
  user_id: string
  name: string
  description: string | null
}

export interface WorkoutSession {
  id: string
  user_id: string
  routine_id: string | null
  status: 'active' | 'completed' | 'discarded'
  started_at: string
  finished_at: string | null
  duration_seconds: number | null
  total_volume_kg: number | null
  notes: string | null
}

export interface WorkoutExercise {
  id: string
  session_id: string
  exercise_id: string
  display_name: string | null
  position: number
  muscle_weights_snapshot: Record<string, number> | null
  exercise?: Exercise
  workout_sets?: WorkoutSet[]
}

export interface WorkoutSet {
  id: string
  workout_exercise_id: string
  set_number: number
  set_type: 'warmup' | 'normal' | 'drop' | 'failure' | 'superset'
  weight_kg: number | null
  reps: number | null
  rpe: number | null
  is_completed: boolean
  completed_at: string | null
  ghost_weight_kg: number | null
  ghost_reps: number | null
}

export type MuscleKey =
  | 'Chest_Upper' | 'Chest_Mid' | 'Chest_Lower'
  | 'Front_Delt' | 'Lateral_Delt' | 'Rear_Delt'
  | 'Triceps' | 'Biceps' | 'Brachialis' | 'Brachioradialis'
  | 'Lats' | 'Teres_Major' | 'MidBack' | 'Lower_Traps' | 'Upper_Traps'
  | 'Rotator_Cuff' | 'Serratus' | 'Erectors'
  | 'Glute_Max' | 'Glute_Med'
  | 'Quads' | 'Hamstrings' | 'Adductors' | 'Hip_Flexors'
  | 'Calves_Gastroc' | 'Calves_Soleus' | 'Tibialis_Ant'
  | 'Abs_Rectus' | 'Obliques' | 'Transverse'
  | 'Forearm_Flexors' | 'Forearm_Extensors' | 'Grip'
  | 'Scap_Stabilizers'

// Color mapping for muscle groups using CSS variables from the theme
export const MUSCLE_COLORS: Record<string, string> = {
  Chest_Upper: 'hsl(var(--protein))',
  Chest_Mid: 'hsl(var(--protein))',
  Chest_Lower: 'hsl(var(--protein))',
  Front_Delt: 'hsl(var(--carbs))',
  Lateral_Delt: 'hsl(var(--carbs))',
  Rear_Delt: 'hsl(var(--carbs))',
  Triceps: 'hsl(var(--fat))',
  Biceps: 'hsl(var(--fat))',
  Brachialis: 'hsl(var(--fat))',
  Brachioradialis: 'hsl(var(--fat))',
  Lats: 'hsl(var(--chart-1))',
  Teres_Major: 'hsl(var(--chart-1))',
  MidBack: 'hsl(var(--chart-1))',
  Lower_Traps: 'hsl(var(--chart-1))',
  Upper_Traps: 'hsl(var(--chart-1))',
  Rotator_Cuff: 'hsl(var(--chart-1))',
  Serratus: 'hsl(var(--chart-1))',
  Erectors: 'hsl(var(--chart-1))',
  Glute_Max: 'hsl(var(--accent))',
  Glute_Med: 'hsl(var(--accent))',
  Quads: 'hsl(var(--accent))',
  Hamstrings: 'hsl(var(--accent))',
  Adductors: 'hsl(var(--accent))',
  Hip_Flexors: 'hsl(var(--accent))',
  Calves_Gastroc: 'hsl(var(--accent))',
  Calves_Soleus: 'hsl(var(--accent))',
  Tibialis_Ant: 'hsl(var(--accent))',
  Abs_Rectus: 'hsl(var(--muted-foreground))',
  Obliques: 'hsl(var(--muted-foreground))',
  Transverse: 'hsl(var(--muted-foreground))',
  Forearm_Flexors: 'hsl(var(--fat))',
  Forearm_Extensors: 'hsl(var(--fat))',
  Grip: 'hsl(var(--fat))',
  Scap_Stabilizers: 'hsl(var(--chart-1))',
}

// Muscle group label mapping for display
export const MUSCLE_LABELS: Partial<Record<MuscleKey, string>> = {
  Chest_Upper: 'Pecho sup.',
  Chest_Mid: 'Pecho med.',
  Chest_Lower: 'Pecho inf.',
  Front_Delt: 'Hombro ant.',
  Lateral_Delt: 'Hombro lat.',
  Rear_Delt: 'Hombro post.',
  Triceps: 'Tríceps',
  Biceps: 'Bíceps',
  Brachialis: 'Braquial',
  Brachioradialis: 'Braquiorradial',
  Lats: 'Dorsales',
  Teres_Major: 'Teres mayor',
  MidBack: 'Espalda med.',
  Lower_Traps: 'Trapecio inf.',
  Upper_Traps: 'Trapecio sup.',
  Rotator_Cuff: 'Manguito rot.',
  Serratus: 'Serrato',
  Erectors: 'Erectores',
  Glute_Max: 'Glúteo max.',
  Glute_Med: 'Glúteo med.',
  Quads: 'Cuádriceps',
  Hamstrings: 'Isquiotibiales',
  Adductors: 'Aductores',
  Hip_Flexors: 'Flexores cadera',
  Calves_Gastroc: 'Gemelos',
  Calves_Soleus: 'Sóleo',
  Tibialis_Ant: 'Tibial ant.',
  Abs_Rectus: 'Abdominales',
  Obliques: 'Oblicuos',
  Transverse: 'Transverso',
  Forearm_Flexors: 'Antebrazo flex.',
  Forearm_Extensors: 'Antebrazo ext.',
  Grip: 'Agarre',
  Scap_Stabilizers: 'Estab. escap.',
}
