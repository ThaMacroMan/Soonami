"use client";
import React from 'react';
import Link from 'next/link';
import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, PlayIcon, BookOpenIcon, CogIcon, CodeBracketIcon, UserGroupIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

export default function Home() {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev: Record<string, boolean>) => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const phase1Objectives = [
    {
      id: "ai-tools",
      title: "AI Tools Available",
      icon: CogIcon,
      description: "Learn about the AI tools that will power your development",
      items: [
        "Cursor - Your AI-powered code editor",
        "Windsurf - Advanced AI development environment", 
        "ChatGPT - Your AI assistant for problem solving",
        "Tool comparison and recommendations"
      ]
    },
    {
      id: "ai-usage",
      title: "How to Use AI Tools",
      icon: PlayIcon,
      description: "Master the fundamentals of AI-assisted development",
      items: [
        "Terminal/Commands - Navigate like a pro",
        "Folders & File Management - Organize your projects",
        "Agent/Prompts - Communicate effectively with AI",
        "Dependencies/Installs - Manage project requirements"
      ]
    },
    {
      id: "tool-setup",
      title: "Tool Setup",
      icon: CogIcon,
      description: "Get your development environment ready",
      items: [
        "Settings configuration for optimal performance",
        "Free vs Paid plans - Choose what's right for you",
        "Installation guides and troubleshooting",
        "Best practices for setup"
      ]
    },
    {
      id: "mnemos-tools",
      title: "Mnemos Tools",
      icon: CodeBracketIcon,
      description: "Specialized tools built for Cardano development",
      items: [
        "MCP (Model Context Protocol) integration",
        "Pre-built Prompts for common tasks",
        "Pre-Built Rules for better AI responses",
        "Templates for quick project starts",
        "npx meshjs-your-app-name - Instant Cardano apps"
      ]
    },
    {
      id: "mnemos-setup",
      title: "Mnemos Tools Setup",
      icon: CogIcon,
      description: "Configure Mnemos tools for maximum efficiency",
      items: [
        "MCP installation and configuration",
        "Docs Indexing for better AI context",
        "Integration with your chosen AI tool",
        "Troubleshooting common setup issues"
      ]
    },
    {
      id: "first-project",
      title: "Creating Your First Project",
      icon: BookOpenIcon,
      description: "Build something real and deployable",
      items: [
        "Simple, small, approachable projects",
        "Step-by-step guided tutorials",
        "Code walkthroughs with explanations",
        "Deployment to testnet and mainnet"
      ]
    },
    {
      id: "practice",
      title: "Practice & Mastery",
      icon: UserGroupIcon,
      description: "Goal-oriented practice with real outcomes",
      items: [
        "Progressive difficulty challenges",
        "Real-world project templates",
        "Community challenges and competitions",
        "Completion incentives and recognition"
      ]
    },
    {
      id: "advanced",
      title: "Design Theory & Advanced Tips",
      icon: DocumentTextIcon,
      description: "Level up your development skills",
      items: [
        "UI/UX best practices for dApps",
        "Advanced AI prompting techniques",
        "Performance optimization strategies",
        "Security considerations for Cardano apps"
      ]
    }
  ];

  const resources = [
    {
      title: "GitHub Integration",
      description: "Version control and collaboration",
      link: "#github",
      color: "from-gray-500 to-gray-700"
    },
    {
      title: "Cardano Developer Tools",
      description: "Blockfrost API, Taptools API, Charlie 3's API, DexHunter",
      link: "#dev-tools",
      color: "from-blue-500 to-blue-700"
    },
    {
      title: "Video Tutorials",
      description: "How-To videos and live coding sessions",
      link: "#videos",
      color: "from-red-500 to-red-700"
    },
    {
      title: "Community Support",
      description: "Get help via AI chat and Discord",
      link: "#community",
      color: "from-green-500 to-green-700"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-800/20 to-blue-800/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
          <div className="text-center">
            <h1 className="text-6xl md:text-8xl font-extrabold text-white mb-6 tracking-tight">
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Mnemos
              </span>
            </h1>
            <p className="text-2xl md:text-3xl text-gray-300 mb-4 font-light">
              A Cardano Beginners Guide
            </p>
            <p className="text-xl text-gray-400 max-w-4xl mx-auto mb-12 leading-relaxed">
              Creating beginner friendly tools and guides for the latest AI Tools to mint the next generation of Cardano Developers
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg">
                Start Your Journey
              </button>
              <Link href="/docs">
                <button className="border-2 border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300">
                  View Documentation
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Phase 1 Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-white mb-6">
            Phase 1: <span className="text-purple-400">0 to 1, but with AI</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Let's take anybody off the street and convert them into a full-fledged Cardano developer using the power of AI
          </p>
        </div>

        {/* Objectives Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {phase1Objectives.map((objective) => {
            const IconComponent = objective.icon;
            const isExpanded = expandedSections[objective.id];
            
            return (
              <div
                key={objective.id}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 transition-all duration-300 hover:border-purple-500/50"
              >
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleSection(objective.id)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-3 rounded-lg">
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">{objective.title}</h3>
                      <p className="text-gray-400 text-sm">{objective.description}</p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDownIcon className="w-5 h-5 text-purple-400" />
                  ) : (
                    <ChevronRightIcon className="w-5 h-5 text-purple-400" />
                  )}
                </div>
                
                {isExpanded && (
                  <div className="mt-6 pl-16">
                    <ul className="space-y-2">
                      {objective.items.map((item, index) => (
                        <li key={index} className="flex items-center text-gray-300">
                          <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Resources Section */}
      <div className="bg-gray-800/30 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Essential Resources
            </h2>
            <p className="text-xl text-gray-300">
              Everything you need to become a successful Cardano developer
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {resources.map((resource, index) => (
              <Link
                key={index}
                href={resource.link}
                className="group relative overflow-hidden rounded-2xl bg-gray-800/50 border border-gray-700 p-6 transition-all duration-300 hover:border-purple-500/50 hover:transform hover:scale-105"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${resource.color} opacity-10 group-hover:opacity-20 transition-opacity duration-300`}></div>
                <div className="relative">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {resource.title}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {resource.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Outcomes Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-3xl p-12">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Expected Outcomes
            </h2>
            <p className="text-xl text-gray-300">
              What you'll achieve by completing the Mnemos program
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-400 mb-2">Complete Website</h3>
                <p className="text-gray-300 text-sm">Fully functional Mnemos website with all resources</p>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-400 mb-2">Simplified Docs</h3>
                <p className="text-gray-300 text-sm">AI-optimized documentation for non-tech builders</p>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-purple-400 mb-2">Video Content</h3>
                <p className="text-gray-300 text-sm">Complete how-to videos and live coding sessions</p>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-yellow-400 mb-2">Community Forum</h3>
                <p className="text-gray-300 text-sm">Active forum on Mesh Discord for support</p>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-red-400 mb-2">Open Source</h3>
                <p className="text-gray-300 text-sm">All repositories available with open source license</p>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-indigo-500/20 border border-indigo-500/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-indigo-400 mb-2">YouTube Channel</h3>
                <p className="text-gray-300 text-sm">Published content on Mesh YouTube channel</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Begin Your Cardano Development Journey?
          </h2>
          <p className="text-xl text-purple-100 mb-8">
            Join thousands of developers who are building the future of Web3 with AI assistance
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 transform hover:scale-105">
              Get Started Now
            </button>
            <button className="border-2 border-white text-white hover:bg-white hover:text-purple-600 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300">
              Join Discord Community
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Mnemos</h3>
              <p className="text-sm">
                Empowering the next generation of Cardano developers with AI-assisted tools and comprehensive guides.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-purple-400">Documentation</Link></li>
                <li><Link href="#" className="hover:text-purple-400">Video Tutorials</Link></li>
                <li><Link href="#" className="hover:text-purple-400">Templates</Link></li>
                <li><Link href="#" className="hover:text-purple-400">API References</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Community</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-purple-400">Discord</Link></li>
                <li><Link href="#" className="hover:text-purple-400">GitHub</Link></li>
                <li><Link href="#" className="hover:text-purple-400">YouTube</Link></li>
                <li><Link href="#" className="hover:text-purple-400">Forum</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-purple-400">Help Center</Link></li>
                <li><Link href="#" className="hover:text-purple-400">Contact Us</Link></li>
                <li><Link href="#" className="hover:text-purple-400">Bug Reports</Link></li>
                <li><Link href="#" className="hover:text-purple-400">Feature Requests</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; 2024 Mnemos. All rights reserved. Building the future of Cardano development with AI.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
