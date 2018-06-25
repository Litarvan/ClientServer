var Utility = require('./Utility/Utility');
var CreateFunction = Utility.CreateFunction;
var startedGames = 0;
var toStartGames = 0;
var gameJSONs = [];
var onlineGameServers = [];

function GamesNetworkManager(serverLogic) {
    var WebSocketServer = require('ws').Server;
    this.connectedWMSP = 0;
    this.websocket = new WebSocketServer({ port: 7778 });
    this.serverLogic = serverLogic;
    this.currentGameServerID = 0;


    console.log("Started server on port 7778");

    this.websocket.on('connection', CreateFunction(this, function connection(ws) {
        this.connectedWMSP++;
        ws = ws;
        onlineGameServers.push(ws);
        ws.on('message', CreateFunction(this, function (messageString) {
            var message = null;
            console.log("Got message: " + messageString);
            try {
                message = JSON.parse(messageString);
            } catch (err) {
                console.log("JSON Parsing error: " + messageString);
                return;
            }
            var messageTitle = message['message'];
            switch (messageTitle) {
                case "Key": {
                    console.log("key received")
                    ws.key = message['key'];
                } break;
                case "PortToUse": {
                    GamesNetworkManager.prototype.startGame.call(this, message['port'], message['lobbyID'], message['ip'])
                } break;
                case "SureICan": {
                    if (ws.key == "abcdefg123") {
                        if (toStartGames > startedGames) {
                            GamesNetworkManager.prototype.sendToPlayer.call(this, ws, { message: 'StartGame', gameJSON: gameJSONs[startedGames], lobbyID: message['lobbyID'] })
                            startedGames++;
                        }
                    }
                }
            }
        }))
        ws.on('close', CreateFunction(this, () => {
            this.connectedWMSP--;
            console.log("GameHost disconnected")
            onlineGameServers.splice(onlineGameServers.indexOf(ws), 1);
        }));
    }))
}

GamesNetworkManager.prototype.startGame = function (port, lobbyID, ip) {
    this.serverLogic.lobbyManager.startGame(port, lobbyID, ip)
}
GamesNetworkManager.prototype.orderGameStart = function (gameJSON, lobbyID) {
    toStartGames++;
    gameJSONs.push(gameJSON)
    this.sendToAll({ message: 'CouldYouStart', lobbyID });
}
var OPEN_STATE = require('ws').OPEN;
GamesNetworkManager.prototype.sendToAll = function (object) {
    var sendString = JSON.stringify(object);
    for (var i = 0; i < onlineGameServers.length; i++) {
        var player = onlineGameServers[i];
        if (player.readyState !== OPEN_STATE) continue;
        player.send(sendString);
    }
}
GamesNetworkManager.prototype.sendToPlayer = function (player, object) {
    if (player.readyState !== OPEN_STATE) return;
    player.send(JSON.stringify(object));
};

module.exports = GamesNetworkManager;