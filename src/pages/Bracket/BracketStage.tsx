import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { TabsList } from "@radix-ui/react-tabs";
import { PlusIcon, XIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStageStore } from "@/stores/stage";
import BracketBoard, { BOARD_TYPE } from "./BracketBoard";
import { type CustomControlMenuType } from "@/components/Bracket/CustomControls";
import { useSidebar } from "@/components/ui/sidebar";
import type { GameType, Stage } from "@/api/model";

interface BracketStageProps {
  game: GameType;
  stages: Stage[];
  onAddStage?: () => void;
  onDeleteStage?: (id: string) => void;
}

const BracketStage = ({
  game,
  stages,
  onAddStage,
  onDeleteStage,
}: BracketStageProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedStage, setSelectedStage] = useState<Stage>(stages[0]);
  const [originalStages, setOriginalStages] = useState<Stage[]>([]);
  const { globalStage, setGlobalStage } = useStageStore();
  const [selectedGroupId, setSelectedGroupId] = useState(
    globalStage?.groups[0]?.id
  );
  const { toggleSidebar } = useSidebar();

  useEffect(() => {
    const prevIds = originalStages.map((s) => s.id);
    const nextIds = stages.map((s) => s.id);

    // 시트가 삭제된 경우
    if (prevIds.length > nextIds.length) {
      const deletedId = prevIds.find((id) => !nextIds.includes(id));
      // 현재 선택된 시트가 삭제된 경우
      if (deletedId === selectedStage.id) {
        const deletedIndex = prevIds.findIndex((id) => id === deletedId);
        const fallbackId =
          deletedIndex > 0 ? prevIds[deletedIndex - 1] : nextIds[0];
        const fallbackStage = stages.find((s) => s.id === fallbackId);
        if (fallbackStage) setSelectedStage(fallbackStage);
      }
    }
    // 시트가 추가된 경우
    else if (prevIds.length < nextIds.length) {
      // 새로 추가된 시트로 포커스
      const addedId = nextIds.find((id) => !prevIds.includes(id));
      const addedStage = stages.find((s) => s.id === addedId);
      if (addedStage) setSelectedStage(addedStage);
    }

    setOriginalStages(stages);
  }, [stages]);

  const handleAddStage = () => {
    onAddStage?.();
  };

  const handleDeleteStage = (id: string) => {
    onDeleteStage?.(id);
  };

  const handleChangeGroupTab = (groupId: string) => {
    setSelectedGroupId(groupId);
  };

  const handleClickControls = (menu: CustomControlMenuType) => {
    switch (menu) {
      case "EXPAND":
        toggleSidebar();
        break;
      case "EDIT":
        navigate(`/bracket/create/${selectedStage.id}`);
        break;
      case "DELETE":
        setGlobalStage(null);
        break;
      default:
        break;
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <Tabs
        className="h-full gap-0"
        value={selectedStage.id.toString()}
        onValueChange={(value) => {
          setSelectedStage(
            stages.find((stage) => stage.id.toString() === value) || stages[0]
          );
        }}
      >
        <TabsList className="flex flex-row items-center gap-0">
          {stages.map((stage, index) => (
            <div
              className={`h-[40px] flex flex-row items-center rounded-t-md cursor-pointer ${
                selectedStage.id === stage.id
                  ? "bg-[#18181B]"
                  : "bg-transparent"
              } ${index !== 0 && "pr-4"}`}
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
                  ${index === 0 ? "px-4" : "pl-4 pr-2"}`}
              >
                <span>{stage.name}</span>
              </TabsTrigger>
              {index !== 0 && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteStage(stage.id.toString());
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
            onClick={handleAddStage}
          >
            <PlusIcon className="size-4" />
          </Button>
        </TabsList>
        <TabsContent
          value={selectedStage.id.toString()}
          className="flex h-full flex-col justify-center items-center rounded-b-md rounded-tr-md"
        >
          {globalStage ? (
            <BracketBoard
              stage={globalStage}
              selectedGroupId={selectedGroupId}
              boardType={
                location.pathname.includes("result")
                  ? BOARD_TYPE.RESULT
                  : BOARD_TYPE.SHOW
              }
              onChangeGroupTab={handleChangeGroupTab}
              onClickControls={handleClickControls}
            />
          ) : (
            <div className="flex w-full h-full flex-col items-center justify-center gap-2 bg-zinc-900 rounded-b-md rounded-tr-md">
              <div className="text-2xl font-semibold">
                대진표를 생성하시겠어요?
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                마지막 로스터 확정: {game.isRosterConfirmed ? "확정" : "미확정"}
              </div>
              <Button
                className="mt-6 cursor-pointer"
                size="lg"
                onClick={() => {
                  navigate(`/bracket/create/${selectedStage.id}`);
                }}
              >
                대진표 생성
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BracketStage;
