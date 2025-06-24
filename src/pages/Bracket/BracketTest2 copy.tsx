import { useCallback, useMemo, useState } from "react";
import type { Edge, Node } from "@xyflow/react";
import {
  ReactFlow,
  Background,
  Controls,
  Position,
  useEdgesState,
  useNodesState,
  MarkerType,
  MiniMap,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";

interface Participant {
  id: string;
  name: string;
  score?: number;
  isWinner: boolean;
}

interface MatchData {
  id: string;
  roundName: string;
  participants: Participant[];
}

interface MatchNodeProps {
  data: MatchData;
}

interface BracketTest2Props {
  isSetting: boolean;
}

// 커스텀 매치 노드 컴포넌트
const MatchNode = ({ data }: MatchNodeProps) => {
  return (
    <div className="px-3 py-2 shadow-lg rounded-lg bg-zinc-800 border border-zinc-700 min-w-[200px]">
      <div className="text-xs text-zinc-400 mb-2 font-medium">
        {data.roundName}
      </div>
      <div className="flex flex-col gap-1">
        {data.participants.map((participant: Participant) => (
          <div
            key={participant.id}
            className={`flex items-center justify-between p-2 rounded ${
              participant.isWinner
                ? "bg-blue-500/20 text-blue-300"
                : "bg-zinc-900 text-zinc-400"
            }`}
          >
            <span className="font-medium">{participant.name}</span>
            {participant.score !== undefined && (
              <span
                className={`text-sm ${
                  participant.isWinner ? "text-blue-300" : "text-zinc-500"
                }`}
              >
                {participant.score}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// 커스텀 엣지 스타일
const edgeOptions = {
  style: {
    strokeWidth: 3,
    stroke: "#94a3b8",
  },
  animated: true,
  type: "default",
};

// 유틸리티 함수들
const calculateTotalRounds = (matchCount: number) => {
  return Math.ceil(Math.log2(matchCount / 2)) + 1;
};

const getRoundName = (roundIndex: number, totalRounds: number) => {
  if (roundIndex === totalRounds - 1) return "결승";
  if (roundIndex === totalRounds - 2) return "준결승";
  const roundOf = Math.pow(2, totalRounds - roundIndex);
  return `${roundOf}강`;
};

const getMatchesInRound = (roundIndex: number, totalRounds: number) => {
  return Math.pow(2, totalRounds - roundIndex - 1);
};

const BracketTest2 = ({ isSetting = true }: BracketTest2Props) => {
  const [initialMatches, setInitialMatches] = useState<MatchData[]>([
    {
      id: "1",
      roundName: "8강 1경기",
      participants: [
        { id: "1", name: "Team A", score: 2, isWinner: true },
        { id: "2", name: "Team B", score: 0, isWinner: false },
      ],
    },
    {
      id: "1",
      roundName: "8강 1경기",
      participants: [
        { id: "1", name: "Team A", score: 2, isWinner: true },
        { id: "2", name: "Team B", score: 0, isWinner: false },
      ],
    },
    {
      id: "1",
      roundName: "8강 1경기",
      participants: [
        { id: "1", name: "Team A", score: 2, isWinner: true },
        { id: "2", name: "Team B", score: 0, isWinner: false },
      ],
    },
    {
      id: "1",
      roundName: "8강 1경기",
      participants: [
        { id: "1", name: "Team A", score: 2, isWinner: true },
        { id: "2", name: "Team B", score: 0, isWinner: false },
      ],
    },
    {
      id: "1",
      roundName: "8강 1경기",
      participants: [
        { id: "1", name: "Team A", score: 2, isWinner: true },
        { id: "2", name: "Team B", score: 0, isWinner: false },
      ],
    },
    {
      id: "1",
      roundName: "8강 1경기",
      participants: [
        { id: "1", name: "Team A", score: 2, isWinner: true },
        { id: "2", name: "Team B", score: 0, isWinner: false },
      ],
    },
    {
      id: "1",
      roundName: "8강 1경기",
      participants: [
        { id: "1", name: "Team A", score: 2, isWinner: true },
        { id: "2", name: "Team B", score: 0, isWinner: false },
      ],
    },
    {
      id: "1",
      roundName: "8강 1경기",
      participants: [
        { id: "1", name: "Team A", score: 2, isWinner: true },
        { id: "2", name: "Team B", score: 0, isWinner: false },
      ],
    },
    {
      id: "2",
      roundName: "8강 2경기",
      participants: [
        { id: "3", name: "Team C", score: 2, isWinner: true },
        { id: "4", name: "Team D", score: 1, isWinner: false },
      ],
    },
    {
      id: "3",
      roundName: "8강 3경기",
      participants: [
        { id: "5", name: "Team E", score: 0, isWinner: false },
        { id: "6", name: "Team F", score: 2, isWinner: true },
      ],
    },
    {
      id: "4",
      roundName: "8강 4경기",
      participants: [
        { id: "7", name: "Team G", score: 2, isWinner: true },
        { id: "8", name: "Team H", score: 1, isWinner: false },
      ],
    },
    {
      id: "5",
      roundName: "4강 1경기",
      participants: [
        { id: "1", name: "Team A", score: 1, isWinner: false },
        { id: "3", name: "Team C", score: 2, isWinner: true },
      ],
    },
    {
      id: "6",
      roundName: "4강 2경기",
      participants: [
        { id: "6", name: "Team F", score: 0, isWinner: false },
        { id: "7", name: "Team G", score: 2, isWinner: true },
      ],
    },
    {
      id: "7",
      roundName: "결승전",
      participants: [
        { id: "3", name: "Team C", score: 2, isWinner: true },
        { id: "3", name: "Team C", score: 2, isWinner: true },
      ],
    },
  ]);

  // 전체 라운드 수 계산
  const totalMatches = initialMatches.length;
  const totalRounds = calculateTotalRounds(totalMatches);

  // 노드 위치 계산
  const initialNodes: Node[] = useMemo(
    () =>
      initialMatches.map((match, index) => {
        // 현재 매치가 속한 라운드 계산
        let round = 0;
        let matchesProcessed = 0;
        for (let i = 0; i < totalRounds; i++) {
          const matchesInRound = getMatchesInRound(i, totalRounds);
          if (index < matchesProcessed + matchesInRound) {
            round = i;
            break;
          }
          matchesProcessed += matchesInRound;
        }

        // 현재 라운드에서의 위치 계산
        const matchesInCurrentRound = getMatchesInRound(round, totalRounds);
        const positionInRound = index - matchesProcessed;

        const roundSpacing = 300; // 라운드 간 간격
        const totalHeight = 800; // 전체 높이
        const verticalSpacing = totalHeight / matchesInCurrentRound;

        return {
          id: match.id,
          type: "match",
          position: {
            x: round * roundSpacing,
            y: positionInRound * verticalSpacing + verticalSpacing / 2,
          },
          data: {
            ...match,
            roundName: getRoundName(round, totalRounds),
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          draggable: false,
        };
      }),
    [totalMatches, totalRounds]
  );

  // 엣지(연결선) 생성
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    let currentRound = 0;
    let matchesProcessed = 0;

    // 각 라운드별로 연결선 생성
    while (currentRound < totalRounds - 1) {
      const matchesInCurrentRound = getMatchesInRound(
        currentRound,
        totalRounds
      );
      const matchesInNextRound = getMatchesInRound(
        currentRound + 1,
        totalRounds
      );

      // 현재 라운드의 각 매치에서 다음 라운드로 연결
      for (let i = 0; i < matchesInCurrentRound; i++) {
        const currentMatchIndex = matchesProcessed + i;
        const nextMatchIndex =
          matchesProcessed + matchesInCurrentRound + Math.floor(i / 2);

        if (
          currentMatchIndex < initialMatches.length &&
          nextMatchIndex < initialMatches.length
        ) {
          edges.push({
            id: `e${initialMatches[currentMatchIndex].id}-${initialMatches[nextMatchIndex].id}`,
            source: initialMatches[currentMatchIndex].id,
            target: initialMatches[nextMatchIndex].id,
            ...edgeOptions,
          });
        }
      }

      matchesProcessed += matchesInCurrentRound;
      currentRound++;
    }

    return edges;
  }, [totalMatches, totalRounds]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const nodeTypes = useMemo(() => ({ match: MatchNode }), []);

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="w-full h-svh bg-zinc-900 rounded-md">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.1}
          maxZoom={1.5}
          defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
          defaultEdgeOptions={edgeOptions}
          proOptions={{ hideAttribution: true }}
          draggable={false}
          nodesDraggable={false}
        >
          <Background color="#27272a" gap={16} />
          {!isSetting && (
            <MiniMap
              nodeColor="#475569"
              maskColor="rgba(0, 0, 0, 0.2)"
              className="!bg-zinc-900"
            />
          )}
          {!isSetting && <Controls />}
        </ReactFlow>
      </div>
      <div className=" flex justify-end gap-2">
        <Button className="">대진표 저장</Button>
        <Button className="">대진표 초기화</Button>
      </div>
    </div>
  );
};

export default BracketTest2;
