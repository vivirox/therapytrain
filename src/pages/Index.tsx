import App from '../App'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Award, Brain, LockIcon, Shield, Sparkles, Users, Zap } from 'lucide-react'
import { Button } from 'react-day-picker'

const render = () => {
  createRoot(document.getElementById('root')!).render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )
}

render();

if (import.meta.env.DEV) {
  if (import.meta.hot) {
    import.meta.hot.accept('./App', () => {
      console.log('Hot-updating App');
      render();
    });
  }
}const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="text-white">
      {/* Navigation */}
      <nav className="border-b border-gray-800">
        {/* ... (keep your existing navigation code) ... */}
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* ... (keep your existing hero section code) ... */}
      </div>

      {/* Key Features */}
      <section id="features" className="py-20 bg-[#111114]">
        {/* ... (keep your existing features section code) ... */}
      </section>

      {/* Why Choose Section */}
      <section id="benefits" className="py-20">
        {/* ... (keep your existing benefits section code) ... */}
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-[#111114]">
        {/* ... (keep your existing CTA section code) ... */}
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12">
        {/* ... (keep your existing footer code) ... */}
      </footer>
    </div>
  );
};
const IndexContent = () => {
  const navigate = useNavigate();

  return (
    <div className="text-white">
      {/* Navigation */}
      <nav className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-blue-500" />
              <span className="ml-2 text-xl font-bold">TherapyTrain AI</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="/" className="text-gray-300 hover:text-white">Home</a>
              <a href="#features" className="text-gray-300 hover:text-white">Features</a>
              <a href="#benefits" className="text-gray-300 hover:text-white">Benefits</a>
              <Button
                onClick={() => navigate("/auth")}
                className="bg-transparent border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
              >
                Log In
              </Button>
            </div>
          </div>
        </div>
      </nav>

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
                className="bg-transparent border border-gray-600"
              >
                Learn More
              </Button>
            </div>
          </div>
          <div className="flex justify-center items-center">
            <Brain className="w-64 h-64 text-blue-500 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Key Features */}
      <section id="features" className="py-20 bg-[#111114]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-16">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#1A1A1D] p-8 rounded-lg">
              <Shield className="w-12 h-12 text-blue-500 mb-4" />
              <h3 className="text-xl font-semibold mb-4">HIPAA Compliant</h3>
              <p className="text-gray-400">Our platform ensures the highest standards of data protection and privacy for all users.</p>
            </div>
            <div className="bg-[#1A1A1D] p-8 rounded-lg">

              <LockIcon className="w-12 h-12 text-purple-500 mb-4" />
              <h3 className="text-xl font-semibold mb-4">Secure Environment</h3>
              <p className="text-gray-400">Advanced encryption guarantees the confidentiality of all training sessions and user data.</p>
            </div>
            <div className="bg-[#1A1A1D] p-8 rounded-lg">
              <Zap className="w-12 h-12 text-yellow-500 mb-4" />
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
              <Users className="w-12 h-12 text-blue-500 mb-4" />
              <h3 className="text-xl font-semibold mb-4">Diverse Case Studies</h3>
              <p className="text-gray-400">Experience a wide range of client presentations and therapeutic challenges.</p>
            </div>
            <div className="bg-[#1A1A1D] p-8 rounded-lg">
              <Award className="w-12 h-12 text-yellow-500 mb-4" />
              <h3 className="text-xl font-semibold mb-4">Skill Certification</h3>
              <p className="text-gray-400">Earn certificates as you progress through different levels of therapeutic challenges.</p>
            </div>
            <div className="bg-[#1A1A1D] p-8 rounded-lg">
              <Sparkles className="w-12 h-12 text-green-500 mb-4" />
              <h3 className="text-xl font-semibold mb-4">Adaptive Learning</h3>
              <p className="text-gray-400">Our AI adjusts the difficulty based on your performance, ensuring personalized learning.</p>
            </div>
            <div className="bg-[#1A1A1D] p-8 rounded-lg">
              <Brain className="w-12 h-12 text-purple-500 mb-4" />
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

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <Brain className="h-6 w-6 text-blue-500" />
              <span className="ml-2 text-lg font-bold">TherapyTrain AI</span>
            </div>
            <div className="flex space-x-6 text-sm text-gray-400">
              <a href="#" className="hover:text-white">Home</a>
              <a href="#features" className="hover:text-white">Features</a>
              <a href="#benefits" className="hover:text-white">Benefits</a>
              <a href="/privacy-policy" className="hover:text-white">Privacy Policy</a>
              <a href="/terms-of-service" className="hover:text-white">Terms of Service</a>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-gray-400">
            <p>© 2024 TherapyTrain AI. All rights reserved.</p>
            <p className="mt-2">HIPAA Compliant | Secure | Confidential</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default Index;
