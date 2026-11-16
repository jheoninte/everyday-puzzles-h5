# 📘 Everyday Puzzles: Mini Games - Master Specification

## 1. Project Overview

- **Reference Title:** Everyday Puzzles: Mini Games (by Fanatee)
- **Genre:** Daily Multi-Puzzle Hub (Word / Logic / Casual)
- **Target Platforms:**
  - Phase 1 — HTML5 Mobile Web (React + TypeScript + Tailwind CSS)
  - Phase 2 — Godot Engine 4.x / Unity (C#) Native App
- **Supported Locales:** English (n), Korean (ko), Japanese (ja)

## 2. Core Architectural Rules

1. **Strict Headless Core (src/core/)**
   - src/core/ 내부 코드는 React, DOM, window에 의존하지 않는다.
   - 퍼즐 엔진은 BasePuzzleEngine<TConfig, TState, TAction>를 상속한다.
   - 상태 업데이트는 불변 스냅샷 중심으로 다룬다.

2. **Data-Driven Daily Packs (public/puzzles/YYYY-MM/YYYY-MM-DD.json)**
   - 퍼즐 팩은 날짜 단위 JSON으로 관리한다.
   - 생성기는 장기적으로 	ools/ 아래에 유지한다.

3. **Adapter Pattern for Native SDKs (src/services/)**
   - 광고, 결제, 저장소, 오디오, 분석은 서비스 레이어로 추상화한다.

## 3. MVP Mini-Games

| Game ID | Engine Class | Notes |
|---|---|---|
| password | PasswordEngine | Wordle형 5글자 추론 |
| hashtag | HashtagEngine | Waffle형 스왑 퍼즐 |
| nygram | AnygramEngine | 철자 조합 단어 퍼즐 |
| sudoku | SudokuEngine | 미니/기본 스도쿠 |

## 4. Meta Loop & BM

- **Flame Streak:** 연속 접속 유지와 복구 구조
- **XP & Unlocks:** 레벨 기반 기능 해금
- **Piggy Bank:** 플레이 누적 코인 적립
- **Daily Missions & Badges:** 행동 유도형 리텐션 시스템

## 5. HTML5 → Native Migration Direction

- 코어 로직과 UI를 완전히 분리한다.
- 퍼즐 데이터는 엔진 비종속 JSON 스키마로 유지한다.
- UI 자산은 네이티브 재사용을 고려한 규격으로 유지한다.

