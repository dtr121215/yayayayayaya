/**
 * TicTacToe.js - 3x3 틱택토 게임 클래스
 * 
 * 주요 기능:
 * - 3x3 격자 보드 렌더링 (나무 조각 질감의 O / X 말)
 * - 한 줄(가로, 세로, 대각선) 3개 완성 시 승리 판정
 * - 미니맥스(Minimax) 알고리즘 기반 완벽한 컴퓨터 AI
 * - 승리 라인 강조 (골드 하이라이트)
 */

import { BaseGame } from '../core/BaseGame.js';
import { sound } from '../core/Sound.js';

export class TicTacToe extends BaseGame {
  constructor(options) {
    super({ ...options, gameId: 'tictactoe' });
    this.size = 3; // 3x3
  }

  // 3x3 빈 보드 생성 (0: 빈칸, 1: O, 2: X)
  createEmptyBoard() {
    return Array.from({ length: this.size }, () => Array(this.size).fill(0));
  }

  // 보드 렌더링
  renderBoard() {
    if (!this.container) return;
    this.container.innerHTML = '';

    const boardEl = document.createElement('div');
    boardEl.className = 'tictactoe-board relative w-full aspect-square max-w-[340px] mx-auto select-none touch-manipulation grid grid-cols-3 grid-rows-3 gap-2.5 p-3 rounded-2xl shadow-xl bg-amber-950/20 border-4 border-amber-900/40';

    const winningSet = new Set();
    if (this.winningLine) {
      this.winningLine.forEach(({ r, c }) => winningSet.add(`${r},${c}`));
    }

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'tictactoe-cell relative flex items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/60 shadow-md border-2 border-amber-200/80 dark:border-amber-900/60 transition-all active:scale-95 focus:outline-none';
        cell.setAttribute('aria-label', `${r + 1}행 ${c + 1}열`);

        const val = this.board[r][c];
        const isWinningCell = winningSet.has(`${r},${c}`);

        if (isWinningCell) {
          cell.classList.add('ring-4', 'ring-amber-400', 'bg-amber-200', 'dark:bg-amber-900', 'animate-pulse');
        }

        if (val === 1) {
          // O (플레이어 1: 옥색 링)
          const piece = document.createElement('div');
          piece.className = 'w-14 h-14 md:w-16 md:h-16 rounded-full border-[7px] border-emerald-600 dark:border-emerald-400 shadow-sm flex items-center justify-center animate-scale-in';
          cell.appendChild(piece);
        } else if (val === 2) {
          // X (플레이어 2: 루비색 크로스)
          const piece = document.createElement('div');
          piece.className = 'relative w-14 h-14 md:w-16 md:h-16 flex items-center justify-center animate-scale-in';
          const line1 = document.createElement('div');
          line1.className = 'absolute w-14 md:w-16 h-2 bg-rose-600 dark:bg-rose-400 rounded-full rotate-45 shadow-sm';
          const line2 = document.createElement('div');
          line2.className = 'absolute w-14 md:w-16 h-2 bg-rose-600 dark:bg-rose-400 rounded-full -rotate-45 shadow-sm';
          piece.appendChild(line1);
          piece.appendChild(line2);
          cell.appendChild(piece);
        } else if (!this.isGameOver && !this.isAIThinking && !(this.mode === 'ai' && this.currentPlayer === 2)) {
          // 빈 칸에 가벼운 호버/포커스 힌트
          cell.classList.add('hover:bg-amber-50', 'dark:hover:bg-amber-900/30', 'cursor-pointer');
        }

        cell.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleCellClick(r, c);
        });

        boardEl.appendChild(cell);
      }
    }

    this.container.appendChild(boardEl);
  }

  // 칸 클릭
  handleCellClick(r, c) {
    if (this.isGameOver || this.isAIThinking) return;
    if (this.mode === 'ai' && this.currentPlayer === 2) return;
    if (this.board[r][c] !== 0) return;

    this.makeMove({ r, c });
  }

  applyMoveToBoard(move, player) {
    this.board[move.r][move.c] = player;
  }

  revertMoveFromBoard(move) {
    this.board[move.r][move.c] = 0;
  }

  playMoveSound() {
    sound.playWoodBlock();
  }

  /**
   * 틱택토 승리 판정 (가로 3줄, 세로 3줄, 대각선 2줄)
   */
  checkWin(lastMove) {
    const b = this.board;
    const lines = [
      // 가로 3행
      [ {r: 0, c: 0}, {r: 0, c: 1}, {r: 0, c: 2} ],
      [ {r: 1, c: 0}, {r: 1, c: 1}, {r: 1, c: 2} ],
      [ {r: 2, c: 0}, {r: 2, c: 1}, {r: 2, c: 2} ],
      // 세로 3열
      [ {r: 0, c: 0}, {r: 1, c: 0}, {r: 2, c: 0} ],
      [ {r: 0, c: 1}, {r: 1, c: 1}, {r: 2, c: 1} ],
      [ {r: 0, c: 2}, {r: 1, c: 2}, {r: 2, c: 2} ],
      // 대각선 2개
      [ {r: 0, c: 0}, {r: 1, c: 1}, {r: 2, c: 2} ],
      [ {r: 0, c: 2}, {r: 1, c: 1}, {r: 2, c: 0} ]
    ];

    for (const line of lines) {
      const p = b[line[0].r][line[0].c];
      if (p !== 0 && p === b[line[1].r][line[1].c] && p === b[line[2].r][line[2].c]) {
        return {
          hasWon: true,
          winningLine: line
        };
      }
    }

    return { hasWon: false, winningLine: null };
  }

  // 9칸 모두 채워졌는지 무승부 판정
  checkDraw() {
    return this.board.every((row) => row.every((c) => c !== 0));
  }

  /**
   * 틱택토 컴퓨터 AI - Minimax 알고리즘
   * 모든 가능한 수를 완전 탐색하여 패배하지 않는 최적의 수 착수
   */
  getAIMove() {
    const aiPlayer = 2; // X
    const humanPlayer = 1; // O

    // 빈 칸 목록
    const emptyCells = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (this.board[r][c] === 0) emptyCells.push({ r, c });
      }
    }

    // 첫 수인 경우 중앙 또는 모서리 선호
    if (emptyCells.length === 9) {
      return { r: 1, c: 1 };
    }

    let bestScore = -Infinity;
    let bestMove = emptyCells[0];

    for (const cell of emptyCells) {
      this.board[cell.r][cell.c] = aiPlayer;
      const score = this.minimax(this.board, 0, false, aiPlayer, humanPlayer);
      this.board[cell.r][cell.c] = 0;

      if (score > bestScore) {
        bestScore = score;
        bestMove = cell;
      }
    }

    return bestMove;
  }

  // 미니맥스 재귀 평가 함수
  minimax(board, depth, isMaximizing, aiPlayer, humanPlayer) {
    const winResult = this.checkWinState(board);
    if (winResult === aiPlayer) return 10 - depth;
    if (winResult === humanPlayer) return depth - 10;
    if (this.isBoardFull(board)) return 0;

    if (isMaximizing) {
      let maxScore = -Infinity;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (board[r][c] === 0) {
            board[r][c] = aiPlayer;
            const score = this.minimax(board, depth + 1, false, aiPlayer, humanPlayer);
            board[r][c] = 0;
            maxScore = Math.max(maxScore, score);
          }
        }
      }
      return maxScore;
    } else {
      let minScore = Infinity;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (board[r][c] === 0) {
            board[r][c] = humanPlayer;
            const score = this.minimax(board, depth + 1, true, aiPlayer, humanPlayer);
            board[r][c] = 0;
            minScore = Math.min(minScore, score);
          }
        }
      }
      return minScore;
    }
  }

  // 미니맥스용 임의 보드 승자 검사
  checkWinState(b) {
    const lines = [
      [ [0,0], [0,1], [0,2] ], [ [1,0], [1,1], [1,2] ], [ [2,0], [2,1], [2,2] ],
      [ [0,0], [1,0], [2,0] ], [ [0,1], [1,1], [2,1] ], [ [0,2], [1,2], [2,2] ],
      [ [0,0], [1,1], [2,2] ], [ [0,2], [1,1], [2,0] ]
    ];
    for (const [p1, p2, p3] of lines) {
      const v = b[p1[0]][p1[1]];
      if (v !== 0 && v === b[p2[0]][p2[1]] && v === b[p3[0]][p3[1]]) {
        return v;
      }
    }
    return 0;
  }

  isBoardFull(b) {
    return b.every((row) => row.every((c) => c !== 0));
  }
}
