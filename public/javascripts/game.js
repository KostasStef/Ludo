let soc = null;
let connectionID = null;
let playerColor = '';

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
            // console.log(pawns[i]);
            let pawn = document.createElement("IMG");
            pawn.style.height = "32px";
            pawn.style.width = "32px";
            pawn.style.position = "relative";
            pawn.style.top = "0px";
            pawn.style.left = "0px";
            pawn.src = imgSrc;
            pawn.id = pawns[i].id;
            if (!document.getElementById(pawn.id)) {
                document.getElementById(pawns[i].position).appendChild(pawn);
            }
        }
    }
}

function startGame() {
    console.log('Start Game')
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

    socket.onmessage = function (e) {
        let gameState = JSON.parse(e.data);
        console.log(gameState);

        if (playerColor === '') {
            // First time receiving the gameState. This happens when
            // connecting with the server for the first time.
            // This is going to be the user's color
            playerColor = gameState.players[gameState.players.length-1].color;
            console.log('Player color is: ' + playerColor);
            document.getElementById('yourColor').innerText = 'Your color is ' + getColorName(playerColor);
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

function rollTheDice() {
    soc.send("rollDice");

    soc.onmessage = function (e) {
        console.log("fuck");
        console.log(JSON.parse(e.data).header);
        if (JSON.parse(e.data).header === "diceRolled") {
            var msg = JSON.parse(e.data);
            console.log("Dice rolled " + msg.roll + "!");
            setPawnsition("rp1", msg.roll);
        }
    }
}

function onClick(event) {

}
