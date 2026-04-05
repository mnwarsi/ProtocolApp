import { Router, type IRouter } from "express";
import healthRouter from "./health";
import wearableRouter from "./wearable";
import stripeRouter from "./stripe";
import syncRouter from "./sync";

const router: IRouter = Router();

router.use(healthRouter);
router.use(wearableRouter);
router.use(stripeRouter);
router.use(syncRouter);

export default router;
