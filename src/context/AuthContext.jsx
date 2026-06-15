import React, { createContext, useContext, useState, useEffect } from 'react';
import { isFirebaseConfigured, db } from '../lib/firebase.js';
import { getStudentById, getStudentsByContact } from '../lib/firestore.js';
import { 
  collection, doc, setDoc, getDoc, getDocs,
  query, where, serverTimestamp 
} from 'firebase/firestore';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [studentId, setStudentId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on app load
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedSession = localStorage.getItem('fee_portal_session');
        if (storedSession) {
          const session = JSON.parse(storedSession);

          if (session.role === 'parent' && session.studentId) {
            const student = await getStudentById(session.studentId);
            if (student) {
              setCurrentUser(student);
              setUserRole('parent');
              setStudentId(session.studentId);
            } else {
              localStorage.removeItem('fee_portal_session');
            }

          } else if (session.role === 'admin' && session.adminEmail) {
            // Restore admin session from stored email
            setCurrentUser({ email: session.adminEmail, name: session.adminName || 'Administrator' });
            setUserRole('admin');
          }
        }
      } catch (err) {
        console.error('Error restoring session:', err);
        localStorage.removeItem('fee_portal_session');
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  // ─────────────────────────────────────────────
  // ADMIN SIGNUP — saves to Firestore 'admins' collection
  // ─────────────────────────────────────────────
  const signupAdmin = async (email, password, name) => {
    try {
      const cleanEmail = email.toLowerCase().trim();
      const adminName = name || cleanEmail.split('@')[0];

      if (isFirebaseConfigured) {
        // Check if admin with this email already exists in Firestore
        const q = query(collection(db, 'admins'), where('email', '==', cleanEmail));
        const existing = await getDocs(q);
        if (!existing.empty) {
          throw new Error('An administrator account with this email already exists.');
        }

        // Create a unique document ID for this admin
        const adminDocId = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const adminRef = doc(db, 'admins', adminDocId);

        await setDoc(adminRef, {
          email: cleanEmail,
          password: password, // stored directly for Firestore-based auth
          name: adminName,
          role: 'admin',
          status: 'active',
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp()
        });

        const user = { email: cleanEmail, name: adminName };
        setCurrentUser(user);
        setUserRole('admin');
        localStorage.setItem('fee_portal_session', JSON.stringify({
          role: 'admin',
          adminEmail: cleanEmail,
          adminName: adminName
        }));
        return { success: true, user };

      } else {
        // Fallback: save to localStorage
        const mockAdmins = JSON.parse(localStorage.getItem('mock_admins') || '[]');
        if (mockAdmins.some(a => a.email === cleanEmail) || cleanEmail === 'admin@fee.com') {
          throw new Error('An administrator account with this email already exists.');
        }
        const newAdmin = { email: cleanEmail, name: adminName, password };
        mockAdmins.push(newAdmin);
        localStorage.setItem('mock_admins', JSON.stringify(mockAdmins));

        const user = { email: cleanEmail, name: adminName };
        setCurrentUser(user);
        setUserRole('admin');
        localStorage.setItem('fee_portal_session', JSON.stringify({
          role: 'admin',
          adminEmail: cleanEmail,
          adminName: adminName
        }));
        return { success: true, user };
      }
    } catch (error) {
      console.error('Admin signup failure:', error);
      throw error;
    }
  };

  // ─────────────────────────────────────────────
  // ADMIN LOGIN — checks Firestore 'admins' collection
  // ─────────────────────────────────────────────
  const loginAdmin = async (email, password) => {
    try {
      const cleanEmail = email.toLowerCase().trim();

      if (isFirebaseConfigured) {
        // Query Firestore admins collection for matching email + password
        const q = query(
          collection(db, 'admins'),
          where('email', '==', cleanEmail),
          where('password', '==', password)
        );
        const snap = await getDocs(q);

        if (!snap.empty) {
          const adminDoc = snap.docs[0];
          const adminData = adminDoc.data();

          // Update lastLoginAt timestamp
          await setDoc(adminDoc.ref, { lastLoginAt: serverTimestamp() }, { merge: true });

          const user = { email: adminData.email, name: adminData.name };
          setCurrentUser(user);
          setUserRole('admin');
          localStorage.setItem('fee_portal_session', JSON.stringify({
            role: 'admin',
            adminEmail: adminData.email,
            adminName: adminData.name
          }));
          return { success: true, user };
        }

        // Check fallback default credentials
        if (cleanEmail === 'admin@fee.com' && password === 'admin123') {
          const user = { email: 'admin@fee.com', name: 'System Admin' };
          setCurrentUser(user);
          setUserRole('admin');
          localStorage.setItem('fee_portal_session', JSON.stringify({
            role: 'admin',
            adminEmail: 'admin@fee.com',
            adminName: 'System Admin'
          }));
          return { success: true, user };
        }

        throw new Error('Invalid administrator credentials. Please check your email and password.');

      } else {
        // Sandbox fallback
        if (cleanEmail === 'admin@fee.com' && password === 'admin123') {
          const user = { email: 'admin@fee.com', name: 'System Admin' };
          setCurrentUser(user);
          setUserRole('admin');
          localStorage.setItem('fee_portal_session', JSON.stringify({
            role: 'admin',
            adminEmail: 'admin@fee.com',
            adminName: 'System Admin'
          }));
          return { success: true, user };
        }

        const mockAdmins = JSON.parse(localStorage.getItem('mock_admins') || '[]');
        const match = mockAdmins.find(a => a.email === cleanEmail && a.password === password);
        if (match) {
          const user = { email: match.email, name: match.name };
          setCurrentUser(user);
          setUserRole('admin');
          localStorage.setItem('fee_portal_session', JSON.stringify({
            role: 'admin',
            adminEmail: match.email,
            adminName: match.name
          }));
          return { success: true, user };
        }

        throw new Error('Invalid administrator credentials.');
      }
    } catch (error) {
      console.error('Admin login failure:', error);
      throw error;
    }
  };

  // ─────────────────────────────────────────────
  // PARENT LOGIN — checks Firestore 'students' collection
  // ─────────────────────────────────────────────
  const loginParent = async (contact) => {
    try {
      let cleanedContact = contact.replace(/\D/g, '');
      if (cleanedContact.length === 12 && cleanedContact.startsWith('91')) {
        cleanedContact = cleanedContact.substring(2);
      }

      const students = await getStudentsByContact(cleanedContact);
      if (!students || students.length === 0) {
        throw new Error('Mobile number not registered in records.');
      }

      const student = students[0];

      setCurrentUser(student);
      setUserRole('parent');
      setStudentId(student.studentId);
      localStorage.setItem('fee_portal_session', JSON.stringify({
        role: 'parent',
        studentId: student.studentId
      }));

      return { success: true, student };
    } catch (error) {
      console.error('Parent login failure:', error);
      throw error;
    }
  };

  // ─────────────────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────────────────
  const logout = () => {
    setCurrentUser(null);
    setUserRole(null);
    setStudentId(null);
    localStorage.removeItem('fee_portal_session');
  };

  const value = {
    currentUser,
    userRole,
    studentId,
    loading,
    loginAdmin,
    signupAdmin,
    loginParent,
    logout,
    isFirebaseConfigured
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
export default AuthContext;
