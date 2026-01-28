import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// API Base URL - Change this if backend runs on different port
const API_URL = 'http://localhost:5000/api';

interface IssueRow {
  id: number;
  "Issue tracker"?: string;
  State?: string;
  subject?: string;
  description?: string;
  due_date?: string;
  status_id?: number;
  Status?: string;
  assigned_to_id?: number;
  "email(assigned id)"?: string;
  Priority?: string;
  created_on?: string;
  closed_on?: string;
  [key: string]: any;
}

interface ChartData {
  name: string;
  value: number;
}

interface Stats {
  total: number;
  byStatus: ChartData[];
  byPriority: ChartData[];
  byType: ChartData[];
  byState: ChartData[];
  avgResolutionDays: string;
}

export default function IssueDashboard(): JSX.Element {
  const [data, setData] = useState<IssueRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<{ type: string; value: string } | null>(null);
  const [filteredData, setFilteredData] = useState<IssueRow[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [searchId, setSearchId] = useState<string>('');
  const [searchResult, setSearchResult] = useState<IssueRow | null>(null);
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);

  // Helper functions to get values
  const getIssueTracker = (row: IssueRow) => row["Issue tracker"] || row.Issue_tracker || '-';
  const getState = (row: IssueRow) => row.State || '-';
  const getStatus = (row: IssueRow) => row.Status || '-';
  const getPriority = (row: IssueRow) => (row.Priority || '-').trim();
  const getEmail = (row: IssueRow) => row["email(assigned id)"] || row.email || '-';

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Fetch issues
      const issuesRes = await fetch(`${API_URL}/issues`);
      if (!issuesRes.ok) throw new Error('Failed to fetch issues');
      const issuesData = await issuesRes.json();
      setData(issuesData);

      // Fetch stats
      const statsRes = await fetch(`${API_URL}/stats`);
      if (!statsRes.ok) throw new Error('Failed to fetch stats');
      const statsData = await statsRes.json();
      setStats(statsData);

      setLoading(false);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError('Failed to connect to server. Make sure backend is running on port 5000.');
      setLoading(false);
    }
  };

  // Search by ID
  const handleSearch = async () => {
    if (!searchId.trim()) return;
    
    try {
      const response = await fetch(`${API_URL}/issues/${searchId.trim()}`);
      if (!response.ok) {
        alert(`No issue found with ID: ${searchId}`);
        return;
      }
      const result = await response.json();
      setSearchResult(result);
      setShowSearchModal(true);
    } catch (err) {
      alert(`Error searching for issue: ${searchId}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle chart click
  const handleChartClick = async (type: string, value: string) => {
    setSelectedFilter({ type, value });
    
    try {
      let url = `${API_URL}/filter?`;
      if (type === 'status') url += `status=${encodeURIComponent(value)}`;
      else if (type === 'priority') url += `priority=${encodeURIComponent(value)}`;
      else if (type === 'type') url += `type=${encodeURIComponent(value)}`;
      else if (type === 'state') url += `state=${encodeURIComponent(value)}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to filter');
      const result = await response.json();
      setFilteredData(result);
      setShowModal(true);
    } catch (err) {
      console.error('Filter error:', err);
    }
  };

  // Calculate resolution days
  const getResolutionDays = (row: IssueRow): string => {
    if (!row.closed_on || !row.created_on) return '-';
    
    try {
      const created = new Date(row.created_on);
      const closed = new Date(row.closed_on);
      
      if (isNaN(created.getTime()) || isNaN(closed.getTime())) return '-';
      
      const diffTime = Math.abs(closed.getTime() - created.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays.toString();
    } catch {
      return '-';
    }
  };

  // Chart data from stats
  const statusData: ChartData[] = stats?.byStatus || [];
  const priorityData: ChartData[] = stats?.byPriority || [];
  const typeData: ChartData[] = stats?.byType || [];
  const stateData: ChartData[] = stats?.byState || [];

  // KPI values
  const totalIssues = stats?.total || 0;
  const openCount = statusData.find(s => s.name === 'Open')?.value || 0;
  const closedCount = statusData.find(s => s.name === 'Closed')?.value || 0;
  const urgentCount = priorityData.find(p => p.name === 'Urgent')?.value || 0;
  const avgResolution = stats?.avgResolutionDays || '0';

  // Colors
  const statusColors: Record<string, string> = {
    'Open': '#93c5fd',
    'Closed': '#86efac',
    'Rejected': '#fca5a5',
    'In Progress': '#fcd34d',
  };

  const priorityColors: Record<string, string> = {
    'Urgent': '#fca5a5',
    'High': '#fdba74',
    'Normal': '#93c5fd',
    'Low': '#d1d5db',
  };

  const typeColors: Record<string, string> = {
    'Bug': '#fca5a5',
    'Support': '#93c5fd',
    'Feature': '#86efac',
  };

  const defaultColors = ['#93c5fd', '#86efac', '#fcd34d', '#fca5a5', '#c4b5fd', '#67e8f9'];

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading data from server...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-sm border border-red-200 max-w-md">
          <p className="text-5xl mb-4">❌</p>
          <p className="text-red-500 font-medium mb-2">{error}</p>
          <p className="text-gray-400 text-sm mb-4">
            Run this command in backend folder:
          </p>
          <code className="bg-gray-100 px-3 py-2 rounded block mb-4">node server.js</code>
          <button 
            onClick={fetchData}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            🔄 Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-700">
          Issue Tracker Dashboard
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          ✅ Connected to database • Click on charts to see details
        </p>
      </header>

      {/* Search Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-2">🔍 Search by Issue ID</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter Issue ID..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm transition-colors"
              >
                Search
              </button>
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg font-medium text-sm transition-colors"
            >
              🔄 Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <KPICard label="Total Issues" value={totalIssues} color="blue" icon="📋" />
        <KPICard label="Open" value={openCount} color="yellow" icon="🔓" />
        <KPICard label="Closed" value={closedCount} color="green" icon="✅" />
        <KPICard label="Urgent" value={urgentCount} color="red" icon="🚨" />
        <KPICard label="Avg Resolution" value={avgResolution} color="purple" icon="⏱️" suffix=" days" />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Status Chart */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-600 mb-3">By Status</h3>
          {statusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    onClick={(data) => handleChartClick('status', data.name)}
                    className="cursor-pointer"
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={statusColors[entry.name] || defaultColors[i % defaultColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {statusData.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleChartClick('status', item.name)}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColors[item.name] || defaultColors[i % defaultColors.length] }} />
                    {item.name} ({item.value})
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400">No data</div>
          )}
        </div>

        {/* Priority Chart */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-600 mb-3">By Priority</h3>
          {priorityData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    onClick={(data) => handleChartClick('priority', data.name)}
                    className="cursor-pointer"
                  >
                    {priorityData.map((entry, i) => (
                      <Cell key={i} fill={priorityColors[entry.name] || defaultColors[i % defaultColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {priorityData.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleChartClick('priority', item.name)}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: priorityColors[item.name] || defaultColors[i % defaultColors.length] }} />
                    {item.name} ({item.value})
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400">No data</div>
          )}
        </div>

        {/* Issue Type Chart */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-600 mb-3">By Issue Type</h3>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={typeData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} onClick={(data) => handleChartClick('type', data.name)} className="cursor-pointer">
                  {typeData.map((entry, i) => (
                    <Cell key={i} fill={typeColors[entry.name] || defaultColors[i % defaultColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400">No data</div>
          )}
        </div>

        {/* State Chart */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-600 mb-3">Top 10 States</h3>
          {stateData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stateData}>
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#93c5fd" radius={[4, 4, 0, 0]} onClick={(data) => handleChartClick('state', data.name)} className="cursor-pointer" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400">No data</div>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-600">Recent Issues ({data.length})</h3>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                {['ID', 'Type', 'Subject', 'State', 'Status', 'Priority', 'Assigned', 'Created', 'Closed', 'Resolution'].map(h => (
                  <th key={h} className="px-3 py-2 font-medium text-gray-500 text-xs uppercase border-b border-gray-100 sticky top-0 bg-gray-50 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((row, i) => {
                const resolutionDays = getResolutionDays(row);
                return (
                  <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-3 py-2 text-blue-600 font-medium">{row.id}</td>
                    <td className="px-3 py-2"><Badge type="type" value={getIssueTracker(row)} /></td>
                    <td className="px-3 py-2 max-w-[200px] truncate text-gray-600" title={row.subject}>{row.subject || '-'}</td>
                    <td className="px-3 py-2 text-gray-500">{getState(row)}</td>
                    <td className="px-3 py-2"><Badge type="status" value={getStatus(row)} /></td>
                    <td className="px-3 py-2"><Badge type="priority" value={getPriority(row)} /></td>
                    <td className="px-3 py-2 text-gray-500">{row.assigned_to_id || '-'}</td>
                    <td className="px-3 py-2 text-gray-400 text-xs whitespace-nowrap">
                      {row.created_on ? new Date(row.created_on).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-3 py-2 text-gray-400 text-xs whitespace-nowrap">
                      {row.closed_on ? new Date(row.closed_on).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-3 py-2">
                      {resolutionDays !== '-' ? (
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          parseInt(resolutionDays) <= 1 ? 'bg-green-100 text-green-700' :
                          parseInt(resolutionDays) <= 7 ? 'bg-blue-100 text-blue-700' :
                          parseInt(resolutionDays) <= 30 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {resolutionDays} days
                        </span>
                      ) : <span className="text-gray-400">-</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filter Modal */}
      {showModal && selectedFilter && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-semibold text-gray-700">
                  {selectedFilter.type.charAt(0).toUpperCase() + selectedFilter.type.slice(1)}: {selectedFilter.value}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{filteredData.length} issues found</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">×</button>
            </div>
            <div className="overflow-auto max-h-[60vh]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left sticky top-0">
                    {['ID', 'Type', 'Subject', 'State', 'Status', 'Priority', 'Created', 'Resolution'].map(h => (
                      <th key={h} className="px-4 py-2 font-medium text-gray-500 text-xs uppercase border-b border-gray-100">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredData.map((row, i) => (
                    <tr key={i} className="hover:bg-blue-50/50">
                      <td className="px-4 py-2.5 text-blue-600 font-medium">{row.id}</td>
                      <td className="px-4 py-2.5"><Badge type="type" value={getIssueTracker(row)} /></td>
                      <td className="px-4 py-2.5 max-w-[200px] truncate text-gray-600">{row.subject || '-'}</td>
                      <td className="px-4 py-2.5 text-gray-500">{getState(row)}</td>
                      <td className="px-4 py-2.5"><Badge type="status" value={getStatus(row)} /></td>
                      <td className="px-4 py-2.5"><Badge type="priority" value={getPriority(row)} /></td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{row.created_on ? new Date(row.created_on).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-2.5 text-xs">{getResolutionDays(row) !== '-' ? `${getResolutionDays(row)} days` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
      {showSearchModal && searchResult && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowSearchModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-blue-50">
              <div>
                <h3 className="font-semibold text-gray-700">Issue #{searchResult.id}</h3>
                <p className="text-xs text-gray-400 mt-0.5">Search Result</p>
              </div>
              <button onClick={() => setShowSearchModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">×</button>
            </div>
            <div className="p-5 space-y-3">
              <DetailRow label="ID" value={searchResult.id} />
              <DetailRow label="Issue Tracker" value={getIssueTracker(searchResult)} badge="type" />
              <DetailRow label="Subject" value={searchResult.subject} />
              <DetailRow label="State" value={getState(searchResult)} />
              <DetailRow label="Status" value={getStatus(searchResult)} badge="status" />
              <DetailRow label="Priority" value={getPriority(searchResult)} badge="priority" />
              <DetailRow label="Assigned To" value={searchResult.assigned_to_id} />
              <DetailRow label="Email" value={getEmail(searchResult)} />
              <DetailRow label="Created" value={searchResult.created_on ? new Date(searchResult.created_on).toLocaleString() : '-'} />
              <DetailRow label="Closed" value={searchResult.closed_on ? new Date(searchResult.closed_on).toLocaleString() : '-'} />
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-500 font-medium">Resolution Time</span>
                {getResolutionDays(searchResult) !== '-' ? (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    parseInt(getResolutionDays(searchResult)) <= 1 ? 'bg-green-100 text-green-700' :
                    parseInt(getResolutionDays(searchResult)) <= 7 ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>{getResolutionDays(searchResult)} days</span>
                ) : <span className="text-gray-400">Not closed</span>}
              </div>
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500 font-medium mb-1">Description</p>
                <p className="text-sm text-gray-600">{searchResult.description || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components
function DetailRow({ label, value, badge }: { label: string; value: any; badge?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-gray-500 font-medium">{label}</span>
      {badge ? <Badge type={badge} value={String(value || '-')} /> : <span className="text-sm text-gray-700">{String(value || '-')}</span>}
    </div>
  );
}

function KPICard({ label, value, color, icon, suffix = '' }: { label: string; value: number | string; color: string; icon: string; suffix?: string }) {
  const bgColors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100',
    yellow: 'bg-amber-50 border-amber-100',
    green: 'bg-green-50 border-green-100',
    red: 'bg-red-50 border-red-100',
    purple: 'bg-purple-50 border-purple-100',
  };
  const textColors: Record<string, string> = {
    blue: 'text-blue-600',
    yellow: 'text-amber-600',
    green: 'text-green-600',
    red: 'text-red-600',
    purple: 'text-purple-600',
  };

  return (
    <div className={`rounded-lg p-4 border ${bgColors[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${textColors[color]}`}>
            {typeof value === 'number' ? value.toLocaleString() : value}{suffix}
          </p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

function Badge({ type, value }: { type: string; value: string }) {
  let classes = 'inline-block px-2 py-0.5 rounded text-xs font-medium ';
  
  const statusStyles: Record<string, string> = {
    'Open': 'bg-blue-100 text-blue-700',
    'Closed': 'bg-green-100 text-green-700',
    'Rejected': 'bg-red-100 text-red-700',
    'In Progress': 'bg-amber-100 text-amber-700',
  };
  
  const priorityStyles: Record<string, string> = {
    'Urgent': 'bg-red-100 text-red-600',
    'High': 'bg-orange-100 text-orange-600',
    'Normal': 'bg-blue-100 text-blue-600',
    'Low': 'bg-gray-100 text-gray-600',
  };
  
  const typeStyles: Record<string, string> = {
    'Bug': 'bg-red-100 text-red-600',
    'Support': 'bg-blue-100 text-blue-600',
    'Feature': 'bg-green-100 text-green-600',
  };

  if (type === 'status') classes += statusStyles[value] || 'bg-gray-100 text-gray-600';
  else if (type === 'priority') classes += priorityStyles[value] || 'bg-gray-100 text-gray-600';
  else classes += typeStyles[value] || 'bg-gray-100 text-gray-600';

  return <span className={classes}>{value}</span>;
}