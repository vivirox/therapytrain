import { type FC } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from "react-router-dom";
import {
  MdSecurity,
  MdAutoAwesome,
  MdPsychology,
  MdAnalytics,
  MdSchool,
  MdSmartToy,
  MdPeople,
  MdStar
} from "react-icons/md";

const Features: FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      {/* Hero Section */}
      <div className="relative h-[400px] mb-48 grid grid-cols-2 gap-8">
        {/* Left Content - Top 2/3 */}
        <div className="relative z-20 flex flex-col justify-start h-[267px] pt-12">
          <div className="backdrop-blur-md bg-[#0A0A0B]/40 p-8 rounded-2xl border border-white/10">
            <h1 className="text-5xl font-bold mb-6">
              Simply the Best
              <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">Features</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl">
              Experience the next generation of therapeutic training with our cutting-edge AI-powered platform.
            </p>
          </div>
        </div>

        {/* Right Image - Bottom 2/3 */}
        <div className="relative h-[267px] mt-[133px]">
          <div className="absolute inset-0 rounded-3xl overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1633613286991-611fe299c4be?q=80&w=2070&auto=format&fit=crop"
              alt="Modern therapy training features"
              className="absolute inset-0 w-full h-full object-cover opacity-70"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0B]/60 to-[#0A0A0B]/60" />
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute right-0 bottom-0 w-64 h-64 bg-gradient-to-br from-purple-500/30 to-blue-500/30 rounded-full blur-3xl" />
        <div className="absolute left-0 top-0 w-64 h-64 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-full blur-3xl" />
      </div>

      {/* Main Features */}
      <div className="grid grid-cols-2 gap-8 mb-24">
        {/* AI-Powered Training */}
        <div className="relative col-span-2">
          <div className="pl-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-blue-500/10 p-3 rounded-xl">
                <MdSmartToy className="w-8 h-8 text-blue-500" ></MdSmartToy>
              </div>
              <h2 className="text-3xl font-bold">Advanced Simulation & Feedback</h2>
            </div>
            <p className="text-gray-400 mb-8 text-lg">
              Experience realistic client interactions through our sophisticated training environment with real-time sentiment analysis and behavioral pattern detection.
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-[#1A1A1D] p-6 rounded-xl hover:bg-[#1A1A1D]/80 transition-colors">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <MdAutoAwesome className="text-blue-500" ></MdAutoAwesome>
                  Real-time Analysis
                </h3>
                <p className="text-gray-400">
                  Receive immediate feedback on therapeutic techniques and intervention strategies through advanced sentiment analysis.
                </p>
              </div>
              <div className="bg-[#1A1A1D] p-6 rounded-xl hover:bg-[#1A1A1D]/80 transition-colors">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <MdAnalytics className="text-purple-500" ></MdAnalytics>
                  Comprehensive Tracking
                </h3>
                <p className="text-gray-400">
                  Monitor your progress with detailed analytics on therapeutic techniques and intervention effectiveness.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Scenarios */}
        <div className="relative">
          <div className="pl-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-purple-500/10 p-3 rounded-xl">
                <MdPsychology className="w-8 h-8 text-purple-500" ></MdPsychology>
              </div>
              <h2 className="text-3xl font-bold">Skill Development</h2>
            </div>
            <p className="text-gray-400 mb-8 text-lg">
              Access our extensive case study library with branching pathways that adapt to your responses, creating dynamic learning experiences.
            </p>
            <div className="bg-[#1A1A1D] p-6 rounded-xl hover:bg-[#1A1A1D]/80 transition-colors">
              <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                <MdPeople className="text-green-500" ></MdPeople>
                Adaptive Learning
              </h3>
              <p className="text-gray-400">
                Experience scenarios that evolve based on your responses, mirroring the complexity of real therapeutic relationships.
              </p>
            </div>
          </div>
        </div>

        {/* Evidence-Based Learning */}
        <div className="relative">
          <div className="pl-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-green-500/10 p-3 rounded-xl">
                <MdSchool className="w-8 h-8 text-green-500" ></MdSchool>
              </div>
              <h2 className="text-3xl font-bold">Professional Growth</h2>
            </div>
            <p className="text-gray-400 mb-8 text-lg">
              Stay current with the latest therapeutic techniques while earning continuing education credits through our platform.
            </p>
            <div className="bg-[#1A1A1D] p-6 rounded-xl hover:bg-[#1A1A1D]/80 transition-colors">
              <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                <MdStar className="text-yellow-500" ></MdStar>
                Continuous Learning
              </h3>
              <p className="text-gray-400">
                Access expanded educational resources and earn CE credits while improving your therapeutic skills.
              </p>
            </div>
          </div>
        </div>

        {/* Security & Compliance */}
        <div className="relative col-span-2">
          <div className="pl-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-green-500/10 p-3 rounded-xl">
                <MdSecurity className="w-8 h-8 text-green-500" ></MdSecurity>
              </div>
              <h2 className="text-3xl font-bold">Privacy-First Architecture</h2>
            </div>
            <p className="text-gray-400 mb-8 text-lg">
              Train with confidence using our state-of-the-art security measures and HIPAA-compliant infrastructure.
            </p>
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-[#1A1A1D] p-6 rounded-xl hover:bg-[#1A1A1D]/80 transition-colors">
                <div className="flex items-start gap-3">
                  <MdStar className="w-5 h-5 text-yellow-500 mt-1 flex-shrink-0" ></MdStar>
                  <span className="text-gray-400">End-to-end encryption for all communications</span>
                </div>
              </div>
              <div className="bg-[#1A1A1D] p-6 rounded-xl hover:bg-[#1A1A1D]/80 transition-colors">
                <div className="flex items-start gap-3">
                  <MdStar className="w-5 h-5 text-yellow-500 mt-1 flex-shrink-0" ></MdStar>
                  <span className="text-gray-400">Zero-knowledge proofs for data verification</span>
                </div>
              </div>
              <div className="bg-[#1A1A1D] p-6 rounded-xl hover:bg-[#1A1A1D]/80 transition-colors">
                <div className="flex items-start gap-3">
                  <MdStar className="w-5 h-5 text-yellow-500 mt-1 flex-shrink-0" ></MdStar>
                  <span className="text-gray-400">Role-based access control & audit trails</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="mt-32 text-center">
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-8 rounded-2xl">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Practice?</h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            Join thousands of therapists who are enhancing their skills with TherapyTrain AI.
          </p>
          <Button
            onClick={() => navigate("/auth")}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 px-8 py-6 text-lg"
          >
            Start Your Journey
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Features;
