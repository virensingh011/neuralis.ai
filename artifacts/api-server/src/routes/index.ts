import { Router, type IRouter } from "express";
import healthRouter from "./health";
import openaiRouter from "./openai";
import weatherRouter from "./weather";
import wikipediaRouter from "./wikipedia";
import healthcareRouter from "./healthcare";
import studyRouter from "./study";

const router: IRouter = Router();

router.use(healthRouter);
router.use(openaiRouter);
router.use(weatherRouter);
router.use(wikipediaRouter);
router.use(healthcareRouter);
router.use(studyRouter);

export default router;
