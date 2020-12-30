/* Class depicting a pawn */
let pawnModule = (function (pawnID, route, belongsToPlayerID) {

    let colourLetter = '';

    if (belongsToPlayerID === 0) colourLetter = 'r';
    else if (belongsToPlayerID === 1) colourLetter = 'g';
    else if (belongsToPlayerID === 2) colourLetter = 'y';
    else if (belongsToPlayerID === 3) colourLetter = 'b';

    let position = 0;

    return {
        getPawnID: function () {
            return pawnID;
        },

        getColourLetter: function () {
            return colourLetter;
        },

        getBelongsToPlayerID: function () {
            return belongsToPlayerID;
        },

        getPosition: function () {
            return position;
        },

        setPosition: function (newPosition) {
            position += newPosition;
        }

    }

})();