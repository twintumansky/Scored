import { cricketTeamLogos } from './data/cricketTeamLogos.js'

//Config-driven-logic
document.addEventListener('DOMContentLoaded', () => {
  const liveScoresDiv = document.querySelector('#fixtures-container');
  const statusButtons = document.querySelectorAll('.container-buttons');
  const sportNavButtons = document.querySelectorAll('.nav-cards');
  let activeFilter = null; // Track current filter
  let activeSport = "cricket"; // State for the currently active sport(Default - football)

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
    const leagueCode = config.leagueCode(match);
    score += config.leaguePriorities[leagueCode] || config.leaguePriorities.default;

    if (currentSport === 'cricket') {
      const homeTeam = match.teamInfo[1]?.shortname;
      const awayTeam = match.teamInfo[0]?.shortname;
      const homeTeamScore = config.teamPriorities[homeTeam] || 0;
      const awayTeamScore = config.teamPriorities[awayTeam] || 0;

      score += homeTeamScore + awayTeamScore;
    }

    const timeFormat = config.time(match);
    const timestamp = Math.floor(new Date(timeFormat).getTime() / 1000);
    const now = Math.floor(Date.now() / 1000);
    const hoursUntilMatch = (timestamp - now) / 3600; // Convert seconds to hours

    if (config.isLive(match)) {
      score += 1000; // Live matches
    } else if (config.isRecent(match)) {
      score += 500; // Recent matches
    } else if (config.isUpcoming(match)) {
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

  function isRecentMatch(matchTimestamp, hoursBefore) {
    const now = Math.floor(Date.now() / 1000); // Current time in milliseconds
    const timeHoursAgo = hoursBefore * 60 * 60;
    return matchTimestamp > (now - timeHoursAgo); // // Check if the match time is within the specified time range
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
      const leagueCode = config.leagueCode(match);
      const allowedLeague = config.allowedLeagues.includes(leagueCode);

      const timeFormat = config.time(match);
      const timestamp = Math.floor(new Date(timeFormat).getTime() / 1000);

      const isLive = config.isLive(match);
      const isRecent = config.isRecent(match, timestamp);
      const isUpcoming = config.isUpcoming(match, timestamp);

      return allowedLeague && (isLive || isRecent || isUpcoming);
    })
  }

  function sortMatches(matches, sport) {
    const currentSport = sport;
    const config = sportConfig[currentSport]
    return matches
      .map(match => ({ ...match, priority: calculateMatchPriority(match, sport), }))
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        const aTime = Math.floor(new Date(config.time(a)).getTime() / 1000);
        const bTime = Math.floor(new Date(config.time(b)).getTime() / 1000);
        if (config.isRecent(a)) {
          return bTime - aTime; // Newer first for recent
        }
        return aTime - bTime; // Sooner first for upcoming
      })
  }

  function filterMatchesByStatus(matches, filterStatus, sport) {
    const currentSport = sport;
    const config = sportConfig[currentSport];
    if (!filterStatus) return matches; // Return all matches if no filter

    return matches.filter(match => {
      const timeFormat = config.time(match);
      const timestamp = Math.floor(new Date(timeFormat).getTime() / 1000);

      switch (filterStatus) {
        case 'LIVE':
          return config.isLive(match);
        case 'FINISHED':
          return config.isRecent(match, timestamp);
        case 'UPCOMING':
          return config.isUpcoming(match, timestamp);
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
      allowedLeagues: ['CL', 'PL', 'PD', 'BL1', 'BSA', 'CLI' ],
      leagueCode: match => match.competition?.code,
      leaguePriorities: { CL: 100, PL: 90, PD: 80, BL1: 70, BSA: 60, CLI: 50, default: 30 },
      time: match => match.utcDate,
      isLive: match => match.status === "IN_PLAY" || match.status === "PAUSED",
      isRecent: (match, timestamp) => match.status === "FINISHED" && isRecentMatch(timestamp, 24),
      isUpcoming: (match, timestamp) => (match.status === "TIMED" || match.status === "SCHEDULED") && isUpcomingMatch(timestamp),
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
          cardClone.querySelector('.home-team-score').textContent = match.score?.fullTime?.home ?? '0';
          cardClone.querySelector('.away-team-score').textContent = match.score?.fullTime?.away ?? '0';
        } else if (match.status === 'FINISHED') {
          statusTextElement.textContent = 'Finished';
          scoreContainer.style.display = 'flex';
          scheduledContainer.style.display = 'none';
          cardClone.querySelector('.home-team-score').textContent = match.score?.fullTime?.home ?? '0';
          cardClone.querySelector('.away-team-score').textContent = match.score?.fullTime?.away ?? '0';
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
      allowedLeagues: ['t20', 'odi', 'test'],
      leagueCode: match => match.matchType,
      leaguePriorities: { test: 200, odi: 150, t20: 100, default: 25 },
      teamPriorities: {
        'IND': 25,
        'ENG': 25,
        'AUS': 25,
        'WI': 20,
        'PAK': 25,
        'RSA': 25,
        'NZ': 25,
        'SL': 20,
        'AFG': 20,
        'BAN': 20,
        'IRE': 20,
        'SCO': 15,
        'NED': 15,
        'AUT': 15,
        'BEL': 15,
        'CB': 15,
        'HK': 15,
        'IDN': 15,
        'JP': 15,
        'PH': 15,
        'NEP': 15,
        'BR': 10,
        'CM': 10,
        'CZE': 10,
        'DEN': 10,
        'FIN': 10,
        'MLT': 10,
        'MW': 10,
        'PORT': 10,
        'SLN': 10,
        'SRB': 10,
        'SWZ': 10,
        'UGA': 10,
        'DERB': 20,
        'DURH': 20,
        'ESX': 20,
        'GLAM': 20,
        'GLOU': 20,
        'HAM': 20,
        'KENT': 20,
        'LECS': 20,
        'LNCS': 20,
        'MDX': 20,
        'NOR': 20,
        'NOT': 20,
        'SOM': 20,
        'SUR': 20,
        'SUSS': 20,
        'WRCS': 20,
        'WRKS': 20,
        'YRK': 20,
        'ENGL': 10,
        'INA': 10,
        'WIA': 10,
        'SA-A': 10,
      },
      time: match => match.dateTimeGMT + 'Z',
      isLive: match => match.matchStarted && (match.matchEnded === false),
      isRecent: (match, timestamp) => match.matchEnded && isRecentMatch(timestamp, 32),
      isUpcoming: (match, timestamp) => (match.matchStarted === false) && isUpcomingMatch(timestamp),
      populateCard: function (cardClone, match) {
        const homeTeamShortName = match.teamInfo[1]?.shortname;
        const awayTeamShortName = match.teamInfo[0]?.shortname;
        const formatType = ((match.matchType == 'test') ? 'Test' : ((match.matchType == 'odi') ? 'ODI' : 'T20'));
        const iconType = ((match.matchType == 'test') ? '/assets/icons/cricket-icon-test.png' :
          ((match.matchType == 'odi') ? '/assets/icons/cricket-icon-odi.png' : '/assets/icons/cricket-icon-t20.png'));

        const venueInfo = match.venue?.split(',')[1] ?? 'TBD';
        const cricketHomeTeamScoreContainer = cardClone.querySelector('.cricket-home-team-score-container');
        const cricketAwayTeamScoreContainer = cardClone.querySelector('.cricket-away-team-score-container');
        const cricketMatchStatus = cardClone.querySelector('.cricket-match-status');
        const scheduleContainer = cardClone.querySelector('.schedule-container');
        const cricketHomeTeamOvers = cardClone.querySelector('.cricket-home-team-overs');
        const cricketAwayTeamOvers = cardClone.querySelector('.cricket-away-team-overs');
        const cricketHomeTeamScore = cardClone.querySelector('.cricket-home-team-score');
        const cricketAwayTeamScore = cardClone.querySelector('.cricket-away-team-score');
        const matchTimestampSeconds = Math.floor(new Date(match.dateTimeGMT + 'Z').getTime() / 1000);

        cardClone.querySelector('.competition-info').textContent = match.name ?? 'TBD';
        cardClone.querySelector('.cricket-home-team-name').textContent = homeTeamShortName || match.teams[0];
        cardClone.querySelector('.cricket-home-team-logo')?.setAttribute('src', (cricketTeamLogos[homeTeamShortName] ?? '/assets/logos/cricket/default-cricket-team.png'));
        cardClone.querySelector('.cricket-away-team-name').textContent = awayTeamShortName || match.teams[1];
        cardClone.querySelector('.cricket-away-team-logo')?.setAttribute('src', (cricketTeamLogos[awayTeamShortName] ?? '/assets/logos/cricket/default-cricket-team.png'));
        cardClone.querySelector('.cricket-match-status').textContent = match.status ?? 'match status not available';
        cardClone.querySelector('.format-icon')?.setAttribute('src', (iconType ?? '/assets/icons/cricket-icon-test.png'));
        cardClone.querySelector('.format-name').textContent = formatType ?? 'NA';
        cardClone.querySelector('.venue-name').textContent = venueInfo;

        if (this.isLive(match) || this.isRecent(match, matchTimestampSeconds)) {
          const homeTeamScore = (match?.score?.[0]?.r) ? `${match.score[0].r}/${match.score[0].w}` : "\xa0";
          const homeTeamOvers = (match?.score?.[0]?.o) ? `(${match.score[0].o})` : '\xa0';
          const awayTeamScore = (match?.score?.[1]?.r) ? `${match.score[1].r}/${match.score[1].w}` : "\xa0";
          const awayTeamOvers = (match?.score?.[1]?.o) ? `(${match.score[1].o})` : '\xa0';

          if (match.score?.length == 0 || match.score == null) {
            cricketHomeTeamScoreContainer.style.display = 'none';
            cricketAwayTeamScoreContainer.style.display = 'none';
          } else {
            cricketHomeTeamScoreContainer.style.display = 'block';
            cricketAwayTeamScoreContainer.style.display = 'block';
          }

          cricketMatchStatus.style.display = 'block';
          cricketHomeTeamScore.textContent = homeTeamScore;
          cricketHomeTeamOvers.textContent = homeTeamOvers;
          cricketAwayTeamScore.textContent = awayTeamScore;
          cricketAwayTeamOvers.textContent = awayTeamOvers;

        } else {
          scheduleContainer.style.display = 'flex';
          cricketMatchStatus.style.display = 'none';

          const matchDate = new Date(match.dateTimeGMT + 'Z');
          cardClone.querySelector('.scheduled-time').textContent = matchDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          cardClone.querySelector('.scheduled-day').textContent = matchDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        }

      }
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
      console.log(`API Response for ${activeSport}:`, data);

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
        const filteredByStatus = filterMatchesByStatus(window.sortedMatches, activeFilter, activeSport);
        displayLiveScores(filteredByStatus, activeSport); // Use the centrally stored activeSport
      } else {
        console.warn("No matches available at this moment.");
      }
    });
  });

  // --- Initial Fetch ---
  fetchMatches(activeSport);

})


