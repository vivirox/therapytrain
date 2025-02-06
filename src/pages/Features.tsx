import { type FC } from 'react';
import { Button } from "../components/ui/button";
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
      <div className="relative h-[300px] mb-24 rounded-3xl overflow-hidden">
        {/* Background Image */}
        <img
          src="https://images.unsplash.com/photo-1633613286991-611fe299c4be?q=80&w=2070&auto=format&fit=crop"
          alt="Modern therapy training features"
          className="absolute inset-0 w-full h-full object-cover opacity-70"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0B]/60 to-[#0A0A0B]/60" />

        {/* Content */}
        <div className="relative z-20 h-full flex flex-col justify-center items-center text-center px-8">
          <div className="max-w-3xl backdrop-blur-md bg-[#0A0A0B]/40 p-8 rounded-2xl border border-white/10">
            <div className="inline-block mb-4 px-4 py-1 bg-purple-500/20 backdrop-blur-sm rounded-full">
              <span className="text-purple-500 font-medium">Features</span>
            </div>
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
              Powerful Features for Modern Therapy Training
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Experience the next generation of therapeutic training with our cutting-edge AI-powered platform.
            </p>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-gradient-to-br from-purple-500/30 to-blue-500/30 rounded-full blur-3xl" />
        <div className="absolute -left-12 -top-12 w-64 h-64 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-full blur-3xl" />
      </div>

      {/* Main Features */}
      <div className="grid grid-cols-2 gap-8 mb-24">
        {/* AI-Powered Training */}
        <div className="relative col-span-2">
          <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-blue-500 to-transparent" />
          <div className="pl-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-blue-500/10 p-3 rounded-xl">
                <MdSmartToy className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-3xl font-bold">AI-Powered Training</h2>
            </div>
            <p className="text-gray-400 mb-8 text-lg">
              Our advanced AI system provides personalized feedback and adapts to your learning style,
              creating a truly unique training experience.
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-[#1A1A1D] p-6 rounded-xl hover:bg-[#1A1A1D]/80 transition-colors">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <MdAutoAwesome className="text-blue-500" />
                  Real-time Analysis
                </h3>
                <p className="text-gray-400">
                  Get instant feedback on your therapeutic approaches and communication style.
                </p>
              </div>
              <div className="bg-[#1A1A1D] p-6 rounded-xl hover:bg-[#1A1A1D]/80 transition-colors">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <MdAnalytics className="text-purple-500" />
                  Progress Tracking
                </h3>
                <p className="text-gray-400">
                  Monitor your growth with detailed analytics and performance metrics.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Scenarios */}
        <div className="relative">
          <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-purple-500 to-transparent" />
          <div className="pl-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-purple-500/10 p-3 rounded-xl">
                <MdPsychology className="w-8 h-8 text-purple-500" />
              </div>
              <h2 className="text-3xl font-bold">Clinical Scenarios</h2>
            </div>
            <p className="text-gray-400 mb-8 text-lg">
              Practice with diverse, realistic client scenarios that prepare you for real-world therapeutic situations.
            </p>
            <div className="bg-[#1A1A1D] p-6 rounded-xl hover:bg-[#1A1A1D]/80 transition-colors">
              <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                <MdPeople className="text-green-500" />
                Diverse Client Profiles
              </h3>
              <p className="text-gray-400">
                Work with a wide range of client backgrounds, conditions, and therapeutic needs.
              </p>
            </div>
          </div>
        </div>

        {/* Evidence-Based Learning */}
        <div className="relative">
          <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-green-500 to-transparent" />
          <div className="pl-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-green-500/10 p-3 rounded-xl">
                <MdSchool className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-3xl font-bold">Evidence-Based</h2>
            </div>
            <p className="text-gray-400 mb-8 text-lg">
              All scenarios are based on current research and best practices in psychotherapy.
            </p>
            <div className="bg-[#1A1A1D] p-6 rounded-xl hover:bg-[#1A1A1D]/80 transition-colors">
              <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                <MdStar className="text-yellow-500" />
                Research-Backed
              </h3>
              <p className="text-gray-400">
                Stay current with the latest therapeutic techniques and methodologies.
              </p>
            </div>
          </div>
        </div>

        {/* Security & Compliance */}
        <div className="relative col-span-2">
          <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-green-500 to-transparent" />
          <div className="pl-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-green-500/10 p-3 rounded-xl">
                <MdSecurity className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-3xl font-bold">Security & Compliance</h2>
            </div>
            <p className="text-gray-400 mb-8 text-lg">
              Train with confidence knowing your data is protected by industry-leading security measures.
            </p>
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-[#1A1A1D] p-6 rounded-xl hover:bg-[#1A1A1D]/80 transition-colors">
                <div className="flex items-start gap-3">
                  <MdStar className="w-5 h-5 text-yellow-500 mt-1 flex-shrink-0" />
                  <span className="text-gray-400">HIPAA-compliant infrastructure</span>
                </div>
              </div>
              <div className="bg-[#1A1A1D] p-6 rounded-xl hover:bg-[#1A1A1D]/80 transition-colors">
                <div className="flex items-start gap-3">
                  <MdStar className="w-5 h-5 text-yellow-500 mt-1 flex-shrink-0" />
                  <span className="text-gray-400">End-to-end encryption</span>
                </div>
              </div>
              <div className="bg-[#1A1A1D] p-6 rounded-xl hover:bg-[#1A1A1D]/80 transition-colors">
                <div className="flex items-start gap-3">
                  <MdStar className="w-5 h-5 text-yellow-500 mt-1 flex-shrink-0" />
                  <span className="text-gray-400">Regular security audits</span>
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
