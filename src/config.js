'use strict';
const fs   = require('fs');
const path = require('path');
const os   = require('os');


const DEFAULTS = {
  apiKey:  process.env.OPENROUTER_API_KEY || '',
  model:   'openai/gpt-oss-120b',
  baseUrl: 'https://openrouter.ai/api/v1',
};

function loadConfig() {
  const cfgFile = path.join(os.homedir(), '.anvar-gpt', 'config.json');
  if (fs.existsSync(cfgFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
      if (data.api_key) return { ...DEFAULTS, apiKey: data.api_key };
    } catch (_) {}
  }
  return { ...DEFAULTS };
}

module.exports = { loadConfig };
