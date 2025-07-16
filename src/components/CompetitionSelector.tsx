import {useCompetition} from "@/contexts/CompetitionContext";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";

const CompetitionSelector = () => {
  const {workspaceCompetitions: competitions, selectedCompetition, changeCompetition} = useCompetition();

  if (!selectedCompetition || competitions.length === 0) {
    return <span className="text-sm">대회 목록</span>;
  }

  return (
    <Select
      value={selectedCompetition.id.toString()}
      onValueChange={(value) => {
        const competition = competitions.find(c => c.id.toString() === value);
        if (competition) {
          changeCompetition(competition);
        }
      }}
    >
      <SelectTrigger className="w-fit border-0 h-auto p-0 text-sm hover:bg-transparent focus:ring-0 px-3">
        <SelectValue/>
      </SelectTrigger>
      <SelectContent>
        {competitions.map((competition) => (
          <SelectItem key={competition.id} value={competition.id.toString()}>
            {competition.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CompetitionSelector;
