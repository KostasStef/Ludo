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
const {round} = require("lodash");


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
let currentGamePlayer = 0;
let gamesAndPlayers = [];

let connectionID = ''; //each websocket receives a unique ID

// function setPawnsition(pawnID, diceRoll) {
//     let pawn = document.getElementById(pawnID);
//     let pawnNumber = pawn.getAttribute("pawnNumber");
//
//     let redRoute = ["rh" + pawnNumber, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
//         22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
//         50, 51, "r1", "r2", "r3", "r4", "r5", "rc1"];
//
//     let greenRoute = ["gh" + pawnNumber, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
//         32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
//         11, 12, "g1", "g2", "g3", "g4", "g5", "gc1"];
//
//     let yellowRoute = ["yh" + pawnNumber, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46,
//         47, 48, 49, 50, 51, 52, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
//         24, 25, "y1", "y2", "y3", "y4", "y5", "yc1"];
//
//     let blueRoute = ["bh" + pawnNumber, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
//         11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
//         37, 38, "b1", "b2", "b3", "b4", "b5", "bc1"];
//
//     let route = [];
//
//     if (connectionID === 1) route = redRoute;
//     else if (connectionID === 2) route = greenRoute;
//     else if (connectionID === 3) route = yellowRoute;
//     else if (connectionID === 4) route = blueRoute;
//
//     console.log(route.toString());
//
//     let pawnCurrentPositionIndex = route.indexOf(pawn.getAttribute("pawnsition"));
//     if (pawnCurrentPositionIndex < 0)
//         pawnCurrentPositionIndex = route.indexOf(parseInt(pawn.getAttribute("pawnsition")));
//     console.log("pawn index: " + pawnCurrentPositionIndex);
//     let pawnCurrentPosition = route[pawnCurrentPositionIndex];
//     console.log("pawn position: " + pawnCurrentPosition);
//
//     let pawnNextPosition = document.getElementById(route[pawnCurrentPositionIndex + diceRoll]);
//     console.log("pawn next position: " + pawnNextPosition.getAttribute("id"));
//     pawnNextPosition.appendChild(pawn);
//     pawn.setAttribute("pawnsition", pawnNextPosition.getAttribute("id"));
//     console.log("pawn position : " + pawn.getAttribute("pawnsition"));
// }

wss.on("connection", function connection(ws) {
    let con = ws;

    currentGamePlayer++;
    if (gamesAndPlayers.length === 0) {
        gamesAndPlayers.push({
            gameId: gameNumber,
            numberOfPlayers: 0
        });
    }

    let currNumberOfPlayers = gamesAndPlayers[gamesAndPlayers.length - 1].numberOfPlayers++;

    if (currNumberOfPlayers === 4) {
        currentGamePlayer = 1;
        gameNumber++;

        gamesAndPlayers.push({
            gameId: gameNumber,
            numberOfPlayers: 1
        });

        playerColors = ['r', 'g', 'y', 'b'];
    }

    currentPlayerColor = playerColors.splice(0, 1)[0];

    console.log('++++', playerColors);

    let currGame = {};
    let currPlayerId = v4();

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

        // ———————————————————— START GAME ————————————————————
        if (message === "startGame") {
            if (game.players.length < 2)
                return;

            game.hasStarted = true;

            var randomPlayer = currGame.players[randomRoll(0, currGame.players.length-1)];
            currGame.hasStarted = true;
            randomPlayer.hasTurn = true;
        }
    });

            // games.find(g => g.id === gameId).find(p => p.id === playerId).hasTurn = true;

        }

        // ———————————————————— ROLL DICE ————————————————————
        else if (message === "rollDice") {
            let randomRoll = (min = 1, max = 6) => {
                return Math.round(Math.random() * (max - min) + min);
            }
            numberRolled = randomRoll(1, 6);
            // console.log("number rolled: " + currGame.diceRoll + "!");

            const gameId = parseInt(con.id.split(':')[0]);
            const playerId = con.id.split(':')[1];
            const playerColor = currGame.players.find(p => p.id === playerId).color;
            let roll = {
                header: "diceRolled",
                player: playerColor + " has rolled: " + numberRolled + "!",
                playerColor: playerColor,
                roll: numberRolled
            };

            currGame.diceRoll = roll;

            // let player = currGame.players.find(p => p.id === playerId);
            // console.log(player.pawns);
            // pawns[0]. pawns[1], pawns[2], pawns[3].

            helpers.broadcastGameState(gameConnections, gameId, currGame);

        }

    });

    con.on("message", function incoming(message) {
        if (message.includes("movedPawn")) {
            var playerId = con.id.split(':')[1];
            var player = currGame.players.find(p => p.id === playerId);
            var playerColor = player.color;
            var rolledDice = currGame.diceRoll.roll;
            // console.log("movedpawn");

            if(message.includes(playerColor)) {
                var thisPawnId = message.substring(10);
                let thisPawn = player.pawns.find(p => p.id === thisPawnId);
                let pawnSition = thisPawn.position;
                let pawnIndex = thisPawn.pawnRoute.findIndex(index => index === pawnSition);

                if((pawnIndex + rolledDice)<thisPawn.pawnRoute.length) {

                    var newPawnSition = thisPawn.pawnRoute[pawnIndex + rolledDice];
                    // console.log(newPawnSition);
                    player.pawns.find(p => p.id === thisPawnId).position = newPawnSition;

                }
                // console.log(player.pawns.find(p => p.id === thisPawnId).position);
            }
        }
        // ———————————————————— BROADCAST GAME-STATE  ————————————————————
        helpers.broadcastGameState(gameConnections, gameId, game);
        gameNumber++;
        gamesAndPlayers.push({
            gameId: gameNumber,
            currNumberOfPlayers: 0
        });
        playerColors = ['r', 'g', 'y', 'b'];
    });

    con.on("close", function (code) {
        const gameId = parseInt(con.id.split(':')[0]);
        const playerId = con.id.split(':')[1];

        if (games.find(item => item.id === gameId)) {
            playerColors.push(games.find(item => item.id === gameId).players.find(p => p.id === playerId).color);
            if (games.find(item => item.id === gameId).players.length === 1) {
                // this is the last player leaving the game
                // remove the whole game object from games
                games.splice(games.findIndex(item => item.id === gameId), 1);
                gamesAndPlayers.splice(gamesAndPlayers.findIndex(item => item.gameId === gameId), 1);
            } else {
                let players = games.find(item => item.id === gameId).players;
                if (players.find(item => item.id === playerId)) {
                    let wasHost = players.find(item => item.id === playerId).isHost;
                    games.find(item => item.id === gameId).players.splice(players.findIndex(item => item.id === playerId), 1);

                    if (wasHost) {
                        games.find(item => item.id === gameId).players[0].isHost = true;
                    }


                    helpers.broadcastGameState(gameConnections, gameId, currGame);
                }

                gamesAndPlayers.find(g => g.gameId === gameId).numberOfPlayers--;
            }
        } else {
            console.log('Game Id: ' + gameId + ' not found');
        }

        currentGamePlayer--;

        console.log("Connection closed.");
    })
})
