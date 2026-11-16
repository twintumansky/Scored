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
