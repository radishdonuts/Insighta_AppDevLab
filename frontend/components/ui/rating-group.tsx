"use client";

import { RatingGroup } from "@ark-ui/react/rating-group";
import { useId } from "react";
import { cn } from "@/lib/utils";

type BasicRatingProps = {
  value: number;
  onValueChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
};

const STAR_COLOR = "#facc15";

function getStarColor(index: number): string {
  void index;
  return STAR_COLOR;
}

function ToneStar({
  highlighted,
  half,
  color,
  clipId,
}: {
  highlighted: boolean;
  half: boolean;
  color: string;
  clipId: string;
}) {
  const points = "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2";

  if (half) {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
        <defs>
          <clipPath id={clipId}>
            <rect x="0" y="0" width="12" height="24" />
          </clipPath>
        </defs>
        <polygon points={points} fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.6" />
        <polygon points={points} fill={color} stroke={color} strokeWidth="1.6" clipPath={`url(#${clipId})`} />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
      <polygon
        points={points}
        fill={highlighted ? color : "#e2e8f0"}
        stroke={highlighted ? color : "#94a3b8"}
        strokeWidth="1.6"
      />
    </svg>
  );
}

export default function BasicRating({
  value,
  onValueChange,
  disabled = false,
  className,
}: BasicRatingProps) {
  const clipPrefix = useId().replace(/[:]/g, "");

  return (
    <RatingGroup.Root
      count={5}
      value={value}
      disabled={disabled}
      onValueChange={(details) => onValueChange(Math.round(details.value))}
    >
      <RatingGroup.Control className={cn("inline-flex", className)}>
        <RatingGroup.Context>
          {({ items }) =>
            items.map((item) => {
              const starIndex = Number(item) || 1;
              const starColor = getStarColor(starIndex);
              const halfClipId = `${clipPrefix}-half-${starIndex}`;

              return (
                <RatingGroup.Item
                  key={item}
                  index={item}
                  className={cn(
                    "h-8 w-8 rounded-md p-0.5 transition-transform",
                    "hover:scale-110",
                    "focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                  )}
                >
                  <RatingGroup.ItemContext>
                    {({ half, highlighted }) => {
                      return <ToneStar half={half} highlighted={highlighted} color={starColor} clipId={halfClipId} />;
                    }}
                  </RatingGroup.ItemContext>
                </RatingGroup.Item>
              );
            })
          }
        </RatingGroup.Context>
        <RatingGroup.HiddenInput />
      </RatingGroup.Control>
    </RatingGroup.Root>
  );
}
