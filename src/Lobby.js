let nextID = 0;

class Lobby  {
    constructor(name, tournament = false)  {
        this.id = nextID++;
        this.name = name === '' ? this.id.toString() : name;
        this.owner = '';
        this.isTournament = tournament;
        this.blueSidePlayers = [];
        this.redSidePlayers = [];
        this.gameServerRepository = 0;
    }

    removePlayer(player) {
        let i = this.blueSidePlayers.indexOf(player);
        if (i > -1) this.blueSidePlayers.splice(i, 1);

        i = this.redSidePlayers.indexOf(player);
        if (i > -1) this.redSidePlayers.splice(i, 1);

        player.inLobby = -1;
    }

    getNumberOfPlayers() {
        return this.blueSidePlayers.length + this.redSidePlayers.length;
    }

    buildGameJSON() {
        const json = {
            players: [
            ],
            game: {
                map: 1,
                gameMode: "LeagueSandbox-Default"
            },
            gameInfo: {
                MANACOSTS_ENABLED: true,
                COOLDOWNS_ENABLED: true,
                CHEATS_ENABLED: false,
                MINION_SPAWNS_ENABLED: true
            }
        };

        const players = [];
        this.blueSidePlayers.forEach(p => players.push({...p, team: 'BLUE' }));
        this.redSidePlayers.forEach(p => players.push({...p, team: 'RED' }));

        for (const player of players) {
            let rank = 'BRONZE';
            if (player.keyType === "vip1" || player.keyType === "dev"){
                rank = 'DIAMOND';
            }
            if (player.keyType === "vip2"){
                rank = 'CHALLENGER';
            }

            json.players.push({
                rank,
                name: player.nickname,
                champion: player.selectedChampion,
                team: player.team,
                skin: player.selectedSkin,
                summoner1: 'SummonerHeal',
                summoner2: 'SummonerFlash',
                ribbon: 2,
                icon: 0,
                runes: {
                    // DO NOT CHANGE THESE IF YOU DONT KNOW WHAT YOU ARE DOING.
                    // TODO: AP Runes on AP champs ?
                    1: 5245,
                    2: 5245,
                    3: 5245,
                    4: 5245,
                    5: 5245,
                    6: 5245,
                    7: 5245,
                    8: 5245,
                    9: 5245,
                    10: 5317,
                    11: 5317,
                    12: 5317,
                    13: 5317,
                    14: 5317,
                    15: 5317,
                    16: 5317,
                    17: 5317,
                    18: 5317,
                    19: 5289,
                    20: 5289,
                    21: 5289,
                    22: 5289,
                    23: 5289,
                    24: 5289,
                    25: 5289,
                    26: 5289,
                    27: 5289,
                    28: 5335,
                    29: 5335,
                    30: 5335
                }
            });
        }

        return json;
    }
}

module.exports = Lobby;