/**
 * Debounce utility to prevent excessive function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute immediately on first call
 * @returns {Function} Debounced function
 */
export function debounce(func, wait, immediate = false) {
    let timeout;
    
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        
        const callNow = immediate && !timeout;
        
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        
        if (callNow) func(...args);
    };
}

/**
 * Request deduplication utility to prevent duplicate API calls
 */
class RequestDeduplicator {
    constructor() {
        this.pendingRequests = new Map();
    }

    async dedupe(key, requestFn) {
        // If request is already pending, return the existing promise
        if (this.pendingRequests.has(key)) {
            console.log(`Deduplicating request: ${key}`);
            return this.pendingRequests.get(key);
        }

        // Create new request promise
        const requestPromise = requestFn()
            .finally(() => {
                // Clean up after request completes
                this.pendingRequests.delete(key);
            });

        // Store the promise
        this.pendingRequests.set(key, requestPromise);

        return requestPromise;
    }

    clear() {
        this.pendingRequests.clear();
    }
}

// Global request deduplicator instance
export const requestDeduplicator = new RequestDeduplicator();

/**
 * Navigation throttle utility to prevent excessive navigation events
 */
class NavigationThrottle {
    constructor() {
        this.lastNavigation = 0;
        this.minInterval = 500; // Minimum 500ms between navigations
    }

    canNavigate() {
        const now = Date.now();
        const timeSinceLastNav = now - this.lastNavigation;
        
        if (timeSinceLastNav < this.minInterval) {
            console.log(`Navigation throttled. Wait ${this.minInterval - timeSinceLastNav}ms`);
            return false;
        }
        
        this.lastNavigation = now;
        return true;
    }

    throttledNavigate(router, path) {
        if (this.canNavigate()) {
            router.push(path);
        } else {
            // Schedule navigation for later
            setTimeout(() => {
                if (this.canNavigate()) {
                    router.push(path);
                }
            }, this.minInterval);
        }
    }
}

// Global navigation throttle instance
export const navigationThrottle = new NavigationThrottle();
