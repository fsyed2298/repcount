import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import exercisesRouter from "./exercises.js";
import workoutsRouter from "./workouts.js";
import aiRouter from "./ai.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(exercisesRouter);
router.use(workoutsRouter);
router.use(aiRouter);

export default router;
