import { Panel } from "@xyflow/react";
import type { CustomStage } from "@/pages/Bracket/BracketCreate";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";

interface ThirdPlaceToggleButtonProps {
  stage: CustomStage;
  onChange?: (thirdPlace: boolean) => void;
}

const ThirdPlaceToggleButton = ({
  stage,
  onChange,
}: ThirdPlaceToggleButtonProps) => {
  return (
    <Panel position="bottom-right">
      <div className="flex items-center space-x-2">
        <Switch
          id="third-place"
          className="cursor-pointer"
          checked={stage.bracket?.hasThirdPlaceMatch}
          onCheckedChange={onChange}
        />
        <Label htmlFor="third-place">3-4위전</Label>
      </div>
    </Panel>
  );
};

export default ThirdPlaceToggleButton;
