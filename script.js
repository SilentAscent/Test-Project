document.getElementById('myButton').addEventListener('click', function() {
    alert('Button clicked! Welcome to your app!');
});
// Fetch and display radio stations
async function fetchStations() {
    const genre = 'pop'; // Change this to the genre you want
    const apiUrl = `https://de1.api.radio-browser.info/json/stations/bytag/${genre}`;
    
    try {
        const response = await fetch(apiUrl);
        const stations = await response.json();
        
        const stationContainer = document.getElementById('stations');
        stationContainer.innerHTML = ''; // Clear previous stations
        
        stations.slice(0, 5).forEach(station => {
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
        console.error('Error fetching radio stations:', error);
    }
}

// Fetch stations when the page loads
window.onload = fetchStations;
