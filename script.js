const STORAGE_KEY = 'raid_arena_fights';
const BACKUP_DB_NAME = 'raid_arena_tracker_backup';
const BACKUP_STORE_NAME = 'snapshots';
const BACKUP_KEY = 'latest';
const CHAMPION_POOL_KEY = 'raid_arena_champion_pool';
const PLAYER_TEAM_LOCK_KEY = 'raid_arena_player_team_lock';
const LANGUAGE_KEY = 'raid_arena_language';
const REMOTE_CHAMPIONS_URL = 'https://raw.githubusercontent.com/McRadane/raid-data/master/champions.json';

const {
  titleCase,
  computeWinrate,
  computeCurrentStreak,
  buildBestTeamRows,
  buildSynergyRows,
  buildOpponentRows,
} = window.RaidArenaLogic;

const form = document.getElementById('fight-form');
const playerTeamSlots = [1, 2, 3, 4].map((slot) => document.getElementById(`player-slot-${slot}`));
const opponentTeamSlots = [1, 2, 3, 4].map((slot) => document.getElementById(`opponent-slot-${slot}`));
const lockPlayerTeamInput = document.getElementById('lock-player-team');
const formError = document.getElementById('form-error');
const exportBtn = document.getElementById('export-btn');
const syncChampionsBtn = document.getElementById('sync-champions-btn');
const importFileInput = document.getElementById('import-file');
const clearFightsBtn = document.getElementById('clear-fights-btn');
const languageSelect = document.getElementById('language-select');
const championMemoryIndicator = document.getElementById('champion-memory-indicator');


const translations = {
  fr: {
    pageTitle: 'Raid Arena Tracker - Classic 4v4',
    app: { title: 'Raid Arena Tracker - Classic 4v4', language: 'Langue', subtitle: 'Suivi local de tes combats (stockage 100% navigateur)', backupInfo: 'Sauvegarde automatique dans le profil navigateur Windows (localStorage + backup interne)' },
    form: {
      title: 'Ajouter combat', playerTeamLabel: 'Team joueur (1 à 4 champions)', playerTeamPlaceholder: 'Arbiter, Duchess Lilitu, Mithrala, Rotos',
      lockTeam: 'Verrouiller mon équipe (réutilisée automatiquement)', opponentTeamLabel: 'Team adverse (optionnel, 1 à 4)', opponentTeamPlaceholder: 'Siphi, Rotos',
      winLegend: 'Victoire ?', submit: 'Ajouter',
      memoryCount: '{count} persos en mémoire.',
      memoryPreview: 'Derniers mémorisés : {names}'
    },
    common: { yes: 'Oui', no: 'Non', na: 'N/A', notEnoughData: 'Pas assez de données.' },
    stats: {
      globalTitle: 'Global', bestTeamsTitle: 'Meilleures teams (min 5 combats)', synergyTitle: 'Synergies (Top 5 paires, min 8 combats)',
      opponentsTitle: 'Teams adverses', topBeaten: 'Top 5 battues', topLost: 'Top 5 qui te battent',
      totalFights: 'Total combats', globalWinrate: 'Winrate global', currentStreak: 'Streak actuelle', lastTen: 'Derniers 10',
      team: 'Team', wr: 'WR', fights: 'Combats', pair: 'Paire', deltaVsGlobal: 'Delta vs global', opponentTeam: 'Team adverse',
      wins: 'Victoires', losses: 'Défaites'
    },
    actions: { syncChampions: 'Mettre à jour les champions (web)', export: 'Exporter JSON', import: 'Importer JSON', clear: "Nettoyer l'historique" },
    messages: {
      teamNeedChampions: '{label} : ajoute entre 1 et 4 champions.', teamMaxChampions: '{label} : maximum 4 champions.', teamInvalid: '{label} invalide.',
      unknownChampions: '{label} : champions inconnus ({names}). Utilise uniquement les champions synchronisés.',
      playerTeam: 'Team joueur', winRequired: 'Indique si le combat est une victoire ou une défaite.',
      lockImpossible: 'Impossible de verrouiller : {error}', importedJsonMustArray: 'Le JSON importé doit être un tableau de combats.',
      importImpossible: 'Import impossible : {error}', historyAlreadyEmpty: 'Historique déjà vide.',
      clearConfirm: "Supprimer tout l'historique de combat ? Les champions sauvegardés seront conservés.",
      syncStarted: 'Synchronisation des champions en cours...',
      syncSuccess: '{count} champions récupérés depuis le web.',
      syncFailed: 'Échec de la synchronisation des champions : {error}'
    },
  },
  en: {
    pageTitle: 'Raid Arena Tracker - Classic 4v4',
    app: { title: 'Raid Arena Tracker - Classic 4v4', language: 'Language', subtitle: 'Local fight tracking (100% browser storage)', backupInfo: 'Automatic backup in the browser profile (localStorage + internal backup)' },
    form: {
      title: 'Add fight', playerTeamLabel: 'Player team (1 to 4 champions)', playerTeamPlaceholder: 'Arbiter, Duchess Lilitu, Mithrala, Rotos',
      lockTeam: 'Lock my team (reused automatically)', opponentTeamLabel: 'Opponent team (optional, 1 to 4)', opponentTeamPlaceholder: 'Siphi, Rotos',
      winLegend: 'Win?', submit: 'Add',
      memoryCount: '{count} champions in memory.',
      memoryPreview: 'Recently stored: {names}'
    },
    common: { yes: 'Yes', no: 'No', na: 'N/A', notEnoughData: 'Not enough data.' },
    stats: {
      globalTitle: 'Overall', bestTeamsTitle: 'Best teams (min 5 fights)', synergyTitle: 'Synergies (Top 5 pairs, min 8 fights)',
      opponentsTitle: 'Opponent teams', topBeaten: 'Top 5 defeated', topLost: 'Top 5 that beat you',
      totalFights: 'Total fights', globalWinrate: 'Global win rate', currentStreak: 'Current streak', lastTen: 'Last 10',
      team: 'Team', wr: 'WR', fights: 'Fights', pair: 'Pair', deltaVsGlobal: 'Delta vs global', opponentTeam: 'Opponent team',
      wins: 'Wins', losses: 'Losses'
    },
    actions: { syncChampions: 'Update champions from web', export: 'Export JSON', import: 'Import JSON', clear: 'Clear history' },
    messages: {
      teamNeedChampions: '{label}: add between 1 and 4 champions.', teamMaxChampions: '{label}: maximum 4 champions.', teamInvalid: '{label} is invalid.',
      unknownChampions: '{label}: unknown champions ({names}). Use synced champions only.',
      playerTeam: 'Player team', winRequired: 'Please indicate whether the fight is a win or a loss.',
      lockImpossible: 'Cannot lock team: {error}', importedJsonMustArray: 'Imported JSON must be an array of fights.',
      importImpossible: 'Import failed: {error}', historyAlreadyEmpty: 'History is already empty.',
      clearConfirm: 'Delete all fight history? Saved champions will be kept.',
      syncStarted: 'Champion sync in progress...',
      syncSuccess: '{count} champions fetched from the web.',
      syncFailed: 'Champion sync failed: {error}'
    },
  },
};

let currentLanguage = loadLanguage();

function loadLanguage() {
  const saved = localStorage.getItem(LANGUAGE_KEY);
  return saved && translations[saved] ? saved : 'fr';
}

function saveLanguage(lang) {
  localStorage.setItem(LANGUAGE_KEY, lang);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('\"', '&quot;')
    .replaceAll("'", '&#39;');
}

function t(path, vars = {}) {
  const parts = path.split('.');
  let value = translations[currentLanguage];
  for (const part of parts) {
    value = value?.[part];
  }
  if (typeof value !== 'string') {
    return path;
  }
  return Object.entries(vars).reduce((text, [key, val]) => text.replaceAll(`{${key}}`, String(val)), value);
}

function applyTranslations() {
  document.documentElement.lang = currentLanguage;
  document.title = t('pageTitle');

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });

  renderAllStats();
}

function parseTeamFromSlots(inputs) {
  return inputs.map((input) => titleCase(input.value.trim())).filter(Boolean);
}

function validateTeam(team, label, required) {
  if (team.length === 0 && required) {
    throw new Error(t('messages.teamNeedChampions', { label }));
  }
  if (team.length > 4) {
    throw new Error(t('messages.teamMaxChampions', { label }));
  }
  if (!required && team.length !== 0 && team.length < 1) {
    throw new Error(t('messages.teamInvalid', { label }));
  }
}

function validateKnownChampions(team, label) {
  if (!team.length) {
    return;
  }

  const knownChampions = new Set(loadChampionPool());
  const unknownChampions = team.filter((champion) => !knownChampions.has(champion));
  if (unknownChampions.length) {
    throw new Error(t('messages.unknownChampions', { label, names: unknownChampions.join(', ') }));
  }
}

function loadFights() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}


function loadChampionPool() {
  try {
    const raw = localStorage.getItem(CHAMPION_POOL_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(titleCase).filter(Boolean);
  } catch {
    return [];
  }
}

function saveChampionPool(champions) {
  localStorage.setItem(CHAMPION_POOL_KEY, JSON.stringify(champions));
}

function loadPlayerTeamLock() {
  try {
    const raw = localStorage.getItem(PLAYER_TEAM_LOCK_KEY);
    if (!raw) {
      return { locked: false, team: [] };
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { locked: false, team: [] };
    }

    return {
      locked: Boolean(parsed.locked),
      team: Array.isArray(parsed.team) ? parsed.team.map(titleCase).filter(Boolean).slice(0, 4) : [],
    };
  } catch {
    return { locked: false, team: [] };
  }
}

function savePlayerTeamLock(lockData) {
  localStorage.setItem(PLAYER_TEAM_LOCK_KEY, JSON.stringify(lockData));
}

function fillTeamSlots(inputs, team) {
  inputs.forEach((input, index) => {
    input.value = team[index] || '';
  });
}

function getFilteredChampions(token = '') {
  const normalizedToken = titleCase(token.trim());
  const champions = loadChampionPool().sort((a, b) => a.localeCompare(b));
  return normalizedToken
    ? champions.filter((champion) => champion.startsWith(normalizedToken))
    : champions;
}

const autocompleteDropdown = document.createElement('div');
autocompleteDropdown.className = 'autocomplete-dropdown';
autocompleteDropdown.hidden = true;
document.body.appendChild(autocompleteDropdown);

let activeAutocompleteInput = null;

function hideAutocompleteDropdown() {
  autocompleteDropdown.hidden = true;
  autocompleteDropdown.innerHTML = '';
}

function showAutocompleteDropdown(input) {
  const champions = getFilteredChampions(input.value);
  if (!champions.length) {
    hideAutocompleteDropdown();
    return;
  }

  autocompleteDropdown.innerHTML = champions
    .slice(0, 50)
    .map(
      (champion) => `<div class="autocomplete-item"><button type="button" class="autocomplete-pick" data-champion-name="${encodeURIComponent(champion)}">${escapeHtml(champion)}</button></div>`,
    )
    .join('');

  const rect = input.getBoundingClientRect();
  autocompleteDropdown.style.left = `${rect.left + window.scrollX}px`;
  autocompleteDropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;
  autocompleteDropdown.style.width = `${rect.width}px`;
  autocompleteDropdown.hidden = false;
}

function attachTeamAutocomplete(input) {
  input.addEventListener('focus', () => {
    activeAutocompleteInput = input;
    showAutocompleteDropdown(input);
  });

  input.addEventListener('input', () => {
    activeAutocompleteInput = input;
    showAutocompleteDropdown(input);
  });

  input.addEventListener('change', () => {
    input.value = titleCase(input.value.trim());
  });
}

autocompleteDropdown.addEventListener('mousedown', (event) => {
  event.preventDefault();
});

autocompleteDropdown.addEventListener('click', (event) => {
  if (!activeAutocompleteInput) {
    return;
  }

  const pickButton = event.target.closest('.autocomplete-pick');
  if (pickButton) {
    const champion = pickButton.dataset.championName;
    if (!champion) {
      return;
    }
    activeAutocompleteInput.value = decodeURIComponent(champion);
    activeAutocompleteInput.dispatchEvent(new window.Event('change', { bubbles: true }));
    hideAutocompleteDropdown();
    return;
  }
});

document.addEventListener('click', (event) => {
  if (!activeAutocompleteInput) {
    return;
  }

  const clickedInsideInput = event.target === activeAutocompleteInput;
  const clickedInsideDropdown = autocompleteDropdown.contains(event.target);
  if (!clickedInsideInput && !clickedInsideDropdown) {
    hideAutocompleteDropdown();
  }
});

window.addEventListener('resize', () => {
  if (activeAutocompleteInput && !autocompleteDropdown.hidden) {
    showAutocompleteDropdown(activeAutocompleteInput);
  }
});

window.addEventListener('scroll', () => {
  if (activeAutocompleteInput && !autocompleteDropdown.hidden) {
    showAutocompleteDropdown(activeAutocompleteInput);
  }
}, true);

function saveFights(fights) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fights));
  void saveBackupSnapshot(fights);
}

function openBackupDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      resolve(null);
      return;
    }

    const request = window.indexedDB.open(BACKUP_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BACKUP_STORE_NAME)) {
        db.createObjectStore(BACKUP_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveBackupSnapshot(fights) {
  try {
    const db = await openBackupDb();
    if (!db) {
      return;
    }

    await new Promise((resolve, reject) => {
      const tx = db.transaction(BACKUP_STORE_NAME, 'readwrite');
      tx.objectStore(BACKUP_STORE_NAME).put(JSON.stringify(fights), BACKUP_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Backup silencieux: l'appli continue même si IndexedDB n'est pas disponible.
  }
}

async function loadBackupSnapshot() {
  try {
    const db = await openBackupDb();
    if (!db) {
      return null;
    }

    const raw = await new Promise((resolve, reject) => {
      const tx = db.transaction(BACKUP_STORE_NAME, 'readonly');
      const request = tx.objectStore(BACKUP_STORE_NAME).get(BACKUP_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    db.close();

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function restoreFromBackupIfNeeded() {
  if (loadFights().length > 0) {
    return;
  }

  const backupFights = await loadBackupSnapshot();
  if (!backupFights || backupFights.length === 0) {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(backupFights));
  renderAllStats();
}

function buildTable(headers, rows) {
  if (!rows.length) {
    return `<p class="empty">${t('common.notEnoughData')}</p>`;
  }

  const thead = `<thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
    .join('')}</tbody>`;
  return `<table>${thead}${tbody}</table>`;
}

function renderGlobalStats(fights) {
  const total = fights.length;
  const winrate = computeWinrate(fights);
  const streak = computeCurrentStreak(fights);
  const lastTen = fights.slice(-10);
  const lastTenWr = computeWinrate(lastTen);

  document.getElementById('global-stats').innerHTML = `
    <div class="stat-item"><span class="label">${t('stats.totalFights')}</span><div class="value">${total}</div></div>
    <div class="stat-item"><span class="label">${t('stats.globalWinrate')}</span><div class="value">${winrate.toFixed(1)}%</div></div>
    <div class="stat-item"><span class="label">${t('stats.currentStreak')}</span><div class="value">${streak}</div></div>
    <div class="stat-item"><span class="label">${t('stats.lastTen')}</span><div class="value">${lastTenWr.toFixed(1)}%</div></div>
  `;
}

function renderBestTeams(fights) {
  const rows = buildBestTeamRows(fights);
  document.getElementById('best-teams').innerHTML = buildTable([t('stats.team'), t('stats.wr'), t('stats.fights')], rows);
}

function renderSynergies(fights) {
  const rows = buildSynergyRows(fights);
  document.getElementById('synergy-stats').innerHTML = buildTable(
    [t('stats.pair'), t('stats.wr'), t('stats.deltaVsGlobal'), t('stats.fights')],
    rows,
  );
}

function renderOpponentStats(fights) {
  const { beatenRows, lostRows } = buildOpponentRows(fights);

  document.getElementById('opponents-beaten').innerHTML = buildTable([t('stats.opponentTeam'), t('stats.wins')], beatenRows);
  document.getElementById('opponents-lost').innerHTML = buildTable([t('stats.opponentTeam'), t('stats.losses')], lostRows);
}

async function syncChampionPoolFromWeb() {
  formError.textContent = t('messages.syncStarted');

  const response = await fetch(REMOTE_CHAMPIONS_URL, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = await response.json();
  const rawChampions = Array.isArray(payload) ? payload : Object.keys(payload || {});
  const remoteChampions = [...new Set(rawChampions.map(titleCase).filter(Boolean))];

  if (!remoteChampions.length) {
    throw new Error('No champions found in remote source');
  }

  const merged = [...new Set([...loadChampionPool(), ...remoteChampions])].sort((a, b) => a.localeCompare(b));
  saveChampionPool(merged);
  formError.textContent = t('messages.syncSuccess', { count: remoteChampions.length });

  if (activeAutocompleteInput && !autocompleteDropdown.hidden) {
    showAutocompleteDropdown(activeAutocompleteInput);
  }
}

function renderChampionMemoryIndicator() {
  if (!championMemoryIndicator) {
    return;
  }

  const champions = loadChampionPool();
  const recent = champions.slice(-4);
  const countText = t('form.memoryCount', { count: champions.length });

  championMemoryIndicator.textContent = recent.length
    ? `${countText} ${t('form.memoryPreview', { names: recent.join(', ') })}`
    : countText;
}

function renderAllStats() {
  const fights = loadFights();
  renderGlobalStats(fights);
  renderBestTeams(fights);
  renderSynergies(fights);
  renderOpponentStats(fights);
  renderChampionMemoryIndicator();
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  formError.textContent = '';

  try {
    const lockData = loadPlayerTeamLock();
    const playerTeam = lockData.locked ? lockData.team : parseTeamFromSlots(playerTeamSlots);
    const opponentTeam = parseTeamFromSlots(opponentTeamSlots);
    validateTeam(playerTeam, t('messages.playerTeam'), true);
    validateTeam(opponentTeam, t('stats.opponentTeam'), false);
    validateKnownChampions(playerTeam, t('messages.playerTeam'));
    validateKnownChampions(opponentTeam, t('stats.opponentTeam'));
    const winChoice = form.querySelector('input[name="win"]:checked');
    if (!winChoice) {
      throw new Error(t('messages.winRequired'));
    }

    const fights = loadFights();
    fights.push({
      timestamp: Date.now(),
      player_team: playerTeam,
      opponent_team: opponentTeam,
      win: winChoice.value === 'yes',
    });

    saveFights(fights);
    form.reset();

    const refreshedLockData = loadPlayerTeamLock();
    if (refreshedLockData.locked && refreshedLockData.team.length) {
      lockPlayerTeamInput.checked = true;
      fillTeamSlots(playerTeamSlots, refreshedLockData.team);
      playerTeamSlots.forEach((slot) => {
        slot.readOnly = true;
      });
    }

    renderAllStats();
  } catch (error) {
    formError.textContent = error.message;
  }
});

lockPlayerTeamInput.addEventListener('change', () => {
  formError.textContent = '';

  if (!lockPlayerTeamInput.checked) {
    savePlayerTeamLock({ locked: false, team: [] });
    playerTeamSlots.forEach((slot) => {
      slot.readOnly = false;
    });
    return;
  }

  try {
    const team = parseTeamFromSlots(playerTeamSlots);
    validateTeam(team, t('messages.playerTeam'), true);
    validateKnownChampions(team, t('messages.playerTeam'));
    const normalizedTeam = team.map(titleCase);
    savePlayerTeamLock({ locked: true, team: normalizedTeam });
    fillTeamSlots(playerTeamSlots, normalizedTeam);
    playerTeamSlots.forEach((slot) => {
      slot.readOnly = true;
    });
  } catch (error) {
    lockPlayerTeamInput.checked = false;
    formError.textContent = t('messages.lockImpossible', { error: error.message });
  }
});

[...playerTeamSlots, ...opponentTeamSlots].forEach((slot) => {
  slot.addEventListener('blur', () => {
    if (slot.readOnly) {
      return;
    }
    slot.value = titleCase(slot.value.trim());
  });

  slot.addEventListener('change', () => {
    if (slot.readOnly) {
      return;
    }
    slot.value = titleCase(slot.value.trim());
  });

  slot.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || slot.readOnly) {
      return;
    }

    event.preventDefault();
    slot.value = titleCase(slot.value.trim());
    showAutocompleteDropdown(slot);
  });

  attachTeamAutocomplete(slot);
});

const initialLockData = loadPlayerTeamLock();
if (initialLockData.locked && initialLockData.team.length) {
  lockPlayerTeamInput.checked = true;
  fillTeamSlots(playerTeamSlots, initialLockData.team);
  playerTeamSlots.forEach((slot) => {
    slot.readOnly = true;
  });
}
exportBtn.addEventListener('click', () => {
  const fights = loadFights();
  const blob = new Blob([JSON.stringify(fights, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'raid-arena-data.json';
  link.click();
  URL.revokeObjectURL(url);
});

importFileInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new Error(t('messages.importedJsonMustArray'));
    }
    saveFights(parsed);
    renderAllStats();
  } catch (error) {
    formError.textContent = t('messages.importImpossible', { error: error.message });
  } finally {
    importFileInput.value = '';
  }
});

clearFightsBtn.addEventListener('click', () => {
  const hasFights = loadFights().length > 0;
  if (!hasFights) {
    formError.textContent = t('messages.historyAlreadyEmpty');
    return;
  }

  const confirmReset = window.confirm(
    t('messages.clearConfirm'),
  );

  if (!confirmReset) {
    return;
  }

  saveFights([]);
  formError.textContent = '';
  renderAllStats();
});

if (syncChampionsBtn) {
  syncChampionsBtn.addEventListener('click', async () => {
    syncChampionsBtn.disabled = true;
    formError.textContent = '';

    try {
      await syncChampionPoolFromWeb();
    } catch (error) {
      formError.textContent = t('messages.syncFailed', { error: error.message });
    } finally {
      syncChampionsBtn.disabled = false;
    }
  });
}



if (languageSelect) {
  languageSelect.value = currentLanguage;
  languageSelect.addEventListener('change', (event) => {
    const nextLanguage = event.target.value;
    if (!translations[nextLanguage]) {
      return;
    }
    currentLanguage = nextLanguage;
    saveLanguage(nextLanguage);
    formError.textContent = '';
    applyTranslations();
  });
}

applyTranslations();
void restoreFromBackupIfNeeded();
