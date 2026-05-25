'use strict';
const fs          = require('fs');
const path        = require('path');
const { execSync } = require('child_process');

function readFile(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); }
  catch (e) { return `Error: ${e.message}`; }
}

function writeFile(filePath, content) {
  try {
    fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
    return `Written: ${filePath}`;
  } catch (e) { return `Error: ${e.message}`; }
}

function createFile(filePath, content = '') {
  try {
    fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
    return `Created: ${filePath}`;
  } catch (e) { return `Error: ${e.message}`; }
}

function listDirectory(dirPath = '.') {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true })
      .map(e => e.isDirectory() ? `[DIR] ${e.name}` : e.name)
      .join('\n') || '(empty)';
  } catch (e) { return `Error: ${e.message}`; }
}

function runCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8', timeout: 30000 }) || '(no output)';
  } catch (e) {
    return `Exit ${e.status}: ${e.stderr || e.message}`;
  }
}

const TOOLS = [
  { type: 'function', function: { name: 'read_file',       description: 'Read file contents',       parameters: { type: 'object', properties: { path:    { type: 'string' } }, required: ['path'] } } },
  { type: 'function', function: { name: 'write_file',      description: 'Write content to a file',  parameters: { type: 'object', properties: { path:    { type: 'string' }, content: { type: 'string' } }, required: ['path','content'] } } },
  { type: 'function', function: { name: 'create_file',     description: 'Create a new file',        parameters: { type: 'object', properties: { path:    { type: 'string' }, content: { type: 'string' } }, required: ['path'] } } },
  { type: 'function', function: { name: 'list_directory',  description: 'List files in directory',  parameters: { type: 'object', properties: { path:    { type: 'string' } }, required: [] } } },
  { type: 'function', function: { name: 'run_command',     description: 'Run a shell command',      parameters: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] } } },
];

function executeTool(name, args) {
  switch (name) {
    case 'read_file':      return readFile(args.path);
    case 'write_file':     return writeFile(args.path, args.content);
    case 'create_file':    return createFile(args.path, args.content || '');
    case 'list_directory': return listDirectory(args.path || '.');
    case 'run_command':    return runCommand(args.command);
    default:               return `Unknown tool: ${name}`;
  }
}

module.exports = { TOOLS, executeTool };
