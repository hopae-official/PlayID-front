import {type Dispatch, useCallback, useEffect, useMemo, useState,} from "react";
import type {Edge, Node} from "@xyflow/react";
import {Handle, Position, ReactFlow} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {v4 as uuidv4} from "uuid";
import {Button} from "@/components/ui/button";
import {CalendarIcon, ChevronDownIcon, Settings, XIcon} from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Popover, PopoverContent, PopoverTrigger,} from "@/components/ui/popover";
import {Calendar} from "@/components/ui/calendar";
import {useForm} from "react-hook-form";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {toast} from "sonner";
import {Tabs, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Separator} from "@/components/ui/separator";
import type {Action, CustomStage, Group} from "./BracketCreate";
import GroupToggleButton from "@/components/Bracket/GroupToggleButton";
import {groupBy} from "lodash";
import ThirdPlaceToggleButton from "@/components/Bracket/ThirdPlaceToggleButton";
import CustomControls, {type CustomControlMenuType,} from "@/components/Bracket/CustomControls";
import {useExpandStore} from "@/stores/expand";
import {getRefereesByCompetitionId} from "@/queries/refree";
import type {
  BracketStructureMatchDto,
  BracketStructureRoundDto,
  InitializeBracketStructureDto,
  RefereeCompetition,
  UpdateMatchParticipantsDto,
  UpdateRoundDtoBestOf,
} from "@/api/model";
import dayjs from "dayjs";
import {patchMatchParticipantsBulk, updateMatch} from "@/queries/match";
import {updateRound} from "@/queries/round";
import {useNavigate} from "react-router-dom";
import type {CustomMatch} from "./BracketShowingBoard";
import DownloadButton from "@/components/Bracket/DownloadButton";
import {useCompetition} from "@/contexts/CompetitionContext.tsx";

export type MatchSetting = {
  round: number;
  scheduledDate?: Date;
  scheduledTime: string;
  bestOf: UpdateRoundDtoBestOf;
  venue: string;
  referee: string[];
  isSettingNode: boolean;
};

export const BOARD_TYPE = {
  SHOW: "SHOW",
  EDIT: "EDIT",
  RESULT: "RESULT",
} as const;

export type BoardType = (typeof BOARD_TYPE)[keyof typeof BOARD_TYPE];

export interface BracketBoardProps {
  stage: CustomStage;
  selectedGroupId?: string;
  isFinishUpdate?: boolean;
  dispatch?: Dispatch<Action>;
  onChangeGroupTab?: (groupId: string) => void;
  onDeleteBracket?: () => void;
  onClickControls?: (menu: CustomControlMenuType) => void;
  onSaveBracket?: (
    initializeBracketStructureDto: InitializeBracketStructureDto
  ) => void;
}

// 싱글엘리미네이션 매치 생성 함수
const generateSingleEliminationMatches = (group: Group): CustomMatch[] => {
  if (group.competitors.length < 2) {
    return [];
  }

  let matchCount = 1;
  const allMatches: CustomMatch[] = [];
  const participants = group.competitors;

  // 1. 1라운드 대진 생성
  const round1Matches: CustomMatch[] = [];
  let round = 1;
  for (let i = 0; i < Math.floor(participants.length / 2); i++) {
    round1Matches.push({
      id: uuidv4(),
      name: `Match ${matchCount}`,
      round,
      participants: [
        {id: participants[i * 2].id, name: participants[i * 2].name || ""},
        {
          id: participants[i * 2 + 1].id,
          name: participants[i * 2 + 1].name || "",
        },
      ],
    });
    matchCount++;
  }
  if (participants.length % 2 !== 0) {
    round1Matches.push({
      id: uuidv4(),
      name: `Match ${matchCount}`,
      round,
      participants: [
        {
          id: participants[participants.length - 1].id || "",
          name: participants[participants.length - 1].name || "",
        },
        {id: "", name: ""},
      ],
    });
    matchCount++;
  }
  allMatches.push(...round1Matches);

  let contenders: CustomMatch[] = round1Matches.map((m) => ({...m}));
  round++;

  if (participants.length === 3 || participants.length === 4) {
    allMatches.push({
      id: uuidv4(),
      name: "Final",
      round,
      participants: [
        {id: "", name: ""},
        {id: "", name: ""},
      ],
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
      const r2Matches: CustomMatch[] = [];
      for (let i = 0; i < r2Playing.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round,
          participants: [
            {id: "", name: ""},
            {id: "", name: ""},
          ],
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
      const r3Matches: CustomMatch[] = [];
      for (let i = 0; i < r3Playing.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round: round + 1,
          participants: [
            {id: "", name: ""},
            {id: "", name: ""},
          ],
          prevMatchIds: [r3Playing[i * 2].id, r3Playing[i * 2 + 1].id],
        };
        r3Matches.push(match);
        matchCount++;
      }
      allMatches.push(...r3Matches);
      const r4Contenders = [r3Bye, ...r3Matches]; // 7 contenders

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
      const r4Matches: CustomMatch[] = [];
      for (let i = 0; i < r4Playing.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round: round + 2,
          participants: [
            {id: "", name: ""},
            {id: "", name: ""},
          ],
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
      const r2Matches: CustomMatch[] = [];
      for (let i = 0; i < r2Playing.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round,
          participants: [
            {id: "", name: ""},
            {id: "", name: ""},
          ],
          prevMatchIds: [r2Playing[i * 2].id, r2Playing[i * 2 + 1].id],
        };
        r2Matches.push(match);
        matchCount++;
      }
      allMatches.push(...r2Matches);
      const r3Contenders = [r2Bye, ...r2Matches]; // 12 contenders

      // --- Round 3: 12 -> 6 contenders ---
      const r3Matches: CustomMatch[] = [];
      for (let i = 0; i < r3Contenders.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round: round + 1,
          participants: [
            {id: "", name: ""},
            {id: "", name: ""},
          ],
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
        participants: [
          {id: "", name: ""},
          {id: "", name: ""},
        ],
        prevMatchIds: [r3Matches[0].id, r3Matches[1].id],
      };
      matchCount++;
      const r4Match2 = {
        id: uuidv4(),
        name: `Match ${matchCount}`,
        round: round + 2,
        participants: [
          {id: "", name: ""},
          {id: "", name: ""},
        ],
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
      const r2Matches: CustomMatch[] = [];
      for (let i = 0; i < r2Playing.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round,
          participants: [
            {id: "", name: ""},
            {id: "", name: ""},
          ],
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
      const r3Matches: CustomMatch[] = [];
      for (let i = 0; i < r3Playing.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round: round + 1,
          participants: [
            {id: "", name: ""},
            {id: "", name: ""},
          ],
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
      const r4Matches: CustomMatch[] = [];
      for (let i = 0; i < r4Playing.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round: round + 2,
          participants: [
            {id: "", name: ""},
            {id: "", name: ""},
          ],
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
      const r2Matches: CustomMatch[] = [];
      for (let i = 0; i < r2Playing.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round,
          participants: [
            {id: "", name: ""},
            {id: "", name: ""},
          ],
          prevMatchIds: [r2Playing[i * 2].id, r2Playing[i * 2 + 1].id],
        };
        r2Matches.push(match);
        matchCount++;
      }
      allMatches.push(...r2Matches);
      const r3Contenders = [r2Bye, ...r2Matches]; // 10 contenders

      // --- Round 3: 10 -> 5 contenders ---
      const r3Matches: CustomMatch[] = [];
      for (let i = 0; i < r3Contenders.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round: round + 1,
          participants: [
            {id: "", name: ""},
            {id: "", name: ""},
          ],
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
        participants: [
          {id: "", name: ""},
          {id: "", name: ""},
        ],
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
      const round2Matches: CustomMatch[] = [];
      for (let i = 0; i < round2Playing.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round,
          participants: [
            {id: "", name: ""},
            {id: "", name: ""},
          ],
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
      const round3Matches: CustomMatch[] = [];
      for (let i = 0; i < round3Playing.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round: round + 1,
          participants: [
            {id: "", name: ""},
            {id: "", name: ""},
          ],
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
        participants: [
          {id: "", name: ""},
          {id: "", name: ""},
        ],
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
      const round2Matches: CustomMatch[] = [];
      for (let i = 0; i < round2Playing.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round,
          participants: [
            {id: "", name: ""},
            {id: "", name: ""},
          ],
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
      const round3Matches: CustomMatch[] = [];
      for (let i = 0; i < round3Playing.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round: round + 1,
          participants: [
            {id: "", name: ""},
            {id: "", name: ""},
          ],
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
      const round2Matches: CustomMatch[] = [];
      for (let i = 0; i < contenders.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round,
          participants: [
            {id: "", name: ""},
            {id: "", name: ""},
          ],
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
      const round3Matches: CustomMatch[] = [];
      for (let i = 0; i < round3Playing.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round: round + 1,
          participants: [
            {id: "", name: ""},
            {id: "", name: ""},
          ],
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
      const round2Matches: CustomMatch[] = [];
      for (let i = 0; i < round2Playing.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round,
          participants: [
            {id: "", name: ""},
            {id: "", name: ""},
          ],
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
      const round3Matches: CustomMatch[] = [];
      for (let i = 0; i < round3Playing.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round: round + 1,
          participants: [
            {id: "", name: ""},
            {id: "", name: ""},
          ],
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

      const round2Matches: CustomMatch[] = [];
      for (let i = 0; i < round2Playing.length / 2; i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round,
          participants: [
            {id: "", name: ""},
            {id: "", name: ""},
          ],
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
        participants: [
          {id: "", name: ""},
          {id: "", name: ""},
        ],
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

    let playing: CustomMatch[];
    let byes: CustomMatch[];
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

    const currentRoundMatches: CustomMatch[] = [];
    if (playing.length > 1) {
      for (let i = 0; i < Math.floor(playing.length / 2); i++) {
        const match = {
          id: uuidv4(),
          name: `Match ${matchCount}`,
          round,
          participants: [
            {id: "", name: ""},
            {id: "", name: ""},
          ],
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

  let finalists: CustomMatch[] = [];

  if (contenders.length === 4) {
    // 정상적인 4강
    const semi1 = {
      id: uuidv4(),
      name: `Semi-Final 1`,
      round: semiFinalRound,
      participants: [
        {id: "", name: ""},
        {id: "", name: ""},
      ],
      prevMatchIds: [contenders[0].id, contenders[1].id],
    };
    const semi2 = {
      id: uuidv4(),
      name: `Semi-Final 2`,
      round: semiFinalRound,
      participants: [
        {id: "", name: ""},
        {id: "", name: ""},
      ],
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
        participants: [
          {id: "", name: ""},
          {id: "", name: ""},
        ],
        prevMatchIds: [contenders[0].id, contenders[1].id],
      };
      // 부전승자를 위한 두 번째 준결승 경기 (더미)
      const semi2 = {
        id: uuidv4(),
        name: `Semi-Final 2`,
        round: semiFinalRound,
        participants: [
          {id: "", name: ""},
          {id: "", name: ""},
        ],
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
        participants: [
          {id: "", name: ""},
          {id: "", name: ""},
        ],
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
    const final: CustomMatch = {
      id: uuidv4(),
      name: "Final",
      round: semiFinalRound + 1,
      participants: [
        {id: "", name: ""},
        {id: "", name: ""},
      ],
      prevMatchIds: [finalists[0].id, finalists[1].id],
    };
    allMatches.push(final);
  }

  return allMatches;
};

// Free For All 매치 생성 함수
const generateFreeForAllMatches = (
  group: Group,
  totalRounds: number
): CustomMatch[] => {
  const participants = group.competitors;
  return Array.from(
    {
      length: totalRounds,
    },
    (_, i) => ({
      id: uuidv4(),
      name: `Match ${i + 1}`,
      round: i + 1,
      bestOf: 1 as 1 | 3 | 5,
      participants: participants.map(({id, name}) => ({
        id,
        name: name || "",
      })),
    })
  );
};

// 3. 라운드별로 매치 그룹화
const groupMatchesByRound = (matches: CustomMatch[]) => {
  const rounds: Record<number, CustomMatch[]> = {};
  matches.forEach((m) => {
    if (!rounds[m.round]) rounds[m.round] = [];
    rounds[m.round].push(m);
  });
  return rounds;
};

// 4. 노드/엣지 변환 및 위치 계산 (상위 라운드는 prevMatchIds의 y좌표 평균)
const useSingleEliminationBracketNodesEdges = (matches: CustomMatch[]) => {
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
      roundMatches.forEach((match: CustomMatch, idx: number) => {
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
      roundMatches.forEach((match: CustomMatch) => {
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
      position: {x: (match.round - 1) * columnWidth * 1.5, y: 10},
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
    if (
      match.prevMatchIds &&
      match.prevMatchIds.length > 0 &&
      !match.isThirdPlace
    ) {
      match.prevMatchIds
        .filter((pid): pid is string => pid !== null)
        .forEach((prevId: string) => {
          if (prevId) {
            edges.push({
              id: `${prevId}->${match.id}`,
              source: prevId,
              target: match.id,
              type: "smoothstep",
              style: {stroke: "#27272A", strokeWidth: 6},
              sourceHandle: "source",
              targetHandle: "target",
            });
          }
        });
    }
  });

  return {nodes, edges};
};

const useFreeForAllBracketNodesEdges = (matches: CustomMatch[]) => {
  const columnWidth = 300;
  const rowHeight = 180;
  const nodes: Node[] = [];
  const nodeYMap: Record<string, number> = {};
  const gameNodes = matches.filter((m) => !m.isSettingNode && !m.isThirdPlace);
  const settingNodes = matches.filter((m) => m.isSettingNode);

  gameNodes.forEach((match: CustomMatch) => {
    nodeYMap[match.id] = rowHeight;
    nodes.push({
      id: match.id,
      type: "matchNode",
      data: match,
      position: {
        x: (match.round - 1) * columnWidth,
        y: rowHeight,
      },
      draggable: false,
    });
  });

  settingNodes.forEach((match) => {
    nodes.push({
      id: match.id,
      type: "matchNode",
      data: match,
      position: {
        x: (match.round - 1) * columnWidth,
        y: 100,
      },
      draggable: false,
    });
  });

  return {nodes, edges: []};
};

// 5. 커스텀 노드 컴포넌트
const MatchNode = (props: any) => {
  const {
    match,
    matches,
    stage,
    onSubmit,
    refereeData,
  }: {
    match: CustomMatch;
    matches: CustomMatch[];
    boardType: BoardType;
    stage: CustomStage;
    onSubmit: (data: { id: string; setting: MatchSetting }) => void;
    refereeData: RefereeCompetition[];
  } = props.data;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const {register, watch, setValue, handleSubmit, reset} =
    useForm<MatchSetting>();

  useEffect(() => {
    if (isDialogOpen) {
      reset({
        round: match.round,
        scheduledDate: match.scheduledDate,
        scheduledTime: match.scheduledTime,
        bestOf: match.bestOf || 1,
        venue: match.venue,
        referee: match.referee,
        isSettingNode: match.isSettingNode,
      });
    }
  }, [isDialogOpen, match, reset]);

  const groupbyRooundMatches = useMemo(() => {
    return groupBy(matches, (m: CustomMatch) => m.round);
  }, [matches]);

  const lastRound = useMemo(() => {
    const rounds = matches.map((m) => m.round);
    const maxRound = Math.max(...rounds);
    return maxRound;
  }, [matches]);

  const getIsDifferentSetType = useCallback(
    (match: CustomMatch) => {
      const round = match.round;
      const roundMatches = groupbyRooundMatches[round] || [];
      const setTypes = Array.from(
        new Set(roundMatches.map((m) => m.bestOf || ""))
      );

      if (setTypes.length === 0 || (setTypes.length === 1 && !setTypes[0])) {
        return "세트방식";
      }
      if (setTypes.length > 1) {
        return "혼합";
      }
      return setTypes[0] === 1
        ? "단판"
        : setTypes[0] === 3
          ? "3판 2선승제"
          : "5판 3선승제";
    },
    [groupbyRooundMatches]
  );

  const getIsDifferentDate = useCallback(
    (match: CustomMatch) => {
      const round = match.round;
      const roundMatches = groupbyRooundMatches[round] || [];
      const dates = roundMatches
        .map((m) => m.scheduledDate)
        .filter((d): d is Date => d !== undefined);

      if (dates.length === 0) return "일정선택";
      const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
      const firstDate = sortedDates[0];
      const lastDate = sortedDates[sortedDates.length - 1];

      // 날짜가 다르면 범위로 표시
      if (
        firstDate.getTime() !== lastDate.getTime() ||
        roundMatches.some(
          (m) => m.scheduledDate?.getTime() !== firstDate.getTime()
        )
      ) {
        return `${firstDate.toLocaleDateString()} - ${lastDate.toLocaleDateString()}`;
      }
      // 날짜가 같으면 시간도 체크
      const times = Array.from(
        new Set(roundMatches.map((m) => m.scheduledTime || ""))
      );

      if (times.length > 1) {
        return `${firstDate.toLocaleDateString()} (여러 시간)`;
      }
      // 날짜, 시간이 모두 같으면
      return `${firstDate.toLocaleDateString()} ${times[0] || ""}`;
    },
    [groupbyRooundMatches]
  );

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

  const handleFormSubmit = (data: MatchSetting) => {
    onSubmit({id: match.id || "", setting: data});
    setIsDialogOpen(false);
  };

  const dialogContent = (
    <DialogContent className="sm:max-w-[425px]" showCloseButton={false}>
      <DialogHeader>
        <DialogTitle>{match.name}</DialogTitle>
        <DialogDescription/>
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
                  {watch("scheduledDate") ? (
                    watch("scheduledDate")?.toLocaleDateString()
                  ) : (
                    <div className="flex items-center gap-2 text-zinc-400">
                      <CalendarIcon className="w-4 h-4"/>
                      <span className="text-sm">일정선택</span>
                    </div>
                  )}
                  <ChevronDownIcon/>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto overflow-hidden p-0"
                align="start"
              >
                <Calendar
                  {...register("scheduledDate")}
                  mode="single"
                  selected={watch("scheduledDate")}
                  captionLayout="dropdown"
                  onSelect={(date) => {
                    setValue("scheduledDate", date);
                    setIsPopoverOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="w-full grid gap-3">
            <Label htmlFor="time-picker">경기 시간</Label>
            <Input
              {...register("scheduledTime")}
              type="time"
              id="time-picker"
              value={watch("scheduledTime")}
              onChange={(e) => setValue("scheduledTime", e.target.value)}
              className="w-full bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
            />
          </div>
        </div>
        <div className="grid gap-3">
          <Label htmlFor="best-of">세트 방식</Label>
          <Tabs
            value={watch("bestOf")?.toString()}
            onValueChange={(value) =>
              setValue("bestOf", Number(value) as 1 | 3 | 5)
            }
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger
                className="dark:data-[state=active]:bg-zinc-950"
                value="1"
              >
                단판
              </TabsTrigger>
              <TabsTrigger
                className="dark:data-[state=active]:bg-zinc-950"
                value="3"
              >
                3판 2선승제
              </TabsTrigger>
              <TabsTrigger
                className="dark:data-[state=active]:bg-zinc-950"
                value="5"
              >
                5판 3선승제
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="grid gap-3">
          <Label htmlFor="place">경기 장소</Label>
          <Input
            {...register("venue")}
            id="venue"
            name="venue"
            value={watch("venue")}
            placeholder="장소를 입력해주세요"
            onChange={(e) => setValue("venue", e.target.value)}
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
              <SelectValue placeholder="심판을 선택해주세요"/>
            </SelectTrigger>
            <SelectContent>
              {refereeData &&
                refereeData.length > 0 &&
                refereeData.map((referee) => (
                  <SelectItem
                    key={referee.referee.id}
                    value={referee.referee.id.toString()}
                  >
                    {referee.referee.firstName} {referee.referee.lastName}
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
                  <span>
                    {
                      refereeData?.find(
                        (r: RefereeCompetition) =>
                          r.referee.id.toString() === referee
                      )?.referee.firstName
                    }
                    {
                      refereeData?.find(
                        (r: RefereeCompetition) =>
                          r.referee.id.toString() === referee
                      )?.referee.lastName
                    }
                  </span>
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
          <Button className="cursor-pointer" variant="outline">
            취소
          </Button>
        </DialogClose>
        <Button
          className="cursor-pointer"
          type="submit"
          onClick={handleSubmit(handleFormSubmit)}
        >
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
            <Button
              variant="ghost"
              className={`w-full h-full flex flex-col justify-start items-start gap-1 mb-2 p-0 dark:hover:bg-transparent ${"cursor-pointer"} `}
            >
              <div className="w-full flex justify-between items-center text-base font-bold">
                <span>{match.name}</span>
                <Settings className="w-4 h-4 text-zinc-400"/>
              </div>
              <div className="flex items-center gap-1 text-xs text-zinc-400">
                <span>{getIsDifferentSetType(match)}</span>
                <div className="flex items-center justify-center h-[8px]">
                  <Separator
                    orientation="vertical"
                    className="w-[1px] bg-zinc-400"
                  />
                </div>
                <span>{getIsDifferentDate(match)}</span>
              </div>
              <Separator className="w-full mt-3 bg-zinc-700"/>
            </Button>
          </DialogTrigger>
          {dialogContent}
        </Dialog>
      </div>
    );
  }

  return (
    <div className="max-w-[200px] min-w-[200px] p-2 rounded-md bg-zinc-800 border border-zinc-700 relative">
      {/* Total 노드에만 왼쪽 vertical line 추가 */}
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
          <Button
            variant="ghost"
            className={`w-full h-full flex flex-col justify-start items-start gap-1 ${"cursor-pointer"} mb-2 p-0`}
          >
            <div className="w-full flex justify-between items-center text-sm text-zinc-400">
              <span>{match.name}</span>
              <Settings className="w-4 h-4 text-zinc-400"/>
            </div>
            <div className="flex items-center gap-1 text-xs text-zinc-400">
              <span>
                {match.bestOf
                  ? match.bestOf === 1
                    ? "단판"
                    : match.bestOf === 3
                      ? "3판 2선승제"
                      : "5판 3선승제"
                  : "세트방식"}
              </span>
              <div className="flex items-center justify-center h-[8px]">
                <Separator
                  orientation="vertical"
                  className="w-[1px] bg-zinc-400"
                />
              </div>
              <span>
                {match.scheduledDate
                  ? `${match.scheduledDate.toLocaleDateString()} ${
                    match.scheduledTime || ""
                  }`
                  : "일정선택"}
              </span>
            </div>
          </Button>
        </DialogTrigger>
        {dialogContent}
      </Dialog>

      {stage.bracket?.format === "SINGLE_ELIMINATION" && (
        <div className="space-y-1">
          {match.participants?.map(
            (participant: { id: string; name: string }, idx: number) => {
              const isWinner = match.matchWinnerRosterId === participant.id;
              const isLastRound = match.round === lastRound;
              const isThirdPlace = match.isThirdPlace;

              // 배경/텍스트 색상
              let baseClass = "";
              if (match.matchWinnerRosterId) {
                baseClass = isWinner
                  ? "bg-zinc-950 text-white"
                  : "bg-zinc-900 text-zinc-400";
              } else {
                baseClass = participant.name ? "bg-zinc-950" : "bg-zinc-900";
              }

              // 테두리 색상
              let borderClass = "";
              if (isLastRound && match.matchWinnerRosterId) {
                if (isThirdPlace) {
                  borderClass = isWinner ? "border border-yellow-700" : "";
                } else {
                  borderClass = isWinner
                    ? "border border-yellow-200"
                    : "border border-sky-200";
                }
              }

              // 우승/순위 뱃지
              let rankBadge = null;
              if (
                match.singleEliminationResult &&
                match.singleEliminationResult.setResult &&
                match.singleEliminationResult.setResult.length > 0 &&
                isLastRound &&
                match.matchWinnerRosterId
              ) {
                rankBadge = (
                  <span
                    className={`text-xs w-4 h-4 flex items-center justify-center rounded-lg font-bold
                    ${
                      isThirdPlace
                        ? isWinner
                          ? "bg-yellow-700 text-amber-950"
                          : "bg-transparent"
                        : isWinner
                          ? "bg-yellow-300 text-yellow-700"
                          : "bg-sky-300 text-sky-700"
                    }`}
                  >
                    {isThirdPlace
                      ? isWinner
                        ? "3"
                        : ""
                      : isWinner
                        ? "1"
                        : "2"}
                  </span>
                );
              }

              // 승리 횟수
              let winCount = "";
              if (
                match.singleEliminationResult &&
                match.singleEliminationResult.setResult &&
                match.singleEliminationResult.setResult.length > 0
              ) {
                winCount = match.matchWinnerRosterId
                  ? match.singleEliminationResult.setResult
                    .filter(
                      (r: { winnerRosterId?: string }) =>
                        r.winnerRosterId === participant.id
                    )
                    .length.toString()
                  : "";
              }

              return (
                <div
                  key={idx}
                  className={`h-10 flex items-center justify-between p-2 rounded ${baseClass} ${borderClass}`}
                >
                  <span className="font-medium truncate block">
                    {participant.name || <span className="opacity-50"></span>}
                  </span>
                  {(rankBadge || winCount !== "") && (
                    <div className="flex items-center gap-4">
                      {rankBadge}
                      <span
                        className={`text-sm ${
                          isWinner ? "text-white" : "text-zinc-400"
                        }`}
                      >
                        {winCount}
                      </span>
                    </div>
                  )}
                </div>
              );
            }
          )}
        </div>
      )}

      {stage.bracket?.format === "FREE_FOR_ALL" && (
        <div className="space-y-1">
          {(match.participants ?? []).map(
            (participant: { id: string; name: string }, idx: number) => {
              const point =
                match.freeForAllResult?.setResult?.find?.(
                  (r: { id?: string }) => r.id === participant.id
                )?.point ?? "";

              const baseClass = participant.name
                ? "bg-zinc-950"
                : "bg-zinc-900";

              const showPoint =
                !!match.freeForAllResult?.setResult?.length &&
                match.freeForAllResult.setResult.every(
                  (result) => result.ranking !== 0
                );

              return (
                <div
                  key={idx}
                  className={`h-10 flex items-center justify-between p-2 rounded ${baseClass}`}
                >
                  <span className="font-medium">
                    {participant.name || <span className="opacity-50"></span>}
                  </span>
                  {showPoint && (
                    <div className="flex items-center gap-4">
                      <span className="text-sm">{point}</span>
                    </div>
                  )}
                </div>
              );
            }
          )}
        </div>
      )}

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

// 싱글엘리미네이션 대진표 생성 함수 분리
const buildSingleEliminationBracket = (
  group: Group,
  hasThirdPlaceMatch: boolean
): CustomMatch[] => {
  const initialMatches = generateSingleEliminationMatches(group);
  const uniqueRounds = [...new Set(initialMatches.map((m) => m.round))];
  if (hasThirdPlaceMatch) {
    initialMatches.push({
      id: uuidv4(),
      round: uniqueRounds.length,
      name: "3,4위전",
      participants: [
        {id: "", name: ""},
        {id: "", name: ""},
      ],
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
};

// 프리포올 대진표 생성 함수
const buildFreeForAllBracket = (
  group: Group,
  totalRounds: number
): CustomMatch[] => {
  const initialMatches = generateFreeForAllMatches(group, totalRounds);

  const uniqueRounds = [...new Set(initialMatches.map((m) => m.round))];
  const matchSettingNodes = uniqueRounds.map((round) => ({
    id: uuidv4(),
    bestOf: 1 as 1 | 3 | 5,
    round,
    name: `Round ${round}`,
    isSettingNode: true,
  }));
  return [...matchSettingNodes, ...initialMatches];
};

const updateMatches = (
  matches: CustomMatch[],
  data: { id: string; setting: MatchSetting }
) => {
  const {setting} = data;
  if (setting.isSettingNode) {
    return matches.map((match) =>
      match.round === setting.round
        ? {
          ...match,
          scheduledDate: setting.scheduledDate,
          scheduledTime: setting.scheduledTime,
          bestOf: setting.bestOf,
          venue: setting.venue,
          referee: setting.referee,
        }
        : match
    );
  } else {
    return matches.map((match) =>
      match.id === data.id
        ? {
          ...match,
          scheduledDate: setting.scheduledDate,
          scheduledTime: setting.scheduledTime,
          bestOf: setting.bestOf,
          venue: setting.venue,
          referee: setting.referee,
        }
        : match
    );
  }
};

// 6. 메인 컴포넌트
const BracketCreateEditBoard = ({
                                  stage,
                                  selectedGroupId,
                                  dispatch,
                                  onChangeGroupTab,
                                  onClickControls,
                                  onSaveBracket,
                                  onDeleteBracket,
                                  isFinishUpdate,
                                }: BracketBoardProps) => {
  const navigate = useNavigate();
  const {isExpand} = useExpandStore();
  const {selectedCompetition} = useCompetition();
  const [groups, setGroups] = useState<Group[]>(
    stage.bracket?.groups?.length && stage.bracket?.groups?.length > 1
      ? stage.bracket?.groups || []
      : [
        {
          id: stage.bracket?.groups?.[0]?.id || "default",
          name: "전체",
          competitors: stage.competitors || [],
          matches: [],
        },
      ]
  );
  const {data: refereeData} = getRefereesByCompetitionId(
    Number(selectedCompetition?.id)
  );
  const {mutateAsync: updateMatchMutate} = updateMatch();
  const {mutateAsync: updateRoundMutate} = updateRound();
  const {
    mutateAsync: updateMatchParticipantsBulkMutate,
    isSuccess: isUpdateMatchParticipantsBulkSuccess,
    isError: isUpdateMatchParticipantsBulkError,
  } = patchMatchParticipantsBulk();

  useEffect(() => {
    if (isFinishUpdate === false) return;

    const normalizedGroups = [
      {
        id: stage.bracket?.groups?.[0]?.id || "default",
        name: "전체",
        competitors: stage.competitors || [],
        matches: [],
      },
    ];

    const groups =
      stage.bracket?.groups?.length && stage.bracket?.groups?.length > 1
        ? stage.bracket?.groups || []
        : normalizedGroups;

    const newGroups = groups.map((group) => ({
      ...group,
      matches:
        stage.bracket?.format === "FREE_FOR_ALL"
          ? buildFreeForAllBracket(group, stage.totalRounds || 1)
          : buildSingleEliminationBracket(
            group,
            stage.bracket?.hasThirdPlaceMatch || false
          ),
    }));

    setGroups(newGroups);
    dispatch?.({type: "SET_GROUPS", payload: newGroups});
    onChangeGroupTab?.(newGroups?.[0]?.id || "");
  }, []);

  useEffect(() => {
    setGroups(stage.bracket?.groups || []);
  }, [stage.bracket?.groups]);

  useEffect(() => {
    if (
      stage.bracket?.format !== "SINGLE_ELIMINATION" ||
      !stage.bracket?.groups
    )
      return;

    const newGroups = stage.bracket.groups.map((group) => {
      const hasThirdPlace = group.matches.some((m) => m.isThirdPlace);
      let matches = group.matches.filter((m) => !m.isThirdPlace);
      if (stage.bracket?.hasThirdPlaceMatch && !hasThirdPlace) {
        matches = [...matches, createThirdPlaceMatch(group)];
      }
      return {...group, matches};
    });

    setGroups(newGroups);
  }, [stage.bracket?.hasThirdPlaceMatch]);

  useEffect(() => {
    if (isUpdateMatchParticipantsBulkSuccess) {
      toast.success("대진표가 수정되었습니다.");
      navigate("/bracket");
    }
  }, [isUpdateMatchParticipantsBulkSuccess]);

  useEffect(() => {
    if (isUpdateMatchParticipantsBulkError) {
      toast.error("대진표 수정에 실패했습니다.");
    }
  }, [isUpdateMatchParticipantsBulkError]);

  const createThirdPlaceMatch = (group: Group) => {
    // 마지막 라운드 번호를 구함
    const lastRound = Math.max(
      ...group.matches.map((m: CustomMatch) => m.round),
      1
    );
    return {
      id: uuidv4(),
      round: lastRound,
      name: "3,4위전",
      participants: [
        {id: "", name: ""},
        {id: "", name: ""},
      ],
      isThirdPlace: true,
    };
  };

  const handleMatchSubmit = useCallback(
    (data: { id: string; setting: MatchSetting }) => {
      if (isFinishUpdate === false) {
        if (data.setting.isSettingNode) {
          updateRoundMutate({
            roundId: Number(data.id.split("-")[0]),
            updateRoundDto: {
              bestOf: data.setting.bestOf as UpdateRoundDtoBestOf,
              refereeIds: data.setting.referee.map((referee) =>
                Number(referee)
              ),
              scheduledDate: dayjs(data.setting.scheduledDate).format(
                "YYYY-MM-DD"
              ),
              scheduledTime: data.setting.scheduledTime,
              venue: data.setting.venue,
            },
          });

          const matches = groups
            .flatMap((group) => group.matches)
            .filter(
              (match) =>
                !match.isSettingNode && match.round === data.setting.round
            );

          matches.forEach((match) => {
            updateMatchMutate({
              matchId: Number(match.id.split("-")[0]),
              updateMatchDto: {
                bestOf: data.setting.bestOf,
                refereeIds: data.setting.referee.map((referee) =>
                  Number(referee)
                ),
                scheduledDate: dayjs(data.setting.scheduledDate).format(
                  "YYYY-MM-DD"
                ),
                scheduledTime: data.setting.scheduledTime,
                venue: data.setting.venue,
              },
            });
          });
        } else {
          updateMatchMutate({
            matchId: Number(data.id.split("-")[0]),
            updateMatchDto: {
              bestOf: data.setting.bestOf,
              refereeIds: data.setting.referee.map((referee) =>
                Number(referee)
              ),
              scheduledDate: dayjs(data.setting.scheduledDate).format(
                "YYYY-MM-DD"
              ),
              scheduledTime: data.setting.scheduledTime || "",
              venue: data.setting.venue,
            },
          });
        }
      }

      const updatedGroups = groups.map((group) =>
        group.id === selectedGroupId
          ? {
            ...group,
            matches: updateMatches(group.matches, data),
          }
          : group
      );

      dispatch?.({type: "SET_GROUPS", payload: updatedGroups});

      setGroups((prevGroups: Group[]) =>
        prevGroups.map((group) =>
          group.id === selectedGroupId
            ? {...group, matches: updateMatches(group.matches, data)}
            : group
        )
      );

      toast.success("경기 정보가 저장되었습니다.");
    },
    [setGroups, selectedGroupId, groups]
  );

  const handleDeleteBracket = () => {
    onDeleteBracket?.();
  };

  const handleSaveBracket = async () => {
    if (isFinishUpdate === false) {
      const updateParticipantsDto: UpdateMatchParticipantsDto[] =
        groups.flatMap((group) =>
          group.matches
            .filter(
              (match) =>
                !match.isSettingNode &&
                (stage.bracket?.format === "SINGLE_ELIMINATION"
                  ? match.round === 1
                  : true)
            )
            .map((match) => ({
              matchId: Number(match.id.split("-")[0]),
              participants: (match.participants ?? [])
                .filter((participant) => participant.id !== "")
                .map((participant) => ({
                  rosterId: Number(participant.id),
                })),
            }))
        );

      updateMatchParticipantsBulkMutate(updateParticipantsDto);
      return;
    }

    const initializeBracketStructureDto: InitializeBracketStructureDto = {
      bracketGroups: groups.map((group, index) => {
        const roundsNodes = group.matches.filter(
          (match) => match.isSettingNode
        );
        const matchesNodes = group.matches.filter(
          (match) => !match.isSettingNode
        );

        const finalMatch = matchesNodes.find(
          (match) => match.round === roundsNodes.length
        );

        const rounds: BracketStructureRoundDto[] = roundsNodes.map((round) => ({
          bestOf: round.bestOf || 0,
          name: round.name || "",
          refereeIds: round.referee?.map((referee) => Number(referee)) || [],
          roundNumber: round.round,
          scheduledDate: dayjs(round.scheduledDate).format("YYYY-MM-DD"),
          scheduledTime: round.scheduledTime || "",
          tempId: round.id,
          venue: round.venue || "",
        }));

        const matches: BracketStructureMatchDto[] = matchesNodes.map(
          (match, index) => ({
            bestOf: match.bestOf || 0,
            matchNumber: index + 1,
            name: match.name,
            participants:
              match.participants &&
              match.participants.every((p) => p.name && p.id)
                ? match.participants.map((participant) => ({
                  rosterId: Number(participant.id),
                }))
                : [],
            prevTempMatchIds: match.isThirdPlace
              ? finalMatch?.prevMatchIds?.map((id) => id || "") || []
              : match.prevMatchIds && match.prevMatchIds.length > 0
                ? match.prevMatchIds.map((id) => id || "")
                : [],
            participantsCount: match.participants?.length || 0,
            refereeIds: match.referee?.map((referee) => Number(referee)) || [],
            scheduledDate: dayjs(match.scheduledDate).format("YYYY-MM-DD"),
            scheduledTime: match.scheduledTime || "",
            tempId: match.id,
            tempRoundId:
              roundsNodes.find((r) => r.round === match.round)?.id || "",
            venue: match.venue || "",
          })
        );

        return {
          id: Number(stage.bracket?.groups?.[index]?.id) || 0,
          rounds,
          matches,
        };
      }),
      formatOptions: {
        hasThirdPlaceMatch: stage.bracket?.hasThirdPlaceMatch || false,
      },
    };

    onSaveBracket?.(initializeBracketStructureDto);
  };

  const handleClickControls = (menu: CustomControlMenuType) => {
    onClickControls?.(menu);
  };

  const nodeTypes = {
    matchNode: MatchNode,
  };

  const {nodes, edges} =
    stage.bracket?.format === "FREE_FOR_ALL"
      ? useFreeForAllBracketNodesEdges(
        groups.find((group) => group.id === selectedGroupId)?.matches || []
      )
      : useSingleEliminationBracketNodesEdges(
        groups.find((group) => group.id === selectedGroupId)?.matches || []
      );

  // nodes 배열을 생성할 때, 각 노드의 data에 필요한 모든 정보 포함
  const nodesWithData = nodes.map((node) => ({
    ...node,
    data: {
      match: node.data,
      matches:
        groups.length > 1
          ? groups.find((group) => group.id === selectedGroupId)?.matches || []
          : groups[0].matches,
      stage,
      onSubmit: handleMatchSubmit,
      refereeData: refereeData,
    },
  }));

  return (
    <div
      className={`w-full bg-zinc-900 rounded-b-md rounded-tr-md ${
        isExpand ? "h-[calc(100vh-48px)]" : "h-[calc(100vh-104px)]"
      }`}
    >
      <div className="w-full h-full flex justify-between items-center">
        <ReactFlow
          nodes={nodesWithData}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.1}
          maxZoom={1.5}
          defaultViewport={{x: 0, y: 0, zoom: 0.45}}
          proOptions={{hideAttribution: true}}
          draggable={false}
          nodesDraggable={false}
          panOnDrag={true}
          connectOnClick={false}
          style={{height: "calc(100% - 100px)"}}
        >
          {/* <Background gap={32} color="#222" /> */}
          {groups.length > 1 && selectedGroupId && (
            <GroupToggleButton
              groups={groups}
              selectedGroupId={selectedGroupId}
              onChange={onChangeGroupTab}
            />
          )}
          {stage.bracket?.format === "SINGLE_ELIMINATION" && (
            <ThirdPlaceToggleButton
              stage={stage}
              onChange={() =>
                dispatch && dispatch({type: "TOGGLE_THIRD_PLACE"})
              }
            />
          )}
          <CustomControls
            menus={["SUFFLE", "ZOOM_IN", "ZOOM_OUT", "EXPAND"]}
            onClick={handleClickControls}
          />
          <DownloadButton/>
        </ReactFlow>
      </div>
      {!isExpand && (
        <div className="flex justify-end gap-2 mt-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                size="lg"
                variant="outline"
                className="bg-zinc-950 text-white cursor-pointer"
              >
                대진표 삭제
              </Button>
            </DialogTrigger>
            <DialogContent showCloseButton={false}>
              <DialogHeader>
                <DialogTitle>대진표를 삭제하시겠습니까?</DialogTitle>
                <DialogDescription>
                  대진표를 삭제하면 복구할 수 없어요.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" className="cursor-pointer">
                    취소
                  </Button>
                </DialogClose>
                <Button
                  className="bg-red-900 text-white cursor-pointer hover:bg-red-900/90"
                  onClick={handleDeleteBracket}
                >
                  삭제
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            size="lg"
            className="cursor-pointer"
            onClick={handleSaveBracket}
          >
            저장
          </Button>
        </div>
      )}
    </div>
  );
};

export default BracketCreateEditBoard;
