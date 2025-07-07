import { Panel } from "@xyflow/react";
import type { Group } from "@/pages/Bracket/BracketCreate";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";

interface GroupToggleButtonProps {
  groups?: Group[];
  selectedGroupId?: string;
  onChange?: (groupId: string) => void;
}

// 조 8개씩 보여주기 위해 배열을 8개씩 나누는 함수
const chunkArray = <T,>(array: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

const GroupToggleButton = ({
  groups,
  selectedGroupId,
  onChange,
}: GroupToggleButtonProps) => {
  const groupChunks = chunkArray(groups ?? [], 8);

  return (
    <Panel position="top-left">
      <Tabs value={selectedGroupId}>
        {groupChunks.map((chunk, idx) => (
          <TabsList key={idx} className="mb-2">
            {chunk.map((group) => (
              <TabsTrigger
                className="cursor-pointer dark:data-[state=active]:bg-zinc-950 py-1 px-3"
                key={group.id}
                value={group.id}
                onClick={() => onChange?.(group.id)}
              >
                {group.name}
              </TabsTrigger>
            ))}
          </TabsList>
        ))}
      </Tabs>
    </Panel>
  );
};

export default GroupToggleButton;
