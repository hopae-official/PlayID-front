import type {Competition} from '@/api/model';

export interface Workspace {
    id: string;
    name: string;
    plan: string;
}

export const getWorkspaces = (): Workspace[] => {
    return [
        {
            id: "PLAY_ID_WS",
            name: "Acme Inc",
            plan: "Enterprise",
        },
        {
            id: '2',
            name: "Acme Corp.",
            plan: "Enterprise",
        },
        {
            id: '3',
            name: "Evil Corp.",
            plan: "Enterprise",
        },
    ];
};

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