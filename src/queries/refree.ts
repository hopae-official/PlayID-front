import { useQuery } from "@tanstack/react-query";
import { refereeControllerFindAll } from "@/api";

export const useGetReferees = () => {
  return useQuery({
    queryKey: ["referees"],
    queryFn: refereeControllerFindAll,
  });
};
