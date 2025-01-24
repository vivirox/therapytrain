import React, { useState, useEffect } from 'react';
import { SkillProgression } from '../../types/education';
import { Card } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import {
  Trophy,
  Target,
  TrendingUp,
  Clock,
  Award,
  BookOpen,
  Users,
  Brain,
  Star
} from 'lucide-react';

interface SkillProgressionTrackerProps {
  userId: string;
}

export const SkillProgressionTracker: React.FC<SkillProgressionTrackerProps> = ({ userId }) => {
  const [progression, setProgression] = useState<SkillProgression | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgression = async () => {
      try {
        const response = await fetch(`/api/skill-progression/${userId}`);
        if (response.ok) {
          const data = await response.json();
          setProgression(data);
        }
      } catch (error) {
        console.error('Error fetching skill progression:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgression();
  }, [userId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!progression) {
    return <div>No progression data available</div>;
  }

  const calculateOverallProgress = () => {
    const skills = Object.values(progression.skills);
    if (skills.length === 0) return 0;

    const totalLevels = skills.reduce((acc, skill) => acc + skill.level, 0);
    const maxPossibleLevel = skills.length * 10; // Assuming max level is 10
    return (totalLevels / maxPossibleLevel) * 100;
  };

  const getNextMilestone = () => {
    const skills = Object.values(progression.skills);
    const lowestSkill = skills.reduce((min, skill) => 
      skill.level < min.level ? skill : min, 
      skills[0]
    );
    return lowestSkill?.areasForImprovement[0] || 'All skills are at maximum level';
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold mb-8">Skill Progression</h1>

      {/* Overall Progress */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Overall Progress</h2>
            <p className="text-gray-400">Your journey to therapeutic excellence</p>
          </div>
          <Trophy className="w-12 h-12 text-primary" />
        </div>

        <Progress value={calculateOverallProgress()} className="h-3 mb-4" />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="flex items-center gap-3">
            <Target className="w-8 h-8 text-blue-500" />
            <div>
              <div className="text-sm text-gray-400">Next Milestone</div>
              <div className="font-medium">{getNextMilestone()}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-green-500" />
            <div>
              <div className="text-sm text-gray-400">Practice Hours</div>
              <div className="font-medium">
                {Object.values(progression.skills).reduce(
                  (acc, skill) => acc + skill.practiceHours,
                  0
                )} hours
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Award className="w-8 h-8 text-yellow-500" />
            <div>
              <div className="text-sm text-gray-400">Certifications</div>
              <div className="font-medium">{progression.certifications.length}</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Skill Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(progression.skills).map(([skillId, skill]) => (
          <Card key={skillId} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold mb-1">{skillId}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Star className="w-4 h-4" />
                  Level {skill.level}
                </div>
              </div>
              <Badge variant={skill.level >= 8 ? 'default' : 'secondary'}>
                {skill.level >= 8 ? 'Expert' : 'In Progress'}
              </Badge>
            </div>

            <Progress 
              value={(skill.experience / (1000 * skill.level)) * 100} 
              className="h-2 mb-4" 
            />

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-gray-400" />
                <span className="text-sm">
                  {skill.completedTutorials.length} tutorials
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-sm">
                  {skill.completedCaseStudies.length} case studies
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm text-gray-400">Strengths</h4>
              <div className="flex flex-wrap gap-2">
                {skill.strengths.map(strength => (
                  <Badge key={strength} variant="outline">
                    {strength}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <h4 className="font-medium text-sm text-gray-400">Next Steps</h4>
              <ul className="space-y-1">
                {skill.nextSteps.map(step => (
                  <li key={step} className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
      </div>

      {/* Certifications */}
      {progression.certifications.length > 0 && (
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-6">Certifications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {progression.certifications.map(cert => (
              <Card key={cert.id} className="p-4 border-2 border-primary">
                <div className="flex items-start gap-4">
                  <Award className="w-8 h-8 text-primary" />
                  <div>
                    <h3 className="font-semibold">{cert.name}</h3>
                    <p className="text-sm text-gray-400">
                      Earned: {new Date(cert.dateEarned).toLocaleDateString()}
                    </p>
                    {cert.expiryDate && (
                      <p className="text-sm text-gray-400">
                        Expires: {new Date(cert.expiryDate).toLocaleDateString()}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {cert.skills.map(skill => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* Learning Path */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Learning Path</h2>
            <p className="text-gray-400">Your personalized development journey</p>
          </div>
          <Brain className="w-12 h-12 text-primary" />
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Current Goals</h3>
            <div className="flex flex-wrap gap-2">
              {progression.learningPath.currentGoals.map(goal => (
                <Badge key={goal} variant="default">
                  {goal}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Recommended Next Steps</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Tutorials
                </h4>
                <ul className="space-y-1">
                  {progression.learningPath.recommendedTutorials.map(tutorial => (
                    <li key={tutorial} className="text-sm">
                      {tutorial}
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Case Studies
                </h4>
                <ul className="space-y-1">
                  {progression.learningPath.recommendedCaseStudies.map(study => (
                    <li key={study} className="text-sm">
                      {study}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Focus Areas</h3>
            <div className="flex flex-wrap gap-2">
              {progression.learningPath.customizedFocus.map(focus => (
                <Badge key={focus} variant="outline">
                  {focus}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SkillProgressionTracker;
