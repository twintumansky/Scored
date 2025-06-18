import { cricketTeamLogos } from './data/cricketTeamLogos.js'
import { motorsportCountryLogos } from './data/motorsportCountryLogos.js';

//Config-driven-logic
document.addEventListener('DOMContentLoaded', () => {
  const mainContainer = document.querySelector('.main-container');
  const liveScoresDiv = document.querySelector('#fixtures-container');
  const statusButtons = document.querySelectorAll('.container-buttons');
  const sportNavButtons = document.querySelectorAll('.nav-cards');
  const motorsportContainer = document.querySelector('.motorsport-container');
  const motorsportRaceCardContainer = document.querySelector('#motorsport-card-container');
  let activeFilter = null; // Track current filter
  let activeSport = "cricket"; // State for the currently active sport(Default - football)

  function isTeamSport(sport) {
    return ['football', 'cricket'].includes(sport);
  }

  function getDateRange() {
    const today = new Date(Date.now());
    const fiveDaysLater = new Date(today);
    fiveDaysLater.setDate(today.getDate() + 5);
    const formatDate = (date) => date.toISOString().split('T')[0];

    return { from: formatDate(today), to: formatDate(fiveDaysLater) };
  }

  function calculateFixturePriority(fixture, sport) {
    let score = 0;
    const currentSport = sport;
    const config = sportConfig[currentSport];
    //League Priority
    const leagueCode = config.leagueCode(fixture);
    score += config.leaguePriorities[leagueCode] || config.leaguePriorities.default;

    if (currentSport === 'cricket') {
      const homeTeam = fixture.teamInfo[1]?.shortname;
      const awayTeam = fixture.teamInfo[0]?.shortname;
      const homeTeamScore = config.teamPriorities[homeTeam] || 0;
      const awayTeamScore = config.teamPriorities[awayTeam] || 0;

      score += homeTeamScore + awayTeamScore;
    }

    const timeFormat = config.time(fixture);
    const timestamp = Math.floor(new Date(timeFormat).getTime() / 1000);
    const now = Math.floor(Date.now() / 1000);
    const hoursUntilFixture = (timestamp - now) / 3600; // Convert seconds to hours

    if (config.isLive(fixture)) {
      score += 1000; // Live matches
    } else if (config.isRecent(fixture)) {
      score += 500; // Recent matches
    } else if (config.isUpcoming(fixture)) {
      // Prioritize matches happening sooner
      if (hoursUntilFixture <= 24) {
        score += 300; // Next 24 hours
      } else if (hoursUntilFixture <= 48) {
        score += 200; // 24-48 hours
      } else if (hoursUntilFixture <= 72) {
        score += 150; // 48-72 hours
      } else if (hoursUntilFixture <= 96) {
        score += 120; // 72-96 hours
      } else {
        score += 100; // 96-120 hours
      }
    }

    return score;
  }

  function isRecentFixture(fixtureTimestamp, hoursBefore) {
    const now = Math.floor(Date.now() / 1000); 
    const timeHoursAgo = hoursBefore * 60 * 60;
    return fixtureTimestamp > (now - timeHoursAgo); // // Check if the match time is within the specified time range
  }

  function isUpcomingFixture(fixtureTimestamp) {
    const now = Math.floor(Date.now() / 1000);
    const fiveDaysLater = now + (5 * 24 * 60 * 60);

    return fixtureTimestamp >= now && fixtureTimestamp <= fiveDaysLater;
  }

  function filterFixtures(fixtures, sport) {
    const currentSport = sport;
    const config = sportConfig[currentSport];
    return fixtures.filter(fixture => {
      const leagueCode = config.leagueCode(fixture);
      const allowedLeague = config.allowedLeagues.includes(leagueCode);
      const timeFormat = config.time(fixture);
      const timestamp = Math.floor(new Date(timeFormat).getTime() / 1000);
      const isLive = config.isLive(fixture);
      const isRecent = config.isRecent(fixture, timestamp);
      const isUpcoming = config.isUpcoming(fixture, timestamp);

      return allowedLeague && (isLive || isRecent || isUpcoming);
    })
  }

  function sortFixtures(fixtures, sport) {
    const currentSport = sport;
    const config = sportConfig[currentSport];

    return fixtures
      .map(fixture => ({ ...fixture, priority: calculateFixturePriority(fixture, sport), }))
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

  function filterFixturesByStatus(fixtures, filterStatus, sport) {
    const currentSport = sport;
    const config = sportConfig[currentSport];
    if (!filterStatus) return fixtures; // Return all matches if no filter

    return fixtures.filter(fixture => {
      const timeFormat = config.time(fixture);
      const timestamp = Math.floor(new Date(timeFormat).getTime() / 1000);

      switch (filterStatus) {
        case 'LIVE':
          return config.isLive(fixture);
        case 'FINISHED':
          return config.isRecent(fixture, timestamp);
        case 'UPCOMING':
          return config.isUpcoming(fixture, timestamp);
        default:
          return true;
      }
    });
  }

  function displaySport(fixtures, sportToDisplay) {
    const currentConfig = sportConfig[sportToDisplay];
    mainContainer.classList.add('hidden');
    mainContainer.classList.remove('visible');
    motorsportContainer.classList.add('hidden');
    motorsportContainer.classList.remove('visible');


    if(isTeamSport(sportToDisplay)){

      mainContainer.classList.remove('hidden');
      mainContainer.classList.add('visible');
      liveScoresDiv.innerHTML = '';

    } else if(sportToDisplay === 'motorsport') {

      motorsportContainer.classList.remove('hidden');
      motorsportContainer.classList.add('visible');

    }

    if (!currentConfig) {
      liveScoresDiv.innerHTML = '<p>No sport configuration found.</p>';
      return;
    }
    if (fixtures.length === 0) {
      liveScoresDiv.innerHTML = '<p>No fixtures available at the moment.</p>';
      return;
    }

    const template = document.querySelector(`#${currentConfig.templateId}`);
    if (!template) {
      liveScoresDiv.innerHTML = `<p>Template not found for ${currentConfig.templateId}</p>`;
      return;
    }

    fixtures.forEach(fixture => {
      const cardClone = template.content.cloneNode(true);
      currentConfig.populateCard(cardClone.firstElementChild, fixture);
      isTeamSport(sportToDisplay)
      ? liveScoresDiv.appendChild(cardClone)
      : motorsportRaceCardContainer.appendChild(cardClone);
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
      isRecent: (match, timestamp) => match.status === "FINISHED" && isRecentFixture(timestamp, 24),
      isUpcoming: (match, timestamp) => (match.status === "TIMED" || match.status === "SCHEDULED") && isUpcomingFixture(timestamp),
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
      isRecent: (match, timestamp) => match.matchEnded && isRecentFixture(timestamp, 32),
      isUpcoming: (match, timestamp) => (match.matchStarted === false) && isUpcomingFixture(timestamp),
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
        cardClone.querySelector('.cricket-home-team-logo')?.setAttribute('src', (cricketTeamLogos[homeTeamShortName] ?? '/assets/logos/fixture_logos/default-cricket-team.png'));
        cardClone.querySelector('.cricket-away-team-name').textContent = awayTeamShortName || match.teams[1];
        cardClone.querySelector('.cricket-away-team-logo')?.setAttribute('src', (cricketTeamLogos[awayTeamShortName] ?? '/assets/logos/fixture_logos/default-cricket-team.png'));
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
    motorsport: {
      templateId: 'motorsport-template',
      apiEndpoint: 'http://localhost:3000/api/races/motorsport',
      isStatus: race => {
        const now = Date.now();
        const raceTime = new Date(race.time).getTime();
        const raceDuration = 3 * 60 * 60 * 1000;
        let status;
        if((now >= raceTime && now <= (raceTime + raceDuration))) {
          return status = 'Live';
        } else if((now > (raceTime + raceDuration))) {
          return status = 'Finished';
        } else return status = 'Upcoming';          
      },
      populateCard: function(cardClone, race) {
        const raceStatus = this.isStatus(race);
        const raceCountry = race.Circuit?.Location?.country;
        const raceName = race.raceName;
        const circuitName = race.Circuit?.circuitName;
        const racePractice1Day = new Date(race.FirstPractice?.date).getDate();
        const raceDate = new Date(race.date).getDate(); 
        

        cardClone.querySelector('.round-info').textContent = `Round ${race.round}`;
        cardClone.querySelector('.round-status').textContent = raceStatus;
        cardClone.querySelector('.country-flag')?.setAttribute('src', (motorsportCountryLogos[raceCountry]));
        cardClone.querySelector('.race-name').textContent = raceName;
        cardClone.querySelector('.circuit-name').textContent = circuitName;
        cardClone.querySelector('.race-schedule').textContent = `${racePractice1Day} - ${raceDate}`;
      },
    }
  }

  //fetching of fixtures from API
  async function fetchFixtures(sport) {
    activeSport = sport; // Updating the active sport state
    liveScoresDiv.innerHTML = '<div class="spinner"></div>';
    const { from, to } = getDateRange();
    const config = sportConfig[activeSport];

    //Sport configuration error
    if (!config) {
      console.error("Configuration not found for this sport");
      liveScoresDiv.innerHTML = 'Coming soon...';
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
      const fixtureProcessor = {
        football: () => {
          const sortedFixtureData = sortFixtures(filterFixtures(data.matches, 'football'), 'football');
          window.sortedFixtures = sortedFixtureData;
          return filterFixturesByStatus(sortedFixtureData, activeFilter);
        },
        cricket: () => {
          const sortedFixtureData = sortFixtures(filterFixtures(data.matches, 'cricket'), 'cricket');
          window.sortedFixtures = sortedFixtureData;
          return filterFixturesByStatus(sortedFixtureData, activeFilter);
        },
        motorsport: () => {
          const races = data.MRData.RaceTable.Races || [];
          return races;
        },
      };

      const fixturesToDisplay = fixtureProcessor[activeSport]?.() || [];
      console.log(fixturesToDisplay);
      displaySport(fixturesToDisplay, activeSport);

    } catch (error) {
      console.error('Error fetching fixtures:', error);
      liveScoresDiv.innerHTML = '<p class="error">Unable to load fixtures. Please try again later.</p>';
    }

  }

  // Sport Navigation Button Listeners
  sportNavButtons.forEach(sportCatButton => {
    sportCatButton.addEventListener('click', () => {
      const selectedSport = sportCatButton.id.replace('-card', '');
      fetchFixtures(selectedSport);
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

      // Refilter and display matches using the currently stored sortedFixtures and activeSport
      if (window.sortedFixtures) { // Make sure data has been fetched at least once
        const filteredByStatus = filterFixturesByStatus(window.sortedFixtures, activeFilter, activeSport);
        displaySport(filteredByStatus, activeSport); // Use the centrally stored activeSport
      } else {
        console.warn("No fixtures available at this moment.");
      }
    });
  });

  // --- Initial Fetch ---
  fetchFixtures(activeSport);

})


