'use client';

import { useState } from 'react';
import { Paperclip, Settings, Send } from 'lucide-react';

export default function ChatPage() {
  const [message, setMessage] = useState('');

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Left Sidebar */}
      <div className="w-64 border-r p-4">
        <button className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md border hover:bg-gray-50">
          <span>⌘</span>
          <span>0</span>
          <span className="flex-1">New Room</span>
        </button>

        <div className="mt-8">
          <h2 className="font-medium mb-4">Flagship models</h2>
          <div className="flex gap-2">
            {/* Model avatars would go here */}
            <div className="w-8 h-8 rounded-full bg-gray-200"></div>
            <div className="w-8 h-8 rounded-full bg-gray-200"></div>
            <div className="w-8 h-8 rounded-full bg-gray-200"></div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="font-medium mb-4">Best roleplay models</h2>
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-200"></div>
            <div className="w-8 h-8 rounded-full bg-gray-200"></div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="font-medium mb-4">Best coding models</h2>
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-200"></div>
            <div className="w-8 h-8 rounded-full bg-gray-200"></div>
            <div className="w-8 h-8 rounded-full bg-gray-200"></div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="font-medium mb-4">Long context, low price</h2>
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-200"></div>
            <div className="w-8 h-8 rounded-full bg-gray-200"></div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border hover:bg-gray-50">
              <span>⌘</span>
              <span>K</span>
              <span>Add model</span>
            </button>
            <span className="text-sm text-gray-500">To:</span>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Messages would be rendered here */}
        </div>

        {/* Input Area */}
        <div className="border-t p-4">
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-md">
              <Settings className="w-5 h-5 text-gray-500" />
            </button>
            <div className="flex-1 relative">
              <textarea
                placeholder="Start a message..."
                className="w-full px-4 py-3 rounded-md border resize-none"
                rows={1}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button className="absolute right-2 bottom-2 p-2 hover:bg-gray-100 rounded-md">
                <Paperclip className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <button 
              className={`p-2 rounded-md ${message ? 'bg-primary text-white' : 'text-gray-400'}`}
              disabled={!message}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
