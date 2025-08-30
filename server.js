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

    const endpoints = {
      results: `https://api.jolpi.ca/ergast/f1/${dateYear}/results`,
      driverstandings: `https://api.jolpi.ca/ergast/f1/${dateYear}/driverstandings`,
      constructorstandings: `https://api.jolpi.ca/ergast/f1/${dateYear}/constructorstandings`,
    };

    const promises = Object.values(endpoints).map( url => 
      fetch(url).then( response  => {
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status} for url: ${url}`);
        }
        return response.json();
      })
    );
    console.log(promises);
    const settledResponses = await Promise.allSettled(promises);
    console.log(settledResponses);
    const responseData = {};
    const endpointKeys = Object.keys(endpoints);
    settledResponses.forEach((result, index) => {
      const key = endpointKeys[index];
      if (result.status === "fulfilled") {
        responseData[key] = result.value;
      } else {
        responseData[key] = null;
        console.error(
          `Failed to fetch data for '${key}':`,
          result.reason.message
        );
      }
    });
    console.log(responseData);
    res.json(responseData);
  } catch (error) {
    console.error("General Proxy Error in /api/races/motorsport:", error);
    res
      .status(500)
      .json({ error: "An unexpected error occurred on the server." });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
