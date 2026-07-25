/**
 * i18n.js — Internationalization for Parchis
 * Spanish/English language toggle with localStorage persistence.
 */

var I18n = (function() {
    'use strict';

    var STORAGE_KEY = 'pc-lang';
    var currentLang = localStorage.getItem(STORAGE_KEY) || 'es';

    var strings = { es: {}, en: {} };

    // -- Spanish --
    strings.es.startSubtitle = '// el clasico juego espanol //';
    strings.es.namePlaceholder = 'tu nombre';
    strings.es.roomPlaceholder = 'codigo de sala (opcional)';
    strings.es.join = 'UNIRSE';
    strings.es.createRoom = 'CREAR SALA';
    strings.es.spectate = 'ESPECTAR';
    strings.es.lobbyTitle = 'SALA DE ESPERA';
    strings.es.roomPrefix = 'SALA: ';
    strings.es.playerCount = 'jugadores';
    strings.es.startGame = 'INICIAR PARTIDA';
    strings.es.waiting = 'ESPERANDO...';
    strings.es.diceLabel = 'DADOS';
    strings.es.roll = 'TIRAR';
    strings.es.quit = 'SALIR';
    strings.es.gameOver = 'FIN DE PARTIDA!';
    strings.es.playAgain = 'JUGAR DE NUEVO';
    strings.es.chatHeader = '// CHAT //';
    strings.es.chatPlaceholder = 'escribe algo...';
    strings.es.send = 'ENVIAR';
    strings.es.yourTurn = 'TU TURNO';
    strings.es.turnOf = 'TURNO DE ';
    strings.es.noMoves = 'Sin movimientos - pasando turno';
    strings.es.selectPiece = 'Elige una ficha para mover';
    strings.es.rollPrompt = 'Tu turno - tira los dados!';
    strings.es.captureSuffix = 'capturo una ficha';
    strings.es.doubles = 'doble!';
    strings.es.systemLabel = 'sistema';
    strings.es.confirmQuit = 'Abandonar la partida?';
    strings.es.hostBadge = 'ANFITRION';
    strings.es.playerDefault = 'Jugador';
    strings.es.spectatorDefault = 'Espectador';
    strings.es.disconnected = 'Desconectado - recarga para reconectar';
    strings.es.promotedHost = 'Ahora eres el anfitrion';
    strings.es.connectionError = 'Error de conexion';
    strings.es.settings = 'AJUSTES';
    strings.es.language = 'IDIOMA';
    strings.es.close = 'CERRAR';
    strings.es.playerJoined = 'se unio a la sala';
    strings.es.wins = 'ha ganado';

    // -- English --
    strings.en.startSubtitle = '// classic spanish board game //';
    strings.en.namePlaceholder = 'your name';
    strings.en.roomPlaceholder = 'room code (optional)';
    strings.en.join = 'JOIN';
    strings.en.createRoom = 'CREATE ROOM';
    strings.en.spectate = 'SPECTATE';
    strings.en.lobbyTitle = 'WAITING ROOM';
    strings.en.roomPrefix = 'ROOM: ';
    strings.en.playerCount = 'players';
    strings.en.startGame = 'START GAME';
    strings.en.waiting = 'WAITING...';
    strings.en.diceLabel = 'DICE';
    strings.en.roll = 'ROLL';
    strings.en.quit = 'QUIT';
    strings.en.gameOver = 'GAME OVER!';
    strings.en.playAgain = 'PLAY AGAIN';
    strings.en.chatHeader = '// CHAT //';
    strings.en.chatPlaceholder = 'say something...';
    strings.en.send = 'SEND';
    strings.en.yourTurn = 'YOUR TURN';
    strings.en.turnOf = 'TURN: ';
    strings.en.noMoves = 'No moves - skipping turn';
    strings.en.selectPiece = 'Select a piece to move';
    strings.en.rollPrompt = 'Your turn - roll the dice!';
    strings.en.captureSuffix = 'captured a piece';
    strings.en.doubles = 'doubles!';
    strings.en.systemLabel = 'system';
    strings.en.confirmQuit = 'Leave the game?';
    strings.en.hostBadge = 'HOST';
    strings.en.playerDefault = 'Player';
    strings.en.spectatorDefault = 'Spectator';
    strings.en.disconnected = 'Disconnected - refresh to reconnect';
    strings.en.promotedHost = 'You are now the host';
    strings.en.connectionError = 'Connection error';
    strings.en.settings = 'SETTINGS';
    strings.en.language = 'LANGUAGE';
    strings.en.close = 'CLOSE';
    strings.en.playerJoined = 'joined the room';
    strings.en.wins = 'wins';

    function t(key) {
        return (strings[currentLang] && strings[currentLang][key]) ||
               (strings.es && strings.es[key]) || key;
    }

    function getLang() {
        return currentLang;
    }

    function setLang(lang) {
        if (lang !== 'es' && lang !== 'en') return;
        currentLang = lang;
        localStorage.setItem(STORAGE_KEY, lang);
        applyToDOM();
        updateLangButtons();
    }

    function updateLangButtons() {
        var esBtn = document.getElementById('langEs');
        var enBtn = document.getElementById('langEn');
        if (esBtn) esBtn.classList.toggle('active', currentLang === 'es');
        if (enBtn) enBtn.classList.toggle('active', currentLang === 'en');
    }

    function applyToDOM() {
        var els = document.querySelectorAll('[data-i18n]');
        for (var i = 0; i < els.length; i++) {
            var key = els[i].getAttribute('data-i18n');
            els[i].textContent = t(key);
        }
        var phEls = document.querySelectorAll('[data-i18n-placeholder]');
        for (var j = 0; j < phEls.length; j++) {
            var phKey = phEls[j].getAttribute('data-i18n-placeholder');
            phEls[j].placeholder = t(phKey);
        }
    }

    function init() {
        applyToDOM();
        updateLangButtons();
        var esBtn = document.getElementById('langEs');
        var enBtn = document.getElementById('langEn');
        if (esBtn) esBtn.addEventListener('click', function() { setLang('es'); });
        if (enBtn) enBtn.addEventListener('click', function() { setLang('en'); });
    }

    return { t: t, getLang: getLang, setLang: setLang, applyToDOM: applyToDOM, init: init };
})();
