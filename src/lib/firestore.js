import { db, isFirebaseConfigured } from './firebase.js';
import { 
  collection, doc, getDoc, getDocs, addDoc, setDoc, 
  updateDoc, deleteDoc, query, where, orderBy, serverTimestamp 
} from 'firebase/firestore';

// ==========================================
// MOCK DATABASE LAYER (LOCAL STORAGE FALLBACK)
// ==========================================

const INITIAL_STUDENTS = [
  {
    id: "stu_1",
    studentId: "STU-2025-001",
    fullName: "Aarav Sharma",
    parentName: "Rajesh Sharma",
    contact: "9876543210",
    class: "5",
    location: "Mumbai",
    admissionNumber: "ADM-2025-001",
    feeCategory: "Auto Fee",
    monthlyFee: 2500,
    status: "active",
    createdAt: new Date().toISOString()
  },
  {
    id: "stu_2",
    studentId: "STU-2025-002",
    fullName: "Dia Patel",
    parentName: "Amit Patel",
    contact: "9823456789",
    class: "8",
    location: "Ahmedabad",
    admissionNumber: "",
    feeCategory: "Auto Fee",
    monthlyFee: 2000,
    status: "pending_admission",
    createdAt: new Date().toISOString()
  },
  {
    id: "stu_3",
    studentId: "STU-2025-003",
    fullName: "Rohan Verma",
    parentName: "Sanjay Verma",
    contact: "9871234567",
    class: "10",
    location: "Delhi",
    admissionNumber: "ADM-2025-003",
    feeCategory: "Auto Fee",
    monthlyFee: 1200,
    status: "active",
    createdAt: new Date().toISOString()
  }
];

export const ACADEMIC_MONTHS = ["JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC", "JAN", "FEB", "MAR", "APR", "MAY"];

// Generate some mock fee records for active students
const getInitialFeeRecords = () => {
  const records = [];
  
  // Aarav (active) - paid some, unpaid some
  ACADEMIC_MONTHS.forEach((m, idx) => {
    let status = 'unpaid';
    let amount = 2500;
    let paymentDate = null;
    let paymentMode = '';
    let receiptId = '';

    if (idx < 3) {
      status = 'paid';
      paymentDate = new Date(2025, idx + 5, 10).toISOString();
      paymentMode = 'Online';
      receiptId = `REC-2025-000${idx + 1}`;
    } else if (idx === 3) {
      status = 'partial';
      amount = 1000; // paid 1000, pending 1500
    }

    records.push({
      id: `fee_1_${m}`,
      studentId: "STU-2025-001",
      admissionNumber: "ADM-2025-001",
      month: m,
      year: m === "JAN" || m === "FEB" || m === "MAR" || m === "APR" ? 2026 : 2025,
      amount: amount,
      status: status,
      paymentDate: paymentDate,
      paymentMode: paymentMode,
      receiptId: receiptId,
      whatsappSent: idx < 3,
      whatsappSentAt: idx < 3 ? new Date(2025, idx + 5, 11).toISOString() : null
    });
  });

  // Rohan (active) - paid JUN, JUL, AUG
  ACADEMIC_MONTHS.forEach((m, idx) => {
    let status = 'unpaid';
    let paymentDate = null;
    let paymentMode = '';
    let receiptId = '';

    if (idx < 4) {
      status = 'paid';
      paymentDate = new Date(2025, idx + 5, 5).toISOString();
      paymentMode = 'Cash';
      receiptId = `REC-2025-001${idx + 1}`;
    }

    records.push({
      id: `fee_3_${m}`,
      studentId: "STU-2025-003",
      admissionNumber: "ADM-2025-003",
      month: m,
      year: m === "JAN" || m === "FEB" || m === "MAR" || m === "APR" ? 2026 : 2025,
      amount: 1200,
      status: status,
      paymentDate: paymentDate,
      paymentMode: paymentMode,
      receiptId: receiptId,
      whatsappSent: idx < 2,
      whatsappSentAt: idx < 2 ? new Date(2025, idx + 5, 6).toISOString() : null
    });
  });

  return records;
};

// Initialize localStorage databases if not present
const getLocalData = (key, defaultData) => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaultData));
    return defaultData;
  }
  return JSON.parse(data);
};

const saveLocalData = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// ==========================================
// CORE CRUD IMPLEMENTATIONS
// ==========================================

export async function addStudent(studentData) {
  if (isFirebaseConfigured) {
    // 1. Determine new Student ID
    const qSnap = await getDocs(collection(db, 'students'));
    const totalCount = qSnap.size;
    const studentId = `STU-2025-${String(totalCount + 1).padStart(3, '0')}`;

    const finalData = {
      ...studentData,
      studentId,
      admissionNumber: studentData.admissionNumber || '',
      feeCategory: studentData.feeCategory || 'Auto Fee',
      monthlyFee: Number(studentData.monthlyFee || 0),
      status: studentData.status || 'pending_admission',
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'students'), finalData);
    
    // Auto initialize feeRecords if status is active
    if (finalData.status === 'active' && finalData.monthlyFee > 0) {
      await initializeFeeRecordsForStudent(studentId, finalData.admissionNumber, finalData.monthlyFee);
    }

    return { id: docRef.id, ...finalData };
  } else {
    // LocalStorage fallback
    const students = getLocalData('mock_students', INITIAL_STUDENTS);
    const studentId = `STU-2025-${String(students.length + 1).padStart(3, '0')}`;

    const newStudent = {
      id: `stu_${Date.now()}`,
      ...studentData,
      studentId,
      admissionNumber: studentData.admissionNumber || '',
      feeCategory: studentData.feeCategory || 'Auto Fee',
      monthlyFee: Number(studentData.monthlyFee || 0),
      status: studentData.status || 'pending_admission',
      createdAt: new Date().toISOString()
    };

    students.push(newStudent);
    saveLocalData('mock_students', students);

    // Auto initialize feeRecords if active
    if (newStudent.status === 'active' && newStudent.monthlyFee > 0) {
      await initializeFeeRecordsForStudent(studentId, newStudent.admissionNumber, newStudent.monthlyFee);
    }

    return newStudent;
  }
}

export async function getStudents() {
  if (isFirebaseConfigured) {
    const qSnap = await getDocs(query(collection(db, 'students'), orderBy('createdAt', 'desc')));
    const students = [];
    qSnap.forEach(doc => {
      students.push({ id: doc.id, ...doc.data() });
    });
    return students;
  } else {
    return getLocalData('mock_students', INITIAL_STUDENTS).sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
  }
}

export async function getStudentsByContact(contact) {
  if (isFirebaseConfigured) {
    const q = query(collection(db, 'students'), where('contact', '==', contact));
    const qSnap = await getDocs(q);
    const students = [];
    qSnap.forEach(doc => {
      students.push({ id: doc.id, ...doc.data() });
    });
    return students;
  } else {
    const students = getLocalData('mock_students', INITIAL_STUDENTS);
    return students.filter(s => s.contact === contact);
  }
}

export async function getStudentById(id) {
  if (isFirebaseConfigured) {
    // Check if ID is firestore doc ID
    let docRef = doc(db, 'students', id);
    let docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    
    // Otherwise look up by studentId field
    const q = query(collection(db, 'students'), where('studentId', '==', id));
    const qSnap = await getDocs(q);
    if (!qSnap.empty) {
      const firstDoc = qSnap.docs[0];
      return { id: firstDoc.id, ...firstDoc.data() };
    }
    return null;
  } else {
    const students = getLocalData('mock_students', INITIAL_STUDENTS);
    return students.find(s => s.id === id || s.studentId === id) || null;
  }
}

export async function updateStudent(id, updatedData) {
  if (isFirebaseConfigured) {
    // Resolve correct document ref
    let docId = id;
    const checkSnap = await getDoc(doc(db, 'students', id));
    if (!checkSnap.exists()) {
      const q = query(collection(db, 'students'), where('studentId', '==', id));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        docId = qSnap.docs[0].id;
      }
    }
    
    const docRef = doc(db, 'students', docId);
    
    // Normalize monthlyFee
    if (updatedData.monthlyFee !== undefined) {
      updatedData.monthlyFee = Number(updatedData.monthlyFee);
    }

    await updateDoc(docRef, updatedData);
    
    // If student status was changed to active, ensure fee records are initialized
    const updatedSnap = await getDoc(docRef);
    const student = updatedSnap.data();
    if (student.status === 'active' && student.monthlyFee > 0) {
      await initializeFeeRecordsForStudent(student.studentId, student.admissionNumber, student.monthlyFee);
    }

    return { id: docId, ...student };
  } else {
    const students = getLocalData('mock_students', INITIAL_STUDENTS);
    const index = students.findIndex(s => s.id === id || s.studentId === id);
    if (index === -1) throw new Error('Student not found.');

    if (updatedData.monthlyFee !== undefined) {
      updatedData.monthlyFee = Number(updatedData.monthlyFee);
    }

    students[index] = { ...students[index], ...updatedData };
    saveLocalData('mock_students', students);

    const student = students[index];
    if (student.status === 'active' && student.monthlyFee > 0) {
      await initializeFeeRecordsForStudent(student.studentId, student.admissionNumber, student.monthlyFee);
    }

    return student;
  }
}

export async function updateAdmissionNumber(id, admissionNumber) {
  return updateStudent(id, { 
    admissionNumber, 
    status: 'active' 
  });
}

export async function deleteStudent(id) {
  if (isFirebaseConfigured) {
    // Resolve doc id
    let docId = id;
    const checkSnap = await getDoc(doc(db, 'students', id));
    if (!checkSnap.exists()) {
      const q = query(collection(db, 'students'), where('studentId', '==', id));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        docId = qSnap.docs[0].id;
      }
    }
    await deleteDoc(doc(db, 'students', docId));
    
    // Delete student's fee records too
    const qRecords = query(collection(db, 'feeRecords'), where('studentId', '==', id));
    const recordsSnap = await getDocs(qRecords);
    // In a real production codebase, use batch write. We will loop and delete.
    for (const rDoc of recordsSnap.docs) {
      await deleteDoc(doc(db, 'feeRecords', rDoc.id));
    }
    return true;
  } else {
    let students = getLocalData('mock_students', INITIAL_STUDENTS);
    const target = students.find(s => s.id === id || s.studentId === id);
    if (!target) return false;

    students = students.filter(s => s.id !== target.id);
    saveLocalData('mock_students', students);

    // Delete fee records
    let records = getLocalData('mock_fee_records', getInitialFeeRecords());
    records = records.filter(r => r.studentId !== target.studentId);
    saveLocalData('mock_fee_records', records);

    return true;
  }
}

export async function addFeeRecord(recordData) {
  if (isFirebaseConfigured) {
    const finalData = {
      ...recordData,
      amount: Number(recordData.amount || 0),
      whatsappSent: recordData.whatsappSent || false,
      whatsappSentAt: recordData.whatsappSentAt || null,
      paymentDate: recordData.paymentDate ? recordData.paymentDate : null
    };
    const docRef = await addDoc(collection(db, 'feeRecords'), finalData);
    return { id: docRef.id, ...finalData };
  } else {
    const records = getLocalData('mock_fee_records', getInitialFeeRecords());
    const newRecord = {
      id: `fee_${Date.now()}`,
      ...recordData,
      amount: Number(recordData.amount || 0),
      whatsappSent: recordData.whatsappSent || false,
      whatsappSentAt: recordData.whatsappSentAt || null
    };
    records.push(newRecord);
    saveLocalData('mock_fee_records', records);
    return newRecord;
  }
}

export async function getFeesByStudent(studentId) {
  if (isFirebaseConfigured) {
    const q = query(collection(db, 'feeRecords'), where('studentId', '==', studentId));
    const qSnap = await getDocs(q);
    const records = [];
    qSnap.forEach(doc => {
      records.push({ id: doc.id, ...doc.data() });
    });
    // Sort records matching academic list order
    return records.sort((a, b) => ACADEMIC_MONTHS.indexOf(a.month) - ACADEMIC_MONTHS.indexOf(b.month));
  } else {
    const records = getLocalData('mock_fee_records', getInitialFeeRecords());
    const studentRecords = records.filter(r => r.studentId === studentId);
    return studentRecords.sort((a, b) => ACADEMIC_MONTHS.indexOf(a.month) - ACADEMIC_MONTHS.indexOf(b.month));
  }
}

export async function updateFeeRecord(id, updatedData) {
  if (isFirebaseConfigured) {
    const docRef = doc(db, 'feeRecords', id);
    if (updatedData.amount !== undefined) {
      updatedData.amount = Number(updatedData.amount);
    }
    await updateDoc(docRef, updatedData);
    const snap = await getDoc(docRef);
    return { id, ...snap.data() };
  } else {
    const records = getLocalData('mock_fee_records', getInitialFeeRecords());
    const index = records.findIndex(r => r.id === id);
    if (index === -1) throw new Error('Fee record not found.');

    if (updatedData.amount !== undefined) {
      updatedData.amount = Number(updatedData.amount);
    }

    records[index] = { ...records[index], ...updatedData };
    saveLocalData('mock_fee_records', records);
    return records[index];
  }
}

export async function getAllStudentsForNotification() {
  const students = await getStudents();
  return students
    .filter(s => s.status === 'active')
    .map(s => ({
      studentId: s.studentId,
      fullName: s.fullName,
      parentName: s.parentName,
      contact: s.contact,
      admissionNumber: s.admissionNumber,
      class: s.class
    }));
}

// ==========================================
// DB INTERNAL HELPER FUNCTIONS
// ==========================================

export async function initializeFeeRecordsForStudent(studentId, admissionNumber, monthlyFee) {
  const years = {
    "JUN": 2025, "JUL": 2025, "AUG": 2025, "SEP": 2025, "OCT": 2025, "NOV": 2025, "DEC": 2025,
    "JAN": 2026, "FEB": 2026, "MAR": 2026, "APR": 2026, "MAY": 2026
  };

  const existingRecords = await getFeesByStudent(studentId);
  if (existingRecords.length > 0) {
    // If records are already set up, sync admission number and update unpaid record amounts
    const syncTasks = existingRecords
      .map(r => {
        const updates = {};
        if (r.admissionNumber !== admissionNumber) {
          updates.admissionNumber = admissionNumber;
        }
        if (r.status === 'unpaid' && r.amount !== monthlyFee) {
          updates.amount = monthlyFee;
        }
        if (Object.keys(updates).length > 0) {
          return updateFeeRecord(r.id, updates);
        }
        return null;
      })
      .filter(Boolean);
    await Promise.all(syncTasks);
    return;
  }

  // Create all 12 monthly fee records in parallel
  await Promise.all(
    ACADEMIC_MONTHS.map(month => addFeeRecord({
      studentId,
      admissionNumber: admissionNumber || '',
      month,
      year: years[month],
      amount: monthlyFee,
      status: 'unpaid',
      paymentDate: null,
      paymentMode: '',
      receiptId: '',
      whatsappSent: false,
      whatsappSentAt: null
    }))
  );
}

/**
 * Returns summary stats for the dashboard
 */
export async function getDashboardStats() {
  const students = await getStudents();
  const activeStudents = students.filter(s => s.status === 'active');
  const pendingStudents = students.filter(s => s.status === 'pending_admission');
  
  let totalCollected = 0;
  let totalPending = 0;

  if (isFirebaseConfigured) {
    const feeRecordsSnap = await getDocs(collection(db, 'feeRecords'));
    feeRecordsSnap.forEach(doc => {
      const rec = doc.data();
      if (rec.status === 'paid') {
        totalCollected += Number(rec.amount || 0);
      } else if (rec.status === 'unpaid' || rec.status === 'partial') {
        totalPending += Number(rec.amount || 0);
      }
    });
  } else {
    const records = getLocalData('mock_fee_records', getInitialFeeRecords());
    records.forEach(rec => {
      if (rec.status === 'paid') {
        totalCollected += Number(rec.amount || 0);
      } else if (rec.status === 'unpaid' || rec.status === 'partial') {
        totalPending += Number(rec.amount || 0);
      }
    });
  }

  // Fetch recent notifications
  let recentLogs = [];
  if (isFirebaseConfigured) {
    try {
      const snap = await getDocs(query(collection(db, 'notifications'), orderBy('timestamp', 'desc')));
      snap.forEach(doc => {
        const data = doc.data();
        recentLogs.push({
          id: doc.id,
          ...data,
          time: data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleString() : new Date().toLocaleString()
        });
      });
    } catch (e) {
      console.warn('Error fetching notifications logs from Firestore, using empty list.');
    }
  } else {
    // Generate dummy logs if mock
    recentLogs = [
      { id: 'log_1', studentName: 'Aarav Sharma', admissionNumber: 'ADM-2025-001', phone: '9876543210', type: 'Receipt', status: 'Sent', time: new Date().toLocaleString() },
      { id: 'log_2', studentName: 'Dia Patel', admissionNumber: 'Pending', phone: '9823456789', type: 'Reminder', status: 'Failed', time: new Date(Date.now() - 3600000).toLocaleString() }
    ];
  }

  return {
    totalStudents: students.length,
    activeStudents: activeStudents.length,
    pendingStudents: pendingStudents.length,
    pendingStudentsList: pendingStudents, // Included so dashboard can list them
    totalCollected,
    totalPending,
    recentLogs: recentLogs.slice(0, 15)
  };
}

export async function getNextAdmissionNumber() {
  let students = [];
  if (isFirebaseConfigured) {
    const qSnap = await getDocs(collection(db, 'students'));
    qSnap.forEach(doc => {
      students.push(doc.data());
    });
  } else {
    students = getLocalData('mock_students', INITIAL_STUDENTS);
  }

  let maxNum = 0;
  const year = 2025; // Default academic year suffix used in application prefix

  students.forEach(s => {
    if (s.admissionNumber) {
      // Matches ADM-[YEAR]-[NUM] or ADM-[NUM]
      const match = s.admissionNumber.match(/ADM-(\d+)-(\d+)/);
      if (match) {
        const num = parseInt(match[2], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      } else {
        const simpleMatch = s.admissionNumber.match(/ADM-(\d+)/);
        if (simpleMatch) {
          const num = parseInt(simpleMatch[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    }
  });

  const nextNum = maxNum > 0 ? maxNum + 1 : 1;
  return `ADM-${year}-${String(nextNum).padStart(3, '0')}`;
}

/**
 * Permanently deletes all data (students, fee records, and notifications)
 * from either Firestore or LocalStorage.
 */
export async function clearAllData() {
  if (isFirebaseConfigured) {
    // 1. Delete all students
    const studentsSnap = await getDocs(collection(db, 'students'));
    const deleteStudents = studentsSnap.docs.map(docSnap => deleteDoc(doc(db, 'students', docSnap.id)));
    
    // 2. Delete all fee records
    const feeRecordsSnap = await getDocs(collection(db, 'feeRecords'));
    const deleteFeeRecords = feeRecordsSnap.docs.map(docSnap => deleteDoc(doc(db, 'feeRecords', docSnap.id)));
    
    // 3. Delete all notifications
    const notificationsSnap = await getDocs(collection(db, 'notifications'));
    const deleteNotifications = notificationsSnap.docs.map(docSnap => deleteDoc(doc(db, 'notifications', docSnap.id)));
    
    // Wait for all deletions to complete
    await Promise.all([...deleteStudents, ...deleteFeeRecords, ...deleteNotifications]);
  } else {
    // LocalStorage fallback
    localStorage.removeItem('mock_students');
    localStorage.removeItem('mock_fee_records');
  }
}

