function calculateFixturePriority(fixture, sport) {
  let score = 0;
  const currentSport = sport;
  const config = sportConfig[currentSport];
  const leagueCode = config.leagueType(fixture);
  score +=
    config.leaguePriorities[leagueCode] || config.leaguePriorities.default;

  const fixtureTime = config.time(fixture);
  const timestamp = Math.floor(new Date(fixtureTime).getTime() / 1000);
  const now = Math.floor(Date.now() / 1000);
  const hoursUntilFixture = (timestamp - now) / 3600;

  if (config.isLive(fixture)) {
    score += 1000;
  } else if (config.isRecent(fixture)) {
    score += 700;
  } else if (config.isUpcoming(fixture)) {
    if (hoursUntilFixture <= 6) {
      score += 300;
    } else if (hoursUntilFixture <= 24) {
      score += 200;
    } else if (hoursUntilFixture <= 48) {
      score += 150;
    } else if (hoursUntilFixture <= 72) {
      score += 100;
    } else if (hoursUntilFixture <= 96) {
      score += 50;
    } else {
      score += 25;
    }
  }
  return score;
}
