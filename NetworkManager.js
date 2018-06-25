var Player = require('./Player');
var Utility = require('./Utility/Utility');
var CreateFunction = Utility.CreateFunction;

function NetworkManager(serverLogic) {
    this.startedLobbiesIds = [];
    this.serverLogic = serverLogic;
    this.onlinePlayers = [];
    this.currentPlayerID = 0;

    var WebSocketServer = require('ws').Server;
    this.websocketServer = new WebSocketServer({ port: 7777 });

    console.log("Started server on port 7777");

    this.websocketServer.on('connection', CreateFunction(this, function connection(ws) {
        if (this.onlinePlayers.length > 300) {
            NetworkManager.prototype.sendToWs(ws, { message: "failServerFull" });
            ws.close();
        }
        var player = new Player(ws);
        player.id = this.currentPlayerID;
        this.currentPlayerID++;
        this.sendToPlayer(player, this.getRepositoryList());
        this.sendToPlayer(player, this.getOnlineList());
        this.sendToPlayer(player, this.getLobbyListMessage());
        this.onlinePlayers.push(player);

        this.sendToAll(this.getPlayerOnlineMessage(player));

        ws.on('message', CreateFunction(this, function (messageString) {
            var message = null;
            try {
                message = JSON.parse(messageString);
            } catch (err) {
                console.log("JSON Parsing error: " + messageString);
                return;
            }
            if (!player.loggedIn) {
                if (message['message'] == "Login") {
                    //User is not logged
                    this.serverLogic.login(message['name'], message['password'], function (loggedIn) {
                        if (loggedIn) {
                            player.loggedIn = true;
                            NetworkManager.prototype.sendToPlayer(player, { message: "Logged", loggedIn: true });
                        } else {
                            NetworkManager.prototype.sendToPlayer(player, { message: "Logged", loggedIn: false });
                        }
                    });
                }
            } else {
                //User is logged
                var messageTitle = message['message'];
                switch (messageTitle) {
                    case "Chat": {
                        //this.sendToAll({ message: 'Chat', text: player.nickname + ": " + message['text'] });
                    } break;
                    case "Nickname": {
                        player.nickname = message['name'];
                        this.sendToAll(this.getPlayerNicknameUpdate(player));
                    } break;
                    case "Key": {
                        player.keyType = this.serverLogic.checkKey(message['key']);
                        this.sendToAll(this.getPlayerKeyUpdate(player))
                    } break;
                    case "Enter Lobby": { //{message: "Enter Lobby", id: id}
                        this.serverLogic.lobbyManager.enterLobby(player, message['id']);
                    } break;
                    case "Create Lobby": { //{message: "Create Lobby", name: name}
                        if (message['name'].length < 16) {
                            var lobbyID = this.serverLogic.lobbyManager.createLobby(message['name']);
                            this.serverLogic.lobbyManager.enterLobby(player, lobbyID);
                        }
                    } break;
                    case "Join Tournament": { //{message: "Join Tournament", key: key}
                        var lobbyId = this.serverLogic.lobbyManager.getLobbyIdForName(message['key'])
                        if (lobbyId == null) {
                            lobbyId = this.serverLogic.lobbyManager.createTournamentLobby(player, message['key']);
                        }
                        this.serverLogic.lobbyManager.enterLobby(player, lobbyId);
                        console.log(lobbyId)
                    } break;
                    case "Champion Select": { //{message: "Champion Select", champion: champ}
                        player.selectedChampion = message['champion'];
                        this.sendToAll(this.getPlayerSelectedChampionUpdate(player));
                    } break;
                    case "Skin Select": { //{message: "Champion Select", champion: champ}
                        player.selectedSkin = message['skinID'];
                    } break;
                    case "Start Game": { //{message: "Champion Select", champion: champ}
                        if (this.serverLogic.gamesNetworkManager.connectedWMSP > 0) {
                            var lobbyID = message['lobbyID'];
                            if (player.id != -1) {
                                if (this.serverLogic.lobbyManager.getLobbyOwnerForID(lobbyID, player.id)) {
                                    if (this.startedLobbiesIds.indexOf(lobbyID) == -1) {
                                        this.startedLobbiesIds.push(lobbyID)
                                        this.serverLogic.lobbyManager.prepareGame(lobbyID);
                                    }
                                } else {
                                    this.sendToPlayer(player, { message: "errorNotOwner" })
                                }
                            }
                        } else {
                            console.log("cannot start game")
                            this.sendToPlayer(player, { message: "cannotStartGame" })
                        }
                    } break;
                    case "Switch Player Side": { //{message: "Switch Player Side", lobbyID: lobbyID, playerID: playerID}
                        this.serverLogic.lobbyManager.switchPlayerSide(message['playerID'], message['lobbyID']);
                    } break;
                    case "Leave Lobby": {
                        this.serverLogic.lobbyManager.removePlayerFromLobby(player);
                    } break;
                }
            }
        }));

        ws.on('close', CreateFunction(this, () => {
            this.onlinePlayers.splice(this.onlinePlayers.indexOf(player), 1);
            this.sendToAll(this.getPlayerOfflineMessage(player));
            this.serverLogic.lobbyManager.removePlayerFromLobby(player);
        }));

        //ws.send('something');
    }));

    setTimeout(CreateFunction(this, this.processPlayerServerMessages), 1000.0 / 60.0);
}

NetworkManager.prototype.processPlayerServerMessages = function () {
    for (var i = 0; i < this.onlinePlayers.length; i++) {
        var player = this.onlinePlayers[i];
        if (player.serverGameLog.length > 0) {
            if (player.serverGameLogStopwatch.getMilliseconds() >= 1000.0 / 20.0) {
                player.serverGameLogStopwatch.reset();
                this.sendToPlayer(player, this.getServerMessage(player.serverGameLog));
                player.serverGameLog = "";
            }
        }
    }
    setTimeout(CreateFunction(this, this.processPlayerServerMessages), 1000.0 / 60.0);
};

NetworkManager.prototype.getOnlineList = function () {
    var playerList = [];
    for (var i = this.onlinePlayers.length - 1; i >= 0; i--) {
        var player = this.onlinePlayers[i];
        playerList.push({ id: player.id, name: player.nickname, selectedChampion: player.selectedChampion });
    }
    return { message: "Online List", players: playerList };
};

NetworkManager.prototype.getRepositoryList = function () {
    return { message: "Repository List", repositories: this.serverLogic.gameServers };
};

NetworkManager.prototype.getStartGame = function (port, playerNum, ip) {
    return { message: "Start Game", port: port, playerNum: playerNum, ip: ip };
};

NetworkManager.prototype.getPlayerNicknameUpdate = function (player) {
    return { message: "Nickname Update", id: player.id, name: player.nickname };
};
NetworkManager.prototype.getPlayerKeyUpdate = function (player) {
    var rank = "USER"
    if (player.keyType == "vip1" || player.keyType == "vip2") {
        rank = "DONATOR"
    }
    if (player.keyType == "dev") {
        rank = "STAFF"
    }
    return { message: "Rank Update", id: player.id, rank: rank }
};

NetworkManager.prototype.getWaitingForGameStart = function () {
    return { message: 'Waiting For Game Start' };
};

NetworkManager.prototype.getPlayerSelectedChampionUpdate = function (player) {
    return { message: "Selected Champion Update", id: player.id, selectedChampion: player.selectedChampion };
};
NetworkManager.prototype.getPlayerOnlineMessage = function (player) {
    var rank = "USER"
    if (player.keyType == "vip1" || player.keyType == "vip2") {
        rank = "DONATOR"
    }
    if (player.keyType == "dev") {
        rank = "STAFF"
    }
    return { message: "Player Online", id: player.id, rank: rank };
};
NetworkManager.prototype.getPlayerOfflineMessage = function (player) {
    return { message: "Player Offline", id: player.id };
};
NetworkManager.prototype.getPlayerByID = function (id) {
    for (var i = 0; i < this.onlinePlayers.length; i++) {
        var p = this.onlinePlayers[i];
        if (p.id == id) return p;
    }
    return null;
};

NetworkManager.prototype.getSelfInLobbyMessage = function (player) {
    return { message: "Self Lobby", lobbyID: player.inLobby };
};

NetworkManager.prototype.getLobbyListMessage = function () {
    var lobbies = [];
    for (var j = 0; j < this.serverLogic.lobbyManager.lobbies.length; j++) {
        var lobby = this.serverLogic.lobbyManager.lobbies[j];

        var blueSide = [];
        for (var i = 0; i < lobby.blueSidePlayers.length; i++) {
            var p = lobby.blueSidePlayers[i];
            blueSide.push(p.id);
        }
        var redSide = [];
        for (var i = 0; i < lobby.redSidePlayers.length; i++) {
            var p = lobby.redSidePlayers[i];
            redSide.push(p.id);
        }
        if (lobby.isTournament == false) {
            lobbies.push({ id: lobby.id, name: lobby.name, blueSide: blueSide, redSide: redSide, gameServerRepository: lobby.gameServerRepository });
        }
    }
    return { message: "Lobby List", lobbies: lobbies };
};

NetworkManager.prototype.getLobbyCreateMessage = function (lobby) {
    return { message: "Lobby Created", id: lobby.id, name: lobby.name };
};

NetworkManager.prototype.getLobbyDeleteMessage = function (lobby) {
    return { message: "Lobby Deleted", id: lobby.id };
};

NetworkManager.prototype.addToServerMessageLog = function (player, message) {
    player.serverGameLog += message;// + "\n";//+= message + "\n";
};

NetworkManager.prototype.getServerMessage = function (message) {
    return { message: "Server Starting Log", text: message };
};

NetworkManager.prototype.getLobbyUpdateMessage = function (lobby) {
    var blueSide = [];
    for (var i = 0; i < lobby.blueSidePlayers.length; i++) {
        var p = lobby.blueSidePlayers[i];
        blueSide.push(p.id);
    }
    var redSide = [];
    for (var i = 0; i < lobby.redSidePlayers.length; i++) {
        var p = lobby.redSidePlayers[i];
        redSide.push(p.id);
    }
    return { message: "Lobby Updated", id: lobby.id, name: lobby.name, blueSide: blueSide, redSide: redSide, gameServerRepository: lobby.gameServerRepository };
};

NetworkManager.prototype.sendToAll = function (object) {
    var sendString = JSON.stringify(object);
    for (var i = 0; i < this.onlinePlayers.length; i++) {
        var player = this.onlinePlayers[i];
        if (player.connection.readyState !== OPEN_STATE) continue;
        player.connection.send(sendString);
    }
};
var OPEN_STATE = require('ws').OPEN;
NetworkManager.prototype.sendToPlayer = function (player, object) {
    if (player.connection.readyState !== OPEN_STATE) return;
    player.connection.send(JSON.stringify(object));
};
NetworkManager.prototype.sendToWs = function (ws, object) {
    if (ws.readyState !== OPEN_STATE) return;
    ws.send(JSON.stringify(object));
};

module.exports = NetworkManager;
