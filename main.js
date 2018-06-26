const CLIENTS_PORT = 7777;
const SERVERS_PORT = 7778;

const ServerLogic = require('./src/ServerLogic');

const server = new ServerLogic(CLIENTS_PORT, SERVERS_PORT);
server.start();