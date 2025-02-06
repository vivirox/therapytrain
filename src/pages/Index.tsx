import { type FC } from 'react';
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";
import { MdSecurity, MdLock, MdBolt, MdGroups, MdMilitaryTech, MdPsychology, MdAutoAwesome } from "react-icons/md";

const Index: FC = () => {
  const navigate = useNavigate();

  return (
    <>
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl font-bold leading-tight">
              Revolutionize Your
              <span className="block text-blue-500">Therapeutic Practice</span>
            </h1>
            <p className="mt-6 text-gray-400 text-lg">
              Enhance your skills with our HIPAA-compliant, AI-powered platform.
              Experience challenging scenarios and receive real-time feedback to
              become an exceptional therapist.
            </p>
            <div className="mt-8 flex space-x-4">
              <Button
                onClick={() => navigate("/auth")}
                className="bg-blue-500 hover:bg-blue-600 px-8"
              >
                Start Training
              </Button>
              <Button
                variant="outline"
                className="bg-transparent border-gray-600"
              >
                Learn More
              </Button>
            </div>
          </div>
          <div className="flex justify-center items-center">
            <MdPsychology className="w-64 h-64 text-blue-500 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Key Features */}
      <section id="features" className="py-20 bg-[#111114]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-16">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#1A1A1D] p-8 rounded-lg">
              <MdSecurity className="w-12 h-12 text-blue-500 mb-4" />
              <h3 className="text-xl font-semibold mb-4">HIPAA Compliant</h3>
              <p className="text-gray-400">Our platform ensures the highest standards of data protection and privacy for all users.</p>
            </div>
            <div className="bg-[#1A1A1D] p-8 rounded-lg">
              <MdLock className="w-12 h-12 text-purple-500 mb-4" />
              <h3 className="text-xl font-semibold mb-4">Secure Environment</h3>
              <p className="text-gray-400">Advanced encryption guarantees the confidentiality of all training sessions and user data.</p>
            </div>
            <div className="bg-[#1A1A1D] p-8 rounded-lg">
              <MdBolt className="w-12 h-12 text-yellow-500 mb-4" />
              <h3 className="text-xl font-semibold mb-4">Real-time Feedback</h3>
              <p className="text-gray-400">Receive immediate, AI-generated evaluations of your therapeutic approaches.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section id="benefits" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-16">Why Choose TherapyTrain AI?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-[#1A1A1D] p-8 rounded-lg">
              <MdGroups className="w-12 h-12 text-blue-500 mb-4" />
              <h3 className="text-xl font-semibold mb-4">Diverse Case Studies</h3>
              <p className="text-gray-400">Experience a wide range of client presentations and therapeutic challenges.</p>
            </div>
            <div className="bg-[#1A1A1D] p-8 rounded-lg">
              <MdMilitaryTech className="w-12 h-12 text-yellow-500 mb-4" />
              <h3 className="text-xl font-semibold mb-4">Skill Certification</h3>
              <p className="text-gray-400">Earn certificates as you progress through different levels of therapeutic challenges.</p>
            </div>
            <div className="bg-[#1A1A1D] p-8 rounded-lg">
              <MdAutoAwesome className="w-12 h-12 text-green-500 mb-4" />
              <h3 className="text-xl font-semibold mb-4">Adaptive Learning</h3>
              <p className="text-gray-400">Our AI adjusts the difficulty based on your performance, ensuring personalized learning.</p>
            </div>
            <div className="bg-[#1A1A1D] p-8 rounded-lg">
              <MdPsychology className="w-12 h-12 text-purple-500 mb-4" />
              <h3 className="text-xl font-semibold mb-4">Evidence-Based Approaches</h3>
              <p className="text-gray-400">All simulations are grounded in the latest research and best practices in psychotherapy.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-[#111114]">
        <div className="max-w-3xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-6">Ready to Elevate Your Therapeutic Skills?</h2>
          <p className="text-gray-400 mb-8">
            Join thousands of therapists who are already benefiting from our
            cutting-edge training platform. Start your journey to becoming an
            exceptional therapist today.
          </p>
          <Button
            onClick={() => navigate("/auth")}
            className="bg-blue-500 hover:bg-blue-600 px-8"
          >
            Begin Your Training
          </Button>
        </div>
      </section>
    </>
  );
};

export default Index;
