// Ensure the DOM is fully loaded before running the script
document.addEventListener('DOMContentLoaded', function () {
    const countryFilter = document.getElementById('country-filter');
    const stationContainer = document.getElementById('stations');

    // Fetch available countries and populate the dropdown
    async function fetchCountries() {
        const apiUrl = 'https://de1.api.radio-browser.info/json/countries';
        try {
            const response = await fetch(apiUrl);
            const countries = await response.json();

            // Populate the dropdown with country options
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

    // Fetch and display radio stations based on the selected country
    async function fetchStationsByCountry(country = 'all') {
        let apiUrl;
        if (country === 'all') {
            apiUrl = 'https://de1.api.radio-browser.info/json/stations';
        } else {
            apiUrl = `https://de1.api.radio-browser.info/json/stations/bycountry/${country}`;
        }

        try {
            const response = await fetch(apiUrl);
            const stations = await response.json();

            stationContainer.innerHTML = ''; // Clear previous stations

            if (stations.length === 0) {
                stationContainer.innerHTML = '<p>No stations found for this location.</p>';
                return;
            }

            stations.slice(0, 10).forEach(station => {
                const stationElement = document.createElement('div');
                stationElement.className = 'station';

                stationElement.innerHTML = `
                    <h3>${station.name}</h3>
                    <p>Country: ${station.country}</p>
                    <audio controls>
                        <source src="${station.url_resolved}" type="audio/mpeg">
                        Your browser does not support the audio element.
                    </audio>
                `;

                stationContainer.appendChild(stationElement);
            });
        } catch (error) {
            console.error('Error fetching stations:', error);
            stationContainer.innerHTML = '<p>Error loading stations. Please try again later.</p>';
        }
    }

    // Event listener for the country filter
    countryFilter.addEventListener('change', function () {
        const selectedCountry = countryFilter.value;
        fetchStationsByCountry(selectedCountry);
    });

    // Initial data fetch
    fetchCountries(); // Populate the dropdown
    fetchStationsByCountry(); // Load all stations by default
});
