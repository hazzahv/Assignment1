const express = require('express');
const ticketmasterRouter = require('./routes/event');
const app = express();
const hostname = '0.0.0.0';
const port = 8080;

app.use(express.static('public'));

const { incrementPageCounterMiddleware, getPageCounter } = require('./counter');
app.use(incrementPageCounterMiddleware);

app.get('/', async (req, res) => {
    const pageCounter = await getPageCounter();

    const str = '<!DOCTYPE html>' +
        '<html><head><title>Ticketmaster Demo</title></head>' +
        '<link rel="stylesheet" type="text/css" href="/styles.css">' +
        '</head>' +
        '<body>' +
        '<h1>' + 'Event Information' + '</h1>' +
        '<form action="/search" method="get">' +
        '<label for="city">City:</label>' +
        '<input type="text" id="city" name="query" required>' +
        '<label for="number">Number of Results:</label>' +
        '<input type="number" id="number" name="number" required>' +
        '<p>Preferred Weather Conditions:</p>' +
        '<input type="checkbox" id="sun" name="sun" value="Sun">' +
        '<label for="sun">Sun</label>' +
        '<input type="checkbox" id="cloud" name="cloud" value="Cloud">' +
        '<label for="cloud">Cloud</label>' +
        '<button type="submit">Search</button>' +
        '</form>' +
        '<ul>' +
        '<li>Query - Please enter a city to see what concerts are on as well as the expected weather and map data for the event</li>' +
        '<li>Preferred Conditions - Please select which weather condition you would like to filter by (can be left blank)</li>' +
        '<li>(BETA) number - max number of results returned, the weather API has a limit of 50 calls per day, please keep calls below 5</li>' +
        '</ul>' +
        '<p>Total Page Visits: ' + pageCounter + '</p>' +
        '</body></html>';
    res.writeHead(200, { 'content-type': 'text/html' });
    res.write(str);
    res.end();
});

app.use('/search', ticketmasterRouter);

app.listen(port, hostname, () => {
    console.log(`Express app listening at http://${hostname}:${port}/`);
});
