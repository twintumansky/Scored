// Motorsport specific configurations
const motorsportContainerButtons = document.querySelectorAll(
  ".motorsport-header-button",
);
const motorsportContainerStandingsButtons = document.querySelectorAll(
  ".motorsport-standings-container-info-buttons",
);
let motorsportActiveSection = "races";
let motorsportStandingsActiveSection = "drivers";
const motorsportCardContainer = document.querySelector(
  "#motorsport-card-container",
);

const motorsportConfig = {
  templateId: ["motorsport-races-template", "motorsport-standings-template"],
  apiEndpoint: "http://localhost:3000/api/races/motorsport",
  // isStatus: (race) => {
  //   const now = Date.now();
  //   const raceTime = new Date(race.time).getTime();
  //   const raceDuration = 3 * 60 * 60 * 1000;

  //   if (now >= raceTime && now <= raceTime + raceDuration) {
  //     return (status = "Live");
  //   } else if (now > raceTime + raceDuration) {
  //     return (status = "Finished");
  //   } else return (status = "Upcoming");
  // },
  populateCard: function (cardClone, race) {
    const driverId = race.Driver?.driverId;
    if (motorsportActiveSection === "races") {
      const motorsportRoundWinner = cardClone.querySelector(
        ".motorsport-round-winner-container",
      );
      motorsportRoundWinner.style.display = "none";
      const raceCountry = race.Circuit?.Location?.country;
      const raceName = race.raceName.split(" ")[0];

      const raceDate = new Date(race.date).getDate();
      const raceMonth = new Date(race.date).toLocaleDateString("en-US", {
        month: "short",
      });
      const raceResult = race.winner
        ? `${race.winner.driver.givenName} ${race.winner.driver.familyName}`
        : "TBD";

      cardClone
        .querySelector(".country-flag-logo")
        ?.setAttribute("src", motorsportCountryLogos[raceCountry]);

      cardClone.querySelector(".motorsport-race-name").textContent =
        `${raceName} GP`;

      cardClone.querySelector(".motorsport-race-date").textContent =
        `${raceDate} ${raceMonth}`;

      if (race.winner) {
        motorsportRoundWinner.style.display = "flex";
        cardClone.querySelector("#motorsport-round-winner").textContent =
          raceResult;
      }
    } else if (
      motorsportActiveSection === "standings" &&
      motorsportStandingsActiveSection === "drivers"
    ) {
      document.querySelector(
        "#motorsport-standings-container-entity-info",
      ).textContent = "Drivers";

      cardClone.querySelector(
        "#motorsport-standings-main-container-pos-info",
      ).textContent = race.position || "NA";

      cardClone
        .querySelector("#motorsport-standings-main-container-entity-img")
        ?.setAttribute("src", driverImages[driverId]);

      cardClone.querySelector(
        "#motorsport-standings-main-container-entity-info",
      ).textContent = race.Driver
        ? `${race.Driver.givenName} ${race.Driver.familyName}`
        : "Unknown Driver";

      cardClone.querySelector(
        "#motorsport-standings-main-container-wins-info",
      ).textContent = race.wins || "0";

      cardClone.querySelector(
        "#motorsport-standings-main-container-points-info",
      ).textContent = race.points || "0";
    } else if (
      motorsportActiveSection === "standings" &&
      motorsportStandingsActiveSection === "teams"
    ) {
      document.querySelector(
        "#motorsport-standings-container-entity-info",
      ).textContent = "Team";

      cardClone.querySelector(
        "#motorsport-standings-main-container-pos-info",
      ).textContent = race.position || "NA";

      const constructorId = race.Constructor?.constructorId;
      cardClone
        .querySelector("#motorsport-standings-main-container-entity-img")
        ?.setAttribute("src", constructorLogos[constructorId]);

      cardClone.querySelector(
        "#motorsport-standings-main-container-entity-info",
      ).textContent = race.Constructor?.name || "Unknown Team";

      cardClone.querySelector(
        "#motorsport-standings-main-container-wins-info",
      ).textContent = race.wins || "0";

      cardClone.querySelector(
        "#motorsport-standings-main-container-points-info",
      ).textContent = race.points || "0";
    }
  },
};
