"use client";
import React from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, BookOpenIcon, CodeBracketIcon, CogIcon, PlayIcon, UserGroupIcon, DocumentTextIcon, CommandLineIcon, FolderIcon } from '@heroicons/react/24/outline';

export default function Documentation() {
  const sections = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: PlayIcon,
      content: [
        {
          title: "What is Mnemos?",
          description: "Mnemos is a comprehensive guide and toolset designed to help complete beginners become proficient Cardano developers using AI assistance. Our approach leverages the latest AI tools to accelerate learning and development."
        },
        {
          title: "Prerequisites",
          description: "No prior programming experience required! We'll start from the very basics and build up your skills progressively."
        }
      ]
    },
    {
      id: "ai-tools",
      title: "AI Tools Overview",
      icon: CogIcon,
      content: [
        {
          title: "Cursor",
          description: "Your AI-powered code editor that understands context and helps you write better code faster. Features include AI autocompletion, chat integration, and codebase understanding.",
          setup: [
            "Download from cursor.sh",
            "Install and open your first project",
            "Configure AI settings",
            "Learn keyboard shortcuts"
          ]
        },
        {
          title: "Windsurf",
          description: "Advanced AI development environment with enhanced collaboration features and deeper AI integration for complex projects.",
          setup: [
            "Sign up for Windsurf account",
            "Install the desktop application",
            "Connect your repositories",
            "Configure team collaboration"
          ]
        },
        {
          title: "ChatGPT",
          description: "Your AI assistant for problem-solving, code review, and learning new concepts. Use it for getting explanations and debugging help.",
          setup: [
            "Create OpenAI account",
            "Subscribe to ChatGPT Plus (recommended)",
            "Learn effective prompting techniques",
            "Integrate with development workflow"
          ]
        }
      ]
    },
    {
      id: "fundamentals",
      title: "Development Fundamentals",
      icon: CommandLineIcon,
      content: [
        {
          title: "Terminal & Commands",
          description: "Master the command line interface that developers use daily.",
          basics: [
            "cd - change directory",
            "ls - list files",
            "mkdir - create directory",
            "npm - package manager",
            "git - version control"
          ]
        },
        {
          title: "File & Folder Management",
          description: "Organize your projects like a professional developer.",
          structure: [
            "src/ - source code",
            "public/ - static assets",
            "node_modules/ - dependencies",
            "package.json - project configuration"
          ]
        },
        {
          title: "Working with AI",
          description: "Learn to communicate effectively with AI tools for maximum productivity.",
          tips: [
            "Be specific in your requests",
            "Provide context about your project",
            "Ask for explanations, not just code",
            "Iterate and refine your prompts"
          ]
        }
      ]
    },
    {
      id: "mnemos-tools",
      title: "Mnemos Toolset",
      icon: CodeBracketIcon,
      content: [
        {
          title: "MCP Integration",
          description: "Model Context Protocol integration that allows AI tools to understand your Cardano project context better.",
          features: [
            "Automatic documentation indexing",
            "Context-aware code suggestions",
            "Project-specific AI responses",
            "Seamless tool integration"
          ]
        },
        {
          title: "Pre-built Prompts",
          description: "Ready-to-use prompts for common Cardano development tasks.",
          examples: [
            "Create a new Cardano wallet connection",
            "Build a simple token transfer function",
            "Set up a basic NFT marketplace",
            "Deploy to Cardano testnet"
          ]
        },
        {
          title: "Project Templates",
          description: "Kickstart your projects with our tested templates.",
          available: [
            "meshjs-your-app-name - Full-stack Cardano app",
            "simple-wallet - Basic wallet interface",
            "nft-gallery - NFT display and trading",
            "defi-basic - Simple DeFi operations"
          ]
        }
      ]
    },
    {
      id: "first-project",
      title: "Your First Project",
      icon: BookOpenIcon,
      content: [
        {
          title: "Project: Simple Cardano Wallet",
          description: "We'll build a basic wallet that can connect to Cardano and check ADA balance.",
          steps: [
            "Set up the development environment",
            "Install necessary dependencies",
            "Create wallet connection logic",
            "Build a simple UI",
            "Test on Cardano testnet",
            "Deploy your application"
          ]
        },
        {
          title: "Learning Objectives",
          description: "By the end of this project, you'll understand:",
          objectives: [
            "How Cardano wallets work",
            "Basic React/TypeScript development",
            "Using AI tools effectively",
            "Testing and deployment processes"
          ]
        }
      ]
    },
    {
      id: "cardano-apis",
      title: "Cardano Developer APIs",
      icon: DocumentTextIcon,
      content: [
        {
          title: "Blockfrost API",
          description: "The most popular Cardano API for blockchain data access.",
          uses: [
            "Query transaction history",
            "Get asset information",
            "Monitor addresses",
            "Access metadata"
          ]
        },
        {
          title: "Taptools API",
          description: "Advanced analytics and DeFi data for Cardano.",
          features: [
            "Token analytics",
            "DeFi metrics",
            "Price data",
            "Portfolio tracking"
          ]
        },
        {
          title: "Charlie 3's API",
          description: "Cutting-edge Cardano data services and tools.",
          capabilities: [
            "Real-time data streams",
            "Advanced querying",
            "Custom endpoints",
            "Enterprise features"
          ]
        },
        {
          title: "DexHunter",
          description: "DEX aggregation and trading data for Cardano.",
          functionality: [
            "Price discovery",
            "Liquidity analysis",
            "Trading opportunities",
            "Market insights"
          ]
        }
      ]
    },
    {
      id: "community",
      title: "Community & Support",
      icon: UserGroupIcon,
      content: [
        {
          title: "Getting Help",
          description: "Multiple ways to get assistance when you're stuck.",
          channels: [
            "AI chat assistant on this website",
            "Mnemos Forum on Mesh Discord",
            "GitHub issues and discussions",
            "Live coding sessions and Q&A"
          ]
        },
        {
          title: "Contributing",
          description: "Join our community and help others learn.",
          ways: [
            "Share your projects",
            "Create tutorials",
            "Answer questions in Discord",
            "Contribute to open source repositories"
          ]
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-gray-800/50 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <Link 
              href="/"
              className="flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span>Back to Home</span>
            </Link>
            <div className="text-gray-400">|</div>
            <h1 className="text-2xl font-bold text-white">Documentation</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-white mb-4">Table of Contents</h2>
              <nav className="space-y-2">
                {sections.map((section) => {
                  const IconComponent = section.icon;
                  return (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="flex items-center space-x-3 text-gray-300 hover:text-purple-400 py-2 px-3 rounded-lg hover:bg-gray-700/50 transition-all"
                    >
                      <IconComponent className="w-4 h-4" />
                      <span className="text-sm">{section.title}</span>
                    </a>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="space-y-16">
              {sections.map((section) => {
                const IconComponent = section.icon;
                return (
                  <section key={section.id} id={section.id} className="scroll-mt-8">
                    <div className="flex items-center space-x-4 mb-8">
                      <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-3 rounded-lg">
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <h2 className="text-3xl font-bold text-white">{section.title}</h2>
                    </div>

                    <div className="space-y-8">
                      {section.content.map((item, index) => (
                        <div key={index} className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700">
                          <h3 className="text-xl font-semibold text-white mb-4">{item.title}</h3>
                          <p className="text-gray-300 mb-6 leading-relaxed">{item.description}</p>
                          
                          {/* Render different content types */}
                          {item.setup && (
                            <div>
                              <h4 className="text-lg font-medium text-purple-400 mb-3">Setup Steps:</h4>
                              <ol className="space-y-2">
                                {item.setup.map((step, stepIndex) => (
                                  <li key={stepIndex} className="flex items-start text-gray-300">
                                    <span className="bg-purple-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                                      {stepIndex + 1}
                                    </span>
                                    {step}
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}

                          {item.basics && (
                            <div>
                              <h4 className="text-lg font-medium text-purple-400 mb-3">Essential Commands:</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {item.basics.map((basic, basicIndex) => (
                                  <div key={basicIndex} className="bg-gray-900/50 rounded-lg p-3 border border-gray-600">
                                    <code className="text-green-400 text-sm">{basic}</code>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {item.features && (
                            <div>
                              <h4 className="text-lg font-medium text-purple-400 mb-3">Key Features:</h4>
                              <ul className="space-y-2">
                                {item.features.map((feature, featureIndex) => (
                                  <li key={featureIndex} className="flex items-center text-gray-300">
                                    <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                                    {feature}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {item.steps && (
                            <div>
                              <h4 className="text-lg font-medium text-purple-400 mb-3">Project Steps:</h4>
                              <ol className="space-y-3">
                                {item.steps.map((step, stepIndex) => (
                                  <li key={stepIndex} className="flex items-start text-gray-300">
                                    <span className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm rounded-full w-8 h-8 flex items-center justify-center mr-4 mt-0.5 flex-shrink-0 font-semibold">
                                      {stepIndex + 1}
                                    </span>
                                    <span className="pt-1">{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}

                          {(item.examples || item.available || item.uses || item.channels || item.ways || item.objectives || item.tips || item.structure || item.capabilities || item.functionality) && (
                            <div>
                              <h4 className="text-lg font-medium text-purple-400 mb-3">
                                {item.examples && "Examples:"}
                                {item.available && "Available Templates:"}
                                {item.uses && "Common Uses:"}
                                {item.channels && "Support Channels:"}
                                {item.ways && "Ways to Contribute:"}
                                {item.objectives && "Learning Objectives:"}
                                {item.tips && "Pro Tips:"}
                                {item.structure && "Project Structure:"}
                                {item.capabilities && "Capabilities:"}
                                {item.functionality && "Functionality:"}
                              </h4>
                              <ul className="space-y-2">
                                {(item.examples || item.available || item.uses || item.channels || item.ways || item.objectives || item.tips || item.structure || item.capabilities || item.functionality || []).map((listItem, listIndex) => (
                                  <li key={listIndex} className="flex items-start text-gray-300">
                                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-3 mt-2"></div>
                                    {listItem}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            {/* Next Steps CTA */}
            <div className="mt-16 bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-3xl p-12 text-center">
              <h2 className="text-3xl font-bold text-white mb-4">Ready to Start Building?</h2>
              <p className="text-xl text-gray-300 mb-8">
                You now have all the knowledge needed to begin your Cardano development journey!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 transform hover:scale-105">
                  Start Your First Project
                </button>
                <button className="border-2 border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300">
                  Join the Community
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}