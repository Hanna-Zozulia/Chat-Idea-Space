import { Request, Response } from "express";
import { chatModel } from "../models/chatMessage";

class ChatController {
    public getMessages = (_req: Request, res: Response): void => {
        const messages = chatModel.getAll();
        res.json({messages});
    };
}

export const chatController = new ChatController();