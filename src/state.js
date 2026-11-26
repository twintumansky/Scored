let activeFilter = null; // (Live, Upcoming, Finished)
let activeSport = "cricket"; // Selected sport

function filterFixtures(fixtures, sport) {
  const currentSport = sport;
  const config = sportConfig[currentSport];
  return fixtures.filter((fixture) => {
    const leagueType = config.leagueType(fixture);
    const allowedLeague = config.allowedLeagues.includes(leagueType);
    const timeFormat = config.time(fixture);
    const timestamp = Math.floor(new Date(timeFormat).getTime() / 1000);
    const isLive = config.isLive(fixture);
    const isRecent = config.isRecent(fixture, timestamp);
    const isUpcoming = config.isUpcoming(fixture, timestamp);

    return allowedLeague && (isLive || isRecent || isUpcoming);
  });
}

function sortFixtures(fixtures, sport) {
  const currentSport = sport;
  const config = sportConfig[currentSport];

  return fixtures
    .map((fixture) => ({
      ...fixture,
      priority: calculateFixturePriority(fixture, sport),
    }))
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
    });
}

function filterFixturesByStatus(fixtures, filterStatus, sport) {
  const currentSport = sport;
  const config = sportConfig[currentSport];
  if (!filterStatus) return fixtures;

  return fixtures.filter((fixture) => {
    const timeFormat = config.time(fixture);
    const timestamp = Math.floor(new Date(timeFormat).getTime() / 1000);

    switch (filterStatus) {
      case "LIVE":
        return config.isLive(fixture);
      case "FINISHED":
        return config.isRecent(fixture, timestamp);
      case "UPCOMING":
        return config.isUpcoming(fixture, timestamp);
      default:
        return true;
    }
  });
}

// UI at initial fetch
function setStaticUIForSport(sport) {
  // Hiding all main sport sections first
  document.querySelectorAll(".main-section").forEach((section) => {
    section.classList.remove("active");
    section.classList.add("hidden");
  });

  // Displaying the selected sport section
  const sectionToShow = isTeamSport(sport)
    ? document.querySelector(".team-sport-container")
    : document.querySelector(".motorsport-container");

  if (sectionToShow) {
    sectionToShow.classList.add("active");
    sectionToShow.classList.remove("hidden");
  }

  // Toggling sport-specific header images
  document.querySelectorAll(".sport-header-container").forEach((headerEl) => {
    const headerSport = headerEl.id.replace("-header-container", "");
    headerEl.style.display =
      headerSport === sport && isTeamSport(sport) ? "block" : "none";
  });

  // Toggling status buttons for sports with fixtures
  const statusButtonsContainer = document.querySelector(
    "#container-status-buttons",
  );
  const showStatusButtons = ["football", "cricket", "basketball"].includes(
    sport,
  );
  statusButtonsContainer.style.display = showStatusButtons ? "grid" : "none";
}

// (Live/Finished/Upcoming) Filtering logic
statusButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const status = button.textContent.trim().toUpperCase();

    if (activeFilter === status) {
      activeFilter = null;
      button.classList.remove("active");
    } else {
      statusButtons.forEach((btn) => btn.classList.remove("active"));
      activeFilter = status;
      button.classList.add("active");
    }

    // Refilter and display matches using the currently stored sortedFixtures and activeSport
    if (window.sortedFixtures) {
      // Make sure data has been fetched at least once
      const filteredByStatus = filterFixturesByStatus(
        window.sortedFixtures,
        activeFilter,
        activeSport,
      );
      // Use the centrally stored activeSport
      displaySport(filteredByStatus, activeSport);
    } else {
      console.warn("No fixtures available at this moment.");
    }
  });
});
