const NetworkManager = require('./NetworkManager');
const GamesNetworkManager = require('./GamesNetworkManager');
const LobbyManager = require('./LobbyManager');

class ServerLogic {
    constructor(clientsPort, serversPort) {
        this.networkManager = new NetworkManager(this, clientsPort);
        this.gamesNetworkManager = new GamesNetworkManager(this, serversPort);
        this.lobbyManager = new LobbyManager(this);

        this.gameServers = [{ repository: "LeagueSandbox", branch: "indev" }, { repository: "LeagueSandbox", branch: "master" }];
    }

    start()
    {
        this.networkManager.start();
        this.gamesNetworkManager.start();
    }

    login(nickname, password, callback) {
        // TODO: Implement !
        callback(true);
    }

    checkKey(key) {
        let keys = require('../keys.json');

        if (key === keys['vip2']) {
            console.log('[ServerLogic] Donator key provided');
            return 'vip2';
        }

        if (key === keys['dev']) {
            console.log("[ServerLogic] Developer key provided");
            return ['dev'];
        }

        return 'none';
    }

    startGameServer(repository, branch, gameJSON, lobbyID) {
        this.gamesNetworkManager.orderGameStart(JSON.stringify(JSON.stringify(gameJSON)), lobbyID)
    }
}

module.exports = ServerLogic;