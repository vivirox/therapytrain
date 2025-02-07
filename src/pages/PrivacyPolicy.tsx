import { type FC } from 'react';
import { Link } from 'react-router-dom';
import { MdPsychology as Brain } from 'react-icons/md';

const PrivacyPolicy: FC = () => {
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

      {/* Privacy Policy Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6">Privacy Policy</h1>
          <p className="text-xl text-gray-400">
            Your privacy and data security are our top priorities. Learn how we protect your information.
          </p>
        </div>

        <div className="space-y-12">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
            <p className="text-gray-400 mb-4">
              TherapyTrain AI ("we," "our," or "us") is committed to protecting your privacy and ensuring
              the security of your personal and professional information. This Privacy Policy explains how
              we collect, use, disclose, and safeguard your information when you use our platform.
            </p>
          </section>

          {/* HIPAA Compliance */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">HIPAA Compliance</h2>
            <p className="text-gray-400 mb-4">
              As a platform serving healthcare professionals, we maintain strict compliance with the Health
              Insurance Portability and Accountability Act (HIPAA). We implement all required technical,
              physical, and administrative safeguards to protect your information.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
            <ul className="list-disc list-inside text-gray-400 space-y-2">
              <li>Account information (name, email, professional credentials)</li>
              <li>Training session data and progress metrics</li>
              <li>Usage information and platform interactions</li>
              <li>Technical data (IP address, browser type, device information)</li>
              <li>Communications and feedback</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
            <ul className="list-disc list-inside text-gray-400 space-y-2">
              <li>Provide and improve our training services</li>
              <li>Personalize your learning experience</li>
              <li>Track and analyze your progress</li>
              <li>Maintain platform security and prevent fraud</li>
              <li>Communicate important updates and information</li>
            </ul>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
            <p className="text-gray-400 mb-4">
              We employ industry-standard security measures to protect your information, including:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-2">
              <li>End-to-end encryption for all data transmission</li>
              <li>Secure data storage with regular backups</li>
              <li>Access controls and authentication measures</li>
              <li>Regular security audits and assessments</li>
              <li>Employee training on data protection</li>
            </ul>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Data Retention</h2>
            <p className="text-gray-400 mb-4">
              We retain your information only for as long as necessary to provide our services and comply
              with legal obligations. You can request deletion of your account and associated data at any
              time.
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
            <p className="text-gray-400 mb-4">
              You have the right to:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-2">
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Opt-out of certain data processing</li>
              <li>Receive a copy of your data</li>
            </ul>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
            <p className="text-gray-400 mb-4">
              If you have any questions about our Privacy Policy or data practices, please contact our
              Privacy Officer at:
            </p>
            <p className="text-gray-400">
              Email: privacy@therapytrain.ai<br />
              Address: [Your Business Address]<br />
              Phone: [Your Phone Number]
            </p>
          </section>

          {/* Updates to Privacy Policy */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Updates to Privacy Policy</h2>
            <p className="text-gray-400 mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any material
              changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
            </p>
            <p className="text-gray-400">
              Last Updated: [Date]
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
