import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { healthCheck } from "../lib/health-check";

const router: IRouter = Router();

router.get(
  "/healthz",
  healthCheck(() => pool.query("SELECT 1")),
);

export default router;
