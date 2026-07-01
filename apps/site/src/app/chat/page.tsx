'use client';

import { useState, useRef, useEffect } from 'react';
import { Paperclip, Send, Plus, MessageSquare, Cpu, SlidersHorizontal, X } from 'lucide-react';
import { models, providerColors } from '@1router/models';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  provider?: string;
  providerSlug?: string;
}

const categories = [
  {
    title: 'Flagship Models',
    modelIds: ['openai/gpt-4o', 'anthropic/claude-3.7-sonnet', 'google/gemini-2.0-flash', 'x-ai/grok-3'],
  },
  {
    title: 'Best for Coding',
    modelIds: ['openai/o3-mini', 'qwen/qwen-2.5-coder-32b-instruct', 'deepseek/deepseek-r1', 'openai/gpt-oss-120b'],
  },
  {
    title: 'Fast & Affordable',
    modelIds: ['openai/gpt-4o-mini', 'anthropic/claude-3.5-haiku', 'google/gemini-2.0-flash', 'meta/llama-3.3-70b-instruct'],
  },
  {
    title: 'Long Context',
    modelIds: ['google/gemini-1.5-pro', 'minimax/minimax-01', 'anthropic/claude-3.7-sonnet', 'moonshotai/kimi-k2.6'],
  },
];

const initialMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'user',
    content: 'What are the key differences between GPT-4o and Claude 3.7 Sonnet?',
  },
  {
    id: '2',
    role: 'assistant',
    content: "GPT-4o excels at multimodal tasks with native audio support and lower latency, while Claude 3.7 Sonnet offers superior reasoning with its extended thinking mode and a 200K context window. Both support vision, but Claude tends to produce more nuanced, carefully structured responses for complex analytical tasks.",
    model: 'Claude 3.7 Sonnet',
    provider: 'Anthropic',
    providerSlug: 'anthropic',
  },
  {
    id: '3',
    role: 'assistant',
    content: "GPT-4o is OpenAI's flagship multimodal model — it's faster and cheaper than GPT-4 Turbo, handles text, audio, and images natively, and has 128K context. Claude 3.7 Sonnet from Anthropic adds an extended thinking mode for step-by-step reasoning, a larger 200K context window, and tends to be more careful with complex instructions.",
    model: 'GPT-4o',
    provider: 'OpenAI',
    providerSlug: 'openai',
  },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [activeModels, setActiveModels] = useState<string[]>([
    'anthropic/claude-3.7-sonnet',
    'openai/gpt-4o',
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDialogElement>(null);

  // Tap on the dimmer (outside the picker's box) closes it.
  useEffect(() => {
    const dlg = pickerRef.current;
    if (!dlg) return;
    const onClick = (e: MouseEvent) => {
      const r = dlg.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
        dlg.close();
      }
    };
    dlg.addEventListener('click', onClick);
    return () => dlg.removeEventListener('click', onClick);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleModel = (id: string) => {
    setActiveModels((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSend = () => {
    if (!input.trim() || activeModels.length === 0) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    // Simulate responses from each active model
    activeModels.forEach((modelId, idx) => {
      const model = models.find((m) => m.id === modelId);
      if (!model) return;

      setTimeout(() => {
        const response: ChatMessage = {
          id: `${Date.now()}-${idx}`,
          role: 'assistant',
          content: `This is a simulated response from ${model.name}. In production, this would call the 1Router API with model ID "${model.id}" and stream the response back.`,
          model: model.name,
          provider: model.provider,
          providerSlug: model.providerSlug,
        };
        setMessages((prev) => [...prev, response]);
      }, 600 * (idx + 1));
    });
  };

  const closePicker = () => pickerRef.current?.close();
  const openPicker = () => pickerRef.current?.showModal();

  const getModelById = (id: string) => models.find((m) => m.id === id);

  // Shared rendering for the model picker (used by desktop sidebar AND mobile drawer).
  const renderCategoryList = () => (
    <>
      {categories.map((cat) => (
        <div key={cat.title} className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {cat.title}
          </h2>
          <div className="space-y-1">
            {cat.modelIds.map((id) => {
              const model = getModelById(id);
              if (!model) return null;
              const active = activeModels.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleModel(id)}
                  aria-pressed={active}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition-colors',
                    active ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-secondary'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold',
                      providerColors[model.providerSlug] || 'bg-secondary text-muted-foreground'
                    )}
                  >
                    {model.provider.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{model.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{model.provider}</div>
                  </div>
                  {active && (
                    <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-72 shrink-0 border-r border-border/60 bg-card/50 md:flex md:flex-col">
        <div className="p-4">
          <button className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 pb-4">
          {renderCategoryList()}
        </div>
      </aside>

      {/* Chat area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Cpu className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate text-sm font-medium">
              {activeModels.length} model{activeModels.length !== 1 ? 's' : ''} active
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* Desktop: horizontally-scrollable model chips */}
            <div className="hidden max-w-[60vw] items-center gap-2 overflow-x-auto scrollbar-thin md:flex">
              {activeModels.map((id) => {
                const model = getModelById(id);
                if (!model) return null;
                return (
                  <span
                    key={id}
                    className={cn(
                      'shrink-0 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap',
                      providerColors[model.providerSlug] || 'bg-secondary'
                    )}
                  >
                    {model.name}
                  </span>
                );
              })}
            </div>
            {/* Mobile: Models drawer trigger */}
            <button
              type="button"
              onClick={openPicker}
              aria-label="Choose models"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-border/60 bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary md:hidden"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Models
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto max-w-3xl px-4 py-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground/40" />
                <h3 className="text-lg font-medium">Start a conversation</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select models from the sidebar and send a message
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'mb-6 flex gap-3',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {msg.role === 'assistant' && msg.providerSlug && (
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
                      providerColors[msg.providerSlug] || 'bg-secondary text-muted-foreground'
                    )}
                  >
                    {msg.provider?.charAt(0)}
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-3',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary'
                  )}
                >
                  {msg.role === 'assistant' && msg.model && (
                    <div className="mb-1 text-xs font-medium text-muted-foreground">
                      {msg.model}
                    </div>
                  )}
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border/60 p-4">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-end gap-2 rounded-xl border border-border bg-card p-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30">
              <button
                type="button"
                aria-label="Attach"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <textarea
                placeholder="Send a message…"
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                inputMode="text"
                className="min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-base outline-none placeholder:text-muted-foreground"
                style={{ maxHeight: '120px' }}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim() || activeModels.length === 0}
                aria-label="Send message"
                className={cn(
                  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-all',
                  input.trim() && activeModels.length > 0
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'text-muted-foreground'
                )}
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Responses are simulated. Connect the 1Router API to enable live chat.
            </p>
          </div>
        </div>
      </div>

      {/* Mobile model picker drawer */}
      <dialog
        ref={pickerRef}
        aria-label="Choose models"
        className="fixed inset-y-0 right-0 m-0 flex h-full w-80 max-w-full flex-col border-l border-border bg-background p-0 text-foreground shadow-2xl translate-x-full transition-transform duration-200 ease-out open:translate-x-0 md:hidden"
      >
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <h2 className="text-base font-semibold">Choose models</h2>
          <button
            type="button"
            onClick={closePicker}
            aria-label="Close model picker"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 pb-4 pt-2">
          {renderCategoryList()}
        </div>
        <div className="border-t border-border/60 px-5 py-4">
          <button
            type="button"
            onClick={closePicker}
            className="flex min-h-[44px] w-full items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Done ({activeModels.length} selected)
          </button>
        </div>
      </dialog>
    </div>
  );
}
