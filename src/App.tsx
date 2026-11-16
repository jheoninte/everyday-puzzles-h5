import { useMemo, useState } from 'react';
import { BadgeManager } from './core/meta/BadgeManager';
import { MissionEngine, PuzzlePlayEvent } from './core/meta/MissionEngine';
import { BadgeState, DailyMissionState } from './core/types/MissionAndBadgeTypes';
import { PasswordView } from './ui/games/PasswordView';
import { MobileFrame } from './ui/layouts/MobileFrame';
import { MissionsAndBadgesModal } from './ui/screens/MissionsAndBadgesModal';
import { TopAppBar } from './ui/components/TopAppBar';

export function App() {
  const today = '2026-11-16';
  const [showModal, setShowModal] = useState(false);
  const [streak] = useState(1);
  const [solvedCount, setSolvedCount] = useState(0);
  const [missionState, setMissionState] = useState<DailyMissionState>(() => MissionEngine.generateDailyMissions(today));
  const [badgeState, setBadgeState] = useState<BadgeState>(() => BadgeManager.createInitialState());

  const sampleEvent = useMemo<PuzzlePlayEvent>(() => ({ gameId: 'password', puzzleDate: today, todayDate: today, mistakeCount: 0, hintsUsed: 0, elapsedSeconds: 42 }), []);

  const handleSolved = () => {
    setSolvedCount((prev) => prev + 1);
    const missionEval = MissionEngine.evaluateOnPuzzleClear(missionState, sampleEvent);
    setMissionState(missionEval.state);
    const badgeEval = BadgeManager.evaluateBadges(badgeState, sampleEvent, streak, solvedCount + 1 >= 4);
    setBadgeState(badgeEval.state);
  };

  return (
    <MobileFrame>
      <TopAppBar title="Everyday Puzzles" subtitle="Vertex 세션 기반 HTML5 프로토타입 스타터" />
      <main className="space-y-4 pb-8">
        <section className="px-4 pt-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="text-sm font-bold text-slate-300">현재 포함된 구현</div>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              <li>- Password 코어 엔진 / 키보드 / 미션 / 배지 기초</li>
              <li>- Headless Core 중심 구조</li>
              <li>- 다른 에이전트가 이어서 개발할 수 있는 명세서 정리</li>
            </ul>
            <button className="mt-4 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-black text-white" onClick={() => setShowModal(true)} type="button">미션 & 배지 보기</button>
          </div>
        </section>

        <section>
          <PasswordView onSolved={handleSolved} />
        </section>
      </main>

      {showModal ? (
        <MissionsAndBadgesModal
          badgeState={badgeState}
          missionState={missionState}
          onClaimBonusChest={() => {
            const result = MissionEngine.claimBonusChest(missionState);
            if (result.success) setMissionState(result.state);
          }}
          onClaimMission={(missionId) => {
            const result = MissionEngine.claimMissionReward(missionState, missionId);
            if (result.success) setMissionState(result.state);
          }}
          onClose={() => setShowModal(false)}
        />
      ) : null}
    </MobileFrame>
  );
}

