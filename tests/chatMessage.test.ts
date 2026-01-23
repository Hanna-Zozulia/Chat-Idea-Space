import { ChatModel, ChatMessage } from '../src/models/chatMessage';

describe('ChatModel', () => {
  let chatModel: ChatModel;

  beforeEach(() => {
    // Reset the model before each test to ensure isolation
    chatModel = new ChatModel();
    // Manually reset nextId and messages for a clean state
    (chatModel as any).nextId = 1;
    (chatModel as any).messages = [];
  });

  describe('add', () => {
    test('should add a new message with default author if none provided', () => {
      const message = chatModel.add('', 'Hello world');
      expect(message).toBeDefined();
      expect(message.id).toBe(1);
      expect(message.author).toBe('Anonymous');
      expect(message.text).toBe('Hello world');
      expect(message.timestamp).toBeCloseTo(Date.now(), -100); // within 100ms
      expect(chatModel.getAll().length).toBe(1);
    });

    test('should add a new message with a specified author', () => {
      const message = chatModel.add('TestUser', 'Hello again');
      expect(message).toBeDefined();
      expect(message.id).toBe(1);
      expect(message.author).toBe('TestUser');
      expect(message.text).toBe('Hello again');
      expect(chatModel.getAll().length).toBe(1);
    });

    test('should add a message with a replyTo field', () => {
      const message1 = chatModel.add('UserA', 'Original message');
      const message2 = chatModel.add('UserB', 'Replying', message1.author);
      expect(message2.replyTo).toBe('UserA');
    });

    test('should trim author and text', () => {
      const message = chatModel.add('  Pavel  ', '  some text here  ');
      expect(message.author).toBe('Pavel');
      expect(message.text).toBe('some text here');
    });

    test('should throw an error if text is empty', () => {
      expect(() => chatModel.add('Author', '')).toThrow('Сообщение пустое');
      expect(() => chatModel.add('Author', '   ')).toThrow('Сообщение пустое');
      expect(chatModel.getAll().length).toBe(0);
    });

    test('should limit author length to 30 characters', () => {
      const longAuthor = 'a'.repeat(50);
      const message = chatModel.add(longAuthor, 'text');
      expect(message.author.length).toBe(30);
      expect(message.author).toBe('a'.repeat(30));
    });

    test('should limit text length to 500 characters', () => {
      const longText = 'b'.repeat(600);
      const message = chatModel.add('author', longText);
      expect(message.text.length).toBe(500);
      expect(message.text).toBe('b'.repeat(500));
    });

    test('should increment message IDs correctly', () => {
      const message1 = chatModel.add('User1', 'Msg1');
      const message2 = chatModel.add('User2', 'Msg2');
      expect(message1.id).toBe(1);
      expect(message2.id).toBe(2);
    });

    test('should remove oldest message when maxMessages limit is reached', () => {
      // Temporarily set maxMessages to a smaller number for testing
      (chatModel as any).maxMessages = 3;

      chatModel.add('User', 'Msg1');
      chatModel.add('User', 'Msg2');
      chatModel.add('User', 'Msg3');
      expect(chatModel.getAll().length).toBe(3);
      expect(chatModel.getAll()[0].text).toBe('Msg1');

      chatModel.add('User', 'Msg4'); // This should trigger removal of Msg1
      expect(chatModel.getAll().length).toBe(3);
      expect(chatModel.getAll()[0].text).toBe('Msg2');
      expect(chatModel.getAll()[2].text).toBe('Msg4');
    });
  });

  describe('getAll', () => {
    test('should return an empty array if no messages', () => {
      expect(chatModel.getAll()).toEqual([]);
    });

    test('should return all messages', () => {
      const msg1 = chatModel.add('A', 'Text1');
      const msg2 = chatModel.add('B', 'Text2');
      expect(chatModel.getAll()).toEqual([msg1, msg2]);
    });

    test('should return a copy of the messages array', () => {
      const messagesBefore = chatModel.getAll();
      chatModel.add('C', 'Text3');
      const messagesAfter = chatModel.getAll();
      expect(messagesBefore.length).toBe(0); // Should not be modified
      expect(messagesAfter.length).toBe(1);
      expect(chatModel.getAll()).not.toBe(messagesBefore); // Ensure it's a different array instance
    });
  });

  describe('delete', () => {
    test('should delete an existing message', () => {
      const msg1 = chatModel.add('A', 'Text1');
      const msg2 = chatModel.add('B', 'Text2');
      chatModel.delete(msg1.id);
      expect(chatModel.getAll().length).toBe(1);
      expect(chatModel.getAll()).toEqual([msg2]);
    });

    test('should do nothing if message ID does not exist', () => {
      chatModel.add('A', 'Text1');
      chatModel.delete(999);
      expect(chatModel.getAll().length).toBe(1);
    });

    test('should delete only the specified message', () => {
        const msg1 = chatModel.add('User1', 'Message 1');
        const msg2 = chatModel.add('User2', 'Message 2');
        const msg3 = chatModel.add('User3', 'Message 3');

        chatModel.delete(msg2.id);

        expect(chatModel.getAll().length).toBe(2);
        expect(chatModel.getAll()).not.toContain(msg2);
        expect(chatModel.getAll()).toEqual([msg1, msg3]);
    });
  });

  describe('find', () => {
    test('should find an existing message by ID', () => {
      chatModel.add('A', 'Text1');
      const msg2 = chatModel.add('B', 'Text2');
      const foundMessage = chatModel.find(msg2.id);
      expect(foundMessage).toEqual(msg2);
    });

    test('should return undefined if message ID does not exist', () => {
      chatModel.add('A', 'Text1');
      const foundMessage = chatModel.find(999);
      expect(foundMessage).toBeUndefined();
    });
  });

  describe('update', () => {
    test('should update an existing message', () => {
      const msg1 = chatModel.add('A', 'Text1');
      const updatedText = 'Updated text';
      const updatedMessage = chatModel.update(msg1.id, { text: updatedText, edited: true });

      expect(updatedMessage).toBeDefined();
      expect(updatedMessage?.text).toBe(updatedText);
      expect(updatedMessage?.edited).toBe(true);
      expect(chatModel.find(msg1.id)?.text).toBe(updatedText);
      expect(chatModel.find(msg1.id)?.edited).toBe(true);
    });

    test('should return undefined if message ID does not exist', () => {
      chatModel.add('A', 'Text1');
      const updatedMessage = chatModel.update(999, { text: 'New Text' });
      expect(updatedMessage).toBeUndefined();
    });

    test('should not change id, author, or timestamp during update', () => {
      const originalTimestamp = Date.now();
      jest.spyOn(global.Date, 'now').mockReturnValue(originalTimestamp);

      const msg1 = chatModel.add('Original Author', 'Original Text');
      jest.spyOn(global.Date, 'now').mockReturnValue(originalTimestamp + 1000); // Simulate time passing

      const updatedMessage = chatModel.update(msg1.id, { text: 'New Text', edited: true });

      expect(updatedMessage?.id).toBe(msg1.id);
      expect(updatedMessage?.author).toBe(msg1.author);
      expect(updatedMessage?.timestamp).toBe(originalTimestamp);
    });

    test('should update only specified fields', () => {
        const msg = chatModel.add('Author', 'Initial text', 'replyUser');
        const updated = chatModel.update(msg.id, { text: 'New Text' });

        expect(updated?.text).toBe('New Text');
        expect(updated?.author).toBe('Author');
        expect(updated?.replyTo).toBe('replyUser');
        expect(updated?.edited).toBeUndefined(); // edited was not passed, so should remain undefined/false
    });
  });
});
