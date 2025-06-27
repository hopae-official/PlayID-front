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

import {
  ScanLine,
  ClipboardPlus,
  Settings,
  Paperclip,
  Trash2,
} from "lucide-react";
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
import { useStageStore } from "@/stores/stage";
import type { Match } from "@/pages/Bracket/BracketBoard";
import type { BoardType } from "@/pages/Bracket/BracketBoard";
import type { Competitor, Group, Stage } from "@/pages/Bracket/BracketCreate";

type SingleResult = { winner?: Competitor; image?: string };
type FfaResult = { point?: number; place?: number };
interface MatchResultDrawerProps {
  match: Match;
}

const getIcon = (match: Match) => {
  return (
    match.participants &&
    match.participants.length > 0 &&
    match.participants.every((participant) => participant.name !== "") && (
      <ClipboardPlus className="w-4 h-4" />
    )
  );
};

const getMatchResultsCount = (setType: string) => {
  if (setType === "single") return 1;
  if (setType === "best-of-three") return 3;
  return 5;
};

const getInitialResultList = (match: Match, globalStage: Stage | null) => {
  const count = getMatchResultsCount(match.setType || "single");
  if (globalStage?.bracketType === "single") {
    if (match.result?.setResult) {
      return match.result.setResult as SingleResult[];
    }
    return Array.from({ length: count }, () => ({
      winner: undefined,
      image: "",
    }));
  } else {
    if (match.result?.setResult) {
      return match.result.setResult as FfaResult[];
    }
    return Array.from({ length: match.participants?.length || 0 }, () => ({
      point: 0,
      place: 0,
    }));
  }
};

export default function MatchResultDrawer({ match }: MatchResultDrawerProps) {
  const { globalStage, setGlobalStage } = useStageStore();
  const matchResults = getMatchResultsCount(match.setType || "single");

  // 타입 분기: 싱글 토너먼트/프리포올
  const isSingle = globalStage?.bracketType === "single";

  const [matchResultList, setMatchResultList] = useState<
    SingleResult[] | FfaResult[]
  >(() => getInitialResultList(match, globalStage));
  const [screenshots, setScreenshots] = useState<(File | null)[]>(() =>
    Array(matchResults).fill(null)
  );
  const [previewUrls, setPreviewUrls] = useState<(string | null)[]>(() =>
    Array(matchResults).fill(null)
  );
  const [description, setDescription] = useState<string>("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [previewDialogIdx, setPreviewDialogIdx] = useState<number | null>(null);

  // 타입 가드
  const isSingleResultList = (
    list: SingleResult[] | FfaResult[]
  ): list is SingleResult[] => {
    return isSingle;
  };

  const matchWinner = useMemo(() => {
    if (!isSingleResultList(matchResultList) || !match.participants)
      return null;
    const winCount = (id: string) =>
      matchResultList.filter((result) => result.winner?.id === id).length;
    if (winCount(match.participants[0]?.id) > matchResults / 2) {
      return match.participants[0];
    } else if (winCount(match.participants[1]?.id) > matchResults / 2) {
      return match.participants[1];
    }
    return null;
  }, [matchResultList, match.participants, matchResults, isSingle]);

  useEffect(() => {
    if (isDrawerOpen) {
      setMatchResultList(getInitialResultList(match, globalStage));
      setScreenshots(Array(matchResults).fill(null));
      setPreviewUrls(Array(matchResults).fill(null));
      setDescription(match.result?.description || "");
    }
  }, [isDrawerOpen, match, globalStage, matchResults]);

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
    const newStage = { ...globalStage };
    if (isSingle && isSingleResultList(matchResultList)) {
      const nextMatches =
        newStage.groups?.flatMap((g: Group) =>
          (g.matches ?? []).filter((m: Match) =>
            m.prevMatchIds?.includes(match.id)
          )
        ) ?? [];
      newStage.groups = newStage.groups?.map((g: Group) => ({
        ...g,
        matches: g.matches?.map((m: Match) => {
          if (m.id === match.id) {
            return {
              ...m,
              winner: matchWinner?.id,
              result: {
                description: description,
                setResult: matchResultList,
              },
            };
          }
          if (nextMatches.some((nm) => nm.id === m.id) && matchWinner) {
            const upperMatch = nextMatches[0].prevMatchIds?.[0];
            const lowerMatch = nextMatches[0].prevMatchIds?.[1];
            if (
              upperMatch === match.id &&
              nextMatches[0].participants?.[0].id !== matchWinner.id
            ) {
              return {
                ...m,
                participants: [
                  { ...matchWinner },
                  nextMatches[0].participants?.[1] || { id: "", name: "" },
                ] as Competitor[],
              };
            } else if (
              lowerMatch === match.id &&
              nextMatches[0].participants?.[1].id !== matchWinner.id
            ) {
              return {
                ...m,
                participants: [
                  nextMatches[0].participants?.[0] || { id: "", name: "" },
                  { ...matchWinner },
                ] as Competitor[],
              };
            }
          }
          return m;
        }),
      }));
      setIsDrawerOpen(false);

      setTimeout(() => {
        setGlobalStage(newStage as Stage);
      }, 200);
    }
  }, [
    globalStage,
    match,
    matchWinner,
    matchResultList,
    description,
    setGlobalStage,
    isSingle,
  ]);

  const canOpen = useMemo(
    () =>
      match.participants &&
      match.participants.length > 0 &&
      match.participants.every((participant) => participant.name !== ""),
    [match.participants]
  );

  // SET별 결과 입력 소컴포넌트 (싱글 토너먼트 전용)
  const SetResultInput = ({
    result,
    idx,
  }: {
    result: SingleResult;
    idx: number;
  }) => (
    <div className="w-full flex flex-col gap-2">
      <div className="w-full flex justify-around items-center gap-4">
        <Button
          size="lg"
          variant="outline"
          className={`w-44 flex-1 cursor-pointer ${
            !result.winner
              ? "dark:bg-zinc-950 text-zinc-400"
              : result.winner?.id === match.participants?.[0]?.id
              ? "dark:bg-green-900 dark:hover:bg-green-900/90 text-white"
              : "dark:bg-red-900 dark:hover:bg-red-900/90 text-white"
          }`}
          onClick={() => {
            setMatchResultList((prev) => {
              const newList = [...(prev as SingleResult[])];
              newList[idx].winner =
                result.winner?.id === match.participants?.[0]?.id
                  ? match.participants?.[1]
                  : match.participants?.[0];
              return newList;
            });
          }}
        >
          <span>
            {!result.winner
              ? "승리팀 선택"
              : result.winner?.id === match.participants?.[0]?.id
              ? "승리"
              : "패배"}
          </span>
        </Button>
        <span className="text-sm font-semibold">{`SET ${idx + 1}`}</span>
        <Button
          size="lg"
          variant="outline"
          className={`w-44 flex-1 cursor-pointer ${
            !result.winner
              ? "dark:bg-zinc-950 text-zinc-400"
              : result.winner?.id === match.participants?.[1]?.id
              ? "dark:bg-green-900 dark:hover:bg-green-900/90 text-white"
              : "dark:bg-red-900 dark:hover:bg-red-900/90 text-white"
          }`}
          onClick={() => {
            setMatchResultList((prev) => {
              const newList = [...(prev as SingleResult[])];
              newList[idx].winner =
                result.winner?.id === match.participants?.[1]?.id
                  ? match.participants?.[0]
                  : match.participants?.[1];
              return newList;
            });
          }}
        >
          <span>
            {!result.winner
              ? "승리팀 선택"
              : result.winner?.id === match.participants?.[1]?.id
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
            className="cursor-pointer w-full flex items-center justify-between gap-2 bg-zinc-900 rounded-md py-2 hover:bg-zinc-800 p-2"
          >
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4" />
              <span
                className={`text-sm ${screenshots[idx] ? "" : "underline"}`}
              >
                {screenshots[idx]?.name || "스크린샷 업로드"}
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
  );

  return (
    <Drawer
      direction="right"
      open={isDrawerOpen}
      // onClose={}
      onOpenChange={(open) => {
        if (canOpen) setIsDrawerOpen(open);
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
        </Button>
      </DrawerTrigger>
      <DrawerContent className="!w-120 !max-w-120 flex flex-col">
        <DrawerHeader className="p-6">
          <DrawerTitle>{`${match.name} 경기 결과`}</DrawerTitle>
          <DrawerDescription>결과를 클릭해 변경할 수 있어요.</DrawerDescription>
        </DrawerHeader>
        <div
          className="flex-1 overflow-y-auto scrollbar-hide px-6"
          style={{ maxHeight: "80vh" }}
        >
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
            {isSingle && isSingleResultList(matchResultList)
              ? matchResultList.map((result, idx) => (
                  <SetResultInput key={idx} result={result} idx={idx} />
                ))
              : (matchResultList as FfaResult[]).map((result, idx) => (
                  <div key={idx} className="w-full flex flex-col gap-2">
                    <span>{result.point}</span>
                    <span>{result.place}</span>
                  </div>
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
                  {isSingle && isSingleResultList(matchResultList)
                    ? matchResultList.filter(
                        (result) =>
                          result.winner?.id === match.participants?.[0]?.id
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
                  {isSingle && isSingleResultList(matchResultList)
                    ? matchResultList.filter(
                        (result) =>
                          result.winner?.id === match.participants?.[1]?.id
                      ).length
                    : 0}
                </span>
              </div>
            </div>
          </div>
          <div className="w-full px-6">
            <Label className="mb-2">특이사항</Label>
            <Textarea
              placeholder="특이사항을 입력해주세요"
              className="w-full"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DrawerFooter className="p-6">
          <Button variant="outline" className="cursor-pointer">
            상세 결과
          </Button>
          <Button className="cursor-pointer" onClick={handleSaveResult}>
            결과 저장
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
