var NetworkManager = require('./NetworkManager');
var GamesNetworkManager = require('./GamesNetworkManager');
var LobbyManager = require('./LobbyManager');
var Utility = require('./Utility/Utility');
const bcrypt = require('bcrypt');
const mysql = require('mysql');
const cors = require('cors');

var CreateFunction = Utility.CreateFunction;

var mysqlSettings = {
    host: "",
    user: "",
    password: "",
    database: ""
}

function ServerLogic() {
    this.networkManager = new NetworkManager(this);
    this.lobbyManager = new LobbyManager(this);
    this.gamesNetworkManager = new GamesNetworkManager(this);

    this.gameServerRepositories = ["LeagueSandbox"];

    this.gameServers = [{ repository: "LeagueSandbox", branch: "indev" }, { repository: "LeagueSandbox", branch: "master" }];

    this.totalLaunchedGameServers = 0;
    this.runningGames = [];

}

ServerLogic.prototype.login = function (nickname, password, callback) {
    callback(true);
}

ServerLogic.prototype.checkKey = function (key) {
    if (key == "9FEHOONMdwwk24K6") {
        console.log("correct key");
        return "vip2";
    }
    if (key == "rSFrIBLzbvvkRQSF") {
        console.log("correct key2");
        return "dev";
    }
    return "none";
}
ServerLogic.prototype.startGameServer = function (repository, branch, gameJSON, lobbyID) {
    this.gamesNetworkManager.orderGameStart(JSON.stringify(JSON.stringify(gameJSON)), lobbyID)
}

function RunningGame() {
    var id = -1;
    var gameExec = null;
}

var serverInstance = new ServerLogic();