(function initRaidArenaLogic(globalScope) {
  function titleCase(value) {
    return value
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  function getTeamKey(team) {
    return [...team].map(titleCase).join(',');
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

  function buildBestTeamRows(fights, minimumFights = 5) {
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

    return [...grouped.entries()]
      .map(([team, teamFights]) => ({
        team,
        count: teamFights.length,
        wr: computeWinrate(teamFights),
      }))
      .filter((entry) => entry.count >= minimumFights)
      .sort((a, b) => b.wr - a.wr || b.count - a.count)
      .map((entry) => [entry.team, `${entry.wr.toFixed(1)}%`, entry.count]);
  }

  function buildSynergyRows(fights, minimumFights = 8, limit = 5) {
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

    return [...pairMap.entries()]
      .map(([pair, pairFights]) => {
        const wr = computeWinrate(pairFights);
        return {
          pair,
          fights: pairFights.length,
          wr,
          delta: wr - globalWr,
        };
      })
      .filter((entry) => entry.fights >= minimumFights)
      .sort((a, b) => b.wr - a.wr || b.fights - a.fights)
      .slice(0, limit)
      .map((entry) => [entry.pair, `${entry.wr.toFixed(1)}%`, `${entry.delta >= 0 ? '+' : ''}${entry.delta.toFixed(1)}%`, entry.fights]);
  }

  function buildOpponentRows(fights, limit = 5) {
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
      .slice(0, limit)
      .map((entry) => [entry.team, entry.wins]);

    const lostRows = [...grouped.entries()]
      .map(([team, teamFights]) => ({
        team,
        losses: teamFights.filter((fight) => !fight.win).length,
      }))
      .filter((entry) => entry.losses > 0)
      .sort((a, b) => b.losses - a.losses)
      .slice(0, limit)
      .map((entry) => [entry.team, entry.losses]);

    return { beatenRows, lostRows };
  }

  const api = {
    titleCase,
    getTeamKey,
    computeWinrate,
    computeCurrentStreak,
    buildBestTeamRows,
    buildSynergyRows,
    buildOpponentRows,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  globalScope.RaidArenaLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
