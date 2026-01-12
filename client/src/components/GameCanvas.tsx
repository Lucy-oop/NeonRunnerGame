import { useEffect, useRef } from "react";

interface GameCanvasProps {
  isPlaying: boolean;
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
}

export function GameCanvas({ isPlaying, onGameOver, onScoreUpdate }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const scoreRef = useRef(0);
  
  // Game constants
  const GRAVITY = 0.6;
  const JUMP_FORCE = -12;
  const SPEED = 5;
  const OBSTACLE_SPAWN_RATE = 120; // Frames

  // Game state refs (to avoid closure staleness in loop)
  const gameState = useRef({
    player: {
      x: 50,
      y: 0, // Set in init
      width: 30,
      height: 30,
      dy: 0,
      grounded: true,
      jumpCount: 0
    },
    obstacles: [] as { x: number; y: number; width: number; height: number; passed: boolean }[],
    frameCount: 0,
    active: false,
    groundY: 0,
  });

  // Jump handler
  const jump = () => {
    const state = gameState.current;
    if (!state.active) return;

    if (state.player.grounded || state.player.jumpCount < 2) {
      state.player.dy = JUMP_FORCE;
      state.player.grounded = false;
      state.player.jumpCount++;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
    };
    
    const handleTouch = (e: TouchEvent) => {
      e.preventDefault(); // Prevent scrolling
      jump();
    };

    window.addEventListener("keydown", handleKeyDown);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener("touchstart", handleTouch, { passive: false });
      canvas.addEventListener("mousedown", jump);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (canvas) {
        canvas.removeEventListener("touchstart", handleTouch);
        canvas.removeEventListener("mousedown", jump);
      }
    };
  }, []); // Bind controls once

  // Reset game when isPlaying changes to true
  useEffect(() => {
    if (isPlaying) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Reset state
      scoreRef.current = 0;
      onScoreUpdate(0);
      
      gameState.current = {
        player: {
          x: 50,
          y: canvas.height - 50 - 30, // canvas height - ground height - player height
          width: 30,
          height: 30,
          dy: 0,
          grounded: true,
          jumpCount: 0
        },
        obstacles: [],
        frameCount: 0,
        active: true,
        groundY: canvas.height - 50
      };

      // Start loop
      requestRef.current = requestAnimationFrame(gameLoop);
    } else {
      // Stop loop
      gameState.current.active = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying]);

  const gameLoop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const state = gameState.current;

    // --- UPDATE ---
    
    // Player Physics
    state.player.dy += GRAVITY;
    state.player.y += state.player.dy;

    // Ground collision
    if (state.player.y + state.player.height >= state.groundY) {
      state.player.y = state.groundY - state.player.height;
      state.player.dy = 0;
      state.player.grounded = true;
      state.player.jumpCount = 0;
    }

    // Spawn Obstacles
    state.frameCount++;
    if (state.frameCount % OBSTACLE_SPAWN_RATE === 0) {
      const minHeight = 40;
      const maxHeight = 120;
      const height = Math.floor(Math.random() * (maxHeight - minHeight + 1) + minHeight);
      
      state.obstacles.push({
        x: canvas.width,
        y: state.groundY - height,
        width: 30,
        height: height,
        passed: false
      });
    }

    // Update Obstacles
    for (let i = state.obstacles.length - 1; i >= 0; i--) {
      const obs = state.obstacles[i];
      obs.x -= SPEED;

      // Collision Detection
      if (
        state.player.x < obs.x + obs.width &&
        state.player.x + state.player.width > obs.x &&
        state.player.y < obs.y + obs.height &&
        state.player.y + state.player.height > obs.y
      ) {
        // Game Over
        state.active = false;
        onGameOver(scoreRef.current);
        return; // Stop loop
      }

      // Scoring
      if (!obs.passed && state.player.x > obs.x + obs.width) {
        obs.passed = true;
        scoreRef.current += 10;
        onScoreUpdate(scoreRef.current);
      }

      // Remove off-screen
      if (obs.x + obs.width < 0) {
        state.obstacles.splice(i, 1);
      }
    }

    // --- DRAW ---
    
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background Gradient (Retro Sky)
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#2a1b3d");
    gradient.addColorStop(1, "#44318d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines (Retro feel)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x - (state.frameCount % 40), 0);
      ctx.lineTo(x - (state.frameCount % 40), canvas.height);
      ctx.stroke();
    }

    // Ground
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, state.groundY, canvas.width, canvas.height - state.groundY);
    // Ground accent line
    ctx.fillStyle = "#e94560"; // Primary color
    ctx.fillRect(0, state.groundY, canvas.width, 4);

    // Player (Pixel Style)
    ctx.fillStyle = "#0f3460"; // Dark Blue Base
    ctx.fillRect(state.player.x, state.player.y, state.player.width, state.player.height);
    // Player Inner
    ctx.fillStyle = "#4CC9F0"; // Cyan
    ctx.fillRect(state.player.x + 4, state.player.y + 4, state.player.width - 8, state.player.height - 8);
    // Player Highlight
    ctx.fillStyle = "#fff";
    ctx.fillRect(state.player.x + 6, state.player.y + 6, 4, 4);

    // Obstacles
    state.obstacles.forEach(obs => {
      ctx.fillStyle = "#e94560"; // Primary Red/Pink
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      
      // Obstacle detail - warning stripes
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      for(let y = obs.y; y < obs.y + obs.height; y+= 10) {
        ctx.fillRect(obs.x, y, obs.width, 2);
      }
    });

    if (state.active) {
      requestRef.current = requestAnimationFrame(gameLoop);
    }
  };

  return (
    <canvas 
      ref={canvasRef} 
      width={800} 
      height={400}
      className="w-full h-full object-contain rounded-md border-4 border-border shadow-2xl bg-black pixel-corners"
    />
  );
}
