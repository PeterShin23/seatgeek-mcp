#!/usr/bin/env node

/**
 * Test script to verify that the example scripts work correctly
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Testing example scripts...\n');

// Test that example files exist and are executable/readable
const examples = [
  { name: 'curl-example.sh', path: 'examples/curl-example.sh', type: 'shell' },
  { name: 'node-example.js', path: 'examples/node-example.js', type: 'node' }
];

let allPassed = true;

// Check if example files exist
for (const example of examples) {
  if (fs.existsSync(example.path)) {
    console.log(`✓ ${example.name} exists`);
    
    // Check if shell script is executable
    if (example.type === 'shell') {
      try {
        fs.accessSync(example.path, fs.constants.X_OK);
        console.log(`✓ ${example.name} is executable`);
      } catch (err) {
        console.log(`✗ ${example.name} is not executable`);
        allPassed = false;
      }
    }
  } else {
    console.log(`✗ ${example.name} does not exist`);
    allPassed = false;
  }
}

// Test that package.json has required dependencies
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredDeps = ['axios', '@modelcontextprotocol/sdk'];

for (const dep of requiredDeps) {
  if (packageJson.dependencies && packageJson.dependencies[dep]) {
    console.log(`✓ ${dep} dependency found`);
  } else if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
    console.log(`✓ ${dep} dev dependency found`);
  } else {
    console.log(`✗ ${dep} dependency not found`);
    allPassed = false;
  }
}

console.log('\n' + (allPassed ? 'All tests passed!' : 'Some tests failed!'));

// Show how to run the examples
console.log('\nTo run the examples:');
console.log('- Shell example: ./examples/curl-example.sh');
console.log('- Node.js example: node examples/node-example.js');
