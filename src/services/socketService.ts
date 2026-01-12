import { Server as SocketServer, Socket } from "socket.io";
import { ChatMessage, chatModel } from "../models/chatMessage";

export class SocketService {
    constructor(private readonly io: SocketServer) {}

    public init(): void {
        this.io.on("connection", (socket: Socket) => {
            console.log(`Игрок подключился: ${socket.id}`);

            socket.emit("chat:init", chatModel.getAll());

            this.handleSendMessage(socket);
            this.handleReplyMessage(socket);
            this.handleDeleteMessage(socket);
            this.handleCopyMessage(socket);
            this.handleEditMessage(socket);

            socket.on("disconnect", () => {
                console.log(`Игрок отключился: ${socket.id}`);
            });
        });
    }

    private handleSendMessage(socket: Socket): void {
        socket.on(
            "chat:send",
            (payload: { author: string; text: string }, callback?: (err?: string) => void) => {
                try {
                    const message: ChatMessage = chatModel.add(payload.author, payload.text);

                    this.io.emit("chat:new", message);

                    if (callback) callback();
                } catch (error) {
                    const message =
                        error instanceof Error ? error.message : "Не удалось отправить сообщение";

                    if (callback) callback(message);
                    else socket.emit("chat:error", message);
                }
            }
        );
    }

    private handleReplyMessage(socket: Socket) {
        socket.on(
            "chat:reply",
            (payload: { author: string; text: string; replyTo: number }) => {
                const target = chatModel.find(payload.replyTo);
                const replyToName = target?.author;

                const msg = chatModel.add(payload.author, payload.text, replyToName);

                this.io.emit("chat:new", msg);
            }
        );
    }

    private handleDeleteMessage(socket: Socket) {
        socket.on("chat:delete", (id: number, author: string) => {
            const msg = chatModel.find(id);
            if (!msg) return;

            if (msg.author !== author) {
                socket.emit("chat:error", "Вы можете удалить только свои сообщения");
                return;
            }

            chatModel.delete(id);
            this.io.emit("chat:deleted", id);
        });
    }

    private handleCopyMessage(socket: Socket) {
        socket.on("chat:copy", (id: number) => {
            const msg = chatModel.find(id);
            if (msg) console.log(`Message copied: ${msg.text}`);
        });
    }

    private handleEditMessage(socket: Socket) {
        socket.on(
            "chat:edit",
            (
                payload: {
                    id: number;
                    newText: string;
                    author: string;
                },
                callback?: (err?: string) => void
            ) => {
                const msg = chatModel.find(payload.id);

                if (!msg) {
                    callback?.("Сообщение не найдено");
                    return;
                }

                // Проверяем, что редактирует автор
                if (msg.author !== payload.author) {
                    callback?.("Вы можете редактировать только свои сообщения");
                    return;
                }

                chatModel.update(payload.id, {
                    text: payload.newText.trim(),
                    edited: true
                });

                const updated = chatModel.find(payload.id);

                this.io.emit("chat:edited", updated);

                callback?.();
            }
        );
    }
}
