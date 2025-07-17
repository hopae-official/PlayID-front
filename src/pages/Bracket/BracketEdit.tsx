import {useEffect, useMemo, useReducer, useRef, useState} from "react";
import {Button} from "@/components/ui/button";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {Label} from "@/components/ui/label";
import {ArrowLeftIcon, Asterisk, MinusIcon, PlusIcon} from "lucide-react";
import {useLocation, useNavigate, useParams} from "react-router-dom";
import {Switch} from "@/components/ui/switch";
import {v4 as uuidv4} from "uuid";
import {Input} from "@/components/ui/input";
import BracketCreateEditBoard from "./BracketCreateEditBoard";
import {toast} from "sonner";
import AssignCompetitorDialog from "@/components/Bracket/AssignCompetitorDialog";
import {useExpandStore} from "@/stores/expand";
import {createBracket, createBracketStructure, deleteBracket, getBracket,} from "@/queries/bracket";
import type {
  BracketGroup,
  BracketGroupOverviewMatchDto,
  BracketGroupOverviewResponseDto,
  CreateBracketDtoFormat,
  InitializeBracketStructureDto,
  Match,
  MatchParticipant,
  MatchReferee,
  MatchSetParticipantStat,
  MatchSetResult,
  Round,
  RoundReferee,
} from "@/api/model";
import {getAllRosters} from "@/queries/roster";
import dayjs from "dayjs";
import {getBracketGroups} from "@/queries/bracketGroups";
import {getStage, getStages} from "@/queries/stage";
import type {CustomControlMenuType} from "@/components/Bracket/CustomControls";
import type {CustomMatch} from "./BracketShowingBoard";

export type Competitor = {
  id: string;
  name: string;
};

export type Group = {
  id: string;
  name: string;
  competitors: Competitor[];
  rounds?: [];
  matches: CustomMatch[];
  // 프리포올 대진표 생성 시 사용
  totalRounds?: number;
};

export type CustomStage = {
  id: string;
  name: string;
  competitors?: Competitor[];
  bracket?: {
    id?: number;
    format?: CreateBracketDtoFormat;
    hasThirdPlaceMatch?: boolean;
    groups?: Group[];
  };
  // 프리포올 대진표 생성 시 사용
  totalRounds?: number;
};

export type Action =
  | { type: "SET_STAGE_NAME"; payload: string }
  | { type: "ADD_COMPETITOR"; payload: { rosters: Competitor[] } }
  | { type: "DELETE_COMPETITOR" }
  | {
  type: "SET_COMPETITORS_COUNT";
  payload: { count: number; rosters: Competitor[] };
}
  | { type: "ENSURE_MINIMUM_COMPETITORS" }
  | { type: "TOGGLE_THIRD_PLACE" }
  | {
  type: "INIT_GROUPS";
  payload: { enabled: boolean; rosters: Competitor[] };
}
  | { type: "ADD_GROUP" }
  | { type: "SET_GROUPS"; payload: Group[] }
  | { type: "DELETE_GROUP"; payload: string }
  | { type: "CHANGE_GROUP_NAME"; payload: { id: string; name: string } }
  | {
  type: "CHANGE_GROUP_COMPETITOR_COUNT";
  payload: { id: string; newCount: number; rosters: Competitor[] };
}
  | { type: "SET_BRACKET_TYPE"; payload: CreateBracketDtoFormat }
  | { type: "SET_TOTAL_ROUNDS"; payload: number }
  | { type: "SET_ASSIGN_COMPETITORS"; payload: Competitor[] }
  | { type: "SET_ASSIGN_GROUPS_COMPETITORS"; payload: Group[] }
  | { type: "DELETE_STAGE" }
  | { type: "SET_BRACKET_ID"; payload: number }
  | { type: "SET_BRACKET_GROUPS_ID"; payload: Group[] }
  | { type: "SUFFLE_BRACKET"; payload: string };

const stageReducer = (state: CustomStage, action: Action): CustomStage => {
  switch (action.type) {
    case "SET_STAGE_NAME":
      return {...state, name: action.payload};

    case "ADD_COMPETITOR":
      if (
        action.payload.rosters.length > 2 &&
        (state.competitors?.length || 0) >= action.payload.rosters.length
      ) {
        return state;
      }
      return {
        ...state,
        competitors: [
          ...(state.competitors || []),
          {id: uuidv4(), name: ""},
        ] as Competitor[],
      };

    case "DELETE_COMPETITOR":
      if ((state.competitors?.length || 0) <= 2) return state;
      return {
        ...state,
        competitors: state.competitors?.slice(0, -1) as Competitor[],
      };

    case "SET_COMPETITORS_COUNT": {
      const {count, rosters} = action.payload;
      if (isNaN(count)) return state;
      if (rosters.length > 2 && count > rosters.length) {
        return {...state, competitors: rosters};
      }
      const currentCompetitors = state.competitors;
      const newCompetitors = Array.from({length: count}, (_, i) => {
        return currentCompetitors?.[i] || {id: uuidv4(), name: ""};
      });
      return {...state, competitors: newCompetitors};
    }

    case "ENSURE_MINIMUM_COMPETITORS":
      if ((state.competitors?.length || 0) < 2) {
        const newCompetitors = [...(state.competitors || [])];
        while (newCompetitors.length < 2) {
          newCompetitors.push({id: uuidv4(), name: ""});
        }
        return {...state, competitors: newCompetitors};
      }
      return state;

    case "TOGGLE_THIRD_PLACE":
      return {
        ...state,
        bracket: {
          ...state.bracket,
          hasThirdPlaceMatch: !(state.bracket?.hasThirdPlaceMatch || false),
        },
      };

    case "INIT_GROUPS": {
      const {enabled, rosters} = action.payload;
      if (!enabled) {
        return {
          ...state,
          bracket: {
            ...state.bracket,
            groups: [],
          },
          competitors: rosters.map(() => ({id: uuidv4(), name: ""})),
        };
      }
      const splitIndex = Math.floor(rosters.length / 2);
      return {
        ...state,
        bracket: {
          ...state.bracket,
          groups: [
            {
              id: uuidv4(),
              name: "A",
              competitors:
                rosters.length > 2
                  ? Array.from({length: splitIndex}, () => ({
                    id: uuidv4(),
                    name: "",
                  }))
                  : [
                    {
                      id: uuidv4(),
                      name: "",
                    },
                    {
                      id: uuidv4(),
                      name: "",
                    },
                  ],
              matches: [],
            },
            {
              id: uuidv4(),
              name: "B",
              competitors:
                rosters.length > 2
                  ? Array.from({length: rosters.length - splitIndex}, () => ({
                    id: uuidv4(),
                    name: "",
                  }))
                  : [
                    {
                      id: uuidv4(),
                      name: "",
                    },
                    {
                      id: uuidv4(),
                      name: "",
                    },
                  ],
              matches: [],
            },
          ],
        },
        competitors: [],
      };
    }

    case "ADD_GROUP": {
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      if ((state.bracket?.groups?.length || 0) >= alphabet.length) return state;
      const name = `${alphabet[state.bracket?.groups?.length || 0]}`;
      return {
        ...state,
        bracket: {
          ...state.bracket,
          groups: [
            ...(state.bracket?.groups || []),
            {id: uuidv4(), name, competitors: [], matches: []},
          ],
        },
      };
    }

    case "SET_GROUPS": {
      return {
        ...state,
        bracket: {
          ...state.bracket,
          groups: action.payload.map((group) => ({
            ...group,
            matches: group.matches.map((match) => ({...match})),
          })),
        },
      };
    }

    case "DELETE_GROUP":
      return {
        ...state,
        bracket: {
          ...state.bracket,
          groups: (state.bracket?.groups || []).filter(
            (group) => group.id !== action.payload
          ),
        },
      };

    case "CHANGE_GROUP_NAME":
      return {
        ...state,
        bracket: {
          ...state.bracket,
          groups: (state.bracket?.groups || []).map((group) =>
            group.id === action.payload.id
              ? {...group, name: action.payload.name}
              : group
          ),
        },
      };

    case "CHANGE_GROUP_COMPETITOR_COUNT": {
      const {id, newCount, rosters} = action.payload;

      if (newCount > 1000) {
        toast.error("최대 1000개 이상의 팀을 추가할 수 없습니다.");
        return state;
      }

      const otherGroupsCompetitorsSum = (state.bracket?.groups || []).reduce(
        (sum, group) => {
          return group.id !== id ? sum + group.competitors.length : sum;
        },
        0
      );

      if (
        rosters.length > 2 &&
        otherGroupsCompetitorsSum + newCount > rosters.length
      ) {
        toast.error("참가 팀 수를 초과했습니다.");
        return state;
      }

      return {
        ...state,
        bracket: {
          ...state.bracket,
          groups: (state.bracket?.groups || []).map((group) =>
            group.id === id
              ? {
                ...group,
                competitors: Array.from({length: newCount}, () => ({
                  id: uuidv4(),
                  name: "",
                })),
              }
              : group
          ),
        },
      };
    }

    case "SET_BRACKET_TYPE":
      return {
        ...state,
        bracket: {
          ...state.bracket,
          format: action.payload,
        },
      };

    case "SET_TOTAL_ROUNDS":
      return {
        ...state,
        totalRounds: action.payload,
      };

    case "SET_ASSIGN_COMPETITORS":
      return {
        ...state,
        competitors: [
          ...action.payload,
          ...(state.competitors || []).slice(action.payload.length),
        ],
      };

    case "SET_ASSIGN_GROUPS_COMPETITORS": {
      return {
        ...state,
        bracket: {
          ...state.bracket,
          groups: action.payload.map((group) => ({
            ...group,
            competitors: group.competitors.map((competitor) => ({
              ...competitor,
              name: competitor.name || "",
            })),
          })),
        },
      };
    }

    case "DELETE_STAGE":
      return {
        ...state,
        bracket: {
          ...state.bracket,
          groups: [],
          hasThirdPlaceMatch: false,
          format: "SINGLE_ELIMINATION",
        },
        totalRounds: 1,
      };

    case "SET_BRACKET_ID":
      return {
        ...state,
        bracket: {...state.bracket, id: action.payload},
      };

    case "SET_BRACKET_GROUPS_ID":
      return {
        ...state,
        bracket: {...state.bracket, groups: action.payload},
      };

    case "SUFFLE_BRACKET": {
      if (
        !state.bracket ||
        !state.bracket.groups ||
        state.bracket.groups[0].matches.length === 0
      ) {
        return state;
      }

      // 참가자 추출 함수
      const getAllocatedParticipants = (groupId: string) =>
        state.bracket?.groups
          ?.find((group) => group.id === groupId)
          ?.matches?.filter(
          (match) => match.round === 1 && !match.isSettingNode
        )
          ?.flatMap((match) => match.participants || []);

      // 셔플 함수 피셔-예이츠 셔플 알고리즘
      const shuffleArray = <T, >(array: T[]): T[] => {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      };

      const groupId = action.payload;
      const allocatedParticipants = getAllocatedParticipants(groupId) || [];
      const shuffledParticipants = shuffleArray(allocatedParticipants);

      if (state.bracket?.format === "SINGLE_ELIMINATION") {
        let participantIdx = 0;
        return {
          ...state,
          bracket: {
            ...state.bracket,
            groups: state.bracket.groups.map((group) =>
              group.id === groupId
                ? {
                  ...group,
                  matches: group.matches.map((match) => {
                    if (match.round !== 1 || match.isSettingNode) {
                      return match;
                    }
                    const participants = shuffledParticipants.slice(
                      participantIdx,
                      participantIdx + 2
                    );
                    participantIdx += 2;
                    return {
                      ...match,
                      participants,
                    };
                  }),
                }
                : group
            ),
          },
        };
      }

      if (state.bracket?.format === "FREE_FOR_ALL") {
        return {
          ...state,
          bracket: {
            ...state.bracket,
            groups: state.bracket.groups.map((group) =>
              group.id === groupId
                ? {
                  ...group,
                  matches: group.matches.map((match) => {
                    if (match.isSettingNode) {
                      return match;
                    }
                    return {
                      ...match,
                      participants: shuffledParticipants,
                    };
                  }),
                }
                : group
            ),
          },
        };
      }

      return state;
    }

    default:
      return state;
  }
};

// 최소 남은 팀 수 체크 함수
const checkMinimumRemainingTeams = (
  rosters: Competitor[],
  groups: Group[]
): boolean => {
  if (
    rosters.length > 2 &&
    rosters.length === groups.reduce((acc, g) => acc + g.competitors.length, 0)
  ) {
    toast.error("확정 참가팀 수를 초과했습니다.");
    return false;
  }

  if (
    rosters.length > 2 &&
    rosters.length - groups.reduce((acc, g) => acc + g.competitors.length, 0) <
    2
  ) {
    toast.error("최소 2개 이상의 팀이 필요합니다.");
    return false;
  }
  return true;
};

const BracketEdit = () => {
  const navigate = useNavigate();
  const {stageId, bracketId} = useParams();
  const location = useLocation();
  const {isExpand} = useExpandStore();
  const stageNameRef = useRef<HTMLInputElement>(null);
  const [isCreateBracket, setIsCreateBracket] = useState<boolean>(true);
  const [stageNameError, setStageNameError] = useState<boolean>(false);
  const isEdit = location.pathname.includes("edit");

  const {
    mutateAsync: createBracketStructureMutate,
    isSuccess: isCreateBracketStructureSuccess,
    isError: isCreateBracketStructureError,
  } = createBracketStructure();

  const {mutateAsync: deleteBracketMutate} = deleteBracket();

  const {data: bracketQuery, isError: isBracketError} = getBracket(
    Number(bracketId)
  );
  const bracket = isBracketError ? null : bracketQuery;

  const {data: stageQuery} = getStage(Number(bracketQuery?.stageId));
  const {data: stages} = getStages(
    stageQuery?.competitionId || 1,
    stageQuery?.gameTypeId || 1
  );
  const {data: rosters} = getAllRosters({
    limit: 100,
    // gameTypeId: Number(params.id),
    gameTypeId: stageQuery?.gameTypeId || 1,
  });

  const [selectedGroupId, setSelectedGroupId] = useState(
    stageQuery?.brackets?.[0]?.groups?.[0]?.id.toString()
  );

  useEffect(() => {
    setSelectedGroupId(stageQuery?.brackets?.[0]?.groups?.[0]?.id.toString());
  }, [stageQuery]);

  const {data: bracketGroups} = getBracketGroups(Number(selectedGroupId));

  const createSettingNodeMatches = (rounds: Round[]) =>
    rounds.map((round) => ({
      id: `${round.id}-setting`,
      round: round.roundNumber,
      name:
        round.roundNumber === rounds.length
          ? "Final Round"
          : `Round ${round.roundNumber}`,
      scheduledDate: dayjs(round.scheduledDate).toDate(),
      scheduledTime: round.scheduledTime || "",
      bestOf: round.bestOf as 1 | 3 | 5,
      venue: round.venue || "",
      referee: round.roundReferees.map((ref: RoundReferee) =>
        ref.refereeId.toString()
      ),
      isSettingNode: true,
    }));

  const createGameNodeMatches = (
    rounds: Round[],
    matches: Match[],
    bracketGroups: BracketGroupOverviewResponseDto
  ): CustomMatch[] =>
    matches.map((match: Match) => {
      // 참가자 변환 함수
      const toParticipant = (participant: MatchParticipant) => ({
        id: participant.rosterId.toString(),
        name:
          participant.roster.player?.user?.name ||
          participant.roster.team?.name ||
          "",
      });

      let participants: { id: string; name: string }[] = [];

      if (match.matchParticipants.length > 0) {
        participants = match.matchParticipants.map(toParticipant);
        // 1명만 있을 때 빈 슬롯 추가
        if (participants.length === 1) {
          participants.push({id: "", name: ""});
        }
      } else if (match.participantsCount && match.participantsCount > 0) {
        participants = Array.from({length: match.participantsCount}, () => ({
          id: "",
          name: "",
        }));
      }

      return {
        id: `${match.id}-game`,
        round:
          rounds.find((r: Round) => r.id === match.roundId)?.roundNumber || 0,
        name: match.name || "",
        participants,
        prevMatchIds: bracketGroups?.matches
          .find((m: BracketGroupOverviewMatchDto) => m.id === match.id)
          ?.prevMatchIds?.map((id: number) => `${id}-game`),
        scheduledDate: dayjs(match.scheduledDate).toDate(),
        scheduledTime: match.scheduledTime || "",
        bestOf: match.bestOf as 1 | 3 | 5,
        venue: match.venue || "",
        referee: match.matchReferees.map((ref: MatchReferee) =>
          ref.refereeId.toString()
        ),
        isSettingNode: false,
        matchWinnerRosterId: match.matchParticipants
          .find((p: MatchParticipant) => p.isWinner)
          ?.rosterId?.toString(),
        isThirdPlace: match.name === "3,4위전",
        // singleElimination 결과
        ...(bracket?.format === "SINGLE_ELIMINATION" && {
          singleEliminationResult: {
            resultMemo: match.resultMemo || "",
            setResult: match.matchSetResults.map((set: MatchSetResult) => ({
              winnerRosterId: set.winnerRosterId?.toString(),
              screenshotUrl: set.screenshotUrl || "",
            })),
          },
        }),
        // freeForAll 결과
        ...(bracket?.format === "FREE_FOR_ALL" && {
          freeForAllResult: {
            resultMemo: match.resultMemo || "",
            screenshotUrl: match.matchSetResults[0].screenshotUrl || "",
            setResult: match.matchSetResults[0].matchSetParticipantStats.map(
              (stat: MatchSetParticipantStat) => {
                const participant = match.matchParticipants.find(
                  (participant) => participant.id === stat.matchParticipantId
                );
                return {
                  id: participant?.rosterId.toString(),
                  name: participant?.roster.player
                    ? participant?.roster.player.user?.name || ""
                    : participant?.roster.team
                      ? participant?.roster.team?.name || ""
                      : "",
                  point: stat.statPayload?.point as number,
                  ranking: stat.statPayload?.ranking as number,
                };
              }
            ),
          },
        }),
      };
    });

  const convertToReactFlowStage = useMemo(() => {
    if (!bracket || !bracketGroups) return;

    const rounds =
      bracket.groups.find((group) => group.id === Number(selectedGroupId))
        ?.rounds || [];

    //참가자 배정 없이 대진표 만들 시 참가자 수 만큼 임의의 참가자 만들어줘야 수정 시 재배정 가능
    const competitorCountSum = rounds
      .find((round) => round.roundNumber === 1)
      ?.matches.reduce((acc, match) => acc + (match.participantsCount || 0), 0);

    return {
      id: stageQuery?.id.toString(),
      name: stageQuery?.name,
      bracket: {
        id: bracket.id,
        format: bracket.format as CreateBracketDtoFormat,
        hasThirdPlaceMatch: !!bracket.formatOptions?.hasThirdPlaceMatch,
        groups: bracket.groups.map((group: BracketGroup) => {
          const rounds = group.rounds || [];
          const matches = rounds.flatMap((round: Round) => round.matches);
          const settingNodeMatches: CustomMatch[] =
            createSettingNodeMatches(rounds);
          const gameNodeMatches: CustomMatch[] = createGameNodeMatches(
            rounds,
            matches,
            bracketGroups
          );

          return {
            id: group.id.toString(),
            name: group.name,
            competitors:
              group.participants && group.participants.length > 0
                ? group.participants.map((participant) => ({
                  id: participant.id.toString(),
                  name:
                    participant.roster.team?.name ||
                    participant.roster.player?.user?.name ||
                    "",
                }))
                : Array.from({length: competitorCountSum || 0}, (_) => ({
                  id: uuidv4(),
                  name: "",
                })),
            matches: [...settingNodeMatches, ...gameNodeMatches],
          };
        }),
      },
      totalRounds: bracket.format === "FREE_FOR_ALL" ? rounds.length : 1,
    };
  }, [bracket, bracketGroups]);

  const initialState: CustomStage = {
    ...(convertToReactFlowStage as CustomStage),
  };

  const [stage, dispatch] = useReducer(stageReducer, initialState);
  const [isFinishUpdate, setIsFinishUpdate] = useState<boolean>(
    isEdit ? false : true
  );

  const {
    mutateAsync: createBracketMutate,
    isSuccess,
    isError,
  } = createBracket();

  useEffect(() => {
    if (isSuccess) {
      setIsCreateBracket(true);
    }
    if (isError) {
      toast.error("대진표 생성에 실패했습니다.");
    }
  }, [isSuccess, isError]);

  useEffect(() => {
    if (isCreateBracketStructureSuccess) {
      navigate(`/bracket`);
    }
    if (isCreateBracketStructureError) {
      toast.error("대진표 저장에 실패했습니다.");
    }
  }, [isCreateBracketStructureSuccess, isCreateBracketStructureError]);

  const handleCreateBracket = async () => {
    if (stage.name === "") {
      setStageNameError(true);
      stageNameRef.current?.focus();
      return;
    }

    if (stage.bracket?.groups?.length || 0 > 0) {
      handleChangeGroupTab(stage.bracket?.groups?.[0]?.id || "");
    }

    const response = await createBracketMutate({
      format: stage.bracket?.format || "SINGLE_ELIMINATION",
      stageId: Number(stageId),
      stageName: stage.name,
      groups:
        (stage.bracket?.groups?.length || 0) > 0
          ? stage.bracket?.groups?.map((group) => ({
          name: group.name,
        })) || []
          : [
            {
              name: "default",
            },
          ],
    });

    if (response) {
      dispatch({type: "SET_BRACKET_ID", payload: response.bracketId});

      if (stage.bracket?.groups?.length || 0 > 1) {
        dispatch({
          type: "SET_BRACKET_GROUPS_ID",
          payload:
            stage.bracket?.groups?.map((group, idx) => ({
              id: response.bracketGroups[idx].id.toString(),
              name: group.name,
              competitors: group.competitors,
              matches: group.matches,
            })) || [],
        });
      } else {
        dispatch({
          type: "SET_BRACKET_GROUPS_ID",
          payload: response.bracketGroups.map((group) => ({
            id: group.id.toString(),
            name: group.name,
            competitors: stage.competitors || [],
            matches: [],
          })),
        });
      }
    }
  };

  const handleAssignBracket = (competitors: Competitor[]) => {
    // competitors를 2명씩 나누는 함수
    const chunkArray = (array: Competitor[], size: number) => {
      const result = [];
      for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
      }
      return result;
    };

    if (stage.bracket?.groups?.length || 0 > 1) {
      // 2명씩 나누기
      const chunkedCompetitors = chunkArray(competitors, 2);

      if (stage.bracket?.format === "SINGLE_ELIMINATION") {
        dispatch({
          type: "SET_ASSIGN_GROUPS_COMPETITORS",
          payload: (stage.bracket?.groups || []).map((group) =>
            group.id === selectedGroupId
              ? {
                ...group,
                matches: (() => {
                  let chunkIdx = 0;
                  return group.matches.map((match) => {
                    if (match.isSettingNode || match.round !== 1) {
                      // round 1이 아니면 빈 배열 할당
                      return match;
                    }
                    const participants = chunkedCompetitors[chunkIdx] || [];
                    chunkIdx += 1;
                    return {...match, participants};
                  });
                })(),
              }
              : group
          ),
        });
      } else if (stage.bracket?.format === "FREE_FOR_ALL") {
        dispatch({
          type: "SET_ASSIGN_GROUPS_COMPETITORS",
          payload: (stage.bracket?.groups || []).map((group) =>
            group.id === selectedGroupId
              ? {
                ...group,
                matches: group.matches.map((match) => ({
                  ...match,
                  participants: competitors,
                })),
              }
              : group
          ),
        });
      }
    } else {
      dispatch({type: "SET_ASSIGN_COMPETITORS", payload: competitors});
    }
  };

  const handleChangeGroupTab = (groupId: string) => {
    setSelectedGroupId(groupId);
  };

  const handleSaveBracket = async (
    initializeBracketStructureDto: InitializeBracketStructureDto
  ) => {
    await createBracketStructureMutate({
      bracketId: stage.bracket?.id || 0,
      initializeBracketStructureDto,
    });
  };

  const handleDeleteBracket = () => {
    deleteBracketMutate(stage.bracket?.id || 0);
    setIsCreateBracket(false);
    setIsFinishUpdate(true);
    dispatch({type: "DELETE_STAGE"});
    dispatch({
      type: "INIT_GROUPS",
      payload: {
        enabled: false,
        rosters:
          rosters && rosters.data
            ? rosters.data.map((roster) => ({
              id: roster.id.toString(),
              name: roster.team?.name || "",
            }))
            : [],
      },
    });
    setSelectedGroupId(undefined);
  };

  const handleClickControls = (menu: CustomControlMenuType) => {
    switch (menu) {
      case "SUFFLE":
        dispatch({
          type: "SUFFLE_BRACKET",
          payload: selectedGroupId || "",
        });
        break;
    }
  };

  return (
    <div className="min-h-svh flex px-8 py-6 space-x-6">
      <div
        className={`w-full max-w-[320px] flex flex-col gap-4 ${
          isExpand && "hidden"
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="flex flex-col flex-1">
            <Button
              variant="ghost"
              size="icon"
              className="cursor-pointer"
              onClick={() => navigate("/bracket")}
            >
              <ArrowLeftIcon className="size-4"/>
            </Button>
            <div className="mt-8">
              <Label className="text-sm font-semibold flex items-center gap-1">
                <Asterisk className="size-3 text-red-600"/>
                스테이지명
              </Label>
              <Input
                disabled={isCreateBracket}
                ref={stageNameRef}
                className={`w-full h-10 border-zinc-700 mt-2 ${
                  stageNameError
                    ? "focus-visible:border-red-600 focus-visible:ring-red-600 focus-visible:ring-[1px]"
                    : ""
                }`}
                value={stage.name}
                onChange={(e) => {
                  dispatch({type: "SET_STAGE_NAME", payload: e.target.value});
                  setStageNameError(false);
                }}
                placeholder="ex) 예선전"
              />
              {stageNameError && (
                <Label className="text-sm text-red-600 mt-2">
                  스테이지명을 입력해 주세요
                </Label>
              )}
            </div>

            {stage.bracket?.groups?.length! < 2 && (
              <div className="flex flex-row justify-between mt-6 text-sm font-semibold">
                <div className="flex flex-row items-center gap-1">
                  <span className="text-sm font-semibold mr-4">참가 팀</span>
                  <Button
                    className="cursor-pointer"
                    variant="outline"
                    size="icon"
                    onClick={() => dispatch({type: "DELETE_COMPETITOR"})}
                    disabled={
                      isCreateBracket || (stage.competitors?.length || 0) <= 2
                    }
                  >
                    <MinusIcon className="size-4"/>
                  </Button>
                  <Input
                    className="w-14 h-10 text-sm font-semibold text-center"
                    value={stage.competitors?.length || 0}
                    disabled={isCreateBracket}
                    onChange={(e) =>
                      dispatch({
                        type: "SET_COMPETITORS_COUNT",
                        payload: {
                          count: Number(e.target.value),
                          rosters:
                            rosters && rosters.data
                              ? rosters.data.map((roster) => ({
                                id: roster.id.toString(),
                                name: roster.team?.name || "",
                              }))
                              : [],
                        },
                      })
                    }
                    onBlur={() =>
                      dispatch({type: "ENSURE_MINIMUM_COMPETITORS"})
                    }
                  />
                  <Button
                    className="cursor-pointer"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      dispatch({
                        type: "ADD_COMPETITOR",
                        payload: {
                          rosters:
                            rosters && rosters.data
                              ? rosters.data.map((roster) => ({
                                id: roster.id.toString(),
                                name: roster.team?.name || "",
                              }))
                              : [],
                        },
                      })
                    }
                    disabled={
                      isCreateBracket ||
                      (rosters &&
                        rosters.data &&
                        rosters.data.length > 2 &&
                        (stage.competitors?.length || 0) >= rosters.data.length)
                    }
                  >
                    <PlusIcon className="size-4"/>
                  </Button>
                </div>
                <div className="flex flex-row items-center gap-1 text-sm font-semibold">
                  {rosters && rosters.data && rosters.data.length === 0 ? null : (
                    <>
                      <span>확정 참가팀수 :</span>
                      <span className="text-blue-500">
                        {rosters && rosters.data && rosters.data.length}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}

            <RadioGroup
              className="grid grid-cols-2 gap-4 mt-6"
              value={stage.bracket?.format || "SINGLE_ELIMINATION"}
              disabled={isCreateBracket}
              onValueChange={(value) =>
                dispatch({
                  type: "SET_BRACKET_TYPE",
                  payload: value as CreateBracketDtoFormat,
                })
              }
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem
                  value="SINGLE_ELIMINATION"
                  id="single-elimination"
                  className="cursor-pointer"
                />
                <Label htmlFor="single-elimination" className="cursor-pointer">
                  싱글 엘리미네이션
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem
                  value="FREE_FOR_ALL"
                  id="free-for-all"
                  className="cursor-pointer"
                />
                <Label htmlFor="free-for-all" className="cursor-pointer">
                  프리포올
                </Label>
              </div>
            </RadioGroup>
            <div className="grid grid-cols-2 gap-4 mt-6">
              {stage.bracket?.format === "SINGLE_ELIMINATION" && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="third-place"
                    className="cursor-pointer"
                    checked={stage.bracket?.hasThirdPlaceMatch || false}
                    disabled={isCreateBracket}
                    onCheckedChange={() =>
                      dispatch({type: "TOGGLE_THIRD_PLACE"})
                    }
                  />
                  <Label htmlFor="third-place">3-4위전</Label>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Switch
                  id="group"
                  className="cursor-pointer"
                  checked={(stage.bracket?.groups?.length || 0) > 1}
                  disabled={isCreateBracket}
                  onCheckedChange={(enabled) => {
                    dispatch({
                      type: "INIT_GROUPS",
                      payload: {
                        enabled,
                        rosters:
                          rosters && rosters.data
                            ? rosters.data.map((roster) => ({
                              id: roster.id.toString(),
                              name: roster.team?.name || "",
                            }))
                            : [],
                      },
                    });
                  }}
                />
                <Label htmlFor="group">조 편성</Label>
              </div>
            </div>
            {(stage.bracket?.groups?.length || 0) > 1 && (
              <div className="flex flex-col mt-10">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-row items-center justify-between">
                    <div className="flex flex-row items-center gap-4">
                      <Label className="text-sm font-semibold">편성조</Label>
                      <div className="flex flex-row items-center gap-4">
                        <Button
                          className="cursor-pointer"
                          variant="outline"
                          size="icon"
                          disabled={
                            (stage.bracket?.groups?.length || 0) <= 2 ||
                            isCreateBracket
                          }
                          onClick={() =>
                            dispatch({
                              type: "DELETE_GROUP",
                              payload:
                                stage.bracket?.groups?.[
                                (stage.bracket?.groups?.length || 0) - 1
                                  ]?.id || "",
                            })
                          }
                        >
                          <MinusIcon className="size-4"/>
                        </Button>
                        <span className="text-sm font-semibold">
                          {stage.bracket?.groups?.length || 0}
                        </span>
                        <Button
                          className="cursor-pointer"
                          variant="outline"
                          size="icon"
                          disabled={isCreateBracket}
                          onClick={() => {
                            if (
                              !checkMinimumRemainingTeams(
                                rosters && rosters.data
                                  ? rosters.data.map((roster) => ({
                                    id: roster.id.toString(),
                                    name: roster.team?.name || "",
                                  }))
                                  : [],
                                stage.bracket?.groups || []
                              )
                            ) {
                              return;
                            }
                            dispatch({type: "ADD_GROUP"});
                          }}
                        >
                          <PlusIcon className="size-4"/>
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-row items-center gap-1 text-sm font-semibold">
                      {rosters && rosters.data && rosters.data.length === 0 ? (
                        <RosterUnconfirmedDialog/>
                      ) : (
                        <>
                          <span>확정 참가팀 수 :</span>
                          <span className="text-blue-500">
                            {rosters && rosters.data && rosters.data.length}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {stage.bracket?.groups?.map((group, index) => (
                    <div
                      key={group.id}
                      className="flex flex-row items-center gap-1"
                    >
                      <Label className="w-12 text-sm font-semibold">
                        {`${index + 1}조`}
                      </Label>
                      <Input
                        className="w-24 h-10 text-sm"
                        value={group.name}
                        onChange={(e) =>
                          dispatch({
                            type: "CHANGE_GROUP_NAME",
                            payload: {id: group.id, name: e.target.value},
                          })
                        }
                        disabled={isCreateBracket}
                      />
                      <Input
                        className="w-24 h-10 text-sm"
                        value={group.competitors?.length || 0}
                        disabled={isCreateBracket}
                        onChange={(e) =>
                          dispatch({
                            type: "CHANGE_GROUP_COMPETITOR_COUNT",
                            payload: {
                              id: group.id,
                              newCount: parseInt(e.target.value, 10),
                              rosters:
                                rosters && rosters.data
                                  ? rosters.data.map((roster) => ({
                                    id: roster.id.toString(),
                                    name: roster.team?.name || "",
                                  }))
                                  : [],
                            },
                          })
                        }
                        onBlur={() => {
                          if ((group.competitors?.length || 0) < 2) {
                            toast.error("최소 2개 이상의 팀이 필요합니다.");
                            dispatch({
                              type: "CHANGE_GROUP_COMPETITOR_COUNT",
                              payload: {
                                id: group.id,
                                newCount: 2,
                                rosters:
                                  rosters && rosters.data
                                    ? rosters.data.map((roster) => ({
                                      id: roster.id.toString(),
                                      name: roster.team?.name || "",
                                    }))
                                    : [],
                              },
                            });
                          }
                        }}
                      />
                      <Button
                        className="w-8 h-8 cursor-pointer"
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          dispatch({type: "DELETE_GROUP", payload: group.id})
                        }
                        disabled={
                          (stage.bracket?.groups?.length || 0) <= 2 ||
                          isCreateBracket
                        }
                      >
                        <MinusIcon className="size-4"/>
                      </Button>
                      {index === (stage.bracket?.groups?.length || 0) - 1 && (
                        <Button
                          className="w-8 h-8 cursor-pointer"
                          variant="outline"
                          size="icon"
                          disabled={isCreateBracket}
                          onClick={() => {
                            if (
                              !checkMinimumRemainingTeams(
                                rosters && rosters.data
                                  ? rosters.data.map((roster) => ({
                                    id: roster.id.toString(),
                                    name: roster.team?.name || "",
                                  }))
                                  : [],
                                stage.bracket?.groups || []
                              )
                            ) {
                              return;
                            }
                            dispatch({type: "ADD_GROUP"});
                          }}
                        >
                          <PlusIcon className="size-4"/>
                        </Button>
                      )}
                    </div>
                  ))}
                  <div className="flex flex-row items-center gap-1 text-sm font-semibold">
                    <Label className="w-12">합계</Label>
                    <span className="w-24"/>
                    <span className="pl-3">
                      {(stage.bracket?.groups || []).reduce(
                        (acc, g) => acc + (g.competitors?.length || 0),
                        0
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {stage.bracket?.format === "FREE_FOR_ALL" && stage.totalRounds && (
              <div className="flex flex-col flex-1 mt-10">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-row items-center justify-between">
                    <div className="flex flex-row items-center gap-4">
                      <Label className="text-sm font-semibold">라운드</Label>
                      <div className="flex flex-row items-center gap-4">
                        <Button
                          className="cursor-pointer"
                          variant="outline"
                          size="icon"
                          disabled={stage.totalRounds <= 1 || isCreateBracket}
                          onClick={() =>
                            dispatch({
                              type: "SET_TOTAL_ROUNDS",
                              payload: stage.totalRounds
                                ? stage.totalRounds - 1
                                : 0,
                            })
                          }
                        >
                          <MinusIcon className="size-4"/>
                        </Button>
                        <span className="text-sm font-semibold">
                          {stage.totalRounds}
                        </span>
                        <Button
                          className="cursor-pointer"
                          variant="outline"
                          size="icon"
                          disabled={isCreateBracket}
                          onClick={() => {
                            dispatch({
                              type: "SET_TOTAL_ROUNDS",
                              payload: stage.totalRounds
                                ? stage.totalRounds + 1
                                : 1,
                            });
                          }}
                        >
                          <PlusIcon className="size-4"/>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          {isCreateBracket && (
            <AssignCompetitorDialog
              stage={stage}
              stages={stages}
              group={stage.bracket?.groups?.find(
                (group) => group.id === selectedGroupId
              )}
              selectedGroupId={selectedGroupId}
              place={
                (stage.bracket?.groups?.length || 0) > 0
                  ? stage.bracket?.groups?.find(
                  (group) => group.id === selectedGroupId
                )?.competitors?.length || 0
                  : stage.competitors?.length || 0
              }
              rosters={
                rosters && rosters.data
                  ? rosters.data.map((roster) =>
                    roster.team
                      ? {
                        rosterId: roster.id.toString(),
                        name: roster.team?.name || "",
                        isTeam: true,
                      }
                      : {
                        rosterId: roster.id.toString(),
                        name: roster.player?.user?.name || "",
                        gameId: roster.player?.gameId || "",
                        isTeam: false,
                      }
                  )
                  : []
              }
              onAssignBracket={handleAssignBracket}
            />
          )}
        </div>
      </div>
      {isCreateBracket ? (
        <BracketCreateEditBoard
          stage={stage}
          isFinishUpdate={isFinishUpdate}
          dispatch={dispatch}
          selectedGroupId={selectedGroupId}
          onChangeGroupTab={handleChangeGroupTab}
          onSaveBracket={handleSaveBracket}
          onDeleteBracket={handleDeleteBracket}
          onClickControls={handleClickControls}
        />
      ) : (
        <div className="w-full bg-zinc-900 rounded-md shadow-sm flex items-center justify-center">
          <div className="flex flex-col gap-10">
            <Label className="text-xl text-zinc-400">
              스테이지명을 입력하고 대진표를 생성해 주세요
            </Label>
            <Button
              className="w-full font-semibold cursor-pointer"
              size="lg"
              onClick={handleCreateBracket}
            >
              대진 생성
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BracketEdit;
