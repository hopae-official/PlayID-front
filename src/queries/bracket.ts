import {
  bracketControllerCreateBracket,
  bracketControllerInitializeBracketStructure,
} from "@/api";
import type {
  BracketControllerCreateBracket200,
  CreateBracketDto,
  InitializeBracketStructureDto,
} from "@/api/model";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const createBracket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bracket: CreateBracketDto) => {
      const response = await bracketControllerCreateBracket(bracket);
      return (response as BracketControllerCreateBracket200).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["getStages"] });
    },
  });
};

export const createBracketStream = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      bracketId,
      initializeBracketStructureDto,
    }: {
      bracketId: number;
      initializeBracketStructureDto: InitializeBracketStructureDto;
    }) => {
      const response = await bracketControllerInitializeBracketStructure(
        bracketId,
        initializeBracketStructureDto
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["getStages"] });
    },
  });
};
