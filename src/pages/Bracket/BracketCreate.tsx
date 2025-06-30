import { useReducer, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeftIcon, Asterisk, MinusIcon, PlusIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { v4 as uuidv4 } from "uuid";
import { Input } from "@/components/ui/input";
import BracketBoard, { BOARD_TYPE, type Match } from "./BracketBoard";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import AssignCompetitorDialog from "@/components/Bracket/AssignCompetitorDialog";
import { useExpandStore } from "@/stores/expand";

export type Competitor = {
  id: string;
  name: string;
};

export type Group = {
  id: string;
  name: string;
  competitors: Competitor[];
  matches: Match[];
  // 프리포올 대진표 생성 시 사용
  totalRounds?: number;
};

export type BracketType = "single" | "free";

export type Stage = {
  id: string;
  name: string;
  competitors: Competitor[];
  groups: Group[];
  isThirdPlace: boolean;
  bracketType: BracketType;
  matches: Match[];
  // 프리포올 대진표 생성 시 사용
  totalRounds?: number;
};

export type Action =
  | { type: "SET_STAGE_NAME"; payload: string }
  | { type: "ADD_COMPETITOR"; payload: { rosters: Competitor[] } }
  | { type: "DELETE_COMPETITOR" }
  | {
      type: "SET_COMPETITORS_COUNT";
      payload: { count: number; rosters: Competitor[] };
    }
  | { type: "ENSURE_MINIMUM_COMPETITORS" }
  | { type: "TOGGLE_THIRD_PLACE" }
  | { type: "SET_GROUPS"; payload: { enabled: boolean; rosters: Competitor[] } }
  | { type: "ADD_GROUP" }
  | { type: "DELETE_GROUP"; payload: string }
  | { type: "CHANGE_GROUP_NAME"; payload: { id: string; name: string } }
  | {
      type: "CHANGE_GROUP_COMPETITOR_COUNT";
      payload: { id: string; newCount: number; rosters: Competitor[] };
    }
  | { type: "SET_MATCHES"; payload: Match[] }
  | { type: "SET_GROUP_MATCHES"; payload: { id: string; matches: Match[] } }
  | { type: "SET_BRACKET_TYPE"; payload: BracketType }
  | { type: "SET_TOTAL_ROUNDS"; payload: number }
  | { type: "SET_ASSIGN_COMPETITORS"; payload: Competitor[] }
  | { type: "SET_ASSIGN_GROUPS_COMPETITORS"; payload: Group[] }
  | { type: "RESET_STAGE" };

const stageReducer = (state: Stage, action: Action): Stage => {
  switch (action.type) {
    case "SET_STAGE_NAME":
      return { ...state, name: action.payload };

    case "ADD_COMPETITOR":
      if (
        action.payload.rosters.length > 2 &&
        state.competitors.length >= action.payload.rosters.length
      ) {
        return state;
      }
      return {
        ...state,
        competitors: [...state.competitors, { id: uuidv4(), name: "" }],
      };

    case "DELETE_COMPETITOR":
      if (state.competitors.length <= 2) return state;
      return { ...state, competitors: state.competitors.slice(0, -1) };

    case "SET_COMPETITORS_COUNT": {
      const { count, rosters } = action.payload;
      if (isNaN(count)) return state;
      if (rosters.length > 2 && count > rosters.length) {
        return { ...state, competitors: rosters };
      }
      const currentCompetitors = state.competitors;
      const newCompetitors = Array.from({ length: count }, (_, i) => {
        return currentCompetitors[i] || { id: uuidv4(), name: "" };
      });
      return { ...state, competitors: newCompetitors };
    }

    case "ENSURE_MINIMUM_COMPETITORS":
      if (state.competitors.length < 2) {
        const newCompetitors = [...state.competitors];
        while (newCompetitors.length < 2) {
          newCompetitors.push({ id: uuidv4(), name: "" });
        }
        return { ...state, competitors: newCompetitors };
      }
      return state;

    case "TOGGLE_THIRD_PLACE":
      return { ...state, isThirdPlace: !state.isThirdPlace };

    case "SET_GROUPS": {
      const { enabled, rosters } = action.payload;
      if (!enabled) {
        return { ...state, groups: [] };
      }
      const splitIndex = Math.floor(rosters.length / 2);
      return {
        ...state,
        groups: [
          {
            id: uuidv4(),
            name: "A조",
            competitors:
              rosters.length > 2
                ? Array.from({ length: splitIndex }, () => ({
                    id: uuidv4(),
                    name: "",
                  }))
                : [
                    {
                      id: uuidv4(),
                      name: "",
                    },
                    {
                      id: uuidv4(),
                      name: "",
                    },
                  ],
            matches: [],
          },
          {
            id: uuidv4(),
            name: "B조",
            competitors:
              rosters.length > 2
                ? Array.from({ length: rosters.length - splitIndex }, () => ({
                    id: uuidv4(),
                    name: "",
                  }))
                : [
                    {
                      id: uuidv4(),
                      name: "",
                    },
                    {
                      id: uuidv4(),
                      name: "",
                    },
                  ],
            matches: [],
          },
        ],
      };
    }

    case "ADD_GROUP": {
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      if (state.groups.length >= alphabet.length) return state;
      const name = `${alphabet[state.groups.length]}조`;
      return {
        ...state,
        groups: [
          ...state.groups,
          { id: uuidv4(), name, competitors: [], matches: [] },
        ],
      };
    }

    case "DELETE_GROUP":
      return {
        ...state,
        groups: state.groups.filter((group) => group.id !== action.payload),
      };

    case "CHANGE_GROUP_NAME":
      return {
        ...state,
        groups: state.groups.map((group) =>
          group.id === action.payload.id
            ? { ...group, name: action.payload.name }
            : group
        ),
      };

    case "CHANGE_GROUP_COMPETITOR_COUNT": {
      const { id, newCount, rosters } = action.payload;

      if (newCount > 1000) {
        toast.error("최대 1000개 이상의 팀을 추가할 수 없습니다.");
        return state;
      }

      const otherGroupsCompetitorsSum = state.groups.reduce((sum, group) => {
        return group.id !== id ? sum + group.competitors.length : sum;
      }, 0);

      if (
        rosters.length > 2 &&
        otherGroupsCompetitorsSum + newCount > rosters.length
      ) {
        toast.error("참가 팀 수를 초과했습니다.");
        return state;
      }

      return {
        ...state,
        groups: state.groups.map((group) =>
          group.id === id
            ? {
                ...group,
                competitors: Array.from({ length: newCount }, () => ({
                  id: uuidv4(),
                  name: "",
                })),
              }
            : group
        ),
      };
    }

    case "SET_MATCHES": {
      return {
        ...state,
        matches: action.payload,
      };
    }

    case "SET_GROUP_MATCHES": {
      return {
        ...state,
        groups: state.groups.map((group) =>
          group.id === action.payload.id
            ? { ...group, matches: action.payload.matches }
            : group
        ),
      };
    }

    case "SET_BRACKET_TYPE":
      return { ...state, bracketType: action.payload, totalRounds: 1 };

    case "SET_TOTAL_ROUNDS":
      return { ...state, totalRounds: action.payload };

    case "SET_ASSIGN_COMPETITORS":
      return {
        ...state,
        competitors: [
          ...action.payload,
          ...state.competitors.slice(action.payload.length),
        ],
      };

    case "SET_ASSIGN_GROUPS_COMPETITORS": {
      return {
        ...state,
        groups: action.payload.map((group) => ({
          ...group,
          competitors: group.competitors.map((competitor) => ({
            ...competitor,
            name: competitor.name || "",
          })),
        })),
      };
    }

    case "RESET_STAGE":
      return {
        ...state,
        competitors: state.competitors.map(() => ({
          id: uuidv4(),
          name: "",
        })),
        groups: [],
        matches: [],
        isThirdPlace: false,
        bracketType: "single",
        totalRounds: 1,
      };

    default:
      return state;
  }
};

const RosterUnconfirmedDialog = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button
        variant="ghost"
        className="text-blue-500 cursor-pointer underline"
      >
        로스터 미확정
      </Button>
    </DialogTrigger>
    <DialogContent className="sm:max-w-[425px]" showCloseButton={false}>
      <DialogHeader>
        <DialogTitle>로스터를 확정하러 가시겠습니까?</DialogTitle>
        <DialogDescription>
          로스터를 확정하면 대진 배정을 할 수 있어요
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">취소</Button>
        </DialogClose>
        <Button>이동</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// 최소 남은 팀 수 체크 함수
const checkMinimumRemainingTeams = (
  rosters: Competitor[],
  groups: Group[]
): boolean => {
  if (
    rosters.length > 2 &&
    rosters.length === groups.reduce((acc, g) => acc + g.competitors.length, 0)
  ) {
    toast.error("확정 참가팀 수를 초과했습니다.");
    return false;
  }

  if (
    rosters.length > 2 &&
    rosters.length - groups.reduce((acc, g) => acc + g.competitors.length, 0) <
      2
  ) {
    toast.error("최소 2개 이상의 팀이 필요합니다.");
    return false;
  }
  return true;
};

const BracketCreate = () => {
  const navigate = useNavigate();
  const { isExpand } = useExpandStore();
  const stageNameRef = useRef<HTMLInputElement>(null);
  const [isCreateBracket, setIsCreateBracket] = useState<boolean>(false);
  const [stageNameError, setStageNameError] = useState<boolean>(false);
  const [rosters] = useState<Competitor[]>([
    { id: uuidv4(), name: "테스트1" },
    { id: uuidv4(), name: "테스트2" },
    { id: uuidv4(), name: "테스트3" },
    { id: uuidv4(), name: "테스트4" },
    { id: uuidv4(), name: "테스트5" },
    { id: uuidv4(), name: "테스트6" },
    { id: uuidv4(), name: "테스트7" },
    { id: uuidv4(), name: "테스트8" },
    { id: uuidv4(), name: "테스트9" },
    { id: uuidv4(), name: "테스트10" },
    { id: uuidv4(), name: "테스트11" },
    { id: uuidv4(), name: "테스트12" },
    { id: uuidv4(), name: "테스트13" },
    { id: uuidv4(), name: "테스트14" },
    { id: uuidv4(), name: "테스트15" },
    { id: uuidv4(), name: "테스트16" },
    { id: uuidv4(), name: "테스트17" },
    { id: uuidv4(), name: "테스트18" },
    { id: uuidv4(), name: "테스트19" },
    { id: uuidv4(), name: "테스트20" },
  ]);

  const initialState: Stage = {
    id: uuidv4(),
    name: "",
    competitors:
      rosters.length > 0
        ? Array.from({ length: rosters.length }, () => ({
            id: uuidv4(),
            name: "",
          }))
        : [
            { id: uuidv4(), name: "" },
            { id: uuidv4(), name: "" },
          ],
    groups: [],
    isThirdPlace: false,
    bracketType: "single",
    matches: [],
  };
  const [stage, dispatch] = useReducer(stageReducer, initialState);
  const [selectedGroupId, setSelectedGroupId] = useState(stage.groups[0]?.id);

  const handleCreateBracket = () => {
    if (stage.name === "") {
      setStageNameError(true);
      stageNameRef.current?.focus();
      return;
    }

    if (stage.groups.length > 0) {
      handleChangeGroupTab(stage.groups[0].id);
    }

    setIsCreateBracket(true);
  };

  const handleAssignBracket = (competitors: Competitor[]) => {
    console.log("superstage", stage);

    if (stage.groups.length > 0) {
      console.log("여기");

      dispatch({
        type: "SET_ASSIGN_GROUPS_COMPETITORS",
        payload: stage.groups.map((group) =>
          group.id === selectedGroupId
            ? {
                ...group,
                competitors: [
                  ...competitors,
                  ...group.competitors.slice(competitors.length),
                ],
              }
            : group
        ),
      });
    } else {
      console.log("여기2");

      dispatch({ type: "SET_ASSIGN_COMPETITORS", payload: competitors });
    }
  };

  const handleChangeGroupTab = (groupId: string) => {
    setSelectedGroupId(groupId);
  };

  const handleDeleteBracket = () => {
    setIsCreateBracket(false);
    dispatch({ type: "RESET_STAGE" });
  };

  console.log("stage", stage);

  return (
    <div className="min-h-svh flex px-8 py-6 space-x-6">
      <div
        className={`w-full max-w-[320px] flex flex-col gap-4 ${
          isExpand && "hidden"
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="flex flex-col flex-1">
            <Button
              variant="ghost"
              size="icon"
              className="cursor-pointer"
              onClick={() => navigate("/bracket")}
            >
              <ArrowLeftIcon className="size-4" />
            </Button>
            <div className="mt-8">
              <Label className="text-sm font-semibold flex items-center gap-1">
                <Asterisk className="size-3 text-red-600" />
                스테이지명
              </Label>
              <Input
                ref={stageNameRef}
                className={`w-full h-10 border-zinc-700 mt-2 ${
                  stageNameError
                    ? "focus-visible:border-red-600 focus-visible:ring-red-600 focus-visible:ring-[1px]"
                    : ""
                }`}
                value={stage.name}
                onChange={(e) => {
                  dispatch({ type: "SET_STAGE_NAME", payload: e.target.value });
                  setStageNameError(false);
                }}
                placeholder="ex) 예선전"
              />
              {stageNameError && (
                <Label className="text-sm text-red-600 mt-2">
                  스테이지명을 입력해 주세요
                </Label>
              )}
            </div>

            {stage.groups.length === 0 && (
              <div className="flex flex-row justify-between mt-6 text-sm font-semibold">
                <div className="flex flex-row items-center gap-1">
                  <span className="text-sm font-semibold mr-4">참가 팀</span>
                  <Button
                    className="cursor-pointer"
                    variant="outline"
                    size="icon"
                    onClick={() => dispatch({ type: "DELETE_COMPETITOR" })}
                    disabled={stage.competitors.length <= 2}
                  >
                    <MinusIcon className="size-4" />
                  </Button>
                  <Input
                    className="w-14 h-10 text-sm font-semibold text-center"
                    value={stage.competitors.length}
                    onChange={(e) =>
                      dispatch({
                        type: "SET_COMPETITORS_COUNT",
                        payload: { count: Number(e.target.value), rosters },
                      })
                    }
                    onBlur={() =>
                      dispatch({ type: "ENSURE_MINIMUM_COMPETITORS" })
                    }
                  />
                  <Button
                    className="cursor-pointer"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      dispatch({ type: "ADD_COMPETITOR", payload: { rosters } })
                    }
                    disabled={
                      rosters.length > 2 &&
                      stage.competitors.length >= rosters.length
                    }
                  >
                    <PlusIcon className="size-4" />
                  </Button>
                </div>
                <div className="flex flex-row items-center gap-1 text-sm font-semibold">
                  {rosters.length === 0 ? (
                    <RosterUnconfirmedDialog />
                  ) : (
                    <>
                      <span>확정 참가팀수 :</span>
                      <span className="text-blue-500">{rosters.length}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            <RadioGroup
              value={stage.bracketType}
              onValueChange={(value) =>
                dispatch({
                  type: "SET_BRACKET_TYPE",
                  payload: value as BracketType,
                })
              }
              className="grid grid-cols-2 gap-4 mt-6"
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem
                  value="single"
                  id="single"
                  className="cursor-pointer"
                />
                <Label htmlFor="single" className="cursor-pointer">
                  싱글 엘리미네이션
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem
                  value="free"
                  id="free"
                  className="cursor-pointer"
                />
                <Label htmlFor="free" className="cursor-pointer">
                  프리포올
                </Label>
              </div>
            </RadioGroup>
            <div className="grid grid-cols-2 gap-4 mt-6">
              {stage.bracketType === "single" && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="third-place"
                    className="cursor-pointer"
                    checked={stage.isThirdPlace}
                    onCheckedChange={() =>
                      dispatch({ type: "TOGGLE_THIRD_PLACE" })
                    }
                  />
                  <Label htmlFor="third-place">3-4위전</Label>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Switch
                  id="group"
                  className="cursor-pointer"
                  checked={stage.groups.length > 0}
                  onCheckedChange={(enabled) => {
                    dispatch({
                      type: "SET_GROUPS",
                      payload: { enabled, rosters },
                    });
                  }}
                />
                <Label htmlFor="group">조 편성</Label>
              </div>
            </div>
            {stage.groups.length > 0 && (
              <div className="flex flex-col mt-10">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-row items-center justify-between">
                    <div className="flex flex-row items-center gap-4">
                      <Label className="text-sm font-semibold">편성조</Label>
                      <div className="flex flex-row items-center gap-4">
                        <Button
                          className="cursor-pointer"
                          variant="outline"
                          size="icon"
                          disabled={stage.groups.length <= 2}
                          onClick={() =>
                            dispatch({
                              type: "DELETE_GROUP",
                              payload: stage.groups[stage.groups.length - 1].id,
                            })
                          }
                        >
                          <MinusIcon className="size-4" />
                        </Button>
                        <span className="text-sm font-semibold">
                          {stage.groups.length}
                        </span>
                        <Button
                          className="cursor-pointer"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            if (
                              !checkMinimumRemainingTeams(rosters, stage.groups)
                            ) {
                              return;
                            }
                            dispatch({ type: "ADD_GROUP" });
                          }}
                        >
                          <PlusIcon className="size-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-row items-center gap-1 text-sm font-semibold">
                      {rosters.length === 0 ? (
                        <RosterUnconfirmedDialog />
                      ) : (
                        <>
                          <span>확정 참가팀 수 :</span>
                          <span className="text-blue-500">
                            {rosters.length}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {stage.groups.map((group, index) => (
                    <div
                      key={group.id}
                      className="flex flex-row items-center gap-1"
                    >
                      <Label className="w-12 text-sm font-semibold">
                        {`${index + 1}조`}
                      </Label>
                      <Input
                        className="w-24 h-10 text-sm"
                        value={group.name}
                        onChange={(e) =>
                          dispatch({
                            type: "CHANGE_GROUP_NAME",
                            payload: { id: group.id, name: e.target.value },
                          })
                        }
                      />
                      <Input
                        className="w-24 h-10 text-sm"
                        value={group.competitors.length}
                        onChange={(e) =>
                          dispatch({
                            type: "CHANGE_GROUP_COMPETITOR_COUNT",
                            payload: {
                              id: group.id,
                              newCount: parseInt(e.target.value, 10),
                              rosters,
                            },
                          })
                        }
                        onBlur={() => {
                          if (group.competitors.length < 2) {
                            toast.error("최소 2개 이상의 팀이 필요합니다.");
                            dispatch({
                              type: "CHANGE_GROUP_COMPETITOR_COUNT",
                              payload: {
                                id: group.id,
                                newCount: 2,
                                rosters,
                              },
                            });
                          }
                        }}
                      />
                      <Button
                        className="w-8 h-8 cursor-pointer"
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          dispatch({ type: "DELETE_GROUP", payload: group.id })
                        }
                        disabled={stage.groups.length <= 2}
                      >
                        <MinusIcon className="size-4" />
                      </Button>
                      {index === stage.groups.length - 1 && (
                        <Button
                          className="w-8 h-8 cursor-pointer"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            if (
                              !checkMinimumRemainingTeams(rosters, stage.groups)
                            ) {
                              return;
                            }
                            dispatch({ type: "ADD_GROUP" });
                          }}
                        >
                          <PlusIcon className="size-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <div className="flex flex-row items-center gap-1 text-sm font-semibold">
                    <Label className="w-12">합계</Label>
                    <span className="w-24" />
                    <span className="pl-3">
                      {stage.groups.reduce(
                        (acc, g) => acc + g.competitors.length,
                        0
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {stage.bracketType === "free" && stage.totalRounds && (
              <div className="flex flex-col flex-1 mt-10">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-row items-center justify-between">
                    <div className="flex flex-row items-center gap-4">
                      <Label className="text-sm font-semibold">라운드</Label>
                      <div className="flex flex-row items-center gap-4">
                        <Button
                          className="cursor-pointer"
                          variant="outline"
                          size="icon"
                          disabled={stage.totalRounds <= 1}
                          onClick={() =>
                            dispatch({
                              type: "SET_TOTAL_ROUNDS",
                              payload: stage.totalRounds
                                ? stage.totalRounds - 1
                                : 0,
                            })
                          }
                        >
                          <MinusIcon className="size-4" />
                        </Button>
                        <span className="text-sm font-semibold">
                          {stage.totalRounds}
                        </span>
                        <Button
                          className="cursor-pointer"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            dispatch({
                              type: "SET_TOTAL_ROUNDS",
                              payload: stage.totalRounds
                                ? stage.totalRounds + 1
                                : 1,
                            });
                          }}
                        >
                          <PlusIcon className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          {isCreateBracket && (
            <AssignCompetitorDialog
              stage={stage}
              place={
                stage.groups.length > 0
                  ? stage.groups.find((group) => group.id === selectedGroupId)
                      ?.competitors.length ?? 0
                  : stage.competitors.length
              }
              rosters={rosters}
              onAssignBracket={handleAssignBracket}
              selectedGroupId={selectedGroupId}
            />
          )}
        </div>
      </div>
      {isCreateBracket ? (
        <BracketBoard
          stage={stage}
          boardType={BOARD_TYPE.EDIT}
          dispatch={dispatch}
          selectedGroupId={selectedGroupId}
          onChangeGroupTab={handleChangeGroupTab}
          onDeleteBracket={handleDeleteBracket}
        />
      ) : (
        <div className="w-full bg-zinc-900 rounded-md shadow-sm flex items-center justify-center">
          <div className="flex flex-col gap-10">
            <Label className="text-xl text-zinc-400">
              스테이지명을 입력하고 대진표를 생성해 주세요
            </Label>
            <Button
              className="w-full font-semibold cursor-pointer"
              size="lg"
              onClick={handleCreateBracket}
            >
              대진 생성
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BracketCreate;
