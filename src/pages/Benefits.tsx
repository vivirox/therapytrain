import { type FC } from 'react';
import { Link } from 'react-router-dom';
import {
  MdPsychology as Brain,
  MdTrendingUp as Growth,
  MdAccessTime as Time,
  MdPeople as Community,
  MdWorkspaces as Flexibility,
  MdStar as Star,
  MdVerified as Verified,
  MdLightbulb as Insight,
  MdAutoGraph as Progress
} from 'react-icons/md';

const Benefits: FC = () => {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      {/* Navigation */}
      <nav className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-blue-500" />
              <span className="ml-2 text-xl font-bold">TherapyTrain AI</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/" className="text-gray-300 hover:text-white">Home</Link>
              <Link to="/features" className="text-gray-300 hover:text-white">Features</Link>
              <Link to="/benefits" className="text-gray-300 hover:text-white">Benefits</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Benefits Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6">Why Choose TherapyTrain AI?</h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Experience the advantages of our cutting-edge platform designed to enhance your therapeutic skills and advance your career.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Professional Growth */}
          <div className="bg-[#1A1A1D] p-8 rounded-lg">
            <Growth className="w-12 h-12 text-blue-500 mb-4" />
            <h3 className="text-xl font-semibold mb-4">Accelerated Growth</h3>
            <p className="text-gray-400">Fast-track your professional development with AI-powered training scenarios and personalized feedback.</p>
          </div>

          {/* Time Efficiency */}
          <div className="bg-[#1A1A1D] p-8 rounded-lg">
            <Time className="w-12 h-12 text-purple-500 mb-4" />
            <h3 className="text-xl font-semibold mb-4">Time-Efficient Learning</h3>
            <p className="text-gray-400">Maximize your learning potential with focused, high-impact training sessions that fit your schedule.</p>
          </div>

          {/* Community */}
          <div className="bg-[#1A1A1D] p-8 rounded-lg">
            <Community className="w-12 h-12 text-yellow-500 mb-4" />
            <h3 className="text-xl font-semibold mb-4">Supportive Community</h3>
            <p className="text-gray-400">Connect with fellow therapists, share experiences, and learn from diverse perspectives.</p>
          </div>

          {/* Flexibility */}
          <div className="bg-[#1A1A1D] p-8 rounded-lg">
            <Flexibility className="w-12 h-12 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-4">Practice Flexibility</h3>
            <p className="text-gray-400">Train anytime, anywhere with our cloud-based platform accessible from any device.</p>
          </div>

          {/* Certification */}
          <div className="bg-[#1A1A1D] p-8 rounded-lg">
            <Verified className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-xl font-semibold mb-4">Professional Certification</h3>
            <p className="text-gray-400">Earn recognized certifications as you master different therapeutic approaches and techniques.</p>
          </div>

          {/* Cost-Effective */}
          <div className="bg-[#1A1A1D] p-8 rounded-lg">
            <Star className="w-12 h-12 text-indigo-500 mb-4" />
            <h3 className="text-xl font-semibold mb-4">Cost-Effective Training</h3>
            <p className="text-gray-400">Access premium training content at a fraction of the cost of traditional supervision and workshops.</p>
          </div>

          {/* Real-World Application */}
          <div className="bg-[#1A1A1D] p-8 rounded-lg">
            <Insight className="w-12 h-12 text-orange-500 mb-4" />
            <h3 className="text-xl font-semibold mb-4">Practical Experience</h3>
            <p className="text-gray-400">Gain hands-on experience with realistic scenarios that prepare you for real-world client interactions.</p>
          </div>

          {/* Measurable Progress */}
          <div className="bg-[#1A1A1D] p-8 rounded-lg">
            <Progress className="w-12 h-12 text-teal-500 mb-4" />
            <h3 className="text-xl font-semibold mb-4">Track Your Progress</h3>
            <p className="text-gray-400">Monitor your development with detailed analytics and progress tracking tools.</p>
          </div>

          {/* Evidence-Based */}
          <div className="bg-[#1A1A1D] p-8 rounded-lg">
            <Brain className="w-12 h-12 text-pink-500 mb-4" />
            <h3 className="text-xl font-semibold mb-4">Evidence-Based Methods</h3>
            <p className="text-gray-400">Learn and practice therapeutic techniques grounded in the latest research and clinical evidence.</p>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-[#111114] py-20">
        <div className="max-w-3xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold mb-6">Start Your Professional Growth Today</h2>
          <p className="text-gray-400 mb-8">
            Join thousands of therapists who have transformed their practice with TherapyTrain AI.
            Experience the benefits of AI-powered training firsthand.
          </p>
          <Link
            to="/auth"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Begin Your Journey
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Benefits;
