const basketballConfig = {
  templateId: "basketball-template",
  apiEndpoint: "http://localhost:3000/api/events/basketball",
  time: (match) => new Date(match.startTimestamp * 1000).toISOString(),
  isLive: (match) => match.status.type === "inprogress",
  isRecent: (match, timestamp) => match.status.type === "finished",
  isUpcoming: (match, timestamp) => match.status.type === "notstarted",
  populateCard: function (cardClone, match) {
    const homeTeam = match.homeTeam.name;
    const homeTeamId = match.homeTeam.id;
    const awayTeam = match.awayTeam.name;
    const awayTeamId = match.awayTeam.id;
    const homeTeamShortName = match.homeTeam.nameCode;
    const awayTeamShortName = match.awayTeam.nameCode;
    const tournamentInfo = match.tournament.name;
    // const venue = match.tournament.category.country.name;

    const hometeamLogo =
      match.homeTeam.national && match.awayTeam.national
        ? teamSportAssets[`${match.homeTeam.country.name}`]
        : `https://img.sofascore.com/api/v1/team/${homeTeamId}/image`;
    const awayteamLogo =
      match.homeTeam.national && match.awayTeam.national
        ? teamSportAssets[`${match.awayTeam.country.name}`]
        : `https://img.sofascore.com/api/v1/team/${awayTeamId}/image`;

    cardClone.querySelector(".basketball-competition-info").textContent =
      `${homeTeam} vs ${awayTeam}`;
    cardClone.querySelector(".basketball-tournament-info").textContent =
      tournamentInfo;
    cardClone
      .querySelector(".basketball-home-team-logo")
      .setAttribute("src", hometeamLogo);
    cardClone
      .querySelector(".basketball-away-team-logo")
      .setAttribute("src", awayteamLogo);
    cardClone.querySelector(".basketball-home-team-name").textContent =
      homeTeamShortName;
    cardClone.querySelector(".basketball-away-team-name").textContent =
      awayTeamShortName;

    const homeQ1 = cardClone.querySelector("#home-q1");
    const awayQ1 = cardClone.querySelector("#away-q1");
    const homeQ2 = cardClone.querySelector("#home-q2");
    const awayQ2 = cardClone.querySelector("#away-q2");
    const homeQ3 = cardClone.querySelector("#home-q3");
    const awayQ3 = cardClone.querySelector("#away-q3");
    const homeQ4 = cardClone.querySelector("#home-q4");
    const awayQ4 = cardClone.querySelector("#away-q4");

    homeQ1.textContent = match.homeScore.period1 ?? "  ";
    awayQ1.textContent = match.awayScore.period1 ?? "  ";
    homeQ2.textContent = match.homeScore.period2 ?? "  ";
    awayQ2.textContent = match.awayScore.period2 ?? "  ";
    homeQ3.textContent = match.homeScore.period3 ?? "  ";
    awayQ3.textContent = match.awayScore.period3 ?? "  ";
    homeQ4.textContent = match.homeScore.period4 ?? "  ";
    awayQ4.textContent = match.awayScore.period4 ?? "  ";

    applyScoreStyling(
      homeQ1,
      match.homeScore.period1,
      awayQ1,
      match.awayScore.period1,
    );
    applyScoreStyling(
      homeQ2,
      match.homeScore.period2,
      awayQ2,
      match.awayScore.period2,
    );
    applyScoreStyling(
      homeQ3,
      match.homeScore.period3,
      awayQ3,
      match.awayScore.period3,
    );
    applyScoreStyling(
      homeQ4,
      match.homeScore.period4,
      awayQ4,
      match.awayScore.period4,
    );

    const homeFinal = cardClone.querySelector(".home-final-score");
    const awayFinal = cardClone.querySelector(".away-final-score");

    homeFinal.textContent = match.homeScore.current ?? "  ";
    awayFinal.textContent = match.awayScore.current ?? "  ";

    applyScoreStyling(
      homeFinal,
      match.homeScore.current,
      awayFinal,
      match.awayScore.current,
    );

    cardClone.querySelector(".basketball-match-status").textContent =
      match.status.description;
    cardClone
      .querySelector(".basketball-league-icon")
      .setAttribute("src", "/assets/icons/competition_icon.svg");
    cardClone.querySelector(".basketball-league-name").textContent =
      match.tournament.category.name;
    cardClone.querySelector(".basketball-venue-name").textContent =
      match.tournament.flag || `World`;
  },
};
