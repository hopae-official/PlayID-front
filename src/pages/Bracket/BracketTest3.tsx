import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  type Dispatch,
} from "react";
import type { Edge, Node } from "@xyflow/react";
import {
  ReactFlow,
  Controls,
  Position,
  Background,
  Handle,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import DownloadButton from "@/components/Bracket/DownloadButton";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import {
  Calendar1Icon,
  CalendarIcon,
  ChevronDownIcon,
  EllipsisIcon,
  MoreHorizontalIcon,
  Settings,
  XIcon,
} from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  useForm,
  type UseFormHandleSubmit,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormWatch,
} from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import type { Action, Competitor, Group, StageState } from "./BracketCreate";
import GroupToggleButton from "@/components/Bracket/GroupToggleButton";

export type Match = {
  id: string;
  round: number;
  name: string;
  participants?: string[];
  prevMatchIds?: (string | null)[];
  date?: Date;
  time?: string;
  setType?: string;
  place?: string;
  winner?: string;
  referee?: string[];
  isSettingNode?: boolean;
  isThirdPlace?: boolean;
};

export type MatchSetting = {
  round: number;
  date?: Date;
  time: string;
  setType: string;
  place: string;
  referee: string[];
  isSettingNode: boolean;
};

export interface BracketTest3Props {
  stage: StageState;
  dispatch: Dispatch<Action>;
}

const generateGeneralizedSpecialBracket = (
  participants: Competitor[]
): Match[] => {
  if (participants.length < 2) {
    return [];
  }

  let matchCount = 1;
  const allMatches: Match[] = [];

  // 1. 1라운드 대진 생성
  const round1Matches: Match[] = [];
  let round = 1;
  for (let i = 0; i < Math.floor(participants.length / 2); i++) {
    round1Matches.push({
      id: uuidv4(),
      name: `Match ${matchCount}`,
      round,
      participants: [
        participants[i * 2].name || "",
        participants[i * 2 + 1].name || "",
      ],
    });
    matchCount++;
  }
  if (participants.length % 2 !== 0) {
    round1Matches.push({
      id: uuidv4(),
      name: `Match ${matchCount}`,
      round,
      participants: [participants[participants.length - 1].name || "", ""],
    });
    matchCount++;
  }
  allMatches.push(...round1Matches);

  let contenders: Match[] = round1Matches.map((m) => ({ ...m }));
  round++;

  if (participants.length === 3 || participants.length === 4) {
    allMatches.push({
      id: uuidv4(),
      name: "Final",
      round,
      participants: ["", ""],
      prevMatchIds: [contenders[0].id, contenders[1].id],
    });

    return allMatches;
  }

  // 2. 최종 4명 이하가 남을 때까지 중간 라운드 생성
  while (contenders.length > 4) {
    if (contenders.length === 25) {
      // 49, 50명 참가자 케이스 (1라운드 후 25팀) 특별 처리

      // --- Round 2: 25 -> 13 contenders ---
      const r2Bye = contenders[0];
      const r2Playing = contenders.slice(1);
      const r2Matches: Match[] = [];
      for (let i = 0; i < r2Playing.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round,
          participants: ["", ""],
          prevMatchIds: [r2Playing[i * 2].id, r2Playing[i * 2 + 1].id],
        };
        r2Matches.push(match);
        matchCount++;
      }
      allMatches.push(...r2Matches);
      const r3Contenders = [r2Bye, ...r2Matches]; // 13 contenders

      // --- Round 3: 13 -> 6 contenders ---
      const r3Bye = r3Contenders[2]; // M23 winner gets a bye
      const r3Playing = [
        r3Contenders[0], // M1w
        r3Contenders[1], // M22w
        ...r3Contenders.slice(3),
      ];
      const r3Matches: Match[] = [];
      for (let i = 0; i < r3Playing.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round: round + 1,
          participants: ["", ""],
          prevMatchIds: [r3Playing[i * 2].id, r3Playing[i * 2 + 1].id],
        };
        r3Matches.push(match);
        matchCount++;
      }
      allMatches.push(...r3Matches);
      const r4Contenders = [r3Bye, ...r3Matches]; // 7 contenders

      console.log("r4", r4Contenders);

      // --- Round 4: 7 -> 4 contenders ---
      const r4Byes = r4Contenders[2]; // Last 2 are byes
      const r4Playing = [
        r4Contenders[0],
        r4Contenders[1],
        r4Contenders[3],
        r4Contenders[4],
        r4Contenders[5],
        r4Contenders[6],
      ];
      const r4Matches: Match[] = [];
      for (let i = 0; i < r4Playing.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round: round + 2,
          participants: ["", ""],
          prevMatchIds: [r4Playing[i * 2].id, r4Playing[i * 2 + 1].id],
        };
        r4Matches.push(match);
        matchCount++;
      }
      allMatches.push(...r4Matches);

      // 준결승 진출자 최종 확정
      contenders = [r4Byes, ...r4Matches];

      // 3개 라운드를 처리했으므로 카운터 업데이트
      round += 3;
      break;
    }

    if (contenders.length === 23) {
      // 45, 46명 참가자 케이스 (1라운드 후 23팀) 특별 처리

      // --- Round 2: 23 -> 12 contenders ---
      const r2Bye = contenders[0];
      const r2Playing = contenders.slice(1);
      const r2Matches: Match[] = [];
      for (let i = 0; i < r2Playing.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round,
          participants: ["", ""],
          prevMatchIds: [r2Playing[i * 2].id, r2Playing[i * 2 + 1].id],
        };
        r2Matches.push(match);
        matchCount++;
      }
      allMatches.push(...r2Matches);
      const r3Contenders = [r2Bye, ...r2Matches]; // 12 contenders

      // --- Round 3: 12 -> 6 contenders ---
      const r3Matches: Match[] = [];
      for (let i = 0; i < r3Contenders.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round: round + 1,
          participants: ["", ""],
          prevMatchIds: [r3Contenders[i * 2].id, r3Contenders[i * 2 + 1].id],
        };
        r3Matches.push(match);
        matchCount++;
      }
      allMatches.push(...r3Matches);
      // 6명: r3Matches[0]~[5] (Match 35~40)

      // --- Round 4: 4경기 중 2경기만 진행, 나머지 2명은 준결승 직행 ---
      // Match 41: Match 35 vs Match 36
      // Match 42: Match 37 vs Match 38
      // Match 39, 40 승자는 바로 준결승
      const r4Match1 = {
        id: uuidv4(),
        name: `Match ${matchCount}`,
        round: round + 2,
        participants: ["", ""],
        prevMatchIds: [r3Matches[0].id, r3Matches[1].id],
      };
      matchCount++;
      const r4Match2 = {
        id: uuidv4(),
        name: `Match ${matchCount}`,
        round: round + 2,
        participants: ["", ""],
        prevMatchIds: [r3Matches[2].id, r3Matches[3].id],
      };
      matchCount++;
      allMatches.push(r4Match1, r4Match2);

      // 준결승 진출자 최종 확정
      contenders = [r4Match1, r4Match2, r3Matches[4], r3Matches[5]];

      // 3개 라운드를 처리했으므로 카운터 업데이트
      round += 3;
      break;
    }

    if (contenders.length === 21) {
      // 41, 42명 참가자 케이스 (1라운드 후 21팀) 특별 처리

      // --- Round 2: 21 -> 11 contenders ---
      const r2Bye = contenders[0];
      const r2Playing = contenders.slice(1);
      const r2Matches: Match[] = [];
      for (let i = 0; i < r2Playing.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round,
          participants: ["", ""],
          prevMatchIds: [r2Playing[i * 2].id, r2Playing[i * 2 + 1].id],
        };
        r2Matches.push(match);
        matchCount++;
      }
      allMatches.push(...r2Matches);
      const r3Contenders = [r2Bye, ...r2Matches]; // 11 contenders

      // --- Round 3: 11 -> 6 contenders ---
      const r3Bye = r3Contenders[2]; // M23 winner gets a bye
      const r3Playing = [
        r3Contenders[0], // M1w
        r3Contenders[1], // M22w
        ...r3Contenders.slice(3),
      ];
      const r3Matches: Match[] = [];
      for (let i = 0; i < r3Playing.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round: round + 1,
          participants: ["", ""],
          prevMatchIds: [r3Playing[i * 2].id, r3Playing[i * 2 + 1].id],
        };
        r3Matches.push(match);
        matchCount++;
      }
      allMatches.push(...r3Matches);
      const r4Contenders = [r3Bye, ...r3Matches]; // 6 contenders

      // --- Round 4: 6 -> 4 contenders ---
      const r4Byes = r4Contenders.slice(4); // Last 2 are byes
      const r4Playing = r4Contenders.slice(0, 4);
      const r4Matches: Match[] = [];
      for (let i = 0; i < r4Playing.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round: round + 2,
          participants: ["", ""],
          prevMatchIds: [r4Playing[i * 2].id, r4Playing[i * 2 + 1].id],
        };
        r4Matches.push(match);
        matchCount++;
      }
      allMatches.push(...r4Matches);

      // 준결승 진출자 최종 확정
      contenders = [...r4Byes, ...r4Matches];

      // 3개 라운드를 처리했으므로 카운터 업데이트
      round += 3;
      break;
    }

    if (contenders.length === 19) {
      // 37, 38명 참가자 케이스(1라운드 후 19팀)에 대한 특별 처리

      // --- Round 2: 19 -> 10 contenders ---
      const r2Bye = contenders[0];
      const r2Playing = contenders.slice(1);
      const r2Matches: Match[] = [];
      for (let i = 0; i < r2Playing.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round,
          participants: ["", ""],
          prevMatchIds: [r2Playing[i * 2].id, r2Playing[i * 2 + 1].id],
        };
        r2Matches.push(match);
        matchCount++;
      }
      allMatches.push(...r2Matches);
      const r3Contenders = [r2Bye, ...r2Matches]; // 10 contenders

      // --- Round 3: 10 -> 5 contenders ---
      const r3Matches: Match[] = [];
      for (let i = 0; i < r3Contenders.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round: round + 1,
          participants: ["", ""],
          prevMatchIds: [r3Contenders[i * 2].id, r3Contenders[i * 2 + 1].id],
        };
        r3Matches.push(match);
        matchCount++;
      }
      allMatches.push(...r3Matches);
      const r4Contenders = r3Matches; // 5 contenders

      // --- Round 4: 5 -> 4 contenders ---
      const r4Playing = r4Contenders.slice(0, 2); // M29w, M30w
      const sfByes = r4Contenders.slice(2); // M31w, M32w, M33w
      const r4Match = {
        id: uuidv4(),
        name: `Match ${matchCount}`,
        round: round + 2,
        participants: ["", ""],
        prevMatchIds: [r4Playing[0].id, r4Playing[1].id],
      };
      allMatches.push(r4Match);
      matchCount++;

      // 준결승 진출자 최종 확정
      contenders = [r4Match, ...sfByes];

      // 3개 라운드를 처리했으므로 카운터 업데이트
      round += 3;
      break;
    }

    if (contenders.length === 17) {
      // 33, 34명 참가자 케이스(1라운드 후 17팀)에 대한 특별 처리

      // R2 생성: 1팀 부전승(M1), 8개 경기 (M18~M25)
      const round2Bye = contenders[0];
      const round2Playing = contenders.slice(1);
      const round2Matches: Match[] = [];
      for (let i = 0; i < round2Playing.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round,
          participants: ["", ""],
          prevMatchIds: [round2Playing[i * 2].id, round2Playing[i * 2 + 1].id],
        };
        round2Matches.push(match);
        matchCount++;
      }
      allMatches.push(...round2Matches);

      // R3 진출자: 9팀 (M1w, M18w .. M25w)
      const round3Contenders = [round2Bye, ...round2Matches];

      // R3 진출자 분리: M19w는 R4 직행, 나머지 8팀은 R3 진행
      const round4DirectFromR2 = round3Contenders[2]; // M19 승자
      const round3Playing = [
        round3Contenders[0], // M1 승자
        round3Contenders[1], // M18 승자
        ...round3Contenders.slice(3),
      ];

      // R3 경기 생성: 4경기 (M26~M29)
      const round3Matches: Match[] = [];
      for (let i = 0; i < round3Playing.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round: round + 1,
          participants: ["", ""],
          prevMatchIds: [round3Playing[i * 2].id, round3Playing[i * 2 + 1].id],
        };
        round3Matches.push(match);
        matchCount++;
      }
      allMatches.push(...round3Matches);

      // R4 및 준결승 진출자: 5팀 (M19w, M26w, M27w, M28w, M29w)
      const finalFive = [round4DirectFromR2, ...round3Matches];

      // R4 경기 생성 (M19w vs M26w) -> M30
      const round4Match = {
        id: uuidv4(),
        name: `Match ${matchCount}`,
        round: round + 2,
        participants: ["", ""],
        prevMatchIds: [finalFive[0].id, finalFive[1].id],
      };
      allMatches.push(round4Match);
      matchCount++;

      // 준결승 진출자 최종 확정
      contenders = [
        round4Match, // M30
        finalFive[2], // M27 승자
        finalFive[3], // M28 승자
        finalFive[4], // M29 승자
      ];

      // 3개 라운드(R2, R3, R4)를 처리했으므로 라운드 카운터 업데이트
      round += 3;

      break;
    }

    if (contenders.length === 13) {
      // 25, 26명 참가자 케이스(1라운드 후 13팀)에 대한 특별 처리

      // R2 생성: 1팀 부전승(M1), 6개 경기
      const round2Bye = contenders[0]; // Match 1 승자
      const round2Playing = contenders.slice(1);
      const round2Matches: Match[] = [];
      for (let i = 0; i < round2Playing.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round,
          participants: ["", ""],
          prevMatchIds: [round2Playing[i * 2].id, round2Playing[i * 2 + 1].id],
        };
        round2Matches.push(match);
        matchCount++;
      }
      allMatches.push(...round2Matches);

      // R3 진출자 분리: 1팀은 준결승 직행, 6팀은 R3 진행
      const semiFinalDirect = round2Matches[1]; // Match 15 승자
      const round3Playing = [
        round2Bye, // Match 1 승자
        round2Matches[0], // Match 14 승자
        ...round2Matches.slice(2), // M16, M17, M18, M19 승자들
      ];

      // R3 경기 생성
      const round3Matches: Match[] = [];
      for (let i = 0; i < round3Playing.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round: round + 1,
          participants: ["", ""],
          prevMatchIds: [round3Playing[i * 2].id, round3Playing[i * 2 + 1].id],
        };
        round3Matches.push(match);
        matchCount++;
      }
      allMatches.push(...round3Matches);

      // 준결승 진출자 최종 확정 (M15승자, M20승자, M21승자, M22승자)
      contenders = [semiFinalDirect, ...round3Matches];

      // 2개 라운드(R2, R3)를 처리했으므로 라운드 카운터 업데이트
      round += 2;

      break;
    }

    if (contenders.length === 12) {
      // 23, 24명 참가자 케이스(1라운드 후 12팀)에 대한 특별 처리

      // R2 생성: 6개 경기
      const round2Matches: Match[] = [];
      for (let i = 0; i < contenders.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round,
          participants: ["", ""],
          prevMatchIds: [contenders[i * 2].id, contenders[i * 2 + 1].id],
        };
        round2Matches.push(match);
        matchCount++;
      }
      allMatches.push(...round2Matches);

      // R2 승자 분리: 2팀은 준결승 직행, 4팀은 R3 진행
      const semiFinalDirect = round2Matches.slice(0, 2);
      const round3Playing = round2Matches.slice(2);

      // R3 경기 생성
      const round3Matches: Match[] = [];
      for (let i = 0; i < round3Playing.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round: round + 1,
          participants: ["", ""],
          prevMatchIds: [round3Playing[i * 2].id, round3Playing[i * 2 + 1].id],
        };
        round3Matches.push(match);
        matchCount++;
      }
      allMatches.push(...round3Matches);

      // 준결승 진출자 최종 확정
      contenders = [...semiFinalDirect, ...round3Matches];

      // 2개 라운드(R2, R3)를 처리했으므로 라운드 카운터 업데이트
      round += 2;

      break;
    }

    if (contenders.length === 11) {
      // 21, 22명 참가자 케이스(1라운드 후 11팀)에 대한 특별 처리

      // R2 생성: 부전승 1팀, 경기 5개
      const round2Bye = contenders[0];
      const round2Playing = contenders.slice(1);
      const round2Matches: Match[] = [];
      for (let i = 0; i < round2Playing.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round,
          participants: ["", ""],
          prevMatchIds: [round2Playing[i * 2].id, round2Playing[i * 2 + 1].id],
        };
        round2Matches.push(match);
        matchCount++;
      }
      allMatches.push(...round2Matches);

      // R3 진출자: R2 부전승 1팀 + R2 승자 5팀 = 6팀
      const round3Contenders = [round2Bye, ...round2Matches];

      // R3 진출자 분리: 4팀은 R3 경기, 2팀은 준결승 직행
      const round3Playing = round3Contenders.slice(0, 4);
      const semiFinalDirect = round3Contenders.slice(4);

      // R3 경기 생성
      const round3Matches: Match[] = [];
      for (let i = 0; i < round3Playing.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round: round + 1,
          participants: ["", ""],
          prevMatchIds: [round3Playing[i * 2].id, round3Playing[i * 2 + 1].id],
        };
        round3Matches.push(match);
        matchCount++;
      }
      allMatches.push(...round3Matches);

      // 준결승 진출자 최종 확정
      contenders = [...round3Matches, ...semiFinalDirect];

      // 2개 라운드(R2, R3)를 처리했으므로 라운드 카운터 업데이트
      round += 2;

      break;
    }

    if (contenders.length === 9) {
      // 17, 18명 참가자 케이스(1라운드 후 9팀)에 대한 특별 처리
      const round2Bye = contenders[0];
      const round2Playing = contenders.slice(1);

      const round2Matches: Match[] = [];
      for (let i = 0; i < round2Playing.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round,
          participants: ["", ""],
          prevMatchIds: [round2Playing[i * 2].id, round2Playing[i * 2 + 1].id],
        };
        round2Matches.push(match);
        matchCount++;
      }
      allMatches.push(...round2Matches);

      // R3 진출자: R2 부전승 1팀 + R2 승자 4팀 = 5팀
      const round3Contenders = [round2Bye, ...round2Matches];

      // R3 경기 생성
      const round3Match = {
        id: uuidv4(),
        name: `Match ${matchCount}`,
        round: round + 1,
        participants: ["", ""],
        prevMatchIds: [round3Contenders[0].id, round3Contenders[1].id],
      };
      allMatches.push(round3Match);
      matchCount++;

      // 준결승 진출자 확정: R3 승자 1팀 + R3 부전승 3팀
      contenders = [
        round3Match,
        round3Contenders[2],
        round3Contenders[3],
        round3Contenders[4],
      ];

      // 2개 라운드(R2, R3)를 이 블록에서 모두 처리했으므로 라운드 카운터를 업데이트합니다.
      round += 2;

      // 루프 종료
      break;
    }

    let playing: Match[];
    let byes: Match[];
    let reorderedContenders = false;

    const currentLength = contenders.length;

    if (currentLength === 5) {
      // 9/10명 참가자 케이스(1라운드 후 5팀)에 대한 특별 처리
      playing = contenders.slice(1, 3); // 2, 3번째 경기 승자가 플레이
      byes = [contenders[0], contenders[3], contenders[4]]; // 1, 4, 5번째 경기 승자는 부전승
      reorderedContenders = true;
    } else {
      // 일반적인 라운드 진행 로직
      const numByes = currentLength % 2;
      byes = contenders.slice(0, numByes);
      playing = contenders.slice(numByes);
    }

    const currentRoundMatches: Match[] = [];
    if (playing.length > 1) {
      for (let i = 0; i < Math.floor(playing.length / 2); i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round,
          participants: ["", ""],
          prevMatchIds: [playing[i * 2].id, playing[i * 2 + 1].id],
        };
        currentRoundMatches.push(match);
        matchCount++;
      }
    }
    // playing이 홀수일 경우 마지막 한 팀은 그대로 byes에 합류
    if (playing.length % 2 !== 0) {
      byes.push(playing[playing.length - 1]);
    }

    allMatches.push(...currentRoundMatches);

    if (
      reorderedContenders &&
      byes.length === 3 &&
      currentRoundMatches.length === 1
    ) {
      // 5팀 -> 4팀으로 줄이는 특별 케이스의 순서 재조정
      contenders = [byes[0], currentRoundMatches[0], byes[1], byes[2]];
    } else {
      contenders = [...byes, ...currentRoundMatches];
    }
    round++;
  }

  // 3. 준결승 및 결승 생성
  const semiFinalRound = round;

  let finalists: Match[] = [];

  if (contenders.length === 4) {
    // 정상적인 4강
    const semi1 = {
      id: uuidv4(),
      name: `Semi-Final 1`,
      round: semiFinalRound,
      participants: ["", ""],
      prevMatchIds: [contenders[0].id, contenders[1].id],
    };
    const semi2 = {
      id: uuidv4(),
      name: `Semi-Final 2`,
      round: semiFinalRound,
      participants: ["", ""],
      prevMatchIds: [contenders[2].id, contenders[3].id],
    };
    allMatches.push(semi1, semi2);
    finalists = [semi1, semi2];
  } else if (contenders.length === 3) {
    // 3팀이 남은 경우, 참가자 수에 따라 다른 준결승 대진을 적용합니다.
    if (participants.length === 21 || participants.length === 22) {
      // 21, 22명 토너먼트 규칙: 1,2번째 진출자가 준결승, 3번째는 부전승.
      const semi1 = {
        id: uuidv4(),
        name: `Semi-Final 1`,
        round: semiFinalRound,
        participants: ["", ""],
        prevMatchIds: [contenders[0].id, contenders[1].id],
      };
      // 부전승자를 위한 두 번째 준결승 경기 (더미)
      const semi2 = {
        id: uuidv4(),
        name: `Semi-Final 2`,
        round: semiFinalRound,
        participants: ["", ""],
        prevMatchIds: [contenders[2].id], // 부전승
      };
      allMatches.push(semi1, semi2);
      finalists = [semi1, semi2];
    } else {
      // 5, 6인 토너먼트 규칙에 따라 첫번째 경기 승자가 결승에 직행합니다.
      const semiMatch = {
        id: uuidv4(),
        name: `Semi-Final 1`,
        round: semiFinalRound,
        participants: ["", ""],
        prevMatchIds: [contenders[1].id, contenders[2].id], // 2,3번째 진출자가 준결승
      };
      allMatches.push(semiMatch);

      // 첫번째 진출자는 결승으로 직행
      finalists = [contenders[0], semiMatch];
    }
  } else if (contenders.length === 2) {
    // 2팀만 남은 경우, 이들을 바로 결승 진출자로 간주
    finalists = contenders;
  }

  // 4. 결승전 생성
  if (finalists.length === 2) {
    const final: Match = {
      id: uuidv4(),
      name: "Final",
      round: semiFinalRound + 1,
      participants: ["", ""],
      prevMatchIds: [finalists[0].id, finalists[1].id],
    };
    allMatches.push(final);
  }

  return allMatches;
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
const useBracketNodesEdges = (matches: Match[]) => {
  const settingNodes = matches.filter((m) => m.isSettingNode);
  const thirdPlaceNode = matches.find((m) => m.isThirdPlace);
  const gameNodes = matches.filter((m) => !m.isSettingNode && !m.isThirdPlace);

  const rounds = groupMatchesByRound(gameNodes);
  const columnWidth = 300;
  const rowHeight = 180;
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const nodeYMap: Record<string, number> = {};

  Object.entries(rounds).forEach(([roundStr, roundMatches]) => {
    const round = Number(roundStr);
    if (round === 1) {
      // 1라운드: 등간격
      const totalHeight = rowHeight * roundMatches.length;
      roundMatches.forEach((match: Match, idx: number) => {
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
      roundMatches.forEach((match: Match) => {
        const prevYs = (match.prevMatchIds || [])
          .filter((pid): pid is string => pid !== null)
          .map((pid: string) => nodeYMap[pid]);
        const y = prevYs.length
          ? prevYs.reduce((a: number, b: number) => a + b, 0) / prevYs.length
          : 0;
        nodeYMap[match.id] = y;
        nodes.push({
          id: match.id,
          type: "matchNode",
          data: match,
          position: {
            x: (round - 1) * columnWidth * 1.5,
            y,
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          draggable: false,
        });
      });
    }
  });

  settingNodes.forEach((match) => {
    nodes.push({
      id: match.id,
      type: "matchNode",
      data: match,
      position: { x: (match.round - 1) * columnWidth * 1.5, y: 10 },
      draggable: false,
    });
  });

  if (thirdPlaceNode) {
    const finalRoundNumber = Math.max(...Object.keys(rounds).map(Number));
    const finalMatch = rounds[finalRoundNumber]?.[0];

    let thirdPlaceY = 200; // 결승전이 없을 경우의 기본 Y 위치
    if (finalMatch && nodeYMap[finalMatch.id] !== undefined) {
      thirdPlaceY = nodeYMap[finalMatch.id] + 300;
    }

    nodes.push({
      id: thirdPlaceNode.id,
      type: "matchNode",
      data: thirdPlaceNode,
      position: {
        x: (thirdPlaceNode.round - 1) * columnWidth * 1.5,
        y: thirdPlaceY,
      },
      draggable: false,
    });
  }

  // 엣지 생성 (prevMatchIds 기반)
  matches.forEach((match) => {
    if (match.prevMatchIds && match.prevMatchIds.length > 0) {
      match.prevMatchIds
        .filter((pid): pid is string => pid !== null)
        .forEach((prevId: string) => {
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

// 5. 커스텀 노드 컴포넌트
const MatchNode = ({
  match,
  onSubmit,
}: {
  match: Match;
  onSubmit: (data: { id: string; setting: MatchSetting }) => void;
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { register, watch, setValue, handleSubmit, reset } =
    useForm<MatchSetting>();
  const refereeData = [
    "김심판",
    "이심판",
    "박심판",
    "최심판",
    "정심판",
    "유심판",
    "장심판",
    "오심판",
    "한심판",
  ];

  useEffect(() => {
    if (isDialogOpen) {
      reset({
        round: match.round,
        date: match.date,
        time: match.time,
        setType: match.setType || "single",
        place: match.place,
        referee: match.referee,
        isSettingNode: match.isSettingNode,
      });
    }
  }, [isDialogOpen, match, reset]);

  const handleChangeReferee = (value: string) => {
    if (watch("referee")?.includes(value)) {
      toast.error("이미 존재하는 심판입니다.");
      return;
    }
    const currentReferees = watch("referee") || [];
    setValue("referee", [...currentReferees, value]);
  };

  const handleRemoveReferee = (value: string) => {
    setValue(
      "referee",
      watch("referee")?.filter((referee: string) => referee !== value) || []
    );
  };

  const onFormSubmit = (data: MatchSetting) => {
    onSubmit({ id: match.id || "", setting: data });
    setIsDialogOpen(false);
  };

  const dialogContent = (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{match.name}</DialogTitle>
        <DialogDescription />
      </DialogHeader>
      <div className="grid gap-4">
        <div className="w-full flex justify-between items-center gap-4">
          <div className="w-full grid gap-3 ">
            <Label htmlFor="date-picker">경기 일자</Label>
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverTrigger asChild className="w-full">
                <Button
                  variant="outline"
                  id="date-picker"
                  className="w-full justify-between font-normal text-sm"
                >
                  {watch("date") ? (
                    watch("date")?.toLocaleDateString()
                  ) : (
                    <div className="flex items-center gap-2 text-zinc-400">
                      <CalendarIcon className="w-4 h-4" />
                      <span className="text-sm">일정선택</span>
                    </div>
                  )}
                  <ChevronDownIcon />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto overflow-hidden p-0"
                align="start"
              >
                <Calendar
                  {...register("date")}
                  mode="single"
                  selected={watch("date")}
                  captionLayout="dropdown"
                  onSelect={(date) => {
                    setValue("date", date);
                    setIsPopoverOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="w-full grid gap-3">
            <Label htmlFor="time-picker">경기 시간</Label>
            <Input
              {...register("time")}
              type="time"
              id="time-picker"
              value={watch("time")}
              onChange={(e) => setValue("time", e.target.value)}
              className="w-full bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
            />
          </div>
        </div>
        <div className="grid gap-3">
          <Label htmlFor="set-type">세트 방식</Label>
          <Tabs
            value={watch("setType")}
            defaultValue="single"
            onValueChange={(value) => setValue("setType", value)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger
                className="dark:data-[state=active]:bg-zinc-950"
                value="single"
              >
                단판
              </TabsTrigger>
              <TabsTrigger
                className="dark:data-[state=active]:bg-zinc-950"
                value="best-of-three"
              >
                3판 2선승제
              </TabsTrigger>
              <TabsTrigger
                className="dark:data-[state=active]:bg-zinc-950"
                value="best-of-five"
              >
                5판 3선승제
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="grid gap-3">
          <Label htmlFor="place">경기 장소</Label>
          <Input
            {...register("place")}
            id="place"
            name="place"
            value={watch("place")}
            placeholder="장소를 입력해주세요"
            onChange={(e) => setValue("place", e.target.value)}
          />
        </div>
        <div className="grid gap-3">
          <Label htmlFor="referee">심판 배정</Label>

          <Select
            value={
              watch("referee") && watch("referee").length > 0
                ? watch("referee")[watch("referee").length - 1]
                : ""
            }
            onValueChange={handleChangeReferee}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="심판을 선택해주세요" />
            </SelectTrigger>
            <SelectContent>
              {refereeData &&
                refereeData.length > 0 &&
                refereeData.map((referee) => (
                  <SelectItem key={referee} value={referee}>
                    {referee}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {watch("referee") && (
            <div className="flex flex-wrap gap-2 text-sm">
              {watch("referee").map((referee: string, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 border border-zinc-700 rounded-md px-2 py-1"
                >
                  <span>{referee}</span>
                  <XIcon
                    className="w-4 h-4 cursor-pointer text-zinc-400"
                    onClick={() => handleRemoveReferee(referee)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">취소</Button>
        </DialogClose>
        <Button type="submit" onClick={handleSubmit(onFormSubmit)}>
          저장
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  if (match.isSettingNode) {
    return (
      <div className="min-w-[200px]">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <div className="mb-2 flex flex-col gap-1 cursor-pointer">
              <div className="flex justify-between items-center text-base font-bold">
                <span>{match.name}</span>
                <Settings className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="flex items-center gap-1 text-xs text-zinc-400">
                <span>{match.setType || "세트방식"}</span>
                <div className="flex items-center justify-center h-[8px]">
                  <Separator
                    orientation="vertical"
                    className="w-[1px] bg-zinc-400"
                  />
                </div>
                <span>
                  {match.date
                    ? `${match.date.toLocaleDateString()} ${match.time || ""}`
                    : "일정선택"}
                </span>
              </div>
              <Separator className="w-full mt-3 bg-zinc-700" />
            </div>
          </DialogTrigger>
          {dialogContent}
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-w-[200px] p-2 rounded-md bg-zinc-800 border border-zinc-700">
      {match.round !== 1 && (
        <Handle
          type="target"
          position={Position.Left}
          id="target"
          className="opacity-0"
        />
      )}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <div className="mb-2 flex flex-col gap-1 cursor-pointer">
            <div className="flex justify-between items-center text-sm text-zinc-400">
              <span>{match.name}</span>
              <EllipsisIcon className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1 text-xs text-zinc-400">
              <span>{match.setType || "세트방식"}</span>
              <div className="flex items-center justify-center h-[8px]">
                <Separator
                  orientation="vertical"
                  className="w-[1px] bg-zinc-400"
                />
              </div>
              <span>
                {match.date
                  ? `${match.date.toLocaleDateString()} ${match.time || ""}`
                  : "일정선택"}
              </span>
            </div>
          </div>
        </DialogTrigger>
        {dialogContent}
      </Dialog>

      <div className="space-y-1">
        {match.participants &&
          match.participants.map((name: string, idx: number) => (
            <div
              key={idx}
              className={`h-10 flex items-center justify-between p-2 rounded ${
                name ? "bg-zinc-950" : "bg-zinc-900"
              }`}
            >
              <span className="font-medium">
                {name || <span className="opacity-50"></span>}
              </span>
            </div>
          ))}
      </div>
      {match.round && !match.isThirdPlace && (
        <Handle
          type="source"
          position={Position.Right}
          id="source"
          className="opacity-0"
        />
      )}
    </div>
  );
};

// 대진표 생성 함수 분리
function createBracketMatches(
  competitors: Competitor[],
  isThirdPlace: boolean
): Match[] {
  const initialMatches = generateGeneralizedSpecialBracket(competitors);
  const uniqueRounds = [...new Set(initialMatches.map((m) => m.round))];
  if (isThirdPlace) {
    initialMatches.push({
      id: uuidv4(),
      round: uniqueRounds.length,
      name: "3,4위전",
      participants: ["", ""],
      isThirdPlace: true,
    });
  }
  const matchSettingNodes = uniqueRounds.map((round) => ({
    id: uuidv4(),
    round,
    name: round === uniqueRounds.length ? "Final Round" : `Round ${round}`,
    isSettingNode: true,
  }));
  return [...matchSettingNodes, ...initialMatches];
}

// 6. 메인 컴포넌트
const BracketTest3 = ({ stage, dispatch }: BracketTest3Props) => {
  console.log(stage);

  const [groups, setGroups] = useState<Group[]>(stage.groups);
  const [matches, setMatches] = useState<Match[]>(stage.matches);
  const [selectedGroup, setSelectedGroup] = useState<Group>(stage.groups[0]);

  console.log("groups", groups);

  useEffect(() => {
    if (stage.groups.length > 1) {
      const newGroups = stage.groups.map((group) => ({
        ...group,
        matches: createBracketMatches(group.competitors, stage.isThirdPlace),
      }));
      setGroups(newGroups);
      setSelectedGroup(newGroups[0]);
      // 필요하다면 아래 dispatch로 상위 상태와 동기화
      // newGroups.forEach(g => dispatch({ type: "SET_GROUP_MATCHES", payload: { id: g.id, matches: g.matches } }));
      return;
    }
    const newMatches = createBracketMatches(
      stage.competitors,
      stage.isThirdPlace
    );
    setMatches(newMatches);
    // 필요하다면 아래 dispatch로 상위 상태와 동기화
    // dispatch({ type: "SET_MATCHES", payload: newMatches });
  }, [stage]);

  const handleChangeGroupTab = (group: Group) => {
    setSelectedGroup(group);
  };

  const handleMatchSubmit = (data: { id: string; setting: MatchSetting }) => {
    const { setting } = data;

    if (setting.isSettingNode) {
      // 라운드 전체 설정 적용
      setMatches((prevMatches) =>
        prevMatches.map((match) => {
          if (match.round === setting.round) {
            return {
              ...match,
              date: setting.date,
              time: setting.time,
              setType: setting.setType,
              place: setting.place,
              referee: setting.referee,
            };
          }
          return match;
        })
      );
    } else {
      // 개별 경기 설정 적용
      setMatches((prevMatches) =>
        prevMatches.map((match) => {
          if (match.id === data.id) {
            return {
              ...match,
              date: setting.date,
              time: setting.time,
              setType: setting.setType,
              place: setting.place,
              referee: setting.referee,
            };
          }
          return match;
        })
      );
    }
    toast.success("경기 정보가 저장되었습니다.");
  };

  const nodeTypes = useMemo(
    () => ({
      matchNode: (props: { data: Match }) => (
        <MatchNode match={props.data} onSubmit={handleMatchSubmit} />
      ),
    }),
    []
  );

  const { nodes, edges } =
    stage.groups.length > 1
      ? useBracketNodesEdges(
          groups.find((group) => group.id === selectedGroup.id)?.matches || []
        )
      : useBracketNodesEdges(matches);

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
        panOnDrag={true}
        connectOnClick={false}
      >
        <Background gap={32} color="#222" />
        <Controls position="top-right" orientation="horizontal" />
        {/* <DownloadButton  /> */}
        {stage.groups.length > 1 && selectedGroup && (
          <GroupToggleButton
            groups={stage.groups}
            selectedGroup={selectedGroup}
            onChange={handleChangeGroupTab}
          />
        )}
      </ReactFlow>
    </div>
  );
};

export default BracketTest3;
