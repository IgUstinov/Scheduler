/**
 * @file WebSocketServer.js
 * @description Создает WebSocket-сервер для обработки входящих подключений.
 */

const { Server } = require('ws');

const wss = new Server({ port: 8080 });

module.exports = wss;
