/* Class depicting a pawn */
let pawnModule = (function (pawnID, route, belongsToPlayerID) {
    
    let position = 0;

    return {
        getPawnID : function () {
            return pawnID;
        },

        // getColourLetter: function () {
        //     return colourLetter;
        // },

        getBelongsToPlayerID : function () {
            return belongsToPlayerID;
        },

        getPosition : function () {
            return route[position];
        },

        setNewPosition : function (newPosition) {
            position += newPosition;
        },

        resetPosition : function () {
            position = 0;
        }

    }

})();