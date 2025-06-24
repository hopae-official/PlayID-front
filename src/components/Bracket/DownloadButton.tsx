import {
  Panel,
  useReactFlow,
  getNodesBounds,
  getViewportForBounds,
} from "@xyflow/react";
import { toPng } from "html-to-image";
import { Button } from "../ui/button";
import { DownloadIcon } from "lucide-react";

const downloadImage = (dataUrl: string) => {
  const a = document.createElement("a");

  a.setAttribute("download", "reactflow.png");
  a.setAttribute("href", dataUrl);
  a.click();
};

const imageWidth = 1024;
const imageHeight = 768;

const DownloadButton = () => {
  const { getNodes } = useReactFlow();
  const onClick = () => {
    // we calculate a transform for the nodes so that all nodes are visible
    // we then overwrite the transform of the `.react-flow__viewport` element
    // with the style option of the html-to-image library
    const nodesBounds = getNodesBounds(getNodes());
    const viewport = getViewportForBounds(
      nodesBounds,
      imageWidth,
      imageHeight,
      0.5,
      2,
      {
        x: 10,
        y: 10,
      }
    );

    toPng(document.querySelector(".react-flow__viewport") as HTMLElement, {
      backgroundColor: "#1a365d",
      width: imageWidth,
      height: imageHeight,
      style: {
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      },
    }).then(downloadImage);
  };

  return (
    <Panel position="top-left">
      <Button
        variant="outline"
        size="icon"
        className="download-btn xy-theme__button cursor-pointer"
        onClick={onClick}
      >
        <DownloadIcon className="w-4 h-4" />
      </Button>
    </Panel>
  );
};

export default DownloadButton;
