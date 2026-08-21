"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getResources, createResource, updateResourceStatus, deleteResource, searchGoogleBooks } from '../actions/resources';

interface ResourceItem {
  id: string;
  title: string;
  description: string;
  category: string;
  type: string;
  price: number | null;
  contactInfo: string;
  status: string;
  createdAt: Date | string;
  userId: string;
  user: {
    name: string;
    email: string;
  };
}

interface GoogleBookItem {
  title: string;
  authors: string;
  description: string;
  thumbnail: string | null;
}

export default function ResourcesPage() {
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Forms
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "BOOK",
    type: "SALE",
    price: "",
    contactInfo: ""
  });

  // Google Books Search
  const [bookSearchQuery, setBookSearchQuery] = useState("");
  const [bookResults, setBookResults] = useState<GoogleBookItem[]>([]);
  const [isSearchingBooks, setIsSearchingBooks] = useState(false);
  const [bookSearchMessage, setBookSearchMessage] = useState("");

  const loadData = async () => {
    setLoading(true);
    const res = await getResources({
      category: categoryFilter,
      type: typeFilter,
      search: searchQuery
    });
    if (res.success) {
      setResources(res.resources as unknown as ResourceItem[]);
      setCurrentUserId(res.currentUserId);
    }
    setLoading(false);
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [categoryFilter, typeFilter, searchQuery]);

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    const priceNum = formData.type === 'DONATION' ? 0 : parseFloat(formData.price);
    if (formData.type !== 'DONATION' && (isNaN(priceNum) || priceNum < 0)) {
      setErrorMessage("Please enter a valid price.");
      setIsSubmitting(false);
      return;
    }

    const res = await createResource({
      title: formData.title,
      description: formData.description,
      category: formData.category,
      type: formData.type,
      price: priceNum,
      contactInfo: formData.contactInfo
    });

    if (res.success) {
      setSuccessMessage(res.message || "Resource listed successfully!");
      setFormData({
        title: "",
        description: "",
        category: "BOOK",
        type: "SALE",
        price: "",
        contactInfo: ""
      });
      setBookResults([]);
      setBookSearchQuery("");
      setTimeout(() => {
        setIsCreateModalOpen(false);
        setSuccessMessage("");
        loadData();
      }, 1500);
    } else {
      setErrorMessage(res.message || "Failed to create resource listing.");
    }
    setIsSubmitting(false);
  };

  const handleUpdateStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "AVAILABLE" ? "EXCHANGED" : "AVAILABLE";
    const res = await updateResourceStatus(id, nextStatus as any);
    if (res.success) {
      loadData();
    } else {
      alert(res.message);
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm("Are you sure you want to delete this resource?")) return;
    const res = await deleteResource(id);
    if (res.success) {
      loadData();
    } else {
      alert(res.message);
    }
  };

  const handleGoogleBookSearch = async () => {
    if (!bookSearchQuery.trim()) return;
    setIsSearchingBooks(true);
    setBookSearchMessage("");
    setBookResults([]);

    const res = await searchGoogleBooks(bookSearchQuery);
    if (res.success && res.books) {
      setBookResults(res.books as GoogleBookItem[]);
      if (res.books.length === 0) {
        setBookSearchMessage("No books found matching this query.");
      }
    } else {
      setBookSearchMessage(res.message || "Could not search books.");
    }
    setIsSearchingBooks(false);
  };

  const selectGoogleBook = (book: GoogleBookItem) => {
    setFormData(prev => ({
      ...prev,
      title: book.title,
      category: "BOOK",
      description: `Author(s): ${book.authors}\n\n${book.description}`
    }));
    setBookResults([]);
    setBookSearchMessage("");
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
              <h1 className="text-2xl font-black text-[#0f172a] tracking-tight mt-0.5">P2P Resources Exchange</h1>
              <p className="text-xs text-gray-400 font-semibold mt-0.5">Campus Marketplace for Notes, Assignments, & Books</p>
            </div>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-2xl text-xs flex items-center gap-2 transition shadow-md w-full sm:w-auto justify-center"
          >
            <span className="text-sm font-bold">+</span> List Academic Resource
          </button>
        </header>

        {/* Filter Toolbar */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {["ALL", "BOOK", "PDF", "ASSIGNMENT", "NOTES", "OTHER"].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`text-xs font-bold px-4 py-2 rounded-xl transition ${
                  categoryFilter === cat
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-64">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search resources..."
                className="block w-full pl-10 pr-4 py-2.5 text-xs bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none transition"
              />
            </div>

            {/* Type selector */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2.5 text-xs bg-gray-50 border border-gray-100 rounded-xl outline-none text-gray-600 font-bold transition focus:bg-white"
            >
              <option value="ALL">All Listings</option>
              <option value="SALE">For Sale</option>
              <option value="RENT">For Rent</option>
              <option value="DONATION">Free Donation</option>
            </select>
          </div>
        </div>

        {/* Resources Grid */}
        {loading ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <div className="w-8 h-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin mx-auto"></div>
            <p className="text-gray-400 text-xs font-semibold mt-4">Loading resources...</p>
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-3">
            <div className="text-4xl">📚</div>
            <h3 className="font-bold text-gray-800 text-base">No listings found</h3>
            <p className="text-gray-400 text-xs max-w-sm mx-auto">
              Be the first to list academic items, assignments, or textbook guides for others to use!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition"
              >
                {/* Status indicator badge */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                    item.status === 'AVAILABLE'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : 'bg-gray-100 text-gray-500 border-gray-200'
                  }`}>
                    {item.status}
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Category & Type badges */}
                  <div className="flex gap-2 items-center">
                    <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                      {item.category}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      item.type === 'SALE' ? 'bg-amber-50 text-amber-700' :
                      item.type === 'RENT' ? 'bg-sky-50 text-sky-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {item.type}
                    </span>
                  </div>

                  {/* Title & Price */}
                  <div>
                    <h3 className="text-base font-extrabold text-gray-900 leading-snug line-clamp-1">{item.title}</h3>
                    <p className="text-xs font-bold text-gray-400 mt-1">
                      {item.type === 'DONATION' ? (
                        <span className="text-emerald-600 font-extrabold">Free / Donation</span>
                      ) : (
                        <span>Price: <strong className="text-indigo-600 font-black">Tk {item.price}</strong> {item.type === 'RENT' && '/ semester'}</span>
                      )}
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-gray-500 font-medium leading-relaxed line-clamp-3 whitespace-pre-line">
                    {item.description}
                  </p>
                </div>

                {/* Seller & Contact Details */}
                <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col gap-3">
                  <div className="flex justify-between items-center text-[11px] font-semibold text-gray-500">
                    <span className="flex items-center gap-1">
                      👤 {item.user.name}
                    </span>
                    <span>
                      {item.user.email}
                    </span>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-2.5 text-xs text-indigo-600 font-bold border border-indigo-50/50 flex justify-between items-center">
                    <span>Contact Seller:</span>
                    <span className="text-gray-700 select-all font-black">{item.contactInfo}</span>
                  </div>

                  {/* Owner Controls */}
                  {currentUserId === item.userId && (
                    <div className="flex gap-2 mt-2 pt-2 border-t border-gray-50">
                      <button
                        onClick={() => handleUpdateStatus(item.id, item.status)}
                        className={`flex-1 text-[11px] font-bold py-2 rounded-xl border transition ${
                          item.status === 'AVAILABLE'
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-100'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-100'
                        }`}
                      >
                        {item.status === 'AVAILABLE' ? "Mark Exchanged" : "Mark Available"}
                      </button>
                      <button
                        onClick={() => handleDeleteResource(item.id)}
                        className="px-3 text-[11px] font-bold py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 transition"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* List Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col p-6 relative animate-in fade-in zoom-in-95 duration-150">
            
            {/* Close button */}
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-full transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-xl font-black text-[#0f172a] mb-2">List Academic Resource</h2>
            <p className="text-xs text-gray-400 font-semibold mb-6">List academic resources for students. You can search Google Books to auto-fill description details.</p>

            {/* Google Books Search Helper */}
            <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-2xl p-4 mb-6 space-y-3">
              <label className="text-[11px] font-extrabold text-indigo-900 uppercase tracking-wider flex items-center gap-1">
                🔎 Google Books Search Helper (Auto-fill Book Listings)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={bookSearchQuery}
                  onChange={(e) => setBookSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGoogleBookSearch()}
                  placeholder="Type book name or author... e.g. 'Database Systems'"
                  className="flex-1 px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleGoogleBookSearch}
                  disabled={isSearchingBooks}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition disabled:opacity-50"
                >
                  {isSearchingBooks ? "Searching..." : "Search"}
                </button>
              </div>

              {/* Book search message / suggestions list */}
              {bookSearchMessage && (
                <p className="text-[11px] font-bold text-amber-600">{bookSearchMessage}</p>
              )}

              {bookResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-2 border-t border-indigo-100/50 pt-2.5">
                  {bookResults.map((book, idx) => (
                    <div
                      key={idx}
                      onClick={() => selectGoogleBook(book)}
                      className="bg-white border border-gray-100 rounded-xl p-2.5 hover:border-indigo-300 cursor-pointer transition flex items-start gap-2.5"
                    >
                      {book.thumbnail && (
                        <img src={book.thumbnail} alt={book.title} className="w-8 h-10 object-cover rounded shadow-sm flex-shrink-0" />
                      )}
                      <div>
                        <h4 className="text-xs font-bold text-gray-800 line-clamp-1">{book.title}</h4>
                        <p className="text-[10px] text-gray-500 font-medium mt-0.5 line-clamp-1">by {book.authors}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error/Success Feedbacks */}
            {errorMessage && (
              <div className="bg-red-50 text-red-700 text-xs font-bold p-3.5 rounded-xl border border-red-100 mb-4">{errorMessage}</div>
            )}
            {successMessage && (
              <div className="bg-emerald-50 text-emerald-700 text-xs font-bold p-3.5 rounded-xl border border-emerald-100 mb-4">{successMessage}</div>
            )}

            {/* Form */}
            <form onSubmit={handleCreateResource} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Title / Item Name</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. CSE370 Textbook / Quiz 1 Notes"
                    className="w-full px-3 py-2.5 text-xs bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2.5 text-xs bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 font-bold"
                  >
                    <option value="BOOK">Book</option>
                    <option value="PDF">PDF File</option>
                    <option value="ASSIGNMENT">Assignment Template</option>
                    <option value="NOTES">Notes / Slides</option>
                    <option value="OTHER">Other Academic Resource</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Exchange Type */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Listing Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2.5 text-xs bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 font-bold"
                  >
                    <option value="SALE">Sell Resource</option>
                    <option value="RENT">Rent Resource</option>
                    <option value="DONATION">Free Donation</option>
                  </select>
                </div>

                {/* Price */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    {formData.type === 'DONATION' ? 'Price (Disabled)' : 'Price (BDT)'}
                  </label>
                  <input
                    type="number"
                    disabled={formData.type === 'DONATION'}
                    required={formData.type !== 'DONATION'}
                    value={formData.type === 'DONATION' ? "" : formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder={formData.type === 'DONATION' ? "0 (Free)" : "e.g. 150"}
                    className="w-full px-3 py-2.5 text-xs bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Item Details / Description</label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Provide info on condition, authors, contents, semesters, etc."
                  className="w-full px-3 py-2.5 text-xs bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 whitespace-pre-line"
                />
              </div>

              {/* Contact Info */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Buyer Communication / Contact Info</label>
                <input
                  type="text"
                  required
                  value={formData.contactInfo}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactInfo: e.target.value }))}
                  placeholder="e.g. Mobile No, Whatsapp Link, or Messenger Handle"
                  className="w-full px-3 py-2.5 text-xs bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 text-gray-500 text-xs font-bold rounded-2xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl transition disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "List Resource"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full pt-8 mt-8 border-t border-gray-200/60 text-center text-xs font-semibold text-gray-400">
        © {new Date().getFullYear()} UniVerse Academic Resources Marketplace. All rights reserved.
      </footer>
    </div>
  );
}
