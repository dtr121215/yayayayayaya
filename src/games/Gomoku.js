/**
 * Gomoku.js - 15x15 오목 게임 클래스
 * 
 * 주요 기능:
 * - 15x15 격자 바둑판 렌더링 및 화점(Star points) 표시
 * - 모바일 오작동 방지: 첫 번째 탭 시 착수 위치 미리보기(고스트 스톤), 동일 칸 재탭 시 착수 확정
 * - 자유 규칙: 가로·세로·대각선 5개 이상 연속 돌 완성 시 승리 (쌍삼 금수 제외)
 * - 승리 라인 강조(골드 펄스 하이라이트)
 * - 휴리스틱 평가 알고리즘 기반 컴퓨터 AI (공격/수비 위협도 가중치 계산)
 */

import { BaseGame } from '../core/BaseGame.js';
import { sound } from '../core/Sound.js';

export class Gomoku extends BaseGame {
  constructor(options) {
    super({ ...options, gameId: 'gomoku' });
    this.size = 15; // 15x15 판
    this.pendingPosition = null; // 모바일 2회 탭 확인용 대기 좌표 { r, c }
  }

  // 15x15 빈 보드 배열 생성 (0: 빈칸, 1: 흑돌, 2: 백돌)
  createEmptyBoard() {
    this.pendingPosition = null;
    this.onPendingChange(null);
    return Array.from({ length: this.size }, () => Array(this.size).fill(0));
  }

  // 보드 렌더링
  renderBoard() {
    if (!this.container) return;
    this.container.innerHTML = '';

    // 바둑판 컨테이너
    const boardEl = document.createElement('div');
    boardEl.className = 'gomoku-board relative w-full aspect-square max-w-[420px] mx-auto select-none touch-manipulation rounded-lg shadow-xl';

    // 15x15 격자 생성
    const gridEl = document.createElement('div');
    gridEl.className = 'gomoku-grid grid w-full h-full';
    gridEl.style.gridTemplateColumns = `repeat(${this.size}, minmax(0, 1fr))`;
    gridEl.style.gridTemplateRows = `repeat(${this.size}, minmax(0, 1fr))`;

    // 화점 좌표 (3,3), (3,11), (7,7), (11,3), (11,11)
    const starPoints = new Set(['3,3', '3,11', '7,7', '11,3', '11,11']);

    // 승리 라인 Set 생성 (빠른 조회용)
    const winningSet = new Set();
    if (this.winningLine) {
      this.winningLine.forEach(({ r, c }) => winningSet.add(`${r},${c}`));
    }

    // 각 교차점 셀 렌더링
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'gomoku-cell relative flex items-center justify-center p-0 m-0 border-0 bg-transparent focus:outline-none';
        cell.setAttribute('aria-label', `${r + 1}행 ${c + 1}열`);
        cell.dataset.row = String(r);
        cell.dataset.col = String(c);

        // 화점 표시
        if (starPoints.has(`${r},${c}`)) {
          const star = document.createElement('div');
          star.className = 'gomoku-star-point pointer-events-none';
          cell.appendChild(star);
        }

        const stoneValue = this.board[r][c];

        // 1. 이미 놓인 돌 렌더링
        if (stoneValue !== 0) {
          const stone = document.createElement('div');
          const isWinningStone = winningSet.has(`${r},${c}`);
          const isLastMove = this.history.length > 0 &&
            this.history[this.history.length - 1].r === r &&
            this.history[this.history.length - 1].c === c;

          stone.className = `gomoku-stone stone-${stoneValue === 1 ? 'black' : 'white'} ${
            isWinningStone ? 'stone-winning ring-4 ring-amber-400 animate-pulse' : ''
          } ${isLastMove ? 'stone-last-move' : ''}`;

          cell.appendChild(stone);
        }
        // 2. 모바일 착수 대기(1차 탭) 미리보기 고스트 스톤
        else if (this.pendingPosition && this.pendingPosition.r === r && this.pendingPosition.c === c) {
          const ghostStone = document.createElement('div');
          ghostStone.className = `gomoku-stone stone-${this.currentPlayer === 1 ? 'black' : 'white'} stone-ghost`;

          // 2차 탭 확인 유도 핑 애니메이션
          const pingIndicator = document.createElement('div');
          pingIndicator.className = 'stone-pending-ping';

          cell.appendChild(ghostStone);
          cell.appendChild(pingIndicator);
        }

        // 터치 및 클릭 이벤트 리스너 등록
        cell.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleCellTap(r, c);
        });

        gridEl.appendChild(cell);
      }
    }

    boardEl.appendChild(gridEl);
    this.container.appendChild(boardEl);
  }

  /**
   * 셀 탭 처리 (모바일 2단계 탭 확인 로직)
   * 1. 빈 칸 첫 번째 탭: 미리보기 고스트 스톤 표시
   * 2. 같은 칸 두 번째 탭: 착수 확정
   * (컴퓨터 차례이거나 게임 종료 시 무시)
   */
  handleCellTap(r, c) {
    if (this.isGameOver || this.isAIThinking) return;
    // 컴퓨터 대전 시 컴퓨터 턴이면 사용자 입력 차단
    if (this.mode === 'ai' && this.currentPlayer === 2) return;

    // 이미 돌이 놓여 있는 칸이면 무시
    if (this.board[r][c] !== 0) {
      sound.playTap();
      return;
    }

    // 동일한 칸을 다시 탭한 경우 -> 착수 확정!
    if (this.pendingPosition && this.pendingPosition.r === r && this.pendingPosition.c === c) {
      this.confirmPendingMove();
      return;
    }

    // 새로운 칸 탭 -> 미리보기 위치 지정
    this.pendingPosition = { r, c };
    sound.playTap();
    this.renderBoard();
    this.onPendingChange({
      r,
      c,
      player: this.currentPlayer,
      message: '선택한 위치를 다시 탭하거나 [착수] 버튼을 누르면 돌을 놓습니다.'
    });
  }

  // 대기 중인 착수 확정
  confirmPendingMove() {
    if (!this.pendingPosition) return;
    const { r, c } = this.pendingPosition;
    this.pendingPosition = null;
    this.onPendingChange(null);
    this.makeMove({ r, c });
  }

  // 대기 중인 착수 취소
  cancelPendingMove() {
    if (!this.pendingPosition) return;
    this.pendingPosition = null;
    this.onPendingChange(null);
    this.renderBoard();
  }

  // 착수를 보드에 적용
  applyMoveToBoard(move, player) {
    this.board[move.r][move.c] = player;
    this.pendingPosition = null;
    this.onPendingChange(null);
  }

  // 무르기 시 보드에서 돌 제거
  revertMoveFromBoard(move) {
    this.board[move.r][move.c] = 0;
    this.pendingPosition = null;
    this.onPendingChange(null);
  }

  // 바둑돌 놓는 소리 재생
  playMoveSound() {
    sound.playStone();
  }

  /**
   * 승리 판정: 마지막 착수 위치로부터 가로, 세로, 양 대각선 4개 방향으로 5개 이상 연속 검사
   * (자유 오목 규칙: 5개 이상이면 승리, 쌍삼 금수 제외)
   */
  checkWin(lastMove) {
    const { r, c, player } = lastMove;
    const directions = [
      [ [0, 1], [0, -1] ],   // 가로
      [ [1, 0], [-1, 0] ],   // 세로
      [ [1, 1], [-1, -1] ], // 대각선 \
      [ [1, -1], [-1, 1] ]  // 대각선 /
    ];

    for (const [dir1, dir2] of directions) {
      const lineStones = [{ r, c }];

      // 양방향 탐색
      for (const [dr, dc] of [dir1, dir2]) {
        let nr = r + dr;
        let nc = c + dc;
        while (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size && this.board[nr][nc] === player) {
          lineStones.push({ r: nr, c: nc });
          nr += dr;
          nc += dc;
        }
      }

      // 5개 이상 연속이면 승리
      if (lineStones.length >= 5) {
        return {
          hasWon: true,
          winningLine: lineStones
        };
      }
    }

    return { hasWon: false, winningLine: null };
  }

  // 무승부 판정 (모든 칸이 채워졌는지 확인)
  checkDraw() {
    return this.board.every((row) => row.every((cell) => cell !== 0));
  }

  /**
   * 오목 컴퓨터 AI (휴리스틱 평가 알고리즘)
   * 
   * 원리:
   * 1. 기존 돌들의 반경 2칸 이내 유효 빈칸들만 후보로 추려 고속 탐색
   * 2. 각 빈칸에 대해 '컴퓨터가 둘 때의 점수(공격)'와 '상대방이 둘 때의 점수(수비)' 계산
   * 3. 연속된 돌의 개수(5연속, 4연속, 3연속 등)와 양 끝이 열려있는지(Open) 여부에 따라 점수 부여
   * 4. 상대방의 승리 위협(4목, 열린 3목)을 적극 차단하고 최선의 수 착수
   */
  getAIMove() {
    // 첫 수가 컴퓨터인 경우 (보드가 비어있는 경우) 정중앙 (7, 7) 착수
    if (this.history.length === 0) {
      return { r: 7, c: 7 };
    }

    const aiPlayer = 2;       // 백돌
    const humanPlayer = 1;    // 흑돌

    // 착수 후보지 추출 (기존 돌들에서 체비쇼프 거리 2 이하의 빈 칸)
    const candidates = this.getCandidateCells();
    if (candidates.length === 0) {
      return { r: 7, c: 7 };
    }

    let bestScore = -Infinity;
    let bestMoves = [];

    for (const { r, c } of candidates) {
      // 1. 공격 점수 평가 (AI가 이 자리에 둘 때)
      const attackScore = this.evaluatePoint(r, c, aiPlayer);

      // 컴퓨터가 즉시 5목을 만들어 승리할 수 있다면 바로 선택
      if (attackScore >= 100000) {
        return { r, c };
      }

      // 2. 수비 점수 평가 (사람이 이 자리에 둘 때 생길 위협도)
      const defenseScore = this.evaluatePoint(r, c, humanPlayer);

      // 인간이 다음 턴에 5목을 만들 수 있다면 최우선 차단
      if (defenseScore >= 100000) {
        bestScore = 999999;
        bestMoves = [{ r, c }];
        break;
      }

      // 공격과 수비의 가중합산 점수 계산
      // 수비 점수에 1.1배, 공격 점수에 1.0배 가중치 (위기 방어 중시)
      // 중앙에 가까울수록 아주 미세한 가산점 부여 (판 바깥으로 흩어짐 방지)
      const centerDist = Math.abs(7 - r) + Math.abs(7 - c);
      const totalScore = (attackScore * 1.05) + (defenseScore * 1.15) - (centerDist * 2);

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestMoves = [{ r, c }];
      } else if (totalScore === bestScore) {
        bestMoves.push({ r, c });
      }
    }

    // 동점인 최선의 수 중에서 무작위 하나 선택
    const chosen = bestMoves[Math.floor(Math.random() * bestMoves.length)];
    return chosen;
  }

  // 돌 주변 빈칸 후보군 탐색
  getCandidateCells() {
    const candidateSet = new Set();

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.board[r][c] !== 0) {
          // 거리 2 범위 탐색
          for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size && this.board[nr][nc] === 0) {
                candidateSet.add(`${nr},${nc}`);
              }
            }
          }
        }
      }
    }

    return Array.from(candidateSet).map((coord) => {
      const [r, c] = coord.split(',').map(Number);
      return { r, c };
    });
  }

  /**
   * 특정 좌표 (r, c)에 특정 플레이어가 돌을 놓았을 때의 형세 점수 산출
   */
  evaluatePoint(r, c, player) {
    const directions = [
      [0, 1],   // 가로
      [1, 0],   // 세로
      [1, 1],   // 대각선 \
      [1, -1]   // 대각선 /
    ];

    let totalScore = 0;

    for (const [dr, dc] of directions) {
      let count = 1;      // (r, c) 포함 연속 돌 수
      let openEnds = 0;   // 양 끝이 열린 개수 (0: 막힘, 1: 한쪽 열림, 2: 양쪽 열림)

      // 양의 방향 검사
      let step = 1;
      while (true) {
        const nr = r + dr * step;
        const nc = c + dc * step;
        if (nr < 0 || nr >= this.size || nc < 0 || nc >= this.size) break;
        if (this.board[nr][nc] === player) {
          count++;
          step++;
        } else if (this.board[nr][nc] === 0) {
          openEnds++;
          break;
        } else {
          // 상대방 돌로 막힘
          break;
        }
      }

      // 음의 방향 검사
      step = 1;
      while (true) {
        const nr = r - dr * step;
        const nc = c - dc * step;
        if (nr < 0 || nr >= this.size || nc < 0 || nc >= this.size) break;
        if (this.board[nr][nc] === player) {
          count++;
          step++;
        } else if (this.board[nr][nc] === 0) {
          openEnds++;
          break;
        } else {
          // 상대방 돌로 막힘
          break;
        }
      }

      totalScore += this.getPatternScore(count, openEnds);
    }

    return totalScore;
  }

  // 돌의 개수와 열린 끝의 개수에 따른 정밀 패턴 배점
  getPatternScore(count, openEnds) {
    if (count >= 5) return 100000; // 5연속 (승리)

    if (count === 4) {
      if (openEnds === 2) return 15000; // 양쪽 열린 4 (막을 수 없는 승리)
      if (openEnds === 1) return 2500;  // 한쪽 열린 4 (외통수 위협)
      return 0; // 양쪽 다 막힌 4
    }

    if (count === 3) {
      if (openEnds === 2) return 2000;  // 양쪽 열린 3 (열린 4를 만드는 핵심 수)
      if (openEnds === 1) return 300;   // 한쪽 열린 3
      return 0;
    }

    if (count === 2) {
      if (openEnds === 2) return 200;   // 양쪽 열린 2
      if (openEnds === 1) return 30;
      return 0;
    }

    if (count === 1 && openEnds === 2) {
      return 10;
    }

    return 0;
  }
}
