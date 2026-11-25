import {
  AVERAGE_BLACK_SECONDS_PER_MOVE,
  AVERAGE_WHITE_SECONDS_PER_MOVE,
  DEFAULT_RAPID_TEN_MINUTES_IN_SECONDS,
  MINIMUM_REMAINING_CLOCK_SECONDS,
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
} from "@/constants/clockConstants";

interface PlayerClocks {
  whiteClock: string;
  blackClock: string;
}

interface ClockCalculationOptions {
  currentPly: number;
  initialSeconds?: number;
}

export function calculatePlayerClocks({
  currentPly,
  initialSeconds = DEFAULT_RAPID_TEN_MINUTES_IN_SECONDS,
}: ClockCalculationOptions): PlayerClocks {
  if (currentPly <= 0) {
    const startingFormatted = formatSecondsToClock(initialSeconds);
    return {
      whiteClock: startingFormatted,
      blackClock: startingFormatted,
    };
  }

  const whiteMovesCount = Math.ceil(currentPly / 2);
  const blackMovesCount = Math.floor(currentPly / 2);

  const whiteElapsedSeconds = whiteMovesCount * AVERAGE_WHITE_SECONDS_PER_MOVE;
  const blackElapsedSeconds = blackMovesCount * AVERAGE_BLACK_SECONDS_PER_MOVE;

  const whiteRemaining = Math.max(MINIMUM_REMAINING_CLOCK_SECONDS, Math.round(initialSeconds - whiteElapsedSeconds));
  const blackRemaining = Math.max(MINIMUM_REMAINING_CLOCK_SECONDS, Math.round(initialSeconds - blackElapsedSeconds));

  return {
    whiteClock: formatSecondsToClock(whiteRemaining),
    blackClock: formatSecondsToClock(blackRemaining),
  };
}

function formatSecondsToClock(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / SECONDS_PER_HOUR);
  const minutes = Math.floor((safeSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const seconds = safeSeconds % SECONDS_PER_MINUTE;

  const paddedSeconds = String(seconds).padStart(2, "0");

  if (hours > 0) {
    const paddedMinutes = String(minutes).padStart(2, "0");
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }

  return `${minutes}:${paddedSeconds}`;
}
