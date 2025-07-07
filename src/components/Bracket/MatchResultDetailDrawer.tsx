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
import { toast } from "sonner";

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
      rosterId: string;
      name: string;
      payload: { gains: number; losses: number; penaltyShootout: string };
    }[][]
  >([]);

  const { data: setMatchesResults } = getSetMatchesResults(
    Number(match?.id.split("-")[0]),
    openDetailResultDialog
  );

  // const { data: setParticipantStatsQuery } = getSetParticipantStats(
  //   Number(match?.id.split("-")[0]),
  //   openDetailResultDialog
  // );

  const { mutateAsync: patchSetParticipantStatsMutate } =
    patchSetParticipantStats();

  useEffect(() => {
    const matchResults = match?.bestOf || 1;

    if (setMatchesResults && setMatchesResults.setResults.length > 0 && match) {
      const statPayload = match.participants?.map((participant) =>
        Array.from({ length: matchResults }).map((_, index) => ({
          matchSetResultId: setMatchesResults.setResults[index].id,
          rosterId: participant.id,
          name: participant.name,
          payload: {
            gains: 0,
            losses: 0,
            penaltyShootout: "",
          },
        }))
      );
      setSetParticipantStats(statPayload ?? []);
    } else {
      // 임시 데이터 처리
      const statPayload = match?.participants?.map((participant) =>
        Array.from({ length: matchResults }).map((_) => ({
          matchSetResultId: 0,
          rosterId: participant.id,
          name: participant.name,
          payload: {
            gains: 0,
            losses: 0,
            penaltyShootout: "",
          },
        }))
      );

      setSetParticipantStats(statPayload ?? []);
    }
  }, [match, setMatchesResults]);

  const handleChangeGains = (
    participantIdx: number,
    setIdx: number,
    value: number
  ) => {
    const newSetParticipantStats = [...setParticipantStats];
    newSetParticipantStats[participantIdx][setIdx].payload.gains = value;
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

  const penaltyShootoutRegex = /^[승패]+$/;

  const handleChangePenaltyShootout = (
    participantIdx: number,
    setIdx: number,
    value: string
  ) => {
    if (!penaltyShootoutRegex.test(value) && value !== "") {
      toast.error("승부차기 결과는 승 또는 패로 입력해주세요");
      return;
    }

    const newSetParticipantStats = [...setParticipantStats];
    newSetParticipantStats[participantIdx][setIdx].payload.penaltyShootout =
      value;
    setSetParticipantStats(newSetParticipantStats);
  };

  const handleSave = () => {
    patchSetParticipantStatsMutate({
      matchId: Number(match?.id.split("-")[0]),
      saveSetParticipantStatsDto: {
        setParticipantStats: setParticipantStats.flatMap((item) =>
          item.map((result: any) => ({
            matchSetResultId: result.matchSetResultId,
            rosterId: result.rosterId,
            statPayload: {
              gains: result.gains,
              losses: result.losses,
              penaltyShootout: result.penaltyShootout,
            },
          }))
        ),
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
                          {stat.map((result: any) => result.name)[0]}
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
                      {stat.map((result: any, setIdx: number) => (
                        <TableRow key={setIdx} className="flex items-center">
                          <TableCell className="flex-1 text-sm">
                            {`SET ${setIdx + 1}`}
                          </TableCell>
                          <TableCell className="flex-1 text-sm">
                            <Input
                              className="dark:bg-transparent hover:dark:bg-input/30 border-none"
                              type="number"
                              min={0}
                              defaultValue={result.gains}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                              onBlur={(e) => {
                                handleChangeGains(
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
                              min={0}
                              defaultValue={result.losses}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                              onBlur={(e) => {
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
                              type="text"
                              defaultValue={result.penaltyShootout}
                              placeholder="ex) 승/패"
                              onBlur={(e) => {
                                handleChangePenaltyShootout(
                                  idx,
                                  setIdx,
                                  e.target.value
                                );
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
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
              onClick={() => onCloseDetailResultDialog?.(false)}
            >
              취소
            </Button>
            <DrawerClose asChild>
              <Button
                size="lg"
                variant="outline"
                className="w-24 cursor-pointer"
                onClick={() => {
                  handleSave();
                }}
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
