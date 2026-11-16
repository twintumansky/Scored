function displaySport(fixtures, sportToDisplay) {
  const container = isTeamSport(sportToDisplay)
    ? liveScoresDiv
    : motorsportCardContainer;

  contentTransition(container, () => {
    container.style.minHeight = "";
    const currentConfig = sportConfig[sportToDisplay];

    if (!fixtures || fixtures.length === 0) {
      container.innerHTML = getEmptyStateHTML(
        sportToDisplay,
        currentConfig ? "no_fixtures" : "not_configured",
      );
      footer.style.display = "none";
      return;
    }
    footer.style.display = "flex";

    const template = isTeamSport(sportToDisplay)
      ? document.querySelector(`#${currentConfig.templateId}`)
      : sportToDisplay === "motorsport" && motorsportActiveSection === "races"
        ? document.querySelector(`#${currentConfig.templateId[0]}`)
        : document.querySelector(`#${currentConfig.templateId[1]}`);

    if (!template) {
      container.innerHTML = `<p class="error">Template not found for ${currentConfig.templateId}</p>`;
      return;
    }

    container.innerHTML = "";
    fixtures.forEach((fixture) => {
      const cardClone = template.content.cloneNode(true);
      currentConfig.populateCard(cardClone.firstElementChild, fixture);
      container.appendChild(cardClone);
    });
  });
}
