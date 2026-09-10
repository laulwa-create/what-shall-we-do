/* ==========================================================================
   SHARED DATA, STORAGE & GEOCODING
   Loaded by both index.html (public) and manage.html (private) so they
   stay in sync on the same data. Nothing in this file renders anything
   on screen — that's index.js and manage.js.
   ========================================================================== */

const CITY_CENTER = [55.8642, -4.2518]; // Glasgow city centre
const CITY_ZOOM = 12;

// Matches --purple in style.css. Map libraries need a real color string
// (not a CSS variable) — if you change --purple, update this too.
const MARKER_HEX = '#B497DD';

/* ---------- starter activities ---------- */
const DEFAULT_ACTIVITIES = [
  {id:1, name:"Blanket fort & movie night", rain:"either", cold:"either", moods:["night-in","cozy"], company:["together"], location:null, options:[]},
  {id:2, name:"Dress up for a fancy dinner", rain:"either", cold:"either", moods:["fancy","night-in"], company:["together"], location:null, options:[
    {name:"Ubiquitous Chip", location:{lat:55.8763, lng:-4.2932, label:"Ubiquitous Chip"}},
    {name:"The Finnieston", location:{lat:55.8654, lng:-4.2825, label:"The Finnieston"}}
  ]},
  {id:3, name:"Botanic Gardens wander", rain:"no", cold:"either", moods:["day-trip","cozy"], company:["together","solo"], location:{lat:55.8797, lng:-4.2911, label:"Botanic Gardens"}, options:[]},
  {id:4, name:"Kelvingrove Art Gallery", rain:"yes", cold:"either", moods:["day-trip","fancy"], company:["together","friends","solo"], location:{lat:55.8687, lng:-4.2907, label:"Kelvingrove Art Gallery"}, options:[]},
  {id:5, name:"Picnic in Kelvingrove Park", rain:"no", cold:"no", moods:["day-trip"], company:["together","friends"], location:{lat:55.8687, lng:-4.2842, label:"Kelvingrove Park"}, options:[]},
  {id:6, name:"Cosy café & a good book", rain:"yes", cold:"either", moods:["night-in","cozy","day-trip"], company:["solo","together"], location:null, options:[]},
  {id:7, name:"Karaoke night", rain:"either", cold:"either", moods:["night-out"], company:["together","friends"], location:null, options:[]},
  {id:8, name:"Bonfire & s'mores, Pollok Park", rain:"no", cold:"yes", moods:["night-in","night-out"], company:["together","friends"], location:{lat:55.8288, lng:-4.3175, label:"Pollok Country Park"}, options:[]}
];

/* ---------- storage keys ---------- */
const STORE_KEY = "shallwe_activities_glasgow_v1";
const PLAYLIST_KEY = "shallwe_playlist_v1";

function loadActivities(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  return DEFAULT_ACTIVITIES.slice();
}
function saveActivities(list){
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(list)); }catch(e){}
}

function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str == null ? '' : str;
  return d.innerHTML;
}

/* ==========================================================================
   LOCATION SEARCH (geocoding via OpenStreetMap's Nominatim)
   Free, no API key. Please be a good citizen of the free service — we
   only search on an explicit "find" click (not on every keystroke).
   https://operations.osmfoundation.org/policies/nominatim/
   ========================================================================== */
let lastSearchAt = 0;

async function searchGlasgowPlace(query){
  const now = Date.now();
  if(now - lastSearchAt < 1000) return []; // light rate-limit guard
  lastSearchAt = now;
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=5&viewbox=-4.45,55.93,-4.05,55.78&bounded=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if(!res.ok) throw new Error('Search failed');
  return res.json();
}

/* ==========================================================================
   PLAYLIST EMBED (Spotify / Apple Music / YouTube)
   ========================================================================== */

/** Turns a Spotify web URL into a "spotify:type:id" URI for the iFrame API.
    Returns null for non-Spotify links. */
function parseSpotifyUri(url){
  try{
    const u = new URL(url);
    if(!u.hostname.includes('spotify.com')) return null;
    const m = u.pathname.match(/\/(playlist|album|track)\/([a-zA-Z0-9]+)/);
    if(!m) return null;
    return `spotify:${m[1]}:${m[2]}`;
  }catch(e){ return null; }
}

function playlistEmbedHtml(url){
  try{
    const u = new URL(url);
    if(u.hostname.includes('spotify.com')){
      const m = u.pathname.match(/\/(playlist|album|track)\/([a-zA-Z0-9]+)/);
      if(m){
        return `<div class="playlist-embed-wrap"><iframe src="https://open.spotify.com/embed/${m[1]}/${m[2]}" height="352" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe></div>`;
      }
    }
    if(u.hostname.includes('music.apple.com')){
      const embedUrl = url.replace('music.apple.com', 'embed.music.apple.com');
      return `<div class="playlist-embed-wrap"><iframe src="${embedUrl}" height="450" allow="autoplay *; encrypted-media *;" loading="lazy"></iframe></div>`;
    }
    if(u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')){
      const listId = u.searchParams.get('list');
      if(listId){
        return `<div class="playlist-embed-wrap"><iframe src="https://www.youtube.com/embed/videoseries?list=${listId}" height="315" allow="autoplay; encrypted-media" loading="lazy"></iframe></div>`;
      }
    }
    return `<div class="playlist-embed-wrap"><iframe src="${url}" height="352" loading="lazy"></iframe></div>`;
  }catch(e){
    return null;
  }
}
