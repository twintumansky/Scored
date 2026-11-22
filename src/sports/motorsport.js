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

const motorsportConfig = {};
