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

                if (typeof pawns[i].position === 'string' && pawns[i].position.includes('c')) {
                    pawn.className = 'small-pawn';
                } else {
                    pawn.className = 'pawn';
                }

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
    // document.getElementById("startGameButton").style.visibility = "visible";
    // document.getElementById("startGameButton").style.pointerEvents = "none";
    document.getElementById("startGameButton").classList.remove('start-game');
    document.getElementById("startGameButton").classList.add('disabled-button');
    soc.send("startGame");
}

function connectToServer() {
    console.log("Connecting to server");

    const socket = new WebSocket("ws://localhost:3000/");

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
            let msg = gameState.exitCode.split(':')[1];

            if (code === '1') {
                alert("Exit code " + code + ": " + msg);

            } else if (code === '0') {
                let color = gameState.exitCode.split('.')[0];
                let msg = gameState.exitCode.split('.')[1];
                alert(getColorName(color) + " won the game!");
            }

            endGame();
        }

        if (playerColor === '') {
            // First time receiving the gameState. This happens when
            // connecting with the server for the first time.

            // This is going to be the user's color
            playerColor = gameState.players[gameState.players.length - 1].color;
            console.log('Player color is: ' + playerColor);
            document.getElementById('yourColor').innerText = getColorName(playerColor);
            if (playerColor === 'r') {
                document.getElementById('yourColor').style.backgroundColor = '#C0392B';
            } else if (playerColor === 'b') {
                document.getElementById('yourColor').style.backgroundColor = '#2980b9';
            } else if (playerColor === 'g') {
                document.getElementById('yourColor').style.backgroundColor = '#27ae60';
            } else if (playerColor === 'y') {
                document.getElementById('yourColor').style.backgroundColor = '#f1c40f';
            }

            document.getElementById('score').innerText = '0';

            // This determines if the user is the host
            isHost = gameState.players[gameState.players.length - 1].isHost;
            console.log(playerColor + " is host = " + isHost);
            if (isHost && gameState.players.length === 1) {
                document.getElementById('startGameButton').style.visibility = 'visible';
                // document.getElementById("startGameButton").classList.remove('disabled-button');
                // document.getElementById("startGameButton").classList.add('start-game');
            }
        }

        let player = gameState.players.find(p => p.color === playerColor);

        if (player.isHost && !gameState.hasStarted && gameState.players.length > 1) {
            isHost = true;
            document.getElementById('startGameButton').style.visibility = 'visible';
            document.getElementById("startGameButton").classList.remove('disabled-button');
            document.getElementById("startGameButton").classList.add('start-game');
            console.log(playerColor + " is the new host.");
        } else if (player.isHost && !gameState.hasStarted && gameState.players.length === 1) {
            isHost = true;
            document.getElementById('startGameButton').style.visibility = 'visible';
            document.getElementById("startGameButton").classList.remove('start-game');
            document.getElementById("startGameButton").classList.add('disabled-button');
        } else {
            // document.getElementById('startGameButton').style.visibility = 'hidden';
            document.getElementById("startGameButton").classList.remove('start-game');
            document.getElementById("startGameButton").classList.add('disabled-button');
        }

        let dice = gameState.diceRoll;

        if (gameState.hasStarted && player.hasTurn && dice.state === 'toRoll') {
            // document.getElementById('roll').innerText = 'Roll dice';
            // document.getElementById('rollTheDice').style.visibility = 'visible';
            // document.getElementById('rollTheDice').classList.remove('disabled-dice');
            // document.getElementById('rollTheDice').classList.add('roll-dice');
            document.getElementById('rollTheDice').className = 'roll-dice';
        } else {
            // document.getElementById('roll').innerText = 'Roll dice';
            // document.getElementById('rollTheDice').style.visibility = 'hidden';
            // document.getElementById('rollTheDice').classList.remove('roll-dice');
            // document.getElementById('rollTheDice').classList.add('disabled-dice');
            document.getElementById('rollTheDice').className = 'disabled-dice';

            let pc = '';

            if (gameState.hasStarted) {
                pc = gameState.players.find(p => p.hasTurn === true).color;
            }

            if (pc === 'r') {
                document.getElementById('rollTheDice').classList.add('red');
            } else if (pc === 'b') {
                document.getElementById('rollTheDice').classList.add('blue');
            } else if (pc === 'g') {
                document.getElementById('rollTheDice').classList.add('green');
            } else if (pc === 'y') {
                document.getElementById('rollTheDice').classList.add('yellow');
            }
        }

        if (dice.playerColor === playerColor && player.hasTurn && dice.state === 'rolled') {
            console.log(playerColor + " has rolled " + dice.roll);
            ArePawnsAvailable = true;
        }

        if ((dice.state === 'rolled' || dice.state === 'toRoll') && dice.roll > 0 && dice.roll < 7) {
            document.getElementById('roll').innerText = 'Roll: ' + dice.roll;
        }

        if (gameState.hasStarted) {
            document.getElementById('score').innerText = player.score;
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
