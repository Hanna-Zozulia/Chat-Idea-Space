export interface ChatMessage {
    id: number;
    author: string;
    text: string;
    timestamp: number;
    replyTo?: string;
    edited?: boolean;
}

export class ChatModel {
    private messages: ChatMessage[] = [];
    private nextId = 1;
    private readonly maxMessages = 100;

    public getAll(): ChatMessage[] {
        return [...this.messages];
    }

    public add(author: string, text: string, replyTo?: string): ChatMessage {
        const trimmedAuthor = author.trim() || "Anonymous";
        const trimmedText = text.trim();

        if (!trimmedText) {
            throw new Error("Сообщение пустое");
        }

        const message: ChatMessage = {
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

    public delete(id: number) {
        this.messages = this.messages.filter(m => m.id !== id);
    }

    public find(id: number): ChatMessage| undefined {
        return this.messages.find(m => m.id === id);
    }

    public update(id: number, data: Partial<ChatMessage>): ChatMessage | undefined {
    const msg = this.find(id);
        if (!msg) return undefined;

        Object.assign(msg, data);
        return msg;
    }

}

export const chatModel = new ChatModel();