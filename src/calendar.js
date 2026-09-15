import dayjs from "dayjs";
export const views = {
  "1d": "1日",
  "3d": "3日",
  "5d": "5日",
  "1w": "1週間",
  "2w": "2週間",
  "1m": "1か月",
};
export function range(anchor, view) {
  const date = dayjs(anchor).startOf("day");
  const start = view === "1m" ? date.startOf("month") : date;
  const end =
    view === "1m"
      ? start.add(1, "month")
      : start.add(
          { "1d": 1, "3d": 3, "5d": 5, "1w": 7, "2w": 14 }[view] || 7,
          "day",
        );
  return {
    start,
    end,
    days: Array.from({ length: end.diff(start, "day") }, (_, i) =>
      start.add(i, "day"),
    ),
  };
}
