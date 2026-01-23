import express, { Request, Response } from 'express';
import request from 'supertest';
import chatRoutes from '../src/routes/chatRoutes';
import { chatController } from '../src/controllers/chatController';

// Mock the chatController to isolate the router's functionality.
// We want to test that the router calls the correct controller method,
// not the controller's implementation itself.
jest.mock('../src/controllers/chatController', () => ({
    chatController: {
        // We replace getMessages with a jest mock function.
        getMessages: jest.fn((req: Request, res: Response) => {
            // The mock implementation sends a simple 200 OK response.
            // This confirms the handler was reached.
            res.status(200).json({ success: true });
        }),
    },
}));

// Create a new express application for each test suite.
const app = express();
// Apply the chat routes to our test app.
app.use('/', chatRoutes);

describe('Chat Routes', () => {
    describe('GET /api/messages', () => {
        it('should call chatController.getMessages and return a 200 status', async () => {
            // Act: Perform a GET request to the /api/messages endpoint.
            const response = await request(app).get('/api/messages');

            // Assert: Check that the response is what we expect.
            // We expect our mock controller to have been called.
            expect(chatController.getMessages).toHaveBeenCalledTimes(1);

            // We expect the HTTP status to be 200 OK.
            expect(response.status).toBe(200);

            // We expect the response body to be the JSON from our mock.
            expect(response.body).toEqual({ success: true });
        });
    });
});
