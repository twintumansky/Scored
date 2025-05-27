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
    try{
        const {dateFrom, dateTo} = req.query;
        const date = new Date(dateFrom);
        date.setDate(date.getDate - 1);
        const previousDay = date.toISOString().split('T')[0];
        const header = {
            'Authorization': process.env.CRICKET_API_KEY
        }
        const [liveMatches, upcomingMatches, recentMatches] = await Promise.all([
            fetch(('https://cricket.sportdevs.com/matches-live'), {
                headers: header
            }).then(res => res.json()),
            fetch((`https://cricket.sportdevs.com/matches?start_time=gte.${dateFrom}&start_time=lt.${dateTo}`), {
                headers: header
            }).then(res => res.json()),
            fetch((`https://cricket.sportdevs.com/matches?status_type=eq.finished&start_time=gte.${previousDay}&start_time=lt.${dateFrom}`), {
                headers: header
            }).then(res => res.json())
        ])

        const combinedMatches = {
            matches: [
                ...(liveMatches.data || []),
                ...(upcomingMatches.data || []),
                ...(recentMatches.data || [])
            ]
        };
        res.json(combinedMatches);
    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).json({ error: error.message });
    }
})

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
});