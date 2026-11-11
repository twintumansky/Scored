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
