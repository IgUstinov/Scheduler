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

describe('WebSocket Клиент', () => {
    test('должен инициализировать клиента', () => {
        expect(client).toBeDefined();
    });

    test('должен подключаться к серверу', (done) => {
        server.on('connection', (socket) => {
            expect(socket).toBeDefined();
            done();
        });

        client.onopen = () => {
            expect(client.readyState).toBe(WebSocket.OPEN);
        };
    });
});
