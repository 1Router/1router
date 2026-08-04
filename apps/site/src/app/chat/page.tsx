'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Send, Plus, MessageSquare, Cpu, SlidersHorizontal, X, AlertCircle, Loader2, StopCircle, Copy, Check, Sparkles } from 'lucide-react';
import { models, providerColors } from '@1router/models';
import { cn } from '@/lib/utils';
import { streamChatCompletion, type ChatMessage as ApiChatMessage } from '@/lib/chat-api';

// ── Lightweight inline markdown ──────────────────────────────────────
// Renders **bold**, `inline code`, and [links](url) without pulling in
// a full markdown library. Good enough for LLM responses.

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Split on markdown patterns while keeping the delimiters
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);

  parts.forEach((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      nodes.push(<strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>);
    } else if (part.startsWith('`') && part.endsWith('`')) {
      nodes.push(
        <code key={i} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      );
    } else if (part.startsWith('[') && part.includes('](')) {
      const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (match) {
        nodes.push(
          <a key={i} href={match[2]} target="_blank" rel="noopener noreferrer"
             className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary">
            {match[1]}
          </a>
        );
      } else {
        nodes.push(part);
      }
    } else if (part) {
      nodes.push(part);
    }
  });

  return nodes;
}

function renderMarkdown(content: string): React.ReactNode {
  const blocks = content.split(/(```[\s\S]*?```)/g);

  return blocks.map((block, i) => {
    if (block.startsWith('```') && block.endsWith('```')) {
      const inner = block.slice(3, -3);
      const newlineIdx = inner.indexOf('\n');
      const lang = newlineIdx > 0 ? inner.slice(0, newlineIdx).trim() : '';
      const code = newlineIdx > 0 ? inner.slice(newlineIdx + 1) : inner;

      return <CodeBlock key={i} code={code} lang={lang} />;
    }

    // Split into paragraphs by double newlines
    const paragraphs = block.split(/\n\n+/).filter((p) => p.trim());

    return paragraphs.map((para, j) => {
      const lines = para.split('\n');
      const isList = lines.every((l) => /^\s*[-*]\s+/.test(l));

      if (isList) {
        return (
          <ul key={`${i}-${j}`} className="mb-2 ml-4 list-disc space-y-1">
            {lines.map((line, k) => (
              <li key={k}>{renderInlineMarkdown(line.replace(/^\s*[-*]\s+/, ''))}</li>
            ))}
          </ul>
        );
      }

      return (
        <p key={`${i}-${j}`} className="mb-2 last:mb-0">
          {lines.map((line, k) => (
            <span key={k}>
              {renderInlineMarkdown(line)}
              {k < lines.length - 1 && <br />}
            </span>
          ))}
        </p>
      );
    });
  });
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative mb-3 overflow-hidden rounded-lg border border-border/60 bg-muted/50">
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-3 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">{lang || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy code"
          className="inline-flex min-h-[28px] items-center gap-1 rounded px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-sm font-mono leading-relaxed scrollbar-thin">
        <code className="text-foreground">{code}</code>
      </pre>
    </div>
  );
}

// ── Chat types ───────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  provider?: string;
  providerSlug?: string;
  isError?: boolean;
  isStreaming?: boolean;
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

const examplePrompts = [
  'Explain quantum computing in simple terms',
  'Write a Python function to merge two sorted lists',
  'What are the trade-offs between SQL and NoSQL?',
  'Give me a creative name for a coffee shop',
];

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatContent />
    </Suspense>
  );
}

function ChatContent() {
  const searchParams = useSearchParams();
  const modelParam = searchParams.get('model');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [activeModels, setActiveModels] = useState<string[]>(() => {
    if (modelParam) {
      const exists = models.find((m) => m.id === modelParam);
      if (exists) return [modelParam];
    }
    return ['anthropic/claude-3.7-sonnet', 'openai/gpt-4o'];
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDialogElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [input]);

  // Close picker on backdrop click
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

  // Cleanup on unmount
  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  const toggleModel = (id: string) => {
    setActiveModels((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
    );
  }, []);

  const handleSend = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || activeModels.length === 0 || isStreaming) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);

    const conversationHistory: ApiChatMessage[] = [
      ...messages
        .filter((m) => !m.isError)
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      { role: 'user' as const, content },
    ];

    const controller = new AbortController();
    abortControllerRef.current = controller;

    await Promise.all(
      activeModels.map(async (modelId) => {
        const model = models.find((m) => m.id === modelId);
        if (!model) return;

        const assistantId = `assistant-${Date.now()}-${modelId.replace(/\//g, '-')}`;

        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: 'assistant',
            content: '',
            model: model.name,
            provider: model.provider,
            providerSlug: model.providerSlug,
            isStreaming: true,
          },
        ]);

        const apiMessages: ApiChatMessage[] =
          activeModels.length === 1
            ? conversationHistory
            : [{ role: 'user', content }];

        let accumulated = '';

        await streamChatCompletion(
          modelId,
          apiMessages,
          {
            onToken: (token) => {
              accumulated += token;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: accumulated } : m
                )
              );
            },
            onDone: () => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, isStreaming: false, content: accumulated || m.content }
                    : m
                )
              );
            },
            onError: (error) => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        isStreaming: false,
                        isError: true,
                        content: error.message || 'Failed to get response',
                      }
                    : m
                )
              );
            },
          },
          controller.signal,
        );
      }),
    );

    setIsStreaming(false);
    abortControllerRef.current = null;
  }, [input, activeModels, isStreaming, messages]);

  const handleNewChat = useCallback(() => {
    if (isStreaming) handleStop();
    setMessages([]);
    setInput('');
  }, [isStreaming, handleStop]);

  const closePicker = () => pickerRef.current?.close();
  const openPicker = () => pickerRef.current?.showModal();

  const getModelById = (id: string) => models.find((m) => m.id === id);

  const hasMessages = messages.length > 0;
  const canSend = input.trim().length > 0 && activeModels.length > 0 && !isStreaming;

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
    <div className="chat-viewport flex min-w-0 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-72 shrink-0 border-r border-border/60 bg-card/50 md:flex md:flex-col">
        <div className="p-4">
          <button
            onClick={handleNewChat}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 pb-4">
          {renderCategoryList()}
        </div>
      </aside>

      {/* Chat area */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Cpu className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate text-sm font-medium">
              {activeModels.length} model{activeModels.length !== 1 ? 's' : ''} active
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
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
            {!hasMessages && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <MessageSquare className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Start a conversation</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Select models from the sidebar and send a message
                </p>
                {activeModels.length === 0 && (
                  <p className="mt-2 text-sm text-destructive">
                    Select at least one model to begin
                  </p>
                )}
                {/* Example prompts */}
                {activeModels.length > 0 && (
                  <div className="mt-8 grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
                    {examplePrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => handleSend(prompt)}
                        className="group flex items-center gap-2.5 rounded-xl border border-border/60 bg-card px-4 py-3 text-left text-sm text-muted-foreground transition-all hover:border-primary/30 hover:text-foreground hover:shadow-sm"
                      >
                        <Sparkles className="h-4 w-4 shrink-0 text-primary/60 transition-colors group-hover:text-primary" />
                        <span className="line-clamp-2">{prompt}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                onCopy={() => navigator.clipboard.writeText(msg.content)}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border/60 p-4 pb-safe">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-end gap-2 rounded-xl border border-border bg-card p-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 transition-colors">
              <textarea
                ref={textareaRef}
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
                className="min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-base outline-none placeholder:text-muted-foreground max-h-[120px]"
              />
              {isStreaming ? (
                <button
                  type="button"
                  onClick={handleStop}
                  aria-label="Stop generation"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
                >
                  <StopCircle className="h-5 w-5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!canSend}
                  aria-label="Send message"
                  className={cn(
                    'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-all',
                    canSend
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'text-muted-foreground'
                  )}
                >
                  <Send className="h-5 w-5" />
                </button>
              )}
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {activeModels.length === 0
                ? 'Select at least one model to start chatting'
                : isStreaming
                  ? 'Generating responses…'
                  : 'Responses stream live from the 1Router API'}
            </p>
          </div>
        </div>
      </div>

      {/* Mobile model picker drawer */}
      <dialog
        ref={pickerRef}
        aria-label="Choose models"
        className="fixed inset-y-0 right-0 m-0 flex h-full w-80 max-w-full flex-col border-l border-border bg-background p-0 pb-safe text-foreground shadow-2xl translate-x-full transition-transform duration-200 ease-out open:translate-x-0 md:hidden"
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

// ── Message bubble with copy + markdown ──────────────────────────────

function MessageBubble({ msg, onCopy }: { msg: ChatMessage; onCopy: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'group mb-6 flex gap-3',
        msg.role === 'user' ? 'justify-end' : 'justify-start'
      )}
    >
      {msg.role === 'assistant' && msg.providerSlug && (
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
            providerColors[msg.providerSlug] || 'bg-secondary text-muted-foreground',
            msg.isStreaming && 'animate-pulse'
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
            : msg.isError
              ? 'bg-destructive/10 border border-destructive/30'
              : 'bg-secondary'
        )}
      >
        {msg.role === 'assistant' && msg.model && (
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              {msg.isError && <AlertCircle className="h-3 w-3 text-destructive" />}
              {msg.isStreaming && <Loader2 className="h-3 w-3 animate-spin" />}
              {msg.model}
            </div>
            {/* Copy button — appears on hover for completed messages */}
            {!msg.isStreaming && !msg.isError && msg.content && (
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy response"
                className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100 max-md:opacity-60"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        )}
        <div className="text-sm leading-relaxed">
          {msg.role === 'assistant' && !msg.isError ? (
            <>
              {renderMarkdown(msg.content)}
              {msg.isStreaming && !msg.content && (
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Waiting for response…
                </span>
              )}
              {msg.isStreaming && msg.content && (
                <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-foreground/70 align-middle" />
              )}
              {!msg.isStreaming && !msg.content && (
                <span className="text-muted-foreground italic">(No response received)</span>
              )}
            </>
          ) : (
            <p className="whitespace-pre-wrap">{msg.content}</p>
          )}
        </div>
      </div>
    </div>
  );
}
