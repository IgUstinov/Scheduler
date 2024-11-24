/**
 * @file WebSocketClient.js
 * @description Создает WebSocket-клиент для подключения к серверу.
 */

const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8080');

module.exports = ws;
