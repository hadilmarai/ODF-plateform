'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import NavBar from '../components/navigation/NavBar';
import { debounce, requestDeduplicator } from '../utils/debounce';

// Loading Component
function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center py-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}

// Error Component
function ErrorMessage({ message, onRetry }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-md p-4 m-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{message}</p>
          </div>
          <div className="mt-4">
            <button
              onClick={onRetry}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Navigation Cards Component
function NavigationCards({ data }) {
  // Calculate statistics from the new data structure
  let ukCount = 0;
  let euCount = 0;
  let ukRelevant = 0;
  let euRelevant = 0;

  if (data?.data) {
    // UK statistics
    if (data.data.uk?.data) {
      ukCount = data.data.uk.data.length;
      ukRelevant = data.data.uk.data.filter(opp =>
        opp['Pertinence LLM'] === 'Oui'
      ).length;
    }

    // EU statistics
    if (data.data.eu?.data) {
      euCount = data.data.eu.data.length;
      euRelevant = data.data.eu.data.filter(opp =>
        opp['Pertinence LLM'] === 'Oui'
      ).length;
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Funding Opportunities Dashboard</h1>
        <p className="text-lg text-gray-600">
          Choose a region to explore funding opportunities
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* UK Card */}
        <Link href="/uk">
          <div className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer border-2 border-transparent hover:border-blue-500">
            <div className="p-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h2 className="text-2xl font-bold text-gray-900">UK Opportunities</h2>
                    <p className="text-gray-600">United Kingdom funding programs</p>
                  </div>
                </div>
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{ukCount}</div>
                  <div className="text-sm text-gray-600">Total Opportunities</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{ukRelevant}</div>
                  <div className="text-sm text-gray-600">Relevant</div>
                </div>
              </div>

              <div className="mt-6 flex items-center text-orange-600">
                <span className="text-sm font-medium">View UK opportunities</span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
            </div>
          </div>
        </Link>

        {/* EU Card */}
        <Link href="/eu">
          <div className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer border-2 border-transparent hover:border-blue-500">
            <div className="p-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h2 className="text-2xl font-bold text-gray-900">EU Opportunities</h2>
                    <p className="text-gray-600">European Union funding programs</p>
                  </div>
                </div>
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{euCount}</div>
                  <div className="text-sm text-gray-600">Total Opportunities</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{euRelevant}</div>
                  <div className="text-sm text-gray-600">Relevant</div>
                </div>
              </div>

              <div className="mt-6 flex items-center text-orange-600">
                <span className="text-sm font-medium">View EU opportunities</span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="mt-12 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{ukCount + euCount}</div>
            <div className="text-sm text-gray-600">Total Opportunities</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{ukRelevant + euRelevant}</div>
            <div className="text-sm text-gray-600">Relevant</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{ukCount}</div>
            <div className="text-sm text-gray-600">UK Programs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{euCount}</div>
            <div className="text-sm text-gray-600">EU Programs</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { apiRequest, isAuthenticated } = useAuth();

  const fetchData = useCallback(async () => {
    const requestKey = 'combined-analysis';

    try {
      const result = await requestDeduplicator.dedupe(requestKey, async () => {
        setLoading(true);
        setError(null);

        const response = await apiRequest('http://localhost:5000/analysis/combined', {
          method: 'GET',
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
      });

      console.log('Data fetched:', result);
      setData(result);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  // Debounced version of fetchData to prevent rapid calls
  const debouncedFetchData = useCallback(
    debounce(fetchData, 1000), // Wait 1 second between calls
    [fetchData]
  );

  useEffect(() => {
    // Only fetch data when authenticated
    if (isAuthenticated) {
      debouncedFetchData();
    }
  }, [isAuthenticated, debouncedFetchData]); // Depend on authentication and debounced function

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100">
        <NavBar />

        <main>
          {loading && <LoadingSpinner />}

          {error && (
            <ErrorMessage
              message={error}
              onRetry={fetchData}
            />
          )}

          {!loading && !error && data && (
            <NavigationCards data={data} />
          )}

          {!loading && !error && !data && (
            <div className="text-center py-8">
              <p className="text-gray-500">No data available</p>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
