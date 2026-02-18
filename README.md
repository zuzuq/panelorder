# Nexus Telegram Bot

This project is a complete stbarting point for a Telegram bot to sell Pterodactyl panels automatically.

## Structure
- index.js           - main bot file (Telegraf)
- config.js          - configuration (tokens, keys)
- package.json       - npm dependencies
- src/
  - ptero.js         - Pterodactyl API helpers
  - atlantic.js      - Atlantic payment helpers
  - products.json    - product list
  - orders.json      - runtime order storage
  - premium.json     - premium users list
  - media/start.jpg  - start image placeholder

## How to use
1. Replace values in `config.js` with your real tokens & keys.
2. (Optional) Replace `src/media/start.jpg` with a proper welcome image.
3. Upload to your Pterodactyl Panel.
4. Run:
   ```
   npm install
   npm start
   ```
5. Test with a Telegram account and the bot token.

## Notes & Warnings
- This project uses the Atlantic example endpoints (`https://atlantich2h.com/...`) — make sure your provider's endpoints/parameters match.
- For production, prefer webhooks for payment notifications instead of polling.
- Keep your API keys and tokens private.
