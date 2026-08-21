"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getLostFoundItems, createLostFoundItem, updateLostFoundStatus, deleteLostFoundItem } from '../actions/lost-found';

interface LostFoundItem {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  location: string;
  imageUrl: string | null;
  contactInfo: string;
  status: string;
  createdAt: Date | string;
  userId: string;
  user: {
    name: string;
    email: string;
  };
}

const CATEGORIES = [
  { value: "ELECTRONICS", label: "💻 Electronics" },
  { value: "DOCUMENTS", label: "📇 Documents / IDs" },
  { value: "BOOKS_NOTES", label: "📚 Books & Notes" },
  { value: "ACCESSORIES", label: "🔑 Accessories (Keys, Wallet)" },
  { value: "CLOTHING", label: "👕 Clothing & Bags" },
  { value: "OTHER", label: "📦 Other Items" }
];

export default function LostFoundPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Filters
  const [typeTab, setTypeTab] = useState<"ALL" | "LOST" | "FOUND">("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Forms
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "LOST",
    category: "ELECTRONICS",
    location: "",
    contactInfo: ""
  });
  const [imageFileBase64, setImageFileBase64] = useState<string>("");

  const loadData = async () => {
    setLoading(true);
    const res = await getLostFoundItems({
      type: typeTab,
      category: categoryFilter,
      search: searchQuery
    });
    if (res.success) {
      setItems(res.items as unknown as LostFoundItem[]);
      setCurrentUserId(res.currentUserId);
    }
    setLoading(false);
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [typeTab, categoryFilter, searchQuery]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File size exceeds 2MB limit. Please upload a smaller image.");
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageFileBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReportItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    const res = await createLostFoundItem({
      title: formData.title,
      description: formData.description,
      type: formData.type,
      category: formData.category,
      location: formData.location,
      imageUrl: imageFileBase64,
      contactInfo: formData.contactInfo
    });

    if (res.success) {
      setSuccessMessage(res.message || "Report filed successfully!");
      setFormData({
        title: "",
        description: "",
        type: "LOST",
        category: "ELECTRONICS",
        location: "",
        contactInfo: ""
      });
      setImageFileBase64("");
      setTimeout(() => {
        setIsReportModalOpen(false);
        setSuccessMessage("");
        loadData();
      }, 1500);
    } else {
      setErrorMessage(res.message || "Failed to submit report.");
    }
    setIsSubmitting(false);
  };

  const handleUpdateStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "RESOLVED" : "ACTIVE";
    const res = await updateLostFoundStatus(id, nextStatus as any);
    if (res.success) {
      loadData();
    } else {
      alert(res.message);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this report?")) return;
    const res = await deleteLostFoundItem(id);
    if (res.success) {
      loadData();
    } else {
      alert(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-10 font-sans text-gray-900 flex flex-col justify-between">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-gray-200/60 gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl transition">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <span className="bg-indigo-50 text-indigo-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-100 uppercase tracking-wide">
                Member 1 Feature
              </span>
              <h1 className="text-2xl font-black text-[#0f172a] tracking-tight mt-0.5">Campus Lost & Found</h1>
              <p className="text-xs text-gray-400 font-semibold mt-0.5">Report lost items or return found belongings to classmates</p>
            </div>
          </div>

          <button
            onClick={() => setIsReportModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-2xl text-xs flex items-center gap-2 transition shadow-md w-full sm:w-auto justify-center"
          >
            <span className="text-sm font-bold">+</span> File Lost/Found Report
          </button>
        </header>

        {/* Tab Selection */}
        <div className="flex justify-center border-b border-gray-200">
          <nav className="flex space-x-8" aria-label="Tabs">
            {([
              { key: "ALL", label: "🔍 All Items" },
              { key: "LOST", label: "🚨 Lost Reports" },
              { key: "FOUND", label: "🎁 Found Items" }
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setTypeTab(tab.key)}
                className={`py-4 px-1 border-b-2 font-bold text-sm transition ${
                  typeTab === tab.key
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Category Dropdown */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Filter Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3.5 py-2 text-xs bg-gray-50 border border-gray-100 rounded-xl outline-none text-gray-600 font-bold transition focus:bg-white focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Search location/title */}
          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, location, desc..."
              className="block w-full pl-10 pr-4 py-2.5 text-xs bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none transition"
            />
          </div>
        </div>

        {/* Reports Grid */}
        {loading ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <div className="w-8 h-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin mx-auto"></div>
            <p className="text-gray-400 text-xs font-semibold mt-4">Loading reports...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-3">
            <div className="text-4xl">🚨</div>
            <h3 className="font-bold text-gray-800 text-base">No items reported</h3>
            <p className="text-gray-400 text-xs max-w-sm mx-auto">
              If you have lost something or found a classmate's belonging, list it to help it find its owner!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between group hover:shadow-md transition relative"
              >
                {/* Type Badge (LOST/FOUND) */}
                <div className="absolute top-4 left-4 z-10 flex gap-2">
                  <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full text-white shadow-sm uppercase tracking-wide ${
                    item.type === 'LOST' ? 'bg-rose-600' : 'bg-emerald-600'
                  }`}>
                    {item.type}
                  </span>
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border shadow-sm ${
                    item.status === 'ACTIVE'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                      : 'bg-gray-100 text-gray-500 border-gray-200'
                  }`}>
                    {item.status}
                  </span>
                </div>

                {/* Image Section */}
                <div className="w-full h-48 bg-gray-100 relative flex items-center justify-center text-gray-300">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center space-y-2 select-none">
                      <span className="text-4xl block">📷</span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">No Photo Uploaded</span>
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold">
                      <span className="uppercase">
                        {CATEGORIES.find(c => c.value === item.category)?.label || item.category}
                      </span>
                      <span>
                        {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-extrabold text-gray-900 leading-snug line-clamp-1">{item.title}</h3>
                      <p className="text-xs text-indigo-600 font-bold mt-1 flex items-center gap-1">
                        📍 Location: <span className="text-gray-700 font-black">{item.location}</span>
                      </p>
                    </div>

                    <p className="text-xs text-gray-500 font-medium leading-relaxed line-clamp-3">
                      {item.description}
                    </p>
                  </div>

                  {/* Contact Info and Management */}
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-semibold text-gray-400">
                      <span>Reported by: <strong>{item.user.name}</strong></span>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-2.5 text-xs text-indigo-600 font-bold border border-indigo-50/50 flex justify-between items-center">
                      <span>Contact Info:</span>
                      <span className="text-gray-700 select-all font-black">{item.contactInfo}</span>
                    </div>

                    {/* Owner Actions */}
                    {currentUserId === item.userId && (
                      <div className="flex gap-2 pt-2 border-t border-gray-50">
                        <button
                          onClick={() => handleUpdateStatus(item.id, item.status)}
                          className={`flex-1 text-[11px] font-bold py-2 rounded-xl border transition ${
                            item.status === 'ACTIVE'
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-100'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-100'
                          }`}
                        >
                          {item.status === 'ACTIVE' ? "Mark Resolved" : "Re-activate"}
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="px-3 text-[11px] font-bold py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 transition"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* File Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col p-6 relative animate-in fade-in zoom-in-95 duration-150">
            
            {/* Close button */}
            <button
              onClick={() => setIsReportModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-full transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-xl font-black text-[#0f172a] mb-2">File Lost/Found Report</h2>
            <p className="text-xs text-gray-400 font-semibold mb-6">Create a post on the campus board regarding a lost or found item.</p>

            {/* Error/Success Feedbacks */}
            {errorMessage && (
              <div className="bg-red-50 text-red-700 text-xs font-bold p-3.5 rounded-xl border border-red-100 mb-4">{errorMessage}</div>
            )}
            {successMessage && (
              <div className="bg-emerald-50 text-emerald-700 text-xs font-bold p-3.5 rounded-xl border border-emerald-100 mb-4">{successMessage}</div>
            )}

            <form onSubmit={handleReportItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Report Type */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Report Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2.5 text-xs bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 font-bold"
                  >
                    <option value="LOST">I Lost An Item</option>
                    <option value="FOUND">I Found An Item</option>
                  </select>
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2.5 text-xs bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 font-bold"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Item Title / Name</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Matte Black Casio Watch / Brown Wallet"
                  className="w-full px-3 py-2.5 text-xs bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Location Lost/Found</label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g. Room UB40302, Cafeteria, or Library 2nd Floor"
                  className="w-full px-3 py-2.5 text-xs bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Item Details / Description</label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Mention distinguishable marks, color, brand, or items inside..."
                  className="w-full px-3 py-2.5 text-xs bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Photo Upload */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Upload Item Photo (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
                {imageFileBase64 && (
                  <div className="mt-2 border border-gray-100 rounded-2xl overflow-hidden h-24 w-24 relative bg-gray-50">
                    <img src={imageFileBase64} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImageFileBase64("")}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 text-[9px] hover:bg-black"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Contact Info */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Owner Contact Info</label>
                <input
                  type="text"
                  required
                  value={formData.contactInfo}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactInfo: e.target.value }))}
                  placeholder="e.g. Mobile Number, Messenger Handle, or WhatsApp link"
                  className="w-full px-3 py-2.5 text-xs bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 text-gray-500 text-xs font-bold rounded-2xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl transition disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Report Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full pt-8 mt-8 border-t border-gray-200/60 text-center text-xs font-semibold text-gray-400">
        © {new Date().getFullYear()} UniVerse Lost & Found Portal. All rights reserved.
      </footer>
    </div>
  );
}
