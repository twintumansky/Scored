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
