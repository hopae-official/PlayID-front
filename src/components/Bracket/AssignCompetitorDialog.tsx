import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type {
  Competitor,
  CustomStage,
  Group,
} from "@/pages/Bracket/BracketCreate";
import { useState, useEffect, useMemo } from "react";
import type { ColumnDef, Row, SortingState } from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Checkbox } from "../ui/checkbox";
import { toast } from "sonner";
import type { Stage } from "@/api/model";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getStage } from "@/queries/stage";
import { getBracket } from "@/queries/bracket";
import { getStageAllMatchesParticipants } from "@/queries/match";
import { useSelectedGameStore } from "@/stores/game";

interface AssignCompetitorDialogProps {
  stage?: CustomStage;
  stages?: Stage[];
  group?: Group;
  place?: number;
  selectedGroupId?: string;
  rosters?: CustomRoster[];
  onAssignBracket?: (competitors: Competitor[]) => void;
}

export type CustomRoster = {
  rosterId: string;
  name: string;
  gameId?: string;
  ranking?: string;
  isTeam?: boolean;
};

const getColumns = (
  setRowSelection: (val: Record<string, boolean>) => void,
  place: number,
  isTeam: boolean,
  isFirstStage: boolean,
  hasResult: boolean,
  competitors: Competitor[],
  selectedRosterIds: string[],
  selectedPreviousStage: Stage | undefined,
  setCompetitors: React.Dispatch<React.SetStateAction<Competitor[]>>
): ColumnDef<CustomRoster>[] => {
  const baseColumns: ColumnDef<CustomRoster>[] = [
    {
      id: "selectAndName",
      header: ({ table }: { table: any }) => (
        <span className="flex items-center gap-2">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={() => {
              if (table.getSelectedRowModel().rows.length === place) {
                setRowSelection({});
                setCompetitors([]);
              } else {
                const newRowSelection: Record<string, boolean> = {};
                const selectedRows = table.getRowModel().rows.slice(0, place);
                (selectedRows as any[]).forEach((row: any) => {
                  newRowSelection[row.id] = true;
                });
                setRowSelection(newRowSelection);
                setCompetitors(
                  (selectedRows as any[]).map((row: any) => ({
                    id: row.original.rosterId,
                    name: row.original.name,
                  }))
                );
              }
            }}
            aria-label="Select all"
          />
          {isTeam ? "참가팀명" : "선수명"}
        </span>
      ),
      cell: ({ row }: { row: Row<CustomRoster> }) => {
        const isDisabled =
          selectedRosterIds.length > 0 &&
          selectedRosterIds.includes(row.original.rosterId);

        return (
          <span className="flex items-center gap-2">
            <Checkbox
              checked={row.getIsSelected()}
              disabled={isDisabled}
              onCheckedChange={(value) => {
                if (value && competitors.length === place) {
                  toast.error("참가팀 수를 초과할 수 없습니다.");
                  return;
                }
                row.toggleSelected(!!value);
                if (value) {
                  setCompetitors((prev) => {
                    if (prev.some((c) => c.id === row.original.rosterId))
                      return prev;
                    return [
                      ...prev,
                      { id: row.original.rosterId, name: row.original.name },
                    ];
                  });
                } else {
                  setCompetitors((prev) =>
                    prev.filter((c) => c.id !== row.original.rosterId)
                  );
                }
              }}
              aria-label="Select row"
            />
            <span
              className={
                isDisabled
                  ? "line-through text-gray-400 opacity-60 cursor-not-allowed"
                  : ""
              }
              title={
                isDisabled ? "이미 다른 그룹에 배정된 선수입니다" : undefined
              }
            >
              {row.original.name}
            </span>
          </span>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ];

  if (!isTeam) {
    baseColumns.push({
      accessorKey: "gameId",
      header: "게임ID",
      cell: ({ row }: { row: Row<CustomRoster> }) => {
        const isDisabled =
          selectedRosterIds.length > 0 &&
          selectedRosterIds.includes(row.original.rosterId);
        return (
          <div
            className={
              isDisabled
                ? "line-through text-gray-400 opacity-60 cursor-not-allowed"
                : ""
            }
            title={
              isDisabled ? "이미 다른 그룹에 배정된 선수입니다" : undefined
            }
          >
            {row.getValue("gameId")}
          </div>
        );
      },
    });
  }

  if (!isFirstStage && selectedPreviousStage) {
    baseColumns.push({
      accessorKey: "ranking",
      header: "이전 스테이지 결과",
      cell: ({ row }: { row: Row<CustomRoster> }) => {
        const isDisabled =
          selectedRosterIds.length > 0 &&
          selectedRosterIds.includes(row.original.rosterId);

        return (
          <div
            className={
              isDisabled
                ? "line-through text-gray-400 opacity-60 cursor-not-allowed"
                : ""
            }
            title={
              isDisabled ? "이미 다른 그룹에 배정된 선수입니다" : undefined
            }
          >
            {hasResult ? `${row.getValue("ranking")}위` : "-"}
          </div>
        );
      },
    });
  }

  return baseColumns;
};

const AssignCompetitorDialog = ({
  stage,
  stages,
  rosters,
  place,
  selectedGroupId,
  onAssignBracket,
}: AssignCompetitorDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const selectedGame = useSelectedGameStore((state) => state.selectedGame);
  const [selectedRosterIds, setSelectedRosterIds] = useState<string[]>([]);
  const [selectedPreviousStageId, setSelectedPreviousStageId] =
    useState<number>();
  const { data: selectedPreviousStage } = getStage(
    selectedPreviousStageId ?? 0
  );
  const { data: selectedPreviousStageBracket } = getBracket(
    selectedPreviousStage?.brackets?.[0]?.id ?? 0
  );
  const { data: stageAllMatchesParticipants } = getStageAllMatchesParticipants(
    Number(selectedGame?.id)
  );

  const validPreviousStageBracket = selectedPreviousStage?.brackets?.[0]
    ? selectedPreviousStageBracket
    : undefined;

  const [rostersWithRanking, setRostersWithRanking] = useState<CustomRoster[]>(
    []
  );

  const previousStages = stages?.slice(
    0,
    stages?.findIndex((s) => s.id === Number(stage?.id))
  );
  const isFirstStage =
    stages?.findIndex((s) => s.id === Number(stage?.id)) === 0;

  const hasResult = useMemo(() => {
    if (!validPreviousStageBracket) return false;
    if (validPreviousStageBracket.format === "SINGLE_ELIMINATION") {
      return validPreviousStageBracket.groups.some((group) =>
        group.rounds.some((round) =>
          round.matches.some((match) =>
            match.matchSetResults?.some((result) => result.winnerRosterId)
          )
        )
      );
    } else if (validPreviousStageBracket.format === "FREE_FOR_ALL") {
      return validPreviousStageBracket.groups.some((group) =>
        group.rounds.some((round) =>
          round.matches.some((match) =>
            match.matchSetResults?.some((result) =>
              result.matchSetParticipantStats?.some(
                (stat) => stat.statPayload?.point
              )
            )
          )
        )
      );
    }
    return false;
  }, [validPreviousStageBracket]);

  useEffect(() => {
    if (!validPreviousStageBracket) {
      setRostersWithRanking([]);
      return;
    }
    if (validPreviousStageBracket.format === "SINGLE_ELIMINATION") {
      const allRosters = validPreviousStageBracket.groups.flatMap((group) => {
        const rounds = group.rounds;
        const participants = rounds[0].matches.flatMap(
          (m) => m.matchParticipants
        );
        const rankingMap: Record<string, number> = {};
        let currentRank = 1;
        for (let i = rounds.length - 1; i >= 0; i--) {
          const matches = rounds[i].matches;
          if (i === rounds.length - 1) {
            matches.forEach((match, matchIdx) =>
              match.matchParticipants?.forEach((p) => {
                rankingMap[p.rosterId] = p.isWinner
                  ? matchIdx === 0
                    ? 1
                    : 3
                  : matchIdx === 0
                  ? 2
                  : validPreviousStageBracket.formatOptions.hasThirdPlaceMatch
                  ? 4
                  : 3;
              })
            );
            currentRank = matches.length > 1 ? 5 : 3;
          } else {
            const losers = matches.flatMap((m) =>
              (m.matchParticipants ?? [])
                .filter((p) => !p.isWinner)
                .map((p) => String(p.rosterId))
            );
            losers.forEach((rosterId) => (rankingMap[rosterId] = currentRank));
            currentRank += losers.length;
          }
        }
        return participants
          .map((roster) => ({
            rosterId: String(roster.rosterId),
            name:
              roster.roster.team?.name ||
              roster.roster.player?.organization ||
              "",
            gameId: roster.roster.player?.gameId,
            ranking: rankingMap[String(roster.rosterId)],
          }))
          .sort((a, b) => (a.ranking ?? 999) - (b.ranking ?? 999))
          .map((roster) => ({
            ...roster,
            ranking:
              validPreviousStageBracket.groups.length > 1
                ? `${group.name}조 ${roster.ranking}`
                : `${roster.ranking}`,
          }));
      });
      setRostersWithRanking(allRosters);
    } else if (validPreviousStageBracket.format === "FREE_FOR_ALL") {
      const pointMap: Record<string, number> = {};
      validPreviousStageBracket.groups.forEach((group) =>
        group.rounds.forEach((round) =>
          round.matches.forEach((match) =>
            match.matchSetResults?.forEach((result) =>
              result.matchSetParticipantStats?.forEach((stat) => {
                const rosterId = match.matchParticipants?.find(
                  (p) => p.id === stat.matchParticipantId
                )?.rosterId;
                if (rosterId) {
                  const point = Number(stat.statPayload?.point ?? 0);
                  pointMap[rosterId] = (pointMap[rosterId] ?? 0) + point;
                }
              })
            )
          )
        )
      );
      let lastPoint: number | null = null;
      let lastRank = 0;
      const rostersWithPoint = Object.entries(pointMap)
        .map(([rosterId, point]) => {
          const roster = (rosters ?? []).find((r) => r.rosterId === rosterId);
          return {
            rosterId,
            name: roster?.name ?? "",
            gameId: roster?.gameId,
            point,
          };
        })
        .sort((a, b) => b.point - a.point)
        .map((roster, idx) => {
          if (roster.point === lastPoint) {
            return { ...roster, ranking: lastRank };
          } else {
            lastRank = idx + 1;
            lastPoint = roster.point;
            return { ...roster, ranking: lastRank };
          }
        })
        .map((roster) => ({
          ...roster,
          ranking:
            validPreviousStageBracket.groups.length > 1
              ? `${validPreviousStageBracket.groups[0].name}조 ${roster.ranking}`
              : `${roster.ranking}`,
        }));
      setRostersWithRanking(rostersWithPoint);
    }
  }, [validPreviousStageBracket, rosters]);

  // 이전 스테이지 참가자 id 배열
  const previousStageRosters = useMemo(() => {
    if (!stageAllMatchesParticipants) return [];
    return stageAllMatchesParticipants.map(
      (participant) => participant.rosterId
    );
  }, [stageAllMatchesParticipants]);

  // previousStageRosters에 포함되지 않은 로스터만 남김
  const filteredRosters = useMemo(() => {
    if (!rosters) return [];
    if (!previousStageRosters || previousStageRosters.length === 0)
      return rosters;
    return rosters.filter(
      (roster) => !previousStageRosters.includes(Number(roster.rosterId))
    );
  }, [rosters, previousStageRosters]);

  // columns 생성
  const columns = useMemo(
    () =>
      getColumns(
        setRowSelection,
        place ?? 0,
        rosters?.some((roster) => roster.isTeam) ?? false,
        isFirstStage,
        hasResult,
        competitors ?? [],
        selectedRosterIds ?? [],
        selectedPreviousStage,
        setCompetitors
      ),
    [
      setRowSelection,
      place,
      hasResult,
      selectedPreviousStage,
      rostersWithRanking,
      filteredRosters,
      competitors,
      selectedRosterIds,
      rosters,
      isFirstStage,
    ]
  );

  // table data
  const table = useReactTable({
    data: selectedPreviousStage ? rostersWithRanking ?? [] : filteredRosters,
    columns,
    getRowId: (row) => row.rosterId,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      rowSelection,
    },
  });

  // 다이얼로그 상태 초기화
  const initializeDialogState = () => {
    let baseCompetitors: Competitor[] = [];
    if (stage?.bracket?.groups && stage.bracket.groups.length > 0) {
      baseCompetitors =
        stage.bracket.groups
          .find((g) => g.id === selectedGroupId)
          ?.matches.flatMap((m) => m.participants ?? [])
          .filter((c) => c.id && c.name) ?? [];
      const allSelectedCompetitors = stage.bracket.groups
        .filter((g) => g.id !== selectedGroupId)
        .flatMap((g) =>
          g.matches.flatMap((m) => m.participants ?? []).filter((c) => c.id)
        );
      const allSelectedIds = new Set(allSelectedCompetitors.map((c) => c.id));
      setSelectedRosterIds(
        rosters
          ?.map((roster) => roster.rosterId)
          .filter((id) => allSelectedIds.has(id)) ?? []
      );
    } else {
      baseCompetitors = stage?.competitors ?? [];
    }
    setCompetitors(baseCompetitors);
    const initialSelection: Record<string, boolean> = {};
    (rosters ?? []).forEach((roster) => {
      if (baseCompetitors.find((c) => c.id === roster.rosterId)) {
        initialSelection[roster.rosterId] = true;
      }
    });
    setRowSelection(initialSelection);
  };

  useEffect(() => {
    if (isOpen) {
      initializeDialogState();
    } else {
      setRowSelection({});
    }
  }, [isOpen, stage, selectedGroupId, selectedPreviousStage]);

  const isFinishAssignCompetitors = useMemo(() => {
    if (stage?.bracket?.groups && stage.bracket.groups.length > 0) {
      const group = stage.bracket.groups.find((g) => g.id === selectedGroupId);
      return group?.matches.some((m) => (m.participants ?? []).length > 0);
    }
    return (stage?.competitors ?? []).length > 0;
  }, [stage, selectedGroupId]);

  const handleAssignBracket = () => {
    if ((place ?? 0) === 0 || competitors.length < (place ?? 0)) {
      toast.error("참가팀 수에 맞게 참가팀을 선택해주세요");
      return;
    }
    onAssignBracket?.(competitors);
    setSelectedPreviousStageId(undefined);
    setIsOpen(false);
  };

  const handleCloseDialog = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setTimeout(() => {
        setRowSelection({});
        setSelectedPreviousStageId(undefined);
      }, 200);
    }
  };

  const handleChangeSelectedPreviousStageId = (value: string) => {
    if (value === "0") {
      setSelectedPreviousStageId(undefined);
      setCompetitors([]);
      return;
    }
    setSelectedPreviousStageId(Number(value));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseDialog}>
      <DialogTrigger asChild>
        <Button className="w-full font-semibold cursor-pointer" size="lg">
          {stage && stage.bracket?.groups && stage.bracket.groups.length > 0
            ? isFinishAssignCompetitors
              ? "조 대진 재배정"
              : "조 대진 배정"
            : isFinishAssignCompetitors
            ? "대진 재배정"
            : "대진 배정"}
        </Button>
      </DialogTrigger>
      <DialogContent className="min-w-[400px] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {stage?.bracket?.groups && stage.bracket.groups.length > 1
              ? `${stage?.name} - ${
                  stage?.bracket.groups.find((g) => g.id === selectedGroupId)
                    ?.name
                }조 - 대진 배정`
              : `${stage?.name} - 대진 배정`}
          </DialogTitle>
          <DialogDescription>로스터 확정팀만 조회됩니다.</DialogDescription>
        </DialogHeader>
        {!isFirstStage && (
          <div className="flex flex-col gap-2 mt-4">
            <span className="text-sm font-semibold">이전 스테이지 선택</span>
            <Select onValueChange={handleChangeSelectedPreviousStageId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="스테이지를 선택해주세요" />
              </SelectTrigger>
              <SelectContent>
                {[
                  { id: 0, name: "스테이지 없음" },
                  ...(previousStages ?? []),
                ].map((stage) => (
                  <SelectItem key={stage.id} value={stage.id.toString()}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className={`rounded-md border${!isFirstStage ? " mt-2" : ""}`}>
          <Table className="table-fixed w-full">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
          </Table>
          <div
            className={`overflow-y-auto scrollbar-hide ${
              isFirstStage ? "max-h-[60vh]" : "max-h-[50vh]"
            }`}
          >
            <Table className="table-fixed w-full">
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className={
                        isFirstStage
                          ? "h-24 text-center"
                          : "min-h-56 text-center h-56"
                      }
                    >
                      {isFirstStage
                        ? "No results."
                        : "참가자가 배정되지 않은 스테이지입니다."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between p-3 text-sm bg-zinc-900">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">참가팀 수</span>
              <span className="font-semibold">{place}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">선택</span>
              <span className="text-blue-500 font-semibold">
                {competitors.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">잔여</span>
              <span className="text-red-600 font-semibold">
                {place ? place - competitors.length : 0}
              </span>
            </div>
          </div>
        </div>
        <DialogFooter className="w-full flex sm:justify-between">
          <DialogClose asChild>
            <Button variant="outline" className="cursor-pointer">
              취소
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleAssignBracket}
            className="cursor-pointer"
          >
            다음
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignCompetitorDialog;
