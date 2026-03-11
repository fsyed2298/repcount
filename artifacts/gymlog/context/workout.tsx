import React, { createContext, useContext, useState, useCallback } from "react";
import { WorkoutSession, WorkoutSet, WeightUnit } from "@/types";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

export const API_URL = `${BASE_URL}/api`;

interface WorkoutContextType {
  workouts: WorkoutSession[];
  activeWorkout: WorkoutSession | null;
  isLoading: boolean;
  weightUnit: WeightUnit;
  setWeightUnit: (unit: WeightUnit) => void;
  fetchWorkouts: () => Promise<void>;
  startWorkout: (exerciseId: string, exerciseName: string, detectedWeightKg?: number | null, isBodyweight?: boolean) => Promise<WorkoutSession | null>;
  addSet: (workoutId: string, reps: number, weightKg: number, setNumber: number) => Promise<WorkoutSet | null>;
  completeWorkout: (workoutId: string) => Promise<void>;
  deleteWorkout: (workoutId: string) => Promise<void>;
  setActiveWorkout: (workout: WorkoutSession | null) => void;
}

const WorkoutContext = createContext<WorkoutContextType | null>(null);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<WorkoutSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("lbs");

  const fetchWorkouts = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/workouts`);
      const data = await res.json();
      setWorkouts(data.workouts ?? []);
    } catch (e) {
      console.error("fetchWorkouts error:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startWorkout = useCallback(async (
    exerciseId: string,
    exerciseName: string,
    detectedWeightKg?: number | null,
    isBodyweight?: boolean
  ): Promise<WorkoutSession | null> => {
    try {
      const res = await fetch(`${API_URL}/workouts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseId,
          exerciseName,
          detectedWeightKg: detectedWeightKg ?? null,
          weightUnit,
        }),
      });
      const workout: WorkoutSession = await res.json();
      setActiveWorkout({ ...workout, isBodyweight: isBodyweight ?? false });
      return workout;
    } catch (e) {
      console.error("startWorkout error:", e);
      return null;
    }
  }, [weightUnit]);

  const addSet = useCallback(async (
    workoutId: string,
    reps: number,
    weightKg: number,
    setNumber: number
  ): Promise<WorkoutSet | null> => {
    try {
      const res = await fetch(`${API_URL}/workouts/${workoutId}/sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reps, weightKg, setNumber }),
      });
      const set: WorkoutSet = await res.json();
      
      setActiveWorkout(prev => {
        if (!prev || prev.id !== workoutId) return prev;
        return { ...prev, sets: [...prev.sets, set] };
      });
      
      return set;
    } catch (e) {
      console.error("addSet error:", e);
      return null;
    }
  }, []);

  const completeWorkout = useCallback(async (workoutId: string) => {
    try {
      const workout = activeWorkout || workouts.find(w => w.id === workoutId);
      const sets = workout?.sets ?? [];
      const totalVolume = sets.reduce((sum, s) => sum + s.reps * s.weightKg, 0);

      await fetch(`${API_URL}/workouts/${workoutId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completedAt: new Date().toISOString(),
          totalVolume,
        }),
      });

      setActiveWorkout(null);
      await fetchWorkouts();
    } catch (e) {
      console.error("completeWorkout error:", e);
    }
  }, [activeWorkout, workouts, fetchWorkouts]);

  const deleteWorkout = useCallback(async (workoutId: string) => {
    try {
      await fetch(`${API_URL}/workouts/${workoutId}`, { method: "DELETE" });
      setWorkouts(prev => prev.filter(w => w.id !== workoutId));
    } catch (e) {
      console.error("deleteWorkout error:", e);
    }
  }, []);

  return (
    <WorkoutContext.Provider value={{
      workouts,
      activeWorkout,
      isLoading,
      weightUnit,
      setWeightUnit,
      fetchWorkouts,
      startWorkout,
      addSet,
      completeWorkout,
      deleteWorkout,
      setActiveWorkout,
    }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error("useWorkout must be used within WorkoutProvider");
  return ctx;
}
