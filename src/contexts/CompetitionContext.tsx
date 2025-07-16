import React, {createContext, type ReactNode, useContext, useEffect, useMemo, useState} from 'react';
import {type Competition} from '@/api/model';
import {getCompetitionsMy} from '@/queries/competitions';
import {toast} from 'sonner';
import {
  getCompetitionsByWorkspace,
  getDefaultCompetitionForWorkspace,
  getWorkspaces,
  type Workspace
} from '@/lib/workspace-utils';

interface CompetitionContextType {
    competitions: Competition[];
    selectedCompetition: Competition | null;
    changeCompetition: (competition: Competition) => void;
    workspaces: Workspace[];
    selectedWorkspace: Workspace | null;
    changeWorkspace: (workspace: Workspace) => void;
    workspaceCompetitions: Competition[];
}

const CompetitionContext = createContext<CompetitionContextType | undefined>(undefined);

export const useCompetition = () => {
    const context = useContext(CompetitionContext);
    if (!context) {
        throw new Error('useCompetition must be used within a CompetitionProvider');
    }
    return context;
};

interface CompetitionProviderProps {
    children: ReactNode;
}

export const CompetitionProvider: React.FC<CompetitionProviderProps> = ({children}) => {
    const workspaces = useMemo(() => getWorkspaces(), []);
    const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
    const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
    const {data: competitions = [], isError} = getCompetitionsMy();


    const workspaceCompetitions = useMemo(() => {
        if (!selectedWorkspace) return competitions;
        return getCompetitionsByWorkspace(competitions, selectedWorkspace.id);
    }, [competitions, selectedWorkspace]);

    useEffect(() => {
        if (isError) {
            toast.error('대회 목록을 불러오는데 실패했습니다.');
        }
    }, [isError]);

    useEffect(() => {
        if (workspaces.length > 0 && !selectedWorkspace) {
            setSelectedWorkspace(workspaces[0]);
        }
    }, [workspaces, selectedWorkspace]);

    useEffect(() => {
        if (selectedWorkspace && competitions.length > 0) {
            const isCurrentCompetitionInWorkspace = selectedCompetition &&
                selectedCompetition.workspaceId === selectedWorkspace.id;

            if (!selectedCompetition || !isCurrentCompetitionInWorkspace) {
                const defaultCompetition = getDefaultCompetitionForWorkspace(
                    competitions,
                    selectedWorkspace.id
                );
                setSelectedCompetition(defaultCompetition);
            }
        }
    }, [competitions, selectedWorkspace, selectedCompetition]);

    const changeCompetition = (competition: Competition) => {
        setSelectedCompetition(competition);
    };

    const changeWorkspace = (workspace: Workspace) => {
        setSelectedWorkspace(workspace);
    };

    const value: CompetitionContextType = {
        competitions,
        selectedCompetition,
        changeCompetition,
        workspaces,
        selectedWorkspace,
        changeWorkspace,
        workspaceCompetitions,
    };

    return (
        <CompetitionContext.Provider value={value}>
            {children}
        </CompetitionContext.Provider>
    );
};
