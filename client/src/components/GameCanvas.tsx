import { useEffect, useRef } from "react";

interface GameCanvasProps {
  isPlaying: boolean;
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isMuted: boolean;
  bgmVolume: number;
  sfxVolume: number;
}

export function GameCanvas({ isPlaying, onGameOver, onScoreUpdate, isMuted, bgmVolume, sfxVolume }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const scoreRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBuffersRef = useRef<Record<string, AudioBuffer>>({});
  const bgmSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const bgmGainRef = useRef<GainNode | null>(null);

  // Sound Assets (Cozy & Cute)
  const SOUND_URLS = {
    jump: "https://actions.google.com/sounds/v1/cartoon/pop.ogg",
    doubleJump: "https://actions.google.com/sounds/v1/cartoon/muffled_pop.ogg",
    hit: "https://actions.google.com/sounds/v1/foley/light_thump.ogg",
    click: "https://actions.google.com/sounds/v1/ui/button_click.ogg",
    bgm: "https://actions.google.com/sounds/v1/science_fiction/deep_space_atmosphere.ogg",
    sparkle: "https://actions.google.com/sounds/v1/cartoon/clink_clank.ogg"
  };

  // Game constants
  const GRAVITY = 0.55;
  const JUMP_FORCE = -11;
  const BASE_SPEED_RATE = 0.4;
  const MAX_SPEED_RATE = 4.0;
  const SPEED_STEP = 0.4;
  const TIME_STEP = 15; // Slower ramp

  const STARTING_SPAWN_INTERVAL = 1800; 
  const MIN_SPAWN_INTERVAL = 800; 
  const SPAWN_REDUCTION = 150; 

  const gameState = useRef({
    player: {
      x: 80,
      y: 0,
      width: 32,
      height: 32,
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

  const playSound = (name: string, volumeScale = 1) => {
    if (isMuted || !audioContextRef.current || !audioBuffersRef.current[name]) return;
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffersRef.current[name];
    const gain = audioContextRef.current.createGain();
    gain.gain.value = sfxVolume * volumeScale;
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
      playSound(state.player.jumpCount === 1 ? "jump" : "doubleJump", 0.4);
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
      bgmGainRef.current.gain.setTargetAtTime(isMuted ? 0 : bgmVolume, audioContextRef.current.currentTime, 0.5);
    }
  }, [isMuted, bgmVolume]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
    };
    
    const handleTouch = (e: TouchEvent) => {
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
      playSound("click", 0.5);

      if (audioContextRef.current?.state === "suspended") {
        audioContextRef.current.resume();
      }

      // Start BGM with fade
      if (audioBuffersRef.current.bgm && audioContextRef.current) {
        if (bgmSourceRef.current) bgmSourceRef.current.stop();
        bgmSourceRef.current = audioContextRef.current.createBufferSource();
        bgmSourceRef.current.buffer = audioBuffersRef.current.bgm;
        bgmSourceRef.current.loop = true;
        bgmGainRef.current = audioContextRef.current.createGain();
        bgmGainRef.current.gain.value = 0;
        bgmSourceRef.current.connect(bgmGainRef.current);
        bgmGainRef.current.connect(audioContextRef.current.destination);
        bgmSourceRef.current.start(0);
        bgmGainRef.current.gain.setTargetAtTime(isMuted ? 0 : bgmVolume, audioContextRef.current.currentTime, 0.8);
      }

      scoreRef.current = 0;
      onScoreUpdate(0);
      
      gameState.current = {
        player: {
          x: 80,
          y: canvas.height - 60 - 32,
          width: 32,
          height: 32,
          dy: 0,
          grounded: true,
          jumpCount: 0
        },
        obstacles: [],
        lastSpawnTime: Date.now(),
        startTime: Date.now(),
        active: true,
        groundY: canvas.height - 60,
        speedRate: BASE_SPEED_RATE,
        spawnInterval: STARTING_SPAWN_INTERVAL,
      };

      requestRef.current = requestAnimationFrame(gameLoop);
    } else {
      gameState.current.active = false;
      if (bgmGainRef.current && audioContextRef.current) {
        bgmGainRef.current.gain.setTargetAtTime(0, audioContextRef.current.currentTime, 0.6);
        setTimeout(() => {
          if (bgmSourceRef.current) {
            bgmSourceRef.current.stop();
            bgmSourceRef.current = null;
          }
        }, 600);
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

    const step = Math.floor(elapsedSeconds / TIME_STEP);
    state.speedRate = Math.min(BASE_SPEED_RATE + SPEED_STEP * step, MAX_SPEED_RATE);
    state.spawnInterval = Math.max(MIN_SPAWN_INTERVAL, STARTING_SPAWN_INTERVAL - SPAWN_REDUCTION * step);

    const currentSpeed = 6 * state.speedRate;

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
      const height = Math.floor(Math.random() * 60 + 40);
      state.obstacles.push({
        x: canvas.width,
        y: state.groundY - height,
        width: 32,
        height: height,
        passed: false
      });
    }

    // Update Obstacles
    for (let i = state.obstacles.length - 1; i >= 0; i--) {
      const obs = state.obstacles[i];
      obs.x -= currentSpeed;

      if (
        state.player.x + 4 < obs.x + obs.width &&
        state.player.x + state.player.width - 4 > obs.x &&
        state.player.y + 4 < obs.y + obs.height &&
        state.player.y + state.player.height - 4 > obs.y
      ) {
        state.active = false;
        playSound("hit", 0.6);
        onGameOver(scoreRef.current);
        return;
      }

      if (!obs.passed && state.player.x > obs.x + obs.width) {
        obs.passed = true;
        scoreRef.current += 10;
        onScoreUpdate(scoreRef.current);
        if (scoreRef.current % 50 === 0) playSound("sparkle", 0.3);
      }

      if (obs.x + obs.width < -50) {
        state.obstacles.splice(i, 1);
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Cozy Background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#0a0a0a");
    gradient.addColorStop(1, "#1a1a2e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Soft Grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 1;
    const gridOffset = (elapsedSeconds * currentSpeed * 8) % 60;
    for (let x = 0; x < canvas.width + 60; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x - gridOffset, 0);
      ctx.lineTo(x - gridOffset, canvas.height);
      ctx.stroke();
    }

    // Ground
    ctx.fillStyle = "#0f0f1b";
    ctx.fillRect(0, state.groundY, canvas.width, canvas.height - state.groundY);
    const groundGrad = ctx.createLinearGradient(0, state.groundY, 0, state.groundY + 4);
    groundGrad.addColorStop(0, "#e94560");
    groundGrad.addColorStop(1, "transparent");
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, state.groundY, canvas.width, 4);

    // Player (Cute Rounded Square)
    const p = state.player;
    ctx.fillStyle = "#e94560";
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, p.width, p.height, 8);
    ctx.fill();
    
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.beginPath();
    ctx.roundRect(p.x + 4, p.y + 4, p.width - 8, p.height - 8, 4);
    ctx.fill();

    // Obstacles (Soft glowing rectangles)
    state.obstacles.forEach(obs => {
      ctx.fillStyle = "#00ffff";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "rgba(0, 255, 255, 0.3)";
      ctx.beginPath();
      ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 4);
      ctx.fill();
      ctx.shadowBlur = 0;
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
      className="w-full h-full object-contain rounded-[2rem] bg-black shadow-inner"
    />
  );
}
