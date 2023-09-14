const express = require('express'); // Imports dependencies for creating the server
const axios = require('axios'); // For making HTTP requests and sets up an Express router

// Defines an express route for handling HTTP GET requests at the root URL ('/')
// Expects two query parameters, query and number.

const router = express.Router();

router.get('/', async (req, res) => {
    const query = req.query.query;
    const number = req.query.number;

    // Extract selected weather conditions from the query parameters
    const selectedConditions = [];
    if (req.query.sun) selectedConditions.push('Sun');
    if (req.query.cloud) selectedConditions.push('Cloud');

    if (!query || !number) {
        res.status(400).send("Query and number parameters are required.");
        return;
    }

    try {
        const ticketmasterResponse = await fetchTicketmasterData(query, number);

        if (!ticketmasterResponse._embedded || !ticketmasterResponse._embedded.events) {
            // Check if any selected condition is present
            if (selectedConditions.length > 0) {
                res.status(404).send(`No upcoming events with ${selectedConditions.join('/')} weather`);
                return;
            } else {
                res.status(404).send("No events found for this query. Please ensure that the city you are searching for is spelled correctly");
                return;
            }
        }

        const events = ticketmasterResponse._embedded.events;
        const eventPromises = events.map(async (event) => {
            const eventDate = new Date(event.dates.start.localDate);
            const cityName = event._embedded?.venues?.[0]?.city?.name || query;

            const weatherData = await fetchWeatherData(cityName, eventDate);

            // If no conditions are selected, include the event
            if (selectedConditions.length === 0) {
                return {
                    event,
                    weatherData
                };
            } else {
                // Check if any selected condition is present in weather description
                if (selectedConditions.some(condition => weatherData.weather.description.toLowerCase().includes(condition.toLowerCase()))) {
                    return {
                        event,
                        weatherData
                    };
                }
            }
            return null; // Exclude events that don't match selected conditions
        });

        const eventDataWithWeather = (await Promise.all(eventPromises)).filter(event => event !== null);

        if (eventDataWithWeather.length === 0 && selectedConditions.length > 0) {
            res.status(404).send(`No upcoming events with ${selectedConditions.join('/')} weather`);
            return;
        }

        const s = createPage('Event Weather Information', eventDataWithWeather);

        res.status(200).send(s);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching data.');
    }
});

function fetchTicketmasterData(city, number) {
    const apiKey = 'kQ0FxlRI4pdWxWKzVAQShGogxysIDOVr'; // Ticketmaster API key
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?keyword=${city}&size=${number}&apikey=${apiKey}`;
    return axios.get(url).then((response) => response.data);
}

async function fetchWeatherData(city, date) {
    const apiKey = 'ceb0068285c8456689bd3bcd8f06c2b1'; // Weatherbit API key
    const dateString = date.toISOString().split('T')[0];
    const url = `https://api.weatherbit.io/v2.0/forecast/daily?city=${city}&start_date=${dateString}&end_date=${dateString}&key=${apiKey}`;
    const response = await axios.get(url);
    return response.data.data[0]; // Assuming you want the weather for the first day
}

function createPage(title, eventDataWithWeather) {
    let s = "Ticketmaster Event Search Results:<br/>";

    for (let i = 0; i < eventDataWithWeather.length; i++) {
        const { event, weatherData } = eventDataWithWeather[i];
        const eventName = event.name;
        const eventDate = new Date(event.dates.start.localDate).toDateString();

        s += `
            <div>
                <h2>${eventName}</h2>
                <p>Date: ${eventDate}</p>
                <p>Weather: ${weatherData.weather.description}</p>
                <p>Temperature: ${weatherData.temp}°C</p>                
            </div>
        `;
    }

    const str =
        '<!DOCTYPE html>' +
        '<html><head><title>Ticketmaster JSON</title></head>' +
        '<link rel="stylesheet" type="text/css" href="/styles.css">' + // Reference the CSS file
        '</head>' +
        '<body>' +
        '<h1>' + title + '</h1>' +
        s +
        '<a href="/">Back to Search</a>' +
        '</body></html>';
    return str;
}

// Exports the router so it can be used by the main 'app.js' application.
module.exports = router;
