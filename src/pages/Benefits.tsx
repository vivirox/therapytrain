import { type FC } from 'react';
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";
import {
    MdTrendingUp,
    MdTimer,
    MdAttachMoney,
    MdWorkspaces,
    MdPsychology,
    MdSchool,
    MdStars,
    MdCheck
} from "react-icons/md";

const BenefitCard: FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    points: Array<string>;
    color: string;
}> = ({ icon, title, description, points, color }) => (
    <div className="relative group">
        <div className={`absolute inset-0 ${color} opacity-5 rounded-2xl blur-xl transition-all duration-300 group-hover:opacity-10`} />
        <div className="relative bg-[#1A1A1D] p-8 rounded-2xl border border-gray-800 hover:border-gray-700 transition-colors">
            <div className={`${color} opacity-10 w-16 h-16 rounded-xl flex items-center justify-center mb-6`}>
                {icon}
            </div>
            <h3 className="text-2xl font-bold mb-4">{title}</h3>
            <p className="text-gray-400 mb-6">{description}</p>
            <ul className="space-y-3">
                {points.map((point, index) => (
                    <li key={index} className="flex items-start gap-3">
                        <MdCheck className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                        <span className="text-gray-400">{point}</span>
                    </li>
                ))}
            </ul>
        </div>
    </div>
);

const Benefits: FC = () => {
    const navigate = useNavigate();

    const benefits = [
        {
            icon: <MdTrendingUp className="w-8 h-8 text-white" />,
            title: "Comprehensive Skill Development",
            description: "Master therapeutic techniques through our structured progression system.",
            points: [
                "Practice with branching scenario pathways that adapt to your responses",
                "Receive real-time feedback on therapeutic approaches",
                "Track your progress with advanced analytics and insights"
            ],
            color: "bg-blue-500"
        },
        {
            icon: <MdTimer className="w-8 h-8 text-white" />,
            title: "Enhanced Learning Experience",
            description: "Accelerate your professional development with AI-powered training.",
            points: [
                "Engage in realistic client interactions through multiple modalities",
                "Access an extensive library of diverse case studies",
                "Receive immediate feedback on intervention strategies"
            ],
            color: "bg-purple-500"
        },
        {
            icon: <MdAttachMoney className="w-8 h-8 text-white" />,
            title: "Future-Ready Platform",
            description: "Stay ahead with cutting-edge technology and security.",
            points: [
                "Train on a platform built with modern technology stack",
                "Benefit from continuous platform enhancements",
                "Access quantum-resistant encryption capabilities"
            ],
            color: "bg-green-500"
        }
    ];

    const additionalBenefits = [
        {
            icon: <MdWorkspaces className="w-6 h-6 text-white" />,
            title: "Multi-Modal Training",
            description: "Practice through video, text, and interactive simulations"
        },
        {
            icon: <MdPsychology className="w-6 h-6 text-white" />,
            title: "Real-time Analytics",
            description: "Get instant feedback on therapeutic techniques"
        },
        {
            icon: <MdSchool className="w-6 h-6 text-white" />,
            title: "Professional Development",
            description: "Earn CE credits while enhancing your skills"
        },
        {
            icon: <MdStars className="w-6 h-6 text-white" />,
            title: "HIPAA Compliance",
            description: "Train with confidence on a secure platform"
        }
    ];

    return (
        <div className="max-w-4xl mx-auto px-4 py-16">
            {/* Hero Section */}
            <div className="relative h-[400px] mb-48 grid grid-cols-2 gap-8">
                {/* Left Image - Bottom 2/3 */}
                <div className="relative h-[267px] mt-[133px]">
                    <div className="absolute inset-0 rounded-3xl overflow-hidden">
                        <img
                            src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop"
                            alt="AI-powered therapy training"
                            className="absolute inset-0 w-full h-full object-cover opacity-70"
                        />
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0B]/60 to-[#0A0A0B]/60" />
                    </div>
                </div>

                {/* Right Content - Top 2/3 */}
                <div className="relative z-20 flex flex-col justify-start h-[267px] pt-12">
                    <div className="backdrop-blur-md bg-[#0A0A0B]/40 p-8 rounded-2xl border border-white/10">
                        <h1 className="text-5xl font-bold mb-6">
                            A Few Fantastic 
                            <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">Benefits</span>
                        </h1>
                        <p className="text-xl text-gray-300 max-w-2xl">
                            Experience the future of therapeutic training and elevate your professional skills to new heights.
                        </p>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute left-0 bottom-0 w-64 h-64 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-full blur-3xl" />
                <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-br from-purple-500/30 to-blue-500/30 rounded-full blur-3xl" />
            </div>

            {/* Main Benefits */}
            <div className="grid grid-cols-2 gap-6 mb-24">
                {benefits.map((benefit, index) => (
                    <div key={index} className={index === 2 ? "col-span-2" : ""}>
                        <BenefitCard {...benefit} />
                    </div>
                ))}
            </div>

            {/* Additional Benefits Grid */}
            <div className="mb-24">
                <h2 className="text-3xl font-bold text-center mb-12">More Benefits</h2>
                <div className="grid grid-cols-3 gap-6">
                    {additionalBenefits.map((benefit, index) => (
                        <div key={index} className="bg-[#1A1A1D] p-6 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="text-white">{benefit.icon}</div>
                                <h3 className="text-xl font-semibold">{benefit.title}</h3>
                            </div>
                            <p className="text-gray-400">{benefit.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* CTA Section */}
            <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-10 rounded-2xl blur-2xl" />
                <div className="relative bg-[#1A1A1D] border border-gray-800 p-12 rounded-2xl text-center">
                    <h2 className="text-3xl font-bold mb-4">Ready to Experience the Benefits?</h2>
                    <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                        Join thousands of therapists who are already enhancing their practice with TherapyTrain AI.
                    </p>
                    <Button
                        onClick={() => navigate("/auth")}
                        className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 px-8 py-6 text-lg"
                    >
                        Start Your Journey Today
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default Benefits;
