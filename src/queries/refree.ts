import { useQuery } from "@tanstack/react-query";
import {
  refereeControllerFindAll,
  refereeControllerFindRefereeCompetitions,
} from "@/api";
import type { RefereeControllerFindRefereeCompetitionsParams } from "@/api/model";

export const getReferees = () => {
  return useQuery({
    queryKey: ["referees"],
    queryFn: refereeControllerFindAll,
  });
};

export const getRefereesByCompetitionId = (
  competitionId: number,
  params?: RefereeControllerFindRefereeCompetitionsParams
) => {
  return useQuery({
    queryKey: ["refereesByCompetitionId", competitionId, params],
    queryFn: async () => {
      const response = await refereeControllerFindRefereeCompetitions(
        competitionId,
        params
      );
      return response.data;
    },
  });
};
