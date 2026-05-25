'use strict';
const OpenAI       = require('openai');
const { TOOLS, executeTool } = require('./tools');

const SYSTEM_PROMPT = `You are Anvar GPT - a powerful terminal AI agent, like Claude Code.

You help users with:
- Writing, reading, and editing code and files
- Running shell commands and debugging errors
- Explaining concepts and answering questions
- Building projects from scratch

You have access to tools: read_file, write_file, create_file, list_directory, run_command.
Use them proactively when it makes sense - don't ask, just act.
Be concise, direct, and technically precise. Terminal style.`;

class Agent {
  constructor(config) {
    this.client = new OpenAI({
      apiKey:  config.apiKey,
      baseURL: config.baseUrl,
      defaultHeaders: {
        'HTTP-Referer': 'http://localhost:8000',
        'X-Title':      'Anvar GPT',
      },
    });
    this.model   = config.model;
    this.history = [];
  }

  setModel(model)   { this.model = model; }
  clearHistory()    { this.history = []; }

  async chat(userInput) {
    this.history.push({ role: 'user', content: userInput });
    const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...this.history];

    for (let round = 0; round < 10; round++) {
      let fullText       = '';
      let toolCallsRaw   = {};
      let finishReason   = null;
      let started        = false;

      try {
        const stream = await this.client.chat.completions.create({
          model:       this.model,
          messages,
          tools:       TOOLS,
          tool_choice: 'auto',
          stream:      true,
        });

        for await (const chunk of stream) {
          const choice = chunk.choices?.[0];
          if (!choice) continue;
          finishReason = choice.finish_reason || finishReason;
          const delta  = choice.delta;

          if (delta.content) {
            if (!started) { process.stdout.write('\n'); started = true; }
            process.stdout.write(delta.content);
            fullText += delta.content;
          }

          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const i = tc.index;
              if (!toolCallsRaw[i]) toolCallsRaw[i] = { id: '', name: '', arguments: '' };
              if (tc.id)                  toolCallsRaw[i].id        = tc.id;
              if (tc.function?.name)      toolCallsRaw[i].name     += tc.function.name;
              if (tc.function?.arguments) toolCallsRaw[i].arguments += tc.function.arguments;
            }
          }
        }
      } catch (e) {
        process.stdout.write(`\n\x1b[31mAPI error: ${e.message}\x1b[0m\n\n`);
        return;
      }

      if (fullText) process.stdout.write('\n');

      if (finishReason !== 'tool_calls' || !Object.keys(toolCallsRaw).length) {
        if (fullText) this.history.push({ role: 'assistant', content: fullText });
        process.stdout.write('\n');
        return;
      }

      const tcList = Object.keys(toolCallsRaw).sort((a,b) => a-b).map(i => ({
        id:   toolCallsRaw[i].id,
        type: 'function',
        function: { name: toolCallsRaw[i].name, arguments: toolCallsRaw[i].arguments },
      }));

      messages.push({ role: 'assistant', content: fullText || null, tool_calls: tcList });

      process.stdout.write('\n');
      for (const tc of tcList) {
        let args = {};
        try { args = JSON.parse(tc.function.arguments); } catch (_) {}
        const preview = Object.entries(args).map(([k,v]) => `${k}=${String(v).slice(0,40)}`).join(', ');
        process.stdout.write(`\x1b[2m\x1b[32m  >> ${tc.function.name}(${preview})\x1b[0m\n`);
        const result = executeTool(tc.function.name, args);
        const short  = result.slice(0, 120) + (result.length > 120 ? '...' : '');
        process.stdout.write(`\x1b[2m    -> ${short}\x1b[0m\n`);
        messages.push({ role: 'tool', tool_call_id: tc.id, content: result });
      }
      process.stdout.write('\n');
    }

    process.stdout.write('\x1b[33mReached max tool iterations.\x1b[0m\n\n');
  }
}

module.exports = { Agent };
