"use client";

import { useMemo } from "react";

interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface SimpleBarChartProps {
  data: DataPoint[];
  title?: string;
  valueFormatter?: (value: number) => string;
  height?: number;
}

export function SimpleBarChart({
  data,
  title,
  valueFormatter = (v) => v.toString(),
  height = 200,
}: SimpleBarChartProps) {
  const maxValue = useMemo(() => {
    return Math.max(...data.map((d) => d.value), 1);
  }, [data]);

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
          {title}
        </h3>
      )}
      <div className="flex items-end justify-between gap-2" style={{ height }}>
        {data.map((item, index) => {
          const percentage = (item.value / maxValue) * 100;
          const barColor = item.color || "hsl(var(--primary))";

          return (
            <div
              key={index}
              className="flex-1 flex flex-col items-center gap-2"
            >
              <div className="w-full flex flex-col items-center justify-end flex-1">
                <div className="text-xs font-medium mb-1 text-center">
                  {valueFormatter(item.value)}
                </div>
                <div
                  className="w-full rounded-t-md transition-all duration-300 hover:opacity-80"
                  style={{
                    height: `${percentage}%`,
                    backgroundColor: barColor,
                    minHeight: item.value > 0 ? "4px" : "0px",
                  }}
                />
              </div>
              <div className="text-xs text-center text-muted-foreground truncate w-full">
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
