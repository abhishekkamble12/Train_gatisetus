const express = require('express');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
// const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 7000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAaUXI84AgFHrgx1EqnM3wincn3PDct46w';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

// In-memory cache
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// In-memory train data store
let trains = [];

// Middleware
app.use(express.json());
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:8080', 'http://localhost:5173'] })); // Added common Vite port

// Initialize train data using Gemini
const initializeTrainData = async () => {
    try {
        const prompt = `
            Generate realistic real-time train data for Indian Railways, New Delhi hub, on September 10, 2025.
            Provide data for 10 trains in the following JSON format:
            [
                {
                    "id": "train_number",
                    "name": "train_name",
                    "route": "start → destination",
                    "status": "On Time|Delayed|Critical|Running|Stopped|Held",
                    "delay": number_of_minutes,
                    "speed": current_speed,
                    "location": "current_location",
                    "passengers": number,
                    "nextStop": "next_station",
                    "eta": "time",
                    "statusColor": "success|warning|destructive"
                }
            ]
            Use train numbers: "12055", "12309", "12951", "12002", "12423", "12295", "12621", "12401", "12301", "12019".
            Include a mix of on-time, delayed, and critical trains. Make locations and ETAs realistic for routes from New Delhi.
            Ensure valid JSON, no comments.
        `;

        const response = await axios.post(
            `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
            {
                contents: [{ parts: [{ text: prompt }] }],
            },
            {
                headers: { 'Content-Type': 'application/json' },
            }
        );

        const geminiText = response.data.candidates[0].content.parts[0].text;
        const cleanedText = geminiText.replace(/```json\n|\n```/g, '').trim();
        trains = JSON.parse(cleanedText);
        console.log('Initialized train data using Gemini:', trains.length, 'trains');
    } catch (error) {
        console.error('Error initializing train data with Gemini:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response Data:', error.response.data);
        }
        // Fallback to mock data
        trains = [
            {
                id: "12055",
                name: "New Delhi - Dehradun Jan Shatabdi Express",
                route: "New Delhi → Dehradun",
                status: "On Time",
                delay: 0,
                speed: 110,
                location: "Meerut City",
                passengers: 850,
                nextStop: "Haridwar",
                eta: "14:25",
                statusColor: "success",
            },
            {
                id: "12309",
                name: "Rajdhani Express",
                route: "New Delhi → Patna",
                status: "Delayed",
                delay: 12,
                speed: 95,
                location: "Kanpur Central",
                passengers: 620,
                nextStop: "Allahabad",
                eta: "16:40",
                statusColor: "warning",
            },
            {
                id: "12951",
                name: "Mumbai Rajdhani Express",
                route: "New Delhi → Mumbai",
                status: "Critical",
                delay: 45,
                speed: 0,
                location: "Mathura",
                passengers: 1200,
                nextStop: "Signal Clearance",
                eta: "Pending",
                statusColor: "destructive",
            },
            {
                id: "12002",
                name: "New Delhi - Bhopal Shatabdi Express",
                route: "New Delhi → Bhopal",
                status: "On Time",
                delay: 0,
                speed: 100,
                location: "Agra Cantt",
                passengers: 700,
                nextStop: "Jhansi",
                eta: "15:30",
                statusColor: "success",
            },
            {
                id: "12423",
                name: "Dibrugarh Rajdhani Express",
                route: "New Delhi → Dibrugarh",
                status: "Delayed",
                delay: 20,
                speed: 90,
                location: "Moradabad",
                passengers: 900,
                nextStop: "Bareilly",
                eta: "18:00",
                statusColor: "warning",
            },
            {
                id: "12295",
                name: "Sanghamitra Express",
                route: "New Delhi → Bangalore",
                status: "On Time",
                delay: 0,
                speed: 105,
                location: "Jhansi",
                passengers: 950,
                nextStop: "Bhopal",
                eta: "20:15",
                statusColor: "success",
            },
            {
                id: "12621",
                name: "Tamil Nadu Express",
                route: "New Delhi → Chennai",
                status: "Delayed",
                delay: 15,
                speed: 85,
                location: "Gwalior",
                passengers: 800,
                nextStop: "Nagpur",
                eta: "22:30",
                statusColor: "warning",
            },
            {
                id: "12401",
                name: "Magadh Express",
                route: "New Delhi → Patna",
                status: "On Time",
                delay: 0,
                speed: 100,
                location: "Aligarh",
                passengers: 700,
                nextStop: "Tundla",
                eta: "16:50",
                statusColor: "success",
            },
            {
                id: "12301",
                name: "Howrah Rajdhani Express",
                route: "New Delhi → Howrah",
                status: "Critical",
                delay: 50,
                speed: 0,
                location: "Allahabad",
                passengers: 1100,
                nextStop: "Signal Clearance",
                eta: "Pending",
                statusColor: "destructive",
            },
            {
                id: "12019",
                name: "Howrah - Ranchi Shatabdi Express",
                route: "New Delhi → Ranchi",
                status: "On Time",
                delay: 0,
                speed: 115,
                location: "Varanasi",
                passengers: 650,
                nextStop: "Daltonganj",
                eta: "17:45",
                statusColor: "success",
            },
        ];
    }
};

// Sync real-time data using Gemini
const syncRealTimeData = async () => {
    try {
        const currentTime = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' });
        const prompt = `
            Generate updated real-time train status for Indian Railways, New Delhi hub, current time: ${currentTime} on September 10, 2025.
            Update the status, locations, speeds, delays, and ETAs for these existing trains to simulate real-time movement:
            ${JSON.stringify(trains, null, 2)}
            
            Provide updated data in the exact same JSON format:
            [
                {
                    "id": "train_number",
                    "name": "train_name",
                    "route": "start → destination",
                    "status": "On Time|Delayed|Critical|Running|Stopped|Held",
                    "delay": number_of_minutes,
                    "speed": current_speed,
                    "location": "current_location",
                    "passengers": number,
                    "nextStop": "next_station",
                    "eta": "time",
                    "statusColor": "success|warning|destructive"
                }
            ]
            
            Make realistic updates:
            - Moving trains should advance locations and reduce remaining time
            - Some trains may develop new delays or issues
            - Maintain route consistency but update progress
            - Keep passenger counts similar unless there's an incident
            - Update ETAs based on current progress
            Ensure valid JSON, no comments.
        `;

        const response = await axios.post(
            `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
            {
                contents: [{ parts: [{ text: prompt }] }],
            },
            {
                headers: { 'Content-Type': 'application/json' },
            }
        );

        const geminiText = response.data.candidates[0].content.parts[0].text;
        const cleanedText = geminiText.replace(/```json\n|\n```/g, '').trim();
        const updatedTrains = JSON.parse(cleanedText);
        trains = trains.map(existing => {
            const updated = updatedTrains.find(t => t.id === existing.id);
            return updated ? { ...existing, ...updated } : existing;
        });
        console.log('Synced real-time train data using Gemini');
    } catch (error) {
        console.error('Error syncing real-time data with Gemini:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response Data:', error.response.data);
        }
    }
};

// Initialize data on startup
initializeTrainData();

// Sync data every 30 seconds
setInterval(syncRealTimeData, 30000);

// Fetch trains with pagination
app.post('/api/trains', async (req, res) => {
    console.log('Received /api/trains request:', req.body);
    const { hub, page = 1, pageSize = 3 } = req.body;

    if (!hub) {
        console.error('Invalid input:', req.body);
        return res.status(400).json({ error: 'Missing required parameter: hub is required.' });
    }

    const pageNum = parseInt(page, 10);
    const pageSizeNum = parseInt(pageSize, 10);
    if (isNaN(pageNum) || pageNum < 1 || isNaN(pageSizeNum) || pageSizeNum < 1) {
        return res.status(400).json({ error: 'Invalid pagination parameters: page and pageSize must be positive integers.' });
    }

    const cacheKey = `${hub}:${pageNum}:${pageSizeNum}`;
    if (cache.has(cacheKey)) {
        console.log('Serving from cache:', cacheKey);
        return res.json(cache.get(cacheKey));
    }

    // Sync data before responding
    await syncRealTimeData();

    const pageNumber = parseInt(page, 10);
    const size = parseInt(pageSize, 10);
    const startIndex = (pageNumber - 1) * size;
    const endIndex = startIndex + size;

    const paginatedTrains = trains.slice(startIndex, endIndex);
    const totalTrains = trains.length;
    const totalPages = Math.ceil(totalTrains / size);

    const responseData = {
        trains: paginatedTrains,
        pagination: {
            totalTrains,
            currentPage: pageNumber,
            pageSize: size,
            totalPages,
        },
    };

    cache.set(cacheKey, responseData);
    setTimeout(() => cache.delete(cacheKey), CACHE_DURATION);

    res.json(responseData);
});

// Fetch route data for a specific train
app.post('/api/trains/routes', async (req, res) => {
    console.log('Received /api/trains/routes request:', req.body);
    const { trainId, hub } = req.body;

    if (!trainId || !hub) {
        console.error('Invalid input:', req.body);
        return res.status(400).json({ error: 'Missing required parameters: trainId and hub are required.' });
    }

    const train = trains.find(t => t.id === trainId);
    if (!train) {
        return res.status(404).json({ error: 'Train not found' });
    }

    const cacheKey = `routes:${trainId}:${hub}`;
    if (cache.has(cacheKey)) {
        console.log('Serving from cache:', cacheKey);
        return res.json(cache.get(cacheKey));
    }

    try {
        const prompt = `
            Generate realistic route data for train ${trainId} (${train.name}) from hub ${hub} on September 10, 2025.
            Provide:
            - "currentRoute": Object with:
                - stations: Array of station names (5-10 stations, including ${hub} as start).
                - distance: Total distance in km (200-2000 km).
                - estimatedTime: Estimated travel time (e.g., "5h 30m").
            - "alternateRoutes": Array of 1-3 alternate route objects, each with:
                - stations: Array of station names (different from current route).
                - distance: Total distance in km.
                - estimatedTime: Estimated travel time.
            Ensure valid JSON, no comments.
        `;

        const response = await axios.post(
            `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
            {
                contents: [{ parts: [{ text: prompt }] }],
            },
            {
                headers: { 'Content-Type': 'application/json' },
            }
        );

        const geminiText = response.data.candidates[0].content.parts[0].text;
        const cleanedText = geminiText.replace(/```json\n|\n```/g, '').trim();
        const routeData = JSON.parse(cleanedText);

        cache.set(cacheKey, routeData);
        setTimeout(() => cache.delete(cacheKey), CACHE_DURATION);

        res.json(routeData);
    } catch (error) {
        console.error('Gemini API call failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response Data:', error.response.data);
        }
        const fallbackData = {
            currentRoute: {
                stations: [hub, "Agra", "Gwalior", train.route.split(" → ")[1]],
                distance: 500,
                estimatedTime: "6h 0m",
            },
            alternateRoutes: [
                {
                    stations: [hub, "Mathura", "Jhansi", train.route.split(" → ")[1]],
                    distance: 550,
                    estimatedTime: "6h 30m",
                },
            ],
        };
        cache.set(cacheKey, fallbackData);
        setTimeout(() => cache.delete(cacheKey), CACHE_DURATION);
        res.json(fallbackData);
    }
});

// Analytics endpoint
app.post('/api/analytics', async (req, res) => {
    console.log('Received /api/analytics request:', req.body);
    const { hub } = req.body;

    if (!hub) {
        console.error('Invalid input:', req.body);
        return res.status(400).json({ error: 'Missing required parameter: hub is required.' });
    }

    const cacheKey = `analytics:${hub}`;
    if (cache.has(cacheKey)) {
        console.log('Serving from cache:', cacheKey);
        return res.json(cache.get(cacheKey));
    }

    try {
        const prompt = `
            Generate simulated analytics data for Indian Railways trains departing from "${hub}" on September 10, 2025. Return JSON with:
            - "performanceTrends": Object with:
              - onTimePercentage: Percentage of trains on time (60-80%).
              - averageDelay: Average delay in minutes (5-20).
              - criticalIncidents: Number of critical delays (1-3).
              - averageSpeed: Average speed in km/h (80-110).
              - passengerLoadFactor: Average passenger load as percentage of capacity (60-90%).
            - "scheduleAnalysis": Array of 10 objects, each with:
              - id: Train number (use: "12055", "12309", "12951", "12002", "12423", "12295", "12621", "12401", "12301", "12019").
              - name: Actual train name (e.g., "New Delhi - Dehradun Jan Shatabdi Express").
              - scheduledDeparture: 24-hour format (e.g., "14:00").
              - actualDeparture: 24-hour format or "Pending".
              - departureDeviation: Minutes early (-) or late (+) (e.g., -5, 10).
              - reliabilityScore: Percentage (70-100%).
            - Ensure valid JSON, no comments.
        `;

        const geminiResponse = await axios.post(
            `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
            {
                contents: [{ parts: [{ text: prompt }] }],
            },
            {
                headers: { 'Content-Type': 'application/json' },
            }
        );

        let analyticsData;
        try {
            const geminiText = geminiResponse.data.candidates[0].content.parts[0].text;
            const cleanedText = geminiText.replace(/```json\n|\n```/g, '').trim();
            analyticsData = JSON.parse(cleanedText);
        } catch (parseError) {
            console.error('Error parsing Gemini response:', parseError);
            analyticsData = {
                performanceTrends: {
                    onTimePercentage: 65,
                    averageDelay: 10,
                    criticalIncidents: 2,
                    averageSpeed: 95,
                    passengerLoadFactor: 75,
                },
                scheduleAnalysis: [
                    {
                        id: "12055",
                        name: "New Delhi - Dehradun Jan Shatabdi Express",
                        scheduledDeparture: "14:00",
                        actualDeparture: "14:00",
                        departureDeviation: 0,
                        reliabilityScore: 95,
                    },
                    {
                        id: "12309",
                        name: "Rajdhani Express",
                        scheduledDeparture: "15:30",
                        actualDeparture: "15:42",
                        departureDeviation: 12,
                        reliabilityScore: 85,
                    },
                    {
                        id: "12951",
                        name: "Mumbai Rajdhani Express",
                        scheduledDeparture: "16:00",
                        actualDeparture: "16:45",
                        departureDeviation: 45,
                        reliabilityScore: 70,
                    },
                    {
                        id: "12002",
                        name: "New Delhi - Bhopal Shatabdi Express",
                        scheduledDeparture: "13:00",
                        actualDeparture: "13:00",
                        departureDeviation: 0,
                        reliabilityScore: 90,
                    },
                    {
                        id: "12423",
                        name: "Dibrugarh Rajdhani Express",
                        scheduledDeparture: "17:00",
                        actualDeparture: "17:20",
                        departureDeviation: 20,
                        reliabilityScore: 80,
                    },
                    {
                        id: "12295",
                        name: "Sanghamitra Express",
                        scheduledDeparture: "18:00",
                        actualDeparture: "18:00",
                        departureDeviation: 0,
                        reliabilityScore: 92,
                    },
                    {
                        id: "12621",
                        name: "Tamil Nadu Express",
                        scheduledDeparture: "20:00",
                        actualDeparture: "20:15",
                        departureDeviation: 15,
                        reliabilityScore: 82,
                    },
                    {
                        id: "12401",
                        name: "Magadh Express",
                        scheduledDeparture: "15:00",
                        actualDeparture: "15:00",
                        departureDeviation: 0,
                        reliabilityScore: 88,
                    },
                    {
                        id: "12301",
                        name: "Howrah Rajdhani Express",
                        scheduledDeparture: "16:30",
                        actualDeparture: "17:20",
                        departureDeviation: 50,
                        reliabilityScore: 75,
                    },
                    {
                        id: "12019",
                        name: "Howrah - Ranchi Shatabdi Express",
                        scheduledDeparture: "14:30",
                        actualDeparture: "14:30",
                        departureDeviation: 0,
                        reliabilityScore: 93,
                    },
                ],
            };
        }

        cache.set(cacheKey, analyticsData);
        setTimeout(() => cache.delete(cacheKey), CACHE_DURATION);

        res.json(analyticsData);
    } catch (error) {
        console.error('Gemini API call failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response Data:', error.response.data);
        }
        // Fallback to static analytics data
        const fallbackAnalytics = {
            performanceTrends: {
                onTimePercentage: 65,
                averageDelay: 10,
                criticalIncidents: 2,
                averageSpeed: 95,
                passengerLoadFactor: 75,
            },
            scheduleAnalysis: [
                {
                    id: "12055",
                    name: "New Delhi - Dehradun Jan Shatabdi Express",
                    scheduledDeparture: "14:00",
                    actualDeparture: "14:00",
                    departureDeviation: 0,
                    reliabilityScore: 95,
                },
                {
                    id: "12309",
                    name: "Rajdhani Express",
                    scheduledDeparture: "15:30",
                    actualDeparture: "15:42",
                    departureDeviation: 12,
                    reliabilityScore: 85,
                },
                {
                    id: "12951",
                    name: "Mumbai Rajdhani Express",
                    scheduledDeparture: "16:00",
                    actualDeparture: "16:45",
                    departureDeviation: 45,
                    reliabilityScore: 70,
                },
                {
                    id: "12002",
                    name: "New Delhi - Bhopal Shatabdi Express",
                    scheduledDeparture: "13:00",
                    actualDeparture: "13:00",
                    departureDeviation: 0,
                    reliabilityScore: 90,
                },
                {
                    id: "12423",
                    name: "Dibrugarh Rajdhani Express",
                    scheduledDeparture: "17:00",
                    actualDeparture: "17:20",
                    departureDeviation: 20,
                    reliabilityScore: 80,
                },
                {
                    id: "12295",
                    name: "Sanghamitra Express",
                    scheduledDeparture: "18:00",
                    actualDeparture: "18:00",
                    departureDeviation: 0,
                    reliabilityScore: 92,
                },
                {
                    id: "12621",
                    name: "Tamil Nadu Express",
                    scheduledDeparture: "20:00",
                    actualDeparture: "20:15",
                    departureDeviation: 15,
                    reliabilityScore: 82,
                },
                {
                    id: "12401",
                    name: "Magadh Express",
                    scheduledDeparture: "15:00",
                    actualDeparture: "15:00",
                    departureDeviation: 0,
                    reliabilityScore: 88,
                },
                {
                    id: "12301",
                    name: "Howrah Rajdhani Express",
                    scheduledDeparture: "16:30",
                    actualDeparture: "17:20",
                    departureDeviation: 50,
                    reliabilityScore: 75,
                },
                {
                    id: "12019",
                    name: "Howrah - Ranchi Shatabdi Express",
                    scheduledDeparture: "14:30",
                    actualDeparture: "14:30",
                    departureDeviation: 0,
                    reliabilityScore: 93,
                },
            ],
        };

        cache.set(cacheKey, fallbackAnalytics);
        setTimeout(() => cache.delete(cacheKey), CACHE_DURATION);

        res.json(fallbackAnalytics);
    }
});

// Alerts endpoint
app.post('/api/alerts', async (req, res) => {
    console.log('Received /api/alerts request:', req.body);
    const { hub, page = 1, pageSize = 4 } = req.body;

    if (!hub) {
        console.error('Invalid input:', req.body);
        return res.status(400).json({ error: 'Missing required parameter: hub is required.' });
    }

    const pageNum = parseInt(page, 10);
    const pageSizeNum = parseInt(pageSize, 10);
    if (isNaN(pageNum) || pageNum < 1 || isNaN(pageSizeNum) || pageSizeNum < 1) {
        return res.status(400).json({ error: 'Invalid pagination parameters: page and pageSize must be positive integers.' });
    }

    const cacheKey = `${hub}:alerts:${pageNum}:${pageSizeNum}`;
    if (cache.has(cacheKey)) {
        console.log('Serving from cache:', cacheKey);
        return res.json(cache.get(cacheKey));
    }

    try {
        const prompt = `
            Generate simulated real-time alert data for Indian Railways for the hub "${hub}" on September 10, 2025. Return JSON with:
            - "alerts" array (10 alerts) with:
              - id: Unique alert ID (e.g., "1", "2").
              - title: Brief alert title (e.g., "Signal Failure").
              - description: Detailed description of the alert.
              - severity: "critical", "warning", or "info" (20% critical, 40% warning, 40% info).
              - time: Time since alert in human-readable format (e.g., "2 min ago").
              - section: Railway section (e.g., "Delhi-Agra").
            - Ensure valid JSON, no comments.
        `;

        const geminiResponse = await axios.post(
            `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
            {
                contents: [{ parts: [{ text: prompt }] }],
            },
            {
                headers: { 'Content-Type': 'application/json' },
            }
        );

        let alertData;
        try {
            const geminiText = geminiResponse.data.candidates[0].content.parts[0].text;
            const cleanedText = geminiText.replace(/```json\n|\n```/g, '').trim();
            alertData = JSON.parse(cleanedText);
        } catch (parseError) {
            console.error('Error parsing Gemini response:', parseError);
            alertData = {
                alerts: [
                    {
                        id: "1",
                        title: "Signal Failure",
                        description: "Junction A-7 experiencing intermittent signal issues",
                        severity: "critical",
                        time: "2 min ago",
                        section: `${hub}-Agra`,
                    },
                    {
                        id: "2",
                        title: "Delayed Train",
                        description: "Express 12345 running 8 minutes behind schedule",
                        severity: "warning",
                        time: "5 min ago",
                        section: `${hub}-Pune`,
                    },
                    {
                        id: "3",
                        title: "Maintenance Window",
                        description: "Scheduled track maintenance in progress",
                        severity: "info",
                        time: "10 min ago",
                        section: `${hub}-Bangalore`,
                    },
                    {
                        id: "4",
                        title: "Platform Congestion",
                        description: "Platform 3 approaching capacity limits",
                        severity: "warning",
                        time: "15 min ago",
                        section: `${hub} Central`,
                    },
                    {
                        id: "5",
                        title: "Track Obstruction",
                        description: "Debris reported on tracks near Station B",
                        severity: "critical",
                        time: "20 min ago",
                        section: `${hub}-Jaipur`,
                    },
                    {
                        id: "6",
                        title: "Power Supply Issue",
                        description: "Intermittent power supply affecting train operations",
                        severity: "warning",
                        time: "25 min ago",
                        section: `${hub}-Lucknow`,
                    },
                    {
                        id: "7",
                        title: "Staff Coordination",
                        description: "Staff briefing scheduled for next shift",
                        severity: "info",
                        time: "30 min ago",
                        section: `${hub} Central`,
                    },
                    {
                        id: "8",
                        title: "Weather Advisory",
                        description: "Heavy rain expected, potential delays",
                        severity: "warning",
                        time: "35 min ago",
                        section: `${hub}-Mumbai`,
                    },
                    {
                        id: "9",
                        title: "System Update",
                        description: "Control system software update completed",
                        severity: "info",
                        time: "40 min ago",
                        section: `${hub}-Chennai`,
                    },
                    {
                        id: "10",
                        title: "Emergency Drill",
                        description: "Scheduled emergency evacuation drill",
                        severity: "info",
                        time: "45 min ago",
                        section: `${hub}-Kolkata`,
                    },
                ],
            };
        }

        const totalAlerts = alertData.alerts.length;
        const totalPages = Math.ceil(totalAlerts / pageSizeNum);
        const startIndex = (pageNum - 1) * pageSizeNum;
        const paginatedAlerts = alertData.alerts.slice(startIndex, startIndex + pageSizeNum);

        const responseData = {
            alerts: paginatedAlerts,
            pagination: {
                totalAlerts,
                currentPage: pageNum,
                pageSize: pageSizeNum,
                totalPages,
            },
        };

        cache.set(cacheKey, responseData);
        setTimeout(() => cache.delete(cacheKey), CACHE_DURATION);

        res.json(responseData);
    } catch (error) {
        console.error('Gemini API call failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response Data:', error.response.data);
        }
        const fallbackAlerts = [
            {
                id: "1",
                title: "Signal Failure",
                description: "Junction A-7 experiencing intermittent signal issues",
                severity: "critical",
                time: "2 min ago",
                section: `${hub}-Agra`,
            },
            {
                id: "2",
                title: "Delayed Train",
                description: "Express 12345 running 8 minutes behind schedule",
                severity: "warning",
                time: "5 min ago",
                section: `${hub}-Pune`,
            },
            {
                id: "3",
                title: "Maintenance Window",
                description: "Scheduled track maintenance in progress",
                severity: "info",
                time: "10 min ago",
                section: `${hub}-Bangalore`,
            },
            {
                id: "4",
                title: "Platform Congestion",
                description: "Platform 3 approaching capacity limits",
                severity: "warning",
                time: "15 min ago",
                section: `${hub} Central`,
            },
            {
                id: "5",
                title: "Track Obstruction",
                description: "Debris reported on tracks near Station B",
                severity: "critical",
                time: "20 min ago",
                section: `${hub}-Jaipur`,
            },
            {
                id: "6",
                title: "Power Supply Issue",
                description: "Intermittent power supply affecting train operations",
                severity: "warning",
                time: "25 min ago",
                section: `${hub}-Lucknow`,
            },
            {
                id: "7",
                title: "Staff Coordination",
                description: "Staff briefing scheduled for next shift",
                severity: "info",
                time: "30 min ago",
                section: `${hub} Central`,
            },
            {
                id: "8",
                title: "Weather Advisory",
                description: "Heavy rain expected, potential delays",
                severity: "warning",
                time: "35 min ago",
                section: `${hub}-Mumbai`,
            },
            {
                id: "9",
                title: "System Update",
                description: "Control system software update completed",
                severity: "info",
                time: "40 min ago",
                section: `${hub}-Chennai`,
            },
            {
                id: "10",
                title: "Emergency Drill",
                description: "Scheduled emergency evacuation drill",
                severity: "info",
                time: "45 min ago",
                section: `${hub}-Kolkata`,
            },
        ];

        const totalAlerts = fallbackAlerts.length;
        const totalPages = Math.ceil(totalAlerts / pageSizeNum);
        const startIndex = (pageNum - 1) * pageSizeNum;
        const paginatedAlerts = fallbackAlerts.slice(startIndex, startIndex + pageSizeNum);

        const responseData = {
            alerts: paginatedAlerts,
            pagination: {
                totalAlerts,
                currentPage: pageNum,
                pageSize: pageSizeNum,
                totalPages,
            },
        };

        cache.set(cacheKey, responseData);
        setTimeout(() => cache.delete(cacheKey), CACHE_DURATION);

        res.json(responseData);
    }
});

// Emergency stop all trains
app.post('/api/trains/emergency-stop', async (req, res) => {
    const { hub } = req.body;

    try {
        const prompt = `
            Simulate an emergency stop for all trains in New Delhi hub on September 10, 2025.
            Update these trains after emergency stop:
            ${JSON.stringify(trains, null, 2)}
            
            For each train:
            - Set speed to 0
            - Set status to "Emergency Stopped"
            - Set statusColor to "destructive"
            - Update location to current safe stopping point
            - Set ETA to "Pending Emergency"
            - Add appropriate delay (e.g., 30+ minutes)
            
            Return updated JSON array in the exact format.
            Ensure valid JSON, no comments.
        `;

        const response = await axios.post(
            `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
            {
                contents: [{ parts: [{ text: prompt }] }],
            },
            {
                headers: { 'Content-Type': 'application/json' },
            }
        );

        const geminiText = response.data.candidates[0].content.parts[0].text;
        const cleanedText = geminiText.replace(/```json\n|\n```/g, '').trim();
        trains = JSON.parse(cleanedText);

        res.json({ message: "Emergency stop initiated for all trains using AI simulation" });
    } catch (error) {
        console.error('Gemini API call failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response Data:', error.response.data);
        }
        trains = trains.map(train => ({
            ...train,
            speed: 0,
            status: "Emergency Stopped",
            statusColor: "destructive",
            eta: "Pending Emergency",
            delay: train.delay + 30,
        }));
        res.json({ message: "Emergency stop initiated for all trains" });
    }
});

// Activate backup routes
app.post('/api/trains/backup-routes', async (req, res) => {
    const { hub } = req.body;

    try {
        const prompt = `
            Simulate activation of backup routes for trains in New Delhi hub due to emergency.
            Current trains:
            ${JSON.stringify(trains, null, 2)}
            
            For each train:
            - Create a realistic backup route (e.g., detour via alternate station)
            - Update route to include backup path
            - Set status to "On Backup Route"
            - Set statusColor to "warning"
            - Recalculate ETA as "Recalculating Backup"
            - Adjust delay appropriately
            
            Return updated JSON array in the exact format.
            Ensure valid JSON, no comments.
        `;

        const response = await axios.post(
            `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
            {
                contents: [{ parts: [{ text: prompt }] }],
            },
            {
                headers: { 'Content-Type': 'application/json' },
            }
        );

        const geminiText = response.data.candidates[0].content.parts[0].text;
        const cleanedText = geminiText.replace(/```json\n|\n```/g, '').trim();
        trains = JSON.parse(cleanedText);

        res.json({ message: "Backup routes activated for all trains using AI simulation" });
    } catch (error) {
        console.error('Gemini API call failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response Data:', error.response.data);
        }
        trains = trains.map(train => {
            const [start, end] = train.route.split(" → ");
            return {
                ...train,
                route: `${start} → Backup Station → ${end}`,
                status: "On Backup Route",
                statusColor: "warning",
                eta: "Recalculating Backup",
                delay: train.delay + 15,
            };
        });
        res.json({ message: "Backup routes activated for all trains" });
    }
});

// Contact emergency services
app.post('/api/emergency/contact', async (req, res) => {
    const { hub, message } = req.body;

    try {
        const prompt = `
            Generate an emergency services contact log for Train Control Center.
            Hub: ${hub}
            Message: ${message}
            Date: September 10, 2025
            Time: ${new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}
            
            Provide a formatted log entry including:
            - Timestamp
            - Hub location
            - Emergency type (inferred from message)
            - Response protocol initiated
            - Expected response time
            
            Return as JSON: {log: "formatted log", protocol: "response protocol", eta: "expected response time"}
            Ensure valid JSON, no comments.
        `;

        const response = await axios.post(
            `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
            {
                contents: [{ parts: [{ text: prompt }] }],
            },
            {
                headers: { 'Content-Type': 'application/json' },
            }
        );

        const geminiText = response.data.candidates[0].content.parts[0].text;
        const cleanedText = geminiText.replace(/```json\n|\n```/g, '').trim();
        const logData = JSON.parse(cleanedText);
        console.log('Emergency contact log:', logData.log);
        res.json({ message: "Emergency services contacted", details: logData });
    } catch (error) {
        console.error('Gemini API call failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response Data:', error.response.data);
        }
        console.log(`Emergency contact requested for hub: ${hub}, message: ${message}`);
        res.json({ message: "Emergency services contacted" });
    }
});

// Optimize routes
app.post('/api/trains/optimize-routes', async (req, res) => {
    const { hub } = req.body;

    try {
        const prompt = `
            Optimize routes for trains in New Delhi hub to reduce delays and improve efficiency.
            Current trains:
            ${JSON.stringify(trains, null, 2)}
            
            For delayed trains:
            - Reduce delay by 20-50% through route optimization
            - Update status to "Optimized Route"
            - Set statusColor to "success" if delay reduced significantly
            - Recalculate realistic ETAs
            
            For on-time trains:
            - Maintain current status or slightly improve ETA
            
            Return updated JSON array in the exact format.
            Ensure valid JSON, no comments.
        `;

        const response = await axios.post(
            `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
            {
                contents: [{ parts: [{ text: prompt }] }],
            },
            {
                headers: { 'Content-Type': 'application/json' },
            }
        );

        const geminiText = response.data.candidates[0].content.parts[0].text;
        const cleanedText = geminiText.replace(/```json\n|\n```/g, '').trim();
        trains = JSON.parse(cleanedText);

        res.json({ message: "Route optimization completed using AI analysis" });
    } catch (error) {
        console.error('Gemini API call failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response Data:', error.response.data);
        }
        trains = trains.map(train => {
            const isDelayed = train.delay > 0;
            return {
                ...train,
                delay: isDelayed ? Math.floor(train.delay * 0.8) : train.delay,
                eta: isDelayed ? "Optimized" : train.eta,
                status: isDelayed ? "Optimized Route" : train.status,
                statusColor: isDelayed ? "success" : train.statusColor,
            };
        });
        res.json({ message: "Route optimization initiated for all trains" });
    }
});

// Schedule maintenance
app.post('/api/trains/schedule-maintenance', async (req, res) => {
    const { hub, maintenanceType } = req.body;

    try {
        const prompt = `
            Generate a maintenance schedule for Indian Railways New Delhi hub.
            Maintenance Type: ${maintenanceType}
            Hub: ${hub}
            Date: September 10, 2025
            
            Provide:
            - Schedule details (time windows, affected trains/routes)
            - Required resources
            - Expected downtime
            - Safety protocols
            
            Return as JSON: {
                "schedule": "detailed schedule",
                "resources": ["list of resources"],
                "downtime": "expected duration",
                "protocols": "safety measures",
                "affectedTrains": ["train IDs"]
            }
            Ensure valid JSON, no comments.
        `;

        const response = await axios.post(
            `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
            {
                contents: [{ parts: [{ text: prompt }] }],
            },
            {
                headers: { 'Content-Type': 'application/json' },
            }
        );

        const geminiText = response.data.candidates[0].content.parts[0].text;
        const cleanedText = geminiText.replace(/```json\n|\n```/g, '').trim();
        const scheduleData = JSON.parse(cleanedText);
        console.log('Maintenance schedule generated:', scheduleData);

        const affectedTrainIds = scheduleData.affectedTrains || [trains[0]?.id];
        trains = trains.map(train => {
            if (affectedTrainIds.includes(train.id)) {
                return {
                    ...train,
                    status: "Scheduled Maintenance",
                    statusColor: "warning",
                    eta: "Maintenance Scheduled",
                };
            }
            return train;
        });

        res.json({ message: `Maintenance (${maintenanceType}) scheduled`, details: scheduleData });
    } catch (error) {
        console.error('Gemini API call failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response Data:', error.response.data);
        }
        console.log(`Maintenance scheduled for hub: ${hub}, type: ${maintenanceType}`);
        res.json({ message: `Maintenance (${maintenanceType}) scheduled for train network` });
    }
});

// Optimize platform allocation
app.post('/api/trains/platform-allocation', async (req, res) => {
    const { hub } = req.body;

    try {
        const prompt = `
            Optimize platform allocation for arriving trains at New Delhi hub.
            Current trains and their ETAs:
            ${JSON.stringify(trains.filter(t => t.eta !== "Pending" && t.eta !== "Recalculating"), null, 2)}
            
            Assign platforms (1-16) to trains based on:
            - Arrival time (ETA)
            - Train type and priority
            - Platform availability
            - Turnaround time requirements
            
            Return updated trains JSON with:
            - Added "platform" field for each train
            - Updated nextStop to include platform (e.g., "New Delhi - Platform 5")
            - Realistic platform assignments
            
            Also return allocation summary as JSON object.
            Ensure valid JSON, no comments.
        `;

        const response = await axios.post(
            `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
            {
                contents: [{ parts: [{ text: prompt }] }],
            },
            {
                headers: { 'Content-Type': 'application/json' },
            }
        );

        const geminiText = response.data.candidates[0].content.parts[0].text;
        const cleanedText = geminiText.replace(/```json\n|\n```/g, '').trim();
        const data = JSON.parse(cleanedText);

        const trainsMatch = cleanedText.match(/\[[\s\S]*?\](?=\s*\{|\s*$)/);
        const summaryMatch = cleanedText.match(/\{[\s\S]*\}/);

        if (trainsMatch) {
            trains = JSON.parse(trainsMatch[0]);
        }

        if (summaryMatch) {
            const summary = JSON.parse(summaryMatch[0]);
            res.json({ message: "Platform allocation optimized using AI", allocation: summary });
        } else {
            res.json({ message: "Platform allocation optimized" });
        }
    } catch (error) {
        console.error('Gemini API call failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response Data:', error.response.data);
        }
        trains = trains.map((train, index) => ({
            ...train,
            nextStop: train.nextStop === "Signal Clearance" ? `Platform ${index + 1}` : train.nextStop,
            eta: train.eta === "Pending" ? "Recalculating" : train.eta,
            platform: index + 1,
        }));
        res.json({ message: "Platform allocation optimized" });
    }
});

// Reroute a specific train
app.post('/api/trains/reroute', async (req, res) => {
    const { trainId, newRoute } = req.body;

    const trainIndex = trains.findIndex(train => train.id === trainId);
    if (trainIndex === -1) {
        return res.status(404).json({ error: "Train not found" });
    }

    try {
        const prompt = `
            Simulate rerouting of train ${trainId} to new route: ${newRoute.join(' → ')}
            Current train data:
            ${JSON.stringify(trains[trainIndex], null, 2)}
            
            Update the train with:
            - New route
            - Status: "Rerouted"
            - statusColor: "warning"
            - ETA: "Recalculating Route"
            - Realistic new location and nextStop based on new route
            - Adjust speed and delay appropriately
            
            Return single train JSON object in the exact format.
            Ensure valid JSON, no comments.
        `;

        const response = await axios.post(
            `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
            {
                contents: [{ parts: [{ text: prompt }] }],
            },
            {
                headers: { 'Content-Type': 'application/json' },
            }
        );

        const geminiText = response.data.candidates[0].content.parts[0].text;
        const cleanedText = geminiText.replace(/```json\n|\n```/g, '').trim();
        trains[trainIndex] = JSON.parse(cleanedText);

        res.json({ message: `Train ${trainId} rerouted successfully using AI simulation` });
    } catch (error) {
        console.error('Gemini API call failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response Data:', error.response.data);
        }
        trains[trainIndex] = {
            ...trains[trainIndex],
            route: newRoute.join(" → "),
            eta: "Recalculating",
            status: "Rerouted",
            statusColor: "warning",
        };
        res.json({ message: `Train ${trainId} rerouted successfully` });
    }
});

// Toggle train speed (hold/resume)
app.post('/api/trains/toggle-speed', async (req, res) => {
    const { trainId, action } = req.body;

    const trainIndex = trains.findIndex(train => train.id === trainId);
    if (trainIndex === -1) {
        return res.status(404).json({ error: "Train not found" });
    }

    try {
        const prompt = `
            Simulate ${action} action for train ${trainId}.
            Current train data:
            ${JSON.stringify(trains[trainIndex], null, 2)}
            
            If action is "hold":
            - Set speed to 0
            - Status: "Held at Station"
            - statusColor: "warning"
            - ETA: "On Hold"
            - Update location to nearest station
            
            If action is "resume":
            - Set speed to appropriate value (80-120 km/h)
            - Status: "Resumed Travel"
            - statusColor: "success"
            - ETA: "Recalculating"
            - Update location if needed
            
            Return single train JSON object in the exact format.
            Ensure valid JSON, no comments.
        `;

        const response = await axios.post(
            `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
            {
                contents: [{ parts: [{ text: prompt }] }],
            },
            {
                headers: { 'Content-Type': 'application/json' },
            }
        );

        const geminiText = response.data.candidates[0].content.parts[0].text;
        const cleanedText = geminiText.replace(/```json\n|\n```/g, '').trim();
        trains[trainIndex] = JSON.parse(cleanedText);

        res.json({ message: `Train ${trainId} ${action === "hold" ? "held" : "resumed"} using AI simulation` });
    } catch (error) {
        console.error('Gemini API call failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response Data:', error.response.data);
        }
        trains[trainIndex] = {
            ...trains[trainIndex],
            speed: action === "hold" ? 0 : 100,
            status: action === "hold" ? "Held at Station" : "Resumed Travel",
            statusColor: action === "hold" ? "warning" : "success",
            eta: action === "hold" ? "On Hold" : "Recalculating",
        };
        res.json({ message: `Train ${trainId} ${action === "hold" ? "held" : "resumed"}` });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        trainsCount: trains.length,
        geminiEnabled: GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE',
        lastSync: new Date().toISOString(),
    });
});

// Periodic cache cleanup
setInterval(() => cache.clear(), CACHE_DURATION);

// List of trains from NetworkVisualization3D.jsx
// const trains = [
//     { number: '12951', name: 'Mumbai Rajdhani Express', route: 'Delhi-Mumbai' },
//     { number: '12301', name: 'Howrah Rajdhani Express', route: 'Delhi-Kolkata' },
//     { number: '22159', name: 'Mumbai CSMT-Chennai Express', route: 'Mumbai-Chennai' },
//     { number: '12027', name: 'Chennai-Bangalore Shatabdi Express', route: 'Chennai-Bangalore' },
//     { number: '12702', name: 'Hussain Sagar Express', route: 'Hyderabad-Mumbai' },
// ];

// Generate simulated train statuses using Gemini
async function generateTrainStatuses() {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
    Generate simulated real-time status data for the following Indian trains as of ${new Date().toISOString()}.
    Each train's status should include:
    - trainNumber: string
    - trainName: string
    - route: string (e.g., "Delhi-Mumbai")
    - currentLocation: string (e.g., city or junction name)
    - delayMinutes: number (0 for on-time, positive for delay)
    - status: string (e.g., "Running", "At Station")
    Output the result as a JSON array.

    Trains:
    ${JSON.stringify(trains, null, 2)}
  `;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const cleanedText = responseText.replace(/```json\n|\n```/g, '').trim();
        const statuses = JSON.parse(cleanedText);
        return statuses;
    } catch (error) {
        console.error('Error generating train statuses:', error);
        return trains.map(train => ({
            trainNumber: train.number,
            trainName: train.name,
            route: train.route,
            currentLocation: 'Unknown',
            delayMinutes: 0,
            status: 'Unknown',
        }));
    }
}

// Generate recommendations using Gemini
async function generateRecommendations(statuses) {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Dynamically import uuid
    const { v4: uuidv4 } = await import('uuid');

    const prompt = `
    Based on the following simulated train statuses, generate AI recommendations for railway traffic optimization.
    Each recommendation should be in JSON format matching this interface:
    {
      "id": string (use UUID),
      "type": "routing" | "timing" | "platform",
      "title": string,
      "description": string,
      "confidence": number (0-100),
      "estimatedImprovement": string,
      "trainAffected": string,
      "timeWindow": string
    }
    Output an array of 1-3 recommendations.
    Train statuses:
    ${JSON.stringify(statuses, null, 2)}
  `;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const cleanedText = responseText.replace(/```json\n|\n```/g, '').trim();
        const recommendations = JSON.parse(cleanedText);
        // Ensure UUIDs for id field
        return recommendations.map(rec => ({
            ...rec,
            id: rec.id || uuidv4(),
        }));
    } catch (error) {
        console.error('Error generating recommendations:', error);
        return [];
    }
}

// API endpoint to get recommendations
app.get('/api/recommendations', async (req, res) => {
    try {
        // Generate simulated train statuses
        const statuses = await generateTrainStatuses();

        // Generate recommendations based on statuses
        const recommendations = await generateRecommendations(statuses);

        res.json(recommendations);
    } catch (error) {
        console.error('Error in /api/recommendations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Gemini integration: ${GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE' ? 'Enabled' : 'Disabled - using fallback data'}`);
});