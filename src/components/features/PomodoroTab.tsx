import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Timer } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { earnPoints } from "@/hooks/usePoints";

const WORK_DURATION = 25 * 60; // 25 minutes in seconds
const POINTS_PER_SESSION = 10;

type Phase = "idle" | "running" | "paused" | "done";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// SVG circle progress helpers
const RADIUS = 88;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function PomodoroTab() {
  const [secondsLeft, setSecondsLeft] = useState(WORK_DURATION);
  const [phase, setPhase] = useState<Phase>("idle");
  const [sessionsToday, setSessionsToday] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const progress = secondsLeft / WORK_DURATION; // 1 → 0
  const dashOffset = CIRCUMFERENCE * progress;   // shrinks as timer runs

  const clearTick = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const handleStart = useCallback(() => {
    setPhase("running");
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setPhase("done");
          setSessionsToday(s => s + 1);
          earnPoints(POINTS_PER_SESSION);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handlePause = useCallback(() => {
    clearTick();
    setPhase("paused");
  }, [clearTick]);

  const handleReset = useCallback(() => {
    clearTick();
    setSecondsLeft(WORK_DURATION);
    setPhase("idle");
  }, [clearTick]);

  // Cleanup on unmount
  useEffect(() => () => clearTick(), [clearTick]);

  // Browser tab title update while running
  useEffect(() => {
    if (phase === "running") {
      document.title = `⏱ ${formatTime(secondsLeft)} — StudyHub`;
    } else {
      document.title = "StudyHub";
    }
    return () => { document.title = "StudyHub"; };
  }, [secondsLeft, phase]);

  const isDone = phase === "done";
  const isRunning = phase === "running";
  const isPaused = phase === "paused";

  return (
    <div className="flex flex-col items-center gap-10 py-4 md:py-8 select-none">

      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-serif text-foreground">Pomodoro Timer</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          25‑minute focus sessions. Complete one to earn&nbsp;
          <span className="font-semibold text-amber-600">+{POINTS_PER_SESSION} pts</span>.
        </p>
      </div>

      {/* SVG ring timer */}
      <div className="relative flex items-center justify-center">
        <svg
          width={220}
          height={220}
          className="-rotate-90"
          aria-hidden="true"
        >
          {/* Track */}
          <circle
            cx={110}
            cy={110}
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={10}
            className="text-muted/40"
          />
          {/* Progress arc */}
          <motion.circle
            cx={110}
            cy={110}
            r={RADIUS}
            fill="none"
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            className={cn(
              "transition-all duration-1000 ease-linear",
              isDone ? "text-amber-400" : "text-primary"
            )}
            stroke="currentColor"
          />
        </svg>

        {/* Time display — overlaid in the center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <AnimatePresence mode="wait">
            {isDone ? (
              <motion.div
                key="done"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex flex-col items-center gap-1"
              >
                <span className="text-3xl">🎉</span>
                <span className="text-lg font-semibold text-amber-600">+{POINTS_PER_SESSION} pts!</span>
              </motion.div>
            ) : (
              <motion.div
                key="time"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center"
              >
                <Timer className="h-5 w-5 text-muted-foreground mb-1" />
                <span className={cn(
                  "text-4xl font-mono font-semibold tracking-tight tabular-nums",
                  isRunning ? "text-primary" : "text-foreground"
                )}>
                  {formatTime(secondsLeft)}
                </span>
                <span className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">
                  {phase === "idle" ? "ready" : isPaused ? "paused" : "focus"}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {isDone ? (
          <Button
            onClick={handleReset}
            className="rounded-2xl px-8 py-6 text-base gap-2 shadow"
          >
            <RotateCcw className="h-4 w-4" />
            Start Again
          </Button>
        ) : (
          <>
            {isRunning ? (
              <Button
                variant="outline"
                onClick={handlePause}
                className="rounded-2xl px-8 py-6 text-base gap-2"
              >
                <Pause className="h-4 w-4" />
                Pause
              </Button>
            ) : (
              <Button
                onClick={handleStart}
                className="rounded-2xl px-8 py-6 text-base gap-2 shadow"
              >
                <Play className="h-4 w-4" />
                {isPaused ? "Resume" : "Start"}
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={handleReset}
              className="h-12 w-12 rounded-2xl text-muted-foreground"
              disabled={phase === "idle"}
              title="Reset"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Sessions counter */}
      {sessionsToday > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <span>🍅</span>
          <span>
            {sessionsToday} session{sessionsToday !== 1 ? "s" : ""} completed today
          </span>
        </motion.div>
      )}

      {/* Tip */}
      <p className="text-xs text-muted-foreground/60 text-center max-w-xs">
        The Pomodoro Technique: 25 min of deep focus, then a short break.
        Repeat to build momentum.
      </p>
    </div>
  );
}
