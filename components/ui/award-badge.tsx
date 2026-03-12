"use client";

import React, { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { cn } from "@/lib/utils";

type AwardBadgeType =
  | "golden-kitty"
  | "product-of-the-day"
  | "product-of-the-month"
  | "product-of-the-week";

interface AwardBadgeProps {
  type: AwardBadgeType;
  place?: number;
  link?: string;
  className?: string;
  eyebrow?: string;
  headline?: string;
  logoSrc?: string;
  logoAlt?: string;
}

const identityMatrix =
  "1, 0, 0, 0, " +
  "0, 1, 0, 0, " +
  "0, 0, 1, 0, " +
  "0, 0, 0, 1";

const maxRotate = 0.25;
const minRotate = -0.25;
const maxScale = 1;
const minScale = 0.97;

const badgeTheme = {
  "golden-kitty": {
    background: "var(--accent)",
    inner: "color-mix(in srgb, var(--accent) 82%, white)",
    stroke: "color-mix(in srgb, var(--primary) 18%, var(--border))",
    accent: "var(--primary)",
  },
  "product-of-the-day": {
    background: "color-mix(in srgb, var(--primary) 14%, var(--card))",
    inner: "color-mix(in srgb, var(--card) 90%, white)",
    stroke: "color-mix(in srgb, var(--primary) 32%, var(--border))",
    accent: "var(--primary)",
  },
  "product-of-the-month": {
    background: "color-mix(in srgb, var(--secondary) 80%, white)",
    inner: "var(--card)",
    stroke: "color-mix(in srgb, var(--foreground) 10%, var(--border))",
    accent: "var(--foreground)",
  },
  "product-of-the-week": {
    background: "color-mix(in srgb, var(--muted) 84%, white)",
    inner: "var(--card)",
    stroke: "color-mix(in srgb, var(--primary) 24%, var(--border))",
    accent: "var(--primary)",
  },
} as const;

const title = {
  "golden-kitty": "Golden Kitty Awards",
  "product-of-the-day": "Product of the Day",
  "product-of-the-month": "Product of the Month",
  "product-of-the-week": "Product of the Week",
};

const overlayFills = [
  "hsla(157, 86%, 36%, 0.34)",
  "hsla(160, 84%, 39%, 0.28)",
  "hsla(145, 70%, 72%, 0.24)",
  "hsla(192, 70%, 55%, 0.2)",
  "hsla(45, 90%, 68%, 0.16)",
  "hsla(0, 0%, 100%, 0.14)",
];

export const AwardBadge = ({
  type,
  place,
  link,
  className,
  eyebrow,
  headline,
  logoSrc,
  logoAlt,
}: AwardBadgeProps) => {
  const ref = useRef<HTMLAnchorElement>(null);
  const enterTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimeouts = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const [firstOverlayPosition, setFirstOverlayPosition] = useState<number>(0);
  const [matrix, setMatrix] = useState<string>(identityMatrix);
  const [disableInOutOverlayAnimation, setDisableInOutOverlayAnimation] =
    useState<boolean>(true);
  const [disableOverlayAnimation, setDisableOverlayAnimation] =
    useState<boolean>(false);
  const [isTimeoutFinished, setIsTimeoutFinished] = useState<boolean>(false);

  const theme = badgeTheme[type];
  const eyebrowText = eyebrow ?? "FEATURED PARTNER";
  const headlineText =
    headline ?? `${title[type]}${place ? ` #${place}` : ""}`;

  const clearTimers = () => {
    if (enterTimeout.current) {
      clearTimeout(enterTimeout.current);
    }
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }
    if (readyTimeout.current) {
      clearTimeout(readyTimeout.current);
    }
    leaveTimeouts.current.forEach((timeout) => clearTimeout(timeout));
    leaveTimeouts.current = [];
  };

  const getDimensions = () => {
    const rect = ref.current?.getBoundingClientRect();

    if (!rect) {
      return { left: 0, right: 0, top: 0, bottom: 0 };
    }

    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
    };
  };

  const getMatrix = (clientX: number, clientY: number) => {
    const { left, right, top, bottom } = getDimensions();
    const xCenter = (left + right) / 2;
    const yCenter = (top + bottom) / 2;
    const width = Math.max(xCenter - left, 1);
    const height = Math.max(yCenter - top, 1);

    const scale = [
      maxScale - ((maxScale - minScale) * Math.abs(xCenter - clientX)) / width,
      maxScale - ((maxScale - minScale) * Math.abs(yCenter - clientY)) / height,
      maxScale -
        ((maxScale - minScale) *
          (Math.abs(xCenter - clientX) + Math.abs(yCenter - clientY))) /
          (width + height),
    ];

    const rotate = {
      x1: 0.25 * ((yCenter - clientY) / Math.max(yCenter, 1) - (xCenter - clientX) / Math.max(xCenter, 1)),
      x2:
        maxRotate -
        ((maxRotate - minRotate) * Math.abs(right - clientX)) /
          Math.max(right - left, 1),
      x3: 0,
      y0: 0,
      y2:
        maxRotate -
        ((maxRotate - minRotate) * (top - clientY)) / Math.max(top - bottom, -1),
      y3: 0,
      z0:
        -(maxRotate -
          ((maxRotate - minRotate) * Math.abs(right - clientX)) /
            Math.max(right - left, 1)),
      z1: 0.2 - ((0.2 + 0.6) * (top - clientY)) / Math.max(top - bottom, -1),
      z3: 0,
    };

    return `${scale[0]}, ${rotate.y0}, ${rotate.z0}, 0, ` +
      `${rotate.x1}, ${scale[1]}, ${rotate.z1}, 0, ` +
      `${rotate.x2}, ${rotate.y2}, ${scale[2]}, 0, ` +
      `${rotate.x3}, ${rotate.y3}, ${rotate.z3}, 1`;
  };

  const getOppositeMatrix = (
    nextMatrix: string,
    clientY: number,
    onMouseEnter?: boolean,
  ) => {
    const { top, bottom } = getDimensions();
    const oppositeY = bottom - clientY + top;
    const weakening = onMouseEnter ? 0.7 : 4;
    const multiplier = onMouseEnter ? -1 : 1;

    return nextMatrix
      .split(", ")
      .map((item, index) => {
        if (index === 2 || index === 4 || index === 8) {
          return String((-parseFloat(item) * multiplier) / weakening);
        }

        if (index === 0 || index === 5 || index === 10) {
          return "1";
        }

        if (index === 6) {
          return String(
            (multiplier *
              (maxRotate -
                ((maxRotate - minRotate) * (top - oppositeY)) /
                  Math.max(top - bottom, -1))) /
              weakening,
          );
        }

        if (index === 9) {
          return String(
            (maxRotate -
              ((maxRotate - minRotate) * (top - oppositeY)) /
                Math.max(top - bottom, -1)) /
              weakening,
          );
        }

        return item;
      })
      .join(", ");
  };

  const updateOverlayPosition = (clientX: number, clientY: number) => {
    const { left, right, top, bottom } = getDimensions();
    const xCenter = (left + right) / 2;
    const yCenter = (top + bottom) / 2;

    setFirstOverlayPosition(
      (Math.abs(xCenter - clientX) + Math.abs(yCenter - clientY)) / 1.5,
    );
  };

  const onMouseEnter = (event: MouseEvent<HTMLAnchorElement>) => {
    clearTimers();
    setDisableOverlayAnimation(true);
    setDisableInOutOverlayAnimation(false);

    enterTimeout.current = setTimeout(() => {
      setDisableInOutOverlayAnimation(true);
    }, 350);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        updateOverlayPosition(event.clientX, event.clientY);
      });
    });

    const nextMatrix = getMatrix(event.clientX, event.clientY);
    const oppositeMatrix = getOppositeMatrix(nextMatrix, event.clientY, true);

    setMatrix(oppositeMatrix);
    setIsTimeoutFinished(false);
    readyTimeout.current = setTimeout(() => {
      setIsTimeoutFinished(true);
    }, 200);
  };

  const onMouseMove = (event: MouseEvent<HTMLAnchorElement>) => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }

    hoverTimeout.current = setTimeout(() => {
      updateOverlayPosition(event.clientX, event.clientY);
    }, 150);

    if (isTimeoutFinished) {
      setMatrix(getMatrix(event.clientX, event.clientY));
    }
  };

  const onMouseLeave = (event: MouseEvent<HTMLAnchorElement>) => {
    if (enterTimeout.current) {
      clearTimeout(enterTimeout.current);
    }

    const oppositeMatrix = getOppositeMatrix(matrix, event.clientY);
    setMatrix(oppositeMatrix);

    leaveTimeouts.current = [
      setTimeout(() => setMatrix(identityMatrix), 200),
      setTimeout(() => setFirstOverlayPosition(-firstOverlayPosition / 4), 150),
      setTimeout(() => setFirstOverlayPosition(0), 300),
      setTimeout(() => {
        setDisableOverlayAnimation(false);
        setDisableInOutOverlayAnimation(true);
      }, 500),
    ];
  };

  useEffect(() => clearTimers, []);

  const overlayAnimations = [...Array(overlayFills.length).keys()]
    .map(
      (item) => `
        @keyframes overlayAnimation${item + 1} {
          0% { transform: rotate(${item * 12}deg); }
          50% { transform: rotate(${(item + 1) * 12}deg); }
          100% { transform: rotate(${item * 12}deg); }
        }
      `,
    )
    .join(" ");

  return (
    <a
      ref={ref}
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={headlineText}
      className={cn(
        "block h-auto w-[220px] cursor-pointer sm:w-[260px]",
        className,
      )}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onMouseEnter={onMouseEnter}
    >
      <style>{overlayAnimations}</style>
      <div
        style={{
          transform: `perspective(700px) matrix3d(${matrix})`,
          transformOrigin: "center center",
          transition: "transform 200ms ease-out",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 260 78"
          className="h-auto w-full drop-shadow-[0_14px_32px_rgba(5,150,105,0.12)]"
        >
          <defs>
            <filter id="awardBadgeBlur">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
            </filter>
            <mask id="awardBadgeMask">
              <rect width="260" height="78" fill="white" rx="18" />
            </mask>
            {logoSrc ? (
              <clipPath id="awardBadgeLogoClip">
                <rect x="54" y="40" width="18" height="18" rx="4" />
              </clipPath>
            ) : null}
          </defs>

          <rect width="260" height="78" rx="18" fill={theme.background} />
          <rect
            x="4"
            y="4"
            width="252"
            height="70"
            rx="14"
            fill={theme.inner}
            stroke={theme.stroke}
            strokeWidth="1"
          />

          <circle cx="25" cy="39" r="15" fill={theme.accent} opacity="0.12" />
          <path
            fill={theme.accent}
            opacity="0.94"
            d="M25 17l3.8 7.7 8.5 1.2-6.1 5.9 1.5 8.4L25 36.2l-7.6 4 1.5-8.4-6.1-5.9 8.5-1.2L25 17Z"
          />

          <text
            fontFamily="Arial, sans-serif"
            fontSize="9"
            fontWeight="700"
            fill="var(--muted-foreground)"
            letterSpacing="1.2"
            x="54"
            y="24"
          >
            {eyebrowText.toUpperCase()}
          </text>

          {logoSrc ? (
            <image
              href={logoSrc}
              x="54"
              y="40"
              width="18"
              height="18"
              preserveAspectRatio="xMidYMid slice"
              clipPath="url(#awardBadgeLogoClip)"
              aria-label={logoAlt}
            />
          ) : null}

          <text
            fontFamily="Arial, sans-serif"
            fontSize={logoSrc ? "18" : "16"}
            fontWeight="700"
            fill="var(--foreground)"
            x={logoSrc ? "78" : "54"}
            y="55"
          >
            {headlineText}
          </text>

          {place ? (
            <>
              <rect
                x="206"
                y="18"
                width="36"
                height="18"
                rx="9"
                fill={theme.accent}
                opacity="0.12"
              />
              <text
                fontFamily="Arial, sans-serif"
                fontSize="11"
                fontWeight="700"
                fill={theme.accent}
                textAnchor="middle"
                x="224"
                y="30"
              >
                #{place}
              </text>
            </>
          ) : null}

          <g style={{ mixBlendMode: "overlay" }} mask="url(#awardBadgeMask)">
            {overlayFills.map((fill, index) => (
              <g
                key={fill}
                style={{
                  transform: `rotate(${firstOverlayPosition + index * 12}deg)`,
                  transformOrigin: "center center",
                  transition: !disableInOutOverlayAnimation
                    ? "transform 200ms ease-out"
                    : "none",
                  animation: disableOverlayAnimation
                    ? "none"
                    : `overlayAnimation${index + 1} 5s infinite`,
                  willChange: "transform",
                }}
              >
                <polygon
                  points="0,0 260,78 260,0 0,78"
                  fill={fill}
                  filter="url(#awardBadgeBlur)"
                />
              </g>
            ))}
          </g>
        </svg>
      </div>
    </a>
  );
};
