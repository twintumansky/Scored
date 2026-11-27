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
