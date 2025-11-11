export const OWNER_COLOR = "#0078d4";
export const MESSAGE_MAX_WIDTH = "70%";

export const MESSAGE_BUBBLE_STYLE = {
  maxWidth: MESSAGE_MAX_WIDTH,
  width: "auto",
  position: "relative" as const,
  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.2)",
} as const;

export const MESSAGE_TEXT_STYLE = {
  whiteSpace: "pre-wrap" as const,
  wordBreak: "break-word" as const,
  lineHeight: 1.45,
  wordSpacing: "0.5px",
} as const;
