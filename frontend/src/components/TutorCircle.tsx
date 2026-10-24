import * as React from "react";
import type { Tutor } from "@/client";

// A tutor's circle: her tint and the first letter of her name, after the
// logo's circle and "w". Decorative, so her name must be given in text nearby.
// A parent can shrink it on small screens by setting --circle-scale.
export function TutorCircle({
  tutor,
  size,
  className = "",
  style,
}: {
  tutor: Pick<Tutor, "firstName" | "tint">;
  size: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`tutor-circle ${className}`}
      style={{
        width: `calc(${size}px * var(--circle-scale, 1))`,
        height: `calc(${size}px * var(--circle-scale, 1))`,
        fontSize: `calc(${size * 0.5}px * var(--circle-scale, 1))`,
        backgroundColor: tutor.tint,
        ...style,
      }}
      aria-hidden="true"
    >
      {tutor.firstName.charAt(0).toLowerCase()}
    </span>
  );
}
