require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();

// Enable CORS for your frontend
app.use(cors());
// Serve static files from your current directory
app.use(express.static("./"));

// Proxy endpoint for football data
app.get("/api/matches/football", async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const response = await fetch(
      `https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&competitions=2001,2021,2014,2015,2016,2017,2018,2019,2002,2013,2152`,
      {
        headers: {
          "X-Auth-Token": process.env.FOOTBALL_API_KEY,
        },
      }
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Proxy Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/matches/cricket", async (req, res) => {
  try {
    const endpoints = [
      `https://api.cricapi.com/v1/currentMatches?apikey=${process.env.CRICKET_API_KEY}&offset=0`,
      `https://api.cricapi.com/v1/matches?apikey=${process.env.CRICKET_API_KEY}&offset=0`,
    ];

    const cricketMatchData = endpoints.map((url) =>
      fetch(url).then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status} for ${url}`);
        }
        return response.json();
      })
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
    res.json({ matches: combinedMatches });
  } catch (error) {
    console.error("General Proxy Error in /api/matches/cricket:", error);
    res
      .status(500)
      .json({ error: "An unexpected error occurred on the server." });
  }
});

app.get("/api/races/motorsport", async (req, res) => {
  try {
    const { dateFrom } = req.query;
    const dateYear = dateFrom.split("-")[0];
    console.log(dateYear);

    // Helper function to fetch all paginated results
    const fetchAllResults = async (baseUrl) => {
      const allResults = [];
      let offset = 0;
      const limit = 100; // Fetch more results per page
      let hasMoreData = true;

      while (hasMoreData) {
        const url = `${baseUrl}?limit=${limit}&offset=${offset}`;
        console.log(`Fetching results page with offset: ${offset}`);
        
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
    const promises = Object.values(endpoints).map(url => 
      fetch(url).then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status} for ${url}`);
        }
        return response.json();
      })
    );

    // Fetch all race results with pagination
    const resultsPromise = fetchAllResults(`https://api.jolpi.ca/ergast/f1/${dateYear}/results`);

    const [racesData, driverStandingsData, constructorStandingsData, allResults] = 
      await Promise.all([...promises, resultsPromise]);

    const responseData = {
      races: racesData,
      driverstandings: driverStandingsData,
      constructorstandings: constructorStandingsData,
      results: { MRData: { RaceTable: { Races: allResults } } } // Structure to match expected format
    };

    // Merging races with results to include race-winner data
    if (responseData.races && responseData.results) {
      const races = responseData.races?.MRData?.RaceTable?.Races || [];
      const raceResults = responseData.results?.MRData?.RaceTable?.Races || [];
      
      console.log(`Fetched ${races.length} races and ${raceResults.length} results`);
      
      // Creating a map of race results by round for quick lookup
      const resultsMap = {};
      raceResults.forEach(race => {
        resultsMap[race.round] = race;
      });

      // Merge winner information into races
      const mergedRaces = races.map(race => {
        const raceResult = resultsMap[race.round];
        if (raceResult && raceResult.Results && raceResult.Results.length > 0) {
          // Add winner information to the race
          return {
            ...race,
            winner: {
              driver: raceResult.Results[0].Driver,
              constructor: raceResult.Results[0].Constructor,
              time: raceResult.Results[0].Time?.time || 'N/A',
              fastestLap: raceResult.Results[0].FastestLap
            }
          };
        }
        return race; // Return race without winner info if no results yet
      });

      responseData.mergedRaces = mergedRaces;
      console.log(`Merged ${mergedRaces.filter(r => r.winner).length} races with winner data`);
    }

    console.log("Total races fetched:", responseData.mergedRaces?.length || 0);
    res.json(responseData);
  } catch (error) {
    console.error("General Proxy Error in /api/races/motorsport:", error);
    res.status(500).json({ error: "An unexpected error occurred on the server." });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
