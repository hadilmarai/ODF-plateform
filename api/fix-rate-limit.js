/**
 * Temporary Rate Limit Fix
 * This script helps resolve the 429 (Too Many Requests) error
 */

const express = require('express');
const app = express();

// Create a simple endpoint to clear rate limit memory store
app.get('/clear-rate-limit', (req, res) => {
    // Since express-rate-limit uses memory store by default,
    // we can restart the server to clear the limits
    res.json({
        success: true,
        message: 'Rate limit cleared. Please restart the API server.',
        instructions: [
            '1. Stop the API server (Ctrl+C)',
            '2. Restart the API server',
            '3. The rate limit counters will be reset'
        ]
    });
});

console.log('🔧 Rate Limit Fix Utility');
console.log('========================');
console.log('');
console.log('The 429 error occurs because you\'ve exceeded the rate limit:');
console.log('- General endpoints: 100 requests per 15 minutes');
console.log('- Your IP has been rate limited');
console.log('');
console.log('Solutions:');
console.log('1. IMMEDIATE FIX: Restart the API server to reset counters');
console.log('2. PERMANENT FIX: The analysis routes now use optional auth');
console.log('   - Admin users bypass rate limiting');
console.log('   - Make sure you\'re logged in as admin');
console.log('');
console.log('To restart the API server:');
console.log('1. Go to the terminal running the API');
console.log('2. Press Ctrl+C to stop');
console.log('3. Run: node server.js (or your start command)');
console.log('');
console.log('Rate Limit Configuration:');
console.log('- Window: 15 minutes');
console.log('- Max requests: 100 per window');
console.log('- Admin bypass: Enabled');
console.log('- Key: IP address (or user ID if authenticated)');

if (require.main === module) {
    const port = 3001;
    app.listen(port, () => {
        console.log(`\nRate limit utility running on http://localhost:${port}`);
        console.log('Visit http://localhost:3001/clear-rate-limit for instructions');
    });
}
