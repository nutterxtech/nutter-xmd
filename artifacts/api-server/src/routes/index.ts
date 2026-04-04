import { Router, type IRouter } from "express";
import healthRouter from "./health";
import botsRouter from "./bots";
import adminRouter from "./admin";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(botsRouter);
router.use(adminRouter);

export default router;
