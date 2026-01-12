import { Router } from "express";
import { chatController } from "../controllers/chatController";

const router = Router();

router.get("/api/messages", chatController.getMessages);

export default router;