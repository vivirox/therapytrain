import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

const data = [
  { month: "Jan", sessions: 12, mood: 65 },
  { month: "Feb", sessions: 15, mood: 72 },
  { month: "Mar", sessions: 18, mood: 78 },
  { month: "Apr", sessions: 16, mood: 82 },
  { month: "May", sessions: 20, mood: 85 },
  { month: "Jun", sessions: 22, mood: 88 },
];

const MonthlyChart = () => {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white">Monthly Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis
                dataKey="month"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              Sessions
                            </span>
                            <span className="font-bold text-muted-foreground">
                              {payload[0].value}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              Mood Score
                            </span>
                            <span className="font-bold text-muted-foreground">
                              {payload[1].value}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="sessions"
                stroke="#8989DE"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="mood"
                stroke="#7EBF8E"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlyChart;