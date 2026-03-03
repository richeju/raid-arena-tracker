const STORAGE_KEY = 'raid_arena_fights';
const BACKUP_DB_NAME = 'raid_arena_tracker_backup';
const BACKUP_STORE_NAME = 'snapshots';
const BACKUP_KEY = 'latest';
const CHAMPION_POOL_KEY = 'raid_arena_champion_pool';
const PLAYER_TEAM_LOCK_KEY = 'raid_arena_player_team_lock';

const form = document.getElementById('fight-form');
const playerTeamInput = document.getElementById('player-team');
const opponentTeamInput = document.getElementById('opponent-team');
const playerRankInput = document.getElementById('player-rank');
const opponentRankInput = document.getElementById('opponent-rank');
const lockPlayerTeamInput = document.getElementById('lock-player-team');
const formError = document.getElementById('form-error');
const championOptions = document.getElementById('champion-options');
const exportBtn = document.getElementById('export-btn');
const importFileInput = document.getElementById('import-file');

function titleCase(value) {
  return value
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function parseTeam(input) {
  if (!input.trim()) {
    return [];
  }
  return input
    .split(',')
    .map((name) => titleCase(name.trim()))
    .filter(Boolean);
}

function validateTeam(team, label, required) {
  if (team.length === 0 && required) {
    throw new Error(`${label} : ajoute entre 1 et 4 champions.`);
  }
  if (team.length > 4) {
    throw new Error(`${label} : maximum 4 champions.`);
  }
  if (!required && team.length !== 0 && team.length < 1) {
    throw new Error(`${label} invalide.`);
  }
}

function getTeamKey(team) {
  return [...team].map(titleCase).sort((a, b) => a.localeCompare(b)).join(',');
}

function parseRank(value) {
  if (!value || !value.trim()) {
    return null;
  }

  const input = value.trim().toUpperCase();
  if (input.startsWith('PLAT')) {
    const number = Number.parseInt(input.replace(/[^0-9]/g, ''), 10);
    return Number.isNaN(number) ? 14 : 14 + Math.max(0, number - 1);
  }

  const romanMap = { I: 1, II: 2, III: 3, IV: 4, V: 5 };
  const shorthand = input.match(/^([BSG])\s*([1-5]|I|II|III|IV|V)$/);

  if (shorthand) {
    const tier = shorthand[1];
    const rawDivision = shorthand[2];
    const division = Number(rawDivision) || romanMap[rawDivision] || null;

    if (!division) {
      return null;
    }

    if (tier === 'B' && division <= 4) {
      return division;
    }
    if (tier === 'S' && division <= 4) {
      return 4 + division;
    }
    if (tier === 'G' && division <= 5) {
      return 8 + division;
    }
    return null;
  }

  const longMatch = input.match(/^(BRONZE|SILVER|GOLD)\s*(I|II|III|IV|V|1|2|3|4|5)$/);
  if (longMatch) {
    const tier = longMatch[1];
    const rawDivision = longMatch[2];
    const division = Number(rawDivision) || romanMap[rawDivision] || null;
    if (!division) {
      return null;
    }
    if (tier === 'BRONZE' && division <= 4) {
      return division;
    }
    if (tier === 'SILVER' && division <= 4) {
      return 4 + division;
    }
    if (tier === 'GOLD' && division <= 5) {
      return 8 + division;
    }
  }

  return null;
}

function rankToStr(rankInt) {
  if (!rankInt || rankInt < 1) {
    return 'N/A';
  }

  const roman = ['', 'I', 'II', 'III', 'IV', 'V'];
  if (rankInt <= 4) {
    return `Bronze ${roman[rankInt]}`;
  }
  if (rankInt <= 8) {
    return `Silver ${roman[rankInt - 4]}`;
  }
  if (rankInt <= 13) {
    return `Gold ${roman[rankInt - 8]}`;
  }
  return rankInt === 14 ? 'Platinum' : `Platinum +${rankInt - 14}`;
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

function teamToInputValue(team) {
  return team.map(titleCase).filter(Boolean).join(', ');
}

function getCurrentChampionToken(rawInputValue) {
  const parts = rawInputValue.split(',');
  return parts.length ? parts[parts.length - 1].trim() : rawInputValue.trim();
}

function renderChampionOptions(champions, token = '') {
  const normalizedToken = titleCase(token.trim());
  const filtered = normalizedToken
    ? champions.filter((champion) => champion.startsWith(normalizedToken))
    : champions;

  championOptions.innerHTML = filtered
    .slice(0, 50)
    .map((champion) => `<option value="${champion}"></option>`)
    .join('');
}

function attachTeamAutocomplete(input) {
  input.dataset.prevValue = input.value;

  input.addEventListener('focus', () => {
    const champions = loadChampionPool().sort((a, b) => a.localeCompare(b));
    renderChampionOptions(champions, getCurrentChampionToken(input.value));
    input.dataset.prevValue = input.value;
  });

  input.addEventListener('input', () => {
    const champions = loadChampionPool().sort((a, b) => a.localeCompare(b));
    const previousValue = input.dataset.prevValue || '';
    const currentValue = input.value;
    const selectedChampion = titleCase(currentValue.trim());

    if (
      previousValue.includes(',')
      && !currentValue.includes(',')
      && champions.includes(selectedChampion)
    ) {
      const prefix = previousValue.slice(0, previousValue.lastIndexOf(',') + 1).trim();
      input.value = `${prefix}, ${selectedChampion}`.replace(/^,\s*/, '');
    }

    input.dataset.prevValue = input.value;
    renderChampionOptions(champions, getCurrentChampionToken(input.value));
  });
}

function upsertChampionPoolFromTeams(teams) {
  const existing = new Set(loadChampionPool());

  teams
    .flat()
    .map(titleCase)
    .filter(Boolean)
    .forEach((champion) => existing.add(champion));

  saveChampionPool([...existing].sort((a, b) => a.localeCompare(b)));
}

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

function computeWinrate(fights) {
  if (!fights.length) {
    return 0;
  }
  const wins = fights.filter((fight) => fight.win).length;
  return (wins / fights.length) * 100;
}

function computeCurrentStreak(fights) {
  if (!fights.length) {
    return '0';
  }
  const lastResult = fights[fights.length - 1].win;
  let count = 0;

  for (let i = fights.length - 1; i >= 0; i -= 1) {
    if (fights[i].win === lastResult) {
      count += 1;
    } else {
      break;
    }
  }

  return `${lastResult ? 'W' : 'L'} x${count}`;
}

function buildTable(headers, rows) {
  if (!rows.length) {
    return '<p class="empty">Pas assez de données.</p>';
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
    <div class="stat-item"><span class="label">Total combats</span><div class="value">${total}</div></div>
    <div class="stat-item"><span class="label">Winrate global</span><div class="value">${winrate.toFixed(1)}%</div></div>
    <div class="stat-item"><span class="label">Streak actuelle</span><div class="value">${streak}</div></div>
    <div class="stat-item"><span class="label">Derniers 10</span><div class="value">${lastTenWr.toFixed(1)}%</div></div>
  `;
}

function renderBestTeams(fights) {
  const grouped = new Map();

  fights.forEach((fight) => {
    const key = getTeamKey(fight.player_team || []);
    if (!key) {
      return;
    }
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(fight);
  });

  const rows = [...grouped.entries()]
    .map(([team, teamFights]) => ({
      team,
      count: teamFights.length,
      wr: computeWinrate(teamFights),
    }))
    .filter((entry) => entry.count >= 5)
    .sort((a, b) => b.wr - a.wr || b.count - a.count)
    .map((entry) => [entry.team, `${entry.wr.toFixed(1)}%`, entry.count]);

  document.getElementById('best-teams').innerHTML = buildTable(['Team', 'WR', 'Combats'], rows);
}

function renderSynergies(fights) {
  const pairMap = new Map();
  const globalWr = computeWinrate(fights);

  fights.forEach((fight) => {
    const uniqueTeam = [...new Set((fight.player_team || []).map(titleCase))];
    for (let i = 0; i < uniqueTeam.length; i += 1) {
      for (let j = i + 1; j < uniqueTeam.length; j += 1) {
        const pair = [uniqueTeam[i], uniqueTeam[j]].sort((a, b) => a.localeCompare(b)).join(' + ');
        if (!pairMap.has(pair)) {
          pairMap.set(pair, []);
        }
        pairMap.get(pair).push(fight);
      }
    }
  });

  const rows = [...pairMap.entries()]
    .map(([pair, pairFights]) => {
      const wr = computeWinrate(pairFights);
      return {
        pair,
        fights: pairFights.length,
        wr,
        delta: wr - globalWr,
      };
    })
    .filter((entry) => entry.fights >= 8)
    .sort((a, b) => b.wr - a.wr || b.fights - a.fights)
    .slice(0, 5)
    .map((entry) => [entry.pair, `${entry.wr.toFixed(1)}%`, `${entry.delta >= 0 ? '+' : ''}${entry.delta.toFixed(1)}%`, entry.fights]);

  document.getElementById('synergy-stats').innerHTML = buildTable(
    ['Paire', 'WR', 'Delta vs global', 'Combats'],
    rows,
  );
}

function renderOpponentStats(fights) {
  const grouped = new Map();

  fights.forEach((fight) => {
    const team = getTeamKey(fight.opponent_team || []);
    if (!team) {
      return;
    }
    if (!grouped.has(team)) {
      grouped.set(team, []);
    }
    grouped.get(team).push(fight);
  });

  const beatenRows = [...grouped.entries()]
    .map(([team, teamFights]) => ({
      team,
      wins: teamFights.filter((fight) => fight.win).length,
    }))
    .filter((entry) => entry.wins > 0)
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 5)
    .map((entry) => [entry.team, entry.wins]);

  const lostRows = [...grouped.entries()]
    .map(([team, teamFights]) => ({
      team,
      losses: teamFights.filter((fight) => !fight.win).length,
    }))
    .filter((entry) => entry.losses > 0)
    .sort((a, b) => b.losses - a.losses)
    .slice(0, 5)
    .map((entry) => [entry.team, entry.losses]);

  document.getElementById('opponents-beaten').innerHTML = buildTable(['Team adverse', 'Victoires'], beatenRows);
  document.getElementById('opponents-lost').innerHTML = buildTable(['Team adverse', 'Défaites'], lostRows);
}

function renderRankStats(fights) {
  const playerRanks = fights
    .map((fight) => parseRank(fight.player_rank_str || ''))
    .filter((rank) => rank !== null);
  const bestRank = playerRanks.length ? Math.max(...playerRanks) : null;

  const rankedOpponents = fights.filter((fight) => parseRank(fight.opponent_rank_str || '') !== null);
  let wrVsStronger = 0;
  let wrVsLower = 0;

  if (rankedOpponents.length) {
    const stronger = rankedOpponents.filter(
      (fight) => parseRank(fight.opponent_rank_str) > parseRank(fight.player_rank_str),
    );
    const lower = rankedOpponents.filter(
      (fight) => parseRank(fight.opponent_rank_str) < parseRank(fight.player_rank_str),
    );

    wrVsStronger = computeWinrate(stronger);
    wrVsLower = computeWinrate(lower);
  }

  document.getElementById('rank-stats').innerHTML = `
    <div class="stats-grid">
      <div class="stat-item"><span class="label">Meilleur rank atteint</span><div class="value">${
        bestRank ? rankToStr(bestRank) : 'N/A'
      }</div></div>
      <div class="stat-item"><span class="label">WR vs plus fort</span><div class="value">${wrVsStronger.toFixed(
        1,
      )}%</div></div>
      <div class="stat-item"><span class="label">WR vs plus faible</span><div class="value">${wrVsLower.toFixed(
        1,
      )}%</div></div>
    </div>
  `;
}

function renderChampionSuggestions(fights) {
  const champions = new Set(loadChampionPool());

  fights.forEach((fight) => {
    [...(fight.player_team || []), ...(fight.opponent_team || [])]
      .map(titleCase)
      .filter(Boolean)
      .forEach((champion) => champions.add(champion));
  });

  const sortedChampions = [...champions].sort((a, b) => a.localeCompare(b));
  saveChampionPool(sortedChampions);
  renderChampionOptions(sortedChampions);
}

function renderAllStats() {
  const fights = loadFights();
  renderChampionSuggestions(fights);
  renderGlobalStats(fights);
  renderBestTeams(fights);
  renderSynergies(fights);
  renderOpponentStats(fights);
  renderRankStats(fights);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  formError.textContent = '';

  try {
    const lockData = loadPlayerTeamLock();
    const playerTeam = lockData.locked ? lockData.team : parseTeam(playerTeamInput.value);
    const opponentTeam = parseTeam(opponentTeamInput.value);
    validateTeam(playerTeam, 'Team joueur', true);
    if (opponentTeamInput.value.trim()) {
      validateTeam(opponentTeam, 'Team adverse', true);
    }

    if (!playerRankInput.value.trim()) {
      throw new Error('Rank joueur obligatoire.');
    }

    const winChoice = form.querySelector('input[name="win"]:checked');
    if (!winChoice) {
      throw new Error('Indique si le combat est une victoire ou une défaite.');
    }

    upsertChampionPoolFromTeams([playerTeam, opponentTeam]);

    const fights = loadFights();
    fights.push({
      timestamp: Date.now(),
      player_team: playerTeam,
      opponent_team: opponentTeam,
      player_rank_str: playerRankInput.value.trim(),
      opponent_rank_str: opponentRankInput.value.trim(),
      win: winChoice.value === 'yes',
    });

    saveFights(fights);
    form.reset();

    const refreshedLockData = loadPlayerTeamLock();
    if (refreshedLockData.locked && refreshedLockData.team.length) {
      lockPlayerTeamInput.checked = true;
      playerTeamInput.value = teamToInputValue(refreshedLockData.team);
      playerTeamInput.readOnly = true;
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
    playerTeamInput.readOnly = false;
    return;
  }

  try {
    const team = parseTeam(playerTeamInput.value);
    validateTeam(team, 'Team joueur', true);
    const normalizedTeam = team.map(titleCase);
    savePlayerTeamLock({ locked: true, team: normalizedTeam });
    playerTeamInput.value = teamToInputValue(normalizedTeam);
    playerTeamInput.readOnly = true;
  } catch (error) {
    lockPlayerTeamInput.checked = false;
    formError.textContent = `Impossible de verrouiller : ${error.message}`;
  }
});

playerTeamInput.addEventListener('blur', () => {
  if (playerTeamInput.readOnly) {
    return;
  }

  const normalizedTeam = parseTeam(playerTeamInput.value);
  playerTeamInput.value = teamToInputValue(normalizedTeam);
});

attachTeamAutocomplete(playerTeamInput);
attachTeamAutocomplete(opponentTeamInput);

const initialLockData = loadPlayerTeamLock();
if (initialLockData.locked && initialLockData.team.length) {
  lockPlayerTeamInput.checked = true;
  playerTeamInput.value = teamToInputValue(initialLockData.team);
  playerTeamInput.readOnly = true;
}

[playerTeamInput, opponentTeamInput].forEach((input) => {
  input.addEventListener('change', () => {
    const team = parseTeam(input.value);
    if (!team.length) {
      return;
    }
    upsertChampionPoolFromTeams([team]);
    renderChampionSuggestions(loadFights());
  });
});

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
      throw new Error('Le JSON importé doit être un tableau de combats.');
    }
    saveFights(parsed);
    renderAllStats();
  } catch (error) {
    formError.textContent = `Import impossible : ${error.message}`;
  } finally {
    importFileInput.value = '';
  }
});

renderAllStats();
void restoreFromBackupIfNeeded();
