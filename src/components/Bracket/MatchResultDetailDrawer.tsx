import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "../ui/button";
import { type CustomMatch } from "@/pages/Bracket/BracketShowingBoard";
import {
  getSetMatchesResults,
  getSetParticipantStats,
  // getSetParticipantStats,
  patchSetParticipantStats,
} from "@/queries/match";
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Input } from "../ui/input";
import type { SetParticipantStatSaveDto } from "@/api/model";

interface MatchResultDetailDrawerProps {
  match?: CustomMatch;
  openDetailResultDialog?: boolean;
  onCloseDetailResultDialog?: (open: boolean) => void;
}

const MatchResultDetailDrawer = ({
  match,
  openDetailResultDialog = false,
  onCloseDetailResultDialog,
}: MatchResultDetailDrawerProps) => {
  const [setParticipantStats, setSetParticipantStats] = useState<
    {
      matchSetResultId: number;
      rosterId: number;
      name: string;
      payload: {
        gains: number | "";
        losses: number | "";
        penaltyShootout: number | "";
      };
    }[][]
  >([]);

  const { data: setMatchesResults } = getSetMatchesResults(
    Number(match?.id.split("-")[0]),
    openDetailResultDialog
  );

  const { data: setParticipantStatsQuery } = getSetParticipantStats(
    Number(match?.id.split("-")[0]),
    openDetailResultDialog
  );

  const { mutateAsync: patchSetParticipantStatsMutate } =
    patchSetParticipantStats();

  useEffect(() => {
    // match, setMatchesResults, setParticipantStatsQuery가 모두 undefined일 때는 아무것도 하지 않음
    if (
      !match ||
      !setMatchesResults ||
      setParticipantStatsQuery === undefined
    ) {
      return;
    }

    // setMatchesResults.setResults가 비어있으면 임시 데이터로 처리
    if (setMatchesResults.setResults.length === 0) {
      const matchResults = match?.bestOf || 1;
      const statPayload = match?.participants?.map((participant) =>
        Array.from({ length: matchResults }).map(() => ({
          matchSetResultId: 0,
          rosterId: Number(participant.id),
          name: participant.name,
          payload: { gains: 0, losses: 0, penaltyShootout: 0 },
        }))
      );
      setSetParticipantStats(statPayload ?? []);
      return;
    }

    const matchResults = match.bestOf || 1;

    // setParticipantStatsQuery.setResults가 비어있으면 0으로 초기화
    if (
      !setParticipantStatsQuery ||
      setParticipantStatsQuery.setResults.length === 0
    ) {
      const statPayload = match.participants?.map((participant) =>
        Array.from({ length: matchResults }).map((_, index) => ({
          matchSetResultId: setMatchesResults.setResults[index].id,
          rosterId: Number(participant.id),
          name: participant.name,
          payload: { gains: 0, losses: 0, penaltyShootout: 0 },
        }))
      );
      setSetParticipantStats(statPayload ?? []);
      return;
    }

    // setParticipantStatsQuery가 있을 때
    const setResults = setParticipantStatsQuery.setResults;
    const statPayload = match.participants?.map((participant) =>
      Array.from({ length: matchResults }).map((_, index) => {
        const found = setResults[index].setParticipantStats.find(
          (i) => i.participant.rosterId === Number(participant.id)
        );
        const {
          gains = 0,
          losses = 0,
          penaltyShootout = 0,
        } = (found?.statPayload as {
          gains: number;
          losses: number;
          penaltyShootout: number;
        }) || {};
        return {
          matchSetResultId: setMatchesResults.setResults[index].id,
          rosterId: Number(participant.id),
          name: participant.name,
          payload: { gains, losses, penaltyShootout },
        };
      })
    );
    setSetParticipantStats(statPayload ?? []);
  }, [match, setMatchesResults, setParticipantStatsQuery]);

  const handleChangeGains = (
    participantIdx: number,
    setIdx: number,
    value: string
  ) => {
    const newSetParticipantStats = [...setParticipantStats];
    // 빈 문자열이면 ""로, 아니면 숫자로 변환
    newSetParticipantStats[participantIdx][setIdx].payload.gains =
      value === "" ? "" : Number(value);
    setSetParticipantStats(newSetParticipantStats);
  };

  const handleChangeLosses = (
    participantIdx: number,
    setIdx: number,
    value: number
  ) => {
    const newSetParticipantStats = [...setParticipantStats];
    newSetParticipantStats[participantIdx][setIdx].payload.losses = value;
    setSetParticipantStats(newSetParticipantStats);
  };

  const handleChangePenaltyShootout = (
    participantIdx: number,
    setIdx: number,
    value: number
  ) => {
    const newSetParticipantStats = [...setParticipantStats];
    newSetParticipantStats[participantIdx][setIdx].payload.penaltyShootout =
      value;
    setSetParticipantStats(newSetParticipantStats);
  };

  const handleSave = () => {
    const setParticipantStatsPayload: SetParticipantStatSaveDto[] =
      setParticipantStats.flatMap((item) =>
        item.map((i) => ({
          matchSetResultId: i.matchSetResultId,
          rosterId: i.rosterId,
          statPayload: i.payload,
        }))
      );

    patchSetParticipantStatsMutate({
      matchId: Number(match?.id.split("-")[0]),
      saveSetParticipantStatsDto: {
        setParticipantStats: setParticipantStatsPayload,
      },
    });

    onCloseDetailResultDialog?.(false);
  };

  return (
    <Drawer
      open={openDetailResultDialog}
      onOpenChange={onCloseDetailResultDialog}
    >
      <DrawerContent>
        <div className="w-full">
          <DrawerHeader className="flex flex-col gap-2 items-start">
            <DrawerTitle>상세 결과</DrawerTitle>
            <DrawerDescription>
              세부 항목들을 추가해 상세 결과를 입력해주세요
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 pb-0">
            <div className="flex items-center justify-center space-x-4">
              {setParticipantStats.map((stat, idx) => (
                <div
                  key={idx}
                  className="rounded-md border border-zinc-800 w-full"
                >
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="flex items-center">
                        <TableHead className="flex flex-1 justify-start items-center">
                          {stat.map((i: any) => i.name)[0]}
                        </TableHead>
                        <TableHead className="flex flex-1 justify-start items-center ">
                          득
                        </TableHead>
                        <TableHead className="flex flex-1 justify-start items-center ">
                          실
                        </TableHead>
                        <TableHead className="flex flex-1 justify-start items-center ">
                          승부차기 결과
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stat.map(
                        (
                          i: {
                            matchSetResultId: number;
                            rosterId: number;
                            name: string;
                            payload: {
                              gains: number | "";
                              losses: number | "";
                              penaltyShootout: number | "";
                            };
                          },
                          setIdx: number
                        ) => (
                          <TableRow key={setIdx} className="flex items-center">
                            <TableCell className="flex-1 text-sm">
                              {`SET ${setIdx + 1}`}
                            </TableCell>
                            <TableCell className="flex-1 text-sm">
                              <Input
                                className="dark:bg-transparent hover:dark:bg-input/30 border-none"
                                type="number"
                                inputMode="numeric"
                                min={0}
                                value={i.payload.gains}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    (e.target as HTMLInputElement).blur();
                                  }
                                }}
                                onChange={(e) => {
                                  handleChangeGains(
                                    idx,
                                    setIdx,
                                    e.target.value
                                  );
                                }}
                              />
                            </TableCell>
                            <TableCell className="flex-1 text-sm">
                              <Input
                                className="dark:bg-transparent hover:dark:bg-input/30 border-none"
                                type="number"
                                inputMode="numeric"
                                min={0}
                                value={i.payload.losses}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    (e.target as HTMLInputElement).blur();
                                  }
                                }}
                                onChange={(e) => {
                                  handleChangeLosses(
                                    idx,
                                    setIdx,
                                    Number(e.target.value)
                                  );
                                }}
                              />
                            </TableCell>
                            <TableCell className="flex-1 text-sm">
                              <Input
                                className="dark:bg-transparent hover:dark:bg-input/30 border-none"
                                type="number"
                                inputMode="numeric"
                                min={0}
                                value={i.payload.penaltyShootout}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    (e.target as HTMLInputElement).blur();
                                  }
                                }}
                                onChange={(e) => {
                                  handleChangePenaltyShootout(
                                    idx,
                                    setIdx,
                                    Number(e.target.value)
                                  );
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          </div>
          <DrawerFooter className="w-full flex flex-row justify-end gap-2">
            <Button
              size="lg"
              className="w-24 cursor-pointer"
              onClick={() => {
                onCloseDetailResultDialog?.(false);
              }}
            >
              취소
            </Button>
            <DrawerClose asChild>
              <Button
                size="lg"
                variant="outline"
                className="w-24 cursor-pointer"
                onClick={handleSave}
              >
                저장
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default MatchResultDetailDrawer;
