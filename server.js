require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

// Enable CORS for your frontend
app.use(cors());
// Serve static files from your current directory
app.use(express.static('./'));

// Proxy endpoint for football data
app.get('/api/matches/football', async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;
        const response = await fetch(
            `https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&competitions=2001,2021,2014,2002`,
            {
                headers: {
                    'X-Auth-Token': process.env.FOOTBALL_API_KEY
                }
            }
        );
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/matches/cricket', async (req, res) => {
    try {
        // const {dateFrom, dateTo} = req.query;

        // const date = new Date(dateFrom);
        // date.setDate(date.getDate() - 1);
        // const previousDay = date.toISOString().split('T')[0];
        
        // Make individual requests
        const [matchesLive, matchesOther] = await Promise.all([
            fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${process.env.CRICKET_API_KEY}&offset=0`),
            fetch(`https://api.cricapi.com/v1/matches?apikey=${process.env.CRICKET_API_KEY}&offset=0`)
        ]);

        // Parse JSON responses
        const liveMatches = await matchesLive.json();
        const otherMatches = await matchesOther.json();

        // Combine the matches, ensuring we handle the data structure correctly
        const combinedMatches = {
            matches: [
                ...(liveMatches.data || []),
                ...(otherMatches.data || []),
            ]
        };

        res.json(combinedMatches);

    } catch (error) {
        console.error('Detailed Proxy Error:', {
            message: error.message,
            stack: error.stack,
            dateFrom: req.query.dateFrom,
            dateTo: req.query.dateTo
        });
        res.status(500).json({ 
            error: error.message,
            details: 'Check server logs for more information'
        });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
});