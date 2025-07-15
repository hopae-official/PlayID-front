import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { TabsList } from "@radix-ui/react-tabs";
import BracketStage from "./BracketStage";
import { useEffect, useState } from "react";
import { useExpandStore } from "@/stores/expand";
import { useCompetition } from "@/contexts/CompetitionContext";
import type { GameType, Stage } from "@/api/model";
import { createStage, deleteStage, getStages } from "@/queries/stage";
import { useSelectedGameStore } from "@/stores/game";

export type Sheet = {
  id: string;
  name: string;
};

export type Game = {
  id: string;
  name: string;
  sheets: Sheet[];
};

const Bracket = () => {
  const { isExpand } = useExpandStore();
  const { selectedGame, setSelectedGame } = useSelectedGameStore();
  const { competitions, selectedCompetition } = useCompetition();
  const { data: stageDatas } = getStages(
    selectedCompetition?.id || 0,
    selectedGame?.id || 0
  );
  const { mutate: createStageMutate } = createStage();
  const { mutate: deleteStageMutate } = deleteStage();
  const [stages, setStages] = useState<Stage[]>([]);
  const games: GameType[] = selectedCompetition?.gameTypes || [];

  useEffect(() => {
    if (selectedGame) return;

    if (selectedCompetition && selectedCompetition.gameTypes[0]) {
      setSelectedGame(selectedCompetition.gameTypes[0]);
    }
  }, [selectedCompetition]);

  useEffect(() => {
    if (!stageDatas) return;

    if (stageDatas?.length === 0) {
      createStageMutate({
        competitionId: selectedCompetition?.id || 0,
        gameTypeId: selectedGame?.id || 0,
        name: "스테이지 1",
      });
    } else {
      setStages(stageDatas);
    }
  }, [stageDatas]);

  const handleAddStage = () => {
    createStageMutate({
      competitionId: selectedCompetition?.id || 0,
      gameTypeId: selectedGame?.id || 0,
      name: `스테이지 ${stages.length + 1}`,
    });
  };

  const handleDeleteStage = (id: number) => {
    deleteStageMutate(id);
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
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {selectedCompetition?.title || "대회 목록"}
                </BreadcrumbPage>
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
          value={selectedGame?.id.toString() || ""}
          className="h-full"
          onValueChange={(value) => {
            setSelectedGame(
              games.find((game) => game.id.toString() === value) || games[0]
            );
          }}
        >
          <TabsList
            className={`w-fit bg-zinc-800 rounded-md mb-6 p-1 ${
              isExpand ? "hidden" : "block"
            }`}
          >
            {games.map((game) => (
              <TabsTrigger
                className="cursor-pointer dark:data-[state=active]:bg-zinc-950"
                key={game.id}
                value={game.id.toString()}
              >
                {game.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {selectedGame && stages.length > 0 && (
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

export default Bracket;
