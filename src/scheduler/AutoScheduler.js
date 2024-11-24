/**
 * @file AutoScheduler.js
 * @description Запускает планировщик и обрабатывает входящие задачи через WebSocket-сервер.
 */

const Schedule = require('./Scheduler.js');
const Task = require('../task/Task.js');
const wss = require('../websocket/WebSocketServer.js');

/**
 * Запускает планировщик с ограничением очереди готовности.
 * @param {number} readyQueueLimit Лимит задач в очереди готовности.
 */
function startScheduler(readyQueueLimit) {
    const scheduler = Schedule.getInstance(readyQueueLimit);
    scheduler.start();
}

/**
 * Обрабатывает сообщение о задаче и добавляет задачу в планировщик.
 * @param {string} message JSON-строка с данными задачи.
 */
function receiveTask(message) {
    const scheduler = Schedule.getInstance();
    const receivedTask = Task.initReceivedTask(JSON.parse(message));
    scheduler.addTask(receivedTask);
}

startScheduler(2);

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        receiveTask(message);
    });
});
