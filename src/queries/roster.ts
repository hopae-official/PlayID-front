import { rosterControllerFindAllByQuery } from "@/api";
import type { RosterControllerFindAllByQueryParams } from "@/api/model";
import { useQuery } from "@tanstack/react-query";

export const getAllRosters = (params: RosterControllerFindAllByQueryParams) => {
  return useQuery({
    queryKey: ["rosters", params],
    queryFn: async () => {
      return await rosterControllerFindAllByQuery(params);
    },
    enabled: !!params.gameTypeId,
  });
};
