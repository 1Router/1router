'use client';

import { useState } from 'react';
import { Search, SlidersHorizontal, Grid, List } from 'lucide-react';

export default function ModelsPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [filterQuery, setFilterQuery] = useState('');
  const [sortBy, setSortBy] = useState('Newest');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold">Models</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">296 models</span>
          <button onClick={() => {}} className="text-sm text-primary">Reset Filters</button>
        </div>
      </div>

      <div className="grid grid-cols-[250px_1fr] gap-8">
        {/* Filters Sidebar */}
        <div className="space-y-6">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-medium mb-4">
              <SlidersHorizontal className="w-4 h-4" /> Modality
            </h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm">Text to Text</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm">Text & Image to Text</span>
              </label>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-4">Context length</h3>
            <input
              type="range"
              className="w-full"
              min="4000"
              max="1000000"
              step="1000"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>4K</span>
              <span>64K</span>
              <span>1M</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-4">Prompt pricing</h3>
            <input
              type="range"
              className="w-full"
              min="0"
              max="10"
              step="0.1"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>FREE</span>
              <span>$0.5</span>
              <span>$10+</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-4">Series</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm">GPT</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm">Claude</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm">Gemini</span>
              </label>
            </div>
          </div>
        </div>

        {/* Models List */}
        <div>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Filter models"
                className="w-full pl-10 pr-4 py-2 rounded-md border bg-gray-50"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 rounded-md border bg-white"
            >
              <option>Newest</option>
              <option>Popular</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
            </select>
            <div className="flex gap-1 border rounded-md">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-gray-100' : ''}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Model Item */}
            <div className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium">MiniMax: MiniMax-01</h3>
                  <button className="p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  MiniMax-01 combines MiniMax-Text-01 for text generation and MiniMax-VL-01 for image understanding...
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>by minimax</span>
                  <span>1M context</span>
                  <span>$0.2/1M input tokens</span>
                  <span>$1.1/1M output tokens</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-medium">1.22B</div>
                <div className="text-sm text-gray-500">tokens</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
