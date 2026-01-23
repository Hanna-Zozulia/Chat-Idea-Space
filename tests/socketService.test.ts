import { Server as SocketServer, Socket } from 'socket.io';
import { SocketService } from '../src/services/socketService';
import { chatModel, ChatMessage } from '../src/models/chatMessage';

// Mock the entire chatModel module
jest.mock('../src/models/chatMessage', () => ({
    chatModel: {
        getAll: jest.fn(),
        add: jest.fn(),
        find: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
    },
}));

// A mock implementation of a Socket.io socket
// It allows us to register event handlers and trigger them manually
class MockSocket {
    public handlers: { [event: string]: (...args: any[]) => void } = {};
    public emit = jest.fn();
    public on = (event: string, handler: (...args: any[]) => void) => {
        this.handlers[event] = handler;
    };
    public trigger(event: string, ...args: any[]) {
        if (this.handlers[event]) {
            this.handlers[event](...args);
        }
    }
}

// A mock implementation of a Socket.io server
class MockIo {
    public handlers: { [event: string]: (socket: any) => void } = {};
    public emit = jest.fn();
    public on = (event: string, handler: (socket: any) => void) => {
        this.handlers[event] = handler;
    };
    public connect(socket: any) {
        if (this.handlers['connection']) {
            this.handlers['connection'](socket);
        }
    }
}

describe('SocketService', () => {
    let mockIo: MockIo;
    let mockSocket: MockSocket;
    let socketService: SocketService;

    // A sample message for use in tests
    const sampleMessage: ChatMessage = {
        id: 1,
        author: 'TestUser',
        text: 'Hello World',
        timestamp: Date.now(),
    };

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        // Create new mock instances for io and socket
        mockIo = new MockIo();
        mockSocket = new MockSocket();

        // Instantiate the service with the mock server
        socketService = new SocketService(mockIo as any as SocketServer);

        // Initialize the service to set up the 'connection' listener
        socketService.init();

        // Simulate a new client connection
        mockIo.connect(mockSocket);
    });

    it('should emit chat:init with all messages on connection', () => {
        // Arrange
        const initialMessages = [sampleMessage];
        (chatModel.getAll as jest.Mock).mockReturnValue(initialMessages);
        
        // Act: A new connection is simulated in the beforeEach block
        // We just need to re-trigger it here to make the test explicit
        mockIo.connect(mockSocket);

        // Assert
        expect(chatModel.getAll).toHaveBeenCalled();
        expect(mockSocket.emit).toHaveBeenCalledWith('chat:init', initialMessages);
    });

    describe('handleSendMessage', () => {
        it('should add a message and broadcast it on chat:send', () => {
            // Arrange
            const payload = { author: 'NewUser', text: 'A new message' };
            const callback = jest.fn();
            (chatModel.add as jest.Mock).mockReturnValue(sampleMessage);

            // Act
            // Simulate the client emitting the 'chat:send' event
            mockSocket.trigger('chat:send', payload, callback);

            // Assert
            expect(chatModel.add).toHaveBeenCalledWith(payload.author, payload.text);
            expect(mockIo.emit).toHaveBeenCalledWith('chat:new', sampleMessage);
            expect(callback).toHaveBeenCalledWith(); // Called with no error
        });

        it('should handle errors during message sending', () => {
            // Arrange
            const payload = { author: 'ErrorUser', text: '   ' }; // Invalid text
            const callback = jest.fn();
            const error = new Error('Сообщение пустое');
            (chatModel.add as jest.Mock).mockImplementation(() => {
                throw error;
            });

            // Act
            mockSocket.trigger('chat:send', payload, callback);

            // Assert
            expect(chatModel.add).toHaveBeenCalledWith(payload.author, payload.text);
            expect(mockIo.emit).not.toHaveBeenCalled(); // Should not broadcast on error
            expect(callback).toHaveBeenCalledWith(error.message); // Callback receives the error message
        });
    });

    describe('handleReplyMessage', () => {
        it('should create a reply and broadcast it', () => {
            // Arrange
            const replyPayload = { author: 'ReplyUser', text: 'This is a reply', replyTo: 1 };
            const originalMessage = { ...sampleMessage, author: 'OriginalAuthor' };
            const replyMessage = { ...sampleMessage, text: 'This is a reply', replyTo: 'OriginalAuthor' };

            (chatModel.find as jest.Mock).mockReturnValue(originalMessage);
            (chatModel.add as jest.Mock).mockReturnValue(replyMessage);

            // Act
            mockSocket.trigger('chat:reply', replyPayload);

            // Assert
            expect(chatModel.find).toHaveBeenCalledWith(replyPayload.replyTo);
            expect(chatModel.add).toHaveBeenCalledWith(replyPayload.author, replyPayload.text, 'OriginalAuthor');
            expect(mockIo.emit).toHaveBeenCalledWith('chat:new', replyMessage);
        });
    });

    describe('handleDeleteMessage', () => {
        it('should allow an author to delete their own message', () => {
            // Arrange
            const messageId = 1;
            const author = 'TestUser';
            (chatModel.find as jest.Mock).mockReturnValue({ ...sampleMessage, author });

            // Act
            mockSocket.trigger('chat:delete', messageId, author);

            // Assert
            expect(chatModel.find).toHaveBeenCalledWith(messageId);
            expect(chatModel.delete).toHaveBeenCalledWith(messageId);
            expect(mockIo.emit).toHaveBeenCalledWith('chat:deleted', messageId);
            expect(mockSocket.emit).not.toHaveBeenCalledWith('chat:error', expect.any(String));
        });

        it('should prevent a user from deleting another user\'s message', () => {
            // Arrange
            const messageId = 1;
            const originalAuthor = 'TestUser';
            const wrongAuthor = 'Imposter';
            (chatModel.find as jest.Mock).mockReturnValue({ ...sampleMessage, author: originalAuthor });

            // Act
            mockSocket.trigger('chat:delete', messageId, wrongAuthor);
            
            // Assert
            expect(chatModel.find).toHaveBeenCalledWith(messageId);
            expect(chatModel.delete).not.toHaveBeenCalled();
            expect(mockIo.emit).not.toHaveBeenCalledWith('chat:deleted', expect.any(Number));
            expect(mockSocket.emit).toHaveBeenCalledWith('chat:error', 'Вы можете удалить только свои сообщения');
        });
    });

    describe('handleEditMessage', () => {
        it('should allow an author to edit their own message', () => {
            // Arrange
            const payload = { id: 1, newText: 'Updated Text', author: 'TestUser' };
            const callback = jest.fn();
            const originalMessage = { ...sampleMessage, author: 'TestUser' };
            const updatedMessage = { ...originalMessage, text: 'Updated Text', edited: true };
            
            (chatModel.find as jest.Mock).mockReturnValue(originalMessage); // First find
            (chatModel.update as jest.Mock).mockReturnValue(updatedMessage);
            // The service calls find again after update
            (chatModel.find as jest.Mock).mockReturnValueOnce(originalMessage).mockReturnValueOnce(updatedMessage);

            // Act
            mockSocket.trigger('chat:edit', payload, callback);

            // Assert
            expect(chatModel.update).toHaveBeenCalledWith(payload.id, { text: payload.newText, edited: true });
            expect(mockIo.emit).toHaveBeenCalledWith('chat:edited', updatedMessage);
            expect(callback).toHaveBeenCalledWith(); // Success callback
        });

        it('should prevent editing another user\'s message', () => {
            // Arrange
            const payload = { id: 1, newText: 'Updated Text', author: 'Imposter' };
            const callback = jest.fn();
            const originalMessage = { ...sampleMessage, author: 'TestUser' };
            (chatModel.find as jest.Mock).mockReturnValue(originalMessage);

            // Act
            mockSocket.trigger('chat:edit', payload, callback);
            
            // Assert
            expect(chatModel.update).not.toHaveBeenCalled();
            expect(callback).toHaveBeenCalledWith('Вы можете редактировать только свои сообщения');
        });

        it('should return an error if the message to edit is not found', () => {
            // Arrange
            const payload = { id: 999, newText: 'Updated Text', author: 'TestUser' };
            const callback = jest.fn();
            (chatModel.find as jest.Mock).mockReturnValue(undefined);

            // Act
            mockSocket.trigger('chat:edit', payload, callback);
            
            // Assert
            expect(chatModel.update).not.toHaveBeenCalled();
            expect(callback).toHaveBeenCalledWith('Сообщение не найдено');
        });
    });
});
