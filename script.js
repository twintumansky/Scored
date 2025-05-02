// League priority map (using competition codes)
const leaguePriorities = {
    CL: 100, // UEFA Champions League
    PL: 90, // Premier League
    PD: 80, // La Liga (Primera División)
    BL1: 70, // Bundesliga
    default: 50, //for default matches(not avaiable in free tier)
  };

// List of allowed league codes
const allowedLeagues = ['CL', 'PL', 'PD', 'BL1'];

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  const template = document.querySelector('#fixture-card-template');
  const liveScoresDiv = document.querySelector('#football-fixture-cards');

  // Function to get date range for today and next 3 days
  function getDateRange() {
    const today = new Date();
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);
    
    const formatDate = (date) => date.toISOString().split('T')[0];
    return { from: formatDate(today), to: formatDate(threeDaysLater) };
  }

  // Function to fetch matches
  async function fetchMatches() {
    liveScoresDiv.innerHTML = '<div class="spinner"></div>';
    const { from, to } = getDateRange();
    
    // Use the proxy server URL instead
    let url = `http://localhost:3000/api/matches?dateFrom=${from}&dateTo=${to}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

      const data = await response.json();
      console.log('API Response:', data);

      const filteredMatches = filterMatches(data.matches || []);
      const sortedMatches = sortMatches(filteredMatches);
      displayLiveScores(sortedMatches);
    } catch (error) {
      console.error('Error fetching matches:', error);
      liveScoresDiv.innerHTML = '<p class="error">Unable to load matches. Please try again later.</p>';
    }
  }

  // Function to filter matches by league and status
  function filterMatches(matches) {
    return matches.filter(match => {
      const leagueCode = match.competition?.code;
      const status = match.status;
      const timestamp = Math.floor(new Date(match.utcDate).getTime() / 1000);

      // Check if league is allowed
      const isAllowedLeague = allowedLeagues.includes(leagueCode);

      // Check if match is live, recently concluded, or upcoming
      const isLive = status === 'IN_PLAY' || status === 'PAUSED';
      const isRecent = status === 'FINISHED' && isRecentMatch(timestamp);
      const isUpcoming = (status === 'SCHEDULED' || status === 'TIMED') && isUpcomingMatch(timestamp);

      return isAllowedLeague && (isLive || isRecent || isUpcoming);
    });
  }

  // Helper functions for time-based checks
  function isRecentMatch(timestamp) {
    const threeHoursAgo = Math.floor(Date.now() / 1000) - 3 * 60 * 60;
    return timestamp > threeHoursAgo;
  }

  function isUpcomingMatch(timestamp) {
    const now = Math.floor(Date.now() / 1000);
    const inThreeDays = now + (3 * 24 * 60 * 60);
    return timestamp >= now && timestamp <= inThreeDays;
  }

  // Function to calculate match priority score
  function calculateMatchPriority(match) {
    let score = 0;

    // League priority
    const leagueCode = match.competition?.code;
    score += leaguePriorities[leagueCode] || leaguePriorities.default;

    // Status priority
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
        } else {
            score += 100; // 48-72 hours
        }
    }

    return score;
  }

  // Function to sort matches
  function sortMatches(matches) {
    return matches
      .map(match => ({ ...match, priority: calculateMatchPriority(match) }))
      .sort((a, b) => {
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        const aTime = Math.floor(new Date(a.utcDate).getTime() / 1000);
        const bTime = Math.floor(new Date(b.utcDate).getTime() / 1000);
        if (a.status === 'FINISHED') {
          return bTime - aTime; // Newer first for recent
        }
        return aTime - bTime; // Sooner first for upcoming
      });
  }

  // Function to display matches on the page
  function displayLiveScores(matches) {
    liveScoresDiv.innerHTML = '';

    if (matches.length === 0) {
        liveScoresDiv.innerHTML = '<p>No matches available.</p>';
        return;
    }

    // Group matches by date
    // const groupedMatches = {};
    matches.forEach(match => {
      const card = template.content.cloneNode(true);
      card.querySelector('.home-team-logo')?.setAttribute('src', match.homeTeam?.crest ?? '');
      card.querySelector('.away-team-logo')?.setAttribute('src', match.awayTeam?.crest ?? '');
      card.querySelector('.home-team-name').textContent = match.homeTeam?.shortName ?? 'Unknown';
      card.querySelector('.away-team-name').textContent = match.awayTeam?.shortName ?? 'Unknown';
      card.querySelector('.home-team-score').textContent = match.score?.fullTime?.home ?? '-';
      card.querySelector('.away-team-score').textContent = match.score?.fullTime?.away ?? '-';

      card.querySelector('.status').textContent =
        match.status === 'IN_PLAY' || match.status === 'PAUSED'
          ? `Live`
          : match.status === 'SCHEDULED' || match.status === 'TIMED'
              ? "Scheduled" // New function to format match time
              : match.status === 'FINISHED'
                  ? 'Finished'
                  : '';

      card.querySelector('.league-name').textContent = match.competition?.name ?? 'Unknown League';
      card.querySelector('.venue').textContent = match.venue ?? 'Unknown Venue';
      
    //     const date = new Date(match.utcDate).toDateString();
    //     if (!groupedMatches[date]) {
    //         groupedMatches[date] = [];
    //     }
    //     groupedMatches[date].push(match);
    // });

    // Display matches grouped by date
    // Object.entries(groupedMatches).forEach(([date, dateMatches]) => {
        // Create date header
        // const dateHeader = document.createElement('h4');
        // dateHeader.className = 'date-header';
        // const matchDate = new Date(date);
        // const today = new Date();
        // const tomorrow = new Date(today);
        // tomorrow.setDate(today.getDate() + 1);

        // if (matchDate.toDateString() === today.toDateString()) {
        //     dateHeader.textContent = 'Today';
        // } else if (matchDate.toDateString() === tomorrow.toDateString()) {
        //     dateHeader.textContent = 'Tomorrow';
        // } else {
        //     dateHeader.textContent = matchDate.toLocaleDateString('en-US', {
        //         weekday: 'long',
        //         month: 'short',
        //         day: 'numeric'
        //     });
        // }
        // liveScoresDiv.appendChild(dateHeader);

        // // Create container for this date's matches
        // const dateContainer = document.createElement('div');
        // dateContainer.className = 'date-matches';

        // Add matches for this date
        // dateMatches.forEach(match => {
        //     const card = template.content.cloneNode(true);

        //     // Populate card with match data
        //     card.querySelector('.home-team-logo')?.setAttribute('src', match.homeTeam?.crest ?? '');
        //     card.querySelector('.away-team-logo')?.setAttribute('src', match.awayTeam?.crest ?? '');
        //     card.querySelector('.home-team-name').textContent = match.homeTeam?.shortName ?? 'Unknown';
        //     card.querySelector('.away-team-name').textContent = match.awayTeam?.shortName ?? 'Unknown';
        //     card.querySelector('.home-team-score').textContent = match.score?.fullTime?.home ?? '-';
        //     card.querySelector('.away-team-score').textContent = match.score?.fullTime?.away ?? '-';
            
        //     // Modified status display logic
        //     card.querySelector('.elapsed-time').textContent =
        //       match.status === 'IN_PLAY' || match.status === 'PAUSED'
        //         ? `LIVE`
        //         : match.status === 'SCHEDULED' || match.status === 'TIMED'
        //             ? formatMatchTime(match.utcDate) // New function to format match time
        //             : match.status === 'FINISHED'
        //                 ? 'Finished'
        //                 : '';

        //     card.querySelector('.league-name').textContent = match.competition?.name ?? 'Unknown League';
        //     card.querySelector('.venue').textContent = match.venue ?? 'Unknown Venue';

        //     dateContainer.appendChild(card);
        // });

        liveScoresDiv.appendChild(card);
    });
  }

  // Add this new function to format match time
  // function formatMatchTime(utcDate) {
  //   const matchDate = new Date(utcDate);
  //   const today = new Date();
  //   const tomorrow = new Date(today);
  //   tomorrow.setDate(today.getDate() + 1);
  //   const dayAfterTomorrow = new Date(today);
  //   dayAfterTomorrow.setDate(today.getDate() + 2);
    
  //   // Format time
  //   const timeString = matchDate.toLocaleTimeString('en-US', {
  //       hour: '2-digit',
  //       minute: '2-digit',
  //       hour12: true
  //   });

  //   // Format date
  //   const dateString = matchDate.toLocaleDateString('en-US', {
  //       weekday: 'short', // Adds day name (e.g., "Mon")
  //       month: 'short',
  //       day: 'numeric'
  //   });

  //   // Check which day the match is on
  //   if (matchDate.toDateString() === today.toDateString()) {
  //       return `Today, ${timeString}`;
  //   } else if (matchDate.toDateString() === tomorrow.toDateString()) {
  //       return `Tomorrow, ${timeString}`;
  //   } else if (matchDate.toDateString() === dayAfterTomorrow.toDateString()) {
  //       return `Day after tomorrow, ${timeString}`;
  //   } else {
  //       return `${dateString}, ${timeString}`;
  //   }
  // }

  // Fetch matches when the page loads
  fetchMatches();

});