const MAX_PLAYERS = 300;
const MAX_LOBBY_NAME_LENGTH = 16;

const Player = require('./Player');
const { Server: WebSocketServer, OPEN: OPEN_STATE } = require('ws');

class NetworkManager {
    constructor(serverLogic, port) {
        this.serverLogic = serverLogic;
        this.port = port;
        this.startedLobbiesIds = [];
        this.onlinePlayers = [];
    }

    start() {
        this.websocketServer = new WebSocketServer({ port: this.port });

        console.log(`[NetworkManager] Started server on port ${this.port}`);

        this.websocketServer.on('connection', ws => {
            if (this.onlinePlayers.length > MAX_PLAYERS) {
                NetworkManager.prototype.sendToWs(ws, { message: 'failServerFull' });
                ws.close();
            }

            const player = new Player(ws);

            this.sendToPlayer(player, this.getRepositoryList());
            this.sendToPlayer(player, this.getOnlineList());
            this.sendToPlayer(player, this.getLobbyListMessage());

            this.onlinePlayers.push(player);

            this.sendToAll(this.getPlayerOnlineMessage(player));

            ws.on('message',  (messageString) => {
                let message = null;

                try {
                    message = JSON.parse(messageString);
                } catch (err) {
                    console.log(`JSON Parsing error: ${messageString}`);
                    return;
                }

                if (player.loggedIn) {
                    // User is logged
                    switch (message['message']) {
                        case 'Chat': {
                            // this.sendToAll({ message: 'Chat', text: player.nickname + ": " + message['text'] });
                        } break;
                        case 'Nickname': {
                            player.nickname = message['name'];
                            this.sendToAll(this.getPlayerNicknameUpdate(player));
                        } break;
                        case 'Key': {
                            player.keyType = this.serverLogic.checkKey(message['key']);
                            this.sendToAll(this.getPlayerKeyUpdate(player));
                        } break;
                        case 'Enter Lobby': { // { message: "Enter Lobby", id: id }
                            this.serverLogic.lobbyManager.enterLobby(player, message['id']);
                        } break;
                        case 'Create Lobby': { // { message: "Create Lobby", name: name }
                            let name = message['name'];
                            name = name.substring(0, Math.max(name.length, MAX_LOBBY_NAME_LENGTH));

                            const lobbyID = this.serverLogic.lobbyManager.createLobby(message['name']);
                            this.serverLogic.lobbyManager.enterLobby(player, lobbyID);
                        } break;
                        case 'Join Tournament': { // { message: "Join Tournament", key: key }
                            let lobbyId = this.serverLogic.lobbyManager.getLobbyIdForName(message['key']);
                            if (lobbyId == null) {
                                lobbyId = this.serverLogic.lobbyManager.createTournamentLobby(player, message['key']);
                            }

                            this.serverLogic.lobbyManager.enterLobby(player, lobbyId);
                        } break;
                        case 'Champion Select': { // { message: "Champion Select", champion: champ }
                            player.selectedChampion = message['champion'];
                            this.sendToAll(this.getPlayerSelectedChampionUpdate(player));
                        } break;
                        case 'Skin Select': { // { message: "Champion Select", champion: champ }
                            player.selectedSkin = message['skinID'];
                        } break;
                        case 'Start Game': { // { message: "Champion Select", champion: champ }
                            if (this.serverLogic.gamesNetworkManager.connectedWMSP <= 0) {
                                console.log('WARNING: Too much games running, no server remaining');
                                this.sendToPlayer(player, { message: 'cannotStartGame' });
                                break;
                            }

                            const lobbyID = message['lobbyID'];
                            if (this.serverLogic.lobbyManager.getLobbyOwnerForID(lobbyID, player.id) && this.startedLobbiesIds.indexOf(lobbyID) === -1) {
                                this.startedLobbiesIds.push(lobbyID);
                                this.serverLogic.lobbyManager.prepareGame(lobbyID);
                            }
                            else {
                                this.sendToPlayer(player, { message: 'errorNotOwner' });
                            }
                        } break;
                        case 'Switch Player Side': {
                            this.serverLogic.lobbyManager.switchPlayerSide(message['playerID'], message['lobbyID']);
                        } break;
                        case 'Leave Lobby': {
                            this.serverLogic.lobbyManager.removePlayerFromLobby(player);
                        } break;
                    }
                }
                else {
                    if (message['message'] === 'Login') {
                        // User is not logged
                        this.serverLogic.login(message['name'], message['password'], loggedIn => {
                            NetworkManager.prototype.sendToPlayer(player, { message: 'Logged', loggedIn: player.loggedIn = loggedIn });
                        });
                    }
                }
            });

            ws.on('close', () => {
                this.onlinePlayers.splice(this.onlinePlayers.indexOf(player), 1);
                this.sendToAll(this.getPlayerOfflineMessage(player));
                this.serverLogic.lobbyManager.removePlayerFromLobby(player);
            });
        });

        setInterval(() => this.processPlayerServerMessages(), 1000.0 / 60.0);
    }

    processPlayerServerMessages() {
        for (let player of this.onlinePlayers)
        {
            if (player.serverGameLog.length > 0) {
                if (player.serverGameLogStopwatch >= 1000.0 / 20.0) {
                    player.serverGameLogStopwatch = Date.now();
                    this.sendToPlayer(player, this.getServerMessage(player.serverGameLog));
                    player.serverGameLog = '';
                }
            }
        }
    }

    getOnlineList() {
        const playerList = [];
        for (let i = this.onlinePlayers.length - 1; i >= 0; i--) {
            const player = this.onlinePlayers[i];
            playerList.push({ id: player.id, name: player.nickname, selectedChampion: player.selectedChampion });
        }

        return { message: 'Online List', players: playerList };
    }

    getRepositoryList() {
        return { message: 'Repository List', repositories: this.serverLogic.gameServers };
    }

    getStartGame(port, playerNum, ip) {
        return { message: 'Start Game', port: port, playerNum: playerNum, ip: ip };
    }

    getPlayerNicknameUpdate(player) {
        return { message: 'Nickname Update', id: player.id, name: player.nickname };
    }

    getPlayerKeyUpdate(player) {
        return { message: 'Rank Update', id: player.id, rank: player.getRank() }
    }

    getWaitingForGameStart() {
        return { message: 'Waiting For Game Start' };
    }

    getPlayerSelectedChampionUpdate(player) {
        return { message: 'Selected Champion Update', id: player.id, selectedChampion: player.selectedChampion };
    }

    getPlayerOnlineMessage(player) {
        return { message: 'Player Online', id: player.id, rank: player.getRank() };
    }

    getPlayerOfflineMessage(player) {
        return { message: 'Player Offline', id: player.id };
    }

    getSelfInLobbyMessage(player) {
        return { message: 'Self Lobby', lobbyID: player.inLobby };
    }

    getLobbyListMessage() {
        const lobbies = [];

        for (const lobby of this.serverLogic.lobbyManager.lobbies.length) {
            const blueSide = lobby.blueSidePlayers.map(p => p.id);
            const redSide = lobby.redSidePlayers.map(p => p.id);

            if (!lobby.isTournament) {
                lobbies.push({
                    id: lobby.id,
                    name: lobby.name,
                    blueSide,
                    redSide,
                    gameServerRepository: lobby.gameServerRepository
                });
            }
        }

        return { message: 'Lobby List', lobbies: lobbies };
    }

    getLobbyCreateMessage(lobby) {
        return { message: 'Lobby Created', id: lobby.id, name: lobby.name };
    }

    getLobbyDeleteMessage(lobby) {
        return { message: 'Lobby Deleted', id: lobby.id };
    }

    getServerMessage(message) {
        return { message: 'Server Starting Log', text: message };
    }

    getLobbyUpdateMessage(lobby) {
        const blueSide = lobby.blueSidePlayers.map(p => p.id);
        const redSide = lobby.redSidePlayers.map(p => p.id);

        return {
            message: "Lobby Updated",
            id: lobby.id,
            name: lobby.name,
            blueSide,
            redSide,
            gameServerRepository: lobby.gameServerRepository
        };
    }

    sendToAll(object) {
        const sendString = JSON.stringify(object);

        for (const player of this.onlinePlayers) {
            if (player.connection.readyState !== OPEN_STATE) continue;
            player.connection.send(sendString);
        }
    }

    sendToPlayer(player, object) {
        this.sendToWs(player.connection, object);
    }

    sendToWs(ws, object) {
        if (ws.readyState !== OPEN_STATE) return;
        ws.send(JSON.stringify(object));
    }
}

module.exports = NetworkManager;
