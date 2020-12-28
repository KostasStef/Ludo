const express = require("express");
const http = require("http");

const websocket = require("ws");

const port = process.argv[2];
const app = express();

const indexRouter = require("./routes/index");
app.get("/", indexRouter);

app.use(express.static(__dirname + "/public"));
const server = http.createServer(app).listen(port);

const wss = new websocket.Server({ server });
let websockets = {}; //property: websocket, value: game

let connectionID = 0; //each websocket receives a unique ID

wss.on("connection", function connection(ws) {
    let con = ws;
    con.id = connectionID++;

    con.send(JSON.stringify({
        id: 0,
        players: [
            {
                id: 0,
                pawns: [0, 0, 0, 0]
            },
            {
                id: 1,
                pawns: [0, 0, 0, 0]
            },
            {
                id: 2,
                pawns: [0, 0, 0, 0]
            },
            {
                id: 3,
                pawns: [0, 0, 0, 0]
            }
        ]
    }));

    console.log(
        "Connected %s",
        con.id
    );

    con.on("message", function incoming(message) {
        console.log(message);
        // con.send("Hello from the server!");
    });

    con.on("close", function (code) {
        console.log("Connection closed.");
        connectionID--;
    })
})
