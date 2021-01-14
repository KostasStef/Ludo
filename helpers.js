const config = require('./config');

module.exports = {
    buildPlayersArray: function (playerColor) {
        return [
            {
                id: playerColor + 'p1',
                position: playerColor + 'h1',
                pawnRoute: config.positions(playerColor, 1)
            },
            {
                id: playerColor + 'p2',
                position: playerColor + 'h2',
                pawnRoute: config.positions(playerColor, 2)
            },
            {
                id: playerColor + 'p3',
                position: playerColor + 'h3',
                pawnRoute: config.positions(playerColor, 3)
            },
            {
                id: playerColor + 'p4',
                position: playerColor + 'h4',
                pawnRoute: config.positions(playerColor, 4)
            },
        ];
    },

    broadcastGameState: function (gameConnections, gameNumber, currGame) {
        // console.log("currGame" + JSON.stringify(currGame, null, 2));
        // console.log("GameId: " + currGame.id + ", Players = " + JSON.stringify(currGame.players, null, 2));
        if (gameConnections.find(item => item.gameId === gameNumber)) {
            let currGameConnections = gameConnections.find(item => item.gameId === gameNumber);
            for (let i = 0; i < currGameConnections.connections.length; i++) {
                // console.log("Connections[i] = " + currGameConnections.connections[i]);
                currGameConnections.connections[i].send(JSON.stringify(currGame));
            }
        }
    }
}
