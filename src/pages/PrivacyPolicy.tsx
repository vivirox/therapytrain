// src/pages/PrivacyPolicy.tsx

import React from 'react';

const PrivacyPolicy: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#0A0A0B] text-white flex justify-center items-center">
            <div className="max-w-2xl p-4">
                <h1>Privacy Policy</h1>
                <h2>Introduction</h2>
                <p>Welcome to Gem City XYZ, a website designed to provide a platform for users to engage with therapy-related content and services. We are committed to protecting the privacy and security of our users' Protected Health Information (PHI).</p>
                <h2>Definition of PHI</h2>
                <p>PHI is any individually identifiable health information that is created or received by a covered entity, such as demographic information, medical history, treatment information, and other sensitive data.</p>
                <h2>Types of PHI Collected</h2>
                <p>We collect the following types of PHI:</p>
                <ul>
                    <li>Demographic information, such as name, address, and date of birth</li>
                    <li>Medical history, including diagnoses, treatments, and medications</li>
                    <li>Treatment information, including therapy sessions and progress notes</li>
                </ul>
                <h2>Purposes of PHI Collection</h2>
                <p>We collect PHI for the following purposes:</p>
                <ul>
                    <li>Treatment: to provide therapy services to our users</li>
                    <li>Payment: to process payments for our services</li>
                    <li>Healthcare operations: to manage our business and improve our services</li>
                </ul>
                <h2>Disclosure of PHI</h2>
                <p>We may disclose PHI to the following entities:</p>
                <ul>
                    <li>Healthcare providers: to coordinate care and provide treatment</li>
                    <li>Insurance companies: to process payments and verify coverage</li>
                    <li>Government agencies: to comply with regulatory requirements</li>
                </ul>
                <h2>Patient Rights</h2>
                <p>Under HIPAA, patients have the following rights:</p>
                <ul>
                    <li>Right to access: to access and obtain a copy of their PHI</li>
                    <li>Right to amend: to request corrections to their PHI</li>
                    <li>Right to restrict disclosure: to request restrictions on the disclosure of their PHI</li>
                </ul>
                <h2>Security Measures</h2>
                <p>We have implemented the following security measures to protect PHI:</p>
                <ul>
                    <li>Encryption: to protect PHI in transit and at rest</li>
                    <li>Access controls: to limit access to authorized personnel</li>
                    <li>Audit logs: to monitor and track access to PHI</li>
                </ul>
                <h2>Breach Notification Policy</h2>
                <p>In the event of a breach of unsecured PHI, we will notify affected individuals within 60 days of discovery.</p>
            </div>
        </div>
    );
}

export default PrivacyPolicy;