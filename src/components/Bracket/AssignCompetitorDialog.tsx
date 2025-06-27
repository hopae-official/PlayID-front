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
import type { Competitor, Group, Stage } from "@/pages/Bracket/BracketCreate";
import { useState, useEffect, useCallback } from "react";
import type {
  ColumnDef,
  ColumnFiltersState,
  VisibilityState,
  Row,
  SortingState,
} from "@tanstack/react-table";
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

interface AssignCompetitorDialogProps {
  stage?: Stage;
  place?: number;
  selectedGroupId?: string;
  rosters?: Competitor[];
  onAssignBracket?: (competitors: Competitor[]) => void;
}

interface AssignStatus {
  id: string;
  isAssigned: boolean;
}

const getColumns = (
  setRowSelection: (val: Record<string, boolean>) => void,
  place: number,
  rosters: Competitor[],
  competitors: Competitor[],
  selectedGroupId: string,
  selectedRosterIds: string[]
): ColumnDef<Competitor>[] => [
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
            } else {
              const newRowSelection: Record<string, boolean> = {};
              if (selectedRosterIds.length > 0) {
                for (let i = 0; i < place + selectedRosterIds.length; i++) {
                  if (selectedRosterIds.includes(rosters[i].id)) {
                    newRowSelection[table.getRowModel().rows[i].id] = false;
                  } else {
                    newRowSelection[table.getRowModel().rows[i].id] = true;
                  }
                }
              } else {
                for (let i = 0; i < place && i < rosters.length; i++) {
                  newRowSelection[table.getRowModel().rows[i].id] = true;
                }
              }
              setRowSelection(newRowSelection);
            }
          }}
          aria-label="Select all"
        />
        선수명
      </span>
    ),
    cell: ({ row }: { row: Row<Competitor> }) => {
      const isDisabled =
        selectedRosterIds.length > 0 &&
        selectedRosterIds.includes(row.original.id);
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
  {
    accessorKey: "id",
    header: "게임ID",
    cell: ({ row }: { row: Row<Competitor> }) => {
      const isDisabled =
        selectedRosterIds.length > 0 &&
        selectedRosterIds.includes(row.original.id);
      return (
        <div
          className={
            isDisabled
              ? "line-through text-gray-400 opacity-60 cursor-not-allowed"
              : ""
          }
          title={isDisabled ? "이미 다른 그룹에 배정된 선수입니다" : undefined}
        >
          {row.getValue("id")}
        </div>
      );
    },
  },
];

const AssignCompetitorDialog = ({
  stage,
  rosters,
  place,
  selectedGroupId,
  onAssignBracket,
}: AssignCompetitorDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [assignData, setAssignData] = useState<AssignStatus[]>(
    stage?.groups?.length && stage.groups.length > 0
      ? stage.groups.map((group) => ({
          id: group.id,
          isAssigned: false,
        }))
      : [{ id: stage?.id ?? "", isAssigned: false }]
  );
  const [selectedRosterIds, setSelectedRosterIds] = useState<string[]>([]);

  // selectedRosterIds 초기화
  useEffect(() => {
    if (!isOpen) setSelectedRosterIds([]);
  }, [isOpen]);

  // 다이얼로그 열릴 때 상태 세팅 함수
  const initializeDialogState = () => {
    let baseCompetitors: Competitor[] = [];
    if (stage?.groups && stage.groups.length > 0) {
      baseCompetitors =
        stage.groups.find((g) => g.id === selectedGroupId)?.competitors ?? [];
      const allSelectedCompetitors = stage.groups
        .filter((g) => g.id !== selectedGroupId)
        .flatMap((g) => g.competitors);
      const allSelectedIds = new Set(allSelectedCompetitors.map((c) => c.id));
      setSelectedRosterIds(
        rosters
          ?.map((roster) => roster.id)
          .filter((id) => allSelectedIds.has(id)) ?? []
      );
    } else {
      baseCompetitors = stage?.competitors ?? [];
    }
    setCompetitors(baseCompetitors);
    const initialSelection: Record<string, boolean> = {};
    table.getRowModel().rows.forEach((row) => {
      if (baseCompetitors.find((c) => c.id === row.original.id)) {
        initialSelection[row.id] = true;
      }
    });
    setRowSelection(initialSelection);
  };

  useEffect(() => {
    if (isOpen) initializeDialogState();
    else setRowSelection({});
  }, [isOpen, stage, selectedGroupId]);

  useEffect(() => {
    const selectedRows = table.getSelectedRowModel().rows;
    setCompetitors(selectedRows.map((row) => row.original));
  }, [rowSelection]);

  const isFinishAssignCompetitors = (() => {
    if (stage?.groups && stage.groups.length > 0) {
      return !!assignData.find((data) => data.id === selectedGroupId)
        ?.isAssigned;
    }
    return assignData.length > 0 && !!assignData[0].isAssigned;
  })();

  const columns = getColumns(
    setRowSelection,
    place ?? 0,
    rosters ?? [],
    competitors ?? [],
    selectedGroupId ?? "",
    selectedRosterIds ?? []
  );
  const table = useReactTable({
    data: rosters ?? [],
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const handleAssignBracket = useCallback(() => {
    if ((place ?? 0) === 0 || competitors.length < (place ?? 0)) {
      toast.error("참가팀 수에 맞게 참가팀을 선택해주세요");
      return;
    }
    setAssignData((prev) => {
      if (stage?.groups && stage.groups.length > 0) {
        return prev.map((data) =>
          data.id === selectedGroupId ? { ...data, isAssigned: true } : data
        );
      }
      return prev.map((data) => ({ ...data, isAssigned: true }));
    });
    onAssignBracket?.(competitors);
    setIsOpen(false);
  }, [place, competitors, onAssignBracket, stage, selectedGroupId]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full font-semibold cursor-pointer" size="lg">
          {stage && stage.groups.length > 0
            ? isFinishAssignCompetitors
              ? "조 대진 재배정"
              : "조 대진 배정"
            : isFinishAssignCompetitors
            ? "대진 재배정"
            : "대진 배정"}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[400px] flex flex-col">
        <DialogHeader>
          <DialogTitle>{`${stage?.name} - 대진 배정`}</DialogTitle>
          <DialogDescription>로스터 확정팀만 조회됩니다.</DialogDescription>
        </DialogHeader>
        <div className="rounded-md border">
          <Table className="table-fixed w-full">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
          </Table>
          <div className="max-h-[60vh] overflow-y-auto scrollbar-hide">
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
                      className="h-24 text-center"
                    >
                      No results.
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
            <Button variant="outline">취소</Button>
          </DialogClose>
          <Button type="button" onClick={handleAssignBracket}>
            다음
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignCompetitorDialog;
