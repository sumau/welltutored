import { Router, type IRouter } from "express";
import { pool } from "../../core/db";
import { healthCheck } from "../../core/health-check";

const router: IRouter = Router();

router.get(
  "/healthz",
  healthCheck(() => pool.query("SELECT 1")),
);

export default router;
