import {
  ORDINAL_SUFFIXES,
  MINUTE_MS,
  HOUR_MS,
  DAY_MS,
  WEEK_MS,
} from "../constants/dateFormat";

const TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const MONTH_FORMATTER = new Intl.DateTimeFormat("en-GB", { month: "long" });

function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return "th";
  return ORDINAL_SUFFIXES[day % 10] || "th";
}

export function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  if (isToday) {
    return TIME_FORMATTER.format(date);
  }

  const day = date.getDate();
  return `${day}<sup>${getOrdinalSuffix(day)}</sup> ${MONTH_FORMATTER.format(date)} ${date.getFullYear()}, ${TIME_FORMATTER.format(date)}`;
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const diff = Date.now() - date.getTime();

  if (diff < HOUR_MS) {
    return `${Math.floor(diff / MINUTE_MS)}m ago`;
  }
  if (diff < DAY_MS) {
    return `${Math.floor(diff / HOUR_MS)}h ago`;
  }
  if (diff < WEEK_MS) {
    return `${Math.floor(diff / DAY_MS)}d ago`;
  }

  const day = date.getDate();
  return `${day}<sup>${getOrdinalSuffix(day)}</sup> ${MONTH_FORMATTER.format(date)} ${date.getFullYear()}`;
}
