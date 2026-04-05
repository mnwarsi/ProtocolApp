import { Router, type IRouter } from "express";
import healthRouter from "./health";
import wearableRouter from "./wearable";

const router: IRouter = Router();

router.use(healthRouter);
router.use(wearableRouter);

export default router;
