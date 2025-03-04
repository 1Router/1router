'use client';

import { useState } from 'react';
import { Search, ArrowUp, ArrowDown } from 'lucide-react';

export default function RankingsPage() {
  const [timeRange, setTimeRange] = useState('24h');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold">Rankings</h1>
        <div className="flex gap-2">
          {['24h', '7d', '30d', 'All'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-md text-sm ${
                timeRange === range
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search models"
          className="w-full pl-10 pr-4 py-2 rounded-md border bg-gray-50"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-4 font-medium text-sm text-gray-500">Rank</th>
              <th className="text-left py-4 font-medium text-sm text-gray-500">Model</th>
              <th className="text-right py-4 font-medium text-sm text-gray-500">
                <div className="flex items-center justify-end gap-1">
                  Tokens
                  <div className="flex flex-col">
                    <ArrowUp className="w-3 h-3" />
                    <ArrowDown className="w-3 h-3" />
                  </div>
                </div>
              </th>
              <th className="text-right py-4 font-medium text-sm text-gray-500">
                <div className="flex items-center justify-end gap-1">
                  Change
                  <div className="flex flex-col">
                    <ArrowUp className="w-3 h-3" />
                    <ArrowDown className="w-3 h-3" />
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Example row */}
            <tr className="border-b hover:bg-gray-50">
              <td className="py-4 text-sm">1</td>
              <td className="py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                  <div>
                    <div className="font-medium">GPT-4</div>
                    <div className="text-sm text-gray-500">OpenAI</div>
                  </div>
                </div>
              </td>
              <td className="py-4 text-right">1.22B</td>
              <td className="py-4 text-right text-green-500">+5.2%</td>
            </tr>
            {/* More rows would be dynamically generated */}
          </tbody>
        </table>
      </div>
    </main>
  );
}
