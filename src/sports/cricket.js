const MATCH_STATUS = {
  LIVE: "Live",
  FINISHED: "Finished",
  UPCOMING: "Upcoming",
};
const FORMAT = { TEST: "Test", ODI: "ODI", T20: "T20" };
const DEFAULT_LOGO = "/assets/icons/default_cricket_icon.svg";
const FORMAT_ICONS = {
  [FORMAT.TEST]: "/assets/icons/cricket-icon-test.svg",
  [FORMAT.ODI]: "/assets/icons/cricket-icon-odi.svg",
  [FORMAT.T20]: "/assets/icons/cricket-icon-t20.svg",
};

const BADGE_RULES = [
  {
    type: "stumps",
    when: (m) =>
      m.status === MATCH_STATUS.LIVE && m.format === FORMAT.TEST && m.dayStumps,
    label: (m) => m.dayStumps,
  },
  {
    type: "live",
    when: (m) => m.status === MATCH_STATUS.LIVE,
    label: () => "Live",
  },
  {
    type: "finished",
    when: (m) => m.status === MATCH_STATUS.FINISHED,
    label: () => "Finished",
  },
];

const cricketConfig = {
  templateId: "cricket-template",
  apiEndpoint: "http://localhost:3000/api/matches/cricket",
  allowedLeagues: ["T20", "ODI", "Test"],
  leagueType: (match) => match.match_type,
  leaguePriorities: { Test: 300, ODI: 200, T20: 150, default: 50 },
  time: (match) => match.utc_date,
  isLive: (match) => match.match_status == "Live",
  isRecent: (match, timestamp) => {
    const formatTimeline = match.match_type == "Test" ? 120 : 24;
    return (
      match.match_status == "Finished" &&
      isRecentFixture(timestamp, formatTimeline)
    );
  },
  isUpcoming: (match, timestamp) =>
    match.match_status == "Upcoming" && isUpcomingFixture(timestamp),
  populateCard: function (cardClone, match) {
    const cricketHomeTeamScoreContainer = cardClone.querySelector(
      ".cricket-home-team-score-container",
    );
    const cricketAwayTeamScoreContainer = cardClone.querySelector(
      ".cricket-away-team-score-container",
    );
    const versusElement = cardClone.querySelector("#cricket-vs-element");
    const matchLiveStatusContainer = cardClone.querySelector(
      ".cricket-live-status-container",
    );
    const blinkingQuote = cardClone.querySelector(".cricket-blinking-quote");
    const cricketMatchStatus = cardClone.querySelector(".cricket-match-status");
    const scheduleContainer = cardClone.querySelector(".schedule-container");
    const homeTeam = match.team_a.trim();
    const homeTeamShortName = match.team_a_short;
    const awayTeam = match.team_b.trim();
    const awayTeamShortName = match.team_b_short;
    const formatType = match.match_type;
    const matchNo = match.matchs;
    const iconType =
      formatType == "Test"
        ? "/assets/icons/cricket-icon-test.svg"
        : formatType == "ODI"
          ? "/assets/icons/cricket-icon-odi.svg"
          : "/assets/icons/cricket-icon-t20.svg";
    const venueInfo = match.venue?.split(",")[1] ?? "TBD";
    const matchTimestampSeconds = Math.floor(
      new Date(match.utc_date).getTime() / 1000,
    );

    cardClone.querySelector(".cricket-competition-info").textContent =
      `${homeTeam} vs ${awayTeam}, ${matchNo}` ?? "NA";
    cardClone.querySelector(".cricket-series-info").textContent = match?.series;
    cardClone.querySelector(".cricket-home-team-name").textContent =
      homeTeamShortName;
    cardClone
      .querySelector(".cricket-home-team-logo")
      ?.setAttribute(
        "src",
        teamSportAssets[homeTeam] ??
          match.team_a_img ??
          "/assets/icons/default_cricket_icon.svg",
      );
    cardClone.querySelector(".cricket-away-team-name").textContent =
      awayTeamShortName;
    cardClone
      .querySelector(".cricket-away-team-logo")
      ?.setAttribute(
        "src",
        teamSportAssets[awayTeam] ??
          match.team_b_img ??
          "/assets/icons/default_cricket_icon.svg",
      );
    cardClone
      .querySelector(".cricket-format-icon")
      ?.setAttribute("src", iconType ?? "/assets/icons/cricket-icon-test.svg");
    cardClone.querySelector(".cricket-format-name").textContent =
      formatType ?? "NA";
    cardClone.querySelector(".cricket-venue-name").textContent = venueInfo;

    if (this.isLive(match) || this.isRecent(match, matchTimestampSeconds)) {
      const homeTeamScore = (match.team_a_scores || null)?.split("&") ?? [];
      const homeTeamOver = (match.team_a_over || null)?.split("&") ?? [];
      const homeTeamRuns =
        homeTeamScore.length == 2
          ? {
              firstInngsRuns: homeTeamScore[0].replace("-", "/"),
              secondInngsRuns: homeTeamScore[1].replace("-", "/"),
            }
          : {
              firstInngsRuns:
                homeTeamScore[0]?.replace("-", "/") || "Yet to bat",
              secondInngsRuns: "",
            };
      const homeTeamOvers =
        homeTeamOver.length == 2
          ? {
              firstInngsOvers: homeTeamOver[0].trim(),
              secondInngsOvers: homeTeamOver[1].trim(),
            }
          : {
              firstInngsOvers: homeTeamOver[0] || "-",
              secondInngsOvers: "",
            };

      const awayTeamScore = (match.team_b_scores || null)?.split("&") ?? [];
      const awayTeamOver = (match.team_b_over || null)?.split("&") ?? [];
      const awayTeamRuns =
        awayTeamScore.length == 2
          ? {
              firstInngsRuns: awayTeamScore[0].replace("-", "/"),
              secondInngsRuns: awayTeamScore[1].replace("-", "/"),
            }
          : {
              firstInngsRuns:
                awayTeamScore[0]?.replace("-", "/") || "Yet to bat",
              secondInngsRuns: "",
            };
      const awayTeamOvers =
        awayTeamOver.length == 2
          ? {
              firstInngsOvers: awayTeamOver[0].trim(),
              secondInngsOvers: awayTeamOver[1].trim(),
            }
          : {
              firstInngsOvers: awayTeamOver[0] || "-",
              secondInngsOvers: "",
            };

      function updateScoreDisplay(
        teamScoreContainer,
        teamRuns,
        teamOvers,
        formatType,
      ) {
        teamScoreContainer.style.display = "block";
        const inngs1Col = teamScoreContainer.querySelector(".innings-1");
        const inngs2Col = teamScoreContainer.querySelector(".innings-2");

        inngs1Col.querySelector(".score-runs").textContent =
          teamRuns.firstInngsRuns;
        inngs1Col.querySelector(".score-overs").textContent =
          `(${teamOvers.firstInngsOvers})`;

        const visualBreaker =
          teamScoreContainer.querySelectorAll(".innings-breaker");

        if (formatType == "Test" && (teamRuns.secondInngsRuns || null)) {
          visualBreaker.forEach((breaker) => {
            breaker.style.display = "block";
          });
          inngs2Col.querySelector(".score-runs").textContent =
            teamRuns.secondInngsRuns;
          inngs2Col.querySelector(".score-overs").textContent =
            `(${teamOvers.secondInngsOvers})`;
          inngs2Col.style.display = "flex";
        } else {
          visualBreaker.forEach((breaker) => {
            breaker.style.display = "none";
          });
          inngs2Col.style.display = "none";
        }
      }

      updateScoreDisplay(
        cricketHomeTeamScoreContainer,
        homeTeamRuns,
        homeTeamOvers,
        formatType,
      );
      updateScoreDisplay(
        cricketAwayTeamScoreContainer,
        awayTeamRuns,
        awayTeamOvers,
        formatType,
      );

      const match_status_str =
        match.need_run_ball || match.trail_lead || match.toss;
      const isTeam = match_status_str?.startsWith(homeTeam)
        ? homeTeam
        : awayTeam;
      const statusStr = match_status_str
        ?.slice(isTeam.length)
        .trim()
        .toLowerCase();
      const matchStatusText = `${isTeam} ${statusStr}`;
      cardClone.querySelector(".cricket-match-status").textContent =
        matchStatusText || match.result || "Status not updated";

      versusElement.style.display = "none";
      matchLiveStatusContainer.style.display = "flex";
      blinkingQuote.style.display = "flex";
      if (match.match_status == "Finished") {
        matchLiveStatusContainer.style.display = "none";
        cardClone.querySelector(".finished-status-container").style.display =
          "flex";
        // cardClone.querySelector(".cricket-match-status").textContent =
        //   match.result;
      }
      scheduleContainer.style.display = "none";
      cricketMatchStatus.style.display = "block";
    } else {
      scheduleContainer.style.display = "flex";
      cricketHomeTeamScoreContainer.style.display = "none";
      cricketAwayTeamScoreContainer.style.display = "none";
      cricketMatchStatus.style.display = "none";

      const matchDate = new Date(match.utc_date);
      cardClone.querySelector(".scheduled-time").textContent =
        matchDate.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      cardClone.querySelector(".scheduled-day").textContent =
        matchDate.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
    }
  },
};
