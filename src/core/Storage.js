/**
 * Storage.js - localStorage 기반 전적 및 설정 관리 모듈
 * 게임별(오목, 틱택토, 사목) 및 모드별(친구랑, 컴퓨터랑) 전적을 영구 저장합니다.
 */

const STORAGE_KEY = 'miniboardgames_data_v1';

// 기본 전적 구조체
function createInitialStats() {
  return {
    gomoku: {
      pvp: { win1: 0, win2: 0, draw: 0 },
      ai: { win: 0, loss: 0, draw: 0 }
    },
    tictactoe: {
      pvp: { win1: 0, win2: 0, draw: 0 },
      ai: { win: 0, loss: 0, draw: 0 }
    },
    connect4: {
      pvp: { win1: 0, win2: 0, draw: 0 },
      ai: { win: 0, loss: 0, draw: 0 }
    }
  };
}

class StorageManager {
  constructor() {
    this.data = this.load();
  }

  // 데이터 로드
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // 누락된 키가 있으면 기본값으로 보강
        const defaults = createInitialStats();
        return {
          ...defaults,
          ...parsed,
          gomoku: { ...defaults.gomoku, ...(parsed.gomoku || {}) },
          tictactoe: { ...defaults.tictactoe, ...(parsed.tictactoe || {}) },
          connect4: { ...defaults.connect4, ...(parsed.connect4 || {}) }
        };
      }
    } catch (e) {
      console.warn('Failed to parse localStorage data:', e);
    }
    return createInitialStats();
  }

  // 데이터 저장
  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }

  // 특정 게임의 전적 조회
  getGameStats(gameId) {
    if (!this.data[gameId]) {
      this.data[gameId] = {
        pvp: { win1: 0, win2: 0, draw: 0 },
        ai: { win: 0, loss: 0, draw: 0 }
      };
    }
    return this.data[gameId];
  }

  /**
   * 경기 결과 기록
   * @param {'gomoku'|'tictactoe'|'connect4'} gameId 게임 식별자
   * @param {'pvp'|'ai'} mode 모드 (친구랑 vs 컴퓨터랑)
   * @param {1|2|'draw'} winner 승자 (1: 플레이어1/사용자, 2: 플레이어2/AI, 'draw': 무승부)
   */
  recordResult(gameId, mode, winner) {
    const stats = this.getGameStats(gameId);

    if (mode === 'pvp') {
      if (winner === 1) stats.pvp.win1 += 1;
      else if (winner === 2) stats.pvp.win2 += 1;
      else stats.pvp.draw += 1;
    } else {
      // AI 모드 (1: 나(사용자) 승리, 2: 컴퓨터 승리)
      if (winner === 1) stats.ai.win += 1;
      else if (winner === 2) stats.ai.loss += 1;
      else stats.ai.draw += 1;
    }

    this.save();
    return stats;
  }

  // 특정 게임 전적 초기화
  resetGameStats(gameId) {
    const defaults = createInitialStats();
    this.data[gameId] = defaults[gameId];
    this.save();
    return this.data[gameId];
  }
}

export const storage = new StorageManager();
