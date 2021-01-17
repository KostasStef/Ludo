module.exports = (function() {
    let ongoingGames = 0;
    let currentlyPlaying = 0;
    let playersWaiting = 0;

    return {
        // ———————— on-going games
        setOngoingGames : function (number) {
            ongoingGames = number;
        },
        getOngoingGames : function () {
            return ongoingGames;
        },
        // ———————— currently playing
        setCurrentlyPlaying : function (number) {
            currentlyPlaying = number;
        },
        getCurrentlyPlaying : function () {
            return currentlyPlaying;
        },
        // ———————— players waiting
        setPlayersWaiting : function (number) {
            playersWaiting = number;
        },
        getPlayersWaiting : function () {
            return playersWaiting;
        }
    }
}) ();