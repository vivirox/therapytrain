import { type FC } from 'react';
import { Link } from 'react-router-dom';
import { MdPsychology as Brain } from 'react-icons/md';

const TermsOfService: FC = () => {
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

      {/* Terms of Service Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6">Terms of Service</h1>
          <p className="text-xl text-gray-400">
            Please read these terms carefully before using our platform.
          </p>
        </div>

        <div className="space-y-12">
          {/* Agreement to Terms */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Agreement to Terms</h2>
            <p className="text-gray-400 mb-4">
              By accessing or using TherapyTrain AI, you agree to be bound by these Terms of Service
              and our Privacy Policy. If you disagree with any part of these terms, you may not
              access our platform.
            </p>
          </section>

          {/* Eligibility */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Eligibility</h2>
            <p className="text-gray-400 mb-4">
              Our platform is intended for use by licensed or training mental health professionals.
              By using our services, you represent that you meet these qualifications and have the
              authority to accept these terms.
            </p>
          </section>

          {/* Account Terms */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Account Terms</h2>
            <ul className="list-disc list-inside text-gray-400 space-y-2">
              <li>You must provide accurate and complete registration information</li>
              <li>You are responsible for maintaining the security of your account</li>
              <li>You must notify us immediately of any unauthorized access</li>
              <li>You may not share your account credentials</li>
              <li>We reserve the right to terminate accounts at our discretion</li>
            </ul>
          </section>

          {/* Acceptable Use */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Acceptable Use</h2>
            <p className="text-gray-400 mb-4">
              You agree not to:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-2">
              <li>Use the platform for any illegal purpose</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe upon intellectual property rights</li>
              <li>Attempt to gain unauthorized access</li>
              <li>Share confidential information inappropriately</li>
            </ul>
          </section>

          {/* Payment Terms */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Payment Terms</h2>
            <p className="text-gray-400 mb-4">
              Subscription fees are billed in advance on a monthly or annual basis. All fees are
              non-refundable unless otherwise required by law. We reserve the right to change our
              fees upon reasonable notice.
            </p>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Intellectual Property</h2>
            <p className="text-gray-400 mb-4">
              The platform, content, and all related intellectual property rights belong to
              TherapyTrain AI. You may not copy, modify, or create derivative works without our
              explicit permission.
            </p>
          </section>

          {/* Disclaimer */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Disclaimer</h2>
            <p className="text-gray-400 mb-4">
              Our platform is provided "as is" without warranties of any kind. We do not guarantee
              that the platform will be error-free or uninterrupted. You use the platform at your
              own risk.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Limitation of Liability</h2>
            <p className="text-gray-400 mb-4">
              To the maximum extent permitted by law, TherapyTrain AI shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages arising from your
              use of the platform.
            </p>
          </section>

          {/* Indemnification */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Indemnification</h2>
            <p className="text-gray-400 mb-4">
              You agree to indemnify and hold harmless TherapyTrain AI from any claims arising
              from your use of the platform or violation of these terms.
            </p>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Changes to Terms</h2>
            <p className="text-gray-400 mb-4">
              We reserve the right to modify these terms at any time. We will notify you of any
              material changes by posting the new terms on this page and updating the "Last Updated"
              date.
            </p>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
            <p className="text-gray-400 mb-4">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <p className="text-gray-400">
              Email: legal@therapytrain.ai<br />
              Address: [Your Business Address]<br />
              Phone: [Your Phone Number]
            </p>
          </section>

          {/* Last Updated */}
          <section>
            <p className="text-gray-400">
              Last Updated: [Date]
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
