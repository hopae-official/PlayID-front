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
import BracketSheet from "./BracketSheet";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useStageStore } from "@/stores/stage";
import { useExpandStore } from "@/stores/expand";

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
  const [selectedGame, setSelectedGame] = useState<Game | null>({
    id: "lol",
    name: "리그오브레전드",
    sheets: [
      {
        id: uuidv4(),
        name: "스테이지 1",
      },
    ],
  });
  const [games, setGames] = useState<Game[]>([
    {
      id: "lol",
      name: "리그오브레전드",
      sheets: [
        {
          id: uuidv4(),
          name: "스테이지 1",
        },
      ],
    },
    {
      id: "valorant",
      name: "발로란트",
      sheets: [
        {
          id: uuidv4(),
          name: "스테이지 1",
        },
      ],
    },
    {
      id: "overwatch",
      name: "오버워치",
      sheets: [
        {
          id: uuidv4(),
          name: "스테이지 1",
        },
      ],
    },
    {
      id: "pubgmobile",
      name: "배틀그라운드모바일",
      sheets: [
        {
          id: uuidv4(),
          name: "스테이지 1",
        },
      ],
    },
    {
      id: "eternalreturn",
      name: "이터널리턴",
      sheets: [
        {
          id: uuidv4(),
          name: "스테이지 1",
        },
      ],
    },
  ]);

  const handleAddSheet = () => {
    setGames((prev) =>
      prev.map((game) =>
        game.id === selectedGame?.id
          ? {
              ...game,
              sheets: [
                ...game.sheets,
                {
                  id: uuidv4(),
                  name: `스테이지 ${game.sheets.length + 1}`,
                },
              ],
            }
          : game
      )
    );
  };

  const handleDeleteSheet = (id: string) => {
    setGames((prev) => {
      const game = prev.find((game) => game.id === selectedGame?.id);
      if (!game) return prev;
      return prev.map((game) =>
        game.id === selectedGame?.id
          ? { ...game, sheets: game.sheets.filter((sheet) => sheet.id !== id) }
          : game
      );
    });
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
          defaultValue={selectedGame?.id}
          className="h-full"
          onValueChange={(value) => {
            setSelectedGame(games.find((game) => game.id === value) || null);
          }}
        >
          <TabsList className={`${isExpand ? "hidden" : "block"}`}>
            {games.map((game) => (
              <TabsTrigger key={game.id} value={game.id}>
                {game.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {selectedGame && (
            <TabsContent value={selectedGame.id}>
              <BracketSheet
                game={
                  games.find((game) => game.id === selectedGame.id) ||
                  ({} as Game)
                }
                onAddSheet={handleAddSheet}
                onDeleteSheet={handleDeleteSheet}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </SidebarInset>
  );
};

export default Bracket;
