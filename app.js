const express = require("express");
const http = require("http");
const config = require('./config');
const helpers = require('./helpers');
const {v4} = require('uuid'); // TA

const websocket = require("ws");

const fs = require("fs");

const port = process.argv[2];
const app = express();

const indexRouter = require("./routes/index");

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
let websockets = {}; //property: websocket, value: game

let playerColors = ['r', 'g', 'y', 'b'];
let currentPlayerColor = '';
let gameConnections = [];
let games = [];
let gameNumber = 1;
let gamesAndPlayers = [];

let connectionID = ''; //each websocket receives a unique ID

let id = 0;

function nextPlayer(playerHasTurn, numberOfPlayers) {
    console.log("Player " + playerHasTurn + " has turn.");

    if (playerHasTurn < numberOfPlayers) {
        playerHasTurn++;
    } else if (playerHasTurn === numberOfPlayers) {
        playerHasTurn = 1;
    }

    console.log("Player " + playerHasTurn + " has now turn.");

    return playerHasTurn;
}

function changeTurns(gameId, playerId) {
    let numberOfPlayers = gamesAndPlayers.find(g => g.gameId === gameId).numberOfPlayers;
    let playerHasTurn = gamesAndPlayers.find(g => g.gameId === gameId).hasTurn;

    let nextPlayerVar = nextPlayer(playerHasTurn, numberOfPlayers);
    gamesAndPlayers.find(g => g.gameId === gameId).hasTurn = nextPlayerVar;
    games.find(g => g.id === gameId).players.find(p => p.id === playerId).hasTurn = false;
    games.find(g => g.id === gameId).players[nextPlayerVar - 1].hasTurn = true;
}

wss.on("connection", function connection(ws) {
    let con = ws;

    if (gamesAndPlayers.length === 0) {
        gamesAndPlayers.push({
            gameId: gameNumber,
            numberOfPlayers: 0,
            hasTurn: null
        });
    }

    let currNumberOfPlayers = gamesAndPlayers[gamesAndPlayers.length - 1].numberOfPlayers++;

    if (currNumberOfPlayers === 4) {
        gameNumber++;

        gamesAndPlayers.push({
            gameId: gameNumber,
            numberOfPlayers: 1,
            hasTurn: null
        });

        playerColors = ['r', 'g', 'y', 'b'];
    }

    currentPlayerColor = playerColors.splice(0, 1)[0];

    console.log('++++', playerColors);

    let currGame = {};
    let currPlayerId = v4();
    // let currPlayerId = id++;

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
        // console.log('Existing Game:\n', JSON.stringify(games, null, 2));
    } else {
        // this is a new game
        currGame.id = gameNumber;
        currGame.hasStarted = false;
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
        // console.log('games:', JSON.stringify(games, null, 2));
    }

    connectionID = gameNumber + ':' + currPlayerId;
    con.id = connectionID;

    let currGameConnections = gameConnections.find(item => item.gameId === gameNumber);

    if (typeof currGameConnections !== 'undefined') {
        currGameConnections.connections.push(con)
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

    con.on("message", function incoming(message) {
        console.log(message);
        // con.send("Hello from the server!");
    });

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

            // ———————————————————— TEMP CODE
            // it's a random player's turn
            games.find(g => g.id === gameId).players.find(p => p === randomPlayer).hasTurn = true;
            // ————————————————————

            gamesAndPlayers.find(g => g.gameId === gameId).hasTurn = game.players.findIndex(p => p.hasTurn === true) + 1;
            console.log("Player " + gamesAndPlayers.find(g => g.gameId === gameId).hasTurn + " has turn.");


            // create a new game because the previous one just started
            gameNumber++;
            gamesAndPlayers.push({
                gameId: gameNumber,
                currNumberOfPlayers: 0,
                hasTurn: null
            });
            playerColors = ['r', 'g', 'y', 'b'];
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
                roll: numberRolled
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

            }
            // else if (allPawnsInHome && numberRolled === 6) {
            //   // to be implemented
            // }
        }

        // ———————————————————— MOVE PAWN ————————————————————
        else if (message.includes("movedPawn")) {
            let numberRolled = game.diceRoll.roll;

            let pawnId = message.substring(10);
            let pawn = player.pawns.find(p => p.id === pawnId);
            let position = pawn.position;
            let pawnIndex = pawn.pawnRoute.findIndex(index => index === position);
            let newPawnsitionToBe;

            if (pawnIndex === 0 && numberRolled === 6) {
                games.find(g => g.id === gameId).players.find(p => p.id === playerId)
                    .pawns.find(p => p.id === pawnId)
                    .position = pawn.pawnRoute[1];

                
                // set hasTurn to true to make the Roll Dice button reappear
                // games.find(g => g.id === gameId).players.find(p => p.id === playerId).hasTurn = true;

            } else if (pawnIndex !== 0 && (pawnIndex + numberRolled) < pawn.pawnRoute.length) {
                newPawnsitionToBe = games.find(g => g.id === gameId).players.find(p => p.id === playerId)
                    .pawns.find(p => p.id === pawnId)
                    .position;

                // var isThereAnotherPawnSamePlayerSamePosition = games.find(g => g.id === gameId).players.find(p => p.id === playerId).pawns.find(p => p.position === pawn.pawnRoute[pawnIndex + numberRolled]);
                // var isThereAnotherPawnSamePosition = games.find(g => g.id === gameId).players.forEach(player => player.pawns.find(p => p.position === pawn.pawnRoute[pawnIndex + numberRolled]));
                
                // if(isThereAnotherPawnSamePlayerSamePosition === null) {
                    
                // }

                games.find(g => g.id === gameId).players.find(p => p.id === playerId)
                    .pawns.find(p => p.id === pawnId)
                    .position = pawn.pawnRoute[pawnIndex + numberRolled];

                // change turns
                changeTurns(gameId, playerId);

            }

            console.log("Moved pawn: " + message.substring(10));
        }

        helpers.broadcastGameState(gameConnections, gameId, games.find(g => g.id === gameId));
    });

    con.on("close", function (code) {
        const gameId = parseInt(con.id.split(':')[0]);
        const playerId = con.id.split(':')[1];
        const game = games.find(item => item.id === gameId);

        if (game) {
            playerColors.push(games.find(item => item.id === gameId).players.find(p => p.id === playerId).color);
            if (game.players.length === 1) {
                // this is the last player leaving the game
                // remove the whole game object from games
                games.splice(games.findIndex(item => item.id === gameId), 1);
                gamesAndPlayers.splice(gamesAndPlayers.findIndex(item => item.gameId === gameId), 1);
            } else {
                let players = game.players;
                if (players.find(item => item.id === playerId)) {
                    let wasHost = players.find(item => item.id === playerId).isHost;
                    games.find(item => item.id === gameId).players.splice(players.findIndex(item => item.id === playerId), 1);

                    if (wasHost) {
                        games.find(item => item.id === gameId).players[0].isHost = true;
                    }

                    helpers.broadcastGameState(gameConnections, gameId, games.find(item => item.id === gameId));
                }

                gamesAndPlayers.find(g => g.gameId === gameId).numberOfPlayers--;
            }
        } else {
            console.log('Game Id: ' + gameId + ' not found');
        }

        console.log("Connection closed.");
    });

});