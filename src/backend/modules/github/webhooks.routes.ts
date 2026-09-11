import { Router } from "express";
import { WebhooksController } from "./webhooks.controller.js";

const router: Router = Router();

// Handle all webhook event POST requests
router.post("/", WebhooksController.handleWebhook);

export { router as webhooksRouter };
