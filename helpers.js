const config = require('./config');

module.exports = {
    buildPlayersArray: function (currentGamePlayer) {
        return [
            {
                id: config.playerColors[currentGamePlayer] + '1',
                position: config.playerColors[currentGamePlayer] + 'h1'
            },
            {
                id: config.playerColors[currentGamePlayer] + '2',
                position: config.playerColors[currentGamePlayer] + 'h2'
            },
            {
                id: config.playerColors[currentGamePlayer] + '3',
                position: config.playerColors[currentGamePlayer] + 'h3'
            },
            {
                id: config.playerColors[currentGamePlayer] + '4',
                position: config.playerColors[currentGamePlayer] + 'h4'
            },
        ];
    },

    broadcastGameState: function (gameConnections, gameNumber, currGame) {
        if (gameConnections.find(item => item.gameId === gameNumber)) {
            let currGameConnections = gameConnections.find(item => item.gameId === gameNumber);
            for (let i = 0; i < currGameConnections.connections.length; i++) {
                currGameConnections.connections[i].send(JSON.stringify(currGame));
            }
        }
    }
}
