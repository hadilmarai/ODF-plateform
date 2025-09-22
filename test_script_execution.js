const { spawn } = require('child_process');
const path = require('path');

console.log('🔄 Testing Python script execution through Node.js...');

// Test script path
const scriptPath = path.resolve(__dirname, 'innovateuk.py');
console.log('📁 Script path:', scriptPath);
console.log('📁 Working directory:', path.dirname(scriptPath));

// Check if script exists
const fs = require('fs');
if (!fs.existsSync(scriptPath)) {
    console.error('❌ Script file not found:', scriptPath);
    process.exit(1);
}

console.log('✅ Script file exists');

// Start the Python process
console.log('🐍 Starting Python process...');
const pythonProcess = spawn('python', [scriptPath], {
    cwd: path.dirname(scriptPath),
    stdio: ['pipe', 'pipe', 'pipe']
});

console.log('📊 Process ID:', pythonProcess.pid);

// Handle process output
pythonProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('📤 STDOUT:', output.trim());
});

pythonProcess.stderr.on('data', (data) => {
    const error = data.toString();
    console.log('📤 STDERR:', error.trim());
});

// Handle process events
pythonProcess.on('spawn', () => {
    console.log('✅ Process spawned successfully');
});

pythonProcess.on('error', (error) => {
    console.error('❌ Process error:', error);
});

pythonProcess.on('close', (code, signal) => {
    console.log('🔚 Process closed');
    console.log('   Exit code:', code);
    console.log('   Signal:', signal);
    
    if (code === 0) {
        console.log('✅ Process completed successfully');
    } else {
        console.log('❌ Process failed with exit code:', code);
    }
});

pythonProcess.on('exit', (code, signal) => {
    console.log('🚪 Process exited');
    console.log('   Exit code:', code);
    console.log('   Signal:', signal);
});

// Set a timeout to kill the process after 30 seconds for testing
setTimeout(() => {
    if (!pythonProcess.killed) {
        console.log('⏰ Test timeout - killing process');
        pythonProcess.kill('SIGTERM');
    }
}, 30000);

console.log('⏳ Waiting for process output...');
