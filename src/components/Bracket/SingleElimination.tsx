import { useEffect, useMemo, useState } from "react";
import type { Edge, Node } from "@xyflow/react";
import {
  ReactFlow,
  Controls,
  Position,
  Background,
  Handle,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

type Competitor = { id: string; name: string };
type Match = {
  id: string;
  round: number;
  name: string;
  participants: string[];
  prevMatchIds?: (string | null)[];
  date?: string;
  matchType?: string;
  place?: string;
  winner?: string;
};

interface SingleEliminationsProps {
  count: number;
}

// 2. 짝수명 참가자용 일반 싱글 엘리미네이션 트리 생성 함수
// const generateBracketEvent = (participants: Competitor[]): Match[] => {
//   const matches: Match[] = [];
//   let round = 1;
//   let matchId = 1;
//   let prevMatchIds: string[] = [];
//   let currentRoundParticipants = participants.map((p) => p.name);
//   let prevRoundMatchIds: string[] = [];

//   while (currentRoundParticipants.length > 1) {
//     const roundMatches: Match[] = [];
//     for (let i = 0; i < currentRoundParticipants.length; i += 2) {
//       const p1 = currentRoundParticipants[i];
//       const p2 = currentRoundParticipants[i + 1];
//       const id = `R${round}-${i / 2 + 1}`;
//       let match: Match;
//       if (round === 1) {
//         match = {
//           id,
//           round,
//           name: `${round}R-${i / 2 + 1}`,
//           participants: [p1, p2],
//         };
//       } else {
//         match = {
//           id,
//           round,
//           name: `${round}R-${i / 2 + 1}`,
//           participants: [p1, p2],
//           prevMatchIds: [prevRoundMatchIds[i], prevRoundMatchIds[i + 1]],
//         };
//       }
//       roundMatches.push(match);
//       matches.push(match);
//     }
//     prevRoundMatchIds = roundMatches.map((m) => m.id);
//     currentRoundParticipants = roundMatches.map((m) => `${m.name} 승자`);
//     round++;
//   }
//   return matches;
// };

let matchCount = 1;

const createMatchId = (prefix: string) => `${prefix}-${matchCount++}`;

// 이전 라운드에서 부전승한 경기 ID를 추적
const chunkPairsForceMatch = (
  participants: string[],
  mustPlayNext: Set<string>
): [string[][], Set<string>] => {
  const pairs: string[][] = [];
  const nextMustPlay = new Set<string>();

  let temp: string | null = null;
  for (let i = 0; i < participants.length; i++) {
    const p = participants[i];

    if (temp === null) {
      temp = p;
    } else {
      // temp와 현재 참가자를 짝지음
      pairs.push([temp, p]);
      temp = null;
    }
  }

  // temp에 남은 1명이 있는 경우
  if (temp) {
    // 마지막 참가자가 부전승이면 이전 라운드에서 반드시 경기하게 강제
    const solo = temp;
    if (mustPlayNext.size > 0) {
      // 이전 부전승자와 강제 매치
      const opponent = [...mustPlayNext][0];
      pairs.push([solo, opponent]);
      mustPlayNext.delete(opponent);
    } else {
      // 부전승 처리, 다음 라운드에서는 반드시 매치하게 강제
      pairs.push([solo]);
      nextMustPlay.add(solo.replace(" 승자", ""));
    }
  }

  return [pairs, nextMustPlay];
};

export const generateFlexibleBracketForcePlay = (
  participants: Competitor[]
): Match[] => {
  matchCount = 1;
  const rounds: Match[][] = [];
  let roundNum = 1;

  let mustPlayNext = new Set<string>(); // 부전승 추적용

  // 1R
  const initialNames = participants.map((p) => p.name || "");
  const [initialPairs, nextForce] = chunkPairsForceMatch(
    initialNames,
    new Set()
  );
  mustPlayNext = nextForce;

  let prevMatches = initialPairs.map((pair, i) => ({
    id: createMatchId(`${roundNum}R`),
    round: roundNum,
    name: `${roundNum}R-${i + 1}`,
    participants: pair,
  }));
  rounds.push(prevMatches);

  while (true) {
    roundNum++;
    const winners = prevMatches.map((m) => `${m.id} 승자`);
    const [nextPairs, nextForcePlay] = chunkPairsForceMatch(
      winners,
      mustPlayNext
    );

    // 세미파이널 진입 조건
    if (nextPairs.length <= 2 && nextPairs.every((pair) => pair.length === 2)) {
      const semiMatches = nextPairs.map((pair, i) => ({
        id: `S${i + 1}`,
        round: roundNum,
        name: `Semi-${i + 1}`,
        participants: pair,
        prevMatchIds: pair.map((name) => name.replace(" 승자", "")),
      }));
      rounds.push(semiMatches);

      const final: Match = {
        id: "F",
        round: roundNum + 1,
        name: "Final",
        participants: ["S1 승자", "S2 승자"],
        prevMatchIds: ["S1", "S2"],
      };
      rounds.push([final]);
      break;
    }

    const currMatches = nextPairs.map((pair, i) => ({
      id: createMatchId(`${roundNum}R`),
      round: roundNum,
      name: `${roundNum}R-${i + 1}`,
      participants: pair,
      prevMatchIds: pair.map((p) => p.replace(" 승자", "")),
    }));

    rounds.push(currMatches);
    prevMatches = currMatches;
    mustPlayNext = nextForcePlay;
  }

  return rounds.flat();
};

const generateBalancedBracket1 = (competitors: Competitor[]): Match[] => {
  const matches: Match[] = [];
  const matchIdGen = (() => {
    let counter = 1;
    return () => `M-${counter++}`;
  })();

  const createMatch = (
    round: number,
    participants: string[],
    prevMatchIds: string[] = []
  ): Match => ({
    id: matchIdGen(),
    round,
    name: `Round ${round}`,
    participants,
    ...(prevMatchIds.length > 0 ? { prevMatchIds } : {}),
  });

  const r1: Match[] = [];
  for (let i = 0; i < competitors.length; i += 2) {
    const p1 = competitors[i]?.name || "";
    const p2 = competitors[i + 1]?.name || "";
    r1.push(createMatch(1, [p1, p2]));
  }
  matches.push(...r1);

  if (competitors.length < 3) return matches;

  let round = 2;
  let prevMatches = r1;
  let carryOver: { winner: string; from: string }[] = [];

  while (true) {
    const winners = prevMatches.map((m) => ({
      winner: `${m.id} 승자`,
      from: m.id,
    }));

    // carryOver (부전승으로 자동 진출했던 참가자) 추가
    if (carryOver.length > 0) {
      winners.push(...carryOver);
      carryOver = [];
    }

    if (winners.length <= 4) {
      const semiMatches: Match[] = [];
      const finalInputs: string[] = [];

      if (winners.length === 3) {
        const semi = createMatch(
          round,
          [winners[0].winner, winners[1].winner],
          [winners[0].from, winners[1].from]
        );
        matches.push(semi);
        const final = createMatch(
          round + 1,
          [winners[2].winner, `${semi.id} 승자`],
          [winners[2].from, semi.id]
        );
        matches.push(final);
        break;
      } else {
        for (let i = 0; i < winners.length; i += 2) {
          const p1 = winners[i];
          const p2 = winners[i + 1];
          const semi = createMatch(
            round,
            [p1.winner, p2.winner],
            [p1.from, p2.from]
          );
          semiMatches.push(semi);
          finalInputs.push(`${semi.id} 승자`);
        }

        matches.push(...semiMatches);

        const final = createMatch(
          round + 1,
          finalInputs,
          semiMatches.map((m) => m.id)
        );
        matches.push(final);
        break;
      }
    }

    const nextMatches: Match[] = [];
    const nextPrevMatches: Match[] = [];

    for (let i = 0; i < winners.length; i += 2) {
      if (!winners[i + 1]) {
        // 부전승: 한 명 남았는데 상대 없음 → carryOver에 저장
        carryOver.push(winners[i]);
        continue;
      }

      const p1 = winners[i];
      const p2 = winners[i + 1];
      const match = createMatch(
        round,
        [p1.winner, p2.winner],
        [p1.from, p2.from]
      );
      nextMatches.push(match);
      nextPrevMatches.push(match);
    }

    matches.push(...nextMatches);
    prevMatches = nextPrevMatches;
    round++;
  }

  return matches;
};

// 6명 기준 특수 구조(3-1-1) 대진표 생성 함수
const generateSpecialBracket6 = (participants: Competitor[]): Match[] => {
  // 1R
  const r1 = [
    {
      id: "1R-1",
      round: 1,
      name: "1R-1",
      participants: [participants[0].name || "", participants[1].name || ""],
    },
    {
      id: "1R-2",
      round: 1,
      name: "1R-2",
      participants: [participants[2].name || "", participants[3].name || ""],
    },
    {
      id: "1R-3",
      round: 1,
      name: "1R-3",
      participants: participants[5]
        ? [participants[4].name || "", participants[5].name || ""]
        : [participants[4].name || ""],
    },
  ];
  // Semi
  const semi = [
    {
      id: "S1",
      round: 3,
      name: "Semi-1",
      participants: ["1R-1 승자", "1R-2 승자"],
      prevMatchIds: ["1R-1", "1R-2"],
    },
  ];
  // Final
  const final = [
    {
      id: "F",
      round: 4,
      name: "Final",
      participants: ["S1 승자", "1R-3 승자"],
      prevMatchIds: ["S1", "1R-3"],
    },
  ];
  return [...r1, ...semi, ...final];
};

const generateSpecialBracket10 = (participants: Competitor[]): Match[] => {
  // 1R
  const r1 = [
    {
      id: "1R-1",
      round: 1,
      name: "1R-1",
      participants: [participants[0].name || "", participants[1].name || ""],
    },
    {
      id: "1R-2",
      round: 1,
      name: "1R-2",
      participants: [participants[2].name || "", participants[3].name || ""],
    },
    {
      id: "1R-3",
      round: 1,
      name: "1R-3",
      participants: [participants[4].name || "", participants[5].name || ""],
    },
    {
      id: "1R-4",
      round: 1,
      name: "1R-4",
      participants: [participants[6].name || "", participants[7].name || ""],
    },
    {
      id: "1R-5",
      round: 1,
      name: "1R-5",
      participants: participants[9]
        ? [participants[8].name || "", participants[9].name || ""]
        : [participants[8].name || ""],
    },
  ];
  // 2R
  const r2 = [
    {
      id: "2R-1",
      round: 2,
      name: "2R-1",
      participants: ["1R-2 승자", "1R-3 승자"],
      prevMatchIds: ["1R-2", "1R-3"],
    },
  ];
  // Semi
  const semi = [
    {
      id: "S1",
      round: 3,
      name: "Semi-1",
      participants: ["1R-1 승자", "2R-1 승자"],
      prevMatchIds: ["1R-1", "2R-1"],
    },
    {
      id: "S2",
      round: 3,
      name: "Semi-2",
      participants: ["1R-4 승자", "1R-5 승자"],
      prevMatchIds: ["1R-4", "1R-5"],
    },
  ];
  // Final
  const final = [
    {
      id: "F",
      round: 4,
      name: "Final",
      participants: ["S1 승자", "S2 승자"],
      prevMatchIds: ["S1", "S2"],
    },
  ];
  return [...r1, ...r2, ...semi, ...final];
};

const generateSpecialBracket12 = (participants: Competitor[]): Match[] => {
  // 1R
  const r1 = [
    {
      id: "1R-1",
      round: 1,
      name: "1R-1",
      participants: [participants[0].name || "", participants[1].name || ""],
    },
    {
      id: "1R-2",
      round: 1,
      name: "1R-2",
      participants: [participants[2].name || "", participants[3].name || ""],
    },
    {
      id: "1R-3",
      round: 1,
      name: "1R-3",
      participants: [participants[4].name || "", participants[5].name || ""],
    },
    {
      id: "1R-4",
      round: 1,
      name: "1R-4",
      participants: [participants[6].name || "", participants[7].name || ""],
    },
    {
      id: "1R-5",
      round: 1,
      name: "1R-5",
      participants: [participants[8].name || "", participants[9].name || ""],
    },
    {
      id: "1R-6",
      round: 1,
      name: "1R-6",
      participants: participants[11]
        ? [participants[10].name || "", participants[11].name || ""]
        : [participants[10].name || ""],
    },
  ];
  // 2R
  const r2 = [
    {
      id: "2R-1",
      round: 2,
      name: "2R-1",
      participants: ["1R-3 승자", "1R-4 승자"],
      prevMatchIds: ["1R-3", "1R-4"],
    },
    {
      id: "2R-2",
      round: 2,
      name: "2R-2",
      participants: ["1R-5 승자", "1R-6 승자"],
      prevMatchIds: ["1R-5", "1R-6"],
    },
  ];
  // Semi
  const semi = [
    {
      id: "S1",
      round: 3,
      name: "Semi-1",
      participants: ["1R-1 승자", "1R-2 승자"],
      prevMatchIds: ["1R-1", "1R-2"],
    },
    {
      id: "S2",
      round: 3,
      name: "Semi-2",
      participants: ["2R-1 승자", "2R-2 승자"],
      prevMatchIds: ["2R-1", "2R-2"],
    },
  ];
  // Final
  const final = [
    {
      id: "F",
      round: 4,
      name: "Final",
      participants: ["S1 승자", "S2 승자"],
      prevMatchIds: ["S1", "S2"],
    },
  ];
  return [...r1, ...r2, ...semi, ...final];
};

const generateSpecialBracket14 = (participants: Competitor[]): Match[] => {
  // 1R
  const r1 = [
    {
      id: "1R-1",
      round: 1,
      name: "1R-1",
      participants: [participants[0].name || "", participants[1].name || ""],
    },
    {
      id: "1R-2",
      round: 1,
      name: "1R-2",
      participants: [participants[2].name || "", participants[3].name || ""],
    },
    {
      id: "1R-3",
      round: 1,
      name: "1R-3",
      participants: [participants[4].name || "", participants[5].name || ""],
    },
    {
      id: "1R-4",
      round: 1,
      name: "1R-4",
      participants: [participants[6].name || "", participants[7].name || ""],
    },
    {
      id: "1R-5",
      round: 1,
      name: "1R-5",
      participants: [participants[8].name || "", participants[9].name || ""],
    },
    {
      id: "1R-6",
      round: 1,
      name: "1R-6",
      participants: [participants[10].name || "", participants[11].name || ""],
    },
    {
      id: "1R-7",
      round: 1,
      name: "1R-7",
      participants: participants[13]
        ? [participants[12].name || "", participants[13].name || ""]
        : [participants[12].name || ""],
    },
  ];
  // 2R
  const r2 = [
    {
      id: "2R-1",
      round: 2,
      name: "2R-1",
      participants: ["1R-2 승자", "1R-3 승자"],
      prevMatchIds: ["1R-2", "1R-3"],
    },
    {
      id: "2R-2",
      round: 2,
      name: "2R-2",
      participants: ["1R-4 승자", "1R-5 승자"],
      prevMatchIds: ["1R-4", "1R-5"],
    },
    {
      id: "2R-3",
      round: 2,
      name: "2R-3",
      participants: ["1R-6 승자", "1R-7 승자"],
      prevMatchIds: ["1R-6", "1R-7"],
    },
  ];
  // Semi
  const semi = [
    {
      id: "S1",
      round: 3,
      name: "Semi-1",
      participants: ["1R-1 승자", "2R-1 승자"],
      prevMatchIds: ["1R-1", "2R-1"],
    },
    {
      id: "S2",
      round: 3,
      name: "Semi-2",
      participants: ["2R-2 승자", "2R-3 승자"],
      prevMatchIds: ["2R-2", "2R-3"],
    },
  ];
  // Final
  const final = [
    {
      id: "F",
      round: 4,
      name: "Final",
      participants: ["S1 승자", "S2 승자"],
      prevMatchIds: ["S1", "S2"],
    },
  ];
  return [...r1, ...r2, ...semi, ...final];
};

const generateSpecialBracket18 = (participants: Competitor[]): Match[] => {
  // 1R
  const r1 = [
    {
      id: "1R-1",
      round: 1,
      name: "1R-1",
      participants: [participants[0].name || "", participants[1].name || ""],
    },
    {
      id: "1R-2",
      round: 1,
      name: "1R-2",
      participants: [participants[2].name || "", participants[3].name || ""],
    },
    {
      id: "1R-3",
      round: 1,
      name: "1R-3",
      participants: [participants[4].name || "", participants[5].name || ""],
    },
    {
      id: "1R-4",
      round: 1,
      name: "1R-4",
      participants: [participants[6].name || "", participants[7].name || ""],
    },
    {
      id: "1R-5",
      round: 1,
      name: "1R-5",
      participants: [participants[8].name || "", participants[9].name || ""],
    },
    {
      id: "1R-6",
      round: 1,
      name: "1R-6",
      participants: [participants[10].name || "", participants[11].name || ""],
    },
    {
      id: "1R-7",
      round: 1,
      name: "1R-7",
      participants: [participants[12].name || "", participants[13].name || ""],
    },
    {
      id: "1R-8",
      round: 1,
      name: "1R-8",
      participants: participants[15]
        ? [participants[14].name || "", participants[15].name || ""]
        : [participants[14].name || ""],
    },
    {
      id: "1R-9",
      round: 1,
      name: "1R-9",
      participants: participants[17]
        ? [participants[16].name || "", participants[17].name || ""]
        : [participants[16].name || ""],
    },
  ];
  // 2R
  const r2 = [
    {
      id: "2R-1",
      round: 2,
      name: "2R-1",
      participants: ["1R-2 승자", "1R-3 승자"],
      prevMatchIds: ["1R-2", "1R-3"],
    },
    {
      id: "2R-2",
      round: 2,
      name: "2R-2",
      participants: ["1R-4 승자", "1R-5 승자"],
      prevMatchIds: ["1R-4", "1R-5"],
    },
    {
      id: "2R-3",
      round: 2,
      name: "2R-3",
      participants: ["1R-6 승자", "1R-7 승자"],
      prevMatchIds: ["1R-6", "1R-7"],
    },
    {
      id: "2R-4",
      round: 2,
      name: "2R-4",
      participants: ["1R-8 승자", "1R-9 승자"],
      prevMatchIds: ["1R-8", "1R-9"],
    },
  ];
  // 3R
  const r3 = [
    {
      id: "3R-1",
      round: 3,
      name: "3R-1",
      participants: ["1R-1 승자", "2R-1 승자"],
      prevMatchIds: ["1R-1", "2R-1"],
    },
  ];

  // Semi
  const semi = [
    {
      id: "S1",
      round: 4,
      name: "Semi-1",
      participants: ["2R-2 승자", "3R-1 승자"],
      prevMatchIds: ["2R-2", "3R-1"],
    },
    {
      id: "S2",
      round: 4,
      name: "Semi-2",
      participants: ["2R-3 승자", "2R-4 승자"],
      prevMatchIds: ["2R-3", "2R-4"],
    },
  ];
  // Final
  const final = [
    {
      id: "F",
      round: 5,
      name: "Final",
      participants: ["S1 승자", "S2 승자"],
      prevMatchIds: ["S1", "S2"],
    },
  ];
  return [...r1, ...r2, ...r3, ...semi, ...final];
};

const generateSpecialBracket20 = (participants: Competitor[]): Match[] => {
  // 1R
  const r1 = [
    {
      id: "1R-1",
      round: 1,
      name: "1R-1",
      participants: [participants[0].name || "", participants[1].name || ""],
    },
    {
      id: "1R-2",
      round: 1,
      name: "1R-2",
      participants: [participants[2].name || "", participants[3].name || ""],
    },
    {
      id: "1R-3",
      round: 1,
      name: "1R-3",
      participants: [participants[4].name || "", participants[5].name || ""],
    },
    {
      id: "1R-4",
      round: 1,
      name: "1R-4",
      participants: [participants[6].name || "", participants[7].name || ""],
    },
    {
      id: "1R-5",
      round: 1,
      name: "1R-5",
      participants: [participants[8].name || "", participants[9].name || ""],
    },
    {
      id: "1R-6",
      round: 1,
      name: "1R-6",
      participants: [participants[10].name || "", participants[11].name || ""],
    },
    {
      id: "1R-7",
      round: 1,
      name: "1R-7",
      participants: [participants[12].name || "", participants[13].name || ""],
    },
    {
      id: "1R-8",
      round: 1,
      name: "1R-8",
      participants: participants[15]
        ? [participants[14].name || "", participants[15].name || ""]
        : [participants[14].name || ""],
    },
    {
      id: "1R-9",
      round: 1,
      name: "1R-9",
      participants: [participants[16].name || "", participants[17].name || ""],
    },
    {
      id: "1R-10",
      round: 1,
      name: "1R-10",
      participants: participants[19]
        ? [participants[18].name || "", participants[19].name || ""]
        : [participants[18].name || ""],
    },
  ];
  // 2R
  const r2 = [
    {
      id: "2R-1",
      round: 2,
      name: "2R-1",
      participants: ["1R-1 승자", "1R-2 승자"],
      prevMatchIds: ["1R-1", "1R-2"],
    },
    {
      id: "2R-2",
      round: 2,
      name: "2R-2",
      participants: ["1R-3 승자", "1R-4 승자"],
      prevMatchIds: ["1R-3", "1R-4"],
    },
    {
      id: "2R-3",
      round: 2,
      name: "2R-3",
      participants: ["1R-5 승자", "1R-6 승자"],
      prevMatchIds: ["1R-5", "1R-6"],
    },
    {
      id: "2R-4",
      round: 2,
      name: "2R-4",
      participants: ["1R-7 승자", "1R-8 승자"],
      prevMatchIds: ["1R-7", "1R-8"],
    },
    {
      id: "2R-5",
      round: 2,
      name: "2R-5",
      participants: ["1R-9 승자", "1R-10 승자"],
      prevMatchIds: ["1R-9", "1R-10"],
    },
  ];
  // 3R
  const r3 = [
    {
      id: "3R-1",
      round: 3,
      name: "3R-1",
      participants: ["2R-1 승자", "2R-2 승자"],
      prevMatchIds: ["2R-1", "2R-2"],
    },
  ];

  // Semi
  const semi = [
    {
      id: "S1",
      round: 4,
      name: "Semi-1",
      participants: ["2R-3 승자", "3R-1 승자"],
      prevMatchIds: ["2R-3", "3R-1"],
    },
    {
      id: "S2",
      round: 4,
      name: "Semi-2",
      participants: ["2R-4 승자", "2R-5 승자"],
      prevMatchIds: ["2R-4", "2R-5"],
    },
  ];
  // Final
  const final = [
    {
      id: "F",
      round: 5,
      name: "Final",
      participants: ["S1 승자", "S2 승자"],
      prevMatchIds: ["S1", "S2"],
    },
  ];
  return [...r1, ...r2, ...r3, ...semi, ...final];
};

const generateSpecialBracket22 = (participants: Competitor[]): Match[] => {
  // 1R
  const r1 = [
    {
      id: "1R-1",
      round: 1,
      name: "1R-1",
      participants: [participants[0].name || "", participants[1].name || ""],
    },
    {
      id: "1R-2",
      round: 1,
      name: "1R-2",
      participants: [participants[2].name || "", participants[3].name || ""],
    },
    {
      id: "1R-3",
      round: 1,
      name: "1R-3",
      participants: [participants[4].name || "", participants[5].name || ""],
    },
    {
      id: "1R-4",
      round: 1,
      name: "1R-4",
      participants: [participants[6].name || "", participants[7].name || ""],
    },
    {
      id: "1R-5",
      round: 1,
      name: "1R-5",
      participants: [participants[8].name || "", participants[9].name || ""],
    },
    {
      id: "1R-6",
      round: 1,
      name: "1R-6",
      participants: [participants[10].name || "", participants[11].name || ""],
    },
    {
      id: "1R-7",
      round: 1,
      name: "1R-7",
      participants: [participants[12].name || "", participants[13].name || ""],
    },
    {
      id: "1R-8",
      round: 1,
      name: "1R-8",
      participants: participants[15]
        ? [participants[14].name || "", participants[15].name || ""]
        : [participants[14].name || ""],
    },
    {
      id: "1R-9",
      round: 1,
      name: "1R-9",
      participants: [participants[16].name || "", participants[17].name || ""],
    },
    {
      id: "1R-10",
      round: 1,
      name: "1R-10",
      participants: [participants[18].name || "", participants[19].name || ""],
    },
    {
      id: "1R-11",
      round: 1,
      name: "1R-11",
      participants: participants[21]
        ? [participants[20].name || "", participants[21].name || ""]
        : [participants[20].name || ""],
    },
  ];
  // 2R
  const r2 = [
    {
      id: "2R-1",
      round: 2,
      name: "2R-1",
      participants: ["1R-2 승자", "1R-3 승자"],
      prevMatchIds: ["1R-2", "1R-3"],
    },
    {
      id: "2R-2",
      round: 2,
      name: "2R-2",
      participants: ["1R-4 승자", "1R-5 승자"],
      prevMatchIds: ["1R-4", "1R-5"],
    },
    {
      id: "2R-3",
      round: 2,
      name: "2R-3",
      participants: ["1R-6 승자", "1R-7 승자"],
      prevMatchIds: ["1R-6", "1R-7"],
    },
    {
      id: "2R-4",
      round: 2,
      name: "2R-4",
      participants: ["1R-8 승자", "1R-9 승자"],
      prevMatchIds: ["1R-8", "1R-9"],
    },
    {
      id: "2R-5",
      round: 2,
      name: "2R-5",
      participants: ["1R-10 승자", "1R-11 승자"],
      prevMatchIds: ["1R-10", "1R-11"],
    },
  ];
  // 3R
  const r3 = [
    {
      id: "3R-1",
      round: 3,
      name: "3R-1",
      participants: ["1R-1 승자", "2R-1 승자"],
      prevMatchIds: ["1R-1", "2R-1"],
    },
    {
      id: "3R-2",
      round: 3,
      name: "3R-2",
      participants: ["2R-2 승자", "2R-3 승자"],
      prevMatchIds: ["2R-2", "2R-3"],
    },
  ];

  // Semi
  const semi = [
    {
      id: "S1",
      round: 4,
      name: "Semi-1",
      participants: ["3R-1 승자", "3R-2 승자"],
      prevMatchIds: ["3R-1", "3R-2"],
    },
    {
      id: "S2",
      round: 4,
      name: "Semi-2",
      participants: ["2R-4 승자", "2R-5 승자"],
      prevMatchIds: ["2R-4", "2R-5"],
    },
  ];
  // Final
  const final = [
    {
      id: "F",
      round: 5,
      name: "Final",
      participants: ["S1 승자", "S2 승자"],
      prevMatchIds: ["S1", "S2"],
    },
  ];
  return [...r1, ...r2, ...r3, ...semi, ...final];
};

const generateSpecialBracket24 = (participants: Competitor[]): Match[] => {
  // 1R
  const r1 = [
    {
      id: "1R-1",
      round: 1,
      name: "1R-1",
      participants: [participants[0].name || "", participants[1].name || ""],
    },
    {
      id: "1R-2",
      round: 1,
      name: "1R-2",
      participants: [participants[2].name || "", participants[3].name || ""],
    },
    {
      id: "1R-3",
      round: 1,
      name: "1R-3",
      participants: [participants[4].name || "", participants[5].name || ""],
    },
    {
      id: "1R-4",
      round: 1,
      name: "1R-4",
      participants: [participants[6].name || "", participants[7].name || ""],
    },
    {
      id: "1R-5",
      round: 1,
      name: "1R-5",
      participants: [participants[8].name || "", participants[9].name || ""],
    },
    {
      id: "1R-6",
      round: 1,
      name: "1R-6",
      participants: [participants[10].name || "", participants[11].name || ""],
    },
    {
      id: "1R-7",
      round: 1,
      name: "1R-7",
      participants: [participants[12].name || "", participants[13].name || ""],
    },
    {
      id: "1R-8",
      round: 1,
      name: "1R-8",
      participants: participants[15]
        ? [participants[14].name || "", participants[15].name || ""]
        : [participants[14].name || ""],
    },
    {
      id: "1R-9",
      round: 1,
      name: "1R-9",
      participants: [participants[16].name || "", participants[17].name || ""],
    },
    {
      id: "1R-10",
      round: 1,
      name: "1R-10",
      participants: [participants[18].name || "", participants[19].name || ""],
    },
    {
      id: "1R-11",
      round: 1,
      name: "1R-11",
      participants: [participants[20].name || "", participants[21].name || ""],
    },
    {
      id: "1R-12",
      round: 1,
      name: "1R-12",
      participants: participants[23]
        ? [participants[22].name || "", participants[23].name || ""]
        : [participants[22].name || ""],
    },
  ];
  // 2R
  const r2 = [
    {
      id: "2R-1",
      round: 2,
      name: "2R-1",
      participants: ["1R-1 승자", "1R-2 승자"],
      prevMatchIds: ["1R-1", "1R-2"],
    },
    {
      id: "2R-2",
      round: 2,
      name: "2R-2",
      participants: ["1R-3 승자", "1R-4 승자"],
      prevMatchIds: ["1R-3", "1R-4"],
    },
    {
      id: "2R-3",
      round: 2,
      name: "2R-3",
      participants: ["1R-5 승자", "1R-6 승자"],
      prevMatchIds: ["1R-5", "1R-6"],
    },
    {
      id: "2R-4",
      round: 2,
      name: "2R-4",
      participants: ["1R-7 승자", "1R-8 승자"],
      prevMatchIds: ["1R-7", "1R-8"],
    },
    {
      id: "2R-5",
      round: 2,
      name: "2R-5",
      participants: ["1R-9 승자", "1R-10 승자"],
      prevMatchIds: ["1R-9", "1R-10"],
    },
    {
      id: "2R-6",
      round: 2,
      name: "2R-6",
      participants: ["1R-11 승자", "1R-12 승자"],
      prevMatchIds: ["1R-11", "1R-12"],
    },
  ];
  // 3R
  const r3 = [
    {
      id: "3R-1",
      round: 3,
      name: "3R-1",
      participants: ["2R-3 승자", "2R-4 승자"],
      prevMatchIds: ["2R-3", "2R-4"],
    },
    {
      id: "3R-2",
      round: 3,
      name: "3R-2",
      participants: ["2R-5 승자", "2R-6 승자"],
      prevMatchIds: ["2R-5", "2R-6"],
    },
  ];

  // Semi
  const semi = [
    {
      id: "S1",
      round: 4,
      name: "Semi-1",
      participants: ["2R-1 승자", "2R-2 승자"],
      prevMatchIds: ["2R-1", "2R-2"],
    },
    {
      id: "S2",
      round: 4,
      name: "Semi-2",
      participants: ["3R-1 승자", "3R-2 승자"],
      prevMatchIds: ["3R-1", "3R-2"],
    },
  ];
  // Final
  const final = [
    {
      id: "F",
      round: 5,
      name: "Final",
      participants: ["S1 승자", "S2 승자"],
      prevMatchIds: ["S1", "S2"],
    },
  ];
  return [...r1, ...r2, ...r3, ...semi, ...final];
};

const generateSpecialBracket34 = (participants: Competitor[]): Match[] => {
  // 1R
  const r1 = [
    {
      id: "1R-1",
      round: 1,
      name: "1R-1",
      participants: [participants[0].name || "", participants[1].name || ""],
    },
    {
      id: "1R-2",
      round: 1,
      name: "1R-2",
      participants: [participants[2].name || "", participants[3].name || ""],
    },
    {
      id: "1R-3",
      round: 1,
      name: "1R-3",
      participants: [participants[4].name || "", participants[5].name || ""],
    },
    {
      id: "1R-4",
      round: 1,
      name: "1R-4",
      participants: [participants[6].name || "", participants[7].name || ""],
    },
    {
      id: "1R-5",
      round: 1,
      name: "1R-5",
      participants: [participants[8].name || "", participants[9].name || ""],
    },
    {
      id: "1R-6",
      round: 1,
      name: "1R-6",
      participants: [participants[10].name || "", participants[11].name || ""],
    },
    {
      id: "1R-7",
      round: 1,
      name: "1R-7",
      participants: [participants[12].name || "", participants[13].name || ""],
    },
    {
      id: "1R-8",
      round: 1,
      name: "1R-8",
      participants: participants[15]
        ? [participants[14].name || "", participants[15].name || ""]
        : [participants[14].name || ""],
    },
    {
      id: "1R-9",
      round: 1,
      name: "1R-9",
      participants: [participants[16].name || "", participants[17].name || ""],
    },
    {
      id: "1R-10",
      round: 1,
      name: "1R-10",
      participants: [participants[18].name || "", participants[19].name || ""],
    },
    {
      id: "1R-11",
      round: 1,
      name: "1R-11",
      participants: [participants[20].name || "", participants[21].name || ""],
    },
    {
      id: "1R-12",
      round: 1,
      name: "1R-12",
      participants: participants[23]
        ? [participants[22].name || "", participants[23].name || ""]
        : [participants[22].name || ""],
    },
    {
      id: "1R-13",
      round: 1,
      name: "1R-13",
      participants: [participants[24].name || "", participants[25].name || ""],
    },
    {
      id: "1R-14",
      round: 1,
      name: "1R-14",
      participants: [participants[26].name || "", participants[27].name || ""],
    },
    {
      id: "1R-15",
      round: 1,
      name: "1R-15",
      participants: [participants[28].name || "", participants[29].name || ""],
    },
    {
      id: "1R-16",
      round: 1,
      name: "1R-16",
      participants: [participants[30].name || "", participants[31].name || ""],
    },
    {
      id: "1R-17",
      round: 1,
      name: "1R-17",
      participants: participants[33]
        ? [participants[32].name || "", participants[33].name || ""]
        : [participants[32].name || ""],
    },
  ];
  // 2R
  const r2 = [
    {
      id: "2R-1",
      round: 2,
      name: "2R-1",
      participants: ["1R-2 승자", "1R-3 승자"],
      prevMatchIds: ["1R-2", "1R-3"],
    },
    {
      id: "2R-2",
      round: 2,
      name: "2R-2",
      participants: ["1R-4 승자", "1R-5 승자"],
      prevMatchIds: ["1R-4", "1R-5"],
    },
    {
      id: "2R-3",
      round: 2,
      name: "2R-3",
      participants: ["1R-6 승자", "1R-7 승자"],
      prevMatchIds: ["1R-6", "1R-7"],
    },
    {
      id: "2R-4",
      round: 2,
      name: "2R-4",
      participants: ["1R-8 승자", "1R-9 승자"],
      prevMatchIds: ["1R-8", "1R-9"],
    },
    {
      id: "2R-5",
      round: 2,
      name: "2R-5",
      participants: ["1R-10 승자", "1R-11 승자"],
      prevMatchIds: ["1R-10", "1R-11"],
    },
    {
      id: "2R-6",
      round: 2,
      name: "2R-6",
      participants: ["1R-12 승자", "1R-13 승자"],
      prevMatchIds: ["1R-12", "1R-13"],
    },
    {
      id: "2R-7",
      round: 2,
      name: "2R-7",
      participants: ["1R-14 승자", "1R-15 승자"],
      prevMatchIds: ["1R-14", "1R-15"],
    },
    {
      id: "2R-8",
      round: 2,
      name: "2R-8",
      participants: ["1R-16 승자", "1R-17 승자"],
      prevMatchIds: ["1R-16", "1R-17"],
    },
  ];
  // 3R
  const r3 = [
    {
      id: "3R-1",
      round: 3,
      name: "3R-1",
      participants: ["1R-1 승자", "2R-1 승자"],
      prevMatchIds: ["1R-1", "2R-1"],
    },
    {
      id: "3R-2",
      round: 3,
      name: "3R-2",
      participants: ["2R-3 승자", "2R-4 승자"],
      prevMatchIds: ["2R-3", "2R-4"],
    },
    {
      id: "3R-3",
      round: 3,
      name: "3R-3",
      participants: ["2R-5 승자", "2R-6 승자"],
      prevMatchIds: ["2R-5", "2R-6"],
    },
    {
      id: "3R-4",
      round: 3,
      name: "3R-4",
      participants: ["2R-7 승자", "2R-8 승자"],
      prevMatchIds: ["2R-7", "2R-8"],
    },
  ];

  // 4R
  const r4 = [
    {
      id: "4R-1",
      round: 4,
      name: "4R-1",
      participants: ["2R-2 승자", "3R-1 승자"],
      prevMatchIds: ["2R-2", "3R-1"],
    },
  ];

  // Semi
  const semi = [
    {
      id: "S1",
      round: 5,
      name: "Semi-1",
      participants: ["3R-2 승자", "4R-1 승자"],
      prevMatchIds: ["3R-2", "4R-1"],
    },
    {
      id: "S2",
      round: 5,
      name: "Semi-2",
      participants: ["3R-3 승자", "3R-4 승자"],
      prevMatchIds: ["3R-3", "3R-4"],
    },
  ];
  // Final
  const final = [
    {
      id: "F",
      round: 6,
      name: "Final",
      participants: ["S1 승자", "S2 승자"],
      prevMatchIds: ["S1", "S2"],
    },
  ];
  return [...r1, ...r2, ...r3, ...r4, ...semi, ...final];
};

const generateSpecialBracket36 = (participants: Competitor[]): Match[] => {
  // 1R
  const r1 = [
    {
      id: "1R-1",
      round: 1,
      name: "1R-1",
      participants: [participants[0].name || "", participants[1].name || ""],
    },
    {
      id: "1R-2",
      round: 1,
      name: "1R-2",
      participants: [participants[2].name || "", participants[3].name || ""],
    },
    {
      id: "1R-3",
      round: 1,
      name: "1R-3",
      participants: [participants[4].name || "", participants[5].name || ""],
    },
    {
      id: "1R-4",
      round: 1,
      name: "1R-4",
      participants: [participants[6].name || "", participants[7].name || ""],
    },
    {
      id: "1R-5",
      round: 1,
      name: "1R-5",
      participants: [participants[8].name || "", participants[9].name || ""],
    },
    {
      id: "1R-6",
      round: 1,
      name: "1R-6",
      participants: [participants[10].name || "", participants[11].name || ""],
    },
    {
      id: "1R-7",
      round: 1,
      name: "1R-7",
      participants: [participants[12].name || "", participants[13].name || ""],
    },
    {
      id: "1R-8",
      round: 1,
      name: "1R-8",
      participants: [participants[14].name || "", participants[15].name || ""],
    },
    {
      id: "1R-9",
      round: 1,
      name: "1R-9",
      participants: [participants[16].name || "", participants[17].name || ""],
    },
    {
      id: "1R-10",
      round: 1,
      name: "1R-10",
      participants: [participants[18].name || "", participants[19].name || ""],
    },
    {
      id: "1R-11",
      round: 1,
      name: "1R-11",
      participants: [participants[20].name || "", participants[21].name || ""],
    },
    {
      id: "1R-12",
      round: 1,
      name: "1R-12",
      participants: [participants[22].name || "", participants[23].name || ""],
    },
    {
      id: "1R-13",
      round: 1,
      name: "1R-13",
      participants: [participants[24].name || "", participants[25].name || ""],
    },
    {
      id: "1R-14",
      round: 1,
      name: "1R-14",
      participants: [participants[26].name || "", participants[27].name || ""],
    },
    {
      id: "1R-15",
      round: 1,
      name: "1R-15",
      participants: [participants[28].name || "", participants[29].name || ""],
    },
    {
      id: "1R-16",
      round: 1,
      name: "1R-16",
      participants: [participants[30].name || "", participants[31].name || ""],
    },
    {
      id: "1R-17",
      round: 1,
      name: "1R-17",
      participants: [participants[32].name || "", participants[33].name || ""],
    },
    {
      id: "1R-18",
      round: 1,
      name: "1R-18",
      participants: participants[35]
        ? [participants[34].name || "", participants[35].name || ""]
        : [participants[34].name || ""],
    },
  ];
  // 2R
  const r2 = [
    {
      id: "2R-1",
      round: 2,
      name: "2R-1",
      participants: ["1R-1 승자", "1R-2 승자"],
      prevMatchIds: ["1R-1", "1R-2"],
    },
    {
      id: "2R-2",
      round: 2,
      name: "2R-2",
      participants: ["1R-3 승자", "1R-4 승자"],
      prevMatchIds: ["1R-3", "1R-4"],
    },
    {
      id: "2R-3",
      round: 2,
      name: "2R-3",
      participants: ["1R-5 승자", "1R-6 승자"],
      prevMatchIds: ["1R-5", "1R-6"],
    },
    {
      id: "2R-4",
      round: 2,
      name: "2R-4",
      participants: ["1R-7 승자", "1R-8 승자"],
      prevMatchIds: ["1R-7", "1R-8"],
    },
    {
      id: "2R-5",
      round: 2,
      name: "2R-5",
      participants: ["1R-9 승자", "1R-10 승자"],
      prevMatchIds: ["1R-9", "1R-10"],
    },
    {
      id: "2R-6",
      round: 2,
      name: "2R-6",
      participants: ["1R-11 승자", "1R-12 승자"],
      prevMatchIds: ["1R-11", "1R-12"],
    },
    {
      id: "2R-7",
      round: 2,
      name: "2R-7",
      participants: ["1R-13 승자", "1R-14 승자"],
      prevMatchIds: ["1R-13", "1R-14"],
    },
    {
      id: "2R-8",
      round: 2,
      name: "2R-8",
      participants: ["1R-15 승자", "1R-16 승자"],
      prevMatchIds: ["1R-15", "1R-16"],
    },
    {
      id: "2R-9",
      round: 2,
      name: "2R-9",
      participants: ["1R-17 승자", "1R-18 승자"],
      prevMatchIds: ["1R-17", "1R-18"],
    },
  ];
  // 3R
  const r3 = [
    {
      id: "3R-1",
      round: 3,
      name: "3R-1",
      participants: ["2R-2 승자", "2R-3 승자"],
      prevMatchIds: ["2R-2", "2R-3"],
    },
    {
      id: "3R-2",
      round: 3,
      name: "3R-2",
      participants: ["2R-4 승자", "2R-5 승자"],
      prevMatchIds: ["2R-4", "2R-5"],
    },
    {
      id: "3R-3",
      round: 3,
      name: "3R-3",
      participants: ["2R-6 승자", "2R-7 승자"],
      prevMatchIds: ["2R-6", "2R-7"],
    },
    {
      id: "3R-4",
      round: 3,
      name: "3R-4",
      participants: ["2R-8 승자", "2R-9 승자"],
      prevMatchIds: ["2R-8", "2R-9"],
    },
  ];

  // 4R
  const r4 = [
    {
      id: "4R-1",
      round: 4,
      name: "4R-1",
      participants: ["2R-1 승자", "3R-1 승자"],
      prevMatchIds: ["2R-1", "3R-1"],
    },
  ];

  // Semi
  const semi = [
    {
      id: "S1",
      round: 5,
      name: "Semi-1",
      participants: ["3R-2 승자", "4R-1 승자"],
      prevMatchIds: ["3R-2", "4R-1"],
    },
    {
      id: "S2",
      round: 5,
      name: "Semi-2",
      participants: ["3R-3 승자", "3R-4 승자"],
      prevMatchIds: ["3R-3", "3R-4"],
    },
  ];
  // Final
  const final = [
    {
      id: "F",
      round: 6,
      name: "Final",
      participants: ["S1 승자", "S2 승자"],
      prevMatchIds: ["S1", "S2"],
    },
  ];
  return [...r1, ...r2, ...r3, ...r4, ...semi, ...final];
};

const generateSpecialBracket38 = (participants: Competitor[]): Match[] => {
  // 1R
  const r1 = [
    {
      id: "1R-1",
      round: 1,
      name: "1R-1",
      participants: [participants[0].name || "", participants[1].name || ""],
    },
    {
      id: "1R-2",
      round: 1,
      name: "1R-2",
      participants: [participants[2].name || "", participants[3].name || ""],
    },
    {
      id: "1R-3",
      round: 1,
      name: "1R-3",
      participants: [participants[4].name || "", participants[5].name || ""],
    },
    {
      id: "1R-4",
      round: 1,
      name: "1R-4",
      participants: [participants[6].name || "", participants[7].name || ""],
    },
    {
      id: "1R-5",
      round: 1,
      name: "1R-5",
      participants: [participants[8].name || "", participants[9].name || ""],
    },
    {
      id: "1R-6",
      round: 1,
      name: "1R-6",
      participants: [participants[10].name || "", participants[11].name || ""],
    },
    {
      id: "1R-7",
      round: 1,
      name: "1R-7",
      participants: [participants[12].name || "", participants[13].name || ""],
    },
    {
      id: "1R-8",
      round: 1,
      name: "1R-8",
      participants: [participants[14].name || "", participants[15].name || ""],
    },
    {
      id: "1R-9",
      round: 1,
      name: "1R-9",
      participants: [participants[16].name || "", participants[17].name || ""],
    },
    {
      id: "1R-10",
      round: 1,
      name: "1R-10",
      participants: [participants[18].name || "", participants[19].name || ""],
    },
    {
      id: "1R-11",
      round: 1,
      name: "1R-11",
      participants: [participants[20].name || "", participants[21].name || ""],
    },
    {
      id: "1R-12",
      round: 1,
      name: "1R-12",
      participants: [participants[22].name || "", participants[23].name || ""],
    },
    {
      id: "1R-13",
      round: 1,
      name: "1R-13",
      participants: [participants[24].name || "", participants[25].name || ""],
    },
    {
      id: "1R-14",
      round: 1,
      name: "1R-14",
      participants: [participants[26].name || "", participants[27].name || ""],
    },
    {
      id: "1R-15",
      round: 1,
      name: "1R-15",
      participants: [participants[28].name || "", participants[29].name || ""],
    },
    {
      id: "1R-16",
      round: 1,
      name: "1R-16",
      participants: [participants[30].name || "", participants[31].name || ""],
    },
    {
      id: "1R-17",
      round: 1,
      name: "1R-17",
      participants: [participants[32].name || "", participants[33].name || ""],
    },
    {
      id: "1R-18",
      round: 1,
      name: "1R-18",
      participants: [participants[34].name || "", participants[35].name || ""],
    },
    {
      id: "1R-19",
      round: 1,
      name: "1R-19",
      participants: participants[37]
        ? [participants[36].name || "", participants[37].name || ""]
        : [participants[36].name || ""],
    },
  ];
  // 2R
  const r2 = [
    {
      id: "2R-1",
      round: 2,
      name: "2R-1",
      participants: ["1R-1 승자", "1R-3 승자"],
      prevMatchIds: ["1R-2", "1R-3"],
    },
    {
      id: "2R-2",
      round: 2,
      name: "2R-2",
      participants: ["1R-4 승자", "1R-5 승자"],
      prevMatchIds: ["1R-4", "1R-5"],
    },
    {
      id: "2R-3",
      round: 2,
      name: "2R-3",
      participants: ["1R-6 승자", "1R-7 승자"],
      prevMatchIds: ["1R-6", "1R-7"],
    },
    {
      id: "2R-4",
      round: 2,
      name: "2R-4",
      participants: ["1R-8 승자", "1R-9 승자"],
      prevMatchIds: ["1R-8", "1R-9"],
    },
    {
      id: "2R-5",
      round: 2,
      name: "2R-5",
      participants: ["1R-10 승자", "1R-11 승자"],
      prevMatchIds: ["1R-10", "1R-11"],
    },
    {
      id: "2R-6",
      round: 2,
      name: "2R-6",
      participants: ["1R-12 승자", "1R-13 승자"],
      prevMatchIds: ["1R-12", "1R-13"],
    },
    {
      id: "2R-7",
      round: 2,
      name: "2R-7",
      participants: ["1R-14 승자", "1R-15 승자"],
      prevMatchIds: ["1R-14", "1R-15"],
    },
    {
      id: "2R-8",
      round: 2,
      name: "2R-8",
      participants: ["1R-16 승자", "1R-17 승자"],
      prevMatchIds: ["1R-16", "1R-17"],
    },
    {
      id: "2R-9",
      round: 2,
      name: "2R-9",
      participants: ["1R-18 승자", "1R-19 승자"],
      prevMatchIds: ["1R-18", "1R-19"],
    },
  ];
  // 3R
  const r3 = [
    {
      id: "3R-1",
      round: 3,
      name: "3R-1",
      participants: ["1R-1 승자", "2R-1 승자"],
      prevMatchIds: ["1R-1", "2R-1"],
    },
    {
      id: "3R-2",
      round: 3,
      name: "3R-2",
      participants: ["2R-2 승자", "2R-3 승자"],
      prevMatchIds: ["2R-2", "2R-3"],
    },
    {
      id: "3R-3",
      round: 3,
      name: "3R-3",
      participants: ["2R-4 승자", "2R-5 승자"],
      prevMatchIds: ["2R-4", "2R-5"],
    },
    {
      id: "3R-4",
      round: 3,
      name: "3R-4",
      participants: ["2R-6 승자", "2R-7 승자"],
      prevMatchIds: ["2R-6", "2R-7"],
    },
    {
      id: "3R-5",
      round: 3,
      name: "3R-5",
      participants: ["2R-8 승자", "2R-9 승자"],
      prevMatchIds: ["2R-8", "2R-9"],
    },
  ];

  // 4R
  const r4 = [
    {
      id: "4R-1",
      round: 4,
      name: "4R-1",
      participants: ["3R-1 승자", "3R-2 승자"],
      prevMatchIds: ["3R-1", "3R-2"],
    },
  ];

  // Semi
  const semi = [
    {
      id: "S1",
      round: 5,
      name: "Semi-1",
      participants: ["3R-3 승자", "4R-1 승자"],
      prevMatchIds: ["3R-3", "4R-1"],
    },
    {
      id: "S2",
      round: 5,
      name: "Semi-2",
      participants: ["3R-4 승자", "3R-5 승자"],
      prevMatchIds: ["3R-4", "3R-5"],
    },
  ];
  // Final
  const final = [
    {
      id: "F",
      round: 6,
      name: "Final",
      participants: ["S1 승자", "S2 승자"],
      prevMatchIds: ["S1", "S2"],
    },
  ];
  return [...r1, ...r2, ...r3, ...r4, ...semi, ...final];
};

const generateSpecialBracket40 = (participants: Competitor[]): Match[] => {
  // 1R
  const r1 = [
    {
      id: "1R-1",
      round: 1,
      name: "1R-1",
      participants: [participants[0].name || "", participants[1].name || ""],
    },
    {
      id: "1R-2",
      round: 1,
      name: "1R-2",
      participants: [participants[2].name || "", participants[3].name || ""],
    },
    {
      id: "1R-3",
      round: 1,
      name: "1R-3",
      participants: [participants[4].name || "", participants[5].name || ""],
    },
    {
      id: "1R-4",
      round: 1,
      name: "1R-4",
      participants: [participants[6].name || "", participants[7].name || ""],
    },
    {
      id: "1R-5",
      round: 1,
      name: "1R-5",
      participants: [participants[8].name || "", participants[9].name || ""],
    },
    {
      id: "1R-6",
      round: 1,
      name: "1R-6",
      participants: [participants[10].name || "", participants[11].name || ""],
    },
    {
      id: "1R-7",
      round: 1,
      name: "1R-7",
      participants: [participants[12].name || "", participants[13].name || ""],
    },
    {
      id: "1R-8",
      round: 1,
      name: "1R-8",
      participants: [participants[14].name || "", participants[15].name || ""],
    },
    {
      id: "1R-9",
      round: 1,
      name: "1R-9",
      participants: [participants[16].name || "", participants[17].name || ""],
    },
    {
      id: "1R-10",
      round: 1,
      name: "1R-10",
      participants: [participants[18].name || "", participants[19].name || ""],
    },
    {
      id: "1R-11",
      round: 1,
      name: "1R-11",
      participants: [participants[20].name || "", participants[21].name || ""],
    },
    {
      id: "1R-12",
      round: 1,
      name: "1R-12",
      participants: [participants[22].name || "", participants[23].name || ""],
    },
    {
      id: "1R-13",
      round: 1,
      name: "1R-13",
      participants: [participants[24].name || "", participants[25].name || ""],
    },
    {
      id: "1R-14",
      round: 1,
      name: "1R-14",
      participants: [participants[26].name || "", participants[27].name || ""],
    },
    {
      id: "1R-15",
      round: 1,
      name: "1R-15",
      participants: [participants[28].name || "", participants[29].name || ""],
    },
    {
      id: "1R-16",
      round: 1,
      name: "1R-16",
      participants: [participants[30].name || "", participants[31].name || ""],
    },
    {
      id: "1R-17",
      round: 1,
      name: "1R-17",
      participants: [participants[32].name || "", participants[33].name || ""],
    },
    {
      id: "1R-18",
      round: 1,
      name: "1R-18",
      participants: [participants[34].name || "", participants[35].name || ""],
    },
    {
      id: "1R-19",
      round: 1,
      name: "1R-19",
      participants: [participants[36].name || "", participants[37].name || ""],
    },
    {
      id: "1R-20",
      round: 1,
      name: "1R-20",
      participants: participants[39]
        ? [participants[38].name || "", participants[39].name || ""]
        : [participants[38].name || ""],
    },
  ];
  // 2R
  const r2 = [
    {
      id: "2R-1",
      round: 2,
      name: "2R-1",
      participants: ["1R-1 승자", "1R-2 승자"],
      prevMatchIds: ["1R-1", "1R-2"],
    },
    {
      id: "2R-2",
      round: 2,
      name: "2R-2",
      participants: ["1R-3 승자", "1R-4 승자"],
      prevMatchIds: ["1R-3", "1R-4"],
    },
    {
      id: "2R-3",
      round: 2,
      name: "2R-3",
      participants: ["1R-5 승자", "1R-6 승자"],
      prevMatchIds: ["1R-5", "1R-6"],
    },
    {
      id: "2R-4",
      round: 2,
      name: "2R-4",
      participants: ["1R-7 승자", "1R-8 승자"],
      prevMatchIds: ["1R-7", "1R-8"],
    },
    {
      id: "2R-5",
      round: 2,
      name: "2R-5",
      participants: ["1R-9 승자", "1R-10 승자"],
      prevMatchIds: ["1R-9", "1R-10"],
    },
    {
      id: "2R-6",
      round: 2,
      name: "2R-6",
      participants: ["1R-11 승자", "1R-12 승자"],
      prevMatchIds: ["1R-11", "1R-12"],
    },
    {
      id: "2R-7",
      round: 2,
      name: "2R-7",
      participants: ["1R-13 승자", "1R-14 승자"],
      prevMatchIds: ["1R-13", "1R-14"],
    },
    {
      id: "2R-8",
      round: 2,
      name: "2R-8",
      participants: ["1R-15 승자", "1R-16 승자"],
      prevMatchIds: ["1R-15", "1R-16"],
    },
    {
      id: "2R-9",
      round: 2,
      name: "2R-9",
      participants: ["1R-17 승자", "1R-18 승자"],
      prevMatchIds: ["1R-17", "1R-18"],
    },
    {
      id: "2R-10",
      round: 2,
      name: "2R-10",
      participants: ["1R-19 승자", "1R-20 승자"],
      prevMatchIds: ["1R-19", "1R-20"],
    },
  ];
  // 3R
  const r3 = [
    {
      id: "3R-1",
      round: 3,
      name: "3R-1",
      participants: ["2R-1 승자", "2R-2 승자"],
      prevMatchIds: ["2R-1", "2R-2"],
    },
    {
      id: "3R-2",
      round: 3,
      name: "3R-2",
      participants: ["2R-3 승자", "2R-4 승자"],
      prevMatchIds: ["2R-3", "2R-4"],
    },
    {
      id: "3R-3",
      round: 3,
      name: "3R-3",
      participants: ["2R-5 승자", "2R-6 승자"],
      prevMatchIds: ["2R-5", "2R-6"],
    },
    {
      id: "3R-4",
      round: 3,
      name: "3R-4",
      participants: ["2R-7 승자", "2R-8 승자"],
      prevMatchIds: ["2R-7", "2R-8"],
    },
    {
      id: "3R-5",
      round: 3,
      name: "3R-5",
      participants: ["2R-9 승자", "2R-10 승자"],
      prevMatchIds: ["2R-9", "2R-10"],
    },
  ];

  // 4R
  const r4 = [
    {
      id: "4R-1",
      round: 4,
      name: "4R-1",
      participants: ["3R-2 승자", "3R-3 승자"],
      prevMatchIds: ["3R-2", "3R-3"],
    },
  ];

  // Semi
  const semi = [
    {
      id: "S1",
      round: 5,
      name: "Semi-1",
      participants: ["3R-1 승자", "4R-1 승자"],
      prevMatchIds: ["3R-1", "4R-1"],
    },
    {
      id: "S2",
      round: 5,
      name: "Semi-2",
      participants: ["3R-4 승자", "3R-5 승자"],
      prevMatchIds: ["3R-4", "3R-5"],
    },
  ];
  // Final
  const final = [
    {
      id: "F",
      round: 6,
      name: "Final",
      participants: ["S1 승자", "S2 승자"],
      prevMatchIds: ["S1", "S2"],
    },
  ];
  return [...r1, ...r2, ...r3, ...r4, ...semi, ...final];
};

const generateSpecialBracket42 = (participants: Competitor[]): Match[] => {
  // 1R
  const r1 = [
    {
      id: "1R-1",
      round: 1,
      name: "1R-1",
      participants: [participants[0].name || "", participants[1].name || ""],
    },
    {
      id: "1R-2",
      round: 1,
      name: "1R-2",
      participants: [participants[2].name || "", participants[3].name || ""],
    },
    {
      id: "1R-3",
      round: 1,
      name: "1R-3",
      participants: [participants[4].name || "", participants[5].name || ""],
    },
    {
      id: "1R-4",
      round: 1,
      name: "1R-4",
      participants: [participants[6].name || "", participants[7].name || ""],
    },
    {
      id: "1R-5",
      round: 1,
      name: "1R-5",
      participants: [participants[8].name || "", participants[9].name || ""],
    },
    {
      id: "1R-6",
      round: 1,
      name: "1R-6",
      participants: [participants[10].name || "", participants[11].name || ""],
    },
    {
      id: "1R-7",
      round: 1,
      name: "1R-7",
      participants: [participants[12].name || "", participants[13].name || ""],
    },
    {
      id: "1R-8",
      round: 1,
      name: "1R-8",
      participants: [participants[14].name || "", participants[15].name || ""],
    },
    {
      id: "1R-9",
      round: 1,
      name: "1R-9",
      participants: [participants[16].name || "", participants[17].name || ""],
    },
    {
      id: "1R-10",
      round: 1,
      name: "1R-10",
      participants: [participants[18].name || "", participants[19].name || ""],
    },
    {
      id: "1R-11",
      round: 1,
      name: "1R-11",
      participants: [participants[20].name || "", participants[21].name || ""],
    },
    {
      id: "1R-12",
      round: 1,
      name: "1R-12",
      participants: [participants[22].name || "", participants[23].name || ""],
    },
    {
      id: "1R-13",
      round: 1,
      name: "1R-13",
      participants: [participants[24].name || "", participants[25].name || ""],
    },
    {
      id: "1R-14",
      round: 1,
      name: "1R-14",
      participants: [participants[26].name || "", participants[27].name || ""],
    },
    {
      id: "1R-15",
      round: 1,
      name: "1R-15",
      participants: [participants[28].name || "", participants[29].name || ""],
    },
    {
      id: "1R-16",
      round: 1,
      name: "1R-16",
      participants: [participants[30].name || "", participants[31].name || ""],
    },
    {
      id: "1R-17",
      round: 1,
      name: "1R-17",
      participants: [participants[32].name || "", participants[33].name || ""],
    },
    {
      id: "1R-18",
      round: 1,
      name: "1R-18",
      participants: [participants[34].name || "", participants[35].name || ""],
    },
    {
      id: "1R-19",
      round: 1,
      name: "1R-19",
      participants: [participants[36].name || "", participants[37].name || ""],
    },
    {
      id: "1R-20",
      round: 1,
      name: "1R-20",
      participants: [participants[38].name || "", participants[39].name || ""],
    },
    {
      id: "1R-21",
      round: 1,
      name: "1R-21",
      participants: participants[41]
        ? [participants[40].name || "", participants[41].name || ""]
        : [participants[40].name || ""],
    },
  ];
  // 2R
  const r2 = [
    {
      id: "2R-1",
      round: 2,
      name: "2R-1",
      participants: ["1R-2 승자", "1R-3 승자"],
      prevMatchIds: ["1R-2", "1R-3"],
    },
    {
      id: "2R-2",
      round: 2,
      name: "2R-2",
      participants: ["1R-4 승자", "1R-5 승자"],
      prevMatchIds: ["1R-4", "1R-5"],
    },
    {
      id: "2R-3",
      round: 2,
      name: "2R-3",
      participants: ["1R-6 승자", "1R-7 승자"],
      prevMatchIds: ["1R-6", "1R-7"],
    },
    {
      id: "2R-4",
      round: 2,
      name: "2R-4",
      participants: ["1R-8 승자", "1R-9 승자"],
      prevMatchIds: ["1R-8", "1R-9"],
    },
    {
      id: "2R-5",
      round: 2,
      name: "2R-5",
      participants: ["1R-10 승자", "1R-11 승자"],
      prevMatchIds: ["1R-10", "1R-11"],
    },
    {
      id: "2R-6",
      round: 2,
      name: "2R-6",
      participants: ["1R-12 승자", "1R-13 승자"],
      prevMatchIds: ["1R-12", "1R-13"],
    },
    {
      id: "2R-7",
      round: 2,
      name: "2R-7",
      participants: ["1R-14 승자", "1R-15 승자"],
      prevMatchIds: ["1R-14", "1R-15"],
    },
    {
      id: "2R-8",
      round: 2,
      name: "2R-8",
      participants: ["1R-16 승자", "1R-17 승자"],
      prevMatchIds: ["1R-16", "1R-17"],
    },
    {
      id: "2R-9",
      round: 2,
      name: "2R-9",
      participants: ["1R-18 승자", "1R-19 승자"],
      prevMatchIds: ["1R-18", "1R-19"],
    },
    {
      id: "2R-10",
      round: 2,
      name: "2R-10",
      participants: ["1R-20 승자", "1R-21 승자"],
      prevMatchIds: ["1R-20", "1R-21"],
    },
  ];
  // 3R
  const r3 = [
    {
      id: "3R-1",
      round: 3,
      name: "3R-1",
      participants: ["1R-1 승자", "2R-1 승자"],
      prevMatchIds: ["1R-1", "2R-1"],
    },
    {
      id: "3R-2",
      round: 3,
      name: "3R-2",
      participants: ["2R-3 승자", "2R-4 승자"],
      prevMatchIds: ["2R-3", "2R-4"],
    },
    {
      id: "3R-3",
      round: 3,
      name: "3R-3",
      participants: ["2R-5 승자", "2R-6 승자"],
      prevMatchIds: ["2R-5", "2R-6"],
    },
    {
      id: "3R-4",
      round: 3,
      name: "3R-4",
      participants: ["2R-7 승자", "2R-8 승자"],
      prevMatchIds: ["2R-7", "2R-8"],
    },
    {
      id: "3R-5",
      round: 3,
      name: "3R-5",
      participants: ["2R-9 승자", "2R-10 승자"],
      prevMatchIds: ["2R-9", "2R-10"],
    },
  ];

  // 4R
  const r4 = [
    {
      id: "4R-1",
      round: 4,
      name: "4R-1",
      participants: ["2R-2 승자", "3R-1 승자"],
      prevMatchIds: ["2R-2", "3R-1"],
    },
    {
      id: "4R-2",
      round: 4,
      name: "4R-2",
      participants: ["3R-2 승자", "3R-3 승자"],
      prevMatchIds: ["3R-2", "3R-3"],
    },
  ];

  // Semi
  const semi = [
    {
      id: "S1",
      round: 5,
      name: "Semi-1",
      participants: ["4R-1 승자", "4R-2 승자"],
      prevMatchIds: ["4R-1", "4R-2"],
    },
    {
      id: "S2",
      round: 5,
      name: "Semi-2",
      participants: ["3R-4 승자", "3R-5 승자"],
      prevMatchIds: ["3R-4", "3R-5"],
    },
  ];
  // Final
  const final = [
    {
      id: "F",
      round: 6,
      name: "Final",
      participants: ["S1 승자", "S2 승자"],
      prevMatchIds: ["S1", "S2"],
    },
  ];
  return [...r1, ...r2, ...r3, ...r4, ...semi, ...final];
};

// 3. 라운드별로 매치 그룹화
const groupMatchesByRound = (matches: any[]) => {
  const rounds: Record<number, any[]> = {};
  matches.forEach((m) => {
    if (!rounds[m.round]) rounds[m.round] = [];
    rounds[m.round].push(m);
  });
  return rounds;
};

// 4. 노드/엣지 변환 및 위치 계산 (상위 라운드는 prevMatchIds의 y좌표 평균)
const useBracketNodesEdges = (matches: any[]) => {
  const rounds = groupMatchesByRound(matches);
  const columnWidth = 300;
  const rowHeight = 150;
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const nodeYMap: Record<string, number> = {};

  Object.entries(rounds).forEach(([roundStr, roundMatches]) => {
    const round = Number(roundStr);
    if (round === 1) {
      // 1라운드: 등간격
      const totalHeight = rowHeight * roundMatches.length;
      roundMatches.forEach((match: any, idx: number) => {
        const verticalGap = totalHeight / roundMatches.length;
        const y = idx * verticalGap + verticalGap / 2;
        nodeYMap[match.id] = y;
        nodes.push({
          id: match.id,
          type: "matchNode",
          data: match,
          position: {
            x: (round - 1) * columnWidth,
            y,
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          draggable: false,
        });
      });
    } else {
      // 2라운드 이상: prevMatchIds의 y좌표 평균
      roundMatches.forEach((match: any) => {
        const prevYs = (match.prevMatchIds || []).map(
          (pid: string) => nodeYMap[pid]
        );
        const y = prevYs.length
          ? prevYs.reduce((a: number, b: number) => a + b, 0) / prevYs.length
          : 0;
        nodeYMap[match.id] = y;
        nodes.push({
          id: match.id,
          type: "matchNode",
          data: match,
          position: {
            x: (round - 1) * columnWidth,
            y,
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          draggable: false,
        });
      });
    }
  });

  // 엣지 생성 (prevMatchIds 기반)
  matches.forEach((match) => {
    if (match.prevMatchIds && match.prevMatchIds.length > 0) {
      match.prevMatchIds.forEach((prevId: string) => {
        if (prevId) {
          edges.push({
            id: `${prevId}->${match.id}`,
            source: prevId,
            target: match.id,
            type: "smoothstep",
            style: { stroke: "#475569", strokeWidth: 2 },
            sourceHandle: "source",
            targetHandle: "target",
          });
        }
      });
    }
  });

  return { nodes, edges };
};

// 5. 커스텀 노드 컴포넌트 (BracketTest2.tsx 스타일)
const MatchNode = ({ data }: { data: any }) => {
  return (
    <div className="min-w-[200px] p-2 rounded-md bg-zinc-800 border border-zinc-700">
      <Handle type="target" position={Position.Left} id="target" />
      <div className="text-sm text-zinc-400 mb-2">{data.name}</div>
      <div className="space-y-1">
        {data.participants.map((name: string, idx: number) => (
          <div
            key={idx}
            className="h-10 flex items-center justify-between p-2 rounded bg-zinc-950"
          >
            <span className="font-medium">
              {name || <span className="opacity-50">-</span>}
            </span>
          </div>
        ))}
      </div>
      <Handle type="source" position={Position.Right} id="source" />
    </div>
  );
};

// 6. 노드 타입 등록
const nodeTypes = { matchNode: MatchNode };

// const isPowerOfTwo = (n: number) => {
//   return n > 0 && (n & (n - 1)) === 0;
// };

// 7. 메인 컴포넌트
const SingleElimination = ({ count }: SingleEliminationsProps) => {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);

  useEffect(() => {
    setCompetitors(
      Array.from({ length: count }, (_, i) => ({
        id: `p${i + 1}`,
        name: "",
      }))
    );
  }, [count]);

  const matches = useMemo(() => {
    // return generateBalancedBracket(competitors);
    if (competitors.length === 5 || competitors.length === 6) {
      return generateSpecialBracket6(competitors);
    } else if (competitors.length === 9 || competitors.length === 10) {
      return generateSpecialBracket10(competitors);
    } else if (competitors.length === 11 || competitors.length === 12) {
      return generateSpecialBracket12(competitors);
    } else if (competitors.length === 13 || competitors.length === 14) {
      return generateSpecialBracket14(competitors);
    } else if (competitors.length === 17 || competitors.length === 18) {
      return generateSpecialBracket18(competitors);
    } else if (competitors.length === 19 || competitors.length === 20) {
      return generateSpecialBracket20(competitors);
    } else if (competitors.length === 21 || competitors.length === 22) {
      return generateSpecialBracket22(competitors);
    } else if (competitors.length === 23 || competitors.length === 24) {
      return generateSpecialBracket24(competitors);
    } else if (competitors.length === 33 || competitors.length === 34) {
      return generateSpecialBracket34(competitors);
    } else if (competitors.length === 35 || competitors.length === 36) {
      return generateSpecialBracket36(competitors);
    } else if (competitors.length === 37 || competitors.length === 38) {
      return generateSpecialBracket38(competitors);
    } else if (competitors.length === 39 || competitors.length === 40) {
      return generateSpecialBracket40(competitors);
    } else if (competitors.length === 41 || competitors.length === 42) {
      return generateSpecialBracket42(competitors);
    } else return generateBalancedBracket1(competitors);
  }, [competitors]);

  const { nodes, edges } = useBracketNodesEdges(matches);

  return (
    <div className="w-full bg-zinc-900 rounded-md">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.45 }}
        proOptions={{ hideAttribution: true }}
        draggable={false}
        nodesDraggable={false}
        elementsSelectable={false}
        panOnDrag={true}
        connectOnClick={false}
      >
        <Background gap={32} color="#222" />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default SingleElimination;
