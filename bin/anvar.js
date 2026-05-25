#!/usr/bin/env node
'use strict';

const readline        = require('readline');
const { loadConfig }  = require('../src/config');
const { Agent }       = require('../src/agent');
const { executeTool } = require('../src/tools');

const G   = '\x1b[32m';
const C   = '\x1b[36m';
const DIM = '\x1b[2m';
const R   = '\x1b[0m';
const B   = '\x1b[1m';

const BANNER = `${G}
    _    _   ___   ___  __     ____  ____ _____
   / \\  | \\ | \\ \\ / / \\ \\ /  / ___|  _ \\_   _|
  / _ \\ |  \\| |\\ V / _ \\ V /| |  _| |_) || |
 / ___ \\| |\\  | | |/ ___ \\| | | |_| |  __/ | |
/_/   \\_\\_| \\_| |_/_/   \\_\\_|  \\____|_|    |_|
${R}`;

const HELP = `
${G}Commands:${R}
  ${C}/clear${R}       Clear conversation history
  ${C}/model ID${R}    Switch model (e.g. /model openai/gpt-4o)
  ${C}/cwd${R}         Show current working directory
  ${C}/ls${R}          List files in current directory
  ${C}/exit${R}        Exit Anvar GPT
`;

async function main() {
  const config = loadConfig();

  console.clear();
  console.log(BANNER);
  console.log(`${DIM}  Anvar GPT v1.0  model=${G}${config.model}${R}${DIM}  cwd=${G}${process.cwd()}${R}`);
  console.log(`${DIM}  Type /help for commands  Ctrl+C to exit${R}\n`);

  const agent = new Agent(config);
  const rl    = readline.createInterface({ input: process.stdin, output: process.stdout });

  rl.on('SIGINT', () => { console.log(`\n${DIM}Goodbye.${R}`); process.exit(0); });

  const prompt = () => {
    rl.question(`${B}${G}anvar >${R} `, async (input) => {
      input = input.trim();
      if (!input) return prompt();

      if (['/exit', '/quit', '/q'].includes(input)) {
        console.log(`${DIM}Goodbye.${R}`); process.exit(0);
      }
      if (input === '/help')  { console.log(HELP); return prompt(); }
      if (input === '/clear') { console.clear(); agent.clearHistory(); console.log(`${DIM}History cleared.${R}\n`); return prompt(); }
      if (input === '/cwd')   { console.log(`${G}${process.cwd()}${R}\n`); return prompt(); }
      if (input === '/ls')    { console.log(executeTool('list_directory', { path: '.' }) + '\n'); return prompt(); }
      if (input.startsWith('/model ')) {
        const m = input.slice(7).trim();
        agent.setModel(m);
        console.log(`${G}Model -> ${m}${R}\n`);
        return prompt();
      }

      await agent.chat(input);
      prompt();
    });
  };

  prompt();
}

main().catch(err => { console.error('\x1b[31mFatal:\x1b[0m', err.message); process.exit(1); });
