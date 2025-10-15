import { useState, useEffect } from "react";
import { Plus, ChevronLeft, ChevronRight, Search, Copy, Trash2, Play, Save, FileText } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface Set {
  id: string;
  series: number;
  weight: number;
  reps: number;
  rpe?: number;
  rest?: number;
}

interface Exercise {
  id: string;
  name: string;
  sets: Set[];
}

interface Routine {
  id: string;
  date: string;
  title: string;
  exercises: Exercise[];
  notes?: string;
}

const exerciseLibrary = [
  "Sentadilla",
  "Prensa",
  "Extensión de cuádriceps",
  "Curl femoral",
  "Gemelos",
  "Press banca",
  "Press inclinado",
  "Aperturas",
  "Dominadas",
  "Remo con barra",
  "Peso muerto",
  "Hip thrust",
];

const Gimnasio = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  // Load routines from Supabase
  useEffect(() => {
    const loadRoutines = async () => {
      if (!user) return;

      const { data: routinesData } = await supabase
        .from('gym_routines')
        .select(`
          *,
          routine_exercises(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (routinesData) {
        const formattedRoutines: Routine[] = routinesData.map(r => ({
          id: r.id,
          date: r.created_at.split('T')[0],
          title: r.name,
          notes: r.description || "",
          exercises: (r.routine_exercises || []).map((ex: any) => ({
            id: ex.id,
            name: ex.exercise_name,
            sets: Array.from({ length: ex.sets }, (_, i) => ({
              id: `${ex.id}_${i}`,
              series: i + 1,
              weight: ex.weight || 0,
              reps: ex.reps || 0,
            }))
          }))
        }));
        setRoutines(formattedRoutines);
      }
    };

    loadRoutines();
  }, [user]);

  // Generate calendar days (current week)
  const getWeekDays = () => {
    const days = [];
    const current = new Date(selectedDate);
    const dayOfWeek = current.getDay();
    const startOfWeek = new Date(current);
    startOfWeek.setDate(current.getDate() - dayOfWeek);

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const getRoutinesForDate = (date: Date) => {
    return routines.filter(r => r.date === formatDate(date));
  };

  const createNewRoutine = async () => {
    if (!user) return;

    const { data: newRoutineData, error } = await supabase
      .from('gym_routines')
      .insert({
        user_id: user.id,
        name: "Nueva Rutina",
        description: "",
        is_active: true
      })
      .select()
      .single();

    if (error || !newRoutineData) return;

    const newRoutine: Routine = {
      id: newRoutineData.id,
      date: newRoutineData.created_at.split('T')[0],
      title: newRoutineData.name,
      exercises: [],
      notes: newRoutineData.description || "",
    };
    
    setRoutines([newRoutine, ...routines]);
    setEditingRoutine(newRoutine);
  };

  const addExercise = (exerciseName: string) => {
    if (!editingRoutine) return;
    
    const newExercise: Exercise = {
      id: Date.now().toString(),
      name: exerciseName,
      sets: [{
        id: Date.now().toString(),
        series: 1,
        weight: 0,
        reps: 0,
      }],
    };

    const updatedRoutine = {
      ...editingRoutine,
      exercises: [...editingRoutine.exercises, newExercise],
    };
    
    setEditingRoutine(updatedRoutine);
    setShowExerciseSearch(false);
    setExerciseSearch("");
  };

  const addSet = (exerciseId: string) => {
    if (!editingRoutine) return;
    
    const updatedExercises = editingRoutine.exercises.map(ex => {
      if (ex.id === exerciseId) {
        const lastSet = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [...ex.sets, {
            id: Date.now().toString(),
            series: ex.sets.length + 1,
            weight: lastSet?.weight || 0,
            reps: lastSet?.reps || 0,
          }],
        };
      }
      return ex;
    });

    setEditingRoutine({ ...editingRoutine, exercises: updatedExercises });
  };

  const duplicateSet = (exerciseId: string, setId: string) => {
    if (!editingRoutine) return;
    
    const updatedExercises = editingRoutine.exercises.map(ex => {
      if (ex.id === exerciseId) {
        const setToDuplicate = ex.sets.find(s => s.id === setId);
        if (setToDuplicate) {
          return {
            ...ex,
            sets: [...ex.sets, {
              ...setToDuplicate,
              id: Date.now().toString(),
              series: ex.sets.length + 1,
            }],
          };
        }
      }
      return ex;
    });

    setEditingRoutine({ ...editingRoutine, exercises: updatedExercises });
  };

  const deleteSet = (exerciseId: string, setId: string) => {
    if (!editingRoutine) return;
    
    const updatedExercises = editingRoutine.exercises.map(ex => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          sets: ex.sets.filter(s => s.id !== setId).map((s, idx) => ({ ...s, series: idx + 1 })),
        };
      }
      return ex;
    }).filter(ex => ex.sets.length > 0);

    setEditingRoutine({ ...editingRoutine, exercises: updatedExercises });
  };

  const updateSet = (exerciseId: string, setId: string, field: keyof Set, value: number) => {
    if (!editingRoutine) return;
    
    const updatedExercises = editingRoutine.exercises.map(ex => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          sets: ex.sets.map(s => 
            s.id === setId ? { ...s, [field]: value } : s
          ),
        };
      }
      return ex;
    });

    setEditingRoutine({ ...editingRoutine, exercises: updatedExercises });
  };

  const saveRoutine = async () => {
    if (!editingRoutine || !user) return;

    // Update routine in Supabase
    const { error: routineError } = await supabase
      .from('gym_routines')
      .update({
        name: editingRoutine.title,
        description: editingRoutine.notes
      })
      .eq('id', editingRoutine.id)
      .eq('user_id', user.id);

    if (routineError) {
      console.error('Error saving routine:', routineError);
      return;
    }

    // Delete existing exercises
    await supabase
      .from('routine_exercises')
      .delete()
      .eq('routine_id', editingRoutine.id);

    // Insert new exercises
    for (const exercise of editingRoutine.exercises) {
      if (exercise.sets.length > 0) {
        const firstSet = exercise.sets[0];
        await supabase
          .from('routine_exercises')
          .insert({
            routine_id: editingRoutine.id,
            exercise_name: exercise.name,
            sets: exercise.sets.length,
            reps: firstSet.reps || 0,
            weight: firstSet.weight || 0,
            order_index: 0
          });
      }
    }
    
    setRoutines(routines.map(r => r.id === editingRoutine.id ? editingRoutine : r));
    setEditingRoutine(null);
  };

  const filteredExercises = exerciseLibrary.filter(ex =>
    ex.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  const weekDays = getWeekDays();
  const dayRoutines = getRoutinesForDate(selectedDate);

  if (editingRoutine) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="max-w-md mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditingRoutine(null)}
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <Input
              value={editingRoutine.title}
              onChange={(e) => setEditingRoutine({ ...editingRoutine, title: e.target.value })}
              className="flex-1 mx-4 text-xl font-bold text-center bg-card border-none"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNotes(true)}
            >
              <FileText className="w-6 h-6" />
            </Button>
          </div>

          {/* Exercises */}
          <div className="space-y-4 mb-6">
            {editingRoutine.exercises.map((exercise) => (
              <StatsCard key={exercise.id}>
                <h3 className="text-lg font-semibold text-foreground mb-4">{exercise.name}</h3>
                
                {/* Sets Table Header */}
                <div className="grid grid-cols-6 gap-2 mb-2 text-xs text-muted-foreground">
                  <span className="text-center">Serie</span>
                  <span className="text-center">Kg</span>
                  <span className="text-center">Reps</span>
                  <span className="text-center">RPE</span>
                  <span className="text-center">Rest</span>
                  <span></span>
                </div>

                {/* Sets */}
                {exercise.sets.map((set) => (
                  <div key={set.id} className="grid grid-cols-6 gap-2 mb-2">
                    <div className="flex items-center justify-center text-sm font-semibold">
                      {set.series}
                    </div>
                    <Input
                      type="number"
                      value={set.weight || ''}
                      onChange={(e) => updateSet(exercise.id, set.id, 'weight', Number(e.target.value))}
                      className="h-8 text-center text-sm"
                    />
                    <Input
                      type="number"
                      value={set.reps || ''}
                      onChange={(e) => updateSet(exercise.id, set.id, 'reps', Number(e.target.value))}
                      className="h-8 text-center text-sm"
                    />
                    <Input
                      type="number"
                      value={set.rpe || ''}
                      onChange={(e) => updateSet(exercise.id, set.id, 'rpe', Number(e.target.value))}
                      className="h-8 text-center text-sm"
                      placeholder="-"
                    />
                    <Input
                      type="number"
                      value={set.rest || ''}
                      onChange={(e) => updateSet(exercise.id, set.id, 'rest', Number(e.target.value))}
                      className="h-8 text-center text-sm"
                      placeholder="-"
                    />
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => duplicateSet(exercise.id, set.id)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => deleteSet(exercise.id, set.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addSet(exercise.id)}
                  className="w-full mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Serie
                </Button>
              </StatsCard>
            ))}
          </div>

          {/* Add Exercise Button */}
          <Button
            onClick={() => setShowExerciseSearch(true)}
            className="w-full mb-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ejercicio
          </Button>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" onClick={saveRoutine}>
              <Save className="w-4 h-4 mr-2" />
              Guardar
            </Button>
            <Button>
              <Play className="w-4 h-4 mr-2" />
              Iniciar
            </Button>
          </div>
        </div>

        {/* Exercise Search Dialog */}
        <Dialog open={showExerciseSearch} onOpenChange={setShowExerciseSearch}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Añadir Ejercicio</DialogTitle>
            </DialogHeader>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar ejercicio..."
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredExercises.map((exercise) => (
                <Button
                  key={exercise}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => addExercise(exercise)}
                >
                  {exercise}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Notes Dialog */}
        <Dialog open={showNotes} onOpenChange={setShowNotes}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Notas</DialogTitle>
            </DialogHeader>
            <Textarea
              placeholder="Añade notas sobre tu entrenamiento..."
              value={editingRoutine.notes || ''}
              onChange={(e) => setEditingRoutine({ ...editingRoutine, notes: e.target.value })}
              rows={6}
            />
          </DialogContent>
        </Dialog>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">Gimnasio</h1>
          <Button onClick={createNewRoutine}>
            <Plus className="w-4 h-4 mr-2" />
            Rutina
          </Button>
        </div>

        {/* Mini Calendar */}
        <StatsCard className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-lg font-semibold text-foreground">
              {selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </h2>
            <Button variant="ghost" size="icon">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, idx) => {
              const isSelected = formatDate(day) === formatDate(selectedDate);
              const isToday = formatDate(day) === formatDate(new Date());
              const hasRoutines = getRoutinesForDate(day).length > 0;
              
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className={`flex flex-col items-center py-2 rounded-lg transition-colors ${
                    isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
                  }`}
                >
                  <span className="text-xs text-muted-foreground mb-1">
                    {day.toLocaleDateString('es-ES', { weekday: 'short' }).charAt(0).toUpperCase()}
                  </span>
                  <span className={`text-sm font-semibold ${isToday ? 'text-accent' : ''}`}>
                    {day.getDate()}
                  </span>
                  {hasRoutines && (
                    <div className="w-1 h-1 rounded-full bg-accent mt-1" />
                  )}
                </button>
              );
            })}
          </div>
        </StatsCard>

        {/* Routines List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            Rutinas - {selectedDate.getDate()} de {selectedDate.toLocaleDateString('es-ES', { month: 'long' })}
          </h2>
          
          {dayRoutines.length === 0 ? (
            <StatsCard>
              <p className="text-center text-muted-foreground py-8">
                No hay rutinas para este día
              </p>
            </StatsCard>
          ) : (
            dayRoutines.map((routine) => (
              <StatsCard
                key={routine.id}
                className="cursor-pointer hover:bg-secondary/50 transition-colors"
                onClick={() => setEditingRoutine(routine)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {routine.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {routine.exercises.length} ejercicio{routine.exercises.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </StatsCard>
            ))
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Gimnasio;
