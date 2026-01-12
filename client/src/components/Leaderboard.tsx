import { useScores } from "@/hooks/use-scores";
import { Trophy } from "lucide-react";

export function Leaderboard() {
  const { data: scores, isLoading } = useScores();

  if (isLoading) {
    return <div className="text-center font-bold text-[10px] animate-pulse text-muted-foreground uppercase tracking-widest">Loading Rankings...</div>;
  }

  if (!scores || scores.length === 0) {
    return <div className="text-center font-bold text-[10px] text-muted-foreground uppercase tracking-widest">No rankings yet</div>;
  }

  const topScores = scores.slice(0, 5);

  return (
    <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/5 relative max-h-[250px] overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-4 h-4 text-accent" />
        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Global Leaderboard</h3>
      </div>
      
      <div className="space-y-3">
        {topScores.map((score, index) => (
          <div key={score.id} className="flex items-center justify-between font-sans border-b border-white/5 pb-2 last:border-0 last:pb-0">
            <div className="flex items-center gap-3">
              <span className={`
                flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black
                ${index === 0 ? 'bg-accent/20 text-accent' : 
                  index === 1 ? 'bg-white/10 text-gray-400' : 
                  index === 2 ? 'bg-white/10 text-orange-400' : 'bg-white/5 text-muted-foreground'}
              `}>
                {index + 1}
              </span>
              <span className="truncate max-w-[120px] uppercase font-black text-xs tracking-tight text-foreground">
                {score.playerName}
              </span>
            </div>
            <span className="text-primary font-black text-xs tabular-nums">
              {score.score.toString().padStart(5, '0')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
