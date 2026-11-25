import { type MoveClassification } from "@shared/types/chess";
import { MOVE_CLASSIFICATION_META } from "@/constants/moveClassificationMeta";
import { getMoveClassificationSvgMarkup } from "@/constants/moveClassificationSvgMarkup";
import { cn } from "@/utils/cn";

interface MoveClassificationBadgeProps {
  classification: MoveClassification;
  size?: "sm" | "md" | "lg";
  className?: string;
  showTitle?: boolean;
}

const BADGE_SIZE_CLASSES = {
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-7 w-7",
} as const;

export function MoveClassificationBadge({
  classification,
  size = "md",
  className,
  showTitle = true,
}: MoveClassificationBadgeProps) {
  const meta = MOVE_CLASSIFICATION_META[classification];
  const svgMarkup = getMoveClassificationSvgMarkup(classification);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center select-none",
        BADGE_SIZE_CLASSES[size],
        className
      )}
      title={showTitle ? `${meta.label}: ${meta.description}` : undefined}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 18 19"
        className="h-full w-full"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />
    </span>
  );
}
