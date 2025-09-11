# Login API Documentation

This document provides comprehensive information about the authentication API endpoints for the Spark Nexora Backend.

## Base URL
```
Production: https://spark-nexora-backend.vercel.app/api/auth
Development: http://localhost:5000/api/auth
```

## Authentication Flow

1. **Login** → Get JWT token
2. **Store token** in client-side storage (localStorage/sessionStorage)
3. **Include token** in Authorization header for protected routes
4. **Verify token** when needed
5. **Logout** → Remove token from client-side storage

---

## API Endpoints

### 1. User Login

**Endpoint:** `POST /api/auth/login`

**Description:** Authenticates user credentials and returns a JWT token.

**Request Body:**
```json
{
  "email": "usamajawad125@gmail.com",
  "password": "Spark@123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_id_here",
      "name": "Admin User",
      "email": "usamajawad125@gmail.com",
      "role": "admin",
      "lastLogin": "2024-01-15T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**

**400 - Missing Credentials:**
```json
{
  "success": false,
  "message": "Email and password are required"
}
```

**401 - Invalid Credentials:**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

**403 - Account Deactivated:**
```json
{
  "success": false,
  "message": "Account is deactivated. Please contact administrator."
}
```

**423 - Account Locked:**
```json
{
  "success": false,
  "message": "Account is temporarily locked due to too many failed login attempts. Please try again later."
}
```

---

### 2. Verify Token

**Endpoint:** `POST /api/auth/verify`

**Description:** Verifies if the provided JWT token is valid and returns user information.

**Headers:**
```
Authorization: Bearer your_jwt_token_here
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "user": {
      "id": "user_id_here",
      "name": "Admin User",
      "email": "usamajawad125@gmail.com",
      "role": "admin",
      "lastLogin": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**Error Responses:**

**401 - No Token:**
```json
{
  "success": false,
  "message": "Access token is required"
}
```

**401 - Invalid Token:**
```json
{
  "success": false,
  "message": "Invalid token"
}
```

**401 - Expired Token:**
```json
{
  "success": false,
  "message": "Token has expired"
}
```

---

### 3. User Logout

**Endpoint:** `POST /api/auth/logout`

**Description:** Logs out the user (client-side token removal).

**Headers:**
```
Authorization: Bearer your_jwt_token_here
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logout successful. Please remove the token from client-side storage."
}
```

---

## Frontend Integration Examples

### JavaScript/React Example

```javascript
// Login function
const login = async (email, password) => {
  try {
    const response = await fetch('https://spark-nexora-backend.vercel.app/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (data.success) {
      // Store token in localStorage
      localStorage.setItem('authToken', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      
      return data.data.user;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// Verify token function
const verifyToken = async () => {
  try {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch('https://spark-nexora-backend.vercel.app/api/auth/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (data.success) {
      return data.data.user;
    } else {
      // Token is invalid, remove it
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Token verification error:', error);
    throw error;
  }
};

// Logout function
const logout = async () => {
  try {
    const token = localStorage.getItem('authToken');
    
    if (token) {
      await fetch('https://spark-nexora-backend.vercel.app/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Always remove token from storage
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }
};

// Make authenticated requests
const makeAuthenticatedRequest = async (url, options = {}) => {
  const token = localStorage.getItem('authToken');
  
  const config = {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const response = await fetch(url, config);
  
  if (response.status === 401) {
    // Token expired or invalid, logout user
    logout();
    throw new Error('Session expired. Please login again.');
  }

  return response;
};
```

### Vue.js Example

```javascript
// Vue.js composable for authentication
import { ref, computed } from 'vue'

export function useAuth() {
  const user = ref(null)
  const token = ref(localStorage.getItem('authToken'))

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  const login = async (email, password) => {
    try {
      const response = await fetch('https://spark-nexora-backend.vercel.app/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (data.success) {
        token.value = data.data.token
        user.value = data.data.user
        localStorage.setItem('authToken', data.data.token)
        localStorage.setItem('user', JSON.stringify(data.data.user))
        return data.data.user
      } else {
        throw new Error(data.message)
      }
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      if (token.value) {
        await fetch('https://spark-nexora-backend.vercel.app/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token.value}` },
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      token.value = null
      user.value = null
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    login,
    logout
  }
}
```

---

## Default Login Credentials

**Email:** `usamajawad125@gmail.com`  
**Password:** `Spark@123`  
**Role:** `admin`

---

## Token Information

- **Token Type:** JWT (JSON Web Token)
- **Expiration:** 7 days
- **Algorithm:** HS256
- **Secret:** Defined in environment variables

---

## Security Features

1. **Password Hashing:** Passwords are hashed using bcrypt with salt rounds of 12
2. **Account Lockout:** Account gets locked after 5 failed login attempts for 2 hours
3. **Token Expiration:** JWT tokens expire after 7 days
4. **Role-based Access:** Admin routes require admin role
5. **Account Status:** Accounts can be deactivated

---

## Error Handling

Always check the `success` field in the response:

```javascript
if (response.success) {
  // Handle success
  console.log('Success:', response.data)
} else {
  // Handle error
  console.error('Error:', response.message)
}
```

---

## Testing with cURL

```bash
# Login
curl -X POST https://spark-nexora-backend.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usamajawad125@gmail.com","password":"Spark@123"}'

# Verify Token
curl -X POST https://spark-nexora-backend.vercel.app/api/auth/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -H "Content-Type: application/json"

# Logout
curl -X POST https://spark-nexora-backend.vercel.app/api/auth/logout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

---

## Notes for Frontend Developers

1. **Always store the token securely** (localStorage/sessionStorage)
2. **Include the token in Authorization header** for protected routes
3. **Handle token expiration** by redirecting to login
4. **Remove token on logout** from client-side storage
5. **Verify token validity** on app initialization
6. **Handle network errors** gracefully
7. **Show appropriate error messages** to users

---

## Support

For any issues or questions regarding the authentication API, please contact the backend development team.
