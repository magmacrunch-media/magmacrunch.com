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

  /* ── ENTITY NAMES ── */
  /* Hardcoded archive entity names — no API calls needed */
  const ENTITY_NAMES = [
    'Juanito Thompson',
    'Bottle Boys',
    'C.P. Rutledge',
    'Dag Henderson',
    'DDT LLC',
    'Dino Spumoni',
    "The Four B's",
    'Jon McCoy',
    'Sex Van Floor Plan',
    "Texas Hold'Em Lava Dome",
    'Vinny Bobarino',
    'Woah.',
    'Audio Sound Paper',
    'Fruity Loops Debauchery Bros.',
    'College Green Apt.',
    'The Tuna Can',
    'Irvin House',
    'Melrose House',
    'Frogwood Manor',
    'Twin Maples',
    'Green Street Apt.',
    'magmacrunch media',
    'magmacrunch music',
    'The Slop Collective',
  ];

  /* pick 6 random names on load */
  var fetchedNames = ENTITY_NAMES.slice().sort(function () { return Math.random() - 0.5; }).slice(0, 6).map(function (n) { return n.toUpperCase(); });

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
