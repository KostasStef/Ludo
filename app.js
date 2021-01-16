const express = require("express");
const http = require("http");
const helpers = require('./helpers');
const crypto = require('crypto');

const websocket = require("ws");
const indexRouter = require("./routes/index");

const port = process.argv[2];
const app = express();

let gameStats = {
    games: 0,
    players: 0,
    waitingToPlay: 0
}

app.get('/serverStats', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(gameStats));
});
app.get("/", indexRouter);

app.use(express.static(__dirname + "/public"));
const server = http.createServer(app).listen(port);

const wss = new websocket.Server({server});
let websockets = {}; // property: websocket, value: game

let currentPlayerColor = '';
let gameConnections = [];
let games = [];
let gameNumber = 1;
let gamesAndPlayers = [];

let connectionID = ''; // each websocket receives a unique ID

function nextPlayer(playerHasTurn, numberOfPlayers) {
    if (playerHasTurn < numberOfPlayers) {
        playerHasTurn++;
    } else if (playerHasTurn === numberOfPlayers) {
        playerHasTurn = 1;
    }

    return playerHasTurn;
}

function changeTurns(gameId, playerId) {
    const numberOfPlayers = games.find(g => g.id === gameId).players.length;
    const playerHasTurn = games.find(g => g.id === gameId).players.findIndex(p => p.hasTurn === true) + 1;
    const nextPlayerVar = nextPlayer(playerHasTurn, numberOfPlayers);

    gamesAndPlayers.find(g => g.gameId === gameId).hasTurn = nextPlayerVar;
    games.find(g => g.id === gameId).players.find(p => p.id === playerId).hasTurn = false;

    games.find(g => g.id === gameId).players[nextPlayerVar - 1].hasTurn = true;
}

wss.on("connection", function connection(ws) {
    let con = ws;

    // if there are no games, create one
    if (gamesAndPlayers.length === 0) {
        gamesAndPlayers.push({
            gameId: gameNumber,
            numberOfPlayers: 0,
            hasTurn: null,
            colors: ['r', 'g', 'y', 'b']
        });
    }

    let openGame = games.find(g => g.players.length < 4 && g.hasStarted === false);

    if (openGame) {
        gameNumber = openGame.id;
        console.log("Open game ID: " + gameNumber);
    } else {
        gameNumber++;

        gamesAndPlayers.push({
            gameId: gameNumber,
            numberOfPlayers: 1,
            hasTurn: null,
            colors: ['r', 'g', 'y', 'b']
        });
    }

    currentPlayerColor = gamesAndPlayers.find(g => g.gameId === gameNumber).colors.splice(0, 1)[0];

    let currGame = {};
    let currPlayerId = crypto.randomBytes(16).toString("hex");

    if (games.find(item => item.id === gameNumber)) {
        // game already exists
        currGame = games.find(item => item.id === gameNumber);
        currGame.players.push({
            id: currPlayerId,
            isHost: false,
            color: currentPlayerColor,
            score: 0,
            hasTurn: false,
            pawns: helpers.buildPlayersArray(currentPlayerColor)
        });
    } else {
        // this is a new game
        currGame.id = gameNumber;
        currGame.hasStarted = false;
        currGame.exitCode = null;
        currGame.diceRoll = {};
        currGame.players = [];
        currGame.players.push({
            id: currPlayerId,
            isHost: true,
            color: currentPlayerColor,
            score: 0,
            hasTurn: false,
            pawns: helpers.buildPlayersArray(currentPlayerColor)
        });
        games.push(currGame);
    }

    connectionID = gameNumber + ':' + currPlayerId;
    con.id = connectionID;

    let currGameConnections = gameConnections.find(item => item.gameId === gameNumber);

    if (typeof currGameConnections !== 'undefined') {
        currGameConnections.connections.push(con);
        let currGameConnectionIndex = gameConnections.findIndex(item => item.gameId === gameNumber);
        gameConnections[currGameConnectionIndex].connections = currGameConnections.connections;

    } else {
        let connections = [];
        connections.push(con);
        gameConnections.push({
            gameId: gameNumber,
            connections: connections
        });
    }

    helpers.broadcastGameState(gameConnections, gameNumber, currGame);

    // ———————————————————— ON MESSAGE FUNCTION ————————————————————
    con.on("message", function incoming(message) {
        const gameId = parseInt(con.id.split(':')[0]);
        const playerId = con.id.split(':')[1];
        const game = games.find(g => g.id === gameId);
        let player = game.players.find(p => p.id === playerId);

        let randomRoll = (min = 1, max = 6) => {
            return Math.round(Math.random() * (max - min) + min);
        }

        // ———————————————————— START GAME ————————————————————
        if (message === "startGame") {
            if (game.players.length < 2)
                return;

            game.hasStarted = true;

            let randomPlayer = game.players[randomRoll(0, game.players.length - 1)];

            // start the game
            games.find(g => g.id === gameId).hasStarted = true;

            // choose a random player to play first
            games.find(g => g.id === gameId).players.find(p => p === randomPlayer).hasTurn = true;

            gamesAndPlayers.find(g => g.gameId === gameId).hasTurn = game.players.findIndex(p => p.hasTurn === true) + 1;
            console.log("Player " + gamesAndPlayers.find(g => g.gameId === gameId).hasTurn + " has turn.");

            games.find(g => g.id === gameId).diceRoll.state = 'toRoll';

            // create a new game if there's no other open game
            let newestGame = (gamesAndPlayers.length - 1) === gamesAndPlayers.findIndex(g => g.gameId === gameId);

            if (newestGame) {
                gameNumber++;
                gamesAndPlayers.push({
                    gameId: gameNumber,
                    numberOfPlayers: 0,
                    hasTurn: null,
                    colors: ['r', 'g', 'y', 'b']
                });
            }
        }

        // ———————————————————— ROLL DICE ————————————————————
        else if (message === "rollDice") {

            // roll the dice
            // let numberRolled = randomRoll(1, 6);
            // let numberRolled = randomRoll(5, 6);
            let numberRolled = 6;

            console.log(numberRolled);

            // get the player's color
            const playerColor = currGame.players.find(p => p.id === playerId).color;

            // update dice object
            games.find(g => g.id === gameId).diceRoll = {
                playerColor: playerColor,
                roll: numberRolled,
                state: 'rolled'
            };

            let pawnPositions = [];
            for (let i = 0; i < player.pawns.length; i++) {
                pawnPositions.push(player.pawns[i].position);
            }
            console.log("Pawn positions " + pawnPositions);

            let allPawnsInHome = true;
            // check if all pawns are in the home positions
            for (let i = 0; i < pawnPositions.length; i++) {
                if (pawnPositions[i] !== player.pawns[i].pawnRoute[0]) {
                    allPawnsInHome = false;
                }
            }

            console.log("All pawns in home position = " + allPawnsInHome);

            // if all pawns are in the home positions, then change turns
            if (allPawnsInHome && numberRolled !== 6) {
                // change turns
                changeTurns(gameId, playerId);
                games.find(g => g.id === gameId).diceRoll.state = 'toRoll';
            }
        }

        // ———————————————————— MOVE PAWN ————————————————————
        else if (message.includes("movedPawn")) {
            let numberRolled = game.diceRoll.roll;

            let pawnId = message.substring(10);
            let pawn = player.pawns.find(p => p.id === pawnId);
            let position = pawn.position;
            let pawnIndex = pawn.pawnRoute.findIndex(index => index === position);

            if (pawnIndex === 0 && numberRolled === 6) {
                games.find(g => g.id === gameId).players.find(p => p.id === playerId)
                    .pawns.find(p => p.id === pawnId)
                    .position = pawn.pawnRoute[1];

                games.find(g => g.id === gameId).diceRoll.state = 'toRoll';

            } else if (pawnIndex !== 0 && (pawnIndex + numberRolled) < pawn.pawnRoute.length) {
                games.find(g => g.id === gameId).players.find(p => p.id === playerId)
                    .pawns.find(p => p.id === pawnId)
                    .position = pawn.pawnRoute[pawnIndex + numberRolled];

                // change turns
                changeTurns(gameId, playerId);

                games.find(g => g.id === gameId).diceRoll.state = 'toRoll';

            }
        }

        helpers.broadcastGameState(gameConnections, gameId, games.find(g => g.id === gameId));
    });

    con.on("close", function (code) {
        const gameId = parseInt(con.id.split(':')[0]);
        const playerId = con.id.split(':')[1];
        const game = games.find(item => item.id === gameId);
        const player = game.players.find(p => p.id === playerId);

        if (game) {
            // playerColors.push(games.find(item => item.id === gameId).players.find(p => p.id === playerId).color);
            gamesAndPlayers.find(g => g.gameId === gameId).colors.push(games.find(item => item.id === gameId).players.find(p => p.id === playerId).color);
            if (game.players.length === 1) {
                // this is the last player leaving the game
                // remove the whole game object from games
                games.splice(games.findIndex(item => item.id === gameId), 1);
                gamesAndPlayers.splice(gamesAndPlayers.findIndex(item => item.gameId === gameId), 1);
            } else {
                let players = game.players;
                if (players.find(item => item.id === playerId)) {

                    // gamesAndPlayers.find(g => g.gameId === gameId).numberOfPlayers -= 1;
                    // let numberOfPlayers = gamesAndPlayers.find(g => g.gameId === gameId).numberOfPlayers;
                    let numberOfPlayers = game.players.length - 1;

                    console.log('Number of players: ' + numberOfPlayers);
                    if (game.hasStarted && numberOfPlayers > 1) {
                        if (player.hasTurn) {
                            changeTurns(gameId, playerId);
                            games.find(g => g.id === gameId).diceRoll.state = 'toRoll';
                        }
                    } else if (game.hasStarted) {
                        games.find(item => item.id === gameId).exitCode = '1:ERR_NOT_ENOUGH_PLAYERS';
                    }

                    let wasHost = players.find(item => item.id === playerId).isHost;
                    games.find(item => item.id === gameId).players.splice(players.findIndex(item => item.id === playerId), 1);
                    gamesAndPlayers.find(g => g.gameId === gameId).numberOfPlayers--;
                    console.log('Number of players: ' + numberOfPlayers);

                    if (wasHost) {
                        games.find(item => item.id === gameId).players[0].isHost = true;
                    }

                    helpers.broadcastGameState(gameConnections, gameId, games.find(item => item.id === gameId));
                }
            }
        } else {
            console.log('Game Id: ' + gameId + ' not found');
        }

        console.log("Connection closed.");
    });

});
