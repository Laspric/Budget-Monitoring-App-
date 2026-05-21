/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Body parsing middlewares
app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI SDK with required custom headers
let ai: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } else {
    console.warn('GEMINI_API_KEY not configured. Gemini features will default to fallback tips.');
  }
} catch (err) {
  console.error('Failed to initialize Google Gen AI SDK:', err);
}

// 1. API: Analyze Spending Patterns & Exceeding Categories
app.post('/api/gemini/insights', async (req, res) => {
  const { categories, currencySymbol, viewMode, activeLabel } = req.body;

  if (!ai) {
    return res.json({
      success: false,
      error: 'GEMINI_API_KEY is missing. Please add your key in Settings > Secrets.',
      markdown: `### ⚠️ AI Service Offline\n\nTo generate tailored spending insights using **Gemini**, please add your **GEMINI_API_KEY** in the **Settings > Secrets** panel in AI Studio.\n\nHere are some classic savings tips to get you started:\n\n* **Cook at home more**: Discretionary food and groceries are often the easiest category to Trim.\n* **Audit utility subscriptions**: Check internet, cable, heating, and power plans for lower tier plans.\n* **Verify recurring insurance**: Regularly shop around for competitive premium quotes on house insurance.\n`
    });
  }

  try {
    // Generate context summary
    const exceedsList = categories
      .filter((c: any) => c.budget && c.spent > c.budget)
      .map((c: any) => `* **${c.name}** was exceeded! Budget: ${currencySymbol}${c.budget}, Spent: ${currencySymbol}${c.spent} (Over by ${currencySymbol}${(c.spent - c.budget).toFixed(2)})`);

    const closeList = categories
      .filter((c: any) => c.budget && c.spent > 0 && c.spent <= c.budget && (c.spent / c.budget) >= 0.8)
      .map((c: any) => `* **${c.name}** is close to budget cap! Budget: ${currencySymbol}${c.budget}, Spent: ${currencySymbol}${c.spent} (Used: ${((c.spent / c.budget) * 100).toFixed(0)}%)`);

    const summaryList = categories
      .map((c: any) => `- **${c.name}**: Spent ${currencySymbol}${c.spent.toFixed(2)}${c.budget ? ` / Budget ${currencySymbol}${c.budget.toFixed(2)}` : ''}`);

    const prompt = `You are an elite, highly professional household financial advisor and saving specialist. Your objective is to analyze the user's spending data and provide action-oriented, encouraging saving suggestions.

Focus Details:
- Current Calendar Period: ${activeLabel || 'Selected interval'} (${viewMode} view mode)
- Selected Currency: ${currencySymbol}

Categories Spent & Budget breakdown:
${summaryList.join('\n')}

Budget Exceeded list:
${exceedsList.length > 0 ? exceedsList.join('\n') : 'Perfect job! No budgets exceeded.'}

Budget Nearing Limit (>=80%) list:
${closeList.length > 0 ? closeList.join('\n') : 'No categories approaching limit.'}

Please output structured, concise Markdown explaining:
1. **Spending Health Analysis**: A brief, warm, professional feedback paragraph on how they did during this ${viewMode} tracking period. Be extremely encouraging!
2. **Actionable Saving Tips**:
   - If any category *exceeded* or is *nearing* its limit, prioritize custom advice for those categories. Provide 2-3 genuine, practical, or creative ways to cut costs there.
   - If no category exceeded the budget, suggest general smart strategies to optimize utilities, subscription bills, energy use, or cooking budgets.
3. Keep the tone friendly, objective, supportive, and extremely clean. Refrain from listing file paths, database code, or developer remarks. Use bold headings and clean bullet points. Write up to 300 words.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    res.json({
      success: true,
      markdown: response.text || 'No insights generated.',
    });
  } catch (error: any) {
    console.error('Error generating insights:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. API: Grounded AI Spending Assistant Ask Anything
app.post('/api/gemini/chat', async (req, res) => {
  const { message, history, expenses, categories, currencySymbol } = req.body;

  if (!ai) {
    return res.json({
      reply: `⚠️ **AI Assistant Offline**\n\nPlease add your **GEMINI_API_KEY** in **Settings > Secrets** in the AI Studio menu to enable chat conversations with your AI spending advisor.`
    });
  }

  try {
    // Generate context for grounding
    const expensesCount = expenses?.length || 0;
    const oldestDate = expensesCount > 0 ? expenses[expenses.length - 1].date : 'N/A';
    const newestDate = expensesCount > 0 ? expenses[0].date : 'N/A';

    // Group expenses by category for summarizing
    const categoryTotals: Record<string, number> = {};
    expenses?.forEach((e: any) => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });

    const categorySummary = categories?.map((c: any) => {
      const spent = categoryTotals[c.id] || 0;
      return `- **${c.name}** (ID: ${c.id}): Total Spent ${currencySymbol}${spent.toFixed(2)}${c.budget ? `, Monthly Budget ${currencySymbol}${c.budget.toFixed(2)}` : ''}`;
    }).join('\n');

    // Filter down some recent transactions to keep token size compact but informative
    const recentExpenses = expenses?.slice(0, 30).map((e: any) => 
      `* [${e.date}] ${e.payee}: ${currencySymbol}${e.amount.toFixed(2)} - category: ${e.category} (${e.description || ''})`
    ).join('\n');

    const systemContext = `You are "NestLedger Advisor", an incredibly elegant, intelligent, and helpful personal wealth advisor integrated into the house expenses app.
Your job is to answer questions about the user's spending database and give expert budgeting advice.

Here is the real financial database profile for the user:
- Total Transacted Records: ${expensesCount}
- Active Currency Symbol: ${currencySymbol}
- Date Range: From ${oldestDate} to ${newestDate}
- Categories Overview:
${categorySummary}

Here is a list of the 30 most recent expenditures:
${recentExpenses}

Guidelines:
1. Ground your answers in this real database! If they ask "What did I spend on NetFlix?" or "how much total did I search", find matching payee/descriptions in the list above or compute totals based on the categories summary provided.
2. If they ask about an expense NOT in the recent 30 items or categories summary, advise politely that you searched recent activity logs but they can filter the database using the search bar.
3. Be professional, creative, and highly specific! If they ask "how to save on groceries", give genuine cook-at-home ideas, bulk buy options, or seasonal buying strategies.
4. Keep answers concise, neat, formatting with elegant markdown. Avoid technical developer Jargon or system architecture comments. Maintain deep respect and objective voice.`;

    const contents = [];
    // Inject system instructions and history
    contents.push({ role: 'user', parts: [{ text: systemContext }] });
    contents.push({ role: 'model', parts: [{ text: 'Understood. I am online and fully grounded in the user\'s real financial database as NestLedger Advisor. What financial questions can I resolve today?' }] });

    // Append chat history formatting
    history?.forEach((chat: any) => {
      contents.push({
        role: chat.role === 'user' ? 'user' : 'model',
        parts: [{ text: chat.text }],
      });
    });

    // Add current message
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents,
    });

    res.json({
      reply: response.text || 'No response formulated.',
    });
  } catch (error: any) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Configure client environment / dev settings or server static code
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express full-stack server running on http://localhost:${PORT}`);
  });
}

start();
