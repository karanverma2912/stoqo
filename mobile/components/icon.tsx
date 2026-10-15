import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

const paths = {
  home: "m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
  box: "m3 7 9-4 9 4v10l-9 4-9-4Zm0 0 9 5 9-5M12 12v9M7.5 5l9 5",
  grid: "M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z",
  plus: "M12 5v14M5 12h14",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  back: "m14 6-6 6 6 6",
  chevron: "m9 6 6 6-6 6",
  down: "m6 9 6 6 6-6",
  search: "m21 21-5-5",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
  scan: "M3 8V4a1 1 0 0 1 1-1h4m8 0h4a1 1 0 0 1 1 1v4m0 8v4a1 1 0 0 1-1 1h-4m-8 0H4a1 1 0 0 1-1-1v-4M3 12h18M8 7v3m4-3v3m4-3v3M8 15v2m4-2v2m4-2v2",
  bag: "M5 7h14l2 14H3Zm3 0V6a4 4 0 0 1 8 0v1",
  sparkle:
    "m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7ZM20 2v4m-2-2h4",
  store: "M4 10v11h16V10M2 3h20l-2 7H4ZM8 21v-7h8v7M8 3l-1 7m9-7 1 7",
  user: "M4 21v-2a8 8 0 0 1 16 0v2",
  mail: "M3 5h18v14H3Zm0 0 9 8 9-8",
  lock: "M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5ZM12 15v2",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z",
  eyeOff: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7ZM3 3l18 18",
  check: "m5 12 4 4L19 6",
  chart: "M4 3v18h17M9 16v-5m5 5V7m5 9v-3",
  team: "M2 21v-2a6 6 0 0 1 12 0v2m3-13a4 4 0 0 1 0 8m1 1a6 6 0 0 1 4 4",
  receipt: "M5 3h14v19l-4-2-3 2-3-2-4 2ZM9 8h6m-6 4h6m-6 4h3",
  truck: "M1 4h13v13H1ZM14 8h5l4 5v4h-9",
  download: "M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4",
  settings:
    "m9 3-1 3-3 1-2 3 2 2-1 3 3 2 2-1 3 2 3-2 3 1 2-3-1-3 2-2-2-3-3-1-1-3Z",
  warning: "m12 3 10 18H2Zm0 6v5m0 3h.01",
  close: "m6 6 12 12M6 18 18 6",
  minus: "M5 12h14",
  leaf: "M20 3C8 2 2 9 6 16s17 4 14-13ZM4 21 16 9",
  logout: "M9 4H3v16h6m6-13 5 5-5 5M8 12h12",
  mic: "M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8",
  volume: "M3 9h4l5-4v14l-5-4H3Zm13-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14",
  more: "",
} as const;
export type IconName = keyof typeof paths;
export function Icon({
  name,
  size = 22,
  color = "#1D5138",
  strokeWidth = 1.8,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <Svg
      accessible={false}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name] ? <Path d={paths[name]} /> : null}
      {name === "search" ? <Circle cx={10.5} cy={10.5} r={7.5} /> : null}
      {name === "user" ? <Circle cx={12} cy={7} r={4} /> : null}
      {name === "team" ? <Circle cx={8} cy={7} r={4} /> : null}
      {name === "eye" || name === "eyeOff" || name === "settings" ? (
        <Circle cx={12} cy={12} r={3} />
      ) : null}
      {name === "truck" ? (
        <>
          <Circle cx={6} cy={18} r={3} />
          <Circle cx={18} cy={18} r={3} />
        </>
      ) : null}
      {name === "mic" ? (
        <Rect x={9} y={2} width={6} height={13} rx={3} />
      ) : null}
      {name === "more" ? (
        <>
          <Circle cx={5} cy={12} r={1} />
          <Circle cx={12} cy={12} r={1} />
          <Circle cx={19} cy={12} r={1} />
        </>
      ) : null}
    </Svg>
  );
}
