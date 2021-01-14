let soc = null;
let connectionID = null;
let playerColor = '';
let isHost = null;

function getColorName(code) {
    let colorName = '';
    switch (code) {
        case ('r'):
            colorName = 'Red';
            break;
        case ('g'):
            colorName = 'Green';
            break;
        case ('y'):
            colorName = 'Yellow';
            break;
        case ('b'):
            colorName = 'Blue';
            break;
        default:
            console.log('No handling for code: ' + code);
            break;
    }
    return colorName;
}

function updateBoard(players) {

    // Remove any pawn elements not present in the players array

    const allPawnIds = [
        'rp1', 'rp2', 'rp3', 'rp4',
        'gp1', 'gp2', 'gp3', 'gp4',
        'yp1', 'yp2', 'yp3', 'yp4',
        'bp1', 'bp2', 'bp3', 'bp4',
    ]
    for (let i = 0; i < allPawnIds.length; i++) {
        const element = document.getElementById(allPawnIds[i]);
        // console.log(element);
        if (element) {
            for (let j = 0; j < players.length; j++) {
                if (!players[j].pawns.find(p => p.id === allPawnIds[i]) && document.getElementById(allPawnIds[i]) != null) {
                    // console.log(document.getElementById(allPawnIds[i]));
                    document.getElementById(allPawnIds[i]).remove();
                }
            }
        }
    }

    // Add pawns from the players array

    for (let j = 0; j < players.length; j++) {

        let imgSrc = '';
        switch (players[j].color) {
            case ('r'):
                imgSrc = './images/pawn_red.png';
                break;
            case ('g'):
                imgSrc = './images/pawn_green.png';
                break;
            case ('y'):
                imgSrc = './images/pawn_yellow.png';
                break;
            case ('b'):
                imgSrc = './images/pawn_blue.png';
                break;
            default:
                console.log('unhandled color code: ' + players[j].color);
                break;
        }

        let pawns = players[j].pawns
        for (let i = 0; i < pawns.length; i++) {
            var pawnId = pawns[i].id;
            if (!document.getElementById(pawnId)) {
            // console.log(pawns[i]);
            let pawn = document.createElement("IMG");
            pawn.style.height = "32px";
            pawn.style.width = "32px";
            pawn.style.position = "relative";
            pawn.style.top = "0px";
            pawn.style.left = "0px";
            pawn.src = imgSrc;
            pawn.id = pawnId;
            document.getElementById(pawns[i].position).appendChild(pawn);
            }
            else {
            let pawn = document.getElementById(pawnId);
            document.getElementById(pawns[i].position).appendChild(pawn);
            }
        }
    }
}

function startGame() {
    console.log('Start Game');
    document.getElementById("startGameButton").style.visibility = "hidden";
    soc.send("startGame");
}

function connectToServer() {
    console.log("Connecting to server");

    const socket = new WebSocket("ws://localhost:3000");

    // socket.onopen = function(){
    //     socket.send("Hello from the client!");
    //     console.log("Connection opened");
    //     console.log(socket);
    // };

    soc = socket;
    let gameState;
    //var diceRoll;
    var ArePawnsAvailable;

    socket.onmessage = function (e) {
        gameState = JSON.parse(e.data);
        console.log(gameState);

        if (playerColor === '') {
            // First time receiving the gameState. This happens when
            // connecting with the server for the first time.

            // This is going to be the user's color
            playerColor = gameState.players[gameState.players.length-1].color;
            console.log('Player color is: ' + playerColor);
            document.getElementById('yourColor').innerText = 'Your color is ' + getColorName(playerColor);

            // This determines if the user is the host
            isHost = gameState.players[gameState.players.length-1].isHost;
            console.log(playerColor + " is host = " + isHost);
            if (isHost && gameState.players.length > 1) {
                document.getElementById('startGameButton').style.visibility = 'visible';
            }
        }

        // console.log("fuck");
        let dice = JSON.parse(e.data).diceRoll;
        // console.log(dice);
        if (dice.header === "diceRolled") {
            let msg = dice.player;
            //diceRoll = dice.roll;
            console.log("message: \n " + msg);
            pawnsAvailable(dice.playerColor);
        }

        let player = gameState.players.find(p => p.color === playerColor);

        if (player.isHost && !gameState.hasStarted && gameState.players.length > 1) {
            isHost = true;
            document.getElementById('startGameButton').style.visibility = 'visible';
            console.log(playerColor + " is the new host.");
        } else {
            document.getElementById('startGameButton').style.visibility = 'hidden';
        }

        if (gameState.hasStarted && player.hasTurn) {
            document.getElementById('rollTheDice').style.visibility = 'visible';
        }

        // Generate all pawns based on gameState
        updateBoard(gameState.players);

        
    }

    // document.getElementById("startGameOverlay").style.visibility = "hidden";
    // document.getElementById("gameScreen").style.visibility = "visible";
}

function endGame() {
    console.log("Leave game.");

    soc.close();

    // document.getElementById("startGameOverlay").style.visibility = "visible";
    // document.getElementById("gameScreen").style.visibility = "hidden";

    window.location.href = './';
}

function pawnsAvailable(playerColor) {
    document.getElementById(playerColor + "p1").addEventListener("click", setPawn(playerColor + "p1"));
    document.getElementById(playerColor + "p2").addEventListener("click", setPawn(playerColor + "p2"));
    document.getElementById(playerColor + "p3").addEventListener("click", setPawn(playerColor + "p3"));
    document.getElementById(playerColor + "p4").addEventListener("click", setPawn(playerColor + "p4"));
    ArePawnsAvailable = true;
}

function setPawn(id) {
    return function() {
        if(ArePawnsAvailable){
            console.log("I just sent a message to server with: " + id);
            soc.send("movedPawn " + id);

            document.getElementById(playerColor + "p1").removeEventListener("click", setPawn(playerColor + "p1"));
            document.getElementById(playerColor + "p2").removeEventListener("click", setPawn(playerColor + "p2"));
            document.getElementById(playerColor + "p3").removeEventListener("click", setPawn(playerColor + "p3"));
            document.getElementById(playerColor + "p4").removeEventListener("click", setPawn(playerColor + "p4"));
            ArePawnsAvailable = false;
        }
    }
  }

function rollTheDice() {
    soc.send("rollDice");
}

function onClick(event) {

}
