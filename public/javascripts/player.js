const pawn = require('pawn');

/* Class depicting a Player; a person participating in Ludo */
let playerModule = (function(playerID) {
    /* private members */

    let redRoute = ["rh" + pawnID, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
        22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
        50, 51, "r1", "r2", "r3", "r4","r5", "rc1"];

    let greenRoute = ["gh" + pawnID, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 
        32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 
        11, 12, "g1", "g2", "g3", "g4","g5", "gc1"];

    let yellowRoute = ["yh" + pawnID, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 
        47, 48, 49, 50, 51, 52, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 
        24, 25, "y1", "y2", "y3", "y4","y5", "yc1"];

    let blueRoute = ["bh" + pawnID, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 
        11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 
        37, 38, "b1", "b2", "b3", "b4","b5", "bc1"];

    let route = '';

    if (playerID === 0) route = redRoute;
    else if (playerID === 1) route = greenRoute;
    else if (playerID === 2) route = yellowRoute;
    else if (playerID === 3) route = blueRoute;

    var pawn1 = pawnModule(0, route, playerIDValue);
    var pawn2 = pawnModule(1, route, playerIDValue);
    var pawn3 = pawnModule(2, route, playerIDValue);
    var pawn4 = pawnModule(3, route, playerIDValue);
    var pawns = [pawn1, pawn2, pawn3, pawn4];

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
        },

        getTurn : function() {
            return turn;
        },

        getPawns : function(){
            return pawns;
        }
    }

})();
