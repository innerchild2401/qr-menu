#!/usr/bin/env node

/**
 * Supabase Environment Variables Diagnostic Script
 * 
 * This script checks for PowerShell wrapping issues and validates Supabase environment variables.
 * It loads variables from .env.local and checks both server and client environments.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  console.log('\n' + '='.repeat(60));
  log(message, 'bright');
  console.log('='.repeat(60));
}

function logSection(message) {
  console.log('\n' + '-'.repeat(40));
  log(message, 'cyan');
  console.log('-'.repeat(40));
}

function checkEnvFile() {
  logSection('Checking .env.local file');
  
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envPath)) {
    log('❌ .env.local file not found!', 'red');
    log('Please create .env.local file with your Supabase credentials.', 'yellow');
    return false;
  }
  
  log('✅ .env.local file found', 'green');
  
  // Read and parse the .env.local file
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = dotenv.parse(envContent);
  
  return envVars;
}

function validateKeyFormat(key, value) {
  if (!value) return { valid: false, issue: 'Missing value' };
  
  // Check for PowerShell wrapping issues (newlines, spaces, etc.)
  if (value.includes('\n') || value.includes('\r')) {
    return { valid: false, issue: 'Contains line breaks (PowerShell wrapping issue)' };
  }
  
  if (value.trim() !== value) {
    return { valid: false, issue: 'Contains leading/trailing whitespace' };
  }
  
  // Check for JWT format (Supabase keys are JWTs)
  if (key.includes('KEY') && !value.match(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)) {
    return { valid: false, issue: 'Invalid JWT format' };
  }
  
  // Check URL format
  if (key.includes('URL') && !value.startsWith('https://')) {
    return { valid: false, issue: 'Invalid URL format (should start with https://)' };
  }
  
  return { valid: true, issue: null };
}

function checkRequiredVariables(envVars) {
  logSection('Checking Required Supabase Variables');
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const results = {};
  
  requiredVars.forEach(varName => {
    const value = envVars[varName];
    const validation = validateKeyFormat(varName, value);
    
    results[varName] = {
      set: !!value,
      valid: validation.valid,
      issue: validation.issue
    };
    
    if (value) {
      log(`✅ ${varName}: SET`, 'green');
      if (validation.valid) {
        log(`   Format: Valid`, 'green');
      } else {
        log(`   Format: ❌ ${validation.issue}`, 'red');
      }
    } else {
      log(`❌ ${varName}: MISSING`, 'red');
    }
  });
  
  return results;
}

function checkOptionalVariables(envVars) {
  logSection('Checking Optional Variables');
  
  const optionalVars = [
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL'
  ];
  
  optionalVars.forEach(varName => {
    const value = envVars[varName];
    if (value) {
      log(`✅ ${varName}: SET`, 'green');
    } else {
      log(`⚠️  ${varName}: NOT SET (optional)`, 'yellow');
    }
  });
}

function checkEnvironmentLoading() {
  logSection('Checking Environment Loading');
  
  // Load environment variables
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
  
  const testVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  testVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      log(`✅ ${varName}: Loaded in process.env`, 'green');
    } else {
      log(`❌ ${varName}: Not loaded in process.env`, 'red');
    }
  });
}

function checkForPowerShellIssues(envVars) {
  logSection('Checking for PowerShell Wrapping Issues');
  
  let issuesFound = false;
  
  Object.entries(envVars).forEach(([key, value]) => {
    if (value) {
      // Check for common PowerShell issues
      if (value.includes('\n') || value.includes('\r')) {
        log(`❌ ${key}: Contains line breaks`, 'red');
        log(`   This is likely a PowerShell wrapping issue`, 'yellow');
        issuesFound = true;
      }
      
      if (value.includes('\\n') || value.includes('\\r')) {
        log(`❌ ${key}: Contains escaped line breaks`, 'red');
        log(`   This might be a PowerShell escaping issue`, 'yellow');
        issuesFound = true;
      }
      
      if (value.trim() !== value) {
        log(`❌ ${key}: Contains leading/trailing whitespace`, 'red');
        issuesFound = true;
      }
    }
  });
  
  if (!issuesFound) {
    log('✅ No PowerShell wrapping issues detected', 'green');
  }
  
  return issuesFound;
}

function generateSummary(results, hasPowerShellIssues) {
  logHeader('DIAGNOSTIC SUMMARY');
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  let allGood = true;
  
  log('\nRequired Variables Status:', 'bright');
  requiredVars.forEach(varName => {
    const result = results[varName];
    if (result && result.set && result.valid) {
      log(`✅ ${varName}`, 'green');
    } else {
      log(`❌ ${varName}`, 'red');
      if (result && result.issue) {
        log(`   Issue: ${result.issue}`, 'yellow');
      }
      allGood = false;
    }
  });
  
  if (hasPowerShellIssues) {
    log('\n⚠️  PowerShell wrapping issues detected!', 'yellow');
    log('   Consider copying keys from a text editor instead of PowerShell', 'yellow');
    allGood = false;
  }
  
  if (allGood) {
    log('\n🎉 All Supabase environment variables are properly configured!', 'green');
  } else {
    log('\n🔧 Please fix the issues above before proceeding', 'red');
  }
  
  return allGood;
}

function main() {
  logHeader('SUPABASE ENVIRONMENT DIAGNOSTIC');
  
  // Check if .env.local exists and load variables
  const envVars = checkEnvFile();
  if (!envVars) {
    process.exit(1);
  }
  
  // Check required variables
  const results = checkRequiredVariables(envVars);
  
  // Check optional variables
  checkOptionalVariables(envVars);
  
  // Check for PowerShell issues
  const hasPowerShellIssues = checkForPowerShellIssues(envVars);
  
  // Check environment loading
  checkEnvironmentLoading();
  
  // Generate summary
  const allGood = generateSummary(results, hasPowerShellIssues);
  
  // Exit with appropriate code
  process.exit(allGood ? 0 : 1);
}

// Run the diagnostic
if (require.main === module) {
  main();
}

module.exports = {
  checkEnvFile,
  validateKeyFormat,
  checkRequiredVariables,
  checkForPowerShellIssues
};
