/* Class depicting a Player; a person participating in Ludo */
var playerModule = (function(playerIDvalue){
    /* private members */
    if(playerIDvalue===null)
        var playerID = 0;
    else
        var playerID = 0 + playerIDvalue;

    var score = 0;
    var hasTurn = false;

    /* public member; accessible to everyone */
    return {
        /* Can be invoked as to see whether one's pawn is of the same player */
        playerEquals : function(player1, player2) {
            player1.playerID === player2.playerID;
        },
            
        /* Increase score */
        incrScore : function() {
            score++;
        },

        /* Get score */
        getScore : function() {
            return this.score;
        },

        playerTurn : function(turn) {
            this.hasTurn = turn;
        }
    }

})();