/* Class depicting a pawn */
let pawnModule = (function (pawnID, colour, belongsToPlayerID) {

    let colourLetter = '';

    if (colour === "red") colourLetter = 'r';
    else if (colour === "green") colourLetter = 'g';
    else if (colour === "yellow") colourLetter = 'y';
    else if (colour === "blue") colourLetter = 'b';

    let position = 0;
    let route = [colourLetter + "h" + pawnID, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
        22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
        50, 51, 52, colourLetter + "1", colourLetter + "2", colourLetter + "3", colourLetter + "4", colourLetter + "5"];

    return {
        pawnEquals: function (other) {
            return pawnID === other.getPawnID && colour === other.getColourLetter() &&
                belongsToPlayerID === other.getBelongsToPlayerID();
        },

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