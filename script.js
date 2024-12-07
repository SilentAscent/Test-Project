document.addEventListener('DOMContentLoaded', function () {
    const stationDetails = document.getElementById('station-details');
    const loadingIndicator = document.getElementById('loading');
    const searchBar = document.getElementById('search-bar');
    const genreFilter = document.getElementById('genre-filter');
    const countryFilter = document.getElementById('country-filter');
    let allMarkers = [];
    let currentStations = [];
    let currentBounds = null;

    // Initialize Leaflet Map
    const map = L.map('map').setView([20, 0], 2);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Fetch and populate country dropdown
    async function fetchCountries() {
        const apiUrl = 'https://de1.api.radio-browser.info/json/countries';
        try {
            const response = await fetch(apiUrl);
            const countries = await response.json();
            countries.forEach(country => {
                const option = document.createElement('option');
                option.value = country.name;
                option.textContent = country.name;
                countryFilter.appendChild(option);
            });
        } catch (error) {
            console.error('Error fetching countries:', error);
        }
    }

    // Fetch stations
    async function fetchStations() {
        const apiUrl = 'https://de1.api.radio-browser.info/json/stations';
        showLoading(true);
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`API returned status: ${response.status}`);
            const stations = await response.json();
            currentStations = stations;
            displayStationsOnMap(stations);
            showLoading(false);
        } catch (error) {
            console.error('Error fetching stations:', error);
            stationDetails.innerHTML = '<h3>Error loading stations</h3>';
            showLoading(false);
        }
    }

    // Filter and display stations
    function filterStations() {
        const searchQuery = searchBar.value.toLowerCase();
        const selectedGenre = genreFilter.value;
        const selectedCountry = countryFilter.value;

        const filteredStations = currentStations.filter(station => {
            const matchesSearch = station.name.toLowerCase().includes(searchQuery);
            const matchesGenre = selectedGenre === 'all' || station.tags.includes(selectedGenre);
            const matchesCountry = selectedCountry === 'all' || station.country === selectedCountry;
            return matchesSearch && matchesGenre && matchesCountry;
        });

        displayStationsOnMap(filteredStations);
    }

    // Display stations on the map
    function displayStationsOnMap(stations) {
        allMarkers.forEach(marker => map.removeLayer(marker));
        allMarkers = [];

        if (stations.length === 0) {
            stationDetails.innerHTML = '<h3>No stations found</h3>';
            return;
        }

        stations.forEach(station => {
            if (station.geo_lat && station.geo_long) {
                const marker = L.marker([station.geo_lat, station.geo_long]).addTo(map);
                marker.bindPopup(`<strong>${station.name}</strong><br>${station.country}`);
                marker.on('click', () => displayStationInfo(station));
                allMarkers.push(marker);
            }
        });
    }

    // Display station info
    function displayStationInfo(station) {
        stationDetails.innerHTML = `
            <h3>${station.name}</h3>
            <p><strong>Country:</strong> ${station.country}</p>
            <p><strong>Tags:</strong> ${station.tags || 'None'}</p>
            <audio controls>
                <source src="${station.url_resolved}" type="audio/mpeg">
                Your browser does not support the audio element.
            </audio>
        `;
    }

    // Show or hide loading indicator
    function showLoading(isLoading) {
        loadingIndicator.style.display = isLoading ? 'block' : 'none';
    }

    // Event listeners for filters
    searchBar.addEventListener('input', filterStations);
    genreFilter.addEventListener('change', filterStations);
    countryFilter.addEventListener('change', filterStations);

    // Initial fetches
    fetchCountries();
    fetchStations();
});
