import {
  matchControllerGetSetParticipantStats,
  matchControllerGetSetResults,
  matchControllerSaveSetParticipantStats,
  matchControllerSaveSetResults,
  matchControllerSetMatchWinnerAndProgression,
  matchControllerUpdateMatch,
} from "@/api";
import type {
  MatchControllerUploadSetResultScreenshot200,
  SaveSetParticipantStatsDto,
  SaveSetResultsDto,
  SetMatchWinnerAndProgressionDto,
  UpdateMatchDto,
} from "@/api/model";
import { customInstance } from "@/lib/axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const getSetMatchesResults = (matchId: number, enabled: boolean) => {
  return useQuery({
    queryKey: ["set-matches-results", matchId],
    queryFn: async () => {
      const response = await matchControllerGetSetResults(matchId);
      return response.data;
    },
    enabled,
  });
};

export const patchSetMatchesResults = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      matchId,
      saveSetResultsDto,
    }: {
      matchId: number;
      saveSetResultsDto: SaveSetResultsDto;
    }) => {
      await matchControllerSaveSetResults(matchId, saveSetResultsDto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["getStages"] });
      queryClient.invalidateQueries({ queryKey: ["getBracket"] });
      queryClient.invalidateQueries({ queryKey: ["getBracketGroups"] });
    },
  });
};

export const getSetParticipantStats = (matchId: number, enabled: boolean) => {
  return useQuery({
    queryKey: ["set-participant-stats", matchId],
    queryFn: async () => {
      const response = await matchControllerGetSetParticipantStats(matchId);
      return response.data;
    },
    enabled,
  });
};

export const patchSetParticipantStats = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      matchId,
      saveSetParticipantStatsDto,
    }: {
      matchId: number;
      saveSetParticipantStatsDto: SaveSetParticipantStatsDto;
    }) => {
      await matchControllerSaveSetParticipantStats(
        matchId,
        saveSetParticipantStatsDto
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["getStages"] });
      queryClient.invalidateQueries({ queryKey: ["getBracket"] });
      queryClient.invalidateQueries({ queryKey: ["getBracketGroups"] });
    },
  });
};

export const uploadSetResultScreenshot = (
  matchId: number,
  setResultId: number,
  file: File
) => {
  const formData = new FormData();
  formData.append("file", file);
  console.log(file);
  console.log(formData);

  return customInstance<MatchControllerUploadSetResultScreenshot200 | void>({
    url: `/matches/${matchId}/set-results/${setResultId}/screenshots`,
    method: "POST",
    data: formData,
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const updateMatch = () => {
  return useMutation({
    mutationFn: async ({
      matchId,
      updateMatchDto,
    }: {
      matchId: number;
      updateMatchDto: UpdateMatchDto;
    }) => {
      await matchControllerUpdateMatch(matchId, updateMatchDto);
    },
  });
};

export const patchMatchProgress = () => {
  return useMutation({
    mutationFn: async ({
      matchId,
      progress,
    }: {
      matchId: number;
      progress: SetMatchWinnerAndProgressionDto;
    }) => {
      await matchControllerSetMatchWinnerAndProgression(matchId, progress);
    },
  });
};
