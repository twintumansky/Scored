const addCardBtn = document.querySelector(".addCardBtn");
const cardEl = document.querySelector(".cardContainer");
let cardCount = 1;

addCardBtn.addEventListener("click", function() {
    const card = document.createElement('div');
    card.className = 'card';
    cardEl.appendChild(card);

    const cardName = document.createElement('p');
    const name = document.createElement('button');

    cardName.className = 'nameCard';
    name.className = 'nameBtn';
    name.textContent = 'Add Player';
    cardName.textContent = 'card ' + cardCount;
    cardName.contentEditable = 'true';

    card.appendChild(cardName);
    card.appendChild(name);
    cardCount++;
    
    name.addEventListener("click", function() {
        const playerName = document.createElement('input');
        const score = document.createElement('input');
        const playerContainer = document.createElement('div'); // Container for playerName and score

        playerName.className = 'playerInput';
        score.className = 'playerScore';
        playerName.type = 'text';
        score.type = 'text';
        playerName.placeholder = 'Player name';
        score.placeholder = 'Score';

        playerContainer.appendChild(playerName);
        playerContainer.appendChild(score);
        card.insertBefore(playerContainer, name);

        playerName.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                const inputValue = playerName.value;
                const scoreValue = score.value;
                createListItem(inputValue, scoreValue, card, playerContainer);
            }
        });
        
        score.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                const inputValue = playerName.value;
                const scoreValue = score.value;
                createListItem(inputValue, scoreValue, card, playerContainer);
            }
        });
    });
});

function createListItem(playerName, score, card, playerContainer) {
    const listItem = document.createElement('li');
    listItem.textContent = `${playerName} - ${score}`;
    card.insertBefore(listItem, playerContainer);
    card.removeChild(playerContainer);
}
