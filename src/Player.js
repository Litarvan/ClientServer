let nextID = 0;

class Player
{
    constructor(ws)
    {
        this.connection = ws;
        this.id = nextID++;
        this.nickname = '';
        this.selectedChampion = 'Ezreal';
        this.inLobby = -1;
        this.serverGameLogStopwatch = Date.now();
        this.keyType = '';
        this.loggedIn = false;
    }

    getRank()
    {
        let rank = 'USER';
        switch (this.keyType)
        {
            case 'vip1':
            case 'vip2':
                rank = 'DONATOR';
            case 'dev':
                rank = 'STAFF';
        }

        return rank;
    }
}

module.exports = Player;