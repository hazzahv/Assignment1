const express = require('express');
const axios = require('axios');

const router = express.Router();

// Your Google Maps API Key
const googleMapsApiKey = process.env.GOO_KEY;

router.get('/', async (req, res) => {
    const query = req.query.query;
    const number = req.query.number;

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
            const venueAddress = extractVenueAddress(event._embedded?.venues);
            const cityName = event._embedded?.venues?.[0]?.city?.name || query;

            const weatherData = await fetchWeatherData(cityName, eventDate);

            if (selectedConditions.length === 0) {
                return {
                    event,
                    weatherData,
                    venueAddress,
                };
            } else {
                if (selectedConditions.some(condition => weatherData.weather.description.toLowerCase().includes(condition.toLowerCase()))) {
                    return {
                        event,
                        weatherData,
                        venueAddress,
                    };
                }
            }
            return null;
        });

        const eventDataWithWeather = (await Promise.all(eventPromises)).filter(event => event !== null);

        if (eventDataWithWeather.length === 0 && selectedConditions.length > 0) {
            res.status(404).send(`No upcoming events with ${selectedConditions.join('/')} weather`);
            return;
        }

        const s = createPage('Event Information', eventDataWithWeather, googleMapsApiKey);

        res.status(200).send(s);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching data.');
    }
});

function fetchTicketmasterData(city, number) {
    const apiKey = process.env.TIK_KEY;
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?keyword=${city}&size=${number}&apikey=${apiKey}`;
    return axios.get(url).then((response) => response.data);
}

async function fetchWeatherData(city, date) {
    const apiKey = process.env.WET_KEY;
    const dateString = date.toISOString().split('T')[0];
    const url = `https://api.weatherbit.io/v2.0/forecast/daily?city=${city}&start_date=${dateString}&end_date=${dateString}&key=${apiKey}`;
    const response = await axios.get(url);
    return response.data.data[0];
}

function extractVenueAddress(venues) {
    if (!venues || venues.length === 0) {
        return 'Venue address not available';
    }

    const venue = venues[0];
    const address = [];

    if (venue.address) {
        if (venue.address.line1) {
            address.push(venue.address.line1);
        }
        if (venue.address.line2) {
            address.push(venue.address.line2);
        }
        if (venue.address.line3) {
            address.push(venue.address.line3);
        }
        if (venue.address.line4) {
            address.push(venue.address.line4);
        }
    }

    if (venue.city) {
        if (venue.city.name) {
            address.push(venue.city.name);
        }
        if (venue.city.state) {
            address.push(venue.city.state);
        }
        if (venue.city.country) {
            address.push(venue.city.country);
        }
    }

    return address.join(', ');
}

function createPage(title, eventDataWithWeather, googleMapsApiKey) {
    let s = "Ticketmaster Event Search Results:<br/>";

    s += `<script src="https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places"></script>`;

    for (let i = 0; i < eventDataWithWeather.length; i++) {
        const { event, weatherData, venueAddress } = eventDataWithWeather[i];
        const eventName = event.name;
        const eventDate = new Date(event.dates.start.localDate).toDateString();

        s += `
            <div>
                <h2>${eventName}</h2>
                <p>Date: ${eventDate}</p>
                <p>Weather: ${weatherData.weather.description}</p>
                <p>Temperature: ${weatherData.temp}°C</p>
                <p>Venue Address: ${venueAddress}</p>
                <div id="map${i}" style="width: 300px; height: 200px;"></div>
                <script>
                    const geocoder${i} = new google.maps.Geocoder();
                    const eventLocation${i} = "${venueAddress}";

                    geocoder${i}.geocode({ 'address': eventLocation${i} }, function(results, status) {
                        if (status === 'OK') {
                            const map${i} = new google.maps.Map(document.getElementById('map${i}'), {
                                zoom: 15,
                                center: results[0].geometry.location,
                            });

                            const marker${i} = new google.maps.Marker({
                                map: map${i},
                                position: results[0].geometry.location,
                                title: '${eventName}',
                            });
                        } else {
                            console.error('Geocode was not successful for the following reason: ' + status);
                        }
                    });
                </script>
            </div>
        `;
    }

    const str =
        '<!DOCTYPE html>' +
        '<html><head><title>Ticketmaster JSON</title></head>' +
        '<link rel="stylesheet" type="text/css" href="/styles.css">' +
        '</head>' +
        '<body>' +
        '<h1>' + title + '</h1>' +
        s +
        '<a href="/">Back to Search</a>' +
        '</body></html>';
    return str;
}

module.exports = router;
