import React, { useState, useCallback, ChangeEvent } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface IssueRow {
  [key: string]: any;
}

interface ChartData {
  name: string;
  value: number;
}

export default function IssueDashboard(): JSX.Element {
  const [data, setData] = useState<IssueRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<{ type: string; value: string } | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [searchId, setSearchId] = useState<string>('');
  const [searchResult, setSearchResult] = useState<IssueRow | null>(null);
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);

  const handleFileUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setFileName(file.name);

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setData(results.data as IssueRow[]);
          setLoading(false);
        },
        error: () => {
          setLoading(false);
          alert('Error parsing CSV file');
        }
      });
    } else if (fileExtension && ['xlsx', 'xls'].includes(fileExtension)) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const workbook = XLSX.read(event.target?.result, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<IssueRow>(worksheet, { defval: '' });
          setData(jsonData);
          setLoading(false);
        } catch (error) {
          setLoading(false);
          alert('Error parsing Excel file');
        }
      };
      reader.onerror = () => {
        setLoading(false);
        alert('Error reading file');
      };
      reader.readAsBinaryString(file);
    } else {
      setLoading(false);
      alert('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
    }
  }, []);

  // Helper to find column value by checking multiple variations (handles spaces)
  const getColumnValue = (row: IssueRow, possibleNames: string[]): string => {
    for (const name of possibleNames) {
      if (row[name] !== undefined && row[name] !== '') {
        return String(row[name]).trim();
      }
    }
    for (const key of Object.keys(row)) {
      const trimmedKey = key.trim().toLowerCase();
      for (const name of possibleNames) {
        if (trimmedKey === name.toLowerCase()) {
          return String(row[key]).trim();
        }
      }
    }
    return 'Unknown';
  };

  // Parse date from various formats
  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr || dateStr === 'Unknown' || dateStr === '-') return null;
    
    const match1 = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/);
    if (match1) {
      const [, month, day, year] = match1;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    const match2 = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
    if (match2) {
      const [, day, month, year] = match2;
      const fullYear = parseInt(year) > 50 ? 1900 + parseInt(year) : 2000 + parseInt(year);
      return new Date(fullYear, parseInt(month) - 1, parseInt(day));
    }

    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    return null;
  };

  // Calculate resolution time in days
  const getResolutionDays = (row: IssueRow): string => {
    const createdStr = getCreatedOn(row);
    const closedStr = getClosedOn(row);
    
    if (closedStr === '-' || closedStr === 'Unknown') return '-';
    
    const createdDate = parseDate(createdStr);
    const closedDate = parseDate(closedStr);
    
    if (!createdDate || !closedDate) return '-';
    
    const diffTime = Math.abs(closedDate.getTime() - createdDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays.toString();
  };

  // Get value helpers
  const getStatus = (row: IssueRow) => getColumnValue(row, ['Status', 'status', 'Status ']);
  const getPriority = (row: IssueRow) => getColumnValue(row, ['Priority', 'priority', 'Priority ']);
  const getType = (row: IssueRow) => getColumnValue(row, ['Issue tracker', 'Issue tracker ', 'Issue Tracker', 'Issue Tracker ', 'issue tracker', 'Tracker', 'Type', 'type']);
  const getState = (row: IssueRow) => getColumnValue(row, ['State', 'state', 'State ', 'States', 'states']);
  const getSubject = (row: IssueRow) => {
    const val = getColumnValue(row, ['subject', 'Subject', 'subject ', 'Subject ']);
    return val === 'Unknown' ? '-' : val;
  };
  const getId = (row: IssueRow) => {
    const val = getColumnValue(row, ['id', 'ID', 'Id', 'id ']);
    return val === 'Unknown' ? '-' : val;
  };
  const getAssignedTo = (row: IssueRow) => {
    const val = getColumnValue(row, ['assigned_to_id', 'Assigned To', 'assigned_to_id ']);
    return val === 'Unknown' ? '-' : val;
  };
  const getEmail = (row: IssueRow) => {
    const val = getColumnValue(row, ['email(assigned id)', 'Email', 'email(assigned id) ']);
    return val === 'Unknown' ? '-' : val;
  };
  const getCreatedOn = (row: IssueRow) => {
    const val = getColumnValue(row, ['created_on', 'Created', 'created_on ', 'Created On']);
    return val === 'Unknown' ? '-' : val;
  };
  const getClosedOn = (row: IssueRow) => {
    const val = getColumnValue(row, ['closed_on', 'Closed On', 'closed_on ', 'Closed_On', 'closedOn']);
    return val === 'Unknown' ? '-' : val;
  };
  const getDueDate = (row: IssueRow) => {
    const val = getColumnValue(row, ['due_date', 'Due Date', 'due_date ']);
    return val === 'Unknown' ? '-' : val;
  };
  const getDescription = (row: IssueRow) => {
    const val = getColumnValue(row, ['description', 'Description', 'description ']);
    return val === 'Unknown' ? '-' : val;
  };

  // Search by ID
  const handleSearch = () => {
    if (!searchId.trim()) return;
    
    const found = data.find(row => {
      const rowId = getId(row).toString();
      return rowId === searchId.trim();
    });
    
    if (found) {
      setSearchResult(found);
      setShowSearchModal(true);
    } else {
      alert(`No issue found with ID: ${searchId}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Calculate metrics
  const totalIssues = data.length;
  
  const statusCounts = data.reduce<Record<string, number>>((acc, row) => {
    const status = getStatus(row);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const priorityCounts = data.reduce<Record<string, number>>((acc, row) => {
    const priority = getPriority(row);
    acc[priority] = (acc[priority] || 0) + 1;
    return acc;
  }, {});

  const typeCounts = data.reduce<Record<string, number>>((acc, row) => {
    const type = getType(row);
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const stateCounts = data.reduce<Record<string, number>>((acc, row) => {
    const state = getState(row);
    acc[state] = (acc[state] || 0) + 1;
    return acc;
  }, {});

  // Calculate average resolution time
  const resolutionTimes = data
    .map(row => {
      const days = getResolutionDays(row);
      return days !== '-' ? parseInt(days) : null;
    })
    .filter((d): d is number => d !== null);
  
  const avgResolutionTime = resolutionTimes.length > 0 
    ? (resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length).toFixed(1)
    : '0';

  const statusData: ChartData[] = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  const priorityData: ChartData[] = Object.entries(priorityCounts).map(([name, value]) => ({ name, value }));
  const typeData: ChartData[] = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));
  const stateData: ChartData[] = Object.entries(stateCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const openCount = statusCounts['Open'] || 0;
  const closedCount = statusCounts['Closed'] || 0;
  const urgentCount = priorityCounts['Urgent'] || priorityCounts['Urgent '] || 0;

  // Filter data based on selection
  const filteredData = selectedFilter
    ? data.filter(row => {
        if (selectedFilter.type === 'status') return getStatus(row) === selectedFilter.value;
        if (selectedFilter.type === 'priority') return getPriority(row) === selectedFilter.value;
        if (selectedFilter.type === 'type') return getType(row) === selectedFilter.value;
        if (selectedFilter.type === 'state') return getState(row) === selectedFilter.value;
        return true;
      })
    : [];

  // Handle chart click
  const handleChartClick = (type: string, name: string) => {
    setSelectedFilter({ type, value: name });
    setShowModal(true);
  };

  // Light colors for charts
  const statusColors: Record<string, string> = {
    'Open': '#93c5fd',
    'Closed': '#86efac',
    'Rejected': '#fca5a5',
    'In Progress': '#fcd34d',
    'Resolved': '#6ee7b7',
    'Pending': '#c4b5fd',
  };

  const priorityColors: Record<string, string> = {
    'Urgent': '#fca5a5',
    'Urgent ': '#fca5a5',
    'High': '#fdba74',
    'Normal': '#93c5fd',
    'Low': '#d1d5db',
  };

  const typeColors: Record<string, string> = {
    'Bug': '#fca5a5',
    'Support': '#93c5fd',
    'Feature': '#86efac',
  };

  const defaultColors = ['#93c5fd', '#86efac', '#fcd34d', '#fca5a5', '#c4b5fd', '#67e8f9', '#f9a8d4', '#5eead4'];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-700">
          Issue Tracker Dashboard
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Upload your file to view analytics • Click on charts to see details
        </p>
      </header>

      {/* File Upload & Search Row */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* File Upload */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center shadow-sm flex-1">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="inline-block px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg cursor-pointer font-medium text-sm transition-all shadow-sm hover:shadow"
          >
            {loading ? 'Loading...' : '📁 Upload CSV or Excel File'}
          </label>
          <p className="mt-2 text-gray-400 text-xs">
            Supports .csv, .xlsx, .xls
          </p>
          {fileName && (
            <p className="mt-2 text-green-600 font-medium text-sm">
              ✓ {fileName} ({totalIssues} records)
            </p>
          )}
        </div>

        {/* Search by ID */}
        {data.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex-1">
            <p className="text-sm font-medium text-gray-600 mb-2">🔍 Search by Issue ID</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter Issue ID..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm transition-all"
              >
                Search
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dashboard Content */}
      {data.length > 0 && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <KPICard label="Total Issues" value={totalIssues} color="blue" icon="📋" />
            <KPICard label="Open" value={openCount} color="yellow" icon="🔓" />
            <KPICard label="Closed" value={closedCount} color="green" icon="✅" />
            <KPICard label="Urgent" value={urgentCount} color="red" icon="🚨" />
            <KPICard label="Avg Resolution" value={avgResolutionTime} color="purple" icon="⏱️" suffix=" days" />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Status Chart */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-600 mb-3">By Status</h3>
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
                      <Cell 
                        key={i} 
                        fill={statusColors[entry.name] || defaultColors[i % defaultColors.length]} 
                        className="hover:opacity-80 transition-opacity"
                      />
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
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <span 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: statusColors[item.name] || defaultColors[i % defaultColors.length] }}
                    />
                    {item.name} ({item.value})
                  </button>
                ))}
              </div>
            </div>

            {/* Priority Chart */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-600 mb-3">By Priority</h3>
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
                      <Cell 
                        key={i} 
                        fill={priorityColors[entry.name] || defaultColors[i % defaultColors.length]}
                        className="hover:opacity-80 transition-opacity"
                      />
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
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <span 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: priorityColors[item.name] || defaultColors[i % defaultColors.length] }}
                    />
                    {item.name} ({item.value})
                  </button>
                ))}
              </div>
            </div>

            {/* Issue Type Chart */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-600 mb-3">By Issue Type</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={typeData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar 
                    dataKey="value" 
                    radius={[0, 4, 4, 0]} 
                    onClick={(data) => handleChartClick('type', data.name)}
                    className="cursor-pointer"
                  >
                    {typeData.map((entry, i) => (
                      <Cell 
                        key={i} 
                        fill={typeColors[entry.name] || defaultColors[i % defaultColors.length]}
                        className="hover:opacity-80 transition-opacity"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* State Chart */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-600 mb-3">Top 10 States</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stateData}>
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar 
                    dataKey="value" 
                    fill="#93c5fd" 
                    radius={[4, 4, 0, 0]}
                    onClick={(data) => handleChartClick('state', data.name)}
                    className="cursor-pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-600">
                All Issues ({totalIssues})
              </h3>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    {['ID', 'Type', 'Subject', 'State', 'Status', 'Priority', 'Assigned To', 'Created', 'Closed', 'Resolution'].map(h => (
                      <th key={h} className="px-3 py-2 font-medium text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100 sticky top-0 bg-gray-50 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.slice(0, 100).map((row, i) => {
                    const resolutionDays = getResolutionDays(row);
                    return (
                      <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-3 py-2 text-blue-600 font-medium">
                          {getId(row)}
                        </td>
                        <td className="px-3 py-2">
                          <Badge type="type" value={getType(row)} />
                        </td>
                        <td className="px-3 py-2 max-w-[200px] truncate text-gray-600" title={getSubject(row)}>
                          {getSubject(row)}
                        </td>
                        <td className="px-3 py-2 text-gray-500">
                          {getState(row)}
                        </td>
                        <td className="px-3 py-2">
                          <Badge type="status" value={getStatus(row)} />
                        </td>
                        <td className="px-3 py-2">
                          <Badge type="priority" value={getPriority(row)} />
                        </td>
                        <td className="px-3 py-2 text-gray-500">
                          {getAssignedTo(row)}
                        </td>
                        <td className="px-3 py-2 text-gray-400 text-xs whitespace-nowrap">
                          {getCreatedOn(row)}
                        </td>
                        <td className="px-3 py-2 text-gray-400 text-xs whitespace-nowrap">
                          {getClosedOn(row)}
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
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {data.length > 100 && (
                <p className="p-3 text-center text-gray-400 text-xs bg-gray-50">
                  Showing 100 of {data.length} records
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {data.length === 0 && !loading && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">📊</p>
          <p className="text-sm">Upload a file to see your dashboard</p>
        </div>
      )}

      {/* Detail Modal */}
      {showModal && selectedFilter && (
        <div 
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-semibold text-gray-700">
                  {selectedFilter.type.charAt(0).toUpperCase() + selectedFilter.type.slice(1)}: {selectedFilter.value}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{filteredData.length} issues found</p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-light w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                ×
              </button>
            </div>
            <div className="overflow-auto max-h-[60vh]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left sticky top-0">
                    {['ID', 'Type', 'Subject', 'State', 'Status', 'Priority', 'Created', 'Closed', 'Resolution'].map(h => (
                      <th key={h} className="px-4 py-2 font-medium text-gray-500 text-xs uppercase border-b border-gray-100 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredData.map((row, i) => {
                    const resolutionDays = getResolutionDays(row);
                    return (
                      <tr key={i} className="hover:bg-blue-50/50">
                        <td className="px-4 py-2.5 text-blue-600 font-medium">{getId(row)}</td>
                        <td className="px-4 py-2.5"><Badge type="type" value={getType(row)} /></td>
                        <td className="px-4 py-2.5 max-w-[200px] truncate text-gray-600" title={getSubject(row)}>{getSubject(row)}</td>
                        <td className="px-4 py-2.5 text-gray-500">{getState(row)}</td>
                        <td className="px-4 py-2.5"><Badge type="status" value={getStatus(row)} /></td>
                        <td className="px-4 py-2.5"><Badge type="priority" value={getPriority(row)} /></td>
                        <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">{getCreatedOn(row)}</td>
                        <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">{getClosedOn(row)}</td>
                        <td className="px-4 py-2.5">
                          {resolutionDays !== '-' ? (
                            <span className="text-xs font-medium">{resolutionDays} days</span>
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Search Result Modal */}
      {showSearchModal && searchResult && (
        <div 
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowSearchModal(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-blue-50">
              <div>
                <h3 className="font-semibold text-gray-700">
                  Issue #{getId(searchResult)}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Search Result</p>
              </div>
              <button 
                onClick={() => setShowSearchModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-light w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-5 space-y-3">
              <DetailRow label="ID" value={getId(searchResult)} />
              <DetailRow label="Issue Tracker" value={getType(searchResult)} badge="type" />
              <DetailRow label="Subject" value={getSubject(searchResult)} />
              <DetailRow label="State" value={getState(searchResult)} />
              <DetailRow label="Status" value={getStatus(searchResult)} badge="status" />
              <DetailRow label="Priority" value={getPriority(searchResult)} badge="priority" />
              <DetailRow label="Assigned To" value={getAssignedTo(searchResult)} />
              <DetailRow label="Email" value={getEmail(searchResult)} />
              <DetailRow label="Due Date" value={getDueDate(searchResult)} />
              <DetailRow label="Created On" value={getCreatedOn(searchResult)} />
              <DetailRow label="Closed On" value={getClosedOn(searchResult)} />
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-500 font-medium">Resolution Time</span>
                {getResolutionDays(searchResult) !== '-' ? (
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    parseInt(getResolutionDays(searchResult)) <= 1 ? 'bg-green-100 text-green-700' :
                    parseInt(getResolutionDays(searchResult)) <= 7 ? 'bg-blue-100 text-blue-700' :
                    parseInt(getResolutionDays(searchResult)) <= 30 ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {getResolutionDays(searchResult)} days
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">Not closed yet</span>
                )}
              </div>
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500 font-medium mb-1">Description</p>
                <p className="text-sm text-gray-600">{getDescription(searchResult)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, badge }: { label: string; value: any; badge?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-gray-500 font-medium">{label}</span>
      {badge ? (
        <Badge type={badge} value={String(value)} />
      ) : (
        <span className="text-sm text-gray-700">{String(value)}</span>
      )}
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
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            {label}
          </p>
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
  
  if (type === 'status') {
    const styles: Record<string, string> = {
      'Open': 'bg-blue-100 text-blue-700',
      'Closed': 'bg-green-100 text-green-700',
      'Rejected': 'bg-red-100 text-red-700',
      'In Progress': 'bg-amber-100 text-amber-700',
    };
    classes += styles[value] || 'bg-gray-100 text-gray-600';
  } else if (type === 'priority') {
    const styles: Record<string, string> = {
      'Urgent': 'bg-red-100 text-red-600',
      'High': 'bg-orange-100 text-orange-600',
      'Normal': 'bg-blue-100 text-blue-600',
      'Low': 'bg-gray-100 text-gray-600',
    };
    classes += styles[value] || 'bg-gray-100 text-gray-600';
  } else {
    const styles: Record<string, string> = {
      'Bug': 'bg-red-100 text-red-600',
      'Support': 'bg-blue-100 text-blue-600',
      'Feature': 'bg-green-100 text-green-600',
    };
    classes += styles[value] || 'bg-gray-100 text-gray-600';
  }
  
  return <span className={classes}>{value}</span>;
}