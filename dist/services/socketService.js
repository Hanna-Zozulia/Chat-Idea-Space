"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketService = void 0;
const chatMessage_1 = require("../models/chatMessage");
class SocketService {
    constructor(io) {
        this.io = io;
    }
    init() {
        this.io.on("connection", (socket) => {
            console.log(`Игрок подключился: ${socket.id}`);
            socket.emit("chat:init", chatMessage_1.chatModel.getAll());
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
    handleSendMessage(socket) {
        socket.on("chat:send", (payload, callback) => {
            try {
                const message = chatMessage_1.chatModel.add(payload.author, payload.text);
                this.io.emit("chat:new", message);
                if (callback)
                    callback();
            }
            catch (error) {
                const message = error instanceof Error ? error.message : "Не удалось отправить сообщение";
                if (callback)
                    callback(message);
                else
                    socket.emit("chat:error", message);
            }
        });
    }
    handleReplyMessage(socket) {
        socket.on("chat:reply", (payload) => {
            const target = chatMessage_1.chatModel.find(payload.replyTo);
            const replyToName = target === null || target === void 0 ? void 0 : target.author;
            const msg = chatMessage_1.chatModel.add(payload.author, payload.text, replyToName);
            this.io.emit("chat:new", msg);
        });
    }
    handleDeleteMessage(socket) {
        socket.on("chat:delete", (id, author) => {
            const msg = chatMessage_1.chatModel.find(id);
            if (!msg)
                return;
            if (msg.author !== author) {
                socket.emit("chat:error", "Вы можете удалить только свои сообщения");
                return;
            }
            chatMessage_1.chatModel.delete(id);
            this.io.emit("chat:deleted", id);
        });
    }
    handleCopyMessage(socket) {
        socket.on("chat:copy", (id) => {
            const msg = chatMessage_1.chatModel.find(id);
            if (msg)
                console.log(`Message copied: ${msg.text}`);
        });
    }
    handleEditMessage(socket) {
        socket.on("chat:edit", (payload, callback) => {
            const msg = chatMessage_1.chatModel.find(payload.id);
            if (!msg) {
                callback === null || callback === void 0 ? void 0 : callback("Сообщение не найдено");
                return;
            }
            // Проверяем, что редактирует автор
            if (msg.author !== payload.author) {
                callback === null || callback === void 0 ? void 0 : callback("Вы можете редактировать только свои сообщения");
                return;
            }
            chatMessage_1.chatModel.update(payload.id, {
                text: payload.newText.trim(),
                edited: true
            });
            const updated = chatMessage_1.chatModel.find(payload.id);
            this.io.emit("chat:edited", updated);
            callback === null || callback === void 0 ? void 0 : callback();
        });
    }
}
exports.SocketService = SocketService;
//# sourceMappingURL=socketService.js.map