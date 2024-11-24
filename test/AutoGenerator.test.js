jest.mock('../src/generator/Generator.js');

const { Server: MockServer, WebSocket: MockWebSocket } = require('mock-socket');
const Generator = require('../src/generator/Generator.js');

describe('Автоматический генератор', () => {
    let generatorMock, server, client;

    beforeEach(() => {
        jest.clearAllMocks();

        generatorMock = {
            taskGenerationMs: 2000,
            start: jest.fn(),
            logAbort: jest.fn(),
        };
        Generator.getInstance.mockReturnValue(generatorMock);

        jest.spyOn(global, 'setInterval').mockImplementation((fn) => {
            fn();
            return 1234;
        });

        jest.spyOn(global, 'clearInterval').mockImplementation(jest.fn());
        jest.spyOn(global, 'setInterval').mockImplementation(jest.fn());

        server = new MockServer('ws://localhost:1234');
        client = new MockWebSocket('ws://localhost:1234');
    });

    afterEach(() => {
        server.stop();
        client.close();
    });

    test('должен запустить генератор при открытии WebSocket', (done) => {
        server.on('connection', (socket) => {
            setInterval(generatorMock.start(socket), 2000);
            expect(setInterval).toHaveBeenCalled();
            expect(generatorMock.start).toHaveBeenCalledWith(socket);
            done();
        });

        client.dispatchEvent(new Event('open'));
    });

    test('должен выводить сообщение при ошибке подключения к WebSocket', (done) => {
        client.onerror = () => {
            generatorMock.logAbort('Запустите планировщик задач.');
            expect(generatorMock.logAbort).toHaveBeenCalledWith('Запустите планировщик задач.');
            done();
        };

        client.dispatchEvent(new Event('error'));
    });

    test('должен выводить сообщение при закрытии WebSocket', (done) => {
        client.onclose = () => {
            clearInterval();
            generatorMock.logAbort('Планировщик задач выключен.');
            done();
        };

        client.dispatchEvent(new Event('close'));
        expect(clearInterval).toHaveBeenCalled();
        expect(generatorMock.logAbort).toHaveBeenCalledWith('Планировщик задач выключен.');
    });
});
