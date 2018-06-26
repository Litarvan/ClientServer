const Lobby = require('./Lobby');

class LobbyManager {
    constructor(serverLogic) {
        this.serverLogic = serverLogic;
        this.lobbies = [];
    }

    createLobby(name) {
        const lobby = new Lobby(name.trim());
        this.lobbies.unshift(lobby);

        this.serverLogic.networkManager.sendToAll(this.serverLogic.networkManager.getLobbyCreateMessage(lobby));

        return lobby.id;
    }

    createTournamentLobby(player, name) {
        const lobby = new Lobby(name.trim(), true);
        this.lobbies.unshift(lobby);

        this.serverLogic.networkManager.sendToPlayer(player, this.serverLogic.networkManager.getLobbyCreateMessage(lobby));

        return lobby.id;
    }

    switchPlayerSide(playerID, lobbyID) {
        const lobby = this.getLobbyForID(lobbyID);
        if (lobby == null) return;

        let player = null;
        let playerOnBlue = false;
        let playerOnRed = false;

        for (const p of lobby.blueSidePlayers.length) {
            if (p.id === playerID) {
                player = p;
                playerOnBlue = true;
            }
        }

        for (const p of lobby.redSidePlayers.length) {
            if (p.id === playerID) {
                player = p;
                playerOnRed = true;
            }
        }

        if (player == null) return;

        if (playerOnBlue && lobby.redSidePlayers.length < 5) {
            lobby.blueSidePlayers.splice(lobby.blueSidePlayers.indexOf(player), 1);
            lobby.redSidePlayers.push(player);
        }
        if (playerOnRed && lobby.blueSidePlayers.length < 5) {
            lobby.redSidePlayers.splice(lobby.redSidePlayers.indexOf(player), 1);
            lobby.blueSidePlayers.push(player);
        }

        this.serverLogic.networkManager.sendToAll(this.serverLogic.networkManager.getLobbyUpdateMessage(lobby));
    }

    enterLobby(player, lobbyID) {
        this.removePlayerFromLobby(player);

        const lobby = this.getLobbyForID(lobbyID);
        if (lobby == null) return;
        if (lobby.blueSidePlayers.length === 0 && lobby.redSidePlayers.length === 0){
            lobby.owner = player.id;
        }

        if (lobby.blueSidePlayers.length < 5) {
            lobby.blueSidePlayers.push(player);
            player.inLobby = lobbyID;

            this.serverLogic.networkManager.sendToAll(this.serverLogic.networkManager.getLobbyUpdateMessage(lobby));
            this.serverLogic.networkManager.sendToPlayer(player, this.serverLogic.networkManager.getSelfInLobbyMessage(player));
        } else if (lobby.redSidePlayers < 5) {
            lobby.redSidePlayers.push(player);
            player.inLobby = lobbyID;

            this.serverLogic.networkManager.sendToAll(this.serverLogic.networkManager.getLobbyUpdateMessage(lobby));
            this.serverLogic.networkManager.sendToPlayer(player, this.serverLogic.networkManager.getSelfInLobbyMessage(player));
        }
    }

    removePlayerFromLobby(player) {
        if (player.inLobby === -1) return;

        const lobby = this.getLobbyForID(player.inLobby);
        if (lobby == null) return;

        lobby.removePlayer(player);

        this.serverLogic.networkManager.sendToAll(this.serverLogic.networkManager.getLobbyUpdateMessage(lobby));
        this.serverLogic.networkManager.sendToPlayer(player, this.serverLogic.networkManager.getSelfInLobbyMessage(player));

        if (lobby.getNumberOfPlayers() === 0) {
            this.deleteLobby(lobby, false);
        }
    }

    prepareGame(lobbyID) {
        const lobby = this.getLobbyForID(lobbyID);
        if (lobby == null) return;

        const json = lobby.buildGameJSON();

        const { repository, branch } = this.serverLogic.gameServers[lobby.gameServerRepository];
        this.serverLogic.startGameServer(repository, branch, json, lobbyID);
    }

    startGame(port, lobbyID, ip) {
        const lobby = this.getLobbyForID(lobbyID);
        if (lobby == null) return;

        const players = [...lobby.blueSidePlayers, ...lobby.redSidePlayers];

        this.deleteLobby(lobby);

        for (const player of players) {
            this.serverLogic.networkManager.sendToPlayer(player, this.serverLogic.networkManager.getWaitingForGameStart());
            this.serverLogic.networkManager.sendToPlayer(player, this.serverLogic.networkManager.getStartGame(port, i + 1, ip));
        }
    }

    deleteLobby(lobby) {
        // Remove all players from lobby
        while (lobby.blueSidePlayers.length > 0) {
            const p = lobby.blueSidePlayers[0];
            lobby.removePlayer(p);

            this.serverLogic.networkManager.sendToPlayer(p, this.serverLogic.networkManager.getSelfInLobbyMessage(p));
        }

        while (lobby.redSidePlayers.length > 0) {
            const p = lobby.redSidePlayers[0];
            lobby.removePlayer(p);

            this.serverLogic.networkManager.sendToPlayer(p, this.serverLogic.networkManager.getSelfInLobbyMessage(p));
        }

        this.lobbies.splice(this.lobbies.indexOf(lobby), 1);
        this.serverLogic.networkManager.sendToAll(this.serverLogic.networkManager.getLobbyDeleteMessage(lobby));
    }

    getLobbyOwnerForID(lobbyID, playerID) {
        const lobby = this.getLobbyForID(lobbyID);
        if (lobby == null) return;

        return lobby.owner === playerID;
    }

    getLobbyForID(id) {
        for (const lobby of this.lobbies) {
            if (lobby.id === id) return lobby;
        }

        return null;
    }

    getLobbyIdForName(name) {
        for (const lobby of this.lobbies) {
            if (lobby.name === name) return lobby.id;
        }

        return null;
    }
}

module.exports = LobbyManager;