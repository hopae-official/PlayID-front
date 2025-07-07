import { bracketGroupControllerGetBracketGroupOverview } from "@/api";
import { useQuery } from "@tanstack/react-query";

export const getBracketGroups = (bracketId: number) => {
  return useQuery({
    queryKey: ["getBracketGroups", bracketId],
    queryFn: async () => {
      const response = await bracketGroupControllerGetBracketGroupOverview(
        bracketId
      );
      return response.data;
    },
    enabled: !!bracketId,
  });
};
