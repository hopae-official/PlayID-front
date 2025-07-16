import {competitionsControllerFindHostingCompetitions} from "@/api";
import {useQuery} from "@tanstack/react-query";
import {useAuth} from "@clerk/clerk-react";

export const useCompetitionsMyQuery = () => {
  const {isSignedIn} = useAuth()
  return useQuery({
    queryKey: ["competitionsMy"],
    queryFn: async () => {
      const response = await competitionsControllerFindHostingCompetitions();
      return response.data;
    },
    enabled: isSignedIn
  });
};
