# 🔧 Authentication Flow Test Guide

## 🚨 **IMPORTANT: Correct URLs**

- **Next.js App (Frontend)**: `http://localhost:3000` ← **Use this for your app**
- **API Server (Backend)**: `http://localhost:5000` ← **This is just the API**

## 🧪 **Step-by-Step Test:**

### 1. **Clear Browser Data**
```
1. Open browser developer tools (F12)
2. Go to Application tab → Storage
3. Clear all localStorage data
4. Or use Ctrl+Shift+Delete to clear all data
```

### 2. **Test Authentication Flow**
```
1. Go to: http://localhost:3000/debug
2. Check the authentication state
3. Click "Go to Login" button
4. Login with: admin / admin123
5. Should redirect to dashboard
```

### 3. **Expected Flow:**
```
Step 1: http://localhost:3000 (no token)
   ↓
Step 2: Redirects to http://localhost:3000/login
   ↓
Step 3: Login with admin/admin123
   ↓
Step 4: Redirects to http://localhost:3000/ (dashboard)
```

## 🔍 **Debug Information:**

### Check Browser Console:
Look for these messages:
- ✅ "Initializing auth..." 
- ✅ "Login successful, updating auth state..."
- ✅ "Auth state updated, user should be authenticated"
- ✅ "User authenticated, allowing access"

### Check Network Tab:
- ✅ POST to `/api/auth/login` should return 200
- ✅ Response should contain token and user data

## 🚨 **Common Issues:**

### Issue 1: Going to localhost:5000
**Problem**: localhost:5000 is the API server, not the app
**Solution**: Use localhost:3000 for the Next.js app

### Issue 2: Authentication State Not Updating
**Problem**: Login succeeds but app doesn't recognize it
**Solution**: Check browser console for auth state updates

### Issue 3: Infinite Redirects
**Problem**: App keeps redirecting between login and home
**Solution**: Clear browser storage and restart

## 🔧 **Quick Fixes:**

### Fix 1: Clear Everything
```bash
# Clear browser storage
localStorage.clear()

# Or visit debug page and click "Clear Storage & Reload"
http://localhost:3000/debug
```

### Fix 2: Check Auth State
```bash
# Visit debug page to see current state
http://localhost:3000/debug
```

### Fix 3: Manual Login Test
```bash
# Go directly to login page
http://localhost:3000/login

# Login with: admin / admin123
# Should redirect to: http://localhost:3000/
```

## 📊 **Expected Debug Output:**

### Before Login:
```
Auth Context State:
- Loading: No
- Authenticated: No
- User: None
- Token: Missing

LocalStorage Data:
- Auth Token: Missing
- Auth User: Missing
- Refresh Token: Missing
```

### After Login:
```
Auth Context State:
- Loading: No
- Authenticated: Yes
- User: admin
- Token: Present

LocalStorage Data:
- Auth Token: Present
- Auth User: admin
- Refresh Token: Present
```

## 🎯 **Test Results:**

Visit `http://localhost:3000/debug` and check if the authentication state matches the expected output above.

If the state is correct after login but the app still redirects, there might be a timing issue with the ProtectedRoute component.
