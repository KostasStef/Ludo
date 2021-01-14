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

            let randomRoll = (min = 1, max = 6) => {
                return Math.round(Math.random() * (max - min) + min);
            }
            var randomPlayer = currGame.players[randomRoll(0, currGame.players.length-1)];
            currGame.hasStarted = true;
            randomPlayer.hasTurn = true;

            helpers.broadcastGameState(gameConnections, gameId, game);
            gameNumber++;
            gamesAndPlayers.push({
                gameId: gameNumber,
                currNumberOfPlayers: 0
            });
            playerColors = ['r', 'g', 'y', 'b'];
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
        let gameId = con.id.split(':')[0];

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

        console.log('qwadsawdsds');

        helpers.broadcastGameState(gameConnections, gameId, currGame);


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
    });

});
