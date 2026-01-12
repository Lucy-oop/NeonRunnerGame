import { useEffect, useRef } from "react";

interface GameCanvasProps {
  isPlaying: boolean;
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isMuted: boolean;
}

export function GameCanvas({ isPlaying, onGameOver, onScoreUpdate, isMuted }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const scoreRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBuffersRef = useRef<Record<string, AudioBuffer>>({});
  const bgmSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const bgmGainRef = useRef<GainNode | null>(null);

  // Sound Assets (using public URLs for demonstration, replace with local assets if available)
  const SOUND_URLS = {
    jump: "https://actions.google.com/sounds/v1/cartoon/pop.ogg",
    hit: "https://actions.google.com/sounds/v1/impacts/crash_metal.ogg",
    click: "https://actions.google.com/sounds/v1/ui/button_click.ogg",
    bgm: "https://actions.google.com/sounds/v1/science_fiction/deep_space_atmosphere.ogg"
  };

  // Game constants
  const GRAVITY = 0.6;
  const JUMP_FORCE = -12;
  const BASE_SPEED_RATE = 0.5;
  const MAX_SPEED_RATE = 5.0;
  const SPEED_STEP = 0.5;
  const TIME_STEP = 10; // seconds

  const STARTING_SPAWN_INTERVAL = 1500; // ms
  const MIN_SPAWN_INTERVAL = 650; // ms
  const SPAWN_REDUCTION = 100; // ms per 10s

  const gameState = useRef({
    player: {
      x: 50,
      y: 0,
      width: 30,
      height: 30,
      dy: 0,
      grounded: true,
      jumpCount: 0
    },
    obstacles: [] as { x: number; y: number; width: number; height: number; passed: boolean }[],
    lastSpawnTime: 0,
    startTime: 0,
    active: false,
    groundY: 0,
    speedRate: BASE_SPEED_RATE,
    spawnInterval: STARTING_SPAWN_INTERVAL,
  });

  const playSound = (name: string, volume = 0.5) => {
    if (isMuted || !audioContextRef.current || !audioBuffersRef.current[name]) return;
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffersRef.current[name];
    const gain = audioContextRef.current.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(audioContextRef.current.destination);
    source.start(0);
  };

  const jump = () => {
    const state = gameState.current;
    if (!state.active) return;

    if (state.player.grounded || state.player.jumpCount < 2) {
      state.player.dy = JUMP_FORCE;
      state.player.grounded = false;
      state.player.jumpCount++;
      playSound("jump", 0.3);
    }
  };

  useEffect(() => {
    const initAudio = async () => {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const loadSound = async (name: string, url: string) => {
        try {
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
          audioBuffersRef.current[name] = audioBuffer;
        } catch (e) {
          console.error(`Failed to load sound: ${name}`, e);
        }
      };

      await Promise.all(Object.entries(SOUND_URLS).map(([name, url]) => loadSound(name, url)));
    };

    initAudio();

    return () => {
      if (bgmSourceRef.current) bgmSourceRef.current.stop();
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  useEffect(() => {
    if (bgmGainRef.current && audioContextRef.current) {
      bgmGainRef.current.gain.setTargetAtTime(isMuted ? 0 : 0.25, audioContextRef.current.currentTime, 0.1);
    }
  }, [isMuted]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
    };
    
    const handleTouch = (e: TouchEvent) => {
      // Don't prevent default here as it might block UI clicks
      if (gameState.current.active) {
        e.preventDefault();
        jump();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener("touchstart", handleTouch, { passive: false });
      canvas.addEventListener("mousedown", (e) => {
        if (gameState.current.active) {
          jump();
        }
      });
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (canvas) {
        canvas.removeEventListener("touchstart", handleTouch);
      }
    };
  }, []);

  useEffect(() => {
    if (isPlaying) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      playSound("click", 0.4);

      if (audioContextRef.current?.state === "suspended") {
        audioContextRef.current.resume();
      }

      // Start BGM
      if (audioBuffersRef.current.bgm && audioContextRef.current) {
        if (bgmSourceRef.current) bgmSourceRef.current.stop();
        bgmSourceRef.current = audioContextRef.current.createBufferSource();
        bgmSourceRef.current.buffer = audioBuffersRef.current.bgm;
        bgmSourceRef.current.loop = true;
        bgmGainRef.current = audioContextRef.current.createGain();
        bgmGainRef.current.gain.value = isMuted ? 0 : 0.25;
        bgmSourceRef.current.connect(bgmGainRef.current);
        bgmGainRef.current.connect(audioContextRef.current.destination);
        bgmSourceRef.current.start(0);
      }

      scoreRef.current = 0;
      onScoreUpdate(0);
      
      gameState.current = {
        player: {
          x: 50,
          y: canvas.height - 50 - 30,
          width: 30,
          height: 30,
          dy: 0,
          grounded: true,
          jumpCount: 0
        },
        obstacles: [],
        lastSpawnTime: Date.now(),
        startTime: Date.now(),
        active: true,
        groundY: canvas.height - 50,
        speedRate: BASE_SPEED_RATE,
        spawnInterval: STARTING_SPAWN_INTERVAL,
      };

      requestRef.current = requestAnimationFrame(gameLoop);
    } else {
      gameState.current.active = false;
      if (bgmSourceRef.current) {
        bgmSourceRef.current.stop();
        bgmSourceRef.current = null;
      }
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
    const now = Date.now();
    const elapsedSeconds = (now - state.startTime) / 1000;

    // Goal 1: Discrete Speed/Spawn Schedule
    const step = Math.floor(elapsedSeconds / TIME_STEP);
    state.speedRate = Math.min(BASE_SPEED_RATE + SPEED_STEP * step, MAX_SPEED_RATE);
    state.spawnInterval = Math.max(MIN_SPAWN_INTERVAL, STARTING_SPAWN_INTERVAL - SPAWN_REDUCTION * step);

    const currentSpeed = 5 * state.speedRate;

    // Player Physics
    state.player.dy += GRAVITY;
    state.player.y += state.player.dy;

    if (state.player.y + state.player.height >= state.groundY) {
      state.player.y = state.groundY - state.player.height;
      state.player.dy = 0;
      state.player.grounded = true;
      state.player.jumpCount = 0;
    }

    // Spawn Obstacles
    if (now - state.lastSpawnTime >= state.spawnInterval) {
      state.lastSpawnTime = now;
      const height = Math.floor(Math.random() * 80 + 40);
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
      obs.x -= currentSpeed;

      if (
        state.player.x < obs.x + obs.width &&
        state.player.x + state.player.width > obs.x &&
        state.player.y < obs.y + obs.height &&
        state.player.y + state.player.height > obs.y
      ) {
        state.active = false;
        playSound("hit", 0.5);
        onGameOver(scoreRef.current);
        return;
      }

      if (!obs.passed && state.player.x > obs.x + obs.width) {
        obs.passed = true;
        scoreRef.current += 10;
        onScoreUpdate(scoreRef.current);
      }

      if (obs.x + obs.width < 0) {
        state.obstacles.splice(i, 1);
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#2a1b3d");
    gradient.addColorStop(1, "#44318d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    const gridOffset = (elapsedSeconds * currentSpeed * 10) % 40;
    for (let x = 0; x < canvas.width + 40; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x - gridOffset, 0);
      ctx.lineTo(x - gridOffset, canvas.height);
      ctx.stroke();
    }

    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, state.groundY, canvas.width, canvas.height - state.groundY);
    ctx.fillStyle = "#e94560";
    ctx.fillRect(0, state.groundY, canvas.width, 4);

    ctx.fillStyle = "#0f3460";
    ctx.fillRect(state.player.x, state.player.y, state.player.width, state.player.height);
    ctx.fillStyle = "#4CC9F0";
    ctx.fillRect(state.player.x + 4, state.player.y + 4, state.player.width - 8, state.player.height - 8);
    ctx.fillStyle = "#fff";
    ctx.fillRect(state.player.x + 6, state.player.y + 6, 4, 4);

    state.obstacles.forEach(obs => {
      ctx.fillStyle = "#e94560";
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
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
