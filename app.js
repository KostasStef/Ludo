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
            let numberRolled = randomRoll(1, 6);
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

            let pawnIndex;
            let newPawnsition;
            let isThereAnotherPawnSamePlayerSamePosition;
            let cannotMove = false;
            for(let i = 0; i < pawnPositions.length; i++) {
                pawnIndex = player.pawns[i].pawnRoute.findIndex(index => index === player.pawns[i].position);
                
                if(pawnIndex + numberRolled >= player.pawns[i].pawnRoute.length){
                    cannotMove = true;
                    continue;
                }
                newPawnsition = player.pawns[i].pawnRoute[pawnIndex + numberRolled];
                isThereAnotherPawnSamePlayerSamePosition = games.find(g => g.id === gameId).players.find(p => p.id === playerId).pawns.find(p => p.position === newPawnsition);
                
                if(isThereAnotherPawnSamePlayerSamePosition !== undefined){
                    cannotMove = true;
                    continue;
                }
                
                if(numberRolled !== 6 && pawnIndex === 0){
                    cannotMove = true;
                    continue;
                }
                console.log(player.pawns[i]);
                cannotMove = false;
                break;
            }

            // if all pawns are in the home positions, then change turns
            if (cannotMove) {
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
            let newPawnsition = pawn.pawnRoute[pawnIndex + numberRolled];
            let isThereAnotherPawnSamePlayerSamePosition = games.find(g => g.id === gameId).players.find(p => p.id === playerId).pawns.find(p => p.position === newPawnsition);
            let isThereAnotherPawnSamePosition = games.find(g => g.id === gameId).players.find(player => player.pawns.find(p => p.position === newPawnsition));//.pawns.find(p => p.position === newPawnsition);
            let isThereAnotherPawnAtStartSamePlayer = games.find(g => g.id === gameId).players.find(p => p.id === playerId).pawns.find(p => p.position === pawn.pawnRoute[1]);
            let isThereAnotherPawnAtStart = games.find(g => g.id === gameId).players.find(player => player.pawns.find(p => p.position === pawn.pawnRoute[1]))//.pawns.find(p => p.position === pawn.pawnRoute[1]);
            

            if (pawnIndex === 0 && numberRolled === 6) {
                if (isThereAnotherPawnAtStartSamePlayer === undefined) {
                    games.find(g => g.id === gameId).players.find(p => p.id === playerId)
                        .pawns.find(p => p.id === pawnId)
                        .position = pawn.pawnRoute[1];
                    if (isThereAnotherPawnAtStart !== undefined) {
                        console.log("Pawn [" + pawnId + "] ate Pawn [" + isThereAnotherPawnAtStart.pawns.find(p => p.position === pawn.pawnRoute[1]).pawnId + "] at position: " + pawn.pawnRoute[1] + ".");
                        games.find(g => g.id === gameId)
                            .players.find(player => player.pawns
                            .find(p => p.position === pawn.pawnRoute[1])).pawns
                            .find(p => p.position === pawn.pawnRoute[1]).position = isThereAnotherPawnAtStart.pawns.find(p => p.position === pawn.pawnRoute[1]).pawnRoute[0];
                    }
                    
                }

                games.find(g => g.id === gameId).diceRoll.state = 'toRoll';

            } else if (pawnIndex !== 0 && (pawnIndex + numberRolled) < pawn.pawnRoute.length) {
                if (isThereAnotherPawnSamePlayerSamePosition === undefined) {
                    games.find(g => g.id === gameId).players.find(p => p.id === playerId)
                        .pawns.find(p => p.id === pawnId)
                        .position = newPawnsition;
                    if (isThereAnotherPawnSamePosition !== undefined) {
                        console.log("Pawn [" + pawnId + "] ate Pawn [" + isThereAnotherPawnSamePosition.pawns.find(p => p.position === newPawnsition).pawnId + "] at position: " + newPawnsition + ".");
                        games.find(g => g.id === gameId).players
                            .find(player => player.pawns
                                .find(p => p.position === newPawnsition)).position = isThereAnotherPawnSamePosition.pawns.find(p => p.position === newPawnsition).pawnRoute[0];
                    }
                    // change turns
                    changeTurns(gameId, playerId);

                    games.find(g => g.id === gameId).diceRoll.state = 'toRoll';
                }
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
