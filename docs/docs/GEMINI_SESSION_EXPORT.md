# Vertex 세션 요약

원본 세션 URL:

- https://vertexaisearch.cloud.google.com/us/home/cid/3e4d8c6f-195d-4274-9c98-7614c0da721d/r/project/235796851965096852/session/6721204399386290499?pli=1

## 핵심 기획 메모

- 장르 포지셔닝: 무료형 데일리 멀티 퍼즐 허브
- 초기 MVP: Password, Hashtag, Anygram, Sudoku
- 메타 루프: 스트릭, 캘린더 아카이브, XP, 미션, 배지
- BM: 보상형 광고 + VIP + 저금통 + 코인 번들
- 마이그레이션 전략: HTML5에서 코어 검증 후 Godot/Unity 이전

## 기술 방향

- React + TypeScript + Vite
- Headless Core 패턴
- 서비스 레이어를 통한 광고/결제/저장소 추상화
- 일일 퍼즐 팩 JSON 중심 설계

## 주의

- Vertex 세션 내 일부 코드 블록은 UI상 잘리거나 일부만 노출되어 있어, 저장소에는 그 의도를 유지한 보완 구현이 포함되어 있다.
- 이 저장소는 “이어받아 개발 가능한 상태”를 목표로 정리되었다.

