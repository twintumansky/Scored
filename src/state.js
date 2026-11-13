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
