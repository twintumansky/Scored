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
app.get('/api/matches', async (req, res) => {
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

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
});