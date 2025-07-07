import { roundControllerUpdateRound } from "@/api";
import type { UpdateRoundDto } from "@/api/model";
import { useMutation } from "@tanstack/react-query";

export const updateRound = () => {
  return useMutation({
    mutationFn: async ({
      roundId,
      updateRoundDto,
    }: {
      roundId: number;
      updateRoundDto: UpdateRoundDto;
    }) => {
      await roundControllerUpdateRound(roundId, updateRoundDto);
    },
  });
};
