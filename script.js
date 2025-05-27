//Config-driven-logic

document.addEventListener('DOMContentLoaded', () => {
  const liveScoresDiv = document.querySelector('#fixtures-container');
  const statusButtons = document.querySelectorAll('.container-buttons');
  const sportNavButtons = document.querySelectorAll('.nav-cards');
  let activeFilter = null; // Track current filter
  let activeSport = "football"; // State for the currently active sport(Default - football)

  function getDateRange() {
    const today = new Date(Date.now());
    const fiveDaysLater = new Date(today);
    fiveDaysLater.setDate(today.getDate() + 5);

    const formatDate = (date) => date.toISOString().split('T')[0];
    return { from: formatDate(today), to: formatDate(fiveDaysLater) };
  }

  function calculateMatchPriority(match, sport) {
    let score = 0;
    const currentSport = sport;
    const config = sportConfig[currentSport];
    //League Priority
    const leagueCode = match.competition?.code;
    score += config.leaguePriorities[leagueCode] || config.leaguePriorities.default;

    //Status priority
    const status = match.status;
    const timestamp = Math.floor(new Date(match.utcDate).getTime() / 1000);
    const now = Math.floor(Date.now() / 1000);
    const hoursUntilMatch = (timestamp - now) / 3600; // Convert seconds to hours

    if (status === 'IN_PLAY' || status === 'PAUSED') {
      score += 1000; // Live matches
    } else if (status === 'FINISHED' && isRecentMatch(timestamp)) {
      score += 500; // Recent matches
    } else if ((status === 'SCHEDULED' || status === 'TIMED') && isUpcomingMatch(timestamp)) {
      // Prioritize matches happening sooner
      if (hoursUntilMatch <= 24) {
        score += 300; // Next 24 hours
      } else if (hoursUntilMatch <= 48) {
        score += 200; // 24-48 hours
      } else if (hoursUntilMatch <= 72) {
        score += 150; // 48-72 hours
      } else if (hoursUntilMatch <= 96) {
        score += 120; // 72-96 hours
      } else {
        score += 100; // 96-120 hours
      }
    }

    return score;
  }

  function isRecentMatch(matchTimestamp) {
    const now = Math.floor(Date.now() / 1000);
    const timeTwentyFourHoursAgo = now - (24 * 60 * 60);
    return matchTimestamp > timeTwentyFourHoursAgo;
  }

  function isUpcomingMatch(matchTimestamp) {
    const now = Math.floor(Date.now() / 1000);
    const fiveDaysLater = now + (5 * 24 * 60 * 60);
    return matchTimestamp >= now && matchTimestamp <= fiveDaysLater;
  }

  function filterMatches(matches, sport) {
    const currentSport = sport;
    const config = sportConfig[currentSport];
    return matches.filter(match => {
      const leagueCode = match.competition?.code;
      const allowedLeague = config.allowedLeagues.includes(leagueCode);

      const status = match.status;
      const timestamp = Math.floor(new Date(match.utcDate).getTime() / 1000);

      const isLive = status === "IN_PLAY" || status === "PAUSED";
      const isRecent = (status === "FINISHED" && isRecentMatch(timestamp));
      const isUpcoming = (status === ("TIMED" || status === "SCHEDULED") && isUpcomingMatch(timestamp));

      return allowedLeague && (isLive || isRecent || isUpcoming);
    })
  }

  function sortMatches(matches, sport) {
    return matches
      .map(match => ({ ...match, priority: calculateMatchPriority(match, sport), }))
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        const aTime = Math.floor(new Date(a.utcDate).getTime() / 1000);
        const bTime = Math.floor(new Date(b.utcDate).getTime() / 1000);
        if (a.status === 'FINISHED') {
          return bTime - aTime; // Newer first for recent
        }
        return aTime - bTime; // Sooner first for upcoming
      })
  }

  function filterMatchesByStatus(matches, filterStatus) {
    if (!filterStatus) return matches; // Return all matches if no filter

    return matches.filter(match => {
      const status = match.status;
      const timestamp = Math.floor(new Date(match.utcDate).getTime() / 1000);

      switch (filterStatus) {
        case 'LIVE':
          return status === 'IN_PLAY' || status === 'PAUSED';
        case 'FINISHED':
          return status === 'FINISHED' && isRecentMatch(timestamp);
        case 'UPCOMING':
          return (status === 'SCHEDULED' || status === 'TIMED') && isUpcomingMatch(timestamp);
        default:
          return true;
      }
    });
  }

  function displayLiveScores(matches, sportToDisplay) {
    const currentConfig = sportConfig[sportToDisplay];
    liveScoresDiv.innerHTML = '';

    if (!currentConfig) {
      liveScoresDiv.innerHTML = '<p>No sport configuration found.</p>';
      return;
    }
    if (matches.length === 0) {
      liveScoresDiv.innerHTML = '<p>No matches available at the moment.</p>';
      return;
    }

    const template = document.querySelector(`#${currentConfig.templateId}`);
    if (!template) {
      liveScoresDiv.innerHTML = `<p>Template not found for ${currentConfig.templateId}</p>`;
      return;
    }

    matches.forEach(match => {
      const cardClone = template.content.cloneNode(true);
      currentConfig.populateCard(cardClone.firstElementChild, match); // Pass the card element itself
      liveScoresDiv.appendChild(cardClone);
    });
  }

  const sportConfig = {
    football: {
      templateId: 'football-template',
      apiEndpoint: 'http://localhost:3000/api/matches/football',
      allowedLeagues: ['CL', 'PL', 'PD', 'BL1'],
      leaguePriorities: { CL: 100, PL: 90, PD: 80, BL1: 70, default: 50 },
      populateCard: function (cardClone, match) {
        cardClone.querySelector('.home-team-logo')?.setAttribute('src', match.homeTeam.crest);
        cardClone.querySelector('.away-team-logo')?.setAttribute('src', match.awayTeam.crest);
        cardClone.querySelector('.home-team-name').textContent = match.homeTeam.shortName;
        cardClone.querySelector('.away-team-name').textContent = match.awayTeam.shortName;
        cardClone.querySelector('.league-emblem')?.setAttribute('src', match.competition.emblem);
        cardClone.querySelector('.league-name').textContent = match.competition.name;
        cardClone.querySelector('.venue-flag')?.setAttribute('src', match.area.flag);
        cardClone.querySelector('.venue').textContent = match.area.name;

        const scoreContainer = cardClone.querySelector('.score-container');
        const scheduledContainer = cardClone.querySelector('.scheduled-time-container');
        const statusTextElement = cardClone.querySelector('.match-status');

        if (match.status === "IN_PLAY" || match.status === "PAUSED") {
          statusTextElement.textContent = 'Live';
          scoreContainer.style.display = 'flex'; // Or 'block' depending on CSS
          scheduledContainer.style.display = 'none';
          cardClone.querySelector('.home-team-score').textContent = match.score?.home ?? '0';
          cardClone.querySelector('.away-team-score').textContent = match.score?.away ?? '0';
        } else if (match.status === 'FINISHED') {
          statusTextElement.textContent = 'Finished';
          scoreContainer.style.display = 'flex';
          scheduledContainer.style.display = 'none';
          cardClone.querySelector('.home-team-score').textContent = match.score?.home ?? '0';
          cardClone.querySelector('.away-team-score').textContent = match.score?.away ?? '0';
        } else if (match.status === 'SCHEDULED' || match.status === 'TIMED') {
          scoreContainer.style.display = 'none';
          scheduledContainer.style.display = 'block'; // Or 'flex'
          const matchDate = new Date(match.utcDate);
          statusTextElement.textContent = 'Scheduled'; // Or more specific like "Upcoming"
          cardClone.querySelector('.match-time').textContent = matchDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          cardClone.querySelector('.match-date').textContent = matchDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        } else {
          statusTextElement.textContent = match.status; // Fallback
          scoreContainer.style.display = 'none';
          scheduledContainer.style.display = 'none';
        }
      }
    },
    cricket: {
      templateId: 'cricket-template',
      apiEndpoint: 'http://localhost:3000/api/matches/cricket',
    },
  }

  //fetching of matches from API
  async function fetchMatches(sportId) {
    activeSport = sportId; // Updating the active sport state
    liveScoresDiv.innerHTML = '<div class="spinner"></div>';
    const { from, to } = getDateRange();
    const config = sportConfig[activeSport];

    //Sport configuration error
    if (!config) {
      console.error("Configuration not found for this sport");
      liveScoresDiv.innerHTML = 'This sport is not added to the app yet';
      return;
    }

    sportNavButtons.forEach(btn => {
      btn.classList.toggle('active', btn.id === `${activeSport}-card`);
    }); // Updating active class for sport navigation buttons

    let url = `${config.apiEndpoint}?dateFrom=${from}&dateTo=${to}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error status - ${response.status}`);

      const data = await response.json();
      console.log('API Response:', data);

      const leagueFilteredMatches = filterMatches(data.matches, activeSport);
      const sortedMatchData = sortMatches(leagueFilteredMatches, activeSport);

      window.sortedMatches = sortedMatchData; // Store the full, sorted list for the current sport

      const matchesToDisplay = filterMatchesByStatus(window.sortedMatches, activeFilter);
      displayLiveScores(matchesToDisplay, activeSport);

    } catch (error) {
      console.error('Error fetching matches:', error);
      liveScoresDiv.innerHTML = '<p class="error">Unable to load matches. Please try again later.</p>';
    }

  }

  // Sport Navigation Button Listeners
  sportNavButtons.forEach(sportCatButton => {
    sportCatButton.addEventListener('click', () => {
      const sportId = sportCatButton.id.replace('-card', '');
      fetchMatches(sportId);
    });
  });

  // Status Filter Button Listeners
  statusButtons.forEach(button => {
    button.addEventListener('click', () => {
      const status = button.textContent.trim().toUpperCase();

      if (activeFilter === status) {
        activeFilter = null;
        button.classList.remove('active');
      } else {
        statusButtons.forEach(btn => btn.classList.remove('active'));
        activeFilter = status;
        button.classList.add('active');
      }

      // Refilter and display matches using the currently stored sortedMatches and activeSport
      if (window.sortedMatches) { // Make sure data has been fetched at least once
        const filteredByStatus = filterMatchesByStatus(window.sortedMatches, activeFilter);
        displayLiveScores(filteredByStatus, activeSport); // Use the centrally stored activeSport
      } else {
        console.warn("No matches available at this moment.");
      }
    });
  });

  // --- Initial Fetch ---
  fetchMatches(activeSport); // Fetch for the default sport ("football")

})


