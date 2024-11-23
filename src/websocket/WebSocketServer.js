const { Server } = require('ws');

const wss = new Server({ port: 8080 });

module.exports = wss