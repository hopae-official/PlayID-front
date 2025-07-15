import React, {createContext, type ReactNode, useContext, useEffect, useState} from 'react';
import {type Competition} from '@/api/model';
import {getCompetitionsMy} from '@/queries/competitions';
import {toast} from 'sonner';

interface CompetitionContextType {
  competitions: Competition[];
  selectedCompetition: Competition | null;
  changeCompetition: (competition: Competition) => void;
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
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const {data: competitions = [], isError} = getCompetitionsMy();

  useEffect(() => {
    if (isError) {
      toast.error('대회 목록을 불러오는데 실패했습니다.');
    }
  }, [isError]);

  useEffect(() => {
    if (competitions.length > 0 && !selectedCompetition) {
      setSelectedCompetition(competitions[0]);
    }
  }, [competitions, selectedCompetition]);

  const changeCompetition = (competition: Competition) => {
    setSelectedCompetition(competition);
  };

  const value: CompetitionContextType = {
    competitions,
    selectedCompetition,
    changeCompetition,
  };

  return (
    <CompetitionContext.Provider value={value}>
      {children}
    </CompetitionContext.Provider>
  );
};
