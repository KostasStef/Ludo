const express = require("express");
const http = require("http");
const config = require('./config');
const helpers = require('./helpers');
const {v4} = require('uuid'); //TA

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

let playerColors = ['r', 'g', 'y', 'b']
let currentPlayerColor = '';
let gameConnections = [];
let games = [];
let gameNumber = 1;
let currentGamePlayer = 0;
let connectionID = ''; //each websocket receives a unique ID

function setPawnsition(pawnID, diceRoll) {
    let pawn = document.getElementById(pawnID);
    let pawnNumber = pawn.getAttribute("pawnNumber");

    let redRoute = ["rh" + pawnNumber, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
        22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
        50, 51, "r1", "r2", "r3", "r4", "r5", "rc1"];

    let greenRoute = ["gh" + pawnNumber, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
        32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
        11, 12, "g1", "g2", "g3", "g4", "g5", "gc1"];

    let yellowRoute = ["yh" + pawnNumber, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46,
        47, 48, 49, 50, 51, 52, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
        24, 25, "y1", "y2", "y3", "y4", "y5", "yc1"];

    let blueRoute = ["bh" + pawnNumber, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
        11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
        37, 38, "b1", "b2", "b3", "b4", "b5", "bc1"];

    let route = [];

    if (connectionID === 1) route = redRoute;
    else if (connectionID === 2) route = greenRoute;
    else if (connectionID === 3) route = yellowRoute;
    else if (connectionID === 4) route = blueRoute;

    console.log(route.toString());

    let pawnCurrentPositionIndex = route.indexOf(pawn.getAttribute("pawnsition"));
    if (pawnCurrentPositionIndex < 0)
        pawnCurrentPositionIndex = route.indexOf(parseInt(pawn.getAttribute("pawnsition")));
    console.log("pawn index: " + pawnCurrentPositionIndex);
    let pawnCurrentPosition = route[pawnCurrentPositionIndex];
    console.log("pawn position: " + pawnCurrentPosition);

    let pawnNextPosition = document.getElementById(route[pawnCurrentPositionIndex + diceRoll]);
    console.log("pawn next position: " + pawnNextPosition.getAttribute("id"));
    pawnNextPosition.appendChild(pawn);
    //document.getElementById(pawnCurrentPosition).removeChild(pawn);
    pawn.setAttribute("pawnsition", pawnNextPosition.getAttribute("id"));
    console.log("pawn position : " + pawn.getAttribute("pawnsition"));
}

wss.on("connection", function connection(ws) {
    let con = ws;

    currentGamePlayer++;
    currentPlayerColor = playerColors.splice(0,1)[0]

    console.log('++++', playerColors);

    if (currentGamePlayer > 4) {
        currentGamePlayer = 1;
        playerColors = ['r', 'g', 'y', 'b']

        gameNumber++;
    }

    let currGame = {};
    let currPlayerId = v4();

    if (games.find(item => item.id === gameNumber)) {
        // game already exists
        currGame = games.find(item => item.id === gameNumber);
        currGame.players.push({
            id: currPlayerId,
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
        currGame.players = [];
        currGame.players.push({
            id: currPlayerId,
            color: currentPlayerColor,
            score: 0,
            hasTurn: true,
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
        })
    }

    helpers.broadcastGameState(gameConnections, gameNumber, currGame);

    con.on("message", function incoming(message) {
        console.log(message);
        // con.send("Hello from the server!");
    });

    // fs.writeFile("./public/server.txt", JSON.stringify(roll), 'utf8', (err) => {
    //     if (err)
    //         console.log('Error writing to file: ${err}');
    //     else 
    //         console.log('Written successfully to file');
    // });

    con.on("message", function incoming(message) {
        console.log(con.id);
        if (message === "rollDice") {
            let randomRoll = (min = 1, max = 6) => {
                let roll = Math.random() * (max - min) + min;

                return Math.round(roll);
            }
            var diceRoll = randomRoll(1, 6);
            console.log("number rolled: " + diceRoll + "!");
            let roll = {
                header: "diceRolled",
                roll: diceRoll
            };


            con.send(JSON.stringify(roll));
        }

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
            } else {
                let players = games.find(item => item.id === gameId).players;
                if (players.find(item => item.id === playerId)) {
                    games.find(item => item.id === gameId).players.splice(players.findIndex(item => item.id === playerId), 1);
                    helpers.broadcastGameState(gameConnections, gameNumber, currGame);
                }
            }
        } else {
            console.log('Game Id: ' + gameId + ' not found');
        }
        currentGamePlayer--;

        console.log("Connection closed.");
    })
})
