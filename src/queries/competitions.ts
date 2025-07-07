import { competitionsControllerFindHostingCompetitions } from "@/api";
import { useQuery } from "@tanstack/react-query";

export const getCompetitionsMy = () => {
  return useQuery({
    queryKey: ["competitionsMy"],
    queryFn: async () => {
      const response = await competitionsControllerFindHostingCompetitions();
      return response.data;
    },
  });
};
