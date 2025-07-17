import {
  bracketControllerCreateBracket,
  bracketControllerDeleteBracket,
  bracketControllerGetBracket,
  bracketControllerInitializeBracketStructure,
} from "@/api";
import type {BracketControllerCreateBracket200, CreateBracketDto, InitializeBracketStructureDto,} from "@/api/model";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";

export const getBracket = (bracketId: number) => {
  return useQuery({
    queryKey: ["getBracket", bracketId],
    queryFn: async () => {
      const response = await bracketControllerGetBracket(bracketId);
      return response.data;
    },
    enabled: !!bracketId,
    retry: false,
  });
};

export const createBracket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bracket: CreateBracketDto) => {
      const response = await bracketControllerCreateBracket(bracket);
      return (response as BracketControllerCreateBracket200).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["getStages"]});
      queryClient.invalidateQueries({queryKey: ["competitionsMy"]})
    },
  });
};

export const createBracketStructure = () => {
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
      queryClient.invalidateQueries({queryKey: ["getStages"]});
      queryClient.invalidateQueries({queryKey: ["getBracket"]});
      queryClient.invalidateQueries({queryKey: ["getBracketGroups"]});
    },
  });
};

export const deleteBracket = (refreshQueries: boolean = false) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bracketId: number) => {
      const response = await bracketControllerDeleteBracket(bracketId);
      return response;
    },
    onSuccess: () => {
      if (refreshQueries) {
        queryClient.invalidateQueries({queryKey: ["getStages"]});
        queryClient.invalidateQueries({queryKey: ["getBracket"]});
        queryClient.invalidateQueries({queryKey: ["getBracketGroups"]});
        queryClient.invalidateQueries({queryKey: ["competitionsMy"]});
        toast.success("대진표가 삭제되었습니다.");
      }
    },
    onError: () => {
      toast.error("대진표 삭제에 실패했습니다.");
    },
  });
};
