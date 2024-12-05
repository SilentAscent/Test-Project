document.addEventListener('DOMContentLoaded', function () {
    const countryFilter = document.getElementById('country-filter');
    const genreFilter = document.getElementById('genre-filter');
    const moodFilter = document.getElementById('mood-filter');
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

    // Fetch and display radio stations based on filters
    async function fetchStations(filters = {}) {
        let apiUrl = 'https://de1.api.radio-browser.info/json/stations';

        if (filters.country && filters.country !== 'all') {
            apiUrl = `https://de1.api.radio-browser.info/json/stations/bycountry/${encodeURIComponent(filters.country)}`;
        } else if (filters.genre && filters.genre !== 'all') {
            apiUrl = `https://de1.api.radio-browser.info/json/stations/bytag/${encodeURIComponent(filters.genre)}`;
        } else if (filters.mood && filters.mood !== 'all') {
            apiUrl = `https://de1.api.radio-browser.info/json/stations/bytag/${encodeURIComponent(filters.mood)}`;
        }

        try {
            const response = await fetch(apiUrl);
            const stations = await response.json();
            allStations = stations || [];
            applyFiltersAndDisplay();
        } catch (error) {
            console.error('Error fetching stations:', error);
            stationContainer.innerHTML = '<p>Error loading stations. Please try again later.</p>';
        }
    }

    // Apply filters and display stations
    function applyFiltersAndDisplay() {
        const query = searchBar.value.toLowerCase();
        const filteredStations = allStations.filter(station => {
            return station.name.toLowerCase().includes(query);
        });

        displayStations(filteredStations);
    }

    // Display stations in a grid
    function displayStations(stations) {
        stationContainer.innerHTML = ''; // Clear previous stations

        if (!stations || stations.length === 0) {
            stationContainer.innerHTML = '<p>No stations found for this filter.</p>';
            return;
        }

        stations.slice(0, 20).forEach(station => {
            if (!station.url_resolved || station.url_resolved === "") {
                return; // Skip invalid stations
            }

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

    // Event listeners for filters
    countryFilter.addEventListener('change', function () {
        fetchStations({ country: countryFilter.value });
    });

    genreFilter.addEventListener('change', function () {
        fetchStations({ genre: genreFilter.value });
    });

    moodFilter.addEventListener('change', function () {
        fetchStations({ mood: moodFilter.value });
    });

    searchBar.addEventListener('input', function () {
        applyFiltersAndDisplay();
    });

    // Initial data fetch
    fetchCountries(); // Populate the country dropdown
    fetchStations(); // Load all stations by default
});
