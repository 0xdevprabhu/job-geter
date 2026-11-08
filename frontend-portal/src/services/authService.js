import { db, isFirebaseConfigured } from '../firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot
} from 'firebase/firestore'; 

const USER_STORAGE_KEY = 'job_tracker_current_user';

// Native SHA-256 Web Crypto hashing (Zero external dependencies)
export async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + (salt || ''));
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Generate random salt
export function generateSalt() {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// Get logged-in user from localStorage
export function getSavedSession() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.email === 'string' && parsed.email) {
      return parsed;
    }
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  } catch {
    return null;
  }
}

// Set logged-in user in localStorage
export function setSavedSession(user) {
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}

// Send OTP via /api/send-otp (Gmail SMTP)
export async function sendOtpEmail(email, purpose = 'signup') {
  const cleanEmail = (email || '').trim().toLowerCase();

  // Validate existence first
  if (isFirebaseConfigured && db) {
    try {
      const userRef = doc(db, 'users', cleanEmail);
      const userSnap = await getDoc(userRef);

      if (purpose === 'signup' && userSnap.exists()) {
        return {
          success: false,
          error: 'An account already exists with this email address. Please log in or reset your password.',
        };
      }

      if (purpose === 'forgot_password' && !userSnap.exists()) {
        return {
          success: false,
          error: 'No account found with this email. Please sign up for a new account.',
        };
      }
    } catch (e) {
      console.warn('Firebase check warning:', e);
    }
  }

  try {
    const res = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, purpose }),
    });

    const data = await res.json();
    if (data.token) {
      sessionStorage.setItem('zipzap_otp_token', data.token);
    }
    return data;
  } catch (err) {
    return {
      success: false,
      error: 'Failed to communicate with OTP server. Please ensure the server is online and Gmail credentials are set.',
    };
  }
}

// Verify OTP
export async function verifyOtpCode(email, otp) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanOtp = (otp || '').trim();
  const token = sessionStorage.getItem('zipzap_otp_token') || '';

  try {
    const res = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, otp: cleanOtp, token }),
    });

    const data = await res.json();
    if (data.success) {
      sessionStorage.removeItem('zipzap_otp_token');
      return { success: true };
    } else if (data.error) {
      return { success: false, error: data.error };
    }
  } catch (err) {
    console.warn('API verify failed, checking Firestore directly:', err);
  }

  // Fallback: Check Firestore client-side directly
  if (isFirebaseConfigured && db) {
    try {
      const otpRef = doc(db, 'auth_otps', cleanEmail);
      const otpSnap = await getDoc(otpRef);
      if (otpSnap.exists()) {
        const d = otpSnap.data();
        if (d.otp === cleanOtp) {
          if (Date.now() > (d.expires_timestamp || 0)) {
            return { success: false, error: 'Verification code has expired. Please request a new code.' };
          }
          return { success: true };
        }
      }
    } catch (e) {
      console.error('Firestore OTP fallback check error:', e);
    }
  }

  return { success: false, error: 'Invalid verification code. Please check your email and try again.' };
}

// Register a new user with mandatory Full Name
export async function registerUser(email, password, name = '') {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanName = (name || '').trim();
  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);

  const newUser = {
    email: cleanEmail,
    name: cleanName,
    displayName: cleanName,
    password_hash: passwordHash,
    salt,
    created_at: new Date().toISOString(),
    last_login_at: new Date().toISOString(),
    saved_job_ids: [],
    read_job_ids: [],
  };

  if (isFirebaseConfigured && db) {
    const userRef = doc(db, 'users', cleanEmail);
    await setDoc(userRef, newUser, { merge: true });
  }

  const session = {
    email: cleanEmail,
    name: cleanName,
    displayName: cleanName,
    saved_job_ids: [],
    read_job_ids: [],
  };
  setSavedSession(session);
  return { success: true, user: session };
}

// Update user's name in Firestore and Session
export async function updateUserName(email, newName) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanName = (newName || '').trim();

  if (!cleanName) {
    return { success: false, error: 'Name cannot be empty.' };
  }

  if (isFirebaseConfigured && db) {
    try {
      const userRef = doc(db, 'users', cleanEmail);
      await updateDoc(userRef, {
        name: cleanName,
        displayName: cleanName,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error updating name in Firestore:', err);
    }
  }

  const session = getSavedSession() || {};
  session.name = cleanName;
  session.displayName = cleanName;
  setSavedSession(session);
  return { success: true, name: cleanName, user: session };
}

// Log in an existing user
export async function loginUser(email, password) {
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!isFirebaseConfigured || !db) {
    // Demo fallback login
    const demoSession = {
      email: cleanEmail,
      name: cleanEmail.split('@')[0],
      displayName: cleanEmail.split('@')[0],
      saved_job_ids: [],
      read_job_ids: [],
    };
    setSavedSession(demoSession);
    return { success: true, user: demoSession };
  }

  const userRef = doc(db, 'users', cleanEmail);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return {
      success: false,
      error: 'No account found with this email. Please click "Sign Up" to create an account.',
    };
  }

  const userData = userSnap.data();
  const computedHash = await hashPassword(password, userData.salt);

  if (computedHash !== userData.password_hash) {
    return {
      success: false,
      error: 'Incorrect password. Please try again or use "Forgot Password".',
    };
  }

  // Update last login timestamp
  try {
    await updateDoc(userRef, { last_login_at: new Date().toISOString() });
  } catch {}

  const userName = userData.name || userData.displayName || cleanEmail.split('@')[0];

  const session = {
    email: cleanEmail,
    name: userName,
    displayName: userName,
    saved_job_ids: userData.saved_job_ids || [],
    read_job_ids: userData.read_job_ids || [],
  };
  setSavedSession(session);
  return { success: true, user: session };
}

// Reset Password
export async function resetPassword(email, newPassword) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const salt = generateSalt();
  const passwordHash = await hashPassword(newPassword, salt);

  if (isFirebaseConfigured && db) {
    const userRef = doc(db, 'users', cleanEmail);
    await updateDoc(userRef, {
      password_hash: passwordHash,
      salt,
      updated_at: new Date().toISOString(),
    });
  }

  const session = getSavedSession() || {};
  session.email = cleanEmail;
  setSavedSession(session);
  return { success: true, user: session };
}

// Toggle saved job ID for a user
export async function toggleSavedJob(email, jobId, isCurrentlySaved) {
  if (!email || !jobId) return;
  const cleanEmail = email.trim().toLowerCase();

  if (isFirebaseConfigured && db) {
    try {
      const userRef = doc(db, 'users', cleanEmail);
      await updateDoc(userRef, {
        saved_job_ids: isCurrentlySaved ? arrayRemove(jobId) : arrayUnion(jobId),
      });
    } catch (err) {
      console.error('Error toggling saved job in Firestore:', err);
    }
  }
}

// Synchronize / Clean deleted job IDs from user's saved list in Firestore
export async function cleanMissingSavedJobs(email, validJobIds) {
  if (!email || !Array.isArray(validJobIds)) return;
  const cleanEmail = email.trim().toLowerCase();

  if (isFirebaseConfigured && db) {
    try {
      const userRef = doc(db, 'users', cleanEmail);
      await updateDoc(userRef, {
        saved_job_ids: validJobIds,
      });
    } catch (err) {
      console.warn('Could not sync valid saved job IDs:', err);
    }
  }

  const session = getSavedSession() || {};
  session.saved_job_ids = validJobIds;
  setSavedSession(session);
}

// Toggle read job ID for a user
export async function toggleReadJob(email, jobId, isCurrentlyRead) {
  if (!email || !jobId) return;
  const cleanEmail = email.trim().toLowerCase();

  if (isFirebaseConfigured && db) {
    try {
      const userRef = doc(db, 'users', cleanEmail);
      await updateDoc(userRef, {
        read_job_ids: isCurrentlyRead ? arrayRemove(jobId) : arrayUnion(jobId),
      });
    } catch (err) {
      console.error('Error toggling read job in Firestore:', err);
    }
  }
}

// Real-time listener for current user's profile and saved/read lists
export function subscribeToUserData(email, callback) {
  if (!email || !isFirebaseConfigured || !db) return () => {};

  const cleanEmail = email.trim().toLowerCase();
  const userRef = doc(db, 'users', cleanEmail);

  return onSnapshot(
    userRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        callback({
          email: cleanEmail,
          name: data.name || data.displayName || cleanEmail.split('@')[0],
          displayName: data.name || data.displayName || cleanEmail.split('@')[0],
          saved_job_ids: data.saved_job_ids || [],
          read_job_ids: data.read_job_ids || [],
          created_at: data.created_at || null,
        });
      }
    },
    (err) => {
      console.warn('User subscription error:', err);
    }
  );
}
