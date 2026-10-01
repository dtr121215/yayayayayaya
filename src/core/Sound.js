/**
 * Sound.js - Web Audio API 기반 오디오 합성 모듈
 * 외부 오디오 파일 없이 브라우저 내장 Web Audio API를 활용하여
 * 바둑돌 착수음, 사목 토큰 낙하음, 승리 팡파레 등을 실시간 합성합니다.
 */

class SoundSystem {
  constructor() {
    this.ctx = null;
    // 사운드 활성화 여부 (localStorage에서 불러오기, 기본값: true)
    this.enabled = localStorage.getItem('boardgames_sound_enabled') !== 'false';
  }

  // 브라우저 자동 재생 정책에 맞춰 유저 인터랙션 시 오디오 컨텍스트 초기화
  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // 음소거 토글
  toggleSound() {
    this.enabled = !this.enabled;
    localStorage.setItem('boardgames_sound_enabled', String(this.enabled));
    if (this.enabled) {
      this.playTap();
    }
    return this.enabled;
  }

  isEnabled() {
    return this.enabled;
  }

  // 가벼운 버튼 탭 효과음
  playTap() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // 오목 돌 놓는 소리 (단단한 바둑판 위에 바둑돌이 "딱!" 부딪히는 소리 합성)
  playStone() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // 1. 고주파 충격파 (임팩트 클릭)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.08);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);

      // 2. 나무 바둑판의 깊은 울림음 (공명)
      const woodOsc = this.ctx.createOscillator();
      const woodGain = this.ctx.createGain();
      woodOsc.type = 'triangle';
      woodOsc.frequency.setValueAtTime(280, now);
      woodOsc.frequency.exponentialRampToValueAtTime(120, now + 0.12);

      woodGain.gain.setValueAtTime(0.3, now);
      woodGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      woodOsc.connect(woodGain);
      woodGain.connect(this.ctx.destination);
      woodOsc.start(now);
      woodOsc.stop(now + 0.12);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // 틱택토 말 놓는 나무 블록 소리 ("톡!")
  playWoodBlock() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.09);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // 사목(Connect 4) 디스크가 슬롯에 떨어져 닿는 소리 ("또르륵 톡!")
  playTokenDrop() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // 떨어지는 휘슬러 톤 + 착지 톤
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.setValueAtTime(520, now + 0.06);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.15);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // 무르기(Undo) 효과음
  playUndo() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(550, now + 0.12);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // 승리 축하 팡파레 멜로디 (도-미-솔-도 아르페지오)
  playWin() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      const baseNow = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        const noteStart = baseNow + idx * 0.11;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.25, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + 0.35);
      });
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // 무승부 사운드
  playDraw() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const notes = [440, 392]; // A4, G4
      const baseNow = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        const noteStart = baseNow + idx * 0.14;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.2, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + 0.3);
      });
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // 햅틱 진동 피드백 (모바일 기기 진동 API 지원 시)
  vibrate(ms = 30) {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch (e) {
        // 무시
      }
    }
  }
}

export const sound = new SoundSystem();
