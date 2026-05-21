/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Expense, Category } from '../types';
import { formatCurrency } from '../utils';
import { Sparkles, Send, Bot, X, MessageSquare, RefreshCw, HelpCircle, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AIAdvisorProps {
  expenses: Expense[];
  categories: Category[];
  currencySymbol: string;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export function AIAdvisor({ expenses, categories, currencySymbol }: AIAdvisorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      role: 'model',
      text: 'Hello! I am **NestLedger Advisor**, your Gemini-powered personal wealth manager. I am fully synchronized with your household budget spreadsheet.\n\nAsk me anything like:\n* *"Where did my money go this month?"*\n* *"How can I save on bills?"*\n* *"What is my highest expense category?"*',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto Scroll Chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      text: textToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: messages.map((m) => ({ role: m.role, text: m.text })),
          expenses,
          categories,
          currencySymbol,
        }),
      });

      const data = await response.json();
      const modelMsg: Message = {
        id: `msg-model-${Date.now()}`,
        role: 'model',
        text: data.reply || "I didn't receive a reply. Please try again.",
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          role: 'model',
          text: '⚠️ **Connection Error**: Failed to reach the advisor server. Check your dev server or GEMINI_API_KEY.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Simple, robust clean markdown renderer to avoid React-Markdown parsing bugs
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let content = line;

      // Handle bullets
      const isBullet = content.trim().startsWith('* ') || content.trim().startsWith('- ');
      if (isBullet) {
        content = content.replace(/^[\s]*[\*\-]\s/, '');
      }

      // Parse bold markers (`**bold text**`)
      const parts = content.split('**');
      const renderedParts = parts.map((part, partIdx) => {
        // odd indices were surrounded by **
        if (partIdx % 2 === 1) {
          return <strong key={partIdx} className="font-extrabold text-white text-shadow-sm">{part}</strong>;
        }
        return part;
      });

      if (isBullet) {
        return (
          <li key={idx} className="ml-4 list-disc pl-1 text-slate-350 text-[12px] leading-relaxed my-1">
            {renderedParts}
          </li>
        );
      }

      return (
        <p key={idx} className="text-slate-200 text-[12px] leading-relaxed mb-2">
          {renderedParts}
        </p>
      );
    });
  };

  const quickQuestions = [
    'What is my largest expenditure?',
    'Give me budget tips to save money',
    'How much total did I spend this period?',
  ];

  return (
    <>
      {/* Dynamic Floating Trigger button */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          id="btn-trigger-ai-chat"
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-14 h-14 bg-gradient-to-tr from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white shadow-[0_8px_32px_rgba(139,92,246,0.35)] cursor-pointer hover:shadow-[0_12px_40px_rgba(139,92,246,0.5)] border border-white/20 transition-all focus:outline-none relative"
        >
          {isOpen ? <X size={22} className="stroke-[2.5]" /> : <MessageSquare size={22} className="stroke-[2.2]" />}
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-pink-500"></span>
          </span>
        </motion.button>
      </div>

      {/* Slide up panel container */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="ai-advisor-sidebar"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed bottom-24 right-6 w-[360px] sm:w-[410px] h-[550px] rounded-3xl glass shadow-[0_16px_50px_rgba(15,23,42,0.8)] border border-white/15 overflow-hidden flex flex-col z-50"
          >
            {/* Header branding */}
            <div className="p-4 bg-gradient-to-r from-purple-950/45 to-blue-950/45 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 animate-pulse">
                  <Bot size={18} className="stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="text-xs font-black tracking-wider text-white uppercase flex items-center gap-1.5">
                    NestLedger AI Advisor
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold font-mono">Live</span>
                  </h4>
                  <p className="text-[9px] text-slate-400 font-semibold leading-none mt-0.5">Gemini 3.5-powered financial modeling</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 bg-white/5 rounded-lg text-slate-400 hover:text-white flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all border border-white/5"
              >
                <X size={14} className="stroke-[2.5]" />
              </button>
            </div>

            {/* Chat list views */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[360px]">
              {messages.map((m) => {
                const isModel = m.role === 'model';
                return (
                  <div key={m.id} className={`flex items-start gap-2.5 ${!isModel ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                      isModel 
                        ? 'bg-purple-600/10 border-purple-500/20 text-purple-400' 
                        : 'bg-blue-600/10 border-blue-500/20 text-blue-400'
                    }`}>
                      {isModel ? <Bot size={14} /> : <HelpCircle size={14} />}
                    </div>
                    <div className={`max-w-[80%] rounded-2xl p-3 border text-xs leading-relaxed ${
                      isModel 
                        ? 'bg-white/[0.03] border-white/5 text-slate-200 rounded-tl-none' 
                        : 'bg-blue-600/80 border-blue-500 text-white shadow-lg shadow-blue-600/10 rounded-tr-none'
                    }`}>
                      {renderMarkdown(m.text)}
                    </div>
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-600/10 border border-purple-500/20 text-purple-400 flex items-center justify-center animate-spin">
                    <RefreshCw size={13} />
                  </div>
                  <div className="max-w-[80%] bg-white/[0.03] border border-white/5 text-xs text-slate-400 rounded-2xl p-3 rounded-tl-none italic flex items-center gap-2">
                    Reviewing household ledger spreadsheets...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions drawer */}
            <div className="px-4 py-2 border-t border-white/5 bg-white/[0.01]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400/80 font-mono flex items-center gap-1 mb-2">
                <Sparkles size={11} /> Quick Queries
              </span>
              <div className="flex flex-col gap-1.5">
                {quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(q)}
                    disabled={isLoading}
                    className="text-left py-1 px-2.5 bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 hover:text-white rounded-lg border border-white/5 cursor-pointer max-w-full text-ellipsis overflow-hidden whitespace-nowrap transition-all"
                  >
                    💡 {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Action text field */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(inputValue);
              }}
              className="p-3 border-t border-white/10 bg-slate-950/65 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
                placeholder="Ask about bills, utilities, grocery lists..."
                className="flex-1 bg-white/5 border border-white/10 text-[12px] text-white py-2 px-3 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all rounded-xl placeholder-slate-500"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="w-9 h-9 bg-purple-600 hover:bg-purple-700 text-white rounded-xl flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:hover:bg-purple-600 disabled:cursor-not-allowed shrink-0"
              >
                <Send size={15} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
