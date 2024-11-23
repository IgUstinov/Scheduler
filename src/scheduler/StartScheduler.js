const Schedule = require('./Scheduler.js');
const Task = require('../task/Task.js');
const wss = require('../websocket/WebSocketServer.js');

function startScheduler(readyQueueLimit) {
    const scheduler = Schedule.getInstance(readyQueueLimit);
    scheduler.start();
}

function receiveTask(message) {
    const scheduler = Schedule.getInstance();
    const receivedTask = Task.initReceivedTask(JSON.parse(message))
    scheduler.addTask(receivedTask)
}

startScheduler(2);

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    receiveTask(message)
  });
});