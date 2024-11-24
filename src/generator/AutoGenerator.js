/**
 * @file AutoGenerator.js
 * @description Реализует автоматическое создание задач через WebSocket-соединение.
 */

const Generator = require('./Generator.js');
const ws = require('../websocket/WebSocketClient.js');

let autoGenerator = null;
const generator = Generator.getInstance(2000);

/**
 * Обработчик события открытия WebSocket. Запускает автоматическое создание задач.
 */
ws.on('open', () => {
    autoGenerator = setInterval(() => {
        generator.start(ws);
    }, generator.taskGenerationMs);
});

/**
 * Обработчик события ошибки WebSocket. Логирует сообщение об ошибке.
 */
ws.on('error', () => {
    generator.logAbort('Запустите планировщик задач.');
});

/**
 * Обработчик события закрытия WebSocket. Останавливает автоматическое создание задач.
 */
ws.on('close', () => {
    clearInterval(autoGenerator);
    generator.logAbort('Планировщик задач выключен.');
});
