jest.mock('../src/websocket/WebSocketServer.js', () => {
    const EventEmitter = require('events');
    return new EventEmitter();
});

const wss = require('../src/websocket/WebSocketServer.js');
const Schedule = require('../src/scheduler/Scheduler.js');
const Task = require('../src/task/Task.js');

describe('Автоматический планировщик', () => {
    let schedulerMock;

    beforeEach(() => {
        jest.clearAllMocks();
        schedulerMock = {
            start: jest.fn(),
            addTask: jest.fn(),
        };
        jest.spyOn(Schedule, 'getInstance').mockReturnValue(schedulerMock);
        jest.spyOn(Task, 'initReceivedTask').mockImplementation((task) => task);
    });

    test('должен обрабатывать событие WebSocket', () => {
        const ws = new wss.constructor();
        const messageHandler = jest.fn();

        wss.on('connection', (client) => {
            client.on('message', messageHandler);
        });

        const mockClient = new wss.constructor();
        wss.emit('connection', mockClient);

        mockClient.emit('message', 'Test message');
        expect(messageHandler).toHaveBeenCalledWith('Test message');
    });
});
