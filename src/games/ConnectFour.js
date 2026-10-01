/**
 * ConnectFour.js - 7열 6행 사목 (Connect 4) 게임 클래스
 * 
 * 주요 기능:
 * - 7열 6행 스탠드 보드 렌더링 (원형 슬롯 디자인)
 * - 열을 탭하면 가장 아래 빈 칸까지 중력 낙하하는 실감나는 물리 애니메이션
 * - 가로·세로·대각선 4개 연속 완성 시 승리 판정 및 하이라이트
 * - 탐색 깊이 제한(Depth-Limited) 알파-베타 가지치기 미니맥스 컴퓨터 AI
 */

import { BaseGame } from '../core/BaseGame.js';
import { sound } from '../core/Sound.js';

export class ConnectFour extends BaseGame {
  constructor(options) {
    super({ ...options, gameId: 'connect4' });
    this.rows = 6;
    this.cols = 7;
  }

  // 6행 7열 빈 보드 생성 (0: 빈칸, 1: 빨강, 2: 노랑)
  createEmptyBoard() {
    return Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
  }

  // 보드 렌더링
  renderBoard() {
    if (!this.container) return;
    this.container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'connect4-wrapper w-full max-w-[390px] mx-auto select-none touch-manipulation flex flex-col items-center';

    // 1. 상단 열 선택 탭 버튼 바 (터치 영역 극대화)
    const topColButtons = document.createElement('div');
    topColButtons.className = 'grid grid-cols-7 w-full gap-1 mb-2 px-1';

    for (let c = 0; c < this.cols; c++) {
      const colBtn = document.createElement('button');
      colBtn.type = 'button';
      colBtn.className = 'h-9 rounded-lg flex items-center justify-center transition-all bg-amber-900/10 hover:bg-amber-900/20 active:scale-90 text-amber-950 dark:text-amber-100 focus:outline-none';
      colBtn.setAttribute('aria-label', `${c + 1}열에 떨어뜨리기`);

      // 화살표 아이콘
      colBtn.innerHTML = `
        <svg class="w-5 h-5 text-amber-800 dark:text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 13l-7 7-7-7m14-8l-7 7-7-7" />
        </svg>
      `;

      // 가득 찬 열이면 비활성화
      if (this.board[0][c] !== 0 || this.isGameOver || this.isAIThinking || (this.mode === 'ai' && this.currentPlayer === 2)) {
        colBtn.disabled = true;
        colBtn.classList.add('opacity-30', 'cursor-not-allowed');
      } else {
        colBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleColumnTap(c);
        });
      }

      topColButtons.appendChild(colBtn);
    }
    wrapper.appendChild(topColButtons);

    // 2. 사목 스탠드 프레임 본체 (파란색/네이비 튼튼한 보드 케이스)
    const boardFrame = document.createElement('div');
    boardFrame.className = 'connect4-frame relative w-full aspect-[7/6] bg-blue-700 dark:bg-blue-900 p-2 sm:p-3 rounded-2xl shadow-2xl border-4 border-blue-800 dark:border-blue-950 grid grid-cols-7 grid-rows-6 gap-1.5 sm:gap-2';

    const winningSet = new Set();
    if (this.winningLine) {
      this.winningLine.forEach(({ r, c }) => winningSet.add(`${r},${c}`));
    }

    // 마지막 착수 위치 확인 (낙하 애니메이션 적용 대상)
    const lastMove = this.history.length > 0 ? this.history[this.history.length - 1] : null;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const slot = document.createElement('div');
        slot.className = 'connect4-slot relative flex items-center justify-center rounded-full bg-slate-900/40 aspect-square overflow-hidden cursor-pointer shadow-inner';
        slot.dataset.row = String(r);
        slot.dataset.col = String(c);

        const val = this.board[r][c];
        const isWinningToken = winningSet.has(`${r},${c}`);
        const isLatest = lastMove && lastMove.r === r && lastMove.c === c;

        if (val !== 0) {
          const disc = document.createElement('div');
          const isRed = val === 1;
          disc.className = `w-[88%] h-[88%] rounded-full shadow-lg ${
            isRed
              ? 'bg-gradient-to-tr from-rose-700 via-rose-500 to-rose-400 border-2 border-rose-300'
              : 'bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-300 border-2 border-yellow-200'
          } ${isWinningToken ? 'ring-4 ring-white animate-bounce' : ''} ${
            isLatest ? 'animate-drop-bounce' : ''
          }`;

          slot.appendChild(disc);
        }

        // 슬롯 자체를 탭해도 해당 열에 투입되도록 지원
        slot.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleColumnTap(c);
        });

        boardFrame.appendChild(slot);
      }
    }

    wrapper.appendChild(boardFrame);

    // 3. 하단 받침대 다리 장식
    const standBase = document.createElement('div');
    standBase.className = 'flex justify-between w-[92%] h-3 bg-blue-900 dark:bg-blue-950 rounded-b-xl shadow-md -mt-1';
    wrapper.appendChild(standBase);

    this.container.appendChild(wrapper);
  }

  // 열 탭 시 가장 아래 빈 행을 찾아 착수
  handleColumnTap(col) {
    if (this.isGameOver || this.isAIThinking) return;
    if (this.mode === 'ai' && this.currentPlayer === 2) return;

    // 해당 열에서 가장 밑에 있는 빈 행(row) 탐색
    const targetRow = this.getLowestEmptyRow(this.board, col);
    if (targetRow === -1) {
      // 열이 꽉 참
      sound.playTap();
      return;
    }

    this.makeMove({ r: targetRow, c: col });
  }

  // 특정 열의 가장 아래 빈 행 찾기
  getLowestEmptyRow(board, col) {
    for (let r = this.rows - 1; r >= 0; r--) {
      if (board[r][col] === 0) {
        return r;
      }
    }
    return -1; // 가득 찬 열
  }

  applyMoveToBoard(move, player) {
    this.board[move.r][move.c] = player;
  }

  revertMoveFromBoard(move) {
    this.board[move.r][move.c] = 0;
  }

  playMoveSound() {
    sound.playTokenDrop();
  }

  /**
   * 승리 판정 (가로, 세로, 양 대각선 4연속 검사)
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

      for (const [dr, dc] of [dir1, dir2]) {
        let nr = r + dr;
        let nc = c + dc;
        while (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && this.board[nr][nc] === player) {
          lineStones.push({ r: nr, c: nc });
          nr += dr;
          nc += dc;
        }
      }

      if (lineStones.length >= 4) {
        return {
          hasWon: true,
          winningLine: lineStones
        };
      }
    }

    return { hasWon: false, winningLine: null };
  }

  // 맨 윗줄이 모두 찼으면 무승부
  checkDraw() {
    return this.board[0].every((cell) => cell !== 0);
  }

  /**
   * 사목 컴퓨터 AI - 탐색 깊이 제한(Depth 4) 알파-베타 미니맥스 알고리즘
   * 
   * 최적화:
   * 1. 중앙 열(c=3)부터 우선 탐색하여 알파-베타 가지치기 효율 극대화
   * 2. 4연속 윈도우 휴리스틱 평가 함수 적용
   * 3. 0.5초 이내에 수싸움 연산 완료
   */
  getAIMove() {
    const aiPlayer = 2;     // 노랑
    const humanPlayer = 1;  // 빨강
    const maxDepth = 4;     // 깊이 4 탐색

    // 유효한 열 탐색
    const validCols = [];
    // 중앙에 가까운 열부터 정렬 (중앙 우선권)
    const colOrder = [3, 2, 4, 1, 5, 0, 6];
    for (const col of colOrder) {
      if (this.board[0][col] === 0) {
        validCols.push(col);
      }
    }

    if (validCols.length === 0) return null;

    // 즉시 승리 가능한 수가 있는지 먼저 단일 검사
    for (const col of validCols) {
      const row = this.getLowestEmptyRow(this.board, col);
      this.board[row][col] = aiPlayer;
      if (this.isWinningMove(this.board, row, col, aiPlayer)) {
        this.board[row][col] = 0;
        return { r: row, c: col };
      }
      this.board[row][col] = 0;
    }

    // 상대방의 즉각적인 4목 승리를 막아야 하는지 검사
    for (const col of validCols) {
      const row = this.getLowestEmptyRow(this.board, col);
      this.board[row][col] = humanPlayer;
      if (this.isWinningMove(this.board, row, col, humanPlayer)) {
        this.board[row][col] = 0;
        return { r: row, c: col };
      }
      this.board[row][col] = 0;
    }

    // 알파-베타 미니맥스 실행
    let bestScore = -Infinity;
    let bestCol = validCols[0];

    for (const col of validCols) {
      const row = this.getLowestEmptyRow(this.board, col);
      this.board[row][col] = aiPlayer;
      const score = this.minimax(this.board, maxDepth - 1, -Infinity, Infinity, false, aiPlayer, humanPlayer);
      this.board[row][col] = 0;

      if (score > bestScore) {
        bestScore = score;
        bestCol = col;
      }
    }

    const finalRow = this.getLowestEmptyRow(this.board, bestCol);
    return { r: finalRow, c: bestCol };
  }

  // 알파-베타 미니맥스 재귀 함수
  minimax(board, depth, alpha, beta, isMaximizing, aiPlayer, humanPlayer) {
    if (depth === 0) {
      return this.evaluateBoard(board, aiPlayer, humanPlayer);
    }

    const validCols = [];
    const colOrder = [3, 2, 4, 1, 5, 0, 6];
    for (const col of colOrder) {
      if (board[0][col] === 0) validCols.push(col);
    }

    if (validCols.length === 0) return 0; // 무승부

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const col of validCols) {
        const row = this.getLowestEmptyRow(board, col);
        board[row][col] = aiPlayer;

        if (this.isWinningMove(board, row, col, aiPlayer)) {
          board[row][col] = 0;
          return 100000 + depth;
        }

        const score = this.minimax(board, depth - 1, alpha, beta, false, aiPlayer, humanPlayer);
        board[row][col] = 0;

        maxEval = Math.max(maxEval, score);
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break; // 가지치기
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const col of validCols) {
        const row = this.getLowestEmptyRow(board, col);
        board[row][col] = humanPlayer;

        if (this.isWinningMove(board, row, col, humanPlayer)) {
          board[row][col] = 0;
          return -100000 - depth;
        }

        const score = this.minimax(board, depth - 1, alpha, beta, true, aiPlayer, humanPlayer);
        board[row][col] = 0;

        minEval = Math.min(minEval, score);
        beta = Math.min(beta, score);
        if (beta <= alpha) break; // 가지치기
      }
      return minEval;
    }
  }

  // 보드 전체의 휴리스틱 점수 계산
  evaluateBoard(board, aiPlayer, humanPlayer) {
    let score = 0;

    // 중앙 열 가산점 (중앙에 위치할수록 가로/대각선 형성 가능성이 높음)
    const centerCol = 3;
    let centerCount = 0;
    for (let r = 0; r < this.rows; r++) {
      if (board[r][centerCol] === aiPlayer) centerCount++;
    }
    score += centerCount * 6;

    // 4연속 윈도우 슬라이스 검사
    // 가로 윈도우
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c <= this.cols - 4; c++) {
        const window = [board[r][c], board[r][c+1], board[r][c+2], board[r][c+3]];
        score += this.evaluateWindow(window, aiPlayer, humanPlayer);
      }
    }

    // 세로 윈도우
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r <= this.rows - 4; r++) {
        const window = [board[r][c], board[r+1][c], board[r+2][c], board[r+3][c]];
        score += this.evaluateWindow(window, aiPlayer, humanPlayer);
      }
    }

    // 대각선 \ 윈도우
    for (let r = 0; r <= this.rows - 4; r++) {
      for (let c = 0; c <= this.cols - 4; c++) {
        const window = [board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]];
        score += this.evaluateWindow(window, aiPlayer, humanPlayer);
      }
    }

    // 대각선 / 윈도우
    for (let r = 3; r < this.rows; r++) {
      for (let c = 0; c <= this.cols - 4; c++) {
        const window = [board[r][c], board[r-1][c+1], board[r-2][c+2], board[r-3][c+3]];
        score += this.evaluateWindow(window, aiPlayer, humanPlayer);
      }
    }

    return score;
  }

  // 4개 연속 슬롯 윈도우 평가
  evaluateWindow(window, aiPlayer, humanPlayer) {
    let score = 0;
    const aiCount = window.filter((x) => x === aiPlayer).length;
    const humanCount = window.filter((x) => x === humanPlayer).length;
    const emptyCount = window.filter((x) => x === 0).length;

    if (aiCount === 4) {
      score += 10000;
    } else if (aiCount === 3 && emptyCount === 1) {
      score += 100;
    } else if (aiCount === 2 && emptyCount === 2) {
      score += 10;
    }

    if (humanCount === 3 && emptyCount === 1) {
      score -= 90; // 사람의 3목 강력 억제
    } else if (humanCount === 2 && emptyCount === 2) {
      score -= 8;
    }

    return score;
  }

  // 특정 수가 승리 수인지 판정하는 헬퍼
  isWinningMove(board, r, c, player) {
    const directions = [
      [ [0, 1], [0, -1] ],
      [ [1, 0], [-1, 0] ],
      [ [1, 1], [-1, -1] ],
      [ [1, -1], [-1, 1] ]
    ];

    for (const [dir1, dir2] of directions) {
      let count = 1;
      for (const [dr, dc] of [dir1, dir2]) {
        let nr = r + dr;
        let nc = c + dc;
        while (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && board[nr][nc] === player) {
          count++;
          nr += dr;
          nc += dc;
        }
      }
      if (count >= 4) return true;
    }
    return false;
  }
}
