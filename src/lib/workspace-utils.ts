import type {Competition, Workspace} from '@/api/model';
import {customInstance} from "@/lib/axios.ts";
import {useQuery} from "@tanstack/react-query";
import {useAuth} from "@clerk/clerk-react";

export const useWorkSpaceQuery = () => {
  const {isSignedIn} = useAuth()

  return useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const response = await customInstance<{ data: Workspace[] }>({method: 'GET', url: '/organization/workspaces/my'})
      return response?.data ?? []
    },
    enabled: !!isSignedIn
  })
}

export const getCompetitionsByWorkspace = (
  competitions: Competition[],
  workspaceId: string
): Competition[] => {
  return competitions.filter(competition => competition.workspaceId === workspaceId);
};

export const getDefaultCompetitionForWorkspace = (
  competitions: Competition[],
  workspaceId: string
): Competition | null => {
  const workspaceCompetitions = getCompetitionsByWorkspace(competitions, workspaceId);
  return workspaceCompetitions.length > 0 ? workspaceCompetitions[0] : null;
};
