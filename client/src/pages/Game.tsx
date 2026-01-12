import { useState } from "react";
import { GameCanvas } from "@/components/GameCanvas";
import { PixelButton } from "@/components/PixelButton";
import { Leaderboard } from "@/components/Leaderboard";
import { useSubmitScore } from "@/hooks/use-scores";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, Share2, Play, RefreshCw, Trophy } from "lucide-react";

export default function Game() {
  const [gameState, setGameState] = useState<"start" | "playing" | "gameover">("start");
  const [score, setScore] = useState(0);
  const [playerName, setPlayerName] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  
  const submitScore = useSubmitScore();

  const handleStart = () => {
    setGameState("playing");
    setScore(0);
  };

  const handleGameOver = (finalScore: number) => {
    setScore(finalScore);
    setGameState("gameover");
  };

  const handleSubmitScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    try {
      await submitScore.mutateAsync({
        playerName: playerName.trim(),
        score,
      });
      // Could show success toast here
      setPlayerName(""); // Clear input to prevent double submit spam or visual weirdness
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* CRT Scanline Effect Overlay */}
      <div className="scanline pointer-events-none fixed inset-0 z-50 opacity-20" />
      
      {/* Header */}
      <header className="absolute top-0 w-full p-4 md:p-8 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary animate-pulse" />
          <h1 className="text-2xl md:text-4xl text-foreground uppercase tracking-tighter text-shadow-glow">
            Neon<span className="text-primary">Runner</span>
          </h1>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            {isMuted ? <VolumeX /> : <Volume2 />}
          </button>
        </div>
      </header>

      {/* Main Game Container */}
      <div className="relative w-full max-w-4xl aspect-[2/1] bg-black rounded-lg shadow-2xl border-4 border-muted overflow-hidden">
        
        {/* The Game Canvas - Always rendered but active state controlled by props */}
        <GameCanvas 
          isPlaying={gameState === "playing"} 
          onGameOver={handleGameOver}
          onScoreUpdate={setScore}
        />

        {/* Start Screen Overlay */}
        <AnimatePresence>
          {gameState === "start" && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center z-20 gap-8"
            >
              <div className="text-center space-y-4">
                <h2 className="text-4xl md:text-6xl text-primary font-pixel animate-bounce">
                  PRESS START
                </h2>
                <p className="font-mono text-muted-foreground">
                  SPACE to JUMP • Double tap for DOUBLE JUMP
                </p>
              </div>

              <PixelButton size="lg" onClick={handleStart} className="animate-pulse">
                <Play className="inline-block mr-2 w-4 h-4" />
                START GAME
              </PixelButton>

              <div className="absolute bottom-8 left-8 right-8">
                <Leaderboard />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game Over Overlay */}
        <AnimatePresence>
          {gameState === "gameover" && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center z-30 p-8"
            >
              <h2 className="text-5xl font-pixel text-destructive mb-2">GAME OVER</h2>
              <div className="text-2xl font-mono mb-8 text-foreground">
                SCORE: <span className="text-accent">{score.toString().padStart(5, '0')}</span>
              </div>

              {/* Score Submission Form */}
              {!submitScore.isSuccess ? (
                <form onSubmit={handleSubmitScore} className="flex flex-col gap-4 w-full max-w-xs mb-8">
                  <div className="space-y-2">
                    <label className="text-xs font-pixel text-muted-foreground uppercase">Enter Initials</label>
                    <div className="flex gap-2">
                      <Input 
                        autoFocus
                        maxLength={10}
                        placeholder="PLAYER 1"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
                        className="font-mono text-lg bg-muted border-2 border-primary/50 focus:border-primary rounded-none uppercase"
                        disabled={submitScore.isPending}
                      />
                    </div>
                  </div>
                  <PixelButton 
                    type="submit" 
                    disabled={!playerName || submitScore.isPending} 
                    className="w-full"
                  >
                    {submitScore.isPending ? "SAVING..." : "SUBMIT SCORE"}
                  </PixelButton>
                </form>
              ) : (
                <div className="mb-8 p-4 border-2 border-green-500 bg-green-500/10 text-green-500 font-pixel text-center text-sm w-full max-w-xs">
                  SCORE SAVED!
                </div>
              )}

              <div className="flex gap-4">
                <PixelButton variant="outline" onClick={() => setGameState("start")}>
                  MENU
                </PixelButton>
                <PixelButton onClick={handleStart}>
                  <RefreshCw className="inline-block mr-2 w-4 h-4" />
                  TRY AGAIN
                </PixelButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* HUD (Heads Up Display) - Always visible when playing */}
        {gameState === "playing" && (
          <div className="absolute top-4 right-4 font-pixel text-xl text-white drop-shadow-[2px_2px_0_rgba(0,0,0,1)] z-10">
            SCORE: <span className="text-accent">{score.toString().padStart(5, '0')}</span>
          </div>
        )}
      </div>

      {/* Footer / Credits */}
      <footer className="mt-8 text-center font-mono text-xs text-muted-foreground">
        <p>BUILT WITH REACT + CANVAS + TAILWIND</p>
      </footer>
    </div>
  );
}
