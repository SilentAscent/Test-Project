document.addEventListener('DOMContentLoaded', function () {
    const countryFilter = document.getElementById('country-filter');
    const searchBar = document.getElementById('search-bar');
    const stationContainer = document.getElementById('stations');

    let allStations = []; // Store all stations for filtering

    // Fetch available countries and populate the dropdown
    async function fetchCountries() {
        const apiUrl = 'https://de1.api.radio-browser.info/json/countries';
        try {
            const response = await fetch(apiUrl);
            const countries = await response.json();

            countries.forEach(country => {
                const option = document.createElement('option');
                option.value = country.name;
                option.textContent = `${country.name} (${country.stationcount} stations)`;
                countryFilter.appendChild(option);
            });
        } catch (error) {
            console.error('Error fetching countries:', error);
        }
    }

    // Fetch and display radio stations based on country or search
    async function fetchStationsByCountry(country = 'all') {
        let apiUrl;
        if (country === 'all') {
            apiUrl = 'https://de1.api.radio-browser.info/json/stations';
        } else {
            apiUrl = `https://de1.api.radio-browser.info/json/stations/bycountry/${country}`;
        }

        try {
            const response = await fetch(apiUrl);
            allStations = await response.json();

            displayStations(allStations);
        } catch (error) {
            console.error('Error fetching stations:', error);
            stationContainer.innerHTML = '<p>Error loading stations. Please try again later.</p>';
        }
    }

    // Display stations in a grid
    function displayStations(stations) {
        stationContainer.innerHTML = ''; // Clear previous stations

        if (stations.length === 0) {
            stationContainer.innerHTML = '<p>No stations found for this location.</p>';
            return;
        }

        stations.forEach(station => {
            const stationElement = document.createElement('div');
            stationElement.className = 'station';

            stationElement.innerHTML = `
                <h3>${station.name}</h3>
                <p>${station.country}</p>
                <audio controls>
                    <source src="${station.url_resolved}" type="audio/mpeg">
                    Your browser does not support the audio element.
                </audio>
            `;

            stationContainer.appendChild(stationElement);
        });
    }

    // Filter stations by search query
    function filterStationsBySearch(query) {
        const filteredStations = allStations.filter(station =>
            station.name.toLowerCase().includes(query.toLowerCase())
        );
        displayStations(filteredStations);
    }

    // Event listeners
    countryFilter.addEventListener('change', function () {
        const selectedCountry = countryFilter.value;
        fetchStationsByCountry(selectedCountry);
    });

    searchBar.addEventListener('input', function () {
        const query = searchBar.value;
        filterStationsBySearch(query);
    });

    // Initial data fetch
    fetchCountries(); // Populate the dropdown
    fetchStationsByCountry(); // Load all stations by default
});
