import {
  stageControllerCreateStage,
  stageControllerDeleteStage,
  stageControllerGetStage,
  stageControllerGetStages,
} from "@/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const getStages = (competitionId: number, gameTypeId: number) => {
  return useQuery({
    queryKey: ["getStages", competitionId, gameTypeId],
    queryFn: async () => {
      const response = await stageControllerGetStages({
        competitionId,
        gameTypeId,
      });
      return response.data;
    },
  });
};

export const getStage = (stageId: number) => {
  return useQuery({
    queryKey: ["getStage", stageId],
    queryFn: async () => {
      const response = await stageControllerGetStage(stageId);
      return response.data;
    },
    enabled: !!stageId,
  });
};

export const createStage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      competitionId,
      gameTypeId,
      name,
    }: {
      competitionId: number;
      gameTypeId: number;
      name: string;
    }) => {
      const response = await stageControllerCreateStage({
        competitionId,
        gameTypeId,
        name,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["getStages"] });
    },
  });
};

export const deleteStage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await stageControllerDeleteStage(id);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["getStages"] });
    },
  });
};
