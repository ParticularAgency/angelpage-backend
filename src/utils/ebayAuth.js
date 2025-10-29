/* eslint-env node */
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

/* ---------------------------------------------
   🧠 eBay OAuth Token Manager (JavaScript)
--------------------------------------------- */

const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID;
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET;
const EBAY_ENV = process.env.EBAY_ENV || 'PRODUCTION'; // or 'SANDBOX'

const TOKEN_URL =
  EBAY_ENV === 'PRODUCTION'
    ? 'https://api.ebay.com/identity/v1/oauth2/token'
    : 'https://api.sandbox.ebay.com/identity/v1/oauth2/token';

let currentToken = null;
let tokenExpiry = 0;

/**
 * 🪙 Request a fresh OAuth token from eBay
 */
export async function fetchNewToken() {
  const credentials = Buffer.from(
    `${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`
  ).toString('base64');

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'https://api.ebay.com/oauth/api_scope',
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`❌ Failed to get eBay token: ${res.status} ${errText}`);
  }

  const data = await res.json();
  currentToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // refresh 1 min early

  console.log(
    `🔑 New eBay token fetched, valid for ${Math.round(
      data.expires_in / 60
    )} minutes`
  );

  return currentToken;
}

/**
 * 🔄 Get current token, auto-refresh if expired
 */
export async function getValidToken() {
  if (!currentToken || Date.now() > tokenExpiry) {
    return await fetchNewToken();
  }
  return currentToken;
}

/**
 * ♻️ Optional auto-refresh background task (every 2 hours)
 */
export function startAutoRefresh(intervalMinutes = 110) {
  setInterval(async () => {
    try {
      await fetchNewToken();
      console.log('♻️ eBay token refreshed automatically');
    } catch (err) {
      console.error('❌ Token auto-refresh failed:', err);
    }
  }, intervalMinutes * 60 * 1000);
}
