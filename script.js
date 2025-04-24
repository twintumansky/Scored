//API settings
const API_KEY = 'dd8a1839c96444931acaf8b2ef647fc9';
const API_HOST = 'v3.football.api-sports.io';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const template = document.querySelector('#fixture-card-template');
    const liveScoresDiv = document.querySelector('#football-fixture-cards');

    //Function to fetch live matches
    async function fetchLiveMatches() {
        try {
            const response = await fetch(`https://${API_HOST}/fixtures?live=all`, {
                method: 'GET',
                headers: {
                    'x-rapidapi-key': API_KEY,
                    'x-rapidapi-host': API_HOST
                }
            });

            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

            const data = await response.json();
            displayLiveScores(data.response);
        } catch (error) {
            console.error('Error fetching live matches:', error);
            liveScoresDiv.innerHTML = 'Error loading live scores.';
        }
    }

    // Function to display live scores on the page
    function displayLiveScores(matches) {
        if (matches.length === 0) {
            liveScoresDiv.innerHTML = '<p>No live matches currently.</p>';
            return;
        }

        liveScoresDiv.innerHTML = '';  // Clear previous data

        matches.forEach(match => {
            const card = template.content.cloneNode(true);

            // Use consistent optional chaining and nullish coalescing for all properties
            card.querySelector('.home-team-logo')?.setAttribute('src', match.teams?.home?.logo ?? '');
            card.querySelector('.away-team-logo')?.setAttribute('src', match.teams?.away?.logo ?? '');
            card.querySelector('.home-team-name').textContent = match.teams?.home?.name ?? '';
            card.querySelector('.away-team-name').textContent = match.teams?.away?.name ?? '';
            card.querySelector('.home-team-score').textContent = match.goals?.home ?? '0';
            card.querySelector('.away-team-score').textContent = match.goals?.away ?? '0';
            card.querySelector('.elapsed-time').textContent = match.fixture?.status?.elapsed ?? '';
            card.querySelector('.league-name').textContent = match.league?.name ?? '';
            card.querySelector('.venue').textContent = match.fixture?.venue?.name ?? '';

            liveScoresDiv.appendChild(card);
        });
    }

    // Fetch live matches when the page loads
    fetchLiveMatches();
});