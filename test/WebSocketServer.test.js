const { Server: MockServer, WebSocket: MockWebSocket } = require('mock-socket');

let server, client;

beforeAll(() => {
    server = new MockServer('ws://localhost:8080');
    client = new MockWebSocket('ws://localhost:8080');
});

afterAll(() => {
    server.stop();
    client.close();
});

describe('WebSocket Сервер', () => {
    test('должен инициализировать сервер', () => {
        expect(server).toBeDefined();
    });

    test('должен позволять подключение', (done) => {
        server.on('connection', (socket) => {
            expect(socket).toBeDefined();
            done();
        });

        client.dispatchEvent(new Event('open'));
    });
});
