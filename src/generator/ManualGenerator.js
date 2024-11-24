const Generator = require('./Generator.js');
const ws = require('../websocket/WebSocketClient.js');

const generator = Generator.getInstance(2000);

ws.on('open', () => {
    generator.start(ws);
    ws.close(1000, 'Завершение работы клиента');
});

ws.on('error', () => {
    generator.logAbort('Запустите планировщик задач');
});
