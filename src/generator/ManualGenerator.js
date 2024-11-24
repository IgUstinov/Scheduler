/**
 * @file ManualGenerator.js
 * @description Реализует ручное создание задач через WebSocket-соединение.
 */

const Generator = require('./Generator.js');
const ws = require('../websocket/WebSocketClient.js');

const generator = Generator.getInstance(2000);

/**
 * Обработчик события открытия WebSocket. Создает задачу и закрывает соединение.
 */
ws.on('open', () => {
    generator.start(ws);
    ws.close(1000, 'Завершение работы клиента');
});

/**
 * Обработчик события ошибки WebSocket. Логирует сообщение об ошибке.
 */
ws.on('error', () => {
    generator.logAbort('Запустите планировщик задач');
});
