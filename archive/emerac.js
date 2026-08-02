(function () {
  /* ── LED GRID ── */
  const emeracGrid = document.getElementById('emerac-leds');
  if (!emeracGrid) return;

  const totalLeds = 60; // 12x5 grid
  const LED_ON_RATIO = 0.25;
  const LED_INTERVAL = 150;
  const ledArray = [];

  for (let i = 0; i < totalLeds; i++) {
    const led = document.createElement('div');
    led.className = 'mini-led';
    emeracGrid.appendChild(led);
    ledArray.push(led);
  }

  /* randomly light ~25% of LEDs red or gold */
  function processData() {
    ledArray.forEach(led => led.classList.remove('on-red', 'on-gold'));
    const activeCount = Math.floor(totalLeds * LED_ON_RATIO);
    for (let i = 0; i < activeCount; i++) {
      const randomIdx = Math.floor(Math.random() * totalLeds);
      const colorClass = Math.random() > 0.5 ? 'on-red' : 'on-gold';
      ledArray[randomIdx].classList.add(colorClass);
    }
  }

  const processDataInterval = setInterval(processData, LED_INTERVAL);

  /* ── MUSICBRAINZ FETCH ── */
  /* MusicBrainz UUIDs for archive entities (artists, places, labels) */
  const ARCHIVE_IDS = [
    { id: 'ddcbeb01-edb5-4e74-b5cd-23d1b64d3086', type: 'artist' }, // Juanito Thompson
    { id: 'e33d1006-01a5-4266-aade-b7f6c1dff8e3', type: 'artist' }, // Bottle Boys
    { id: '44c1e0bd-be4c-4a0b-8f06-864c8e2fedcc', type: 'artist' }, // C.P. Rutledge
    { id: '605cc914-2aff-4e2b-9657-524c7009cb18', type: 'artist' }, // Dag Henderson
    { id: '0335c576-94a4-4adb-a323-6effff5914e0', type: 'artist' }, // DDT LLC
    { id: '5b954c0a-1375-40de-ae5f-a245e4f942c6', type: 'artist' }, // Dino Spumoni
    { id: 'bdf6e0d0-6886-4801-b7ce-c9ced5d377a8', type: 'artist' }, // The Four B's
    { id: '33c830f0-d5be-4baf-b8db-3dc754e74c16', type: 'artist' }, // Jon McCoy
    { id: '260e4953-a937-4355-8389-d1baaf24eca5', type: 'artist' }, // Sex Van Floor Plan
    { id: '4d945923-9deb-4cd0-a477-6e1474cb306c', type: 'artist' }, // Texas Hold'Em Lava Dome
    { id: 'f701c2bc-6eb6-4e7b-b950-f0c2426cb91c', type: 'artist' }, // Vinny Bobarino
    { id: '0cb54a5f-3c60-4635-abb3-e6bc60fa7d9f', type: 'artist' }, // Woah.
    { id: '76708e20-5d88-4699-adf6-a1f2118ef661', type: 'artist' }, // Audio Sound Paper
    { id: 'b7846e25-306e-4ca9-8db1-0391ab159a36', type: 'artist' }, // Fruity Loops Debauchery Bros.
    { id: 'c6c69d44-8408-4a0a-9dbf-8b3ee903bc5f', type: 'place' }, // College Green Apt.
    { id: '3ecebfcc-6824-46a9-9e1a-ecc26f69a4a2', type: 'place' }, // The Tuna Can
    { id: '26cbb244-48c7-49e5-863c-5dde5388dde1', type: 'place' }, // Irvin House
    { id: 'f30be60e-94b4-465a-8e75-8cbdefaffbc8', type: 'place' }, // Melrose House
    { id: '362e9df6-ce39-4805-841e-c113e4e2a7c9', type: 'place' }, // Frogwood Manor
    { id: 'e697fa03-e300-421a-8fd3-3b026d8d4f13', type: 'place' }, // Twin Maples
    { id: '1fc551c6-d3d5-43d0-a3bb-9e5606bdbebe', type: 'place' }, // Green Street Apt.
    { id: '39446d03-fe9c-47d0-81a9-2b42d34fb400', type: 'label' }, // magmacrunch media
    { id: 'c78b5612-2300-4ee1-8663-299ddcf9ce25', type: 'label' }, // magmacrunch music
    { id: 'ad82d124-e41e-49e8-9bf9-53e836b44336', type: 'label' }, // The Slop Collective
  ];

  const MB_DELAY = 1200;
  const MB_RETRIES = 4;
  const RETRY_DELAY_429 = 2500;
  const RETRY_DELAY_ERROR = 1500;

  const delay = ms => new Promise(r => setTimeout(r, ms));

  /* fetch with retry: backoff on 429/503, exponential delay on errors */
  async function fetchWithRetry(url, retries) {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url);
        if (res.status === 429 || res.status === 503) {
          await delay(RETRY_DELAY_429 * (i + 1));
          continue;
        }
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return await res.json();
      } catch (e) {
        if (i === retries - 1) throw e;
        await delay(RETRY_DELAY_ERROR * (i + 1));
      }
    }
  }

  const fetchedNames = [];

  /* pick 6 random entities, fetch names with 1.2s delay between requests */
  async function fetchArchiveEntities() {
    const shuffled = ARCHIVE_IDS.slice().sort(function () { return Math.random() - 0.5; });
    const picked = shuffled.slice(0, 6);
    for (var j = 0; j < picked.length; j++) {
      var entity = picked[j];
      try {
        var data = await fetchWithRetry(
          'https://musicbrainz.org/ws/2/' + entity.type + '/' + entity.id + '?fmt=json',
          MB_RETRIES
        );
        if (data && data.name) {
          fetchedNames.push(data.name.toUpperCase());
        }
      } catch (e) {
        // Silently fail — hardcoded messages still show
      }
      await delay(MB_DELAY);
    }
  }

  fetchArchiveEntities();

  /* ── CRT DISPLAY ── */
  const CRT_UPDATE_INTERVAL = 1800;
  const CRT_MAX_LINES = 4;
  const CRT_SHOW_CHANCE = 0.6;
  const CRT_NAME_CHANCE = 0.5;

  const statusDisplay = document.getElementById('emerac-status');

  const systemPhrases = [
    '> INDEXING TAPE...',
    '> QUERYING ARTISTS',
    '> LOCATING PLACES',
    '> CONNECTING TO MUSICBRAINZ',
    '> SIGNAL FOUND',
    '> CHECKING CATALOG...',
    '> SCANNING ARCHIVE',
    '> READING SECTORS',
    '> DECODING RECORDS',
    '> LOADING INDEX',
    '> VERIFYING DATA',
    '> SYNC COMPLETE'
  ];

  const namePrefixes = ['INDEXING:', 'QUERYING:', 'LOCATING:', 'SCANNING:', 'LOADING:'];

  /* mix fetched artist/place names with system phrases at 50/50 chance */
  function getRandomPhrase() {
    if (fetchedNames.length > 0 && Math.random() > CRT_NAME_CHANCE) {
      var name = fetchedNames[Math.floor(Math.random() * fetchedNames.length)];
      var prefix = namePrefixes[Math.floor(Math.random() * namePrefixes.length)];
      return '> ' + prefix + ' ' + name;
    }
    return systemPhrases[Math.floor(Math.random() * systemPhrases.length)];
  }

  var crtLines = ['> SYS_INIT...', '> EMERAC ONLINE'];
  statusDisplay.innerHTML = crtLines.join('<br>');

  /* append a new line ~60% of the time, keep max 4 lines */
  function updateCrt() {
    if (Math.random() > (1 - CRT_SHOW_CHANCE)) {
      crtLines.push(getRandomPhrase());
      if (crtLines.length > CRT_MAX_LINES) crtLines.shift();
      statusDisplay.innerHTML = crtLines.join('<br>');
    }
  }

  const crtInterval = setInterval(updateCrt, CRT_UPDATE_INTERVAL);

  window.__pageCleanup = function () {
    clearInterval(processDataInterval);
    clearInterval(crtInterval);
  };
})();
