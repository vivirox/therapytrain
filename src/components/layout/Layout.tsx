import { type FC, type ReactNode } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { MdPsychology } from "react-icons/md";

interface LayoutProps {
  children: ReactNode;
}

export const Layout: FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      {/* Navigation */}
      <nav className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <MdPsychology className="h-8 w-8 text-blue-500" />
                <span className="ml-2 text-xl font-bold">TherapyTrain AI</span>
              </Link>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/" className="text-gray-300 hover:text-white">Home</Link>
              <Link to="/features" className="text-gray-300 hover:text-white">Features</Link>
              <Link to="/benefits" className="text-gray-300 hover:text-white">Benefits</Link>
              <Button
                onClick={() => navigate("/auth")}
                variant="outline"
                className="bg-transparent border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
              >
                Log In
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <Link to="/" className="flex items-center">
                <MdPsychology className="h-6 w-6 text-blue-500" />
                <span className="ml-2 text-lg font-bold">TherapyTrain AI</span>
              </Link>
            </div>
            <div className="flex space-x-6 text-sm text-gray-400">
              <Link to="/" className="hover:text-white">Home</Link>
              <Link to="/features" className="hover:text-white">Features</Link>
              <Link to="/benefits" className="hover:text-white">Benefits</Link>
              <Link to="/privacy-policy" className="hover:text-white">Privacy Policy</Link>
              <Link to="/terms-of-service" className="hover:text-white">Terms of Service</Link>
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