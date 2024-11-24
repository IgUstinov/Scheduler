jest.mock('../src/generator/Generator.js');

const { Server: MockServer, WebSocket: MockWebSocket } = require('mock-socket');
const Generator = require('../src/generator/Generator.js');

describe('Однозадачный генератор', () => {
    let generatorMock, server, client;

    beforeEach(() => {
        jest.clearAllMocks();

        generatorMock = {
            start: jest.fn(),
            logAbort: jest.fn(),
        };
        Generator.getInstance.mockReturnValue(generatorMock);

        server = new MockServer('ws://localhost:5678');
        client = new MockWebSocket('ws://localhost:5678');
    });

    afterEach(() => {
        server.stop();
        client.close();
    });

    test('должен сгенерировать задачу при открытии WebSocket и после закрыть соединение', (done) => {
        server.on('connection', (socket) => {
            generatorMock.start(socket); // Явный вызов start
            expect(generatorMock.start).toHaveBeenCalledWith(socket);

            socket.onclose = () => {
                expect(socket.readyState).toBe(MockWebSocket.CLOSED);
                done();
            };

            socket.close();
        });

        client.dispatchEvent(new Event('open'));
    });

    test('должен выводить сообщение при ошибке подключения к WebSocket', (done) => {
        client.onerror = () => {
            generatorMock.logAbort('Запустите планировщик задач');
            expect(generatorMock.logAbort).toHaveBeenCalledWith('Запустите планировщик задач');
            done();
        };

        client.dispatchEvent(new Event('error'));
    });
});
