import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      <div className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-16 items-center">
          <div className="max-w-xl">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              AI-Powered Training for
              <span className="block text-blue-400">Mental Health Professionals</span>
            </h1>
            <p className="mt-6 text-xl text-gray-300">
              Practice your therapeutic skills with our advanced AI clients. Get real-time feedback and improve your clinical expertise in a safe, controlled environment.
            </p>
            <div className="mt-10">
              <Button 
                onClick={() => navigate("/auth")} 
                className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-6 text-lg rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                Let's Begin
              </Button>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-4">
              <div className="text-center">
                <h3 className="text-3xl font-bold text-white">6+</h3>
                <p className="text-gray-400">Client Scenarios</p>
              </div>
              <div className="text-center">
                <h3 className="text-3xl font-bold text-white">10</h3>
                <p className="text-gray-400">Minute Sessions</p>
              </div>
              <div className="text-center">
                <h3 className="text-3xl font-bold text-white">100%</h3>
                <p className="text-gray-400">HIPAA Compliant</p>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d"
                alt="Therapist working with client"
                className="object-cover w-full h-full rounded-lg"
              />
            </div>
            <div className="absolute -bottom-4 -right-4 bg-blue-500 text-white p-4 rounded-lg shadow-lg">
              <p className="text-sm font-semibold">Real-time Feedback</p>
              <p className="text-xs opacity-75">Improve as you practice</p>
            </div>
          </div>
        </div>

        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center text-white mb-12">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-white mb-4">Diverse Client Profiles</h3>
              <p className="text-gray-300">Practice with six different challenging client scenarios.</p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-white mb-4">Timed Sessions</h3>
              <p className="text-gray-300">10-minute focused sessions with real-time countdown.</p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-white mb-4">Performance Analysis</h3>
              <p className="text-gray-300">Get detailed feedback and scoring after each session.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;