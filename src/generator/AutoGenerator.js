const Generator = require('./Generator.js');
const ws = require('../websocket/WebSocketClient.js');

let autoGenerator = null;
const generator = Generator.getInstance(2000);

ws.on('open', () => {
  autoGenerator = setInterval(() => {
    generator.start(ws);
  }, generator.taskGenerationMs);
});

ws.on('error', () => {
  generator.logAbort('Запустите планировщик задач.');
});

ws.on('close', () => {
  clearInterval(autoGenerator);
  generator.logAbort(`Планировщик задач выключен.`);
});
