// // League priority map (using competition codes)
// const leaguePriorities = {
//   CL: 100, // UEFA Champions League
//   PL: 90, // Premier League
//   PD: 80, // La Liga (Primera División)
//   BL1: 70, // Bundesliga
//   default: 50, //for default matches(not avaiable in free tier)
// };

// // List of allowed league codes
// const allowedLeagues = ['CL', 'PL', 'PD', 'BL1'];

// // Wait for DOM to be fully loaded
// document.addEventListener('DOMContentLoaded', () => {
//   const template = document.querySelector('#fixture-card-template');
//   const liveScoresDiv = document.querySelector('#fixtures-container');
//   const statusButtons = document.querySelectorAll('.container-buttons');
//   let activeFilter = null; // Track current filter

//   // Function to get date range for today and next 3 days
//   function getDateRange() {
//     const today = new Date();
//     const fiveDaysLater = new Date(today);
//     fiveDaysLater.setDate(today.getDate() + 5);

//     const formatDate = (date) => date.toISOString().split('T')[0];
//     return { from: formatDate(today), to: formatDate(fiveDaysLater) };
//   }

//   // Add click handlers to status buttons
//   statusButtons.forEach(button => {
//     button.addEventListener('click', () => {
//       const status = button.textContent.trim().toUpperCase();

//       // Toggle active state
//       if (activeFilter === status) {
//         // Clicking active button again removes filter
//         activeFilter = null;
//         button.classList.remove('active');
//       } else {
//         // Remove active class from all buttons
//         statusButtons.forEach(btn => btn.classList.remove('active'));
//         // Set new active filter and highlight button
//         activeFilter = status;
//         button.classList.add('active');
//       }

//       // Refilter and display matches
//       const filteredMatches = filterMatchesByStatus(sortedMatches, activeFilter);
//       displayLiveScores(filteredMatches);
//     });
//   });

//   // New function to filter matches by status
//   function filterMatchesByStatus(matches, filterStatus) {
//     if (!filterStatus) return matches; // Return all matches if no filter

//     return matches.filter(match => {
//       const status = match.status;
//       const timestamp = Math.floor(new Date(match.utcDate).getTime() / 1000);

//       switch (filterStatus) {
//         case 'LIVE':
//           return status === 'IN_PLAY' || status === 'PAUSED';
//         case 'FINISHED':
//           return status === 'FINISHED' && isRecentMatch(timestamp);
//         case 'UPCOMING':
//           return (status === 'SCHEDULED' || status === 'TIMED') && isUpcomingMatch(timestamp);
//         default:
//           return true;
//       }
//     });
//   }

//   // Function to fetch matches
//   async function fetchMatches() {
//     liveScoresDiv.innerHTML = '<div class="spinner"></div>';
//     const { from, to } = getDateRange();

//     // Use the proxy server URL instead
//     let url = `http://localhost:3000/api/matches?dateFrom=${from}&dateTo=${to}`;

//     try {
//       const response = await fetch(url);
//       if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

//       const data = await response.json();
//       console.log('API Response:', data);

//       const filteredMatches = filterMatches(data.matches || []);
//       const sortedMatches = sortMatches(filteredMatches);

//       // Store sorted matches for reuse
//       window.sortedMatches = sortedMatches; // Store for reuse
//       // Apply any active filter
//       const finalMatches = filterMatchesByStatus(sortedMatches, activeFilter);
//       displayLiveScores(finalMatches);
//     } catch (error) {
//       console.error('Error fetching matches:', error);
//       liveScoresDiv.innerHTML = '<p class="error">Unable to load matches. Please try again later.</p>';
//     }
//   }

//   // Function to filter matches by league and status
//   function filterMatches(matches) {
//     return matches.filter(match => {
//       const leagueCode = match.competition?.code;
//       const status = match.status;
//       const timestamp = Math.floor(new Date(match.utcDate).getTime() / 1000);

//       // Check if league is allowed
//       const isAllowedLeague = allowedLeagues.includes(leagueCode);

//       // Check if match is live, recently concluded, or upcoming
//       const isLive = status === 'IN_PLAY' || status === 'PAUSED';
//       const isRecent = status === 'FINISHED' && isRecentMatch(timestamp);
//       const isUpcoming = (status === 'SCHEDULED' || status === 'TIMED') && isUpcomingMatch(timestamp);

//       return isAllowedLeague && (isLive || isRecent || isUpcoming);
//     });
//   }

//   // Helper functions for time-based checks
//   function isRecentMatch(timestamp) {
//     const now = Math.floor(Date.now() / 1000)
//     const twentyFourHoursAgo = now - (24 * 60 * 60);
//     return timestamp > twentyFourHoursAgo;
//   }

//   function isUpcomingMatch(timestamp) {
//     const now = Math.floor(Date.now() / 1000);
//     const inFiveDays = now + (5 * 24 * 60 * 60);
//     return timestamp >= now && timestamp <= inFiveDays;
//   }

//   // Function to calculate match priority score
//   function calculateMatchPriority(match) {
//     let score = 0;

//     // League priority
//     const leagueCode = match.competition?.code;
//     score += leaguePriorities[leagueCode] || leaguePriorities.default;

//     // Status priority
//     const status = match.status;
//     const timestamp = Math.floor(new Date(match.utcDate).getTime() / 1000);
//     const now = Math.floor(Date.now() / 1000);
//     const hoursUntilMatch = (timestamp - now) / 3600; // Convert seconds to hours

//     if (status === 'IN_PLAY' || status === 'PAUSED') {
//       score += 1000; // Live matches
//     } else if (status === 'FINISHED' && isRecentMatch(timestamp)) {
//       score += 500; // Recent matches
//     } else if ((status === 'SCHEDULED' || status === 'TIMED') && isUpcomingMatch(timestamp)) {
//       // Prioritize matches happening sooner
//       if (hoursUntilMatch <= 24) {
//         score += 300; // Next 24 hours
//       } else if (hoursUntilMatch <= 48) {
//         score += 200; // 24-48 hours
//       } else if (hoursUntilMatch <= 72) {
//         score += 150; // 48-72 hours
//       } else if (hoursUntilMatch <= 96) {
//         score += 120; // 72-96 hours
//       } else {
//         score += 100; // 96-120 hours
//       }
//     }

//     return score;
//   }

//   // Function to sort matches
//   function sortMatches(matches) {
//     return matches
//       .map(match => ({ ...match, priority: calculateMatchPriority(match) }))
//       .sort((a, b) => {
//         if (b.priority !== a.priority) {
//           return b.priority - a.priority;
//         }
//         const aTime = Math.floor(new Date(a.utcDate).getTime() / 1000);
//         const bTime = Math.floor(new Date(b.utcDate).getTime() / 1000);
//         if (a.status === 'FINISHED') {
//           return bTime - aTime; // Newer first for recent
//         }
//         return aTime - bTime; // Sooner first for upcoming
//       });
//   }

//   // Function to display matches on the page
//   function displayLiveScores(matches) {
//     liveScoresDiv.innerHTML = '';

//     if (matches.length === 0) {
//       liveScoresDiv.innerHTML = '<p>No matches available.</p>';
//       return;
//     }

//     matches.forEach(match => {
//       const card = template.content.cloneNode(true);
//       card.querySelector('.home-team-logo')?.setAttribute('src', match.homeTeam?.crest ?? ' ');
//       card.querySelector('.away-team-logo')?.setAttribute('src', match.awayTeam?.crest ?? ' ');
//       card.querySelector('.home-team-name').textContent = match.homeTeam?.shortName ?? 'Unknown';
//       card.querySelector('.away-team-name').textContent = match.awayTeam?.shortName ?? 'Unknown';
//       card.querySelector('.home-team-score').textContent = match.score?.fullTime?.home ?? '0';
//       card.querySelector('.away-team-score').textContent = match.score?.fullTime?.away ?? '0';

//       card.querySelector('.status').textContent =
//         match.status === 'IN_PLAY' || match.status === 'PAUSED'
//           ? `Live`
//           : match.status === 'SCHEDULED' || match.status === 'TIMED'
//             ? 'Scheduled'
//             : match.status === 'FINISHED'
//               ? 'Finished'
//               : '';

//       card.querySelector('.league-name').textContent = match.competition?.name ?? 'Unknown League';
//       card.querySelector('.venue').textContent = match.venue ?? 'TBD';

//       // This section is for grouping of matches(by date) in the UI 
//       //     const date = new Date(match.utcDate).toDateString();
//       //     if (!groupedMatches[date]) {
//       //         groupedMatches[date] = [];
//       //     }
//       //     groupedMatches[date].push(match);
//       // });

//       // Display matches grouped by date
//       // Object.entries(groupedMatches).forEach(([date, dateMatches]) => {
//       // Create date header
//       // const dateHeader = document.createElement('h4');
//       // dateHeader.className = 'date-header';
//       // const matchDate = new Date(date);
//       // const today = new Date();
//       // const tomorrow = new Date(today);
//       // tomorrow.setDate(today.getDate() + 1);

//       // if (matchDate.toDateString() === today.toDateString()) {
//       //     dateHeader.textContent = 'Today';
//       // } else if (matchDate.toDateString() === tomorrow.toDateString()) {
//       //     dateHeader.textContent = 'Tomorrow';
//       // } else {
//       //     dateHeader.textContent = matchDate.toLocaleDateString('en-US', {
//       //         weekday: 'long',
//       //         month: 'short',
//       //         day: 'numeric'
//       //     });
//       // }
//       // liveScoresDiv.appendChild(dateHeader);

//       // // Create container for this date's matches
//       // const dateContainer = document.createElement('div');
//       // dateContainer.className = 'date-matches';

//       // Add matches for this date
//       // dateMatches.forEach(match => {
//       //     const card = template.content.cloneNode(true);

//       //     // Populate card with match data
//       //     card.querySelector('.home-team-logo')?.setAttribute('src', match.homeTeam?.crest ?? '');
//       //     card.querySelector('.away-team-logo')?.setAttribute('src', match.awayTeam?.crest ?? '');
//       //     card.querySelector('.home-team-name').textContent = match.homeTeam?.shortName ?? 'Unknown';
//       //     card.querySelector('.away-team-name').textContent = match.awayTeam?.shortName ?? 'Unknown';
//       //     card.querySelector('.home-team-score').textContent = match.score?.fullTime?.home ?? '-';
//       //     card.querySelector('.away-team-score').textContent = match.score?.fullTime?.away ?? '-';

//       //     // Modified status display logic
//       //     card.querySelector('.elapsed-time').textContent =
//       //       match.status === 'IN_PLAY' || match.status === 'PAUSED'
//       //         ? `LIVE`
//       //         : match.status === 'SCHEDULED' || match.status === 'TIMED'
//       //             ? formatMatchTime(match.utcDate) // New function to format match time
//       //             : match.status === 'FINISHED'
//       //                 ? 'Finished'
//       //                 : '';

//       //     card.querySelector('.league-name').textContent = match.competition?.name ?? 'Unknown League';
//       //     card.querySelector('.venue').textContent = match.venue ?? 'Unknown Venue';

//       //     dateContainer.appendChild(card);
//       // });

//       liveScoresDiv.appendChild(card);
//     });
//   }

//   // Add this new function to format match time
//   // function formatMatchTime(utcDate) {
//   //   const matchDate = new Date(utcDate);
//   //   const today = new Date();
//   //   const tomorrow = new Date(today);
//   //   tomorrow.setDate(today.getDate() + 1);
//   //   const dayAfterTomorrow = new Date(today);
//   //   dayAfterTomorrow.setDate(today.getDate() + 2);

//   //   // Format time
//   //   const timeString = matchDate.toLocaleTimeString('en-US', {
//   //       hour: '2-digit',
//   //       minute: '2-digit',
//   //       hour12: true
//   //   });

//   //   // Format date
//   //   const dateString = matchDate.toLocaleDateString('en-US', {
//   //       weekday: 'short', // Adds day name (e.g., "Mon")
//   //       month: 'short',
//   //       day: 'numeric'
//   //   });

//   //   // Check which day the match is on
//   //   if (matchDate.toDateString() === today.toDateString()) {
//   //       return `Today, ${timeString}`;
//   //   } else if (matchDate.toDateString() === tomorrow.toDateString()) {
//   //       return `Tomorrow, ${timeString}`;
//   //   } else if (matchDate.toDateString() === dayAfterTomorrow.toDateString()) {
//   //       return `Day after tomorrow, ${timeString}`;
//   //   } else {
//   //       return `${dateString}, ${timeString}`;
//   //   }
//   // }

//   // Fetch matches when the page loads
//   fetchMatches();

// });

//Config-driven-logic

document.addEventListener('DOMContentLoaded', () => {
  const liveScoresDiv = document.querySelector('#fixtures-container');
  const statusButtons = document.querySelectorAll('.container-buttons');
  let activeFilter = null; // Track current filter

  
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

  const sportConfig = {
    football: {
      templateId: 'football-template',
      apiEndpoint: 'http://localhost:3000/api/matches',
      allowedLeagues: ['CL', 'PL', 'PD', 'BL1'],
      leaguePriorities: { CL: 100, PL: 90, PD: 80, BL1: 70, default: 50 },
      populateCard: function (cardClone, match) {
        cardClone.querySelector('.home-team-logo')?.setAttribute('src', match.homeTeam.crest);
        cardClone.querySelector('.away-team-logo')?.setAttribute('src', match.awayTeam.crest);
        cardClone.querySelector('.home-team-name').textContent = match.homeTeam.shortName;
        cardClone.querySelector('.away-team-name').textContent = match.awayTeam.shortName;
        cardClone.querySelector('.league-name').textContent = match.competition.name;
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
  }

  let currentSport = "football"; //Default Sport

  //fetching of matches from API
  async function fetchMatches(sport = currentSport) {
    const currentSport = sport;
    console.log(currentSport);
    liveScoresDiv.innerHTML = '<div class="spinner"></div>';
    const { from, to } = getDateRange();
    const config = sportConfig[currentSport];
    console.log(config);

    //Sport configuration error
    if (!config) {
      console.error("Configuration not found for this sport");
      liveScoresDiv.innerHTML = 'The sport is not added to the app yet';
      return;
    }

    document.querySelectorAll('.nav-cards').forEach(btn => {
      btn.classList.toggle('active', btn.id === `${currentSport}-card`);
    });
    
    document.querySelectorAll('.nav-cards').forEach(sportCat => {
      sportCat.addEventListener('click', () => {
        const sportId = sportCat.id.replace('-card', '');
        fetchMatches(sportId);
      });
    });

    let url = `${config.apiEndpoint}?dateFrom=${from}&dateTo=${to}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error status - ${response.status}`);

      const data = await response.json();
      console.log('API Response:', data);

      const filteredMatches = filterMatches(data.matches, currentSport);
      const sortedMatches = sortMatches(filteredMatches, currentSport);

      window.sortedMatches = sortedMatches;
      const matchesByStatus = filterMatchesByStatus(sortedMatches, activeFilter);
      displayLiveScores(matchesByStatus, currentSport);
    } catch (error) {
      console.error('Error fetching matches:', error);
      liveScoresDiv.innerHTML = '<p class="error">Unable to load matches. Please try again later.</p>';
    }

    statusButtons.forEach(button => {
      button.addEventListener('click', () => {
        const status = button.textContent.trim().toUpperCase();
  
        // Toggle active state
        if (activeFilter === status) {
          // Clicking active button again removes filter
          activeFilter = null;
          button.classList.remove('active');
        } else {
          // Remove active class from all buttons
          statusButtons.forEach(btn => btn.classList.remove('active'));
          // Set new active filter and highlight button
          activeFilter = status;
          button.classList.add('active');
        }
  
        // Refilter and display matches
        const filteredMatches = filterMatchesByStatus(sortedMatches, activeFilter);
        displayLiveScores(filteredMatches, currentSport);
      });
    });

  }

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

  function displayLiveScores(matches, sport) {
    const currentSport = sport;
    liveScoresDiv.innerHTML = '';
    const config = sportConfig[currentSport];

    if (!config) {
      liveScoresDiv.innerHTML = '<p>No sport configuration found.</p>';
      return;
    }
    if (matches.length === 0) {
      liveScoresDiv.innerHTML = '<p>No matches available.</p>';
      return;
    }

    const template = document.querySelector(`#${config.templateId}`);
    if (!template) {
      liveScoresDiv.innerHTML = `<p>Template not found: ${config.templateId}</p>`;
      return;
    }

    matches.forEach(match => {
      const cardClone = template.content.cloneNode(true);
      config.populateCard(cardClone.firstElementChild, match); // Pass the card element itself
      liveScoresDiv.appendChild(cardClone);
    });
  }


  fetchMatches(currentSport);

})


