let soc = null;
let connectionID = null;
let playerColor = '';
let isHost = null;
let ArePawnsAvailable = false;

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

function setPawn(e) {
    let pawnId = e.path[0].id;
    if (ArePawnsAvailable) {
        ArePawnsAvailable = false;
        console.log(pawnId + " was clicked.");
        soc.send("movedPawn " + pawnId);
        var audio = new Audio('./sfx/movePiece.wav');
        audio.play();
    }
}

function updateBoard(players) {

    // Remove any pawn elements not present in the players array

    const allPawnIds = [
        'rp1', 'rp2', 'rp3', 'rp4',
        'gp1', 'gp2', 'gp3', 'gp4',
        'yp1', 'yp2', 'yp3', 'yp4',
        'bp1', 'bp2', 'bp3', 'bp4',
    ];

    for (let i = 0; i < allPawnIds.length; i++) {
        const element = document.getElementById(allPawnIds[i]);
        if (element) {
            for (let j = 0; j < players.length; j++) {
                if (!players[j].pawns.find(p => p.id === allPawnIds[i]) && document.getElementById(allPawnIds[i]) != null) {
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
            let pawnId = pawns[i].id;
            if (!document.getElementById(pawnId)) {
                let pawn = document.createElement("IMG");
                pawn.src = imgSrc;
                pawn.id = pawnId;
                pawn.className = "pawn";
                document.getElementById(pawns[i].position).appendChild(pawn);

                if (players[j].color === playerColor) {
                    document.getElementById(pawnId).addEventListener("click", setPawn);
                }
            } else {
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

    socket.onmessage = function (e) {
        gameState = JSON.parse(e.data);
        console.log(gameState);

        if (gameState.exitCode !== null) {
            let code = gameState.exitCode.split(':')[0];
            let error = gameState.exitCode.split(':')[1];
            alert("Exit code " + code + ": " + error);
            endGame();
        }

        if (playerColor === '') {
            // First time receiving the gameState. This happens when
            // connecting with the server for the first time.

            // This is going to be the user's color
            playerColor = gameState.players[gameState.players.length - 1].color;
            console.log('Player color is: ' + playerColor);
            document.getElementById('yourColor').innerText = 'Your color is ' + getColorName(playerColor);

            // This determines if the user is the host
            isHost = gameState.players[gameState.players.length - 1].isHost;
            console.log(playerColor + " is host = " + isHost);
            if (isHost && gameState.players.length > 1) {
                document.getElementById('startGameButton').style.visibility = 'visible';
            }
        }

        let player = gameState.players.find(p => p.color === playerColor);

        if (player.isHost && !gameState.hasStarted && gameState.players.length > 1) {
            isHost = true;
            document.getElementById('startGameButton').style.visibility = 'visible';
            console.log(playerColor + " is the new host.");
        } else {
            document.getElementById('startGameButton').style.visibility = 'hidden';
        }

        let dice = gameState.diceRoll;

        if (gameState.hasStarted && player.hasTurn && dice.state === 'toRoll') {
            document.getElementById('rollTheDice').style.visibility = 'visible';
        } else {
            document.getElementById('rollTheDice').style.visibility = 'hidden';
        }

        if (dice !== null && dice.playerColor === playerColor && player.hasTurn && dice.state === 'rolled') {
            console.log(playerColor + " has rolled " + dice.roll);
            ArePawnsAvailable = true;
        }

        // Generate all pawns based on gameState
        updateBoard(gameState.players);
    }

}

function endGame() {
    soc.close();
    window.location.href = './';
}

function rollTheDice() {
    soc.send("rollDice");
}
