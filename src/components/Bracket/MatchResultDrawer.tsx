import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { ClipboardPlus, Paperclip, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import type { CustomMatch } from "@/pages/Bracket/BracketShowingBoard";
import type { CustomStage } from "@/pages/Bracket/BracketCreate";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "../ui/table";
import {
  getSetMatchesResults,
  patchMatchProgress,
  patchSetMatchesResults,
  patchSetParticipantStats,
  uploadSetResultScreenshot,
} from "@/queries/match";
import { toast } from "sonner";
import type { GetSetResultsResponseDto } from "@/api/model";
import { useGameStore } from "@/stores/game";

type SingleResult = { winnerRosterId?: string; screenshotUrl?: string };
type FfaResult = {
  id?: string;
  name?: string;
  point?: number;
  ranking?: number;
};
interface MatchResultDrawerProps {
  stage: CustomStage;
  match: CustomMatch;
  onClickDetailResult: () => void;
}

const getIcon = (match: CustomMatch) => {
  return (
    match.participants &&
    match.participants.length > 0 &&
    (match.round === 1
      ? match.participants.some((participant) => participant.name !== "")
      : match.participants.every((participant) => participant.name !== "")) && (
      <ClipboardPlus className="w-4 h-4" />
    )
  );
};

const getInitialResultList = (
  match: CustomMatch,
  stage: CustomStage | null
) => {
  const count = match.bestOf || 1;
  if (stage?.bracket?.format === "SINGLE_ELIMINATION") {
    if (match.singleEliminationResult?.setResult) {
      return match.singleEliminationResult.setResult.map((item) => ({
        winnerRosterId: item.winnerRosterId ?? "",
        screenshotUrl: item.screenshotUrl ?? "",
      }));
    }
    return Array.from({ length: count }, () => ({
      winnerRosterId: "",
      screenshotUrl: "",
    }));
  } else {
    if (match.freeForAllResult?.setResult?.length) {
      return match.freeForAllResult.setResult.map((item) => ({
        id: item.id ?? "",
        name: item.name ?? "",
        point: item.point ?? 0,
        ranking: item.ranking ?? 0,
      }));
    }

    return (
      match.participants?.map((participant) => ({
        id: participant.id ?? "",
        name: participant.name ?? "",
        point: 0,
        ranking: 0,
      })) ?? []
    );
  }
};

const getScreenshotUrls = (
  stage: CustomStage,
  match: CustomMatch,
  matchResults: number,
  setMatchesResults: GetSetResultsResponseDto
) => {
  if (stage.bracket?.format === "SINGLE_ELIMINATION") {
    const arr = match.singleEliminationResult?.setResult ?? [];
    return arr.length > 0
      ? setMatchesResults.setResults.map((result) => result.screenshotUrl)
      : Array(matchResults).fill(null);
  } else {
    return match.freeForAllResult?.screenshotUrl
      ? [match.freeForAllResult.screenshotUrl]
      : Array(matchResults).fill(null);
  }
};

const MatchResultDrawer = ({
  stage,
  match,
  onClickDetailResult,
}: MatchResultDrawerProps) => {
  const matchResults =
    stage.bracket?.format === "SINGLE_ELIMINATION" ? match.bestOf || 1 : 1;
  const isSingle = stage?.bracket?.format === "SINGLE_ELIMINATION";
  const { gameId } = useGameStore();
  const [matchResultList, setMatchResultList] = useState<
    SingleResult[] | FfaResult[]
  >(() => getInitialResultList(match, stage));
  const [screenshots, setScreenshots] = useState<(File | null)[]>(() =>
    Array(matchResults).fill(null)
  );
  const [previewUrls, setPreviewUrls] = useState<(string | null)[]>(() =>
    Array(matchResults).fill(null)
  );
  const [resultMemo, setResultMemo] = useState<string>("");
  const [openDrawer, setOpenDrawer] = useState(false);
  const [previewDialogIdx, setPreviewDialogIdx] = useState<number | null>(null);

  const { data: setMatchesResults } = getSetMatchesResults(
    Number(match.id.split("-")[0]),
    openDrawer
  );

  const {
    mutateAsync: patchSetMatchesResultsMutate,
    isError: isErrorPatchSetMatchesResults,
  } = patchSetMatchesResults();

  const {
    mutateAsync: patchSetParticipantStatsMutate,
    isError: isErrorPatchSetParticipantStats,
  } = patchSetParticipantStats();

  const {
    mutateAsync: patchMatchProgressMutate,
    isError: isErrorPatchMatchProgress,
  } = patchMatchProgress();

  useEffect(() => {
    if (
      isErrorPatchSetMatchesResults ||
      isErrorPatchSetParticipantStats ||
      isErrorPatchMatchProgress
    ) {
      toast.error("대진 결과 저장에 실패했습니다.");
    }
  }, [
    isErrorPatchSetMatchesResults,
    isErrorPatchSetParticipantStats,
    isErrorPatchMatchProgress,
  ]);

  const matchWinner = useMemo(() => {
    if (!isSingle || !match.participants) return null;
    const winCount = (id: string) =>
      (matchResultList as SingleResult[]).filter(
        (result) => result.winnerRosterId === id
      ).length;
    if (winCount(match.participants[0]?.id) > matchResults / 2) {
      return match.participants[0];
    } else if (winCount(match.participants[1]?.id) > matchResults / 2) {
      return match.participants[1];
    }
    return null;
  }, [matchResultList, match.participants, matchResults, isSingle]);

  useEffect(() => {
    if (openDrawer) {
      setMatchResultList(getInitialResultList(match, stage));
      const screenshotUrls = getScreenshotUrls(
        stage,
        match,
        matchResults,
        setMatchesResults ?? { setResults: [] }
      );
      setScreenshots(screenshotUrls);
      setPreviewUrls(screenshotUrls);
      setResultMemo(
        match.singleEliminationResult?.resultMemo ||
          match.freeForAllResult?.resultMemo ||
          ""
      );
    }
  }, [openDrawer, match, stage, matchResults]);

  const handleScreenshotChange = useCallback(
    (idx: number, file: File | null) => {
      setScreenshots((prev) => {
        const next = [...prev];
        next[idx] = file;
        return next;
      });
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewUrls((prev) => {
            const next = [...prev];
            next[idx] = e.target?.result as string;
            return next;
          });
        };
        reader.readAsDataURL(file);

        if (file) {
          uploadSetResultScreenshot(
            Number(match.id.split("-")[0]),
            setMatchesResults?.setResults[idx].id ?? 0,
            file
          );
        }
      } else {
        setPreviewUrls((prev) => {
          const next = [...prev];
          next[idx] = null;
          return next;
        });
      }
    },
    []
  );

  const handleOpenDialog = useCallback(
    (idx: number, open: boolean) => {
      if (!screenshots[idx]) {
        setPreviewDialogIdx(null);
        return;
      }
      setPreviewDialogIdx(open ? idx : null);
    },
    [screenshots]
  );

  const handleSaveResult = useCallback(() => {
    if (isSingle) {
      patchSetMatchesResultsMutate({
        matchId: Number(match.id.split("-")[0]),
        saveSetResultsDto: {
          resultMemo,
          setResults: setMatchesResults?.setResults.map((result) => ({
            id: result.id,
            winnerRosterId: (matchResultList as SingleResult[])[
              result.setNumber - 1
            ]?.winnerRosterId
              ? Number(
                  (matchResultList as SingleResult[])[result.setNumber - 1]
                    ?.winnerRosterId
                )
              : undefined,
          })),
        },
      });

      if (matchWinner) {
        patchMatchProgressMutate({
          matchId: Number(match.id.split("-")[0]),
          progress: {
            winnerRosterId: Number(matchWinner.id),
            allRosterIds:
              match.participants?.map((participant) => {
                return Number(participant.id);
              }) ?? [],
          },
        });
      }

      setOpenDrawer(false);
    } else {
      patchSetParticipantStatsMutate({
        matchId: Number(match.id.split("-")[0]),
        saveSetParticipantStatsDto: {
          setParticipantStats: (matchResultList as FfaResult[]).map(
            (result) => ({
              matchSetResultId: setMatchesResults?.setResults[0].id ?? 0,
              rosterId: Number(result.id),
              statPayload: {
                point: result.point,
                ranking: result.ranking,
              },
            })
          ),
        },
      });

      setOpenDrawer(false);
    }
  }, [
    stage,
    match,
    matchWinner,
    matchResultList,
    resultMemo,
    setMatchesResults,
    isSingle,
    screenshots,
    previewUrls,
  ]);

  const handleWinnerToggle = (
    idx: number,
    result: SingleResult,
    match: CustomMatch,
    targetIndex: 0 | 1
  ) => {
    setMatchResultList((prev) => {
      const newList = [...(prev as SingleResult[])];
      const currentWinnerId = result.winnerRosterId;
      const participants = match.participants;
      // 토글 로직
      newList[idx].winnerRosterId =
        currentWinnerId === participants?.[targetIndex]?.id
          ? participants?.[targetIndex === 0 ? 1 : 0]?.id
          : participants?.[targetIndex]?.id;
      return newList;
    });
  };

  const canOpen = useMemo(
    () =>
      match.participants &&
      match.participants.length > 0 &&
      (match.round === 1
        ? match.participants.some((participant) => participant.name !== "")
        : match.participants.every((participant) => participant.name !== "")),
    [match.participants]
  );

  // SET별 결과 입력 소컴포넌트 (싱글 토너먼트 전용)
  const SetSingleResultInput = ({
    result,
    idx,
  }: {
    result: SingleResult;
    idx: number;
  }) => (
    <div className="w-full flex flex-col space-y-4">
      <div className="w-full flex flex-col gap-2">
        <div className="w-full flex justify-around items-center gap-4">
          <Button
            size="lg"
            variant="outline"
            className={`w-44 flex-1 cursor-pointer ${
              !result.winnerRosterId
                ? "dark:bg-zinc-950 text-zinc-400"
                : result.winnerRosterId === match.participants?.[0]?.id
                ? "dark:bg-green-900 dark:hover:bg-green-900/90 text-white"
                : "dark:bg-red-900 dark:hover:bg-red-900/90 text-white"
            }`}
            onClick={() => {
              handleWinnerToggle(idx, result, match, 0);
            }}
          >
            <span>
              {!result.winnerRosterId
                ? "승리팀 선택"
                : result.winnerRosterId === match.participants?.[0]?.id
                ? "승리"
                : "패배"}
            </span>
          </Button>
          <span className="text-sm font-semibold">{`SET ${idx + 1}`}</span>
          <Button
            size="lg"
            variant="outline"
            className={`w-44 flex-1 cursor-pointer ${
              !result.winnerRosterId
                ? "dark:bg-zinc-950 text-zinc-400"
                : result.winnerRosterId === match.participants?.[1]?.id
                ? "dark:bg-green-900 dark:hover:bg-green-900/90 text-white"
                : "dark:bg-red-900 dark:hover:bg-red-900/90 text-white"
            }`}
            onClick={() => {
              handleWinnerToggle(idx, result, match, 1);
            }}
          >
            <span>
              {!result.winnerRosterId
                ? "승리팀 선택"
                : result.winnerRosterId === match.participants?.[1]?.id
                ? "승리"
                : "패배"}
            </span>
          </Button>
        </div>
        <Dialog
          open={previewDialogIdx === idx}
          onOpenChange={(open) => handleOpenDialog(idx, open)}
        >
          <DialogTrigger asChild>
            <Label
              htmlFor={`screenshot-upload-${idx}`}
              className="cursor-pointer w-full flex items-center justify-between gap-2 bg-zinc-900 rounded-md hover:bg-zinc-800 p-2"
            >
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                <span
                  className={`text-sm ${screenshots[idx] ? "" : "underline"}`}
                >
                  {screenshots[idx] && !screenshots[idx]?.name
                    ? "스크린샷 미리보기"
                    : screenshots[idx] && screenshots[idx]?.name
                    ? screenshots[idx]?.name
                    : "스크린샷 업로드"}
                </span>
              </div>
              {screenshots[idx] && (
                <Trash2
                  className="w-4 h-4 cursor-pointer text-red-500"
                  onClick={(e) => {
                    e.preventDefault();
                    handleScreenshotChange(idx, null);
                  }}
                />
              )}
            </Label>
          </DialogTrigger>
          <DialogContent style={{ maxWidth: "70%" }}>
            <DialogHeader>
              <DialogTitle>스크린샷 미리보기</DialogTitle>
            </DialogHeader>
            {previewUrls[idx] && (
              <img
                src={previewUrls[idx]!}
                alt="스크린샷 미리보기"
                className="mt-2 rounded-md border w-full"
              />
            )}
          </DialogContent>
        </Dialog>
        {!screenshots[idx] && (
          <Input
            id={`screenshot-upload-${idx}`}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              handleScreenshotChange(idx, file);
            }}
          />
        )}
      </div>
    </div>
  );

  const handleFfaResultChange = (
    idx: number,
    key: keyof FfaResult,
    value: number
  ) => {
    const newList = (matchResultList as FfaResult[]).map((result) => {
      return {
        id: result.id,
        name: result.name,
        point: result.point,
        ranking: result.ranking,
      };
    });

    if (newList[idx] && key === "point") {
      newList[idx][key] = value;

      newList.sort((a, b) => {
        const pointA = a.point ?? 0;
        const pointB = b.point ?? 0;
        return pointB - pointA;
      });
    }

    newList.forEach((result, i) => {
      if (result.point === undefined) return;

      result.ranking = i + 1;
    });

    setMatchResultList(newList);
  };

  // FFA 결과 입력 소컴포넌트
  const SetFfaResultInput = useMemo(
    () =>
      ({ result }: { result: FfaResult[] }) =>
        (
          <>
            <Table>
              <TableHeader>
                <TableRow className="flex items-center">
                  <TableHead className="flex flex-1 items-center ">
                    팀명
                  </TableHead>
                  <TableHead className="flex flex-1 items-center ">
                    포인트
                  </TableHead>
                  <TableHead className="flex flex-1 items-center ">
                    순위
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.map((result, idx) => (
                  <TableRow key={idx} className="flex items-center">
                    <TableCell className="flex-1 text-sm">
                      {result.name}
                    </TableCell>
                    <TableCell className="flex-1 text-sm">
                      <Input
                        type="number"
                        min={0}
                        defaultValue={result.point}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        onBlur={(e) => {
                          handleFfaResultChange(
                            idx,
                            "point",
                            Number(e.target.value)
                          );
                        }}
                      />
                    </TableCell>
                    <TableCell className="flex-1 text-sm">
                      <span>
                        {result.ranking &&
                        result.point !== undefined &&
                        result.point > 0
                          ? result.ranking
                          : "-"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Dialog
              open={previewDialogIdx === 0}
              onOpenChange={(open) => handleOpenDialog(0, open)}
            >
              <DialogTrigger asChild>
                <Label
                  htmlFor={`screenshot-upload-0`}
                  className="cursor-pointer w-full flex items-center justify-between gap-2 bg-zinc-900 rounded-md hover:bg-zinc-800 p-2 mt-4"
                >
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    <span
                      className={`text-sm ${screenshots[0] ? "" : "underline"}`}
                    >
                      {screenshots[0] && !screenshots[0]?.name
                        ? "스크린샷 미리보기"
                        : screenshots[0] && screenshots[0]?.name
                        ? screenshots[0]?.name
                        : "스크린샷 업로드"}
                    </span>
                  </div>
                  {screenshots[0] && (
                    <Trash2
                      className="w-4 h-4 cursor-pointer text-red-500"
                      onClick={(e) => {
                        e.preventDefault();
                        handleScreenshotChange(0, null);
                      }}
                    />
                  )}
                </Label>
              </DialogTrigger>
              <DialogContent style={{ maxWidth: "70%" }}>
                <DialogHeader>
                  <DialogTitle>스크린샷 미리보기</DialogTitle>
                </DialogHeader>
                {previewUrls[0] && (
                  <img
                    src={previewUrls[0]!}
                    alt="스크린샷 미리보기"
                    className="mt-2 rounded-md border w-full"
                  />
                )}
              </DialogContent>
            </Dialog>
            {!screenshots[0] && (
              <Input
                id={`screenshot-upload-0`}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  handleScreenshotChange(0, file);
                }}
              />
            )}
          </>
        ),
    [matchResultList, previewDialogIdx, screenshots, previewUrls]
  );

  return (
    <Drawer
      direction="right"
      open={openDrawer}
      onClose={() => {
        setOpenDrawer(false);
      }}
      onOpenChange={(open) => {
        if (canOpen) setOpenDrawer(open);
      }}
    >
      <DrawerTrigger asChild>
        <Button
          variant="ghost"
          className={`w-full h-full flex flex-col justify-start items-start gap-1 ${"cursor-pointer"} mb-2 p-0`}
        >
          <div className="w-full flex justify-between items-center text-sm text-zinc-400">
            <span>{match.name}</span>
            {getIcon(match)}
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
      </DrawerTrigger>
      <DrawerContent className="!w-120 !max-w-120 flex flex-col">
        <DrawerHeader className="p-6">
          <DrawerTitle>{`${match.name} 경기 결과`}</DrawerTitle>
          <DrawerDescription>
            {isSingle
              ? "세트별 결과를 입력해주세요"
              : "포인트와 순위를 입력해주세요"}
          </DrawerDescription>
        </DrawerHeader>
        <div
          className="flex-1 overflow-y-auto scrollbar-hide mt-6 px-6"
          style={{ maxHeight: "80vh" }}
        >
          {isSingle ? (
            <div className="w-full flex flex-col space-y-4">
              <div className="w-full flex justify-around items-center">
                <span className="w-44 text-center text-base font-semibold">
                  {match.participants?.[0]?.name}
                </span>
                <span className="text-xs font-semibold text-zinc-400">vs</span>
                <span className="w-44 text-center text-base font-semibold">
                  {match.participants?.[1]?.name}
                </span>
              </div>
              {(matchResultList as SingleResult[]).map((result, idx) => (
                <SetSingleResultInput key={idx} result={result} idx={idx} />
              ))}
              <div className="w-full flex justify-center items-center gap-20 py-4">
                <div className="flex flex-1 justify-end relative">
                  {isSingle && matchWinner && (
                    <Badge
                      className={`absolute top-1/2 -translate-y-1/2 left-0 ${
                        matchWinner?.id === match.participants?.[0]?.id
                          ? "bg-green-900 text-white"
                          : "bg-red-900 text-white"
                      }`}
                    >
                      {matchWinner?.id === match.participants?.[0]?.id
                        ? "승리"
                        : "패배"}
                    </Badge>
                  )}
                  <span className="text-2xl font-bold">
                    {isSingle
                      ? (matchResultList as SingleResult[]).filter(
                          (result) =>
                            result.winnerRosterId ===
                            match.participants?.[0]?.id
                        ).length
                      : 0}
                  </span>
                </div>
                <span className="text-2xl font-bold">:</span>
                <div className="flex flex-1 justify-start relative">
                  {isSingle && matchWinner && (
                    <Badge
                      className={`absolute top-1/2 -translate-y-1/2 right-0 ${
                        matchWinner?.id === match.participants?.[1]?.id
                          ? "bg-green-900 text-white"
                          : "bg-red-900 text-white"
                      }`}
                    >
                      {matchWinner?.id === match.participants?.[1]?.id
                        ? "승리"
                        : "패배"}
                    </Badge>
                  )}
                  <span className="text-2xl font-bold">
                    {isSingle
                      ? (matchResultList as SingleResult[]).filter(
                          (result) =>
                            result.winnerRosterId ===
                            match.participants?.[1]?.id
                        ).length
                      : 0}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <SetFfaResultInput result={matchResultList as FfaResult[]} />
          )}
          <div className="w-full mt-6">
            <Label className="mb-2">특이사항</Label>
            <Textarea
              placeholder="특이사항을 입력해주세요"
              className="w-full"
              rows={4}
              value={resultMemo}
              onChange={(e) => setResultMemo(e.target.value)}
            />
          </div>
        </div>
        <DrawerFooter className="p-6">
          {gameId === "7" && (
            <Button
              size="lg"
              variant="outline"
              className="cursor-pointer"
              onClick={onClickDetailResult}
            >
              상세 결과
            </Button>
          )}
          <Button
            className="cursor-pointer"
            onClick={handleSaveResult}
            // disabled={
            //   isSingle
            //     ? (matchResultList as SingleResult[]).every(
            //         (result) => result.winnerRosterId === undefined
            //       )
            //     : (matchResultList as FfaResult[]).every(
            //         (result) => result.point === 0
            //       )
            // }
          >
            결과 저장
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default MatchResultDrawer;
