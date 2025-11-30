export interface PlayerStats {
  agentId: string;
  agentName: string;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  totalRounds: number;
  roundsWon: number;
  roundsLost: number;
  roundsTied: number;
  totalPaid: number;
  totalWon: number;
  winRate: number;
  averageRoundsPerGame: number;
}

export class StatsTracker {
  private stats = new Map<string, PlayerStats>();

  initializePlayer(agentId: string, agentName: string, entryFee: number): void {
    if (!this.stats.has(agentId)) {
      this.stats.set(agentId, {
        agentId,
        agentName,
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        totalRounds: 0,
        roundsWon: 0,
        roundsLost: 0,
        roundsTied: 0,
        totalPaid: entryFee,
        totalWon: 0,
        winRate: 0,
        averageRoundsPerGame: 0
      });
    } else {
      const playerStats = this.stats.get(agentId)!;
      playerStats.totalPaid += entryFee;
    }
  }

  recordRound(agentId: string, result: 'win' | 'lose' | 'tie'): void {
    const playerStats = this.stats.get(agentId);
    if (!playerStats) return;

    playerStats.totalRounds++;

    switch (result) {
      case 'win':
        playerStats.roundsWon++;
        break;
      case 'lose':
        playerStats.roundsLost++;
        break;
      case 'tie':
        playerStats.roundsTied++;
        break;
    }
  }

  recordGameEnd(winnerId: string, loserId: string, prize: number, totalRounds: number): void {
    const winnerStats = this.stats.get(winnerId);
    const loserStats = this.stats.get(loserId);

    if (winnerStats) {
      winnerStats.gamesWon++;
      winnerStats.gamesPlayed++;
      winnerStats.totalWon += prize;
      winnerStats.winRate = winnerStats.gamesWon / winnerStats.gamesPlayed;
      winnerStats.averageRoundsPerGame = winnerStats.totalRounds / winnerStats.gamesPlayed;
    }

    if (loserStats) {
      loserStats.gamesLost++;
      loserStats.gamesPlayed++;
      loserStats.winRate = loserStats.gamesWon / loserStats.gamesPlayed;
      loserStats.averageRoundsPerGame = loserStats.totalRounds / loserStats.gamesPlayed;
    }
  }

  getPlayerStats(agentId: string): PlayerStats | undefined {
    return this.stats.get(agentId);
  }

  getAllStats(): PlayerStats[] {
    return Array.from(this.stats.values());
  }

  getLeaderboard(): PlayerStats[] {
    return this.getAllStats()
      .filter(s => s.gamesPlayed > 0)
      .sort((a, b) => {
        if (b.winRate !== a.winRate) {
          return b.winRate - a.winRate;
        }
        return b.gamesWon - a.gamesWon;
      });
  }
}
