import React from "react";
import FadeInText from "./FadeInText";
import FeatureCard from "./FeatureCard";
import { TrendingUp, Users, Briefcase, MessageSquare, Newspaper, Award, Globe, Mail, Trophy, Link2, Users2 } from 'lucide-react';

// Mock data for services
const services = [
  {
    icon: <TrendingUp className="w-8 h-8 text-indigo-600" />, title: 'Top Trending', desc: 'See what’s hot and most active now.'
  },
  {
    icon: <Users2 className="w-8 h-8 text-blue-600" />, title: 'Collaborations', desc: 'Active projects and open collabs.'
  },
  {
    icon: <Users className="w-8 h-8 text-green-600" />, title: 'Students Enrolled', desc: '1,234 learners and counting.'
  },
  {
    icon: <Briefcase className="w-8 h-8 text-emerald-600" />, title: 'Company Profile', desc: 'About Kimtronix Global.'
  },
  {
    icon: <MessageSquare className="w-8 h-8 text-purple-600" />, title: 'Latest Comments & Achievements', desc: 'Recent feedback and milestones.'
  },
  {
    icon: <Newspaper className="w-8 h-8 text-pink-600" />, title: 'News', desc: 'Latest updates and announcements.'
  },
  {
    icon: <Link2 className="w-8 h-8 text-red-600" />, title: 'Social Media', desc: 'Connect: YT, FB, LinkedIn, Discord', links: [
      { name: 'YouTube', url: '#', color: 'text-red-600', icon: <Globe className="w-5 h-5 text-red-600" /> },
      { name: 'Facebook', url: '#', color: 'text-blue-700', icon: <Globe className="w-5 h-5 text-blue-700" /> },
      { name: 'LinkedIn', url: '#', color: 'text-blue-500', icon: <Globe className="w-5 h-5 text-blue-500" /> },
      { name: 'Discord', url: '#', color: 'text-indigo-500', icon: <Globe className="w-5 h-5 text-indigo-500" /> },
    ] }
  ,
  {
    icon: <Mail className="w-8 h-8 text-cyan-600" />, title: 'Contact Us', desc: 'Reach out for support or partnership.'
  },
  {
    icon: <Trophy className="w-8 h-8 text-yellow-500" />, title: 'Contests', desc: 'Join ongoing and upcoming challenges.'
  },
];

const ServiceSection: React.FC = () => {
  return (
    <section className="w-full py-12 px-2 md:px-0 relative overflow-visible">
      {/* Thin animated slider bar behind the cards */}
      <div className="absolute left-0 top-1/2 w-full z-0 pointer-events-none" style={{transform: 'translateY(-50%)'}}>
        <div className="w-full h-3 bg-gradient-to-r from-blue-500 via-indigo-400 to-purple-500 opacity-70 blur-[2px] animate-slider-move rounded-full shadow-lg" />
      </div>
      <div className="max-w-6xl mx-auto relative z-10">
        <h2 className="text-3xl font-extrabold text-center mb-8 header-3d">Services</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {services.map((service, i) => (
            <FeatureCard key={service.title} service={service} isTopTrending={i === 0} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServiceSection;
