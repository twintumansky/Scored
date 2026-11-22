const footballConfig = {
  templateId: "football-template",
  apiEndpoint: "http://localhost:3000/api/matches/football",
  allowedLeagues: [
    "CL",
    "EC",
    "ELC",
    "PL",
    "PD",
    "BL1",
    "BSA",
    "CLI",
    "FL1",
    "SA",
    "PPL",
    "WC",
  ],
  leagueType: (match) => match.competition?.code,
  leaguePriorities: {
    WC: 150,
    CL: 100,
    PL: 90,
    PD: 80,
    BL1: 70,
    BSA: 60,
    PPL: 60,
    CLI: 50,
    default: 30,
  },
  time: (match) => match.utcDate,
  isLive: (match) => match.status === "IN_PLAY" || match.status === "PAUSED",
  isRecent: (match, timestamp) =>
    match.status === "FINISHED" && isRecentFixture(timestamp, 24),
  isUpcoming: (match, timestamp) =>
    (match.status === "TIMED" || match.status === "SCHEDULED") &&
    isUpcomingFixture(timestamp),
  populateCard: function (cardClone, match) {
    const footballVenue = match?.area?.name;
    const matchStage = match?.stage;
    let fixtureStage;
    switch (matchStage) {
      case "QUARTER_FINALS":
        fixtureStage = "Quater Final";
        break;
      case "SEMI_FINALS":
        fixtureStage = "Semi Final";
        break;
      case "THIRD_PLACE":
        fixtureStage = "Third Place";
        break;
      case "FINAL":
        fixtureStage = "Final";
        break;
      default:
        fixtureStage = "Regular Season";
    }

    cardClone
      .querySelector(".home-team-logo")
      ?.setAttribute(
        "src",
        teamSportAssets[match.homeTeam.shortName] ||
          match.homeTeam.crest ||
          "/assets/logos/fixture_logos/default.svg",
      );
    cardClone
      .querySelector(".away-team-logo")
      ?.setAttribute(
        "src",
        teamSportAssets[match.awayTeam.shortName] ||
          match.awayTeam.crest ||
          "/assets/logos/fixture_logos/default.svg",
      );

    cardClone.querySelector(".football-competition-info").textContent =
      `${match.homeTeam.shortName || "TBD"} vs ${match.awayTeam.shortName || "TBD"}, ${fixtureStage}` ??
      "TBD";
    cardClone.querySelector(".home-team-name").textContent =
      match.homeTeam.tla ?? "TBD";
    cardClone.querySelector(".away-team-name").textContent =
      match.awayTeam.tla ?? "TBD";
    cardClone
      .querySelector(".league-emblem")
      ?.setAttribute(
        "src",
        footballLeagueEmblem[match.competition.code] ||
          match.competition.emblem,
      );
    cardClone.querySelector(".league-name").textContent =
      match.competition.name;
    cardClone
      .querySelector(".venue-flag")
      ?.setAttribute("src", teamSportAssets[footballVenue]);
    cardClone.querySelector(".venue").textContent = footballVenue ?? "NA";
    const matchLiveStatusContainer = cardClone.querySelector(
      ".football-live-status-container",
    );
    const homeTeamScore = match.score?.fullTime?.home;
    const awayTeamScore = match.score?.fullTime?.away;
    const scoreContainer = cardClone.querySelector(".score-container");
    const versusElement = cardClone.querySelector("#football-vs-element");
    const statusTextElement = cardClone.querySelector(".football-match-status");

    if (match.status === "IN_PLAY" || match.status === "PAUSED") {
      scoreContainer.style.display = "flex";
      matchLiveStatusContainer.style.display = "flex";

      if (homeTeamScore === awayTeamScore) {
        statusTextElement.textContent = "Scores are equal";
      } else if (homeTeamScore > awayTeamScore) {
        statusTextElement.textContent = `${match.homeTeam.shortName} leads the match`;
      } else {
        statusTextElement.textContent = `${match.awayTeam.shortName} leads the match`;
      }

      cardClone.querySelector(".home-team-score").textContent =
        homeTeamScore ?? "0";
      cardClone.querySelector(".away-team-score").textContent =
        awayTeamScore ?? "0";
    } else if (match.status === "FINISHED") {
      if (homeTeamScore === awayTeamScore) {
        statusTextElement.textContent = "Match tied";
      } else if (homeTeamScore > awayTeamScore) {
        statusTextElement.textContent = `${match.homeTeam.shortName} won the match`;
      } else {
        statusTextElement.textContent = `${match.awayTeam.shortName} won the match`;
      }

      scoreContainer.style.display = "flex";
      matchLiveStatusContainer.style.display = "flex";
      matchLiveStatusContainer.textContent = "FT";
      matchLiveStatusContainer.style.color = "#be590b7d";
      matchLiveStatusContainer.style.backgroundColor = "#ebc3a47d";
      cardClone.querySelector(".home-team-score").textContent =
        match.score?.fullTime?.home ?? "0";
      cardClone.querySelector(".away-team-score").textContent =
        match.score?.fullTime?.away ?? "0";
    } else if (match.status === "SCHEDULED" || match.status === "TIMED") {
      matchLiveStatusContainer.style.display = "none";
      scoreContainer.style.display = "none";
      versusElement.style.display = "block";
      const matchDate = new Date(match.utcDate);
      const matchTime = matchDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      const matchDay = matchDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      statusTextElement.textContent = `${matchDay} at ${matchTime}`;
    } else {
      statusTextElement.textContent = match.status;
      scoreContainer.style.display = "none";
    }
  },
};
