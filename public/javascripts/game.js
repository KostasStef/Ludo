let soc = null;
// export * from "./dice.js";
// import * as dice from "./dice";

// import('./dice.js').then(module => {module.diceRoll();});
let importaki = import('./dice.js')
.then(module => {
    module.gameDiceModule.rollTheDice();
    diceRoll = module.gameDiceModule.getNumberRolled();
    
    console.log(diceRoll);
    return module.gameDiceModule;
});

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
        console.log(JSON.parse(e.data));
        console.log("incoming test: " + JSON.parse(e.data).test);
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

function rollDice() {
    console.log("You got a" + getNumberRolled() + "!!!1!1!1!!");
}

let pawn = document.createElement("IMG");
pawn.src = "./images/pawn_blue.png"
pawn.style.height = "32px";
pawn.style.width = "32px";
pawn.style.position = "relative";
pawn.style.top = "0px";
pawn.style.left = "0px";
document.getElementById("c1").appendChild(pawn);