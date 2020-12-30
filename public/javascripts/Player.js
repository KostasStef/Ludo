/* Class depicting a Player; a person participating in Ludo */
let playerModule = (function(playerIDValue) {
    /* private members */
    if (playerIDValue === null)
        let playerID = 0;
    else
        let playerID = 0 + playerIDValue;

    let score = 0;
    let hasTurn = false;

    /* public member; accessible to everyone */
    return {
        /* Can be invoked as to see whether one's pawn is of the same player */
        playerEquals : function(player1, player2) {
            return player1.playerID === player2.playerID;
        },
            
        /* Increase score */
        incScore : function() {
            score++;
        },

        /* Get score */
        getScore : function() {
            return score;
        },

        setTurn : function(turn) {
            hasTurn = turn;
        }
    }

})();