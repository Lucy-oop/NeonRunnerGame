import { useState, useEffect } from "react";
import { GameCanvas } from "@/components/GameCanvas";
import { Leaderboard } from "@/components/Leaderboard";
import { useSubmitScore } from "@/hooks/use-scores";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, Play, RefreshCw } from "lucide-react";

export default function Game() {
  const [gameState, setGameState] = useState<"start" | "playing" | "gameover">("start");
  const [score, setScore] = useState(0);
  const [playerName, setPlayerName] = useState("");
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem("neon_runner_is_muted");
    return saved === "true";
  });
  const [bestScore, setBestScore] = useState(() => {
    const saved = localStorage.getItem("neon_runner_best_score");
    return saved ? parseInt(saved, 10) : 0;
  });
  
  const [bgmVolume, setBgmVolume] = useState(() => {
    const saved = localStorage.getItem("neon_runner_bgm_volume");
    return saved ? parseFloat(saved) : 0.25;
  });
  const [sfxVolume, setSfxVolume] = useState(() => {
    const saved = localStorage.getItem("neon_runner_sfx_volume");
    return saved ? parseFloat(saved) : 0.45;
  });

  const submitScore = useSubmitScore();

  const handleStart = () => {
    setGameState("playing");
    setScore(0);
  };

  const handleGameOver = (finalScore: number) => {
    setScore(finalScore);
    if (finalScore > bestScore) {
      setBestScore(finalScore);
      localStorage.setItem("neon_runner_best_score", finalScore.toString());
    }
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
      setPlayerName("");
    } catch (error) {
      console.error(error);
    }
  };

  const handleBgmVolumeChange = (value: number[]) => {
    const vol = value[0];
    setBgmVolume(vol);
    localStorage.setItem("neon_runner_bgm_volume", vol.toString());
  };

  const handleSfxVolumeChange = (value: number[]) => {
    const vol = value[0];
    setSfxVolume(vol);
    localStorage.setItem("neon_runner_sfx_volume", vol.toString());
  };

  const handleMuteToggle = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    localStorage.setItem("neon_runner_is_muted", newMuted.toString());
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="scanline pointer-events-none fixed inset-0 z-50 opacity-10" />
      
      <header className="absolute top-0 w-full p-4 md:p-8 flex justify-between items-start z-10 pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="w-8 h-8 bg-primary rounded-full shadow-[0_0_15px_rgba(233,69,96,0.5)] animate-pulse" />
          <h1 className="text-2xl md:text-3xl text-foreground font-bold tracking-tight uppercase">
            Neon<span className="text-primary">Runner</span>
          </h1>
        </div>
        
        <div className="flex flex-col gap-4 items-end pointer-events-auto">
          <button 
            onClick={handleMuteToggle}
            className="p-2 bg-muted/20 backdrop-blur-md rounded-full hover:bg-muted/40 transition-all active:scale-95 border border-white/10"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-destructive" /> : <Volume2 className="w-5 h-5 text-primary" />}
          </button>
          
          <div className="bg-muted/30 backdrop-blur-md p-3 rounded-xl border border-white/5 space-y-3 w-48 hidden md:block">
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Music</label>
                <span className="text-[10px] font-mono text-muted-foreground">{Math.round(bgmVolume * 100)}%</span>
              </div>
              <Slider 
                value={[bgmVolume]} 
                max={1} 
                step={0.01} 
                onValueChange={handleBgmVolumeChange}
                className="cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">SFX</label>
                <span className="text-[10px] font-mono text-muted-foreground">{Math.round(sfxVolume * 100)}%</span>
              </div>
              <Slider 
                value={[sfxVolume]} 
                max={1} 
                step={0.01} 
                onValueChange={handleSfxVolumeChange}
                className="cursor-pointer"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="relative w-full max-w-4xl aspect-[2/1] bg-black rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-[#1a1a1a] overflow-hidden">
        <GameCanvas 
          isPlaying={gameState === "playing"} 
          onGameOver={handleGameOver}
          onScoreUpdate={setScore}
          isMuted={isMuted}
          bgmVolume={bgmVolume}
          sfxVolume={sfxVolume}
        />

        <AnimatePresence>
          {gameState === "start" && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-xl flex flex-col items-center justify-center z-20"
            >
              <div className="flex flex-col items-center gap-8 w-full max-w-2xl px-8 h-full py-8 overflow-y-auto custom-scrollbar">
                <div className="text-center space-y-2 mt-auto">
                  <h2 className="text-5xl md:text-7xl font-black text-foreground tracking-tighter uppercase drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                    NEON RUNNER
                  </h2>
                  <div className="inline-block px-4 py-1 bg-accent/20 rounded-full border border-accent/30">
                    <p className="text-sm font-bold text-accent uppercase tracking-widest">
                      Best: {bestScore.toString().padStart(5, '0')}
                    </p>
                  </div>
                </div>

                <div className="z-30 w-full max-w-xs shrink-0">
                  <button 
                    onClick={handleStart} 
                    className="w-full py-6 bg-primary text-primary-foreground text-xl font-black rounded-2xl shadow-[0_10px_30px_rgba(233,69,96,0.4)] hover:shadow-[0_15px_40px_rgba(233,69,96,0.6)] hover:-translate-y-1 transition-all active:scale-95 active:translate-y-0 uppercase tracking-tight flex items-center justify-center gap-3"
                  >
                    <Play className="fill-current w-6 h-6" />
                    Play Game
                  </button>
                  <p className="mt-4 text-center text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-50">
                    Space or Tap to Jump
                  </p>
                </div>

                <div className="w-full max-w-md">
                  <Leaderboard />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {gameState === "gameover" && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/90 backdrop-blur-2xl flex flex-col items-center justify-center z-30 p-8 overflow-y-auto"
            >
              <div className="bg-muted/10 p-8 md:p-12 rounded-[2.5rem] border border-white/5 flex flex-col items-center gap-8 w-full max-w-md shadow-2xl my-auto">
                <div className="text-center space-y-2">
                  <h2 className="text-3xl md:text-4xl font-black text-destructive uppercase tracking-tighter">Oops! Game Over</h2>
                  <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Great effort, runner!</p>
                </div>

                <div className="flex gap-8 items-center">
                  <div className="text-center">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Score</p>
                    <p className="text-4xl font-black text-foreground">{score.toString().padStart(5, '0')}</p>
                  </div>
                  <div className="w-px h-12 bg-white/10" />
                  <div className="text-center">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Best</p>
                    <p className="text-2xl font-black text-accent">{bestScore.toString().padStart(5, '0')}</p>
                  </div>
                </div>

                <div className="w-full space-y-4">
                  {!submitScore.isSuccess ? (
                    <form onSubmit={handleSubmitScore} className="space-y-4">
                      <Input 
                        autoFocus
                        maxLength={10}
                        placeholder="INITIALS"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
                        className="h-12 bg-white/5 border-2 border-white/10 focus:border-primary focus:ring-0 rounded-xl text-center text-lg font-black placeholder:opacity-20 uppercase"
                        disabled={submitScore.isPending}
                      />
                      <button 
                        type="submit" 
                        disabled={!playerName || submitScore.isPending} 
                        className="w-full h-12 bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-all rounded-xl text-xs font-black uppercase tracking-widest"
                      >
                        {submitScore.isPending ? "SAVING..." : "SAVE SCORE"}
                      </button>
                    </form>
                  ) : (
                    <div className="py-3 bg-green-500/20 rounded-xl text-green-500 text-[10px] font-black uppercase tracking-widest text-center border border-green-500/30">
                      Score recorded!
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button 
                      onClick={() => setGameState("start")}
                      className="flex-1 h-14 bg-muted/20 hover:bg-muted/40 transition-all rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 border border-white/5"
                    >
                      Menu
                    </button>
                    <button 
                      onClick={handleStart}
                      className="flex-[2] h-14 bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {gameState === "playing" && (
          <div className="absolute top-6 right-6 font-black text-2xl text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] z-10 flex items-baseline gap-2">
            <span className="text-[10px] uppercase opacity-50 tracking-widest">Score</span>
            <span className="text-accent">{score.toString().padStart(5, '0')}</span>
          </div>
        )}
      </div>

      <footer className="mt-8 text-center font-bold text-[10px] text-muted-foreground uppercase tracking-[0.2em] opacity-30">
        <p>Built with React • Canvas • Tailwind</p>
      </footer>
    </div>
  );
}
