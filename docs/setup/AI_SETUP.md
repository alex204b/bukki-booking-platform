# AI Assistant Setup Guide

The AI Assistant uses AI APIs to understand natural language queries and help users find businesses. It supports Gemini and Hugging Face, and falls back to keyword matching if AI fails.

## AI Provider Options

### Option 1: Google Gemini (Free tier)
**May have regional restrictions in some countries.**

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Add to your `.env` file:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

**Free Tier:** 15 requests per minute, 1,500 requests per day.

### Option 2: Hugging Face (Free – recommended for Moldova)
**Works globally, including Moldova.**

1. Go to [Hugging Face](https://huggingface.co/)
2. Sign up and create a token at [Settings > Access Tokens](https://huggingface.co/settings/tokens)
3. Add to your `.env` file:
   ```
   HUGGINGFACE_API_KEY=your_token_here
   AI_PROVIDER=huggingface
   ```

**Free Tier:** 30 requests per minute.

## For Moldova & Regions Where Gemini Doesn't Work

Use **Hugging Face** – add `HUGGINGFACE_API_KEY` and set `AI_PROVIDER=huggingface` in your `.env`. It’s free and works in Moldova.

## Setup Instructions

1. **Get an API key** (choose one of the options above)

2. **Add to backend `.env` file:**
   ```env
   # For Moldova (free):
   HUGGINGFACE_API_KEY=your_token_here
   AI_PROVIDER=huggingface

   # OR for other regions:
   GEMINI_API_KEY=your_gemini_key_here
   ```

3. **Restart your backend server:**
   ```bash
   cd backend
   npm run start:dev
   ```

4. **That's it!** The AI Assistant will now use real AI to understand queries.

## How It Works

- **With API Key:** Uses AI (Gemini or Hugging Face) to parse natural language
- **Auto fallback:** If `AI_PROVIDER=auto` (default) and you have both keys, it tries Gemini first, then Hugging Face if Gemini fails (e.g. regional restriction)
- **Without API Key:** Falls back to intelligent keyword matching (still works!)

## Example Queries That Work

- "I need a barbershop"
- "fix my car then eat something"
- "haircut and restaurant"
- "mechanic today"
- "I want to get my hair done and then grab lunch"

## Troubleshooting

**AI not working?**
- Check that your API key is in the `.env` file
- Make sure the backend server was restarted after adding the key
- Check backend logs for any API errors
- The system will automatically fall back to keyword matching if AI fails

**Rate Limits?**
- Gemini: 15 requests/minute (free tier)
- Hugging Face: 30 requests/minute (free tier)
- If you hit limits, the system falls back to keyword matching

## Cost

**100% FREE** - Both options have generous free tiers that are perfect for development and small-scale production use!

