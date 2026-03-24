import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

const LATE_FEE_PER_DAY = 100; // ₹100/day configurable

// ── Get next month's due date from a given date ──────────────────────────────
export const getNextMonthDueDate = (fromDate: string): string => {
  const d = new Date(fromDate);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString();
};

// ── Format month label (e.g. "April 2026") ──────────────────────────────────
export const getMonthLabel = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
};

// ── Calculate days overdue ──────────────────────────────────────────────────
export const getDaysOverdue = (dueDate: string): number => {
  const now = new Date();
  const due = new Date(dueDate);
  if (now <= due) return 0;
  const diffMs = now.getTime() - due.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

// ── Calculate late fee ──────────────────────────────────────────────────────
export const calculateLateFee = (dueDate: string, perDay: number = LATE_FEE_PER_DAY): number => {
  const days = getDaysOverdue(dueDate);
  return days * perDay;
};

// ── Create first rent record after initial payment ──────────────────────────
export const createFirstRentRecord = async (
  tenantId: string,
  propertyId: string,
  rentAmount: number,
  unitIds?: string[]
) => {
  const now = new Date();
  const rentStartDate = now.toISOString();
  const nextDue = new Date(now);
  nextDue.setMonth(nextDue.getMonth() + 1);
  const nextDueDate = nextDue.toISOString();
  const month = getMonthLabel(nextDueDate);

  await addDoc(collection(db, 'rentRecords'), {
    tenantId,
    propertyId,
    unitId: unitIds?.[0] || '',
    month,
    rentAmount,
    dueDate: nextDueDate,
    status: 'pending',
    lateFee: 0,
    lateFeePerDay: LATE_FEE_PER_DAY,
    rentStartDate,
    nextDueDate,
    reminderSent5: false,
    reminderSent2: false,
    reminderSentDue: false,
    createdAt: new Date().toISOString()
  });

  return { rentStartDate, nextDueDate, month };
};

// ── Create next cycle rent record after a payment ───────────────────────────
export const createNextCycleRecord = async (
  tenantId: string,
  propertyId: string,
  rentAmount: number,
  currentDueDate: string,
  unitId?: string
) => {
  const nextDue = new Date(currentDueDate);
  nextDue.setMonth(nextDue.getMonth() + 1);
  const nextDueDate = nextDue.toISOString();
  const month = getMonthLabel(nextDueDate);

  // Check if next cycle already exists
  const existingQ = query(
    collection(db, 'rentRecords'),
    where('tenantId', '==', tenantId),
    where('propertyId', '==', propertyId),
    where('month', '==', month)
  );
  const existing = await getDocs(existingQ);
  if (!existing.empty) return; // Already created

  await addDoc(collection(db, 'rentRecords'), {
    tenantId,
    propertyId,
    unitId: unitId || '',
    month,
    rentAmount,
    dueDate: nextDueDate,
    status: 'pending',
    lateFee: 0,
    lateFeePerDay: LATE_FEE_PER_DAY,
    nextDueDate,
    reminderSent5: false,
    reminderSent2: false,
    reminderSentDue: false,
    createdAt: new Date().toISOString()
  });
};

// ── Process overdue records & send reminders ────────────────────────────────
export const processRentCycles = async (tenantId: string) => {
  const q = query(
    collection(db, 'rentRecords'),
    where('tenantId', '==', tenantId),
    where('status', 'in', ['pending', 'late'])
  );
  const snap = await getDocs(q);
  const now = new Date();

  for (const docSnap of snap.docs) {
    const rec = docSnap.data();
    const dueDate = new Date(rec.dueDate);
    const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const updates: Record<string, any> = {};

    // ── Overdue check ──
    if (now > dueDate) {
      const daysOver = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const lateFee = daysOver * (rec.lateFeePerDay || LATE_FEE_PER_DAY);
      updates.status = 'overdue';
      updates.lateFee = lateFee;
    }

    // ── Reminder: 5 days before ──
    if (daysUntilDue <= 5 && daysUntilDue > 2 && !rec.reminderSent5) {
      await addDoc(collection(db, 'notifications'), {
        userId: tenantId,
        type: 'reminder',
        message: `⏰ Rent of ₹${rec.rentAmount} for ${rec.month} is due in ${daysUntilDue} days (${dueDate.toLocaleDateString()}).`,
        status: 'unread',
        createdAt: new Date().toISOString()
      });
      updates.reminderSent5 = true;
    }

    // ── Reminder: 2 days before ──
    if (daysUntilDue <= 2 && daysUntilDue > 0 && !rec.reminderSent2) {
      await addDoc(collection(db, 'notifications'), {
        userId: tenantId,
        type: 'reminder',
        message: `⚠️ Rent of ₹${rec.rentAmount} for ${rec.month} is due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}! Pay now to avoid late fees.`,
        status: 'unread',
        createdAt: new Date().toISOString()
      });
      updates.reminderSent2 = true;
    }

    // ── Reminder: on due date ──
    if (daysUntilDue <= 0 && daysUntilDue > -1 && !rec.reminderSentDue) {
      await addDoc(collection(db, 'notifications'), {
        userId: tenantId,
        type: 'reminder',
        message: `🚨 Rent of ₹${rec.rentAmount} for ${rec.month} is DUE TODAY! Late fees of ₹${LATE_FEE_PER_DAY}/day will apply from tomorrow.`,
        status: 'unread',
        createdAt: new Date().toISOString()
      });
      updates.reminderSentDue = true;
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      await updateDoc(doc(db, 'rentRecords', docSnap.id), updates);
    }
  }
};
