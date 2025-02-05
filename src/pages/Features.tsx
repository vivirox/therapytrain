import { type FC } from 'react';
import { Link } from 'react-router-dom';
import {
  MdSecurity as Shield,
  MdPsychology as Brain,
  MdAutoAwesome as Sparkles,
  MdSchool as Education,
  MdAnalytics as Analytics,
  MdSupportAgent as Support
} from 'react-icons/md';

const Features: FC = () => {
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

      {/* Features Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6">Platform Features</h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Discover the powerful features that make TherapyTrain AI the leading platform for therapist training and skill development.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* HIPAA Compliance */}
          <div className="bg-[#1A1A1D] p-8 rounded-lg">
            <Shield className="w-12 h-12 text-blue-500 mb-4" />
            <h3 className="text-xl font-semibold mb-4">HIPAA Compliant</h3>
            <p className="text-gray-400">Secure and compliant platform ensuring the highest standards of data protection and privacy.</p>
          </div>

          {/* AI-Powered Training */}
          <div className="bg-[#1A1A1D] p-8 rounded-lg">
            <Brain className="w-12 h-12 text-purple-500 mb-4" />
            <h3 className="text-xl font-semibold mb-4">AI-Powered Training</h3>
            <p className="text-gray-400">Advanced AI simulations providing realistic therapeutic scenarios and immediate feedback.</p>
          </div>

          {/* Personalized Learning */}
          <div className="bg-[#1A1A1D] p-8 rounded-lg">
            <Sparkles className="w-12 h-12 text-yellow-500 mb-4" />
            <h3 className="text-xl font-semibold mb-4">Personalized Learning</h3>
            <p className="text-gray-400">Adaptive learning paths that adjust to your skill level and learning style.</p>
          </div>

          {/* Comprehensive Education */}
          <div className="bg-[#1A1A1D] p-8 rounded-lg">
            <Education className="w-12 h-12 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-4">Comprehensive Education</h3>
            <p className="text-gray-400">Extensive library of resources, case studies, and evidence-based therapeutic approaches.</p>
          </div>

          {/* Progress Analytics */}
          <div className="bg-[#1A1A1D] p-8 rounded-lg">
            <Analytics className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-xl font-semibold mb-4">Progress Analytics</h3>
            <p className="text-gray-400">Detailed insights and analytics to track your development and identify areas for improvement.</p>
          </div>

          {/* Expert Support */}
          <div className="bg-[#1A1A1D] p-8 rounded-lg">
            <Support className="w-12 h-12 text-indigo-500 mb-4" />
            <h3 className="text-xl font-semibold mb-4">Expert Support</h3>
            <p className="text-gray-400">Access to professional support and guidance throughout your learning journey.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Features;
