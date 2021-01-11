let soc = null;
let connectionID = null;
// export * from "./dice.js";
// import * as dice from "./dice";

// import('./dice.js').then(module => {module.diceRoll();});
// let importaki = import('./dice.js')
// .then(module => {
//     module.gameDiceModule.rollTheDice();
//     diceRoll = module.gameDiceModule.getNumberRolled();
    
//     console.log(diceRoll);
//     return module.gameDiceModule;
// });

function startGame() {
    console.log("Start game.");

    const socket = new WebSocket("ws://localhost:3000");

    socket.onopen = function(){
        socket.send("Hello from the client!");
        console.log("Connection opened");
        console.log(socket);
    };

    soc = socket;

    socket.onmessage = function(e) {
        var messageJSON = JSON.parse(e.data);
        console.log(messageJSON);
        connectionID = messageJSON.numberOfPlayers;
        spawnPawns(connectionID);
    }

    document.getElementById("startGameOverlay").style.visibility = "hidden";
    document.getElementById("gameScreen").style.visibility = "visible";
}

function endGame() {
    console.log("Leave game.");

    soc.close();

    document.getElementById("startGameOverlay").style.visibility = "visible";
    document.getElementById("gameScreen").style.visibility = "hidden";
}

function rollTheDice() {
    soc.send("rollDice");

    var millisecondsToWait = 1000;
    setTimeout(function() {
        // Whatever you want to do after the wait
    }, millisecondsToWait);
    
    soc.onmessage = function(e) {
        console.log("fuck");
        console.log(JSON.parse(e.data).header);
        if (JSON.parse(e.data).header === "diceRolled") {
            var msg = JSON.parse(e.data);
            console.log("Dice rolled " + msg.roll + "!");
            setPawnsition("rp1", msg.roll);
            // setPawnsition(pawnID, diceRoll);
        }
    }
}

function setPawnsition(pawnID, diceRoll) {
    var pawn = document.getElementById(pawnID);
    var pawnNumber = pawn.getAttribute("pawnNumber");

    let redRoute = ["rh" + pawnNumber, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
        22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
        50, 51, "r1", "r2", "r3", "r4","r5", "rc1"];

    let greenRoute = ["gh" + pawnNumber, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 
        32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 
        11, 12, "g1", "g2", "g3", "g4","g5", "gc1"];

    let yellowRoute = ["yh" + pawnNumber, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 
        47, 48, 49, 50, 51, 52, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 
        24, 25, "y1", "y2", "y3", "y4","y5", "yc1"];

    let blueRoute = ["bh" + pawnNumber, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 
        11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 
        37, 38, "b1", "b2", "b3", "b4","b5", "bc1"];

    let route = [];

    if (connectionID === 1) route = redRoute;
    else if (connectionID === 2) route = greenRoute;
    else if (connectionID === 3) route = yellowRoute;
    else if (connectionID === 4) route = blueRoute;

    console.log(route.toString());

    var pawnCurrentPositionIndex = route.indexOf(pawn.getAttribute("pawnsition"));
    if(pawnCurrentPositionIndex<0)
        pawnCurrentPositionIndex = route.indexOf(parseInt(pawn.getAttribute("pawnsition")));   
    console.log("pawn index: " + pawnCurrentPositionIndex);
    var pawnCurrentPosition = route[pawnCurrentPositionIndex];
    console.log("pawn position: " + pawnCurrentPosition);

    var pawnNextPosition = document.getElementById(route[pawnCurrentPositionIndex + diceRoll]);
    console.log("pawn next position: " + pawnNextPosition.getAttribute("id"));
    pawnNextPosition.appendChild(pawn);
    //document.getElementById(pawnCurrentPosition).removeChild(pawn);
    pawn.setAttribute("pawnsition", pawnNextPosition.getAttribute("id"));
    console.log("pawn position : " + pawn.getAttribute("pawnsition"));
}

function spawnPawns(connectionID) {
    
    for (i = 1; i < 5; i++) {
        let pawn = document.createElement("IMG");
        pawn.setAttribute("pawnNumber", i);
        pawn.style.height = "32px";
        pawn.style.width = "32px";
        pawn.style.position = "relative";
        pawn.style.top = "0px";
        pawn.style.left = "0px";

        if (connectionID === 1) {
            pawn.src = "./images/pawn_red.png";
            document.getElementById("rh"+i).appendChild(pawn);
            pawn.setAttribute("pawnsition", "rh"+i);
            pawn.id = "rp" + i;
        } else if (connectionID === 2) {
            pawn.src = "./images/pawn_blue.png";
            document.getElementById("bh"+i).appendChild(pawn);
            pawn.setAttribute("pawnsition", "bh"+i);
            pawn.id = "bp" + i;
        } else if (connectionID === 3) {
            pawn.src = "./images/pawn_yellow.png";
            document.getElementById("yh"+i).appendChild(pawn);
            pawn.setAttribute("pawnsition", "yh"+i);
            pawn.id = "yp" + i;
        } else if (connectionID === 4) {
            pawn.src = "./images/pawn_green.png";
            document.getElementById("gh"+i).appendChild(pawn);
            pawn.setAttribute("pawnsition", "gh"+i);
            pawn.id = "gp" + i;
        }

        // pawn.setAttribute("onclick", "onPawnClick()");
    }
}

// let pawn = document.createElement("IMG");
// pawn.src = "./images/pawn_blue.png"
// pawn.style.height = "32px";
// pawn.style.width = "32px";
// pawn.style.position = "relative";
// pawn.style.top = "0px";
// pawn.style.left = "0px";
// document.getElementById("c1").appendChild(pawn);