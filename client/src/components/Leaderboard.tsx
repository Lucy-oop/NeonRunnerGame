import { useScores } from "@/hooks/use-scores";
import { Trophy, Medal } from "lucide-react";

export function Leaderboard() {
  const { data: scores, isLoading } = useScores();

  if (isLoading) {
    return <div className="text-center font-pixel text-xs animate-pulse text-muted-foreground">LOADING SCORES...</div>;
  }

  if (!scores || scores.length === 0) {
    return <div className="text-center font-pixel text-xs text-muted-foreground">NO SCORES YET</div>;
  }

  // Top 5 only
  const topScores = scores.slice(0, 5);

  return (
    <div className="bg-muted/80 backdrop-blur-md p-3 md:p-6 rounded-none border-2 border-border relative max-h-[30vh] overflow-y-auto">
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-background px-4 font-pixel text-primary text-[10px] md:text-xs border border-border whitespace-nowrap z-10">
        HIGH SCORES
      </div>
      
      <div className="space-y-2 md:space-y-4 mt-2">
        {topScores.map((score, index) => (
          <div key={score.id} className="flex items-center justify-between font-mono text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
            <div className="flex items-center gap-3">
              <span className={`
                flex items-center justify-center w-6 h-6 rounded-none text-xs font-bold font-pixel
                ${index === 0 ? 'text-accent' : 
                  index === 1 ? 'text-gray-400' : 
                  index === 2 ? 'text-orange-400' : 'text-muted-foreground'}
              `}>
                {index + 1}.
              </span>
              <span className="truncate max-w-[120px] uppercase font-bold tracking-tight">
                {score.playerName}
              </span>
            </div>
            <span className="text-primary font-pixel text-xs">
              {score.score.toString().padStart(5, '0')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
