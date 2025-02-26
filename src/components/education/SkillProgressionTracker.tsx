import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Skill {
  id: string;
  name: string;
  progress: number;
  level: string;
}

interface SkillProgressionTrackerProps {
  skills: Skill[];
}

export function SkillProgressionTracker({
  skills,
}: SkillProgressionTrackerProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Skill Progression</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {skills.map((skill) => (
            <div key={skill.id} className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">{skill.name}</span>
                <span className="text-sm text-muted-foreground">
                  {skill.level}
                </span>
              </div>
              <Progress value={skill.progress} className="h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
