/* ==========================================================================
   MAP SETUP
   ========================================================================== */
let map, highlightCircle, highlightMarker;

function initMap(){
  map = L.map('mapBackground', { zoomControl: true }).setView(CITY_CENTER, CITY_ZOOM);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
}
initMap();

function highlightLocation(loc){
  if(!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return;
  if(highlightCircle) map.removeLayer(highlightCircle);
  if(highlightMarker) map.removeLayer(highlightMarker);

  highlightCircle = L.circle([loc.lat, loc.lng], {
    radius: 350, color: MARKER_HEX, fillColor: MARKER_HEX,
    fillOpacity: 0.16, weight: 2, opacity: 0.6
  }).addTo(map);

  highlightMarker = L.marker([loc.lat, loc.lng], {
    icon: L.divIcon({ className: 'pulse-marker-wrap', html: '<div class="pulse-marker"></div>', iconSize: [16, 16] })
  }).addTo(map);

  map.flyTo([loc.lat, loc.lng], 15, { duration: 1.1 });
}

/* ==========================================================================
   RESULT CARD ICONS
   ========================================================================== */
const ICONS = {
  flower: '<svg viewBox="0 0 48 48"><g fill="#B497DD"><circle cx="16" cy="24" r="6"/><circle cx="32" cy="24" r="6"/><circle cx="24" cy="14" r="6"/><circle cx="24" cy="34" r="6"/></g><circle cx="24" cy="24" r="6" fill="#EAE2F7"/></svg>',
  leaf: '<svg viewBox="0 0 48 48" fill="#8FB88A"><path d="M8,40 C8,20 20,8 40,8 C40,28 28,40 8,40 Z"/></svg>',
  moonleaf: '<svg viewBox="0 0 48 48"><path d="M30,6 A18,18 0 1 0 30,42 A14,14 0 0 1 30,6 Z" fill="#8FB88A"/></svg>',
  sunbud: '<svg viewBox="0 0 48 48" fill="none" stroke="#B497DD" stroke-width="3" stroke-linecap="round"><circle cx="24" cy="24" r="8" fill="#DDEEDC" stroke="none"/><path d="M24,4 v6 M24,38 v6 M4,24 h6 M38,24 h6 M9,9 l4,4 M35,35 l4,4 M39,9 l-4,4 M13,35 l-4,4"/></svg>',
  sprig: '<svg viewBox="0 0 48 48" fill="none" stroke="#5E8A5A" stroke-width="3" stroke-linecap="round"><path d="M24 44 V16"/><path d="M24 26 C16 22 12 14 16 6"/><path d="M24 20 C32 16 36 8 32 2"/></svg>'
};
function iconFor(a){
  if(a.moods.includes('cozy')) return ICONS.sprig;
  if(a.moods.includes('fancy')) return ICONS.flower;
  if(a.moods.includes('night-in')) return ICONS.moonleaf;
  if(a.moods.includes('day-trip')) return ICONS.sunbud;
  return ICONS.leaf;
}

/* ==========================================================================
   ACTIVITY DATA + FILTER STATE
   ========================================================================== */
let activities = loadActivities();
const state = { rain:"either", cold:"either", mood:"either", company:"either" };

function wireChipRow(id, key){
  const row = document.getElementById(id);
  row.querySelectorAll('.chip').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      row.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
      chip.classList.add('active');
      state[key] = chip.dataset.value;
    });
  });
}
wireChipRow('rainRow','rain');
wireChipRow('coldRow','cold');
wireChipRow('moodRow','mood');
wireChipRow('companyRow','company');

function matches(a){
  if(state.rain !== "either" && a.rain !== "either" && a.rain !== state.rain) return false;
  if(state.cold !== "either" && a.cold !== "either" && a.cold !== state.cold) return false;
  if(state.mood !== "either" && !a.moods.includes(state.mood)) return false;
  if(state.company !== "either" && !a.company.includes(state.company)) return false;
  return true;
}

let lastPick = null;
function reveal(){
  let pool = activities.filter(matches);
  if(pool.length > 1 && lastPick){
    const withoutLast = pool.filter(a=>a.id !== lastPick.id);
    if(withoutLast.length) pool = withoutLast;
  }
  const resultEl = document.getElementById('result');
  if(pool.length === 0){
    resultEl.innerHTML = `<div class="card result-card"><div class="empty-state">nothing on the board fits that combination yet. try loosening a filter.</div></div>`;
    return;
  }
  const pick = pool[Math.floor(Math.random()*pool.length)];
  lastPick = pick;

  let chosenOption = null;
  if(pick.options && pick.options.length){
    chosenOption = pick.options[Math.floor(Math.random()*pick.options.length)];
  }
  const effectiveLocation = (chosenOption && chosenOption.location) ? chosenOption.location : pick.location;

  const specificLine = chosenOption
    ? `<p class="specific-pick">tonight's pick: <strong>${escapeHtml(chosenOption.name)}</strong></p>`
    : '';
  const areaTag = effectiveLocation
    ? `<div class="area-tag">📍 ${escapeHtml(effectiveLocation.label)}</div>`
    : '';

  resultEl.innerHTML = `
    <div class="card result-card">
      <div class="result-icon">${iconFor(pick)}</div>
      <div class="result-body">
        <h3>${escapeHtml(pick.name)}</h3>
        ${specificLine}
        ${areaTag}
        <div><button class="ghost-btn" id="reshuffleBtn">try another</button></div>
      </div>
    </div>
  `;
  document.getElementById('reshuffleBtn').addEventListener('click', reveal);

  if(effectiveLocation){ highlightLocation(effectiveLocation); }
}
document.getElementById('revealBtn').addEventListener('click', reveal);

/* ==========================================================================
   THE BOARD — read only on this page (no add/remove controls)
   ========================================================================== */
function renderActivityList(){
  const listEl = document.getElementById('activityList');
  listEl.innerHTML = activities.map(a=>{
    const tagBits = [
      a.rain !== 'either' ? (a.rain==='yes'?'rainy':'dry') : null,
      a.cold !== 'either' ? (a.cold==='yes'?'cold':'mild') : null,
      ...a.moods, ...a.company
    ].filter(Boolean).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join('');
    const locTag = a.location ? `<span class="tag loc">📍 ${escapeHtml(a.location.label)}</span>` : '';
    const optionsTag = (a.options && a.options.length) ? `<span class="tag loc">🍽️ ${a.options.length} option${a.options.length>1?'s':''}</span>` : '';
    return `<div class="board-card" data-preview="${a.id}" title="${(a.location || (a.options && a.options.length)) ? 'show on map' : ''}">
      <div class="name">${escapeHtml(a.name)}</div>
      <div class="tags">${tagBits}${locTag}${optionsTag}</div>
    </div>`;
  }).join('');

  listEl.querySelectorAll('[data-preview]').forEach(card=>{
    card.addEventListener('click', ()=>{
      const id = Number(card.dataset.preview);
      const a = activities.find(x=>x.id === id);
      if(!a) return;
      if(a.location){ highlightLocation(a.location); return; }
      if(a.options && a.options.length){
        const withLoc = a.options.filter(o=>o.location);
        if(withLoc.length) highlightLocation(withLoc[Math.floor(Math.random()*withLoc.length)].location);
      }
    });
  });
}
renderActivityList();

/* ==========================================================================
   MUSIC
   The playlist embed (if any) shows in the "a little music for it" panel.
   A floating button gives quick play/pause access without scrolling.
   ========================================================================== */
let spotifyAPI = null;          // set once Spotify's iFrame API script loads
let spotifyPendingUri = null;   // a URI waiting for the API to be ready
let spotifyController = null;   // the active embed controller, once created
let spotifyIsPlaying = false;   // tracked via the controller's playback_update event

window.onSpotifyIframeApiReady = (IFrameAPI)=>{
  spotifyAPI = IFrameAPI;
  if(spotifyPendingUri){ createSpotifyController(spotifyPendingUri); }
};

function createSpotifyController(uri){
  const el = document.getElementById('playlistArea');
  el.innerHTML = ''; // the controller injects its own iframe into this element
  spotifyAPI.createController(el, { uri, height: '352' }, (controller)=>{
    spotifyController = controller;
    controller.addListener('playback_update', (e)=>{
      const isPlaying = !!(e.data && e.data.isPaused === false);
      spotifyIsPlaying = isPlaying;
      updatePlaylistButtonLabel();
    });
  });
}

function updatePlaylistButtonLabel(){
  const btn = document.getElementById('floatingPlaylistBtn');
  if(!btn) return;
  btn.textContent = spotifyIsPlaying ? '⏸ pause playlist' : '🎶 play playlist';
}

function renderMusic(){
  let savedPlaylist = null;
  try{ savedPlaylist = localStorage.getItem(PLAYLIST_KEY); }catch(e){}

  const panel = document.getElementById('musicPanel');
  const playlistBox = document.getElementById('playlistArea');
  let spotifyUri = null;
  let panelShown = false;

  if(savedPlaylist){
    spotifyUri = parseSpotifyUri(savedPlaylist);
    if(spotifyUri){
      panelShown = true;
      if(spotifyAPI){ createSpotifyController(spotifyUri); }
      else {
        spotifyPendingUri = spotifyUri;
        playlistBox.innerHTML = `<p class="playlist-empty">loading playlist…</p>`;
      }
    } else {
      const embed = playlistEmbedHtml(savedPlaylist);
      if(embed){ panelShown = true; playlistBox.innerHTML = embed; }
    }
  } else {
    playlistBox.innerHTML = '';
  }
  panel.style.display = panelShown ? '' : 'none';

  setupFloatingPlayer(spotifyUri, panelShown);
}

function setupFloatingPlayer(spotifyUri, playlistVisible){
  const widget = document.getElementById('floatingPlayer');
  const playlistBtn = document.getElementById('floatingPlaylistBtn');

  if(!spotifyUri && !playlistVisible){
    widget.style.display = 'none';
    return;
  }
  widget.style.display = 'flex';
  playlistBtn.style.display = '';

  if(spotifyUri){
    updatePlaylistButtonLabel();
    playlistBtn.onclick = ()=>{
      if(!spotifyController){
        document.getElementById('musicPanel').scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      try{
        if(spotifyIsPlaying && spotifyController.pause){
          spotifyController.pause();
          spotifyIsPlaying = false;
        } else if(!spotifyIsPlaying && spotifyController.play){
          spotifyController.play();
          spotifyIsPlaying = true;
        } else if(spotifyController.togglePlay){
          spotifyController.togglePlay();
          spotifyIsPlaying = !spotifyIsPlaying;
        }
        updatePlaylistButtonLabel();
      }catch(e){
        document.getElementById('musicPanel').scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };
  } else {
    // non-Spotify playlist (Apple Music / YouTube / other) — no remote
    // control API wired up, so just jump to the visible embed.
    playlistBtn.textContent = '🎶 go to playlist';
    playlistBtn.onclick = ()=>{
      document.getElementById('musicPanel').scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
  }
}
renderMusic();
