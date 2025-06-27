import { Panel } from "@xyflow/react";
import type { Group } from "@/pages/Bracket/BracketCreate";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";

interface GroupToggleButtonProps {
  groups?: Group[];
  selectedGroupId?: string;
  onChange?: (groupId: string) => void;
}

const GroupToggleButton = ({
  groups,
  selectedGroupId,
  onChange,
}: GroupToggleButtonProps) => {
  return (
    <Panel position="top-left">
      <Tabs value={selectedGroupId}>
        <TabsList>
          {groups?.map((group) => (
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
      </Tabs>
    </Panel>
  );
};

export default GroupToggleButton;
