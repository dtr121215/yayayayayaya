/**
 * BaseGame.js - 모든 보드게임의 기초가 되는 추상 베이스 클래스
 * 
 * 차례(턴) 관리, 수(히스토리) 기록, 무르기(Undo), AI 턴 예약(0.5초 딜레이),
 * 승패/무승부 판정 연동 및 결과 저장 등의 공통 비즈니스 로직을 표준화하여
 * 새로운 게임을 추가할 때 쉽게 확장할 수 있도록 구성되었습니다.
 */

import { sound } from './Sound.js';
import { storage } from './Storage.js';

export class BaseGame {
  /**
   * @param {Object} options
   * @param {string} options.gameId 게임 식별자 ('gomoku', 'tictactoe', 'connect4')
   * @param {HTMLElement} options.container 게임판이 렌더링될 DOM 컨테이너
   * @param {'pvp'|'ai'} options.mode 플레이 모드 ('pvp': 2인 친구랑, 'ai': 1인 컴퓨터랑)
   * @param {Function} options.onTurnChange 턴 변경 콜백
   * @param {Function} options.onGameOver 게임 종료 콜백
   * @param {Function} options.onPendingChange 착수 대기 상태 변경 콜백 (오목 2회 탭 확인용)
   */
  constructor({ gameId, container, mode = 'pvp', onTurnChange, onGameOver, onPendingChange }) {
    this.gameId = gameId;
    this.container = container;
    this.mode = mode; // 'pvp' | 'ai'

    this.onTurnChange = onTurnChange || (() => {});
    this.onGameOver = onGameOver || (() => {});
    this.onPendingChange = onPendingChange || (() => {});

    this.currentPlayer = 1; // 1: 플레이어 1(선공, 흑/X/빨강), 2: 플레이어 2 또는 AI(백/O/노랑)
    this.history = [];      // 착수 기록 스택 [{ r, c, player, ... }]
    this.isGameOver = false;
    this.isAIThinking = false;
    this.winningLine = null; // 승리한 좌표 배열 [{ r, c }]
    this.aiTimer = null;
  }

  // 게임 시작 및 초기화
  init() {
    this.clearAITimer();
    this.currentPlayer = 1;
    this.history = [];
    this.isGameOver = false;
    this.isAIThinking = false;
    this.winningLine = null;

    this.board = this.createEmptyBoard();
    this.renderBoard();
    this.notifyTurn();
  }

  // 다시 시작
  restart() {
    this.init();
    sound.playTap();
  }

  // 현재 차례 알림
  notifyTurn() {
    this.onTurnChange({
      currentPlayer: this.currentPlayer,
      isAIThinking: this.isAIThinking,
      mode: this.mode,
      moveCount: this.history.length,
      canUndo: this.canUndo()
    });
  }

  // 무르기 가능 여부 확인
  canUndo() {
    if (this.isGameOver || this.isAIThinking) return false;
    if (this.history.length === 0) return false;
    if (this.mode === 'ai' && this.history.length < 2 && this.currentPlayer === 2) return false;
    return true;
  }

  // 무르기 (Undo) 실행
  undo() {
    if (!this.canUndo()) return false;

    // 1인 AI 대전 모드: 내 수와 컴퓨터 수를 동시에 2수 되돌림
    if (this.mode === 'ai') {
      if (this.history.length >= 2) {
        const aiMove = this.history.pop();
        this.revertMoveFromBoard(aiMove);

        const playerMove = this.history.pop();
        this.revertMoveFromBoard(playerMove);

        this.currentPlayer = 1; // 플레이어 1(나) 차례로 복귀
      } else if (this.history.length === 1 && this.currentPlayer === 1) {
        const lastMove = this.history.pop();
        this.revertMoveFromBoard(lastMove);
      }
    } else {
      // 2인 친구랑 모드: 1수 되돌림
      const lastMove = this.history.pop();
      this.revertMoveFromBoard(lastMove);
      this.currentPlayer = lastMove.player;
    }

    sound.playUndo();
    sound.vibrate(20);
    this.winningLine = null;
    this.renderBoard();
    this.notifyTurn();
    return true;
  }

  /**
   * 착수 실행 공통 파이프라인
   * @param {Object} move 착수 정보 (예: { r, c })
   */
  makeMove(move) {
    if (this.isGameOver || this.isAIThinking) return false;

    const moveRecord = {
      ...move,
      player: this.currentPlayer,
      moveIndex: this.history.length
    };

    // 1. 보드 상태 갱신
    this.applyMoveToBoard(moveRecord, this.currentPlayer);
    this.history.push(moveRecord);

    // 2. 착수 효과음 및 햅틱
    this.playMoveSound();
    sound.vibrate(25);

    // 3. 승리 판정
    const winResult = this.checkWin(moveRecord);
    if (winResult && winResult.hasWon) {
      this.isGameOver = true;
      this.winningLine = winResult.winningLine;
      this.renderBoard();

      // 승리 효과음 & 전적 기록
      sound.playWin();
      sound.vibrate([40, 60, 100]);
      const updatedStats = storage.recordResult(this.gameId, this.mode, this.currentPlayer);

      this.onGameOver({
        winner: this.currentPlayer,
        winningLine: this.winningLine,
        mode: this.mode,
        isDraw: false,
        stats: updatedStats
      });
      this.notifyTurn();
      return true;
    }

    // 4. 무승부 판정
    if (this.checkDraw()) {
      this.isGameOver = true;
      this.winningLine = null;
      this.renderBoard();

      sound.playDraw();
      const updatedStats = storage.recordResult(this.gameId, this.mode, 'draw');

      this.onGameOver({
        winner: 'draw',
        winningLine: null,
        mode: this.mode,
        isDraw: true,
        stats: updatedStats
      });
      this.notifyTurn();
      return true;
    }

    // 5. 턴 교체
    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    this.renderBoard();
    this.notifyTurn();

    // 6. AI 턴 처리: 모드가 'ai'이고 플레이어 2(컴퓨터) 차례인 경우 약 0.5초 후 착수
    if (this.mode === 'ai' && this.currentPlayer === 2 && !this.isGameOver) {
      this.scheduleAIMove();
    }

    return true;
  }

  // AI 수 계산 및 0.5초 지연 착수
  scheduleAIMove() {
    this.isAIThinking = true;
    this.notifyTurn();

    this.clearAITimer();
    this.aiTimer = setTimeout(() => {
      if (this.isGameOver) return;

      const aiMove = this.getAIMove();
      this.isAIThinking = false;

      if (aiMove) {
        this.makeMove(aiMove);
      }
    }, 500); // 0.5초 딜레이로 자연스러운 사람 같은 느낌 제공
  }

  clearAITimer() {
    if (this.aiTimer) {
      clearTimeout(this.aiTimer);
      this.aiTimer = null;
    }
  }

  // 정리 (화면 이탈 시 타이머 및 리스너 해제)
  destroy() {
    this.clearAITimer();
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  // 하위 클래스에서 구현해야 할 메서드들 (인터페이스 명세)
  createEmptyBoard() { throw new Error('createEmptyBoard() must be implemented'); }
  renderBoard() { throw new Error('renderBoard() must be implemented'); }
  applyMoveToBoard(move, player) { throw new Error('applyMoveToBoard() must be implemented'); }
  revertMoveFromBoard(move) { throw new Error('revertMoveFromBoard() must be implemented'); }
  checkWin(lastMove) { throw new Error('checkWin() must be implemented'); }
  checkDraw() { throw new Error('checkDraw() must be implemented'); }
  getAIMove() { throw new Error('getAIMove() must be implemented'); }
  playMoveSound() { sound.playStone(); }
}
