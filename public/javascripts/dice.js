/* Class depicting a typical dice for Ludo */
var gameDiceModule = ( function() {

    /* private members */
    var numberRolled = 0;

    /* public member; accessible to players, gameboard */
    return {
        /* Can be invoked as to roll the dice */
        rollTheDice : function() {
            this.numberRolled = randomRoll(1, 6);
        },
        
        /* Get method of the most recent dice roll */
        getNumberRolled : function() {
            return this.numberRolled;
        }
    }

    
})();

/* Generates a random dice roll;
retrusn an integer between 1 and 6 */
const randomRoll = (min = 1, max = 6) => {
    let roll = Math.random() * (max - min) + min;

    return Math.round(roll);
}

export {gameDiceModule};

// module.exports = gameDiceModule;

// export function diceRoll() {
//     let max = 6;
//     let min = 1;
//     return Math.round(Math.random()*(max - min) + min);
// }
