require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();

app.use(cors());
app.use(express.static("./"));

// In-memory cache for motorsport data
const motorsportCache = {};
const CACHE_DURATION = 24 * 60 * 60 * 1000;
// In-memory cache for basketball data
const basketballCache = {
  data: null,
  timestamp: 0,
};
const BASKETBALL_CACHE_DURATION = 60 * 60 * 1000;

function parseCricketISTToUTC(dateWise, matchDate, matchTime) {
  try {
    const currentYear = new Date().getFullYear();
    let cleanDateStr = "";

    if (dateWise) {
      // Handles: "22 Jul 2026, Wednesday" -> "22 Jul 2026"
      cleanDateStr = dateWise.replace(/,\s*\w+$/, "").trim();
    } else if (matchDate) {
      // Handles: "25-Jul" -> "25 Jul 2026"
      cleanDateStr = `${matchDate.replace("-", " ")} ${currentYear}`;
    } else {
      return null;
    }

    // Default to midnight if time is missing or malformed
    const timeStr = matchTime || "12:00 AM";

    // Combine date + time + IST offset (+05:30)
    const istFullString = `${cleanDateStr} ${timeStr} +05:30`;
    const dateObj = new Date(istFullString);

    if (isNaN(dateObj.getTime())) {
      return null;
    }

    return dateObj.toISOString(); // e.g., "2026-07-22T07:30:00.000Z"
  } catch (error) {
    console.error("Error parsing match date:", error);
    return null;
  }
}

// Proxy endpoint for football data
app.get("/api/matches/football", async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const response = await fetch(
      `https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&competitions=2000,2001,2021,2014,2015,2016,2017,2018,2019,2002,2013,2152`,
      {
        headers: {
          "X-Auth-Token": process.env.FOOTBALL_API_KEY,
        },
      },
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Proxy Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy endpoint for fetching cricket data
app.get("/api/matches/cricket", async (req, res) => {
  // For cricapi endpoints
  // try {
  //   const endpoints = [
  //     `https://api.cricapi.com/v1/currentMatches?apikey=${process.env.CRICKET_API_KEY}&offset=0`,
  //     `https://api.cricapi.com/v1/matches?apikey=${process.env.CRICKET_API_KEY}&offset=0`,
  //   ];

  //   const cricketMatchData = endpoints.map((url) =>
  //     fetch(url).then((response) => {
  //       if (!response.ok) {
  //         throw new Error(`HTTP error: ${response.status} for ${url}`);
  //       }
  //       return response.json();
  //     }),
  //   );

  //   const settleMatchData = await Promise.allSettled(cricketMatchData);
  //   const combinedMatches = settleMatchData.flatMap((result) => {
  //     if (result.status === "fulfilled" && result.value.data) {
  //       return result.value.data;
  //     } else {
  //       if (result.status === "rejected") {
  //         console.error(`Failed to fetch cricket data:`, result.reason.message);
  //       }
  //       return [];
  //     }
  //   });
  //   res.json({ matches: combinedMatches });
  // } catch (error) {
  //   console.error("General Proxy Error in /api/matches/cricket:", error);
  //   res
  //     .status(500)
  //     .json({ error: "An unexpected error occurred on the server." });
  // }

  // For rapidapi/cricket endpoints
  const endpoints = [
    "https://cricket-live-line1.p.rapidapi.com/liveMatches",
    "https://cricket-live-line1.p.rapidapi.com/upcomingMatches",
    "https://cricket-live-line1.p.rapidapi.com/recentMatches",
  ];

  const options = {
    method: "GET",
    headers: {
      "x-rapidapi-key": `${process.env.CRICKET_API_KEY_NEW}`,
      "x-rapidapi-host": "cricket-live-line1.p.rapidapi.com",
      "Content-Type": "application/json",
    },
  };

  try {
    const cricketMatchData = endpoints.map((url) =>
      fetch(url, options).then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status} for ${url}`);
        }
        return response.json();
      }),
    );

    const settleMatchData = await Promise.allSettled(cricketMatchData);
    const combinedMatches = settleMatchData.flatMap((result) => {
      if (result.status === "fulfilled" && result.value.data) {
        return result.value.data;
      } else {
        if (result.status === "rejected") {
          console.error(`Failed to fetch cricket data:`, result.reason.message);
        }
        return [];
      }
    });

    const normalizedMatches = combinedMatches.map((match) => {
      const utcDate = parseCricketISTToUTC(
        match.date_wise,
        match.match_date,
        match.match_time,
      );

      return {
        ...match,
        utc_date: utcDate, // Added standardized UTC ISO string key
      };
    });

    res.json({ matches: normalizedMatches });
    console.log(`The combined matces are: ${normalizedMatches}`);
  } catch (error) {
    console.error("General Proxy Error in /api/matches/cricket:", error);
    res
      .status(500)
      .json({ error: "An unexpected error occurred on the server." });
  }
});

// Proxy endpoint for fetching motorsport data
app.get("/api/races/motorsport", async (req, res) => {
  try {
    const { dateFrom } = req.query;
    const dateYear = dateFrom.split("-")[0];

    //Checking the motorsport in-memory cache first
    const cachedEntry = motorsportCache[dateYear];
    if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_DURATION) {
      console.log(`Serving motorsport data for ${dateYear} from cache.`);
      return res.json(cachedEntry.data);
    }

    // Helper function to fetch all paginated results
    const fetchAllResults = async (baseUrl) => {
      const allResults = [];
      let offset = 0;
      const limit = 100;
      let hasMoreData = true;

      while (hasMoreData) {
        const url = `${baseUrl}?limit=${limit}&offset=${offset}`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status} for ${url}`);
        }

        const data = await response.json();
        const races = data?.MRData?.RaceTable?.Races || [];

        if (races.length === 0) {
          hasMoreData = false;
        } else {
          allResults.push(...races);
          offset += limit;

          // Safety check to prevent infinite loops
          if (offset > 1000) {
            console.warn("Reached maximum offset, stopping pagination");
            hasMoreData = false;
          }
        }
      }

      return allResults;
    };

    const endpoints = {
      races: `https://api.jolpi.ca/ergast/f1/${dateYear}/races`,
      driverstandings: `https://api.jolpi.ca/ergast/f1/${dateYear}/driverstandings`,
      constructorstandings: `https://api.jolpi.ca/ergast/f1/${dateYear}/constructorstandings`,
    };

    // Fetch races and standings in parallel
    const promises = Object.values(endpoints).map((url) =>
      fetch(url).then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status} for ${url}`);
        }
        return response.json();
      }),
    );

    // Fetch all race results with pagination
    const resultsPromise = fetchAllResults(
      `https://api.jolpi.ca/ergast/f1/${dateYear}/results`,
    );

    const [
      racesData,
      driverStandingsData,
      constructorStandingsData,
      allResults,
    ] = await Promise.all([...promises, resultsPromise]);

    const responseData = {
      races: racesData,
      driverstandings: driverStandingsData,
      constructorstandings: constructorStandingsData,
      results: { MRData: { RaceTable: { Races: allResults } } },
    };

    // Merging races with results to include race-winner data
    if (responseData.races && responseData.results) {
      const races = responseData.races?.MRData?.RaceTable?.Races || [];
      const raceResults = responseData.results?.MRData?.RaceTable?.Races || [];

      console.log(
        `Fetched ${races.length} races and ${raceResults.length} results`,
      );

      // Creating a map of race results by round for quick lookup
      const resultsMap = {};
      raceResults.forEach((race) => {
        resultsMap[race.round] = race;
      });

      // Merging winner data into the races data
      const mergedRaces = races.map((race) => {
        const raceResult = resultsMap[race.round];
        if (raceResult && raceResult.Results && raceResult.Results.length > 0) {
          return {
            ...race,
            winner: {
              driver: raceResult.Results[0].Driver,
              constructor: raceResult.Results[0].Constructor,
              time: raceResult.Results[0].Time?.time || "N/A",
              fastestLap: raceResult.Results[0].FastestLap,
            },
          };
        }
        return race;
      });

      responseData.mergedRaces = mergedRaces;
      console.log(
        `Merged ${mergedRaces.filter((r) => r.winner).length} races with winner data`,
      );
    }

    //Caching the motorsport response before sending
    motorsportCache[dateYear] = {
      timestamp: Date.now(),
      data: responseData,
    };

    res.json(responseData);
  } catch (error) {
    console.error("Proxy Error in /api/races/motorsport:", error);
    res.status(500).json({ error: "Failed to fetch motorsport races" });
  }
});

// Proxy endpoint for fetching basketball data
app.get("/api/events/basketball", async (req, res) => {
  const now = date.now();

  //Checking the basketball in-memory cache first
  if (
    basketballCache.data &&
    Date.now() - basketballCache.timestamp < BASKETBALL_CACHE_DURATION
  ) {
    console.log("Serving basketball data from cache.");
    return res.json(basketballCache.data);
  }

  //formulating a three day window for cumulative fetching of basketball data
  const dates = [];
  const today = new Date();

  //today
  dates.push(today.toISOString().split("T")[0]);
  //previous day
  const previousDay = new Date(today);
  previousDay.setDate(previousDay.getDate() - 1);
  dates.push(previousDay.toISOString().split("T")[0]);
  //next day
  const nextDay = new Date(today);
  nextDay.setDate(nextDay.getDate() + 1);
  dates.push(nextDay.toISOString().split("T")[0]);

  try {
    const allBasketballEvents = [];

    for (const date of dates) {
      const url = `https://sportapi7.p.rapidapi.com/api/v1/sport/basketball/scheduled-events/${date}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
          "x-rapidapi-host": "sportapi7.p.rapidapi.com",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} for ${url}`);
      }

      const data = await response.json();
      const data = await response.json();
      if (Array.isArray(data.events)) {
        allBasketballEvents.push(...data.events);
      }
    }

    //Deduplication by event ID for games appearing multiple times
    const existingEvents = new Set();
    const uniqueEvents = allBasketballEvents.filter((ev) => {
      if (existingEvents.has(ev.id)) return false;
      existingEvents.add(ev.id);
      return true;
    });
  } catch (error) {
    console.error("Proxy Error in /api/events/basketball:", error);
    res.status(500).json({ error: "Failed to fetch basketball fixtures" });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
