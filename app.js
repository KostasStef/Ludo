const express = require("express");
const http = require("http");

const helpers = require('./helpers');
const crypto = require('crypto');

const websocket = require("ws");
const indexRouter = require("./routes/index");

const stats = require('./stats');

const port = process.argv[2];
const app = express();

app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));

app.get("/", indexRouter);
app.get("/rules", indexRouter);
app.get("/play", indexRouter);

const server = http.createServer(app).listen(port);
const wss = new websocket.Server({server});

// declare essential variables
let currentPlayerColor = '';
let gameConnections = [];
let games = [];
let gameNumber = 0;
let gamesAndPlayers = [];       // local array of objects that keeps track of each game
let connectionID = '';          // each websocket receives a unique ID

function playerCounter(arrayOfGames) {
    let number = 0;
    if (arrayOfGames !== []) {
        for (let i = 0; i < arrayOfGames.length; i++) {
            number += arrayOfGames[i].players.length;
        }
    }
    return number;
}

// update game stats
function updateStats() {
    stats.setOngoingGames(games.length !== 0 ? games.filter(g => g.hasStarted === true).length : 0);
    stats.setCurrentlyPlaying(playerCounter(games.length !== 0 ? games.filter(g => g.hasStarted === true) : []));
    stats.setPlayersWaiting(playerCounter(games.length !== 0 ? games.filter(g => g.hasStarted === false) : []));
}

function getNextPlayer(playerHasTurn, numberOfPlayers) {
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
    const nextPlayerVar = getNextPlayer(playerHasTurn, numberOfPlayers);

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
        // console.log("Open game ID: " + gameNumber);
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

    updateStats();
    helpers.broadcastGameState(gameConnections, gameNumber, currGame);

    // ———————————————————— ON MESSAGE FUNCTION ————————————————————
    con.on("message", function incoming(message) {
        const gameId = parseInt(con.id.split(':')[0]);
        const playerId = con.id.split(':')[1];
        const game = games.find(g => g.id === gameId);
        const player = game.players.find(p => p.id === playerId);

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
            // console.log("Player " + gamesAndPlayers.find(g => g.gameId === gameId).hasTurn + " has turn.");

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

            updateStats();
        }

        // ———————————————————— ROLL DICE ————————————————————
        else if (message === "rollDice") {
            // roll the dice
            let numberRolled = randomRoll(1, 6);
            // get the player's color
            const playerColor = currGame.players.find(p => p.id === playerId).color;

            // update dice object
            games.find(g => g.id === gameId).diceRoll = {
                playerColor: playerColor,
                roll: numberRolled,
                state: 'rolled'
            };
            games.find(g=>g.id===gameId).players.find(p => p.id === playerId).score++;

            let pawnPositions = [];
            for (let i = 0; i < player.pawns.length; i++) {
                pawnPositions.push(player.pawns[i].position);
            }

            let pawnIndex;
            let newPosition;
            let pawnSamePlayerSamePosition;
            let cannotMove = false;
            for (let i = 0; i < pawnPositions.length; i++) {
                pawnIndex = player.pawns[i].pawnRoute.findIndex(index => index === player.pawns[i].position);

                if (pawnIndex + numberRolled >= player.pawns[i].pawnRoute.length) {
                    cannotMove = true;
                    continue;
                }
                newPosition = player.pawns[i].pawnRoute[pawnIndex + numberRolled];
                pawnSamePlayerSamePosition = player.pawns.find(p => p.position === newPosition);

                if (pawnSamePlayerSamePosition !== undefined) {
                    cannotMove = true;
                    continue;
                }

                if (numberRolled !== 6 && pawnIndex === 0) {
                    cannotMove = true;
                    continue;
                }

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

            let newPosition = pawn.pawnRoute[pawnIndex + numberRolled];
            let newPawnIndex = pawnIndex + numberRolled;

            let PawnSamePlayerNewPosition = game
                .players.find(p => p.id === playerId)
                .pawns.find(p => p.position === newPosition);
            let PawnDiffPlayerNewPosition = game
                .players.find(p => p.id !== playerId)
                .pawns.find(p => p.position === newPosition);  //.pawns.find(p => p.position === newPosition);

            let PawnAtStartSamePlayer = game
                .players.find(p => p.id === playerId)
                .pawns.find(p => p.position === pawn.pawnRoute[1]);
            let PawnAtStartDiffPlayer = game
                .players.find(p => p.id !== playerId)
                .pawns.find(p => p.position === pawn.pawnRoute[1]);


            if (pawnIndex === 0 && numberRolled === 6) {
                if (PawnAtStartSamePlayer === undefined) {
                    if (PawnAtStartDiffPlayer !== undefined) {
                        // console.log("Pawn [" + pawnId + "] ate Pawn [" + PawnAtStartDiffPlayer.pawns.find(p => p.position === pawn.pawnRoute[1]).id + "] at position: " + pawn.pawnRoute[1] + ".");
                        games.find(g => g.id === gameId)
                            .players.find(p => p.pawns.find(p => p.position === pawn.pawnRoute[1]))
                            .pawns.find(p => p.position === pawn.pawnRoute[1])
                            .position = PawnAtStartDiffPlayer.pawnRoute[0];
                    }

                    games.find(g => g.id === gameId).players.find(p => p.id === playerId)
                        .pawns.find(p => p.id === pawnId)
                        .position = pawn.pawnRoute[1];

                    games.find(g => g.id === gameId).diceRoll.state = 'toRoll';

                }

            } else if (pawnIndex !== 0 && (pawnIndex + numberRolled) < pawn.pawnRoute.length) {
                // if there is a pawn at the new position of the same player, the pawn can't make the move
                if (PawnSamePlayerNewPosition === undefined || PawnSamePlayerNewPosition.position === pawn.pawnRoute[pawn.pawnRoute.length - 1]) {
                    // if there is a pawn at the new position of a different player, that pawn returns to its home position
                    if (PawnDiffPlayerNewPosition !== undefined) {
                        // console.log("Pawn [" + pawnId + "] ate Pawn [" + PawnDiffPlayerNewPosition.id + "] at position: " + newPosition + ".");
                        games.find(g => g.id === gameId)
                            .players.find(player => player.pawns.find(p => p.position === newPosition))
                            .pawns.find(p => p.position === newPosition)
                            .position = PawnDiffPlayerNewPosition.pawnRoute[0];
                    }
                    // move pawn
                    games.find(g => g.id === gameId).players.find(p => p.id === playerId)
                        .pawns.find(p => p.id === pawnId)
                        .position = newPosition;

                    // increment score if a pawn reaches the center
                    if (newPawnIndex === (pawn.pawnRoute.length - 1)) {
                        games.find(g => g.id === gameId)
                            .players.find(p => p.id === playerId)
                            .score++;
                    }

                    let score = games.find(g => g.id === gameId)
                        .players.find(p => p.id === playerId)
                        .score;

                    // if score is 4, then end the game for everyone
                    if (score >= 4) {
                        games.find(item => item.id === gameId).exitCode = '0:' + player.color + '.WON_THE_GAME';
                    }

                    if (numberRolled !== 6) {
                        // change turns
                        changeTurns(gameId, playerId);
                    }

                    games.find(g => g.id === gameId).diceRoll.state = 'toRoll';
                }
            }
        }

        helpers.broadcastGameState(gameConnections, gameId, games.find(g => g.id === gameId));
    });

    con.on("close", function () {
        const gameId = parseInt(con.id.split(':')[0]);
        const playerId = con.id.split(':')[1];
        const game = games.find(item => item.id === gameId);
        const player = game.players.find(p => p.id === playerId);

        if (game) {
            gamesAndPlayers.find(g => g.gameId === gameId).colors.push(games.find(item => item.id === gameId).players.find(p => p.id === playerId).color);
            if (game.players.length === 1) {
                // this is the last player leaving the game
                // remove the whole game object from games
                games.splice(games.findIndex(item => item.id === gameId), 1);
                gamesAndPlayers.splice(gamesAndPlayers.findIndex(item => item.gameId === gameId), 1);
            } else {
                let players = game.players;
                if (players.find(item => item.id === playerId)) {
                    let numberOfPlayers = game.players.length - 1;

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

                    if (wasHost) {
                        games.find(item => item.id === gameId).players[0].isHost = true;
                    }

                    helpers.broadcastGameState(gameConnections, gameId, games.find(item => item.id === gameId));
                }
            }

            updateStats();

        } else {
            console.log('Game Id: ' + gameId + ' not found');
        }

        // console.log("Connection closed.");
    });

});
