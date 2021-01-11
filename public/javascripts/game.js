let soc = null;
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
        var connectionID = messageJSON.numberOfPlayers;
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
}

function spawnPawns(connectionID) {
    
    for (i = 1; i < 5; i++) {
        let pawn = document.createElement("IMG");

        pawn.style.height = "32px";
        pawn.style.width = "32px";
        pawn.style.position = "relative";
        pawn.style.top = "0px";
        pawn.style.left = "0px";
        // pawn.style.border = "1px";
        // pawn.style.borderColor = "black";
        pawn.style.textShadow = "0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)";

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