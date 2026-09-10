let activities = loadActivities();

/* ==========================================================================
   THE BOARD (full editing — add / remove)
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
    return `<div class="board-card" data-id="${a.id}">
      <button class="remove-btn" data-remove="${a.id}" title="remove">✕</button>
      <div class="name">${escapeHtml(a.name)}</div>
      <div class="tags">${tagBits}${locTag}${optionsTag}</div>
    </div>`;
  }).join('');

  listEl.querySelectorAll('[data-remove]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const id = Number(btn.dataset.remove);
      activities = activities.filter(a=>a.id !== id);
      saveActivities(activities);
      renderActivityList();
    });
  });
}
renderActivityList();

/* ---------- general area location search ---------- */
let pendingLocation = null;

document.getElementById('locationSearchBtn').addEventListener('click', async ()=>{
  const query = document.getElementById('locationQuery').value.trim();
  const resultsEl = document.getElementById('locationResults');
  if(!query) return;
  resultsEl.innerHTML = `<div class="location-result-item">searching…</div>`;
  try{
    const results = await searchGlasgowPlace(query);
    if(!results.length){
      resultsEl.innerHTML = `<div class="location-result-item">no matches — try a different search</div>`;
      return;
    }
    resultsEl.innerHTML = results.map((r, i)=>
      `<button type="button" class="location-result-item" data-index="${i}">${escapeHtml(r.display_name)}</button>`
    ).join('');
    resultsEl.querySelectorAll('[data-index]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const r = results[Number(btn.dataset.index)];
        pendingLocation = { lat: parseFloat(r.lat), lng: parseFloat(r.lon), label: r.display_name.split(',')[0] };
        document.getElementById('locationSelected').textContent = `📍 selected: ${pendingLocation.label}`;
        resultsEl.innerHTML = '';
      });
    });
  }catch(e){
    resultsEl.innerHTML = `<div class="location-result-item">search failed — check your connection and try again</div>`;
  }
});

/* ---------- specific options (named places) ---------- */
let optionRowCounter = 0;
const optionRowLocations = {};

function addOptionRow(){
  const rowId = 'opt' + (optionRowCounter++);
  const container = document.getElementById('optionRows');
  const row = document.createElement('div');
  row.className = 'option-row';
  row.dataset.rowId = rowId;
  row.innerHTML = `
    <div class="option-row-top">
      <input type="text" class="option-name" placeholder="place name, e.g. Ubiquitous Chip">
      <button type="button" class="icon-btn remove-option-btn" title="remove">✕</button>
    </div>
    <div class="location-search-row">
      <input type="text" class="option-location-query" placeholder="search its location (optional)">
      <button type="button" class="option-location-find">find</button>
    </div>
    <div class="location-results option-location-results"></div>
    <div class="location-selected option-location-selected"></div>
  `;
  container.appendChild(row);
  optionRowLocations[rowId] = null;

  row.querySelector('.remove-option-btn').addEventListener('click', ()=>{
    row.remove();
    delete optionRowLocations[rowId];
  });

  row.querySelector('.option-location-find').addEventListener('click', async ()=>{
    const query = row.querySelector('.option-location-query').value.trim();
    const resultsEl = row.querySelector('.option-location-results');
    if(!query) return;
    resultsEl.innerHTML = `<div class="location-result-item">searching…</div>`;
    try{
      const results = await searchGlasgowPlace(query);
      if(!results.length){
        resultsEl.innerHTML = `<div class="location-result-item">no matches</div>`;
        return;
      }
      resultsEl.innerHTML = results.map((r,i)=>`<button type="button" class="location-result-item" data-index="${i}">${escapeHtml(r.display_name)}</button>`).join('');
      resultsEl.querySelectorAll('[data-index]').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const r = results[Number(btn.dataset.index)];
          optionRowLocations[rowId] = { lat: parseFloat(r.lat), lng: parseFloat(r.lon), label: r.display_name.split(',')[0] };
          row.querySelector('.option-location-selected').textContent = `📍 ${optionRowLocations[rowId].label}`;
          resultsEl.innerHTML = '';
        });
      });
    }catch(e){
      resultsEl.innerHTML = `<div class="location-result-item">search failed — check your connection and try again</div>`;
    }
  });
}
document.getElementById('addOptionBtn').addEventListener('click', addOptionRow);

function collectOptionRows(){
  return [...document.querySelectorAll('#optionRows .option-row')].map(row=>{
    const name = row.querySelector('.option-name').value.trim();
    if(!name) return null;
    return { name, location: optionRowLocations[row.dataset.rowId] || null };
  }).filter(Boolean);
}
function resetOptionRows(){
  document.getElementById('optionRows').innerHTML = '';
  Object.keys(optionRowLocations).forEach(k=> delete optionRowLocations[k]);
}

/* ---------- add-activity form chips ---------- */
function wireMultiChip(id){
  document.getElementById(id).querySelectorAll('.chip').forEach(chip=>{
    chip.addEventListener('click', ()=> chip.classList.toggle('active'));
  });
}
function wireSingleChip(id){
  const row = document.getElementById(id);
  row.querySelectorAll('.chip').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      row.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
      chip.classList.add('active');
    });
  });
}
wireSingleChip('newRain');
wireSingleChip('newCold');
wireMultiChip('newMood');
wireMultiChip('newCompany');

document.getElementById('saveActivityBtn').addEventListener('click', ()=>{
  const name = document.getElementById('newName').value.trim();
  if(!name){ document.getElementById('newName').focus(); return; }
  const rain = document.querySelector('#newRain .chip.active').dataset.value;
  const cold = document.querySelector('#newCold .chip.active').dataset.value;
  const moods = [...document.querySelectorAll('#newMood .chip.active')].map(c=>c.dataset.value);
  const company = [...document.querySelectorAll('#newCompany .chip.active')].map(c=>c.dataset.value);
  const newId = activities.length ? Math.max(...activities.map(a=>a.id))+1 : 1;

  activities.push({
    id:newId, name, rain, cold,
    moods: moods.length ? moods : ["fancy","night-in","night-out","day-trip","cozy"],
    company: company.length ? company : ["together","friends","solo"],
    location: pendingLocation,
    options: collectOptionRows()
  });
  saveActivities(activities);
  renderActivityList();

  document.getElementById('newName').value = '';
  document.getElementById('locationQuery').value = '';
  document.getElementById('locationResults').innerHTML = '';
  document.getElementById('locationSelected').textContent = '';
  pendingLocation = null;
  resetOptionRows();
  document.querySelectorAll('#newRain .chip, #newCold .chip').forEach(c=>c.classList.remove('active'));
  document.querySelector('#newRain .chip[data-value="either"]').classList.add('active');
  document.querySelector('#newCold .chip[data-value="either"]').classList.add('active');
  document.querySelectorAll('#newMood .chip, #newCompany .chip').forEach(c=>c.classList.remove('active'));
});

/* ==========================================================================
   MUSIC SETUP (playlist only)
   ========================================================================== */
function renderPlaylistCurrent(){
  let saved = null;
  try{ saved = localStorage.getItem(PLAYLIST_KEY); }catch(e){}
  const el = document.getElementById('playlistCurrent');
  const input = document.getElementById('playlistUrl');
  if(saved){
    el.textContent = `currently set: ${saved}`;
    input.value = saved;
  } else {
    el.textContent = 'nothing set yet.';
    input.value = '';
  }
}
document.getElementById('savePlaylistBtn').addEventListener('click', ()=>{
  const url = document.getElementById('playlistUrl').value.trim();
  if(!url) return;
  try{ localStorage.setItem(PLAYLIST_KEY, url); }catch(e){}
  renderPlaylistCurrent();
});
renderPlaylistCurrent();
