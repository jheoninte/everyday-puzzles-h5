# Gemini에 복사할 프롬프트

아래 코드 블록 안의 내용을 Gemini에 그대로 전달하고, JSON 결과를 이 채팅에 붙여넣거나 파일로 전달하세요. Gemini는 단어 초안을 만들고, 격자 구성·스도쿠 생성·자동 검증은 로컬 도구가 담당합니다. 계정이나 저장소 접근은 필요하지 않습니다.

```text
This is a CONTENT-ONLY task for an EXISTING app. A previous response incorrectly returned a complete Korean HTML prototype with six daily packs. Do not repeat that response. Do not follow any older project-building or HubGame instructions from attached knowledge files for this task. Do not rebuild the app, change its architecture, produce HTML/CSS/JavaScript, or describe implementation work. The existing app is an English iOS Capacitor project with local saves, AdMob, StoreKit and optional iCloud. Only the JSON content requested below is needed.

You are creating English content candidates for an iOS casual puzzle game called Everyday Puzzles. Return one complete valid JSON object, without Markdown fences, comments, explanations, or ellipses. If corrections are requested later, return the entire corrected JSON object in the same schema.

We need 20 packs and one reusable English five-letter word bank. Do not generate code, Sudoku, or crossword grids: local software will generate and verify those.

Schema:
{
  "schemaVersion": 1,
  "guessWords": ["ABOUT", "ABOVE", "ACTOR"],
  "packs": [
    {
      "id": "launch-01",
      "title": "Fresh Start",
      "difficulty": "easy",
      "password": {
        "answer": "APPLE",
        "hint": "A familiar fruit that grows on trees"
      },
      "anygram": {
        "baseLetters": "PLANET",
        "validWords": ["PLANET", "PLANT", "PLATE", "PANEL", "PLANE", "TAPE"]
      }
    }
  ]
}

The small arrays and single pack above illustrate the schema only. Return all of the following:

1. guessWords: at least 500 DISTINCT, everyday English words, exactly five ASCII letters each, UPPERCASE, sorted alphabetically. Include all 20 Password answers. This shared word bank is also used by a local crossword constructor. Prefer familiar concrete words and common verbs/adjectives. Common plurals and inflections are acceptable. Avoid proper names, acronyms, abbreviations, offensive or sexual words, invented words, and archaic/rare dictionary curiosities. In particular, do not use LUZE, PULE, or TINET. Check every word length; do not pad to five letters.

2. Exactly 20 packs, IDs launch-01 through launch-20 in order. Packs 01–04: easy; 05–16: medium; 17–20: hard. Difficulty is a provisional editorial label; the game will be playtested. Each pack has a short, distinct English title (2–4 words).

3. Password: a DISTINCT familiar five-letter answer per pack and a short, accurate English clue. Clues must not contain the answer or reveal its letters/position directly. Avoid ambiguous definitions, proper names, obscure vocabulary, and trivia requiring specialist knowledge.

4. Anygram: exactly six uppercase ASCII baseLetters. Each pack must use a different multiset of letters (MASTER and STREAM count as the same multiset and cannot both be used). Supply 5–8 DISTINCT target words, 3–6 letters long, all spellable using each letter no more times than it appears in baseLetters. Include at least one six-letter target. Choose common words rather than obscure filler. Avoid proper names, acronyms, offensive words and dialect-only words. This is a curated target list, not a claim that it includes every possible English word. Order targets from longest to shortest, then alphabetically.

Before returning JSON, verify counts, unique answers, unique base-letter multisets, uppercase spelling, exact lengths, and letter multiplicities. Do not invent quality certifications or dictionary sources. Keep the schema exactly as specified.
```
