/* File depicting a typical dice for Ludo */
const fs = require("fs");
// /* private members */
function rollTheDice() {
    /* Generates a random dice roll;
    returns an integer between 1 and 6 */
    var randomRoll = (min = 1, max = 6) => {
        let roll = Math.random() * (max - min) + min;

        return Math.round(roll);
    }
    /* Get method of the most recent dice roll */
    let diceRolled = {
        diceRoll : randomRoll(1, 6)
    };
    
    fs.writeFile("./public/server.json", JSON.stringify(diceRolled), 'utf8', (err) => {
        if (err)
            console.log('Error writing to file: ${err}');
        else 
            console.log('Written successfully to file');
    });
}


