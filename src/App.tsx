import React, { useState, useEffect, useCallback, useId } from 'react';
import {
  Briefcase,
  Search,
  Building2,
  MapPin,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  Filter,
  X,
  ChevronRight,
  User,
  Mail,
  MessageSquare,
  Lock,
  Database,
  FileCheck,
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';
import type { Internship, Application, ApiResponse } from './types/index.ts';

const CATEGORIES = [
  'All',
  'Software Engineering',
  'Product Design',
  'Data Science',
  'DevOps',
  'Cybersecurity',
  'Marketing'
] as const;

const WORK_TYPES = ['All', 'Remote', 'Hybrid', 'On-site'] as const;

export default function App() {
  // State for internships and API interaction
  const [internships, setInternships] = useState<Internship[]>([]);
  const [status, setStatus] = useState<'loading' | 'success' | 'empty' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');

  // Modals
  const [activeInternship, setActiveInternship] = useState<Internship | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isApplicationsDrawerOpen, setIsApplicationsDrawerOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);

  // Application Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<Application | null>(null);

  // My Applications State
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);

  // Backend Health & Security Info State
  const [healthInfo, setHealthInfo] = useState<any>(null);

  const searchInputId = useId();
  const categorySelectId = useId();
  const workTypeSelectId = useId();
  const nameInputId = useId();
  const emailInputId = useId();
  const messageInputId = useId();

  // 1. Fetch internships from real backend API
  const fetchInternships = useCallback(async () => {
    setStatus('loading');
    setErrorMessage('');

    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('query', searchQuery.trim());
      if (selectedCategory !== 'All') params.append('category', selectedCategory);
      if (selectedType !== 'All') params.append('type', selectedType);

      const url = `/api/internships${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ApiResponse<Internship[]> = await response.json();

      if (result.success) {
        setInternships(result.data);
        setStatus(result.data.length === 0 ? 'empty' : 'success');
      } else {
        throw new Error(result.error || 'Failed to fetch internships.');
      }
    } catch (err: any) {
      console.error('[Frontend] Fetch internships error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Unable to connect to the backend server. Please verify your connection and retry.');
    }
  }, [searchQuery, selectedCategory, selectedType]);

  // Load internships on mount & filter change
  useEffect(() => {
    fetchInternships();
  }, [fetchInternships]);

  // Check health on mount
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setHealthInfo(data);
        }
      })
      .catch((err) => console.warn('Health check fetch notice:', err));
  }, []);

  // Fetch submitted applications
  const fetchApplications = async () => {
    setLoadingApps(true);
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      if (data.success) {
        setMyApplications(data.data);
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
    } finally {
      setLoadingApps(false);
    }
  };

  // 2. Client-side form validation
  const validateForm = () => {
    const errors: Record<string, string> = {};

    // Validate Name
    if (!formData.name.trim()) {
      errors.name = 'Full name is required.';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Full name must be at least 2 characters.';
    } else if (formData.name.trim().length > 100) {
      errors.name = 'Full name must not exceed 100 characters.';
    }

    // Validate Email
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!formData.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address (e.g., student@university.edu).';
    } else if (formData.email.trim().length > 255) {
      errors.email = 'Email must not exceed 255 characters.';
    }

    // Validate Message
    if (!formData.message.trim()) {
      errors.message = 'Application statement is required.';
    } else if (formData.message.trim().length < 10) {
      errors.message = 'Please write at least 10 characters explaining your interest and qualifications.';
    } else if (formData.message.trim().length > 1000) {
      errors.message = 'Application statement must not exceed 1,000 characters.';
    }

    setClientErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: 'name' | 'email' | 'message', value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field-specific error as user types
    if (clientErrors[field]) {
      setClientErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
    if (serverError) setServerError(null);
  };

  // 3. Handle Application Submission (POST /api/applications)
  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent duplicate submission while already in progress
    if (isSubmitting) return;

    if (!activeInternship) {
      setServerError('No internship selected.');
      return;
    }

    // Run browser validation first
    const isValid = validateForm();
    if (!isValid) return;

    setIsSubmitting(true);
    setServerError(null);

    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          internship_id: activeInternship.id,
          name: formData.name.trim(),
          email: formData.email.trim(),
          message: formData.message.trim()
        })
      });

      const result = await response.json();

      if (response.status === 201 && result.success) {
        setSubmitSuccess(result.data);
        setFormData({ name: '', email: '', message: '' });
        setClientErrors({});
        // Refresh application list in background
        fetchApplications();
      } else if (response.status === 400 && result.details) {
        // Server validation errors
        setClientErrors(result.details);
        setServerError(result.error || 'Server validation rejected the submission.');
      } else if (response.status === 409) {
        setServerError(result.error || 'You have already applied for this position.');
      } else if (response.status === 429) {
        setServerError('Too many submissions. Security rate limit engaged. Please try again later.');
      } else {
        setServerError(result.error || 'Failed to submit application. Please check your data and retry.');
      }
    } catch (err: any) {
      console.error('[Frontend] Submit error:', err);
      setServerError('Network failure: Unable to reach the server. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openApplyModal = (internship: Internship) => {
    setActiveInternship(internship);
    setIsDetailModalOpen(false);
    setIsApplyModalOpen(true);
    setSubmitSuccess(null);
    setServerError(null);
    setClientErrors({});
  };

  const openDetailModal = (internship: Internship) => {
    setActiveInternship(internship);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Banner: EdVyro Task 04 Security & Status Indicator */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">EdVyro</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Task 04 Integrated
                </span>
              </div>
              <p className="text-xs text-slate-400">Secure Node.js • Express • SQLite Board</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsSecurityModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-700/50 hover:bg-emerald-900/60 transition-colors"
              title="View Security Checklist & Server Hardening"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Security Shield Active</span>
              <span className="sm:hidden">Security</span>
            </button>

            <button
              onClick={() => {
                fetchApplications();
                setIsApplicationsDrawerOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-colors"
            >
              <FileCheck className="w-4 h-4 text-blue-400" />
              <span>Applications ({myApplications.length})</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-slate-700">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-300 border border-blue-400/20">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Real-time SQLite Persistence & Dual-Tier Validation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Launch Your Career With Verified Internships
          </h1>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Browse verified opportunities from high-growth tech companies. Submit applications securely through our hardened Express REST API backed by SQLite.
          </p>

          {/* Search and Filters Bar */}
          <div className="pt-4 max-w-3xl mx-auto">
            <div className="bg-white p-3 rounded-2xl shadow-xl shadow-black/20 flex flex-col md:flex-row gap-2.5 text-slate-900 border border-slate-200">
              {/* Search input */}
              <div className="flex-1 relative flex items-center">
                <Search className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" />
                <label htmlFor={searchInputId} className="sr-only">Search by role, company, or keyword</label>
                <input
                  id={searchInputId}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by role, company, or keyword..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-transparent border-0 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <div className="md:w-52">
                <label htmlFor={categorySelectId} className="sr-only">Filter by category</label>
                <select
                  id={categorySelectId}
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full py-2.5 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === 'All' ? 'All Categories' : cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Work Type Filter */}
              <div className="md:w-40">
                <label htmlFor={workTypeSelectId} className="sr-only">Filter by work mode</label>
                <select
                  id={workTypeSelectId}
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full py-2.5 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {WORK_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type === 'All' ? 'All Modes' : type}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Results Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900">Internship Openings</h2>
            {status === 'success' && (
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                {internships.length} found
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span>Connected to SQLite via Express REST API</span>
          </div>
        </div>

        {/* 1. LOADING STATE */}
        {status === 'loading' && (
          <div className="space-y-4">
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
              <p className="text-base font-semibold text-slate-800">Fetching verified internships...</p>
              <p className="text-xs text-slate-500 mt-1">Calling real backend endpoint <code className="text-blue-600">GET /api/internships</code></p>
            </div>
            {/* Skeleton Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4 animate-pulse">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-slate-200 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-3/4" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-3 bg-slate-100 rounded w-full" />
                  <div className="h-3 bg-slate-100 rounded w-4/5" />
                  <div className="h-8 bg-slate-100 rounded-xl" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. ERROR STATE WITH RETRY BUTTON */}
        {status === 'error' && (
          <div className="max-w-xl mx-auto p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-4 my-8 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-rose-900">Failed to Load Internships</h3>
            <p className="text-sm text-rose-700 leading-relaxed">
              {errorMessage}
            </p>
            <div className="pt-2">
              <button
                onClick={fetchInternships}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl font-medium text-sm bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Loading</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. EMPTY STATE */}
        {status === 'empty' && (
          <div className="max-w-md mx-auto p-10 bg-white border border-slate-200 rounded-2xl text-center space-y-4 my-8 shadow-sm">
            <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Filter className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No Internships Found</h3>
            <p className="text-sm text-slate-500">
              No openings matched your search terms or filter criteria. Try clearing your filters.
            </p>
            <div className="pt-2">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setSelectedType('All');
                }}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                <span>Reset All Filters</span>
              </button>
            </div>
          </div>
        )}

        {/* 4. SUCCESS STATE: RESPONSIVE INTERNSHIP GRID */}
        {status === 'success' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {internships.map((internship) => (
              <article
                key={internship.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-6 space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <img
                        src={internship.logo}
                        alt={internship.company}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-100 shadow-xs"
                        onError={(e) => {
                          // Fallback to placeholder if external image fails
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=128&auto=format&fit=crop&q=80';
                        }}
                      />
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{internship.company}</span>
                        </h4>
                        <span className="text-xs text-slate-500 font-medium">{internship.category}</span>
                      </div>
                    </div>

                    {/* Work Mode Badge */}
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        internship.type === 'Remote'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : internship.type === 'Hybrid'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {internship.type}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                    {internship.title}
                  </h3>

                  {/* Metadata Chips */}
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{internship.location}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-emerald-700">{internship.stipend}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Deadline: {internship.deadline}</span>
                    </div>
                  </div>

                  {/* Description Snippet */}
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {internship.description}
                  </p>
                </div>

                {/* Card Footer Actions */}
                <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    onClick={() => openDetailModal(internship)}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <span>View Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => openApplyModal(internship)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20 transition-all cursor-pointer flex items-center space-x-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Apply Now</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* DETAIL MODAL */}
      {isDetailModalOpen && activeInternship && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <img
                  src={activeInternship.logo}
                  alt={activeInternship.company}
                  className="w-14 h-14 rounded-xl object-cover border border-slate-200"
                />
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{activeInternship.title}</h3>
                  <p className="text-sm text-slate-600 font-medium">{activeInternship.company} • {activeInternship.location}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Highlights */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <div>
                  <span className="block text-xs text-slate-400 uppercase font-semibold">Mode</span>
                  <span className="text-sm font-bold text-slate-800">{activeInternship.type}</span>
                </div>
                <div>
                  <span className="block text-xs text-slate-400 uppercase font-semibold">Stipend</span>
                  <span className="text-sm font-bold text-emerald-600">{activeInternship.stipend}</span>
                </div>
                <div>
                  <span className="block text-xs text-slate-400 uppercase font-semibold">Deadline</span>
                  <span className="text-sm font-bold text-slate-800">{activeInternship.deadline}</span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Role Overview</h4>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {activeInternship.description}
                </p>
              </div>

              {/* Requirements */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Key Requirements</h4>
                <ul className="space-y-2">
                  {activeInternship.requirements.map((req, idx) => (
                    <li key={idx} className="flex items-start space-x-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-3">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => openApplyModal(activeInternship)}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center space-x-1.5"
              >
                <Send className="w-4 h-4" />
                <span>Apply for this Role</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APPLICATION MODAL WITH VALIDATION & REAL SQLITE SUBMISSION */}
      {isApplyModalOpen && activeInternship && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[95vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">Apply for Internship</span>
                <h3 className="text-lg font-bold text-slate-900">{activeInternship.title}</h3>
                <p className="text-xs text-slate-500">{activeInternship.company} • {activeInternship.location}</p>
              </div>
              <button
                onClick={() => setIsApplyModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Submission Success Screen */}
            {submitSuccess ? (
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-bold text-slate-900">Application Submitted!</h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Your application has been safely validated and saved in the SQLite database.
                </p>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Application ID:</span>
                    <span className="font-mono font-medium text-slate-700">{submitSuccess.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Applicant:</span>
                    <span className="font-semibold text-slate-800">{submitSuccess.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email:</span>
                    <span className="text-slate-800">{submitSuccess.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-700 capitalize">
                      {submitSuccess.status}
                    </span>
                  </div>
                </div>

                <div className="pt-3 flex gap-3 justify-center">
                  <button
                    onClick={() => {
                      setIsApplyModalOpen(false);
                      setSubmitSuccess(null);
                    }}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                  <button
                    onClick={() => {
                      setIsApplyModalOpen(false);
                      setSubmitSuccess(null);
                      fetchApplications();
                      setIsApplicationsDrawerOpen(true);
                    }}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
                  >
                    View All Applications
                  </button>
                </div>
              </div>
            ) : (
              /* Application Form */
              <form onSubmit={handleSubmitApplication} noValidate className="p-6 space-y-5">
                {/* Server Error Alert */}
                {serverError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>{serverError}</span>
                  </div>
                )}

                {/* Dual-Validation Notice */}
                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-700 flex items-start space-x-2">
                  <Lock className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Security active:</strong> Submissions are verified both client-side and server-side against rate limiting and payload injection.
                  </span>
                </div>

                {/* 1. Full Name */}
                <div className="space-y-1.5">
                  <label htmlFor={nameInputId} className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      id={nameInputId}
                      type="text"
                      disabled={isSubmitting}
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="e.g. Jane Doe"
                      className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border ${
                        clientErrors.name ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                      } focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100`}
                    />
                  </div>
                  {clientErrors.name && (
                    <p className="text-xs text-rose-600 flex items-center space-x-1 mt-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{clientErrors.name}</span>
                    </p>
                  )}
                </div>

                {/* 2. Email Address */}
                <div className="space-y-1.5">
                  <label htmlFor={emailInputId} className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      id={emailInputId}
                      type="email"
                      disabled={isSubmitting}
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="e.g. jane.doe@university.edu"
                      className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border ${
                        clientErrors.email ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                      } focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100`}
                    />
                  </div>
                  {clientErrors.email && (
                    <p className="text-xs text-rose-600 flex items-center space-x-1 mt-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{clientErrors.email}</span>
                    </p>
                  )}
                </div>

                {/* 3. Application Statement / Message */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label htmlFor={messageInputId} className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Application Statement <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {formData.message.length}/1000
                    </span>
                  </div>
                  <div className="relative">
                    <textarea
                      id={messageInputId}
                      rows={4}
                      disabled={isSubmitting}
                      value={formData.message}
                      onChange={(e) => handleInputChange('message', e.target.value)}
                      placeholder="Explain your relevant coursework, projects, or why you are excited about this internship..."
                      className={`w-full p-3 text-sm rounded-xl border ${
                        clientErrors.message ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                      } focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 resize-none`}
                    />
                  </div>
                  {clientErrors.message && (
                    <p className="text-xs text-rose-600 flex items-center space-x-1 mt-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{clientErrors.message}</span>
                    </p>
                  )}
                </div>

                {/* Form Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setIsApplyModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center space-x-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Submitting Application...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit Application</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* APPLICATIONS DRAWER (PERSISTENCE PROOF) */}
      {isApplicationsDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full h-full shadow-2xl flex flex-col">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900">Recorded Applications</h3>
              </div>
              <button
                onClick={() => setIsApplicationsDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-blue-50/50 border-b border-blue-100 text-xs text-blue-800 flex items-center justify-between">
              <span>Fetched live from SQLite <code className="bg-blue-100 px-1 py-0.5 rounded">applications</code> table</span>
              <button
                onClick={fetchApplications}
                className="hover:text-blue-900 flex items-center gap-1 font-semibold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingApps ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingApps ? (
                <div className="p-8 text-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Querying SQLite database...</p>
                </div>
              ) : myApplications.length === 0 ? (
                <div className="p-8 text-center text-slate-500 space-y-2">
                  <FileCheck className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">No applications recorded yet</p>
                  <p className="text-xs text-slate-400">Apply to any internship opening to view real SQLite records here.</p>
                </div>
              ) : (
                myApplications.map((app) => (
                  <div key={app.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{app.internship_title || app.internship_id}</h4>
                        <p className="text-xs text-slate-500">{app.company || 'Direct Application'}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 uppercase border border-blue-200">
                        {app.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <p className="font-semibold text-slate-800">{app.name} &lt;{app.email}&gt;</p>
                      <p className="text-slate-600 mt-1 italic line-clamp-3">"{app.message}"</p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span className="font-mono">{app.id}</span>
                      <span>{new Date(app.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 text-center">
              <button
                onClick={() => setIsApplicationsDrawerOpen(false)}
                className="w-full py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECURITY CHECKLIST & INSPECTOR MODAL */}
      {isSecurityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white rounded-t-2xl">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold">Task 04 Security Architecture</h3>
              </div>
              <button
                onClick={() => setIsSecurityModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-1">
                <div className="flex items-center space-x-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Security Status: Hardened & Verified</span>
                </div>
                <p className="text-emerald-800">
                  All Task 04 security directives are implemented across the Express backend and SQLite database.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-start space-x-2.5 p-3 rounded-lg border border-slate-100 bg-slate-50">
                  <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">Helmet Security Headers</h5>
                    <p className="text-slate-600 mt-0.5">
                      Enforces <code className="bg-slate-200 px-1 rounded">X-Content-Type-Options: nosniff</code>, <code className="bg-slate-200 px-1 rounded">Strict-Transport-Security</code>, <code className="bg-slate-200 px-1 rounded">X-Frame-Options</code>, and removes fingerprinting headers.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2.5 p-3 rounded-lg border border-slate-100 bg-slate-50">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">Rate Limiting (express-rate-limit)</h5>
                    <p className="text-slate-600 mt-0.5">
                      150 requests/15m on general <code className="bg-slate-200 px-1 rounded">/api/*</code> and strict 15 submissions/15m on <code className="bg-slate-200 px-1 rounded">POST /api/applications</code>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2.5 p-3 rounded-lg border border-slate-100 bg-slate-50">
                  <Database className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">Parameterized SQL Queries</h5>
                    <p className="text-slate-600 mt-0.5">
                      Every database operation uses prepared parameter arrays <code className="bg-slate-200 px-1 rounded">(args: [ ... ])</code>, completely neutralizing SQL Injection attacks.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2.5 p-3 rounded-lg border border-slate-100 bg-slate-50">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">Dual-Tier Input Validation</h5>
                    <p className="text-slate-600 mt-0.5">
                      Client-side checks provide immediate UX feedback, while the Express API independently re-validates all inputs and rejects malformed payloads (400 Bad Request).
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2.5 p-3 rounded-lg border border-slate-100 bg-slate-50">
                  <FileCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">Body Limit & CORS Configuration</h5>
                    <p className="text-slate-600 mt-0.5">
                      Express limits JSON payload bodies to 10KB to prevent memory exhaustion attacks, with origin restrictions configured via CORS.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsSecurityModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-white hover:bg-slate-900 cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 EdVyro Full Stack Development • Task 04: Secure Application Integration</p>
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <Database className="w-3.5 h-3.5 text-blue-500" />
              <span>SQLite Persistent DB</span>
            </span>
            <span className="flex items-center space-x-1">
              <Lock className="w-3.5 h-3.5 text-emerald-500" />
              <span>Helmet & Rate Limiter</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
