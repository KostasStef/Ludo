function getStats() {
    const Http = new XMLHttpRequest();
    const url = 'http://localhost:3000/serverStats';
    Http.open("GET", url);
    Http.setRequestHeader('Content-Type', 'application/json');
    Http.send();

    Http.onreadystatechange = (e) => {
        if (Http.responseText) {
            const stats = JSON.parse(Http.responseText);
            document.getElementById('games').innerText = stats.games;
            document.getElementById('players').innerText = stats.players;
            document.getElementById('waitingToPlay').innerText = stats.waitingToPlay;
        }
    }
}
