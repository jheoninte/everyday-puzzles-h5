import { useState } from 'react';
import { BADGE_CATALOG } from '../../core/meta/BadgeManager';
import { BadgeState, DailyMissionState } from '../../core/types/MissionAndBadgeTypes';

interface MissionsAndBadgesModalProps {
  missionState: DailyMissionState;
  badgeState: BadgeState;
  onClaimMission: (missionId: string) => void;
  onClaimBonusChest: () => void;
  onClose: () => void;
}

export function MissionsAndBadgesModal({ missionState, badgeState, onClaimMission, onClaimBonusChest, onClose }: MissionsAndBadgesModalProps) {
  const [activeTab, setActiveTab] = useState<'MISSIONS' | 'BADGES'>('MISSIONS');
  const claimedCount = missionState.missions.filter((mission) => mission.isClaimed).length;
  const totalMissions = missionState.missions.length;
  const canOpenBonusChest = claimedCount === totalMissions && !missionState.isBonusChestClaimed;
  const unlockedBadgeCount = Object.keys(badgeState.unlocked).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col gap-4 rounded-3xl border border-slate-700 bg-slate-900 p-5 text-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex gap-2">
            <button className={
ounded-xl px-3.5 py-1.5 text-xs font-black } onClick={() => setActiveTab('MISSIONS')} type="button">🎯 일일 미션 ({claimedCount}/{totalMissions})</button>
            <button className={
ounded-xl px-3.5 py-1.5 text-xs font-black } onClick={() => setActiveTab('BADGES')} type="button">🏅 배지 ({unlockedBadgeCount}/{BADGE_CATALOG.length})</button>
          </div>
          <button className="h-8 w-8 rounded-full bg-slate-800" onClick={onClose} type="button">✕</button>
        </header>

        {activeTab === 'MISSIONS' ? (
          <div className="flex flex-col gap-3 overflow-y-auto pr-1">
            <div className="flex items-center justify-between rounded-2xl border border-amber-500/40 bg-gradient-to-r from-indigo-950 via-slate-900 to-amber-950/60 p-4">
              <div>
                <div className="text-sm font-black text-amber-300">일일 미션 올클리어 상자</div>
                <div className="mt-1 text-[11px] text-slate-300">3개 미션 모두 완료 시 +50 XP / +50 🪙</div>
              </div>
              <button className={
ounded-xl px-3 py-2 text-xs font-black } disabled={!canOpenBonusChest} onClick={onClaimBonusChest} type="button">{missionState.isBonusChestClaimed ? '수령 완료' : canOpenBonusChest ? '상자 열기!' : ${claimedCount}/}</button>
            </div>

            {missionState.missions.map((mission) => {
              const isCompleted = mission.currentCount >= mission.targetCount;
              const progressPct = Math.min(100, Math.round((mission.currentCount / mission.targetCount) * 100));
              return (
                <div key={mission.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-extrabold">{mission.title}</h4>
                      <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-amber-300">+{mission.rewardXp} XP · +{mission.rewardCoins} 🪙</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-300">{mission.description}</p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-950"><div className="h-full bg-emerald-500" style={{ width: ${progressPct}% }} /></div>
                      <span className="text-[11px] font-bold text-slate-400">{mission.currentCount}/{mission.targetCount}</span>
                    </div>
                  </div>
                  <button className={
ounded-xl px-3.5 py-2.5 text-xs font-black } disabled={!isCompleted || mission.isClaimed} onClick={() => onClaimMission(mission.id)} type="button">{mission.isClaimed ? '✓ 완료' : isCompleted ? '보상 받기!' : '진행 중'}</button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 overflow-y-auto pr-1">
            {BADGE_CATALOG.map((badge) => {
              const unlockRecord = badgeState.unlocked[badge.id];
              const isUnlocked = Boolean(unlockRecord);
              return (
                <div key={badge.id} className={lex flex-col items-center rounded-2xl border p-3.5 text-center }>
                  <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/80 text-3xl">{isUnlocked || !badge.isSecret ? badge.icon : '❓'}</div>
                  <span className="mb-1 rounded bg-slate-800 px-2 py-0.5 text-[9px] font-black uppercase text-amber-300">{badge.tier}</span>
                  <h4 className="text-xs font-extrabold text-white">{isUnlocked || !badge.isSecret ? badge.title : '히든 배지'}</h4>
                  <p className="mt-1 text-[11px] leading-snug text-slate-400">{isUnlocked || !badge.isSecret ? badge.description : '특별한 조건을 달성하면 잠금이 해제됩니다.'}</p>
                  {isUnlocked ? <span className="mt-2 text-[10px] font-semibold text-emerald-400">✓ {unlockRecord.unlockedAtDate}</span> : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

