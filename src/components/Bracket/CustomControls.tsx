import { Panel, useReactFlow } from "@xyflow/react";
import { Plus, Minus, Expand, SquarePen, Trash2, Shrink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExpandStore } from "@/stores/expand";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { DialogClose, DialogTrigger } from "@radix-ui/react-dialog";
import { useState } from "react";

export const CustomControlMenu = {
  ZOOM_IN: "ZOOM_IN",
  ZOOM_OUT: "ZOOM_OUT",
  EXPAND: "EXPAND",
  EDIT: "EDIT",
  DELETE: "DELETE",
} as const;

export type CustomControlMenuType =
  (typeof CustomControlMenu)[keyof typeof CustomControlMenu];

interface CustomControlProps {
  menus?: CustomControlMenuType[];
  onClick?: (menu: CustomControlMenuType) => void;
}

const CustomControls = ({ menus, onClick }: CustomControlProps) => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { isExpand, setIsExpand } = useExpandStore();
  const [isDeleteBracketOpen, setIsDeleteBracketOpen] = useState(false);

  const handleClickZoomIn = () => {
    zoomIn();
  };

  const handleClickZoomOut = () => {
    zoomOut();
  };

  const handleClickExpand = () => {
    fitView();
    setIsExpand(!isExpand);
    onClick?.(CustomControlMenu.EXPAND);
  };

  const handleClickEdit = () => {
    onClick?.(CustomControlMenu.EDIT);
  };

  const handleClickDelete = () => {
    onClick?.(CustomControlMenu.DELETE);
    setIsDeleteBracketOpen(false);
  };

  return (
    <Panel position="top-right">
      <div className="flex items-center gap-2">
        <div className="flex border-1 border-[rgba(255, 255, 255, 0.10)] rounded-md">
          {menus?.includes(CustomControlMenu.ZOOM_IN) && (
            <Button
              size="icon"
              variant="ghost"
              className="w-8 h-8 border-[rgba(255, 255, 255, 0.10)] rounded-none cursor-pointer"
              aria-label={CustomControlMenu.ZOOM_IN}
              onClick={handleClickZoomIn}
            >
              <Plus />
            </Button>
          )}
          {menus?.includes(CustomControlMenu.ZOOM_OUT) && (
            <Button
              size="icon"
              variant="ghost"
              className="w-8 h-8 border-r border-l border-[rgba(255, 255, 255, 0.10)] rounded-none cursor-pointer"
              aria-label={CustomControlMenu.ZOOM_OUT}
              onClick={handleClickZoomOut}
            >
              <Minus />
            </Button>
          )}
          {menus?.includes(CustomControlMenu.EXPAND) && (
            <Button
              size="icon"
              variant="ghost"
              className="w-8 h-8 rounded-none cursor-pointer"
              aria-label={CustomControlMenu.EXPAND}
              onClick={handleClickExpand}
            >
              {!isExpand ? <Expand /> : <Shrink />}
            </Button>
          )}
        </div>
        <div className="flex border-1 border-[rgba(255, 255, 255, 0.10)] rounded-md">
          {menus?.includes(CustomControlMenu.EDIT) && (
            <Button
              size="icon"
              variant="ghost"
              className="w-8 h-8 border-r border-l border-[rgba(255, 255, 255, 0.10)] rounded-none cursor-pointer"
              aria-label={CustomControlMenu.EDIT}
              onClick={handleClickEdit}
            >
              <SquarePen />
            </Button>
          )}
          {menus?.includes(CustomControlMenu.DELETE) && (
            <Dialog
              open={isDeleteBracketOpen}
              onOpenChange={setIsDeleteBracketOpen}
            >
              <DialogTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-8 h-8 rounded-none cursor-pointer"
                  aria-label={CustomControlMenu.DELETE}
                >
                  <Trash2 />
                </Button>
              </DialogTrigger>
              <DialogContent showCloseButton={false}>
                <DialogHeader>
                  <DialogTitle className="text-red-600 text-lg font-bold">
                    대진표를 삭제하시겠습니까?
                  </DialogTitle>
                  <DialogDescription>
                    대진표를 삭제하면 경기결과를 포함한 모든 데이터를 복구할 수
                    없어요.
                  </DialogDescription>
                  <DialogFooter className="mt-4">
                    <DialogClose asChild>
                      <Button variant="outline" className="cursor-pointer">
                        취소
                      </Button>
                    </DialogClose>
                    <Button
                      variant="destructive"
                      className="cursor-pointer"
                      onClick={handleClickDelete}
                    >
                      삭제
                    </Button>
                  </DialogFooter>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </Panel>
  );
};

export default CustomControls;
