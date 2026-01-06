'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Clock, Calendar, Zap, BarChart3, Shield, Download, Upload, ArrowRight, Check } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const features = [
    {
      icon: Clock,
      title: 'Count-Up Timers',
      description: 'Track time spent per activity with visual indicators (green/yellow/red)',
    },
    {
      icon: Calendar,
      title: 'Event Management',
      description: 'Create and manage multiple events with custom branding and dates',
    },
    {
      icon: Zap,
      title: 'Activity Configuration',
      description: 'Drag-and-drop reordering, inline editing, and natural language time parsing',
    },
    {
      icon: BarChart3,
      title: 'Time Analytics',
      description: 'Automatically calculate time gained or extra time taken per activity',
    },
    {
      icon: Download,
      title: 'Export & Import',
      description: 'Export to JSON/CSV or import existing event data',
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your events are stored securely and only accessible to you',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <h1 className="text-2xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer">
                EventChron
              </h1>
            </Link>
            <div className="flex items-center gap-4">
              {session ? (
                <Link
                  href="/dashboard"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Sign In / Sign Up
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Run events like a pro.
            <br />
            <span className="text-indigo-600">Time every moment.</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Professional event timer for church services, conferences, and meetups.
            Track activities, analyze time usage, and keep your events on schedule.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transition-colors text-lg"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Link>
            <button
              onClick={() => router.push('/demo')}
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-indigo-600 font-semibold py-3 px-8 rounded-lg shadow-lg border-2 border-indigo-600 transition-colors text-lg"
            >
              Try Demo
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything you need</h2>
          <p className="text-xl text-gray-600">
            Powerful features to manage your events professionally
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow"
            >
              <div className="bg-indigo-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How it works</h2>
            <p className="text-xl text-gray-600">
              Get started in minutes
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-indigo-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Create Event</h3>
              <p className="text-gray-600">
                Set up your event with a name, date, and optional logo
              </p>
            </div>
            <div className="text-center">
              <div className="bg-indigo-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Add Activities</h3>
              <p className="text-gray-600">
                Define activities with time allotments and reorder as needed
              </p>
            </div>
            <div className="text-center">
              <div className="bg-indigo-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Run & Track</h3>
              <p className="text-gray-600">
                Start timers, track time spent, and analyze performance
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple Pricing</h2>
          <p className="text-xl text-gray-600">
            Choose the plan that works for you
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8 border-2 border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
            <div className="text-4xl font-bold text-gray-900 mb-4">$0<span className="text-lg text-gray-600">/month</span></div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <span>Unlimited events</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <span>All timer features</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <span>Export & import</span>
              </li>
            </ul>
            <Link
              href="/login"
              className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
          <div className="bg-indigo-600 rounded-lg shadow-lg p-8 border-2 border-indigo-700 text-white">
            <h3 className="text-2xl font-bold mb-2">Pro</h3>
            <div className="text-4xl font-bold mb-4">Coming Soon<span className="text-lg opacity-80">/month</span></div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5" />
                <span>Everything in Free</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5" />
                <span>Team collaboration</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5" />
                <span>Advanced analytics</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5" />
                <span>Priority support</span>
              </li>
            </ul>
            <button
              disabled
              className="block w-full text-center bg-white/20 hover:bg-white/30 text-white font-semibold py-3 px-4 rounded-lg transition-colors cursor-not-allowed opacity-50"
            >
              Coming Soon
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-indigo-600 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to get started?
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Join thousands of event organizers using EventChron
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-indigo-600 font-semibold py-3 px-8 rounded-lg shadow-lg transition-colors text-lg"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Link>
            <button
              onClick={() => router.push('/demo')}
              className="inline-flex items-center justify-center gap-2 bg-indigo-700 hover:bg-indigo-800 text-white font-semibold py-3 px-8 rounded-lg border-2 border-white/20 transition-colors text-lg"
            >
              Try Demo
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
