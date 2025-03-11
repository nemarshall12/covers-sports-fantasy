import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { AuthContext } from './AuthContext';

const TopBanner = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="bg-[#171717] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0">
              <img
                className="h-12 w-12"
                src="https://play-lh.googleusercontent.com/p3pBxiJ5FUAdUINQEuDrW6FyVBOtKe0Wv8PmLxAMXvd0yh6Us466mpefl6NYsWWfwf8"
                alt="Underdog Fantasy"
              />
            </Link>
            <div className="ml-4">
              <h1 className="text-2xl font-bold tracking-tight">
                Underdog Covers
              </h1>
              <p className="text-gray-400 text-sm">
                Pick winners. Win big.
              </p>
            </div>
            <div className="hidden md:block ml-10">
              <div className="flex items-baseline space-x-4">
                <Link
                  to="/"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === '/'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/my-picks"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === '/my-picks'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  My Picks
                </Link>
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <button
                onClick={handleSignOut}
                className="relative inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-black bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile navigation */}
      <div className="md:hidden border-t border-gray-700">
        <div className="px-2 py-3 space-y-1">
          <Link
            to="/"
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              location.pathname === '/'
                ? 'bg-gray-900 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            Dashboard
          </Link>
          <Link
            to="/my-picks"
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              location.pathname === '/my-picks'
                ? 'bg-gray-900 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            My Picks
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TopBanner;
