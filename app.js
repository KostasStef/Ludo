const express = require("express");
const http = require("http");

const websocket = require("ws");

const fs = require("fs");

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

    // con.send(JSON.stringify({
    //     id: 0,
    //     players: [
    //         {
    //             id: 0,
    //             pawns: [0, 1, 2, 3]
    //         },
    //         {
    //             id: 1,
    //             pawns: [0, 1, 2, 3]
    //         },
    //         {
    //             id: 2,
    //             pawns: [0, 1, 2, 3]
    //         },
    //         {
    //             id: 3,
    //             pawns: [0, 1, 2, 3]
    //         }
    //     ]
    // }));

    con.send(JSON.stringify(
        {
            numberOfPlayers: connectionID
        }
    ));

    console.log(
        "Connected %s",
        con.id
    );

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
        console.log("Connection closed.");
        connectionID--;
    })
})
