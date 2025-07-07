import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { TabsList } from "@radix-ui/react-tabs";
import { useEffect, useState } from "react";
import { useExpandStore } from "@/stores/expand";
import BracketStage from "../Bracket/BracketStage";
import { getCompetitionsMy } from "@/queries/competitions";
import { createStage, deleteStage, getStages } from "@/queries/stage";
import type { GameType, Stage } from "@/api/model";
import { toast } from "sonner";

export type Sheet = {
  id: string;
  name: string;
};

export type Game = {
  id: string;
  name: string;
  sheets: Sheet[];
};

const Result = () => {
  const { isExpand } = useExpandStore();
  const { data: competitions = [], isError } = getCompetitionsMy();
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const { data: stageDatas } = getStages(
    competitions[0]?.id || 0,
    selectedGame?.id || 0
  );

  const { mutate: createStageMutate } = createStage();
  const { mutate: deleteStageMutate } = deleteStage();

  const [stages, setStages] = useState<Stage[]>([]);
  const games: GameType[] = competitions[0]?.gameTypes || [];

  useEffect(() => {
    if (isError) {
      toast.error("대회 목록을 불러오는데 실패했습니다.");
    }
  }, [isError]);

  useEffect(() => {
    setSelectedGame(
      competitions && competitions[0] ? competitions[0].gameTypes[0] : null
    );
  }, [competitions]);

  useEffect(() => {
    if (!stageDatas) return;

    if (stageDatas?.length === 0) {
      createStageMutate({
        competitionId: competitions[0]?.id || 0,
        gameTypeId: selectedGame?.id || 0,
        name: "스테이지 1",
      });
    } else {
      setStages(stageDatas);
    }
  }, [stageDatas]);

  const handleAddStage = () => {
    createStageMutate({
      competitionId: competitions[0]?.id || 0,
      gameTypeId: selectedGame?.id || 0,
      name: `스테이지 ${stages.length + 1}`,
    });

    // setGames((prev) =>
    //   prev.map((game) =>
    //     game.id === selectedGame?.id
    //       ? {
    //           ...game,
    //           sheets: [
    //             ...game.sheets,
    //             {
    //               id: uuidv4(),
    //               name: `스테이지 ${game.sheets.length + 1}`,
    //             },
    //           ],
    //         }
    //       : game
    //   )
    // );
  };

  const handleDeleteStage = (id: number) => {
    deleteStageMutate(id);
    // setGames((prev) => {
    //   const game = prev.find((game) => game.id === selectedGame?.id);
    //   if (!game) return prev;
    //   return prev.map((game) =>
    //     game.id === selectedGame?.id
    //       ? { ...game, sheets: game.sheets.filter((sheet) => sheet.id !== id) }
    //       : game
    //   );
    // });
  };
  return (
    <SidebarInset>
      <header
        className={`flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 ${
          isExpand ? "hidden" : "block"
        }`}
      >
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">
                  Building Your Application
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Data Fetching</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div
        className={`flex h-full flex-1 flex-col gap-4 p-4 ${
          isExpand ? "pt-4" : "pt-0"
        }`}
      >
        <Tabs
          defaultValue={selectedGame?.id.toString()}
          className="h-full"
          onValueChange={(value) => {
            setSelectedGame(
              games.find((game) => game.id.toString() === value) || null
            );
          }}
        >
          <TabsList className={`${isExpand ? "hidden" : "block"}`}>
            {games.map((game) => (
              <TabsTrigger key={game.id} value={game.id.toString()}>
                {game.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {selectedGame && (
            <TabsContent value={selectedGame.id.toString()}>
              <BracketStage
                game={selectedGame}
                stages={stages}
                onAddStage={handleAddStage}
                onDeleteStage={handleDeleteStage}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </SidebarInset>
  );
};

export default Result;
