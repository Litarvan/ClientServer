var Lobby = require('./Lobby');
var Utility = require('./Utility/Utility');
var CreateFunction = Utility.CreateFunction;

function LobbyManager(serverLogic) {
    this.serverLogic = serverLogic;
    this.currentLobbyID = 0;
    this.lobbies = [];
}
LobbyManager.prototype.createLobby = function (name) {
    var lobby = new Lobby();
    lobby.id = this.currentLobbyID;
    this.currentLobbyID++;
    lobby.name = name;
    lobby.isTournament = false;
    if (name == "") lobby.name = lobby.id + '';
    this.lobbies.unshift(lobby);

    this.serverLogic.networkManager.sendToAll(this.serverLogic.networkManager.getLobbyCreateMessage(lobby));

    return lobby.id;
};
LobbyManager.prototype.createTournamentLobby = function (player, name) {
    var lobby = new Lobby();
    lobby.id = this.currentLobbyID;
    this.currentLobbyID++;
    lobby.name = name;
    lobby.isTournament = true;
    if (name == "") lobby.name = lobby.id + '';
    this.lobbies.unshift(lobby);
    this.serverLogic.networkManager.sendToPlayer(player, this.serverLogic.networkManager.getLobbyCreateMessage(lobby));

    return lobby.id;
};
LobbyManager.prototype.switchPlayerSide = function (playerID, lobbyID) {
    var lobby = this.getLobbyForID(lobbyID);
    if (lobby == null) return;

    var player = null;
    var playerOnBlue = false;
    var playerOnRed = false;
    for (var i = 0; i < lobby.blueSidePlayers.length; i++) {
        if (lobby.blueSidePlayers[i].id == playerID) {
            player = lobby.blueSidePlayers[i];
            playerOnBlue = true;
        }
    }
    for (var i = 0; i < lobby.redSidePlayers.length; i++) {
        if (lobby.redSidePlayers[i].id == playerID) {
            player = lobby.redSidePlayers[i];
            playerOnRed = true;
        }
    }
    if (player == null) return;
    if (playerOnBlue) {
        if (lobby.redSidePlayers.length < 5) {
            lobby.blueSidePlayers.splice(lobby.blueSidePlayers.indexOf(player), 1);
            lobby.redSidePlayers.push(player);
        }
    }
    if (playerOnRed) {
        if (lobby.blueSidePlayers.length < 5) {
            lobby.redSidePlayers.splice(lobby.redSidePlayers.indexOf(player), 1);
            lobby.blueSidePlayers.push(player);
        }
    }
    this.serverLogic.networkManager.sendToAll(this.serverLogic.networkManager.getLobbyUpdateMessage(lobby));
};
LobbyManager.prototype.setLobbyRepository = function (lobbyID, repositoryID) {
    var lobby = this.getLobbyForID(lobbyID);
    if (lobby == null) return;

    lobby.gameServerRepository = repositoryID;

    this.serverLogic.networkManager.sendToAll(this.serverLogic.networkManager.getLobbyUpdateMessage(lobby));
};
LobbyManager.prototype.enterLobby = function (player, lobbyID) {
    this.removePlayerFromLobby(player);

    var lobby = this.getLobbyForID(lobbyID);
    if (lobby == null) return;
    if (lobby.blueSidePlayers.length == 0 && lobby.redSidePlayers.length == 0){
        lobby.owner = player.id;
    }
    if (lobby.blueSidePlayers.length < 5) {
        lobby.blueSidePlayers.push(player);
        player.inLobby = lobbyID;
        this.serverLogic.networkManager.sendToAll(this.serverLogic.networkManager.getLobbyUpdateMessage(lobby));
        this.serverLogic.networkManager.sendToPlayer(player, this.serverLogic.networkManager.getSelfInLobbyMessage(player));
    } else {
        if (lobby.redSidePlayers < 5) {
            lobby.redSidePlayers.push(player);
            player.inLobby = lobbyID;
            this.serverLogic.networkManager.sendToAll(this.serverLogic.networkManager.getLobbyUpdateMessage(lobby));
            this.serverLogic.networkManager.sendToPlayer(player, this.serverLogic.networkManager.getSelfInLobbyMessage(player));
        } else {
            // Lobby is full
        }
    }
};
LobbyManager.prototype.removePlayerFromLobby = function (player) {
    if (player.inLobby == -1) return;
    var lobby = this.getLobbyForID(player.inLobby);
    if (lobby == null) return;
    lobby.removePlayer(player);

    this.serverLogic.networkManager.sendToAll(this.serverLogic.networkManager.getLobbyUpdateMessage(lobby));

    this.serverLogic.networkManager.sendToPlayer(player, this.serverLogic.networkManager.getSelfInLobbyMessage(player));

    if (lobby.getNumberOfPlayers() == 0) {
        this.deleteLobby(lobby, false);
    }
};

LobbyManager.prototype.prepareGame = function (lobbyID) {
    var lobby = this.getLobbyForID(lobbyID);
    if (lobby == null) return;
    var json = lobby.buildGameJSON();

    var gs = this.serverLogic.gameServers[lobby.gameServerRepository];
    var repository = gs['repository'];
    var branch = gs['branch'];

    this.serverLogic.startGameServer(repository, branch, json, lobbyID);
}

LobbyManager.prototype.startGame = function (port, lobbyID, ip) {
    var lobby = this.getLobbyForID(lobbyID);
    var players = [];
    if (lobby == null) return;

    for (var i = 0; i < lobby.blueSidePlayers.length; i++) {
        var player = lobby.blueSidePlayers[i];
        players.push(player);
    }
    for (var i = 0; i < lobby.redSidePlayers.length; i++) {
        var player = lobby.redSidePlayers[i];
        players.push(player);
    }
    for (var i = 0; i < players.length; i++) {
        var player = players[i];
        this.serverLogic.networkManager.sendToPlayer(player, this.serverLogic.networkManager.getWaitingForGameStart());
    }
    this.deleteLobby(lobby);
    for (var i = 0; i < players.length; i++) {
        var player = players[i];
        this.serverLogic.networkManager.sendToPlayer(player, this.serverLogic.networkManager.getStartGame(port, i + 1, ip));
    }
}

LobbyManager.prototype.deleteLobby = function (lobby) {
    //Remove all players from lobby
    while (lobby.blueSidePlayers.length > 0) {
        var p = lobby.blueSidePlayers[0];
        lobby.removePlayer(p);
        this.serverLogic.networkManager.sendToPlayer(p, this.serverLogic.networkManager.getSelfInLobbyMessage(p));
    }
    while (lobby.redSidePlayers.length > 0) {
        var p = lobby.redSidePlayers[0];
        lobby.removePlayer(p);
        this.serverLogic.networkManager.sendToPlayer(p, this.serverLogic.networkManager.getSelfInLobbyMessage(p));
    }
    this.lobbies.splice(this.lobbies.indexOf(lobby), 1);

    this.serverLogic.networkManager.sendToAll(this.serverLogic.networkManager.getLobbyDeleteMessage(lobby));
};

LobbyManager.prototype.startLobby = function (id) {
    var lobby = this.getLobbyForID(id);
    if (lobby == null) return;

    this.deleteLobby(lobby, false);
}
LobbyManager.prototype.getLobbyOwnerForID = function(lobbyID, playerID){
    var lobby = this.getLobbyForID(lobbyID);
    if (lobby != null){
        if (lobby.owner == playerID){
            return true;
        } else {
            return false;
        }
    }
}
LobbyManager.prototype.getLobbyForID = function (id) {
    for (var i = 0; i < this.lobbies.length; i++) {
        var lobby = this.lobbies[i];
        if (lobby.id == id) return lobby;
    }
    return null;
};
LobbyManager.prototype.getLobbyForName = function (name) {
    for (var i = 0; i < this.lobbies.length; i++) {
        var lobby = this.lobbies[i];
        if (lobby.name == name) return lobby;
    }
    return null;
};
LobbyManager.prototype.getLobbyIdForName = function (name) {
    for (var i = 0; i < this.lobbies.length; i++) {
        var lobby = this.lobbies[i];
        if (lobby.name == name) return lobby.id;
    }
    return null;
};

module.exports = LobbyManager;