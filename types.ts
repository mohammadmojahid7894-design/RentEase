export enum UserRole {
  OWNER = 'OWNER',
  TENANT = 'TENANT',
  BROKER = 'BROKER',
  ADMIN = 'ADMIN'
}

export enum PropertyType {
  BHK1 = '1 BHK',
  BHK2 = '2 BHK',
  BHK3 = '3 BHK',
  ROOM = 'Single Room',
  FLAT = 'Flat',
  HOUSE = 'Independent House'
}

export enum PaymentStatus {
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  DUE = 'DUE',
  OVERDUE = 'OVERDUE'
}

export enum ComplaintStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED'
}

export enum RentRecordStatus {
  PENDING = 'pending',
  PAID = 'paid',
  LATE = 'late'
}

export enum ComplaintPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export interface User {
  id: string; // This corresponds to userId from firestore
  systemId?: string; // e.g. RE-OWN-4821 or RE-TEN-1923
  name: string;
  phone: string;
  role: UserRole;
  email?: string;
  profilePhoto?: string;
  aadhaarUrl?: string;
  idProofUrl?: string;
  aadhaarNumber?: string;
  documents?: {
    aadhaarUrl?: string;
    idProofUrl?: string;
    profilePhotoUrl?: string;
  };
}

export interface Property {
  id: string;
  ownerId: string;
  propertyTitle: string;
  location: string;
  rentAmount: number;
  securityDeposit?: number;
  description: string;
  propertyType: PropertyType;
  availabilityStatus: 'available' | 'rented';
  createdAt: string;
  // Admin review fields
  status?: 'pending' | 'approved' | 'rejected' | 'under_review';
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  verificationNotes?: string;
  isVisibleToTenants?: boolean;
  // Legacy fields
  name?: string;
  address?: string;
  city?: string;
  dueDay?: number;
  isOccupied?: boolean;
  tenantId?: string;
  images?: string[];
  totalUnits?: number;
  floorsCount?: number;
}

export interface PropertyUnit {
  id: string; // unitId
  unitNumber: number;
  status: 'vacant' | 'occupied';
  tenantId?: string;
  rentAmount: number;
  securityDeposit?: number;
  createdAt?: string;
}

export interface PropertyFloor {
  id: string; // floorId
  floorNumber: number;
  rentPrice: number;
  status: 'vacant' | 'occupied' | 'partial';
  maxTenants?: number;
  tenantId?: string;
  securityDeposit?: number;
  createdAt?: string;
}

export interface InterestRequest {
  id?: string;
  tenantId: string;
  propertyId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  assignedUnitId?: string;
  unitId?: string;
  depositAmount?: number;
  selectedFloors?: string[];
  totalRent?: number;
}

export interface ManualTenant {
  id?: string;
  tenantName: string;
  phone: string;
  aadhaarNumber?: string;
  idProofUrl?: string; // Actually idProofUpload URL
  propertyId: string;
  unitId: string;
  rentAmount: number;
  moveInDate?: string;
  createdByOwner: string;
  createdAt: string;
  floorId?: string;
}

export interface Payment {
  id: string;
  propertyId: string;
  tenantId: string;
  amount: number;
  month: string;
  status: PaymentStatus;
  datePaid?: string;
  type: 'RENT' | 'ELECTRICITY' | 'WATER' | 'MAINTENANCE';
  reminderSent?: boolean;
}

export interface Complaint {
  id?: string;
  tenantId: string;
  propertyId: string;
  unitId?: string;
  title: string;
  description: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  date: string;
  createdAt: string;
  images?: string[];
}

// ── Rent Notice ───────────────────────────────────────────────────────────────
export interface RentNotice {
  id?: string;
  tenantId: string;
  ownerId: string;
  propertyId: string;
  month: string;
  rentAmount: number;
  dueDate: string;
  message: string;
  status: 'pending' | 'paid';
  createdAt: string;
}

// ── Rent Payment Record ───────────────────────────────────────────────────────
export interface RentPaymentRecord {
  id?: string;
  tenantId: string;
  propertyId: string;
  noticeId: string;
  amount: number;
  month: string;
  paymentDate: string;
  paymentMethod: string;
  status: 'completed';
  createdAt: string;
}

// ── Rent Record (Monthly Tracking) ───────────────────────────────────────────
export interface RentRecord {
  id?: string;
  tenantId: string;
  propertyId: string;
  unitId?: string;
  month: string;
  rentAmount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'late';
  paymentDate?: string;
  createdAt: string;
}

// ── App Notification ──────────────────────────────────────────────────────────
export interface AppNotification {
  id?: string;
  userId: string;
  type: 'payment' | 'notice' | 'alert' | 'request' | 'reminder' | 'complaint';
  message: string;
  status: 'unread' | 'read';
  createdAt: string;
}


