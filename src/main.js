document.addEventListener("DOMContentLoaded", async () => {
  async function fetchFixtures(sport) {
    activeSport = sport;
    const config = sportConfig[activeSport];
    const container = isTeamSport(sport)
      ? liveScoresDiv
      : motorsportCardContainer;

    await contentTransition(container, () => {
      if (!config) {
        container.innerHTML = getEmptyStateHTML(activeSport, "not_configured");
        footer.style.display = "none";
      } else {
        container.style.minHeight = "70vh";
        container.innerHTML = '<div class="preloader-spinner spinner"></div>';
      }
    });

    //For sport not configured yet
    if (!config) {
      return;
    }

    // Updating active class for sport nav buttons
    sportNavButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.id === `${activeSport}-card`);
    });

    motorsportContainerButtons.forEach((btn) => {
      btn.classList.toggle(
        "active",
        btn.id === `${activeSport}-${motorsportActiveSection}`,
      );
    });

    motorsportContainerStandingsButtons.forEach((btn) => {
      btn.classList.toggle(
        "active",
        btn.id ===
          `motorsport-standings-container-info-btn-${motorsportStandingsActiveSection}`,
      );
    });

    let url = `${config.apiEndpoint}`;

    try {
      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`HTTP error status - ${response.status}`);

      const data = await response.json();
      console.log(`API Response for ${activeSport}:`, data);
      const fixtureProcessor = {
        football: () => {
          const matches = Array.isArray(data.matches) ? data.matches : [];
          const sortedFixtureData = sortFixtures(
            filterFixtures(matches, "football"),
            "football",
          );
          window.sortedFixtures = sortedFixtureData;
          return filterFixturesByStatus(sortedFixtureData, activeFilter);
        },
        cricket: () => {
          const matches = Array.isArray(data.matches) ? data.matches : [];
          const sortedFixtureData = sortFixtures(
            filterFixtures(matches, "cricket"),
            "cricket",
          );
          window.sortedFixtures = sortedFixtureData;
          return filterFixturesByStatus(sortedFixtureData, activeFilter);
        },
        tennis: () => {
          const matches = Array.isArray(data.events) ? data.events : [];
          window.sortedFixtures = matches;
          return filterFixturesByStatus(matches, activeFilter);
        },
        basketball: () => {
          const matches = Array.isArray(data.events) ? data.events : [];
          window.sortedFixtures = matches;
          return filterFixturesByStatus(matches, activeFilter);
        },
        motorsport: () => {
          const motorsportData =
            motorsportActiveSection === "races"
              ? data?.mergedRaces
              : motorsportStandingsActiveSection === "drivers"
                ? data?.driverstandings?.MRData?.StandingsTable
                    ?.StandingsLists?.[0]?.DriverStandings
                : data?.constructorstandings?.MRData?.StandingsTable
                    ?.StandingsLists?.[0]?.ConstructorStandings;

          return motorsportData || [];
        },
      };

      const fixturesToDisplay = fixtureProcessor[activeSport]?.() || [];
      displaySport(fixturesToDisplay, activeSport);
    } catch (error) {
      console.error("Error fetching fixtures:", error);
      contentTransition(container, () => {
        container.innerHTML =
          '<p class="error">Unable to load fixtures. Please try again later.</p>';
      });
    }

    setStaticUIForSport(activeSport);
  }
});
