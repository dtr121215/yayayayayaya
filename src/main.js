/**
 * main.js - 미니 보드게임 웹사이트 진입점
 * 프레임워크 없는 순수 ES 모듈 기반으로 MiniBoardGamesApp을 초기화합니다.
 */

import './index.css';
import { MiniBoardGamesApp } from './ui/App.js';

// DOM 상태에 따라 즉시 또는 로드 후 앱 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new MiniBoardGamesApp();
  });
} else {
  new MiniBoardGamesApp();
}
