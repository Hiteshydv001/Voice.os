import React, { useState, useEffect, useRef } from 'react';
import { Upload, Search, Filter, MoreVertical, FileText, Trash2, X, Rocket, CheckSquare, Square } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Lead } from '../types';

interface LeadsManagerProps {
  leads: Lead[];
  onUpload: (leads: Lead[]) => void;
  onDelete?: (leadId: string) => void;
  onClearAll?: () => void;
}

const LeadsManager: React.FC<LeadsManagerProps> = ({ leads, onUpload, onDelete, onClearAll }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteMenu, setShowDeleteMenu] = useState<string | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowDeleteMenu(null);
      }
    };

    if (showDeleteMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDeleteMenu]);

  const handleSelectLead = (leadId: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map(l => l.id)));
    }
  };

  const handleExportToCampaign = () => {
    // Store selected lead IDs in sessionStorage for campaign creation
    if (selectedLeads.size > 0) {
      sessionStorage.setItem('selectedLeads', JSON.stringify(Array.from(selectedLeads)));
      navigate('/app/campaigns');
    }
  };

  const handleExportCSV = () => {
    if (leads.length === 0) return;

    // Determine which leads to export
    const leadsToExport = selectedLeads.size > 0 
      ? leads.filter(lead => selectedLeads.has(lead.id))
      : leads;

    // Create CSV content
    const headers = ['Name', 'Phone', 'City', 'Status', 'Score'];
    const csvRows = [
      headers.join(','),
      ...leadsToExport.map(lead => 
        [
          `"${lead.name}"`,
          lead.phone,
          lead.city,
          lead.status,
          lead.score || 0
        ].join(',')
      )
    ];
    
    const csvContent = csvRows.join('\n');
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = (file: File) => {
    if (!file) return;
    
    // Extract filename without extension for lead naming
    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    
    // Simple CSV parser
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        const newLeads: Lead[] = [];
        
        // Header detection heuristic
        // If the first line contains 'name' or 'phone', assume it's a header.
        const firstLine = lines[0]?.toLowerCase() || '';
        const hasHeader = firstLine.includes('name') || firstLine.includes('phone') || firstLine.includes('city');
        const startIdx = hasHeader ? 1 : 0; 
        
        for (let i = startIdx; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const parts = line.split(',');
          const p0 = parts[0]?.trim();

          // Case 1: Single column -> Assume it's just the phone number
          if (parts.length === 1 && p0) {
             // Basic validation: ensure it has digits
             if (p0.replace(/\D/g, '').length > 3) {
                newLeads.push({
                  id: Date.now().toString() + i,
                  name: `${fileNameWithoutExt} ${p0}`, // Use filename as prefix
                  phone: p0,
                  city: 'Unknown',
                  status: 'New',
                  score: 0
                });
             }
          } 
          // Case 2: Two or more columns -> Name, Phone, [City]
          else if (parts.length >= 2) {
            newLeads.push({
              id: Date.now().toString() + i,
              name: p0 || 'Unknown',
              phone: parts[1]?.trim() || 'Unknown',
              city: parts[2]?.trim() || 'Unknown',
              status: 'New',
              score: 0
            });
          }
        }
        
        if (newLeads.length > 0) {
          onUpload(newLeads);
          setError(null);
        } else {
          setError("No valid leads found. File must contain at least phone numbers.");
        }
      } catch (err) {
        setError("Failed to parse file.");
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-8 font-mono">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-4 border-black pb-4">
        <div>
          <h1 className="text-3xl font-black text-black uppercase">Lead Database</h1>
          <p className="text-stone-600 mt-1">
            Manage target entities. {leads.length > 0 && `(${leads.length} leads)`}
            {selectedLeads.size > 0 && <span className="text-orange-600 font-bold"> • {selectedLeads.size} selected</span>}
          </p>
        </div>
        <div className="flex space-x-3">
          {selectedLeads.size > 0 && (
            <button 
              onClick={handleExportToCampaign}
              className="px-4 py-2 bg-orange-600 border-2 border-black text-white font-bold uppercase hover:bg-orange-700 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              <Rocket className="h-4 w-4 inline mr-2" />
              Start Campaign ({selectedLeads.size})
            </button>
          )}
          {leads.length > 0 && onClearAll && (
            <button 
              onClick={() => {
                if (window.confirm('Are you sure you want to delete all leads? This action cannot be undone.')) {
                  onClearAll();
                  setSelectedLeads(new Set());
                }
              }}
              className="px-4 py-2 bg-red-600 border-2 border-black text-white font-bold uppercase hover:bg-red-700 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              <Trash2 className="h-4 w-4 inline mr-2" />
              Clear All
            </button>
          )}
          {leads.length > 0 && (
            <button 
              onClick={handleExportCSV}
              className="px-4 py-2 bg-white border-2 border-black text-black font-bold uppercase hover:bg-stone-100 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              <FileText className="h-4 w-4 inline mr-2" />
              Export CSV {selectedLeads.size > 0 && `(${selectedLeads.size})`}
            </button>
          )}
        </div>
      </div>

      <div 
        className={`border-2 border-dashed rounded-none p-12 text-center transition-all ${
          isDragging ? 'border-orange-500 bg-orange-50' : 'border-black bg-stone-50 hover:bg-white'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="mx-auto w-16 h-16 bg-white border-2 border-black flex items-center justify-center mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <Upload className="h-8 w-8 text-black" />
        </div>
        <h3 className="text-xl font-bold text-black uppercase">Import Data</h3>
        <p className="text-stone-500 mt-2 mb-6">Drop CSV formatted file to initiate data ingestion.</p>
        
        <input 
          type="file" 
          id="file-upload" 
          className="hidden" 
          accept=".csv,.txt" 
          onChange={handleFileSelect}
        />
        <label 
          htmlFor="file-upload"
          className="cursor-pointer inline-flex items-center px-6 py-3 bg-black text-white border-2 border-black font-bold uppercase hover:bg-white hover:text-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
        >
          Select File
        </label>
        
        {error && (
          <p className="text-sm text-red-600 font-bold mt-4 bg-red-100 p-2 inline-block border-2 border-red-600">{error}</p>
        )}
        <p className="text-xs text-stone-400 mt-6 uppercase tracking-wider">Accepted Formats: Name,Phone,City OR Phone Only</p>
      </div>

      <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="p-4 border-b-2 border-black flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-black" />
            <input 
              type="text" 
              placeholder="QUERY DATABASE..." 
              className="w-full pl-10 pr-4 py-2 border-2 border-black rounded-none focus:outline-none focus:bg-white focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all bg-stone-100 placeholder-stone-500 font-bold uppercase text-sm"
            />
          </div>
          <button className="flex items-center px-4 py-2 border-2 border-black bg-white text-black font-bold uppercase text-sm hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-black text-white">
              <tr>
                <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-widest border-r border-stone-700">
                  <button 
                    onClick={handleSelectAll}
                    className="hover:text-orange-400 transition-colors"
                  >
                    {selectedLeads.size === leads.length ? (
                      <CheckSquare className="h-5 w-5" />
                    ) : (
                      <Square className="h-5 w-5" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest border-r border-stone-700">Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest border-r border-stone-700">Phone</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest border-r border-stone-700">City</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest border-r border-stone-700">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest border-r border-stone-700">Score</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y-2 divide-black">
              {leads.map((lead) => (
                <tr key={lead.id} className={`transition-colors ${selectedLeads.has(lead.id) ? 'bg-orange-50' : 'hover:bg-yellow-50'}`}>
                  <td className="px-4 py-4 text-center border-r-2 border-stone-100">
                    <button
                      onClick={() => handleSelectLead(lead.id)}
                      className="hover:text-orange-600 transition-colors"
                    >
                      {selectedLeads.has(lead.id) ? (
                        <CheckSquare className="h-5 w-5 text-orange-600" />
                      ) : (
                        <Square className="h-5 w-5" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap border-r-2 border-stone-100">
                    <div className="font-bold text-black">{lead.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-stone-600 border-r-2 border-stone-100 font-mono">{lead.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-stone-600 border-r-2 border-stone-100">{lead.city}</td>
                  <td className="px-6 py-4 whitespace-nowrap border-r-2 border-stone-100">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-bold uppercase border-2 border-black 
                      ${lead.status === 'Qualified' ? 'bg-green-200 text-black' : 
                        lead.status === 'New' ? 'bg-blue-200 text-black' : 
                        lead.status === 'Converted' ? 'bg-purple-200 text-black' : 
                        'bg-stone-200 text-black'}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap border-r-2 border-stone-100">
                    <div className="flex items-center">
                      <div className="w-16 bg-stone-200 h-3 border border-black mr-2">
                        <div 
                          className={`h-full ${lead.score && lead.score > 70 ? 'bg-green-500' : 'bg-orange-500'}`} 
                          style={{ width: `${lead.score || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-black">{lead.score || 0}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="relative inline-block" ref={showDeleteMenu === lead.id ? menuRef : null}>
                      <button 
                        onClick={() => setShowDeleteMenu(showDeleteMenu === lead.id ? null : lead.id)}
                        className="text-black hover:text-orange-600 p-1 border-2 border-transparent hover:border-black transition-all"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                      
                      {showDeleteMenu === lead.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-10">
                          <button
                            onClick={() => {
                              if (onDelete) {
                                onDelete(lead.id);
                                setShowDeleteMenu(null);
                              }
                            }}
                            className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 font-bold uppercase text-sm flex items-center"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Lead
                          </button>
                          <button
                            onClick={() => setShowDeleteMenu(null)}
                            className="w-full px-4 py-2 text-left text-black hover:bg-stone-100 font-bold uppercase text-sm flex items-center border-t-2 border-black"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LeadsManager;