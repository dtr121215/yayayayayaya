/**
 * App.js - 미니 보드게임 웹사이트 메인 UI 컨트롤러
 * 
 * 홈 화면(게임 카드 목록, 전적, 공유, PWA 설치)과
 * 게임 플레이 화면(게임판, 차례 표시, 무르기, 다시하기, 결과 모달) 간의
 * 상태 전환 및 유저 인터랙션을 관리합니다.
 */

import { sound } from '../core/Sound.js';
import { storage } from '../core/Storage.js';
import { Gomoku } from '../games/Gomoku.js';
import { TicTacToe } from '../games/TicTacToe.js';
import { ConnectFour } from '../games/ConnectFour.js';

// 게임 메타데이터 정의
const GAME_DEFS = {
  gomoku: {
    id: 'gomoku',
    title: '오목',
    subtitle: '15×15 전통 바둑판 오목',
    badge: '15×15 격자',
    desc: '가로, 세로, 대각선으로 5개의 돌을 먼저 이으면 승리합니다. (쌍삼 금수 제외)',
    image: '/images/boardgame_omok_preview_1790816941752.jpg',
    playerNames: {
      pvp: { p1: '흑돌 (선공)', p2: '백돌 (후공)' },
      ai: { p1: '나 (흑돌)', p2: '컴퓨터 (백돌)' }
    },
    Class: Gomoku
  },
  tictactoe: {
    id: 'tictactoe',
    title: '틱택토',
    subtitle: '3×3 클래식 틱택토',
    badge: '3×3 격자 · 미니맥스',
    desc: '3개의 말을 먼저 한 줄로 만드는 클래식 두뇌 게임입니다.',
    image: '/images/boardgame_tictactoe_preview_1790816952974.jpg',
    playerNames: {
      pvp: { p1: 'O (선공)', p2: 'X (후공)' },
      ai: { p1: '나 (O)', p2: '컴퓨터 (X)' }
    },
    Class: TicTacToe
  },
  connect4: {
    id: 'connect4',
    title: '사목 (Connect 4)',
    subtitle: '7열 6행 중력 낙하 사목',
    badge: '7열 6행 · 낙하 물리',
    desc: '열을 탭하여 토큰을 떨어뜨리고, 4개를 먼저 연속으로 연결하면 승리합니다.',
    image: '/images/boardgame_connectfour_preview_1790816963833.jpg',
    playerNames: {
      pvp: { p1: '빨강 (선공)', p2: '노랑 (후공)' },
      ai: { p1: '나 (빨강)', p2: '컴퓨터 (노랑)' }
    },
    Class: ConnectFour
  }
};

export class MiniBoardGamesApp {
  constructor() {
    this.root = document.getElementById('root');
    this.currentView = 'home'; // 'home' | 'game'
    this.activeGame = null;
    this.currentGameId = null;
    this.currentMode = 'pvp'; // 'pvp' | 'ai'
    this.pendingInfo = null; // 오목 2회 탭 확인용 상태

    // PWA 인스톨 프롬프트 이벤트 저장
    this.deferredInstallPrompt = null;
    this.isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());

    this.initPWA();
    this.render();
  }

  // PWA 서비스 워커 등록 및 설치 이벤트 리스너
  initPWA() {
    // 1. 서비스 워커 등록 (실패해도 웹사이트 정상 동작 보장)
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => console.log('SW registered successfully:', reg.scope))
          .catch((err) => console.warn('SW registration skipped or failed:', err));
      });
    }

    // 2. 홈 화면 추가(PWA BeforeInstallPrompt) 이벤트 감지
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      this.updateInstallButtonVisibility();
    });
  }

  // 전체 화면 렌더링
  render() {
    if (!this.root) return;
    this.root.innerHTML = '';

    if (this.currentView === 'home') {
      this.renderHomeView();
    } else {
      this.renderGameView();
    }
  }

  // 홈 화면 렌더링
  renderHomeView() {
    const isMuted = !sound.isEnabled();

    const homeEl = document.createElement('div');
    homeEl.className = 'min-h-screen bg-stone-900 text-stone-100 flex flex-col max-w-lg mx-auto pb-12';

    // 1. 상단 헤더 (앱 타이틀, 사운드 토글, 공유, 설치)
    homeEl.innerHTML = `
      <header class="sticky top-0 z-30 bg-stone-900/90 backdrop-blur-md border-b border-stone-800 px-4 py-3.5 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-md">
            <span class="text-xl">🎲</span>
          </div>
          <div>
            <h1 class="text-base font-bold text-stone-100 leading-tight">미니 보드게임</h1>
            <p class="text-[11px] text-stone-400">설치 없이 바로 즐기는 2인 & AI 대전</p>
          </div>
        </div>

        <div class="flex items-center gap-1.5">
          <!-- 음소거 토글 버튼 -->
          <button id="btn-sound-toggle" class="min-w-[40px] min-h-[40px] rounded-lg bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-300 flex items-center justify-center transition-colors" title="${isMuted ? '소리 켜기' : '소리 끄기'}">
            ${isMuted ? '🔇' : '🔊'}
          </button>

          <!-- 공유하기 버튼 -->
          <button id="btn-share" class="min-w-[40px] min-h-[40px] rounded-lg bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-300 flex items-center justify-center transition-colors" title="친구에게 사이트 공유">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>

          <!-- 홈 화면에 추가 (PWA) 버튼 -->
          <button id="btn-install-pwa" class="min-w-[40px] min-h-[40px] rounded-lg bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 active:scale-95 flex items-center justify-center transition-colors font-medium text-xs px-2 gap-1" title="홈 화면에 추가">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span class="hidden sm:inline">앱 추가</span>
          </button>
        </div>
      </header>

      <!-- 본문 게임 카드 목록 -->
      <main class="flex-1 px-4 py-4 space-y-4">
        <div id="game-cards-container" class="space-y-4"></div>
      </main>

      <!-- 하단 안내 문구 -->
      <footer class="px-4 py-6 text-center text-xs text-stone-500 border-t border-stone-800/60 mt-4 space-y-1">
        <p>친구와 폰 하나로 번갈아 두거나, 스마트한 AI와 혼자 대결해보세요.</p>
        <p class="text-[11px] text-stone-600">오프라인에서도 접속 가능 · 데이터는 브라우저에 안전하게 보관됩니다.</p>
      </footer>
    `;

    this.root.appendChild(homeEl);

    // 이벤트 리스너 연결
    homeEl.querySelector('#btn-sound-toggle').addEventListener('click', () => {
      sound.toggleSound();
      this.render();
    });

    homeEl.querySelector('#btn-share').addEventListener('click', () => {
      this.handleShare();
    });

    homeEl.querySelector('#btn-install-pwa').addEventListener('click', () => {
      this.handleInstallPWA();
    });

    // 게임 카드들 렌더링
    const cardsContainer = homeEl.querySelector('#game-cards-container');
    Object.values(GAME_DEFS).forEach((def) => {
      const card = this.createGameCard(def);
      cardsContainer.appendChild(card);
    });
  }

  // 게임 카드 요소 생성
  createGameCard(gameDef) {
    const card = document.createElement('div');
    card.className = 'bg-stone-800/90 rounded-2xl border border-stone-700/80 overflow-hidden shadow-lg flex flex-col transition-transform';

    // 전적 데이터 불러오기
    const stats = storage.getGameStats(gameDef.id);
    const pvpRecord = `${stats.pvp.win1}승 ${stats.pvp.win2}패 ${stats.pvp.draw}무`;
    const aiRecord = `${stats.ai.win}승 ${stats.ai.loss}패 ${stats.ai.draw}무`;

    card.innerHTML = `
      <!-- 카드 썸네일 이미지 및 뱃지 -->
      <div class="relative h-44 w-full bg-stone-950 overflow-hidden">
        <img src="${gameDef.image}" alt="${gameDef.title}" class="w-full h-full object-cover object-center" />
        <div class="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/30 to-transparent"></div>
        <div class="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div>
            <span class="text-[11px] font-semibold tracking-wider text-amber-400 uppercase bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm">${gameDef.badge}</span>
            <h2 class="text-xl font-bold text-white mt-1 drop-shadow-md">${gameDef.title}</h2>
          </div>
        </div>
      </div>

      <!-- 설명 및 전적 요약 -->
      <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
        <p class="text-xs text-stone-300 leading-relaxed">${gameDef.desc}</p>

        <!-- 전적 표시 영역 -->
        <div class="bg-stone-900/80 rounded-xl p-2.5 border border-stone-800 text-[11px] grid grid-cols-2 gap-2 text-stone-400">
          <div>
            <span class="text-stone-500 block mb-0.5">👥 친구랑</span>
            <span class="font-semibold text-stone-200 tabular-nums">${pvpRecord}</span>
          </div>
          <div>
            <span class="text-stone-500 block mb-0.5">🤖 컴퓨터랑</span>
            <span class="font-semibold text-stone-200 tabular-nums">${aiRecord}</span>
          </div>
        </div>

        <!-- 2개의 원탭 시작 버튼: "친구랑" / "컴퓨터랑" -->
        <div class="grid grid-cols-2 gap-2.5 pt-1">
          <!-- 1. 친구랑 버튼 -->
          <button data-action="pvp" class="btn-start-pvp min-h-[44px] rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 active:scale-[0.98] text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md transition-all">
            <span>👥</span>
            <span>친구랑</span>
          </button>

          <!-- 2. 컴퓨터랑 버튼 -->
          <button data-action="ai" class="btn-start-ai min-h-[44px] rounded-xl bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-500 hover:to-orange-600 active:scale-[0.98] text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md transition-all">
            <span>🤖</span>
            <span>컴퓨터랑</span>
          </button>
        </div>
      </div>
    `;

    // 원탭 시작 이벤트 리스너 바인딩
    card.querySelector('.btn-start-pvp').addEventListener('click', () => {
      this.startGame(gameDef.id, 'pvp');
    });

    card.querySelector('.btn-start-ai').addEventListener('click', () => {
      this.startGame(gameDef.id, 'ai');
    });

    return card;
  }

  // 게임 시작 (홈 -> 게임 화면 전환)
  startGame(gameId, mode) {
    this.currentGameId = gameId;
    this.currentMode = mode;
    this.currentView = 'game';
    this.pendingInfo = null;

    sound.playTap();
    this.render();
  }

  // 게임 화면 렌더링
  renderGameView() {
    const gameDef = GAME_DEFS[this.currentGameId];
    if (!gameDef) {
      this.currentView = 'home';
      this.render();
      return;
    }

    const isMuted = !sound.isEnabled();
    const modeBadge = this.currentMode === 'pvp' ? '친구랑 (2인)' : '컴퓨터랑 (AI)';
    const modeBadgeClass = this.currentMode === 'pvp' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' : 'bg-amber-950/80 text-amber-300 border-amber-800';

    const gameEl = document.createElement('div');
    gameEl.className = 'min-h-screen bg-stone-900 text-stone-100 flex flex-col max-w-lg mx-auto';

    gameEl.innerHTML = `
      <!-- 게임 상단 컴팩트 바 -->
      <header class="sticky top-0 z-30 bg-stone-900/90 backdrop-blur-md border-b border-stone-800 px-3 py-2.5 flex items-center justify-between">
        <button id="btn-back-home" class="min-h-[44px] px-2 text-stone-300 hover:text-white flex items-center gap-1 text-xs sm:text-sm font-medium focus:outline-none">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span>홈으로</span>
        </button>

        <div class="flex items-center gap-2">
          <h2 class="text-sm font-bold text-white">${gameDef.title}</h2>
          <span class="text-[10px] px-2 py-0.5 rounded-full border ${modeBadgeClass} font-medium">${modeBadge}</span>
        </div>

        <button id="btn-sound-game" class="min-w-[40px] min-h-[40px] rounded-lg text-stone-400 hover:text-stone-200 flex items-center justify-center">
          ${isMuted ? '🔇' : '🔊'}
        </button>
      </header>

      <!-- 현재 차례 상태 바 -->
      <section class="px-4 py-2.5 bg-stone-800/60 border-b border-stone-800 flex items-center justify-between">
        <div id="turn-indicator" class="flex items-center gap-2 text-xs sm:text-sm font-medium">
          <!-- JS로 동적 갱신 -->
        </div>

        <div class="text-[11px] text-stone-400" id="move-counter">
          <!-- 수 카운터 -->
        </div>
      </section>

      <!-- 오목 모바일 2회 탭 확인 가이드 띠 (오목일 때만 노출) -->
      <div id="pending-guide-banner" class="hidden px-4 py-2 bg-amber-600/20 border-b border-amber-500/30 text-amber-200 text-xs flex items-center justify-between animate-fade-in">
        <div class="flex items-center gap-1.5 truncate">
          <span class="animate-pulse">👉</span>
          <span id="pending-guide-text" class="truncate font-medium">선택한 위치를 다시 탭하거나 [착수]를 누르세요.</span>
        </div>
        <div class="flex items-center gap-1 shrink-0 ml-2">
          <button id="btn-confirm-pending" class="px-2.5 py-1 rounded bg-amber-500 text-stone-950 font-bold text-xs shadow active:scale-95">착수</button>
          <button id="btn-cancel-pending" class="px-2 py-1 rounded bg-stone-700 text-stone-300 text-xs">취소</button>
        </div>
      </div>

      <!-- 게임판 컨테이너 영역 -->
      <main class="flex-1 flex flex-col items-center justify-center p-3 sm:p-4 overflow-hidden relative">
        <div id="board-mount" class="w-full flex items-center justify-center"></div>
      </main>

      <!-- 하단 조작 컨트롤 바 (무르기, 다시하기, 홈으로) -->
      <footer class="p-3 bg-stone-900 border-t border-stone-800 grid grid-cols-3 gap-2">
        <!-- 무르기 버튼 -->
        <button id="btn-undo" class="min-h-[44px] rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-stone-200 text-xs sm:text-sm font-medium flex items-center justify-center gap-1 transition-all">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a5 5 0 015 5v2m0 0l-4-4m4 4l4-4" />
          </svg>
          <span>무르기</span>
        </button>

        <!-- 다시 하기 버튼 -->
        <button id="btn-restart" class="min-h-[44px] rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 text-xs sm:text-sm font-medium flex items-center justify-center gap-1 transition-all">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>다시 하기</span>
        </button>

        <!-- 홈으로 버튼 -->
        <button id="btn-footer-home" class="min-h-[44px] rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 text-xs sm:text-sm font-medium flex items-center justify-center gap-1 transition-all">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>홈으로</span>
        </button>
      </footer>

      <!-- 결과 팝업 모달 마운트 -->
      <div id="result-modal-mount"></div>
    `;

    this.root.appendChild(gameEl);

    // 이벤트 리스너 연결
    gameEl.querySelector('#btn-back-home').addEventListener('click', () => this.goHome());
    gameEl.querySelector('#btn-footer-home').addEventListener('click', () => this.goHome());
    gameEl.querySelector('#btn-sound-game').addEventListener('click', () => {
      sound.toggleSound();
      this.render();
    });

    gameEl.querySelector('#btn-restart').addEventListener('click', () => {
      if (this.activeGame) {
        this.activeGame.restart();
      }
    });

    const btnUndo = gameEl.querySelector('#btn-undo');
    btnUndo.addEventListener('click', () => {
      if (this.activeGame) {
        this.activeGame.undo();
      }
    });

    // 오목 2단계 탭 확인 버튼
    const btnConfirmPending = gameEl.querySelector('#btn-confirm-pending');
    const btnCancelPending = gameEl.querySelector('#btn-cancel-pending');

    btnConfirmPending.addEventListener('click', () => {
      if (this.activeGame && this.activeGame.confirmPendingMove) {
        this.activeGame.confirmPendingMove();
      }
    });

    btnCancelPending.addEventListener('click', () => {
      if (this.activeGame && this.activeGame.cancelPendingMove) {
        this.activeGame.cancelPendingMove();
      }
    });

    // 게임 인스턴스 생성 및 초기화
    const boardMount = gameEl.querySelector('#board-mount');
    this.activeGame = new gameDef.Class({
      container: boardMount,
      mode: this.currentMode,
      onTurnChange: (turnState) => this.handleTurnChange(turnState),
      onGameOver: (result) => this.handleGameOver(result),
      onPendingChange: (pendingInfo) => this.handlePendingChange(pendingInfo)
    });

    this.activeGame.init();
  }

  // 차례 변경 시 UI 갱신
  handleTurnChange(turnState) {
    const turnIndicator = document.getElementById('turn-indicator');
    const moveCounter = document.getElementById('move-counter');
    const btnUndo = document.getElementById('btn-undo');
    if (!turnIndicator) return;

    if (btnUndo) {
      btnUndo.disabled = !turnState.canUndo;
    }

    if (moveCounter) {
      moveCounter.textContent = `${turnState.moveCount}수 진행 중`;
    }

    const gameDef = GAME_DEFS[this.currentGameId];
    const playerNames = gameDef.playerNames[this.currentMode];

    if (turnState.isAIThinking) {
      turnIndicator.innerHTML = `
        <span class="inline-block w-3 h-3 rounded-full bg-amber-400 animate-ping"></span>
        <span class="text-amber-300 font-semibold animate-pulse">🤖 컴퓨터가 생각 중입니다...</span>
      `;
      return;
    }

    const isP1 = turnState.currentPlayer === 1;
    let pieceIcon = '';

    if (this.currentGameId === 'gomoku') {
      pieceIcon = isP1
        ? '<span class="inline-block w-4 h-4 rounded-full bg-stone-900 border border-stone-600 shadow-sm"></span>'
        : '<span class="inline-block w-4 h-4 rounded-full bg-stone-100 border border-stone-400 shadow-sm"></span>';
    } else if (this.currentGameId === 'tictactoe') {
      pieceIcon = isP1
        ? '<span class="inline-block font-bold text-emerald-400 text-sm">O</span>'
        : '<span class="inline-block font-bold text-rose-400 text-sm">X</span>';
    } else if (this.currentGameId === 'connect4') {
      pieceIcon = isP1
        ? '<span class="inline-block w-4 h-4 rounded-full bg-rose-500 border border-rose-300"></span>'
        : '<span class="inline-block w-4 h-4 rounded-full bg-amber-400 border border-yellow-200"></span>';
    }

    const currentName = isP1 ? playerNames.p1 : playerNames.p2;
    turnIndicator.innerHTML = `
      ${pieceIcon}
      <span class="text-stone-200 font-medium"><strong>${currentName}</strong> 차례</span>
    `;
  }

  // 오목 2회 탭 확인 가이드 표시/숨김
  handlePendingChange(pendingInfo) {
    const banner = document.getElementById('pending-guide-banner');
    if (!banner) return;

    if (pendingInfo) {
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }
  }

  // 게임 종료 시 결과 모달 표시
  handleGameOver(result) {
    const modalMount = document.getElementById('result-modal-mount');
    if (!modalMount) return;

    const gameDef = GAME_DEFS[this.currentGameId];
    const playerNames = gameDef.playerNames[this.currentMode];

    let titleText = '';
    let subText = '';
    let titleColor = '';

    if (result.isDraw) {
      titleText = '🤝 무승부!';
      subText = '더 이상 둘 곳이 없거나 승부를 가리지 못했습니다.';
      titleColor = 'text-amber-300';
    } else if (this.currentMode === 'ai') {
      if (result.winner === 1) {
        titleText = '🎉 승리했습니다!';
        subText = '축하합니다! 컴퓨터를 꺾고 승리하셨습니다.';
        titleColor = 'text-emerald-400';
      } else {
        titleText = '🤖 컴퓨터 승리!';
        subText = '아쉽네요! 다음 판에 다시 도전해보세요.';
        titleColor = 'text-rose-400';
      }
    } else {
      // 2인 대전
      const winnerName = result.winner === 1 ? playerNames.p1 : playerNames.p2;
      titleText = `🎉 ${winnerName} 승리!`;
      subText = `${winnerName}이 승리 조건을 먼저 완성했습니다!`;
      titleColor = 'text-emerald-400';
    }

    // 갱신된 전적 표시
    const stats = storage.getGameStats(this.currentGameId);
    const recordText = this.currentMode === 'ai'
      ? `AI 전적: ${stats.ai.win}승 ${stats.ai.loss}패 ${stats.ai.draw}무`
      : `전적: 1P ${stats.pvp.win1}승 · 2P ${stats.pvp.win2}승 · ${stats.pvp.draw}무`;

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in';
    modal.innerHTML = `
      <div class="w-full max-w-xs bg-stone-900 border border-stone-700/80 rounded-2xl p-5 shadow-2xl text-center space-y-4 animate-scale-in">
        <div>
          <h3 class="text-2xl font-black ${titleColor}">${titleText}</h3>
          <p class="text-xs text-stone-300 mt-1.5">${subText}</p>
        </div>

        <div class="py-2 px-3 bg-stone-950/60 rounded-xl border border-stone-800 text-xs text-stone-400 font-medium">
          ${recordText}
        </div>

        <div class="space-y-2 pt-1">
          <button id="modal-btn-restart" class="w-full min-h-[44px] rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-[0.98] text-stone-950 font-bold text-sm shadow transition-all">
            한 판 더 하기
          </button>
          <div class="grid grid-cols-2 gap-2">
            <button id="modal-btn-view-board" class="min-h-[40px] rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-300 text-xs font-medium">
              보드 확인
            </button>
            <button id="modal-btn-home" class="min-h-[40px] rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-300 text-xs font-medium">
              홈으로
            </button>
          </div>
        </div>
      </div>
    `;

    modalMount.innerHTML = '';
    modalMount.appendChild(modal);

    modal.querySelector('#modal-btn-restart').addEventListener('click', () => {
      modalMount.innerHTML = '';
      if (this.activeGame) this.activeGame.restart();
    });

    modal.querySelector('#modal-btn-view-board').addEventListener('click', () => {
      // 모달만 닫고 완성된 보드를 눈으로 확인할 수 있게 함
      modalMount.innerHTML = '';
    });

    modal.querySelector('#modal-btn-home').addEventListener('click', () => {
      modalMount.innerHTML = '';
      this.goHome();
    });
  }

  // 홈으로 이동
  goHome() {
    if (this.activeGame) {
      this.activeGame.destroy();
      this.activeGame = null;
    }
    this.currentView = 'home';
    sound.playTap();
    this.render();
  }

  // 링크 공유 기능 (Web Share API 및 클립보드 복사 폴백)
  async handleShare() {
    sound.playTap();
    const shareData = {
      title: '미니 보드게임 모음',
      text: '앱 설치 없이 링크 하나로 바로 즐기는 오목, 틱택토, 사목!',
      url: window.location.href
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Share error:', err);
        }
      }
    }

    // 폴백: 클립보드 링크 복사
    try {
      await navigator.clipboard.writeText(window.location.href);
      this.showToast('📋 사이트 링크가 클립보드에 복사되었습니다!');
    } catch (e) {
      // 수동 프롬프트
      prompt('아래 링크를 복사하여 친구에게 공유하세요:', window.location.href);
    }
  }

  // PWA 홈 화면 추가 처리
  async handleInstallPWA() {
    sound.playTap();

    // 1. Chrome / Android / Desktop 지원 시
    if (this.deferredInstallPrompt) {
      this.deferredInstallPrompt.prompt();
      const choice = await this.deferredInstallPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        this.showToast('🎉 앱이 홈 화면에 추가되었습니다!');
      }
      this.deferredInstallPrompt = null;
      return;
    }

    // 2. iOS Safari 안내
    if (this.isIOS) {
      this.showIOSInstallModal();
      return;
    }

    // 3. 이미 설치되었거나 기타 브라우저
    this.showToast('💡 브라우저 메뉴(⋮)에서 "홈 화면에 추가"를 선택하세요.');
  }

  // iOS Safari 홈 화면 추가 안내 모달
  showIOSInstallModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in';
    modal.innerHTML = `
      <div class="w-full max-w-xs bg-stone-900 border border-stone-700 rounded-2xl p-5 shadow-2xl text-center space-y-3">
        <div class="text-3xl">📱</div>
        <h3 class="text-base font-bold text-white">홈 화면에 추가하는 방법</h3>
        <p class="text-xs text-stone-300 leading-relaxed text-left bg-stone-950/70 p-3 rounded-xl border border-stone-800">
          1. 사파리 브라우저 하단의 <strong>공유 버튼(<svg class="inline w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>)</strong>을 누릅니다.<br><br>
          2. 스크롤을 내려 <strong>'홈 화면에 추가'</strong>를 탭하면 앱처럼 전체화면으로 실행할 수 있습니다.
        </p>
        <button id="btn-close-ios-modal" class="w-full min-h-[44px] rounded-xl bg-stone-800 text-stone-200 text-xs font-semibold">
          닫기
        </button>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#btn-close-ios-modal').addEventListener('click', () => {
      modal.remove();
    });
  }

  // 간단한 토스트 알림창
  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-stone-800 text-amber-200 border border-stone-700 px-4 py-2.5 rounded-full text-xs font-medium shadow-2xl flex items-center gap-2 animate-bounce-short';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('opacity-0', 'transition-opacity', 'duration-300');
      setTimeout(() => toast.remove(), 300);
    }, 2400);
  }

  updateInstallButtonVisibility() {
    // 설치 프롬프트 준비 시 시각적 힌트 줄 수 있음
  }
}
