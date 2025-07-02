import { rosterControllerFindAllByQuery } from "@/api";
import type { RosterControllerFindAllByQueryParams } from "@/api/model";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export const getAllRosters = (params: RosterControllerFindAllByQueryParams) => {
  return useQuery({
    queryKey: ["rosters", params],
    queryFn: async () => {
      try {
        return await rosterControllerFindAllByQuery(params);
      } catch (error) {
        toast.error("로스터 데이터를 불러오는데 실패했습니다.");
        return [];
      }
    },
    enabled: !!params.gameTypeId,
  });
};
