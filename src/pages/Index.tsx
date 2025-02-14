import { type FC } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from "react-router-dom";
import { MdSecurity, MdLock, MdBolt, MdGroups, MdMilitaryTech, MdPsychology, MdAutoAwesome } from "react-icons/md";
import SimpleChat from "frontend/src/components/SimpleChat";

const Index: FC = () => {
  const navigate = useNavigate();

  return (
    <>
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="relative h-[400px] mb-24 grid grid-cols-2 gap-8">
          {/* Left Content - Top 2/3 */}
          <div className="relative z-20 flex flex-col justify-start h-[267px] pt-12">
            <div className="backdrop-blur-md bg-[#0A0A0B]/40 p-8 rounded-2xl border border-white/10">
              <div className="inline-block mb-4 px-4 py-1 bg-blue-500/20 backdrop-blur-sm rounded-full">
                <span className="text-blue-500 font-medium">Welcome to TherapyTrain AI</span>
              </div>
              <h1 className="text-5xl font-bold mb-6">
                Revolutionize Your
                <span className="block text-blue-500">Therapeutic Practice</span>
              </h1>
              <p className="text-xl text-gray-300 max-w-2xl">
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
                  onClick={() => navigate("/features")}
                >
                  Learn More
                </Button>
              </div>
            </div>
          </div>

          {/* Right Image - Bottom 2/3 */}
          <div className="relative h-[267px] mt-[133px]">
            <div className="absolute inset-0 rounded-3xl overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=2070&auto=format&fit=crop"
                alt="Modern AI interface with brain visualization"
                className="absolute inset-0 w-full h-full object-cover opacity-90"
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0B]/20 to-[#0A0A0B]/20" />
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute right-0 bottom-0 w-64 h-64 bg-gradient-to-br from-purple-500/30 to-blue-500/30 rounded-full blur-3xl" />
          <div className="absolute left-0 top-0 w-64 h-64 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-full blur-3xl" />
        </div>
      </div>

      {/* Key Features */}
      <section className="py-16 bg-[#0A0A0B]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-16">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#1A1A1D] p-8 rounded-lg">
              <MdSecurity className="w-12 h-12 text-blue-500 mb-4" ></MdSecurity>
              <h3 className="text-xl font-semibold mb-4">HIPAA Compliant</h3>
              <p className="text-gray-400">Our platform ensures the highest standards of data protection and privacy for all users.</p>
            </div>
            <div className="bg-[#1A1A1D] p-8 rounded-lg">
              <MdLock className="w-12 h-12 text-purple-500 mb-4" ></MdLock>
              <h3 className="text-xl font-semibold mb-4">Secure Environment</h3>
              <p className="text-gray-400">Advanced encryption guarantees the confidentiality of all training sessions and user data.</p>
            </div>
            <div className="bg-[#1A1A1D] p-8 rounded-lg">
              <MdBolt className="w-12 h-12 text-yellow-500 mb-4" ></MdBolt>
              <h3 className="text-xl font-semibold mb-4">Real-time Feedback</h3>
              <p className="text-gray-400">Receive immediate, AI-generated evaluations of your therapeutic approaches.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-16">Why Choose TherapyTrain AI?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-[#1A1A1D] p-8 rounded-lg">
              <MdGroups className="w-12 h-12 text-blue-500 mb-4" ></MdGroups>
              <h3 className="text-xl font-semibold mb-4">Diverse Case Studies</h3>
              <p className="text-gray-400">Experience a wide range of client presentations and therapeutic challenges.</p>
            </div>
            <div className="bg-[#1A1A1D] p-8 rounded-lg">
              <MdMilitaryTech className="w-12 h-12 text-yellow-500 mb-4" ></MdMilitaryTech>
              <h3 className="text-xl font-semibold mb-4">Skill Certification</h3>
              <p className="text-gray-400">Earn certificates as you progress through different levels of therapeutic challenges.</p>
            </div>
            <div className="bg-[#1A1A1D] p-8 rounded-lg">
              <MdAutoAwesome className="w-12 h-12 text-green-500 mb-4" ></MdAutoAwesome>
              <h3 className="text-xl font-semibold mb-4">Adaptive Learning</h3>
              <p className="text-gray-400">Our AI adjusts the difficulty based on your performance, ensuring personalized learning.</p>
            </div>
            <div className="bg-[#1A1A1D] p-8 rounded-lg">
              <MdPsychology className="w-12 h-12 text-purple-500 mb-4" ></MdPsychology>
              <h3 className="text-xl font-semibold mb-4">Evidence-Based Approaches</h3>
              <p className="text-gray-400">All simulations are grounded in the latest research and best practices in psychotherapy.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Index;
