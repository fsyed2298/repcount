import { Router, type IRouter } from "express";
import { db, workoutsTable, workoutSetsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

router.get("/workouts", async (_req, res) => {
  try {
    const workouts = await db.select().from(workoutsTable).orderBy(workoutsTable.startedAt);
    const workoutIds = workouts.map(w => w.id);
    
    let allSets: typeof workoutSetsTable.$inferSelect[] = [];
    if (workoutIds.length > 0) {
      for (const id of workoutIds) {
        const sets = await db.select().from(workoutSetsTable).where(eq(workoutSetsTable.workoutId, id));
        allSets = allSets.concat(sets);
      }
    }

    const result = workouts.map(workout => ({
      ...workout,
      sets: allSets.filter(s => s.workoutId === workout.id).sort((a, b) => a.setNumber - b.setNumber),
    }));

    res.json({ workouts: result.reverse() });
  } catch (error) {
    console.error("List workouts error:", error);
    res.status(500).json({ error: "Failed to list workouts" });
  }
});

router.post("/workouts", async (req, res) => {
  try {
    const { exerciseId, exerciseName, detectedWeightKg, weightUnit, notes } = req.body;

    if (!exerciseId || !exerciseName || !weightUnit) {
      res.status(400).json({ error: "exerciseId, exerciseName, and weightUnit are required" });
      return;
    }

    const id = generateId();
    const [workout] = await db.insert(workoutsTable).values({
      id,
      exerciseId,
      exerciseName,
      detectedWeightKg: detectedWeightKg ?? null,
      weightUnit,
      notes: notes ?? null,
      startedAt: new Date(),
    }).returning();

    res.status(201).json({ ...workout, sets: [] });
  } catch (error) {
    console.error("Create workout error:", error);
    res.status(500).json({ error: "Failed to create workout" });
  }
});

router.get("/workouts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [workout] = await db.select().from(workoutsTable).where(eq(workoutsTable.id, id));

    if (!workout) {
      res.status(404).json({ error: "Workout not found" });
      return;
    }

    const sets = await db.select().from(workoutSetsTable).where(eq(workoutSetsTable.workoutId, id));
    res.json({ ...workout, sets: sets.sort((a, b) => a.setNumber - b.setNumber) });
  } catch (error) {
    console.error("Get workout error:", error);
    res.status(500).json({ error: "Failed to get workout" });
  }
});

router.patch("/workouts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { completedAt, notes, totalVolume } = req.body;

    const updates: Record<string, unknown> = {};
    if (completedAt !== undefined) updates.completedAt = completedAt ? new Date(completedAt) : null;
    if (notes !== undefined) updates.notes = notes;
    if (totalVolume !== undefined) updates.totalVolume = totalVolume;

    const [workout] = await db.update(workoutsTable).set(updates).where(eq(workoutsTable.id, id)).returning();

    if (!workout) {
      res.status(404).json({ error: "Workout not found" });
      return;
    }

    const sets = await db.select().from(workoutSetsTable).where(eq(workoutSetsTable.workoutId, id));
    res.json({ ...workout, sets: sets.sort((a, b) => a.setNumber - b.setNumber) });
  } catch (error) {
    console.error("Update workout error:", error);
    res.status(500).json({ error: "Failed to update workout" });
  }
});

router.delete("/workouts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(workoutsTable).where(eq(workoutsTable.id, id));
    res.status(204).send();
  } catch (error) {
    console.error("Delete workout error:", error);
    res.status(500).json({ error: "Failed to delete workout" });
  }
});

router.post("/workouts/:id/sets", async (req, res) => {
  try {
    const { id: workoutId } = req.params;
    const { reps, weightKg, setNumber } = req.body;

    if (reps === undefined || weightKg === undefined || setNumber === undefined) {
      res.status(400).json({ error: "reps, weightKg, and setNumber are required" });
      return;
    }

    const setId = generateId();
    const [set] = await db.insert(workoutSetsTable).values({
      id: setId,
      workoutId,
      reps,
      weightKg,
      setNumber,
      completedAt: new Date(),
    }).returning();

    res.status(201).json(set);
  } catch (error) {
    console.error("Add set error:", error);
    res.status(500).json({ error: "Failed to add set" });
  }
});

export default router;
