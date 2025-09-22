'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ScriptExecutionButton from '../../components/script-execution/ScriptExecutionButton';
import { useScriptExecution } from '../../components/script-execution/useScriptExecution';
import { useAuth } from '../../contexts/AuthContext';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import NavBar from '../../components/navigation/NavBar';

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

// UK Opportunity Table Component
function UKOpportunityTable({ opportunities }) {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter opportunities based on relevance and search term
  const filteredOpportunities = opportunities.filter(opp => {
    const matchesFilter = filter === 'all' ||
      (filter === 'relevant' && opp['Pertinence LLM'] === 'Oui') ||
      (filter === 'not-relevant' && opp['Pertinence LLM'] === 'Non');

    const matchesSearch = searchTerm === '' ||
      opp.Title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.Description?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  // XLS Download function
  const downloadXLS = () => {
    const headers = ['Title', 'Description', 'Relevance', 'Opening Date', 'Deadline', 'Matching Keywords', 'URL'];
    const xlsData = filteredOpportunities.map(opp => [
      opp.Title || '',
      opp.Description || '',
      opp['Pertinence LLM'] === 'Oui' ? 'Relevant' : opp['Pertinence LLM'] === 'Non' ? 'Not Relevant' : 'Unknown',
      opp.Start_date || '',
      opp.Deadline || '',
      opp['Matching Word(s)'] || '',
      opp.URL || ''
    ]);

    // Create HTML table for Excel
    const htmlTable = `
      <table>
        <thead>
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${xlsData.map(row => `<tr>${row.map(cell => `<td>${cell.toString().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    `;

    const blob = new Blob([htmlTable], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `uk-funding-opportunities-${new Date().toISOString().split('T')[0]}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!opportunities || opportunities.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">UK Funding Opportunities</h2>
          <p className="text-gray-500">No UK opportunities available</p>
        </div>
      </div>
    );
  }



  const getRelevanceStatus = (opp) => {
    if (opp['Pertinence LLM'] === 'Oui') {
      return { text: 'Relevant', color: 'bg-green-100 text-green-800' };
    } else if (opp['Pertinence LLM'] === 'Non') {
      return { text: 'Not Relevant', color: 'bg-red-100 text-red-800' };
    }
    return { text: 'Unknown', color: 'bg-gray-100 text-gray-800' };
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">UK Funding Opportunities</h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              {filteredOpportunities.length} of {opportunities.length} opportunities
            </span>
            <button
              onClick={downloadXLS}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg className="-ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download XLS
            </button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="mb-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search opportunities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Opportunities</option>
              <option value="relevant">Relevant Only</option>
              <option value="not-relevant">Not Relevant</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Relevance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Opening Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deadline
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Matching Keywords
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOpportunities.map((opportunity, index) => {
                const relevanceStatus = getRelevanceStatus(opportunity);
                return (
                  <tr key={opportunity.URL || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 max-w-xs">
                        {opportunity.Title}
                      </div>
                      <div className="text-sm text-gray-500 max-w-xs truncate">
                        {opportunity.Description}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${relevanceStatus.color}`}>
                        {relevanceStatus.text}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {opportunity.Start_date || 'Not specified'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {opportunity.Deadline || 'Not specified'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs">
                        {opportunity['Matching Word(s)'] ? (
                          <div className="flex flex-wrap gap-1">
                            {opportunity['Matching Word(s)'].split(', ').slice(0, 3).map((keyword, index) => (
                              <span key={index} className="inline-flex px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
                                {keyword}
                              </span>
                            ))}
                            {opportunity['Matching Word(s)'].split(', ').length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{opportunity['Matching Word(s)'].split(', ').length - 3} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">No keywords</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <a
                        href={opportunity.URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-600 hover:text-orange-900"
                      >
                        View Details
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredOpportunities.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No opportunities match your current filters</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UKPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [isRequestInProgress, setIsRequestInProgress] = useState(false);

  // Get auth data from context
  const { getToken, apiRequest, isAuthenticated } = useAuth();
  const token = getToken();

  // Script execution hook
  const {
    scriptStatus,
    executeUKScript,
    stopScript,
    getScriptLogs
  } = useScriptExecution(token);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchData = async () => {
    // Prevent multiple simultaneous requests
    if (isRequestInProgress) {
      console.log('UK data request already in progress, skipping...');
      return;
    }

    try {
      setIsRequestInProgress(true);
      setLoading(true);
      setError(null);

      const response = await apiRequest('http://localhost:5000/analysis/combined', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('UK data fetched:', result);
      setData(result);

    } catch (err) {
      setError(err.message);
      console.error('Error fetching UK data:', err);
    } finally {
      setLoading(false);
      setIsRequestInProgress(false);
    }
  };

  const handleScriptComplete = (scriptType) => {
    if (scriptType === 'uk') {
      showNotification('UK analysis completed! Refreshing data...', 'success');
      fetchData(); // Refresh the data when script completes
    }
  };

  const handleExecuteUK = async () => {
    try {
      const result = await executeUKScript();
      showNotification(`UK analysis started! Process ID: ${result.processId}`, 'success');
    } catch (error) {
      showNotification(`Failed to start UK script: ${error.message}`, 'error');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Extract UK opportunities from the new data structure
  const ukOpportunities = data?.data?.uk?.data || [];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100">
        <NavBar />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Notification */}
        {notification && (
          <div className={`mb-4 p-4 rounded-md ${
            notification.type === 'success' ? 'bg-green-50 border border-green-200' :
            notification.type === 'error' ? 'bg-red-50 border border-red-200' :
            'bg-orange-50 border border-blue-200'
          }`}>
            <p className={`text-sm font-medium ${
              notification.type === 'success' ? 'text-green-800' :
              notification.type === 'error' ? 'text-red-800' :
              'text-orange-800'
            }`}>
              {notification.message}
            </p>
          </div>
        )}

        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">UK Funding Opportunities</h1>
              <p className="text-gray-600">
                Total UK Opportunities: {ukOpportunities.length}
              </p>
            </div>

            {/* Script Execution Button */}
            <div className="flex items-center">
              <ScriptExecutionButton
                scriptType="uk"
                scriptName="innovateuk.py"
                status={scriptStatus.uk}
                onExecute={handleExecuteUK}
                onStop={stopScript}
                onViewLogs={getScriptLogs}
                className="shadow-sm"
              />
            </div>
          </div>
        </div>

        {loading && <LoadingSpinner />}

        {error && (
          <ErrorMessage
            message={error}
            onRetry={fetchData}
          />
        )}

        {!loading && !error && (
          <UKOpportunityTable opportunities={ukOpportunities} />
        )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
