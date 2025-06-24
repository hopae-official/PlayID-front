import { useEffect, useState } from "react";
import type { Game, Sheet } from ".";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { TabsList } from "@radix-ui/react-tabs";
import { PlusIcon, XIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BracketSheetProps {
  game: Game;
  onAddSheet?: () => void;
  onDeleteSheet?: (id: string) => void;
}

const BracketSheet = ({
  game,

  onAddSheet,
  onDeleteSheet,
}: BracketSheetProps) => {
  const navigate = useNavigate();
  const [sheets, setSheets] = useState<Sheet[]>(game.sheets);
  const [selectedSheet, setSelectedSheet] = useState<Sheet>(sheets[0]);
  const [isFinishRoster, setIsFinishRoster] = useState(true);

  useEffect(() => {
    const prevIds = sheets.map((s) => s.id);
    const nextIds = game.sheets.map((s) => s.id);

    // 시트가 삭제된 경우
    if (prevIds.length > nextIds.length) {
      const deletedId = prevIds.find((id) => !nextIds.includes(id));
      // 현재 선택된 시트가 삭제된 경우
      if (deletedId === selectedSheet.id) {
        const deletedIndex = prevIds.findIndex((id) => id === deletedId);
        const fallbackId =
          deletedIndex > 0 ? prevIds[deletedIndex - 1] : nextIds[0];
        const fallbackSheet = game.sheets.find((s) => s.id === fallbackId);
        if (fallbackSheet) setSelectedSheet(fallbackSheet);
      }
    }
    // 시트가 추가된 경우
    else if (prevIds.length < nextIds.length) {
      // 새로 추가된 시트로 포커스
      const addedId = nextIds.find((id) => !prevIds.includes(id));
      const addedSheet = game.sheets.find((s) => s.id === addedId);
      if (addedSheet) setSelectedSheet(addedSheet);
    }

    setSheets(game.sheets);
  }, [game.sheets]);

  const handleAddSheet = () => {
    onAddSheet?.();
  };

  const handleDeleteSheet = (id: string) => {
    onDeleteSheet?.(id);
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <Tabs
        defaultValue={selectedSheet.id}
        className="h-full gap-0"
        value={selectedSheet.id}
        onValueChange={(value) => {
          setSelectedSheet(
            sheets.find((sheet) => sheet.id === value) || sheets[0]
          );
        }}
      >
        <TabsList className="flex flex-row items-center gap-0">
          {sheets.map((sheet, index) => (
            <div
              className={`h-[40px] flex flex-row items-center rounded-t-md cursor-pointer ${
                selectedSheet.id === sheet.id
                  ? "bg-[#18181B]"
                  : "bg-transparent"
              } ${index !== 0 && "pr-4"}`}
              key={sheet.id}
            >
              <TabsTrigger
                value={sheet.id}
                className={`
                  h-full
                  border-none
                  cursor-pointer
                  dark:bg-transparent
                  dark:data-[state=active]:bg-transparent
                  rounded-bl-none
                  rounded-br-none
                  py-2
                  ${index === 0 ? "px-4" : "pl-4 pr-2"}`}
              >
                <span>{sheet.name}</span>
              </TabsTrigger>
              {index !== 0 && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSheet(sheet.id);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="cursor-pointer"
                >
                  <XIcon className="size-4" />
                </div>
              )}
            </div>
          ))}
          <Button
            className="dark:p-0 dark:hover:bg-transparent cursor-pointer"
            variant="ghost"
            size="icon"
            onClick={handleAddSheet}
          >
            <PlusIcon className="size-4" />
          </Button>
        </TabsList>
        <TabsContent
          value={selectedSheet.id}
          className="flex h-full flex-col justify-center items-center rounded-md"
        >
          <div className="flex w-full h-full flex-col items-center justify-center gap-2 bg-[#18181B] rounded-b-md rounded-tr-md">
            <div className="text-2xl font-semibold">
              {isFinishRoster
                ? "대진표를 생성하시겠어요?"
                : "로스터 확정이 되지 않았어요"}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              {isFinishRoster
                ? "마지막 로스터 확정: 2025-06-16 12:00:00"
                : "대진표 생성은 로스터 확정 후에 가능해요."}
            </div>
            {isFinishRoster ? (
              <Button
                className="mt-6 cursor-pointer"
                size="lg"
                onClick={() => {
                  navigate(`/bracket/create/${selectedSheet.id}`);
                }}
              >
                대진표 생성
              </Button>
            ) : (
              <Button
                className="mt-6 cursor-pointer bg-zinc-950 text-zinc-100 border-zinc-800 hover:bg-zinc-800"
                size="lg"
                onClick={() => setIsFinishRoster(true)}
              >
                로스터 확정하러 가기
              </Button>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BracketSheet;
