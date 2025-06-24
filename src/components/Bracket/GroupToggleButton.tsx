import {
  Panel,
  useReactFlow,
  getNodesBounds,
  getViewportForBounds,
} from "@xyflow/react";
import { toPng } from "html-to-image";
import { Button } from "../ui/button";
import { DownloadIcon, GroupIcon } from "lucide-react";
import type { Group } from "@/pages/Bracket/BracketCreate";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";

interface GroupToggleButtonProps {
  selectedGroup: Group;
  groups: Group[];
  onChange: (group: Group) => void;
}

const GroupToggleButton = ({
  groups,
  selectedGroup,
  onChange,
}: GroupToggleButtonProps) => {
  console.log("123", selectedGroup);
  return (
    <Panel position="top-left">
      <Tabs>
        <TabsList>
          {groups.map((group) => (
            <TabsTrigger
              className="cursor-pointer"
              defaultChecked={selectedGroup.id === group.id}
              key={group.id}
              value={group.id}
              onClick={() => onChange(group)}
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
