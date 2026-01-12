"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatModel = exports.ChatModel = void 0;
class ChatModel {
    constructor() {
        this.messages = [];
        this.nextId = 1;
        this.maxMessages = 100;
    }
    getAll() {
        return [...this.messages];
    }
    add(author, text, replyTo) {
        const trimmedAuthor = author.trim() || "Anonymous";
        const trimmedText = text.trim();
        if (!trimmedText) {
            throw new Error("Сообщение пустое");
        }
        const message = {
            id: this.nextId++,
            author: trimmedAuthor.slice(0, 30),
            text: trimmedText.slice(0, 500),
            timestamp: Date.now(),
            replyTo,
        };
        this.messages.push(message);
        if (this.messages.length > this.maxMessages) {
            this.messages.shift();
        }
        return message;
    }
    delete(id) {
        this.messages = this.messages.filter(m => m.id !== id);
    }
    find(id) {
        return this.messages.find(m => m.id === id);
    }
    update(id, data) {
        const msg = this.find(id);
        if (!msg)
            return undefined;
        Object.assign(msg, data);
        return msg;
    }
}
exports.ChatModel = ChatModel;
exports.chatModel = new ChatModel();
//# sourceMappingURL=chatMessage.js.map