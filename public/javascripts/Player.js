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