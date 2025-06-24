import { useMemo, useState, useEffect } from "react";
import type { Edge, Node } from "@xyflow/react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Position,
  useNodesState,
  useEdgesState,
  Handle,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";

// 타입 정의
interface Participant {
  id: string;
  name: string;
}

interface MatchData {
  id: string;
  roundName: string;
  participants: Participant[];
  nextMatchId?: string;
  [key: string]: unknown;
}

type CustomNode = Node<MatchData>;

interface BracketTest2Props {
  isSetting: boolean;
}

// 상수 정의
const LAYOUT_CONFIG = {
  roundSpacing: 300, // 라운드 간 수평 간격
  minVerticalSpacing: 150, // 최소 수직 간격 증가
  defaultZoom: 0.45, // 기본 줌 레벨 감소
  minZoom: 0.1, // 최소 줌 레벨
  maxZoom: 1.5, // 최대 줌 레벨
} as const;

// 스타일 설정
const edgeOptions = {
  style: {
    strokeWidth: 2,
    stroke: "#475569",
  },
  animated: false,
  type: "smoothstep",
} as const;

// 개선된 대진표 생성 함수 (정확한 첫 라운드 매치 수 공식 적용)
const generateBracketMatchesAccurate = (
  participants: Participant[]
): MatchData[] => {
  let round = 0;
  let matchId = 1;
  const allMatches: MatchData[] = [];
  const roundNames = [
    "1라운드",
    "2라운드",
    "3라운드",
    "4라운드",
    "5라운드",
    "6라운드",
    "7라운드",
  ];
  let roundParticipants: Participant[] = [...participants];
  let byeQueue: { participant: Participant; targetRound: number }[] = [];
  let loopCount = 0;

  while (
    (roundParticipants.length > 1 || byeQueue.length > 0) &&
    loopCount < 100
  ) {
    loopCount++;
    const matches: MatchData[] = [];
    const nextRoundParticipants: Participant[] = [];
    // 부전승 대기열에서 이번 라운드에 진입할 참가자 추가
    const enteringByes = byeQueue.filter((b) => b.targetRound === round);
    enteringByes.forEach((b) => nextRoundParticipants.push(b.participant));
    byeQueue = byeQueue.filter((b) => b.targetRound !== round);
    // 매치 생성 (정확한 공식 적용)
    const matchCount = Math.floor(roundParticipants.length / 2);
    for (let i = 0; i < matchCount; i++) {
      const p1 = roundParticipants[i * 2];
      const p2 = roundParticipants[i * 2 + 1];
      matches.push({
        id: `${matchId}`,
        roundName: roundNames[round] || `라운드${round + 1}`,
        participants: [p1, p2],
      });
      nextRoundParticipants.push({ id: `winner-${matchId}`, name: "?" });
      matchId++;
    }
    // 남는 1명은 부전승 처리
    if (roundParticipants.length % 2 === 1) {
      const bye = roundParticipants[roundParticipants.length - 1];
      byeQueue.push({ participant: bye, targetRound: round + 2 });
    }
    allMatches.push(...matches);
    roundParticipants = nextRoundParticipants;
    round++;
  }
  if (loopCount >= 100) {
    console.error(
      "무한 루프 가능성! participants:",
      participants,
      "byeQueue:",
      byeQueue,
      "roundParticipants:",
      roundParticipants
    );
  }
  // 마지막 결승 매치
  if (roundParticipants.length === 2) {
    allMatches.push({
      id: `${matchId}`,
      roundName: roundNames[round] || `라운드${round + 1}`,
      participants: [roundParticipants[0], roundParticipants[1]],
    });
  }
  return allMatches;
};

// 10명 참가자 기준 (ROUND 2에 매치 1개, 1명 부전승)
const initialMatchesData: MatchData[] = [
  // Round 1 (5 matches)
  {
    id: "1",
    roundName: "Match 1",
    participants: [
      { id: "p1", name: "A" },
      { id: "p2", name: "B" },
    ],
    nextMatchId: "6",
  },
  {
    id: "2",
    roundName: "Match 2",
    participants: [
      { id: "p3", name: "C" },
      { id: "p4", name: "D" },
    ],
    nextMatchId: "6",
  },
  {
    id: "3",
    roundName: "Match 3",
    participants: [
      { id: "p5", name: "E" },
      { id: "p6", name: "F" },
    ],
    nextMatchId: "bye1",
  }, // 부전승 후보
  {
    id: "4",
    roundName: "Match 4",
    participants: [
      { id: "p7", name: "G" },
      { id: "p8", name: "H" },
    ],
    nextMatchId: "7",
  },
  {
    id: "5",
    roundName: "Match 5",
    participants: [
      { id: "p9", name: "I" },
      { id: "p10", name: "J" },
    ],
    nextMatchId: "7",
  },
  // Round 2 (1 match)
  { id: "6", roundName: "Round 2", participants: [], nextMatchId: "8" },
  // 부전승 노드 (실제 매치는 없음, 세미파이널로 바로 진출)
  { id: "bye1", roundName: "Bye", participants: [], nextMatchId: "8" },
  // Semifinal (2 matches)
  { id: "7", roundName: "Semifinal 1", participants: [], nextMatchId: "9" },
  { id: "8", roundName: "Semifinal 2", participants: [], nextMatchId: "9" },
  // Final
  { id: "9", roundName: "Final", participants: [] },
];

// 각 매치의 depth(라운드 인덱스)를 계산해 라운드별로 그룹핑
function generateSingleElimRounds(matches: MatchData[]): MatchData[][] {
  const matchMap = new Map(matches.map((m) => [m.id, m]));
  const depthMap = new Map<string, number>();

  function getDepth(matchId: string): number {
    if (depthMap.has(matchId)) return depthMap.get(matchId)!;
    const match = matchMap.get(matchId);
    if (!match || !match.nextMatchId) {
      depthMap.set(matchId, 0);
      return 0;
    }
    const depth = getDepth(match.nextMatchId) + 1;
    depthMap.set(matchId, depth);
    return depth;
  }

  matches.forEach((m) => getDepth(m.id));

  const maxDepth = Math.max(...Array.from(depthMap.values()));
  const rounds: MatchData[][] = Array.from({ length: maxDepth + 1 }, () => []);
  matches.forEach((m) => {
    const d = depthMap.get(m.id)!;
    rounds[maxDepth - d].push(m);
  });
  return rounds;
}

// 매치 노드 컴포넌트
const MatchNode = ({ data }: { data: MatchData }) => (
  <div className="min-w-[200px] p-2 rounded-md bg-zinc-800 border border-zinc-700">
    <Handle type="target" position={Position.Left} id="target" />
    <div className="text-sm text-zinc-400 mb-2">{data.roundName}</div>
    <div className="space-y-1">
      {data.participants.map((participant) => (
        <div
          key={participant.id}
          className="h-10 flex items-center justify-between p-2 rounded bg-zinc-950"
        >
          <span className="font-medium">{participant.name}</span>
        </div>
      ))}
    </div>
    <Handle type="source" position={Position.Right} id="source" />
  </div>
);

console.log("initialMatchesData", initialMatchesData);

// 메인 컴포넌트
const BracketTest2 = ({ isSetting = true }: BracketTest2Props) => {
  // 상태 관리
  const [initialMatches, setInitialMatches] =
    useState<MatchData[]>(initialMatchesData);

  // 참가자 배열 추출 (중복 제거)
  const participants = useMemo(
    () =>
      initialMatchesData
        .flatMap((m) => m.participants)
        .filter((v, i, arr) => arr.findIndex((x) => x.id === v.id) === i),
    []
  );

  // 전체 매치 데이터 생성 (정확한 공식 적용)
  const allMatches = useMemo(
    () => generateBracketMatchesAccurate(participants),
    [participants]
  );

  console.log("allMatches", allMatches);

  // rounds 생성
  const rounds = useMemo(
    () => generateSingleElimRounds(initialMatchesData),
    []
  );

  // 노드 생성
  const initialNodes: CustomNode[] = useMemo(() => {
    const baseSpacing = LAYOUT_CONFIG.minVerticalSpacing;
    const nodes: CustomNode[] = [];
    rounds.forEach((matches, roundIdx) => {
      const totalHeight = baseSpacing * matches.length;
      matches.forEach((match, matchIdx) => {
        const verticalGap = totalHeight / matches.length;
        const y = matchIdx * verticalGap + verticalGap / 2;
        nodes.push({
          id: match.id,
          type: "match",
          position: {
            x: roundIdx * LAYOUT_CONFIG.roundSpacing,
            y,
          },
          data: match,
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          draggable: false,
        });
      });
    });
    return nodes;
  }, [rounds]);

  // 엣지 생성
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    for (let roundIdx = 1; roundIdx < rounds.length; roundIdx++) {
      const prevRound = rounds[roundIdx - 1];
      const currRound = rounds[roundIdx];
      currRound.forEach((match) => {
        prevRound.forEach((prevMatch) => {
          if (prevMatch.nextMatchId === match.id) {
            edges.push({
              id: `e${prevMatch.id}-${match.id}`,
              source: prevMatch.id,
              target: match.id,
              sourceHandle: "source",
              targetHandle: "target",
              ...edgeOptions,
            });
          }
        });
      });
    }
    return edges;
  }, [rounds]);

  // 노드와 엣지 상태 관리
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // initialNodes, initialEdges가 바뀔 때 동기화
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes]);
  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges]);

  // 노드 타입 매핑
  const nodeTypes = useMemo(() => ({ match: MatchNode }), []);

  // 대진표 저장 핸들러
  const handleSaveBracket = () => {
    // TODO: 대진표 저장 로직 구현
    // console.log("Saving bracket...", nodes);
  };

  // 대진표 초기화 핸들러
  const handleResetBracket = () => {
    setInitialMatches(initialMatchesData);
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="w-full h-[1200px] bg-zinc-900 rounded-md">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          minZoom={LAYOUT_CONFIG.minZoom}
          maxZoom={LAYOUT_CONFIG.maxZoom}
          defaultViewport={{ x: 0, y: 0, zoom: LAYOUT_CONFIG.defaultZoom }}
          defaultEdgeOptions={edgeOptions}
          proOptions={{ hideAttribution: true }}
          draggable={false}
          nodesDraggable={false}
          elementsSelectable={false}
          panOnDrag={true}
          connectOnClick={false}
        >
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
      <div>aaaa</div>
      <div className="flex justify-end gap-2">
        <Button onClick={handleSaveBracket}>대진표 저장</Button>
        <Button onClick={handleResetBracket}>대진표 초기화</Button>
      </div>
    </div>
  );
};

export default BracketTest2;
