import { chatController } from '../src/controllers/chatController';
import { chatModel } from '../src/models/chatMessage';
import { Request, Response } from 'express';

// Mock the chatModel to control its behavior during tests
jest.mock('../src/models/chatMessage', () => ({
    chatModel: {
        getAll: jest.fn(),
    },
}));

describe('ChatController', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let statusSpy: jest.SpyInstance;
    let jsonSpy: jest.SpyInstance;

    beforeEach(() => {
        // Reset mocks before each test
        (chatModel.getAll as jest.Mock).mockClear();

        // Initialize mock Request and Response objects
        mockRequest = {};
        mockResponse = {
            status: jest.fn().mockReturnThis(), // Mock status to allow chaining .json()
            json: jest.fn(),
        };

        // Spy on the json method to check its arguments
        jsonSpy = jest.spyOn(mockResponse, 'json');
        statusSpy = jest.spyOn(mockResponse, 'status');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('getMessages', () => {
        test('should return all messages from the chat model with a 200 status', () => {
            // Arrange
            const mockMessages = [
                { id: 1, author: 'User1', text: 'Hello', timestamp: 123 },
                { id: 2, author: 'User2', text: 'Hi there', timestamp: 456 },
            ];
            // Configure the mock chatModel.getAll to return our mock messages
            (chatModel.getAll as jest.Mock).mockReturnValue(mockMessages);

            // Act
            chatController.getMessages(mockRequest as Request, mockResponse as Response);

            // Assert
            // Expect chatModel.getAll to have been called
            expect(chatModel.getAll).toHaveBeenCalledTimes(1);
            // Expect the response status to be 200 (though not explicitly set in controller, it's default)
            expect(statusSpy).not.toHaveBeenCalledWith(500); // Ensure no error status is set
            // Expect the json method to have been called with an object containing messages
            expect(jsonSpy).toHaveBeenCalledTimes(1);
            expect(jsonSpy).toHaveBeenCalledWith({ messages: mockMessages });
        });

        test('should return an empty array if no messages are available', () => {
            // Arrange
            const mockMessages: any[] = [];
            // Configure the mock chatModel.getAll to return an empty array
            (chatModel.getAll as jest.Mock).mockReturnValue(mockMessages);

            // Act
            chatController.getMessages(mockRequest as Request, mockResponse as Response);

            // Assert
            expect(chatModel.getAll).toHaveBeenCalledTimes(1);
            expect(statusSpy).not.toHaveBeenCalledWith(500); // Ensure no error status is set
            expect(jsonSpy).toHaveBeenCalledTimes(1);
            expect(jsonSpy).toHaveBeenCalledWith({ messages: [] });
        });
    });
});
