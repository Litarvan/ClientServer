const { Server: WebSocketServer, OPEN: OPEN_STATE } = require('ws');

let startedGames = 0;
let toStartGames = 0;
const gameJSONs = [];
const onlineGameServers = [];

class GamesNetworkManager {
    constructor(serverLogic, port) {
        this.serverLogic = serverLogic;
        this.port = port;
        this.connectedWMSP = 0;
    }

    start() {
        this.websocket = new WebSocketServer({ port: this.port });

        console.log(`[GamesNetworkManager] Started server on port ${this.port}`);

        this.websocket.on('connection', ws => {
            this.connectedWMSP++;
            onlineGameServers.push(ws);

            ws.on('message', messageString => {
                let message = null;

                try {
                    message = JSON.parse(messageString);
                } catch (err) {
                    console.log(`JSON Parsing error: ${messageString}`);
                    return;
                }

                switch (message['message']) {
                    case 'Key': {
                        ws.key = message['key'];
                    } break;
                    case 'PortToUse': {
                        GamesNetworkManager.prototype.startGame.call(this, message['port'], message['lobbyID'], message['ip'])
                    } break;
                    case 'SureICan': {
                        if (ws.key === 'abcdefg123') {
                            if (toStartGames > startedGames) {
                                GamesNetworkManager.prototype.sendToPlayer.call(this, ws, {
                                    message: 'StartGame',
                                    gameJSON: gameJSONs[startedGames],
                                    lobbyID: message['lobbyID']
                                });

                                startedGames++;
                            }
                        }
                    }
                }
            });

            ws.on('close', () => {
                this.connectedWMSP--;
                onlineGameServers.splice(onlineGameServers.indexOf(ws), 1);
            });
        });
    }

    startGame(port, lobbyID, ip) {
        this.serverLogic.lobbyManager.startGame(port, lobbyID, ip)
    }

    orderGameStart(gameJSON, lobbyID) {
        toStartGames++;
        gameJSONs.push(gameJSON);

        this.sendToAll({ message: 'CouldYouStart', lobbyID });
    }

    sendToAll(object) {
        const sendString = JSON.stringify(object);
        for (const server of onlineGameServers) {
            if (server.readyState !== OPEN_STATE) continue;
            server.send(sendString);
        }
    }

    sendToPlayer(player, object) {
        if (player.readyState !== OPEN_STATE) return;
        player.send(JSON.stringify(object));
    }
}

module.exports = GamesNetworkManager;