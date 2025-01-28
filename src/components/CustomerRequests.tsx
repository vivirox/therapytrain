import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

const insights = [
  {
    title: "Anxiety Management",
    description: "Significant improvement in coping mechanisms",
    progress: "85%",
    status: "positive",
  },
  {
    title: "Sleep Quality",
    description: "Moderate enhancement in sleep patterns",
    progress: "65%",
    status: "neutral",
  },
  {
    title: "Stress Reduction",
    description: "Consistent progress in stress handling",
    progress: "75%",
    status: "positive",
  },
  {
    title: "Emotional Regulation",
    description: "Developing better emotional awareness",
    progress: "70%",
    status: "neutral",
  },
];

const CustomerRequests = () => {
  return (
    <div className="dashboard-card h-[400px]">
      <h2 className="text-xl font-medium mb-6">Customer Requests</h2>
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Therapy Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {insights.map((insight) => (
              <div
                key={insight.title}
                className="flex items-center justify-between border-b border-white/10 pb-4 last:border-0 last:pb-0"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white">{insight.title}</p>
                  <p className="text-sm text-gray-400">{insight.description}</p>
                </div>
                <div
                  className={`text-sm font-medium ${
                    insight.status === "positive"
                      ? "text-green-400"
                      : insight.status === "neutral"
                      ? "text-yellow-400"
                      : "text-red-400"
                  }`}
                >
                  {insight.progress}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerRequests;