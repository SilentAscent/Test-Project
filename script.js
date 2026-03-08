document.addEventListener('DOMContentLoaded', function () {
    const SEARCH_LIMIT = 8000;
    const LIST_LIMIT = 80;
    const MAP_LIMIT = 2200;
    const DEFAULT_TAGS = ['all', 'chillout', 'downtempo', 'electronic', 'ambient', 'lofi', 'pop', 'rock'];
    const CURATED_STATIONS = [
        {
            stationuuid: 'curated-nordic-chillout-radio',
            name: 'Nordic Chillout Radio',
            country: 'Latvia',
            state: 'Riga',
            language: 'English',
            codec: 'MP3',
            bitrate: 128,
            votes: 0,
            clickcount: 0,
            tags: ['chillout', 'downtempo', 'electronic'],
            url: 'https://listen.radioking.com/radio/672094/stream/736492',
            lat: 56.9496,
            lon: 24.1052
        }
    ];

    const stationTitle = document.getElementById('station-title');
    const stationDetails = document.getElementById('station-details');
    const stationCount = document.getElementById('station-count');
    const resultsSummary = document.getElementById('results-summary');
    const stationList = document.getElementById('station-list');
    const searchBar = document.getElementById('search-bar');
    const tagFilters = document.getElementById('tag-filters');
    const loadingIndicator = document.getElementById('loading');
    const favoritesToggle = document.getElementById('favorites-toggle');
    const favoriteButton = document.getElementById('favorite-button');
    const randomButton = document.getElementById('random-button');
    const playToggle = document.getElementById('play-toggle');
    const audioPlayer = document.getElementById('audio-player');
    const timerStatus = document.getElementById('timer-status');

    const map = L.map('map', {
        preferCanvas: true,
        worldCopyJump: true,
        zoomControl: false
    });

    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    map.setView([57.2, 22.8], 5);

    let stations = [];
    let filteredStations = [];
    let activeTag = 'all';
    let selectedStationId = '';
    const markerLayers = [];
    const favoriteIds = new Set(loadFavorites());

    renderTagFilters(DEFAULT_TAGS);
    favoriteButton.disabled = true;

    async function fetchStations() {
        showLoading(true, 'Loading stations...');

        const params = new URLSearchParams({
            hidebroken: 'true',
            has_geo_info: 'true',
            limit: String(SEARCH_LIMIT),
            offset: '0',
            order: 'clickcount',
            reverse: 'true'
        });

        try {
            const response = await fetch(`https://de1.api.radio-browser.info/json/stations/search?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`API returned status ${response.status}`);
            }

            const payload = await response.json();
            const liveStations = payload
                .map(normalizeStation)
                .filter(Boolean);

            stations = mergeCuratedStations(liveStations);
            renderTagFilters(buildTagList(stations));
            applyFilters();
            showLoading(false, '');
        } catch (error) {
            console.error('Error fetching stations:', error);
            stations = mergeCuratedStations([]);
            renderTagFilters(buildTagList(stations));
            applyFilters();
            showLoading(true, 'Loaded fallback stations.');
        }
    }

    function normalizeStation(station) {
        const lat = Number(station.geo_lat);
        const lon = Number(station.geo_long);

        if (!Number.isFinite(lat) || !Number.isFinite(lon) || !station.url_resolved) {
            return null;
        }

        return {
            stationuuid: station.stationuuid,
            name: station.name || 'Unknown station',
            country: station.country || 'Unknown country',
            state: station.state || '',
            language: station.language || 'Unknown',
            codec: station.codec || 'Unknown',
            bitrate: station.bitrate || 0,
            votes: station.votes || 0,
            clickcount: station.clickcount || 0,
            tags: (station.tags || '')
                .split(',')
                .map((tag) => tag.trim().toLowerCase())
                .filter(Boolean),
            url: station.url_resolved,
            lat,
            lon
        };
    }

    function mergeCuratedStations(items) {
        const names = new Set(items.map((station) => station.name.trim().toLowerCase()));
        const merged = [...items];

        CURATED_STATIONS.forEach((station) => {
            if (!names.has(station.name.trim().toLowerCase())) {
                merged.unshift(station);
            }
        });

        return merged;
    }

    function applyFilters() {
        const query = searchBar.value.trim().toLowerCase();
        const favoritesOnly = favoritesToggle.classList.contains('active');

        filteredStations = stations.filter((station) => {
            const haystack = [
                station.name,
                station.country,
                station.state,
                station.language,
                station.tags.join(' ')
            ].join(' ').toLowerCase();

            const matchesQuery = !query || haystack.includes(query);
            const matchesTag = activeTag === 'all' || station.tags.includes(activeTag);
            const matchesFavorite = !favoritesOnly || favoriteIds.has(station.stationuuid);

            return matchesQuery && matchesTag && matchesFavorite;
        });

        stationCount.textContent = `${filteredStations.length.toLocaleString()} stations`;
        resultsSummary.textContent = `${filteredStations.length.toLocaleString()} visible`;
        renderStationList(filteredStations);
        renderMarkers(filteredStations);

        if (selectedStationId) {
            const stillVisible = filteredStations.find((station) => station.stationuuid === selectedStationId);
            if (!stillVisible) {
                clearSelection();
            }
        }
    }

    function renderTagFilters(tags) {
        tagFilters.innerHTML = '';

        tags.forEach((tag) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'chip';
            button.dataset.tag = tag;
            button.textContent = tag === 'all' ? 'All' : toTitleCase(tag);
            if (tag === activeTag) {
                button.classList.add('active');
            }
            tagFilters.appendChild(button);
        });
    }

    function renderStationList(items) {
        stationList.innerHTML = '';

        if (!items.length) {
            stationList.innerHTML = '<p class="muted empty-state">No stations match the current filters.</p>';
            return;
        }

        items.slice(0, LIST_LIMIT).forEach((station) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'station-card';
            if (station.stationuuid === selectedStationId) {
                button.classList.add('active');
            }

            button.innerHTML = `
                <strong>${escapeHtml(station.name)}</strong>
                <span>${escapeHtml(station.state || station.country)}, ${escapeHtml(station.country)}</span>
            `;

            button.addEventListener('click', () => {
                selectStation(station, {
                    focus: true,
                    autoplay: true
                });
            });

            stationList.appendChild(button);
        });
    }

    function renderMarkers(items) {
        markerLayers.forEach((marker) => map.removeLayer(marker));
        markerLayers.length = 0;

        items.slice(0, MAP_LIMIT).forEach((station) => {
            const isSelected = station.stationuuid === selectedStationId;
            const marker = L.circleMarker([station.lat, station.lon], {
                radius: isSelected ? 7 : 4,
                color: isSelected ? '#16d6a1' : '#ffffff',
                weight: isSelected ? 1.5 : 1,
                fillColor: isSelected ? '#16d6a1' : '#ffffff',
                fillOpacity: isSelected ? 0.9 : 0.78
            });

            marker.on('click', () => {
                selectStation(station, {
                    focus: false,
                    autoplay: false
                });
            });

            marker.addTo(map);
            markerLayers.push(marker);
        });
    }

    function selectStation(station, options = {}) {
        selectedStationId = station.stationuuid;
        stationTitle.textContent = station.name;
        stationDetails.innerHTML = `
            <p class="location-line">${escapeHtml(station.state || station.country)}, ${escapeHtml(station.country)}</p>
            <p class="meta-line">${escapeHtml(formatTags(station.tags))}</p>
            <p class="meta-line">${escapeHtml(station.language)} / ${escapeHtml(station.codec)} / ${station.bitrate ? `${station.bitrate} kbps` : 'Unknown bitrate'}</p>
        `;

        playToggle.disabled = false;
        favoriteButton.disabled = false;
        favoriteButton.classList.toggle('active', favoriteIds.has(station.stationuuid));
        favoriteButton.textContent = favoriteIds.has(station.stationuuid) ? 'Saved' : 'Save';
        audioPlayer.src = station.url;
        audioPlayer.load();

        if (options.autoplay) {
            playSelectedStation();
        }

        if (options.focus !== false) {
            focusStation(station);
        }

        renderStationList(filteredStations);
        renderMarkers(filteredStations);
    }

    function clearSelection() {
        selectedStationId = '';
        stationTitle.textContent = 'Select a station';
        stationDetails.innerHTML = '<p>Choose a station from the map or the list to start streaming.</p>';
        playToggle.disabled = true;
        favoriteButton.disabled = true;
        favoriteButton.classList.remove('active');
        favoriteButton.textContent = 'Save';
        audioPlayer.pause();
        audioPlayer.removeAttribute('src');
        audioPlayer.load();
        renderStationList(filteredStations);
        renderMarkers(filteredStations);
    }

    function focusStation(station) {
        map.flyTo([station.lat, station.lon], 8, {
            animate: true,
            duration: 1
        });
    }

    function playSelectedStation() {
        if (!audioPlayer.src) {
            return;
        }

        audioPlayer.play().catch((error) => {
            console.error('Playback failed:', error);
        });
    }

    function toggleFavoriteForSelected() {
        if (!selectedStationId) {
            return;
        }

        if (favoriteIds.has(selectedStationId)) {
            favoriteIds.delete(selectedStationId);
        } else {
            favoriteIds.add(selectedStationId);
        }

        saveFavorites([...favoriteIds]);
        favoriteButton.classList.toggle('active', favoriteIds.has(selectedStationId));
        favoriteButton.textContent = favoriteIds.has(selectedStationId) ? 'Saved' : 'Save';
        applyFilters();
    }

    function playRandomStation() {
        if (!filteredStations.length) {
            return;
        }

        const station = filteredStations[Math.floor(Math.random() * filteredStations.length)];
        selectStation(station, {
            focus: true,
            autoplay: true
        });
    }

    function showLoading(isVisible, message) {
        loadingIndicator.style.display = isVisible ? 'block' : 'none';
        loadingIndicator.textContent = message;
    }

    function formatTags(tags) {
        if (!tags.length) {
            return 'No tags available';
        }

        return tags.slice(0, 3).map(toTitleCase).join(' / ');
    }

    function buildTagList(items) {
        const counts = new Map();

        items.forEach((station) => {
            station.tags.forEach((tag) => {
                if (tag.length < 3) {
                    return;
                }

                counts.set(tag, (counts.get(tag) || 0) + 1);
            });
        });

        const trending = [...counts.entries()]
            .sort((left, right) => right[1] - left[1])
            .map(([tag]) => tag)
            .filter((tag) => !DEFAULT_TAGS.includes(tag))
            .slice(0, 6);

        return [...DEFAULT_TAGS, ...trending];
    }

    function toTitleCase(value) {
        return value.replace(/\b\w/g, (char) => char.toUpperCase());
    }

    function loadFavorites() {
        try {
            const saved = window.localStorage.getItem('radiowaves-favorites');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Could not load favorites:', error);
            return [];
        }
    }

    function saveFavorites(ids) {
        try {
            window.localStorage.setItem('radiowaves-favorites', JSON.stringify(ids));
        } catch (error) {
            console.error('Could not save favorites:', error);
        }
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }

    searchBar.addEventListener('input', applyFilters);

    tagFilters.addEventListener('click', (event) => {
        const button = event.target.closest('.chip');
        if (!button) {
            return;
        }

        activeTag = button.dataset.tag;
        renderTagFilters(buildTagList(stations));
        applyFilters();
    });

    favoritesToggle.addEventListener('click', () => {
        favoritesToggle.classList.toggle('active');
        applyFilters();
    });

    favoriteButton.addEventListener('click', toggleFavoriteForSelected);
    randomButton.addEventListener('click', playRandomStation);

    playToggle.addEventListener('click', () => {
        if (audioPlayer.paused) {
            playSelectedStation();
            return;
        }

        audioPlayer.pause();
    });

    audioPlayer.addEventListener('play', () => {
        playToggle.textContent = 'Pause';
    });

    audioPlayer.addEventListener('pause', () => {
        playToggle.textContent = 'Play';
    });

    fetchStations();
});
