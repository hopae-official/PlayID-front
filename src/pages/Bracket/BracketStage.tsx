import {useEffect, useMemo, useState} from "react";
import {Button} from "@/components/ui/button";
import {Tabs, TabsContent, TabsTrigger} from "@/components/ui/tabs";
import {TabsList} from "@radix-ui/react-tabs";
import {PlusIcon} from "lucide-react";
import {useLocation, useNavigate} from "react-router-dom";
import BracketShowingBoard, {BOARD_TYPE, type CustomMatch} from "./BracketShowingBoard";
import {type CustomControlMenuType} from "@/components/Bracket/CustomControls";
import {useSidebar} from "@/components/ui/sidebar";
import type {
  BracketGroup,
  BracketGroupOverviewMatchDto,
  BracketGroupOverviewResponseDto,
  CreateBracketDtoFormat,
  GameType,
  Match,
  MatchParticipant,
  MatchReferee,
  MatchSetParticipantStat,
  MatchSetResult,
  Round,
  RoundReferee,
  Stage,
} from "@/api/model";
import {getStage} from "@/queries/stage";
import {deleteBracket, getBracket} from "@/queries/bracket";
import {toast} from "sonner";
import {getBracketGroups} from "@/queries/bracketGroups";
import dayjs from "dayjs";
import {useExpandStore} from "@/stores/expand";
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
import {useSelectedStageStore} from "@/stores/stage";
import {useUpdateEffect} from "react-use";

interface BracketStageProps {
  game: GameType;
  stages: Stage[];
  onAddStage?: () => void;
  onDeleteStage?: (id: number) => void;
  onDeleteBracket?: () => void;
}

const BracketStage = ({
                        game,
                        stages,
                        onAddStage,
                        onDeleteStage,
                      }: BracketStageProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {isExpand} = useExpandStore();
  const {selectedStage, setSelectedStage} = useSelectedStageStore();
  const {data: stage, isError: isStageError} = getStage(
    Number(selectedStage ? selectedStage.id : stages[0].id)
  );
  const {
    data: bracketData,
    isError: isBracketError,
    isSuccess: isBracketSuccess,
  } = getBracket(Number(stage?.brackets?.[0]?.id));

  const bracket = isBracketSuccess ? bracketData : null;

  const [selectedGroupId, setSelectedGroupId] = useState(
    bracket?.groups?.[0]?.id || 0
  );
  const {data: bracketGroups, isError: isBracketGroupsError} =
    getBracketGroups(Number(selectedGroupId));
  const {
    mutateAsync: deleteBracketMutate,
    isSuccess: isDeleteBracketSuccess,
    isError: isDeleteBracketError,
  } = deleteBracket(true);

  const [originalStages, setOriginalStages] = useState<Stage[]>(stages);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const {toggleSidebar} = useSidebar();

  useEffect(() => {
    setOriginalStages(stages);

    if (selectedStage) return;
    setSelectedStage(stages[0]);
  }, []);

  useUpdateEffect(() => {
    setSelectedStage(stages[0]);
  }, [game, stages]);

  useEffect(() => {
    handleStageChange(originalStages, stages, selectedStage!, setSelectedStage);
    setOriginalStages(stages);
  }, [stages]);

  useEffect(() => {
    setSelectedGroupId(bracket?.groups?.[0]?.id || 0);
    localStorage.setItem(
      "selectedGroupId",
      bracket?.groups?.[0]?.id.toString() || "0"
    );
  }, [bracket]);

  useEffect(() => {
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
    }, 100);
  }, [isBracketSuccess]);

  useEffect(() => {
    if (isStageError) {
      toast.error("스테이지를 찾을 수 없습니다.");
      return;
    }

    if (isBracketError && !isDeleteBracketSuccess) {
      toast.error("대진표를 찾을 수 없습니다.");
      return;
    }

    if (isBracketGroupsError) {
      toast.error("그룹을 찾을 수 없습니다.");
      return;
    }
  }, [
    isStageError,
    isBracketError,
    isBracketGroupsError,
    isDeleteBracketSuccess,
    isDeleteBracketError,
  ]);

  const handleStageChange = (
    originalStages: Stage[],
    stages: Stage[],
    selectedStage: Stage,
    setSelectedStage: (stage: Stage) => void
  ) => {
    const prevIds = originalStages.map((s) => s.id);
    const nextIds = stages.map((s) => s.id);

    // 삭제
    if (prevIds.length > nextIds.length) {
      const deletedId = prevIds.find((id) => !nextIds.includes(id));
      if (deletedId === selectedStage.id) {
        const deletedIndex = prevIds.findIndex((id) => id === deletedId);
        const fallbackId =
          deletedIndex > 0 ? prevIds[deletedIndex - 1] : nextIds[0];
        const fallbackStage = stages.find((s) => s.id === fallbackId);
        if (fallbackStage) {
          setSelectedStage(fallbackStage);
          localStorage.setItem("selectedStageId", fallbackStage.id.toString());
        }
      }
    }
    // 추가
    else if (prevIds.length < nextIds.length) {
      const addedId = nextIds.find((id) => !prevIds.includes(id));
      const addedStage = stages.find((s) => s.id === addedId);
      if (addedStage) {
        setSelectedStage(addedStage);
        localStorage.setItem("selectedStageId", addedStage.id.toString());
      }
    }
  };

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
        if (bracket?.format === "FREE_FOR_ALL") {
          const freeForAllParticipantsWithRanking = match.matchParticipants
            .map((participant) => ({
              ...participant,
              ranking: match.matchSetResults[0].matchSetParticipantStats.find(
                (stat) => stat.matchParticipantId === Number(participant.id)
              )?.statPayload?.ranking as number,
            }))
            .sort((a, b) => (a.ranking || 0) - (b.ranking || 0));

          participants = freeForAllParticipantsWithRanking.map(toParticipant);
        } else {
          participants = match.matchParticipants.map(toParticipant);
        }

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
                    ? participant?.roster.player.user.name || ""
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

    return {
      id: selectedStage ? selectedStage.id.toString() : stages[0].id.toString(),
      name: selectedStage ? selectedStage.name : stages[0].name,
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
            competitors: group.participants?.map((participant) => ({
              id: participant.id.toString(),
              name:
                participant.roster.team?.name ||
                participant.roster.player?.user?.name ||
                "",
            })),
            matches: [...settingNodeMatches, ...gameNodeMatches],
          };
        }),
      },
    };
  }, [bracket, bracketGroups]);

  const handleAddStage = () => {
    onAddStage?.();
  };

  const handleDeleteStage = (id: number) => {
    onDeleteStage?.(id);
  };

  const handleChangeGroupTab = (groupId: string) => {
    setSelectedGroupId(Number(groupId));

    localStorage.setItem("selectedGroupId", groupId);
  };

  const handleClickControls = (menu: CustomControlMenuType) => {
    switch (menu) {
      case "EXPAND":
        toggleSidebar();
        break;
      case "EDIT":
        navigate(`/stage/${selectedStage?.id}/bracket/${bracket?.id}/edit`);
        break;
      case "DELETE":
        deleteBracketMutate(Number(stage?.brackets?.[0]?.id));
        break;
      default:
        break;
    }
  };

  // const suppressEdit =
  //   !location.pathname.includes("result") &&
  //   (convertToReactFlowStage?.bracket?.groups?.some((group) =>
  //     group.matches.some((match) => match.matchWinnerRosterId)
  //   ) ||
  //     convertToReactFlowStage?.bracket?.groups?.some((group) =>
  //       group.matches.some((match: CustomMatch) =>
  //         match.freeForAllResult?.setResult?.some((result) => result.point)
  //       )
  //     ));

  const suppressEdit = false;

  return (
    <div className="flex h-full flex-col gap-4">
      <Tabs
        className="h-full gap-0"
        value={selectedStage?.id.toString() || stages[0].id.toString()}
        onValueChange={(value) => {
          setSelectedStage(
            stages.find((stage) => stage.id.toString() === value) || stages[0]
          );
          localStorage.setItem("selectedStageId", value);
        }}
      >
        {!isExpand && (
          <TabsList className="flex flex-row items-center gap-0">
            {stages.map((stage) => (
              <div
                className={`min-w-[100px] h-[40px] flex flex-row items-center rounded-t-md cursor-pointer ${
                  selectedStage?.id === stage.id
                    ? "bg-[#18181B]"
                    : "bg-transparent"
                }`}
                key={stage.id}
              >
                <TabsTrigger
                  value={stage.id.toString()}
                  className={`
                  h-full
                  border-none
                  cursor-pointer
                  dark:bg-transparent
                  dark:data-[state=active]:bg-transparent
                  rounded-bl-none
                  rounded-br-none
                  py-2
                  px-4
               `}
                >
                  <span>{stage.name}</span>
                </TabsTrigger>
              </div>
            ))}
            <Button
              className="dark:p-0 dark:hover:bg-transparent cursor-pointer"
              variant="ghost"
              size="icon"
              onClick={handleAddStage}
            >
              <PlusIcon className="size-4"/>
            </Button>
          </TabsList>
        )}
        <TabsContent
          value={selectedStage?.id.toString() || stages[0].id.toString()}
          className="flex h-full flex-col items-center rounded-b-md rounded-tr-md"
        >
          {isLoading && (
            <div
              className="flex w-full h-full flex-col items-center justify-center gap-2 bg-zinc-900 rounded-b-md rounded-tr-md"/>
          )}

          {!isLoading && (
            <>
              {bracket ? (
                <BracketShowingBoard
                  stage={convertToReactFlowStage!}
                  selectedGroupId={selectedGroupId.toString()}
                  boardType={
                    location.pathname.includes("result")
                      ? BOARD_TYPE.RESULT
                      : BOARD_TYPE.SHOW
                  }
                  onChangeGroupTab={handleChangeGroupTab}
                  onClickControls={handleClickControls}
                  onDeleteStage={handleDeleteStage}
                />
              ) : (
                <div
                  className="flex w-full h-full flex-col items-center justify-center gap-2 bg-zinc-900 rounded-b-md rounded-tr-md">
                  <div className="text-2xl font-semibold">
                    대진표를 생성하시겠어요?
                  </div>
                  <Button
                    className="mt-6 cursor-pointer"
                    size="lg"
                    onClick={() => {
                      navigate(`/stage/${selectedStage?.id}/bracket/create`);
                    }}
                  >
                    대진표 생성
                  </Button>
                </div>
              )}
            </>
          )}
          {!location.pathname.includes("result") &&
            !isExpand &&
            selectedStage?.id !== stages[0].id && (
              <Dialog
                open={openDeleteDialog}
                onOpenChange={setOpenDeleteDialog}
              >
                <div className="w-full flex justify-end">
                  <DialogTrigger asChild className="mt-4">
                    <Button
                      size="lg"
                      variant="destructive"
                      className="bg-zinc-950 text-white cursor-pointer"
                    >
                      스테이지 삭제
                    </Button>
                  </DialogTrigger>
                </div>
                <DialogContent>
                  <DialogContent showCloseButton={false}>
                    <DialogHeader>
                      <DialogTitle>
                        {suppressEdit ? "대진표" : "스테이지"}를
                        삭제하시겠습니까?
                      </DialogTitle>
                      <DialogDescription className="whitespace-pre-line">
                        {suppressEdit
                          ? "스테이지를 삭제하기 전에 대진표를 먼저 삭제해야 해요. \n대진표를 삭제하면 경기결과를 포함한 모든 데이터를 복구할 수 없어요."
                          : "스테이지를 삭제하면 모든 대진표를 포함한 데이터를 복구할 수 없어요."}
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
                        onClick={
                          suppressEdit
                            ? () => {
                              deleteBracketMutate(
                                Number(stage?.brackets?.[0]?.id)
                              );
                              setOpenDeleteDialog(false);
                            }
                            : () => {
                              handleDeleteStage(Number(selectedStage?.id));
                              setOpenDeleteDialog(false);
                            }
                        }
                      >
                        삭제
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </DialogContent>
              </Dialog>
            )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BracketStage;
