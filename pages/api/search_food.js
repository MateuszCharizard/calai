// pages/api/search_food.js

import crypto from 'crypto';
import axios from 'axios';

const consumerKey = process.env.CONSUMER_KEY;
const consumerSecret = process.env.CONSUMER_SECRET;

function generateNonce(length = 32) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let nonce = '';
  for (let i = 0; i < length; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}

function percentEncode(str) {
  return encodeURIComponent(str)
    .replace(/\!/g, '%21')
    .replace(/\'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

function createSignatureBaseString(method, url, params) {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join('&');

  return [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(sortedParams),
  ].join('&');
}

function createSigningKey(consumerSecret, tokenSecret = '') {
  return `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
}

function createOAuthSignature(baseString, signingKey) {
  return crypto
    .createHmac('sha1', signingKey)
    .update(baseString)
    .digest('base64');
}

export default async function handler(req, res) {
  const { query } = req.query;

  if (!query) return res.status(400).json({ error: 'query param is required' });

  try {
    const method = 'GET';
    const url = 'https://platform.fatsecret.com/rest/server.api';

    // OAuth parameters
    const oauthParams = {
      oauth_consumer_key: consumerKey,
      oauth_nonce: generateNonce(),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_version: '1.0',
    };

    // API method parameters
    const apiParams = {
      method: 'foods.search',
      search_expression: query,
      format: 'json',
    };

    // Combine all params for signature base string
    const allParams = { ...oauthParams, ...apiParams };

    // Create signature base string
    const baseString = createSignatureBaseString(method, url, allParams);

    // Create signing key (no token secret)
    const signingKey = createSigningKey(consumerSecret);

    // Create OAuth signature
    const oauthSignature = createOAuthSignature(baseString, signingKey);

    // Add signature to params
    const finalParams = { ...allParams, oauth_signature: oauthSignature };

    // Build final request URL
    const finalUrl = `${url}?${new URLSearchParams(finalParams).toString()}`;

    // Make request to FatSecret
    const response = await axios.get(finalUrl);

    return res.status(200).json(response.data);
  } catch (error) {
    console.error('FatSecret API error:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Error fetching food data' });
  }
}
