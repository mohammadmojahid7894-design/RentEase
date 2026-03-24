import React, { useState, useEffect, useCallback } from 'react';
import { User, Property, InterestRequest, PropertyType, PropertyUnit, RentNotice, RentPaymentRecord, AppNotification, Complaint, ComplaintStatus, ComplaintPriority, RentRecord } from '../types';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, onSnapshot, orderBy, deleteDoc } from 'firebase/firestore';
import { uploadImage } from "../cloudinary";
import { useAuth } from '../contexts/AuthContext';
import { Icons } from '../constants';
import Button from './Button';
import Layout from './Layout';
import Modal from './Modal';
import { TRANSLATIONS, Language } from '../translations';

interface OwnerPanelProps {
  user: User;
  lang: Language;
  onLogout: () => void;
}

const OwnerPanel: React.FC<OwnerPanelProps> = ({ user, lang, onLogout }) => {
  const { login } = useAuth();
  const [activeTab, setActiveTab] = useState('properties');
  const [properties, setProperties] = useState<Property[]>([]);
  const [requests, setRequests] = useState<InterestRequest[]>([]);
  const [tenants, setTenants] = useState<Record<string, User>>({}); // tenantId -> User
  const [manualTenants, setManualTenants] = useState<Record<string, any>>({}); // tenantId -> ManualTenant

  const [ownerStats, setOwnerStats] = useState({ totalProperties: 0, totalUnits: 0, occupied: 0, vacant: 0, totalMonthlyRentConfigured: 0 });
  const [propertyStats, setPropertyStats] = useState<Record<string, { totalUnits: number, occupied: number, vacant: number }>>({});

  const [loading, setLoading] = useState(true);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);

  // Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState({ name: user.name, phone: user.phone, email: user.email || '' });
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  // New Property State
  const [newProperty, setNewProperty] = useState({
    propertyTitle: '',
    location: '',
    rentAmount: '',
    securityDeposit: '',
    description: '',
    propertyType: PropertyType.FLAT,
    availabilityStatus: 'available',
    units: [{ unitId: `unit_${Date.now()}`, unitName: '', roomSize: '', rentAmount: 0, status: 'vacant' }] as PropertyUnit[]
  });
  const [addingProperty, setAddingProperty] = useState(false);
  const [newPropertyImages, setNewPropertyImages] = useState<File[]>([]);

  // Manual Tenant State
  const [isManualTenantModalOpen, setIsManualTenantModalOpen] = useState(false);
  const [manualTenantForm, setManualTenantForm] = useState({
    tenantName: '',
    phoneNumber: '',
    aadhaarNumber: '',
    rentAmount: '',
    moveInDate: ''
  });

  const [selectedUnitForManual, setSelectedUnitForManual] = useState<PropertyUnit | null>(null);
  const [submittingManualTenant, setSubmittingManualTenant] = useState(false);

  // Edit Unit State
  const [isEditUnitModalOpen, setIsEditUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<PropertyUnit | null>(null);
  const [editUnitData, setEditUnitData] = useState({ unitName: '', roomSize: '', rentAmount: '' });

  // Units Management State
  const [selectedPropertyForUnits, setSelectedPropertyForUnits] = useState<Property | null>(null);
  const [propertyUnits, setPropertyUnits] = useState<PropertyUnit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);

  // Assign Unit State
  const [isAssignUnitModalOpen, setIsAssignUnitModalOpen] = useState(false);
  const [requestToAssign, setRequestToAssign] = useState<InterestRequest | null>(null);
  const [availableUnitsForAssignment, setAvailableUnitsForAssignment] = useState<PropertyUnit[]>([]);
  const [selectedApproveUnitId, setSelectedApproveUnitId] = useState<string>('');

  // ── Notices State ─────────────────────────────────────────────────────────
  const [notices, setNotices] = useState<RentNotice[]>([]);
  const [isSendNoticeModalOpen, setIsSendNoticeModalOpen] = useState(false);
  const [sendingNotice, setSendingNotice] = useState(false);
  const [noticeForm, setNoticeForm] = useState({
    tenantId: '', propertyId: '', month: '', rentAmount: '', dueDate: '', message: ''
  });

  // ── Payments State ────────────────────────────────────────────────────────
  const [payments, setPayments] = useState<RentPaymentRecord[]>([]);


  // ── Notifications State ───────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // ── Complaints State ──────────────────────────────────────────────────────
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [updatingComplaintId, setUpdatingComplaintId] = useState<string | null>(null);

  // ── Rent Records State ────────────────────────────────────────────────────
  const [rentRecords, setRentRecords] = useState<RentRecord[]>([]);
  const [isGenRecordModalOpen, setIsGenRecordModalOpen] = useState(false);
  const [genRecordForm, setGenRecordForm] = useState({ tenantId: '', propertyId: '', month: '', rentAmount: '', dueDate: '' });
  const [generatingRecord, setGeneratingRecord] = useState(false);

  // ── Financial Summary ─────────────────────────────────────────────────────
  const [financialStats, setFinancialStats] = useState({
    totalMonthlyRent: 0, totalPaid: 0, totalPending: 0, totalLate: 0, lateCount: 0
  });

  // ── Occupied tenants map (for notice form dropdown) ───────────────────────
  const [occupiedTenants, setOccupiedTenants] = useState<{ tenantId: string; name: string; phone: string; propertyId: string; propertyTitle: string }[]>([]);


  const t = TRANSLATIONS[lang];

  // Fetch Owner's Properties
  useEffect(() => {
    if (!user.id) return;
    const q = query(collection(db, 'properties'), where('ownerId', '==', user.id));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const propsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
      const sortedProps = propsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setProperties(sortedProps);
      setLoading(false);

      // Compute stats
      let tUnits = 0;
      let occ = 0;
      const pStats: Record<string, { totalUnits: number, occupied: number, vacant: number }> = {};
      let tRent = 0;
      for (const p of sortedProps) {
        const units = p.units || [];
        const pTotal = units.length;
        let pOcc = 0;
        units.forEach(u => {
          if (u.status === 'occupied') {
            occ++;
            pOcc++;
            tRent += Number(u.rentAmount) || 0;
          }
        });
        tUnits += pTotal;
        pStats[p.id] = { totalUnits: pTotal, occupied: pOcc, vacant: pTotal - pOcc };
      }
      setPropertyStats(pStats);
      setOwnerStats({
        totalProperties: sortedProps.length,
        totalUnits: tUnits,
        occupied: occ,
        vacant: tUnits - occ,
        totalMonthlyRentConfigured: tRent
      });
    });
    return () => unsubscribe();
  }, [user.id]);

  // Fetch Notices sent by this owner
  useEffect(() => {
    if (!user.id) return;
    const q = query(collection(db, 'notices'), where('ownerId', '==', user.id));
    const unsub = onSnapshot(q, snap => {
      setNotices(snap.docs.map(d => ({ id: d.id, ...d.data() } as RentNotice)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });
    return () => unsub();
  }, [user.id]);

  // Fetch Payments for owner's properties
  useEffect(() => {
    if (properties.length === 0) return;
    const ids = properties.map(p => p.id);
    const unsubs: (() => void)[] = [];
    
    setPayments([]);
    for (let i = 0; i < ids.length; i += 10) {
      const chunk = ids.slice(i, i + 10);
      const unsub = onSnapshot(query(collection(db, 'rent_payments'), where('propertyId', 'in', chunk)), snap => {
        const chunkData = snap.docs.map(d => ({ id: d.id, ...d.data() } as RentPaymentRecord));
        setPayments(prev => {
          const others = prev.filter(p => !chunk.includes(p.propertyId));
          return [...others, ...chunkData].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        });
      });
      unsubs.push(unsub);
    }
    return () => unsubs.forEach(u => u());
  }, [properties]);

  // Fetch Notifications for owner
  useEffect(() => {
    if (!user.id) return;
    const q = query(collection(db, 'notifications'), where('userId', '==', user.id));
    const unsub = onSnapshot(q, snap => {
      const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => n.status === 'unread').length);
    });
    return () => unsub();
  }, [user.id]);

  // Fetch Complaints for owner's properties
  useEffect(() => {
    if (properties.length === 0) return;
    const ids = properties.map(p => p.id);
    const unsubs: (() => void)[] = [];

    setComplaints([]);
    for (let i = 0; i < ids.length; i += 10) {
      const chunk = ids.slice(i, i + 10);
      const unsub = onSnapshot(query(collection(db, 'complaints'), where('propertyId', 'in', chunk)), snap => {
        const chunkData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Complaint));
        setComplaints(prev => {
          const others = prev.filter(p => !chunk.includes(p.propertyId));
          return [...others, ...chunkData].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        });
      });
      unsubs.push(unsub);
    }
    return () => unsubs.forEach(u => u());
  }, [properties]);

  // Fetch Rent Records for owner's properties
  useEffect(() => {
    if (properties.length === 0) return;
    const ids = properties.map(p => p.id);
    const unsubs: (() => void)[] = [];

    setRentRecords([]);
    for (let i = 0; i < ids.length; i += 10) {
      const chunk = ids.slice(i, i + 10);
      const unsub = onSnapshot(query(collection(db, 'rentRecords'), where('propertyId', 'in', chunk)), snap => {
        const chunkData = snap.docs.map(d => ({ id: d.id, ...d.data() } as RentRecord));
        setRentRecords(prev => {
          const others = prev.filter(p => !chunk.includes(p.propertyId));
          return [...others, ...chunkData].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        });

        // Check for late payments
        const now = new Date();
        chunkData.forEach(async rec => {
          if (rec.status === 'pending') {
            const due = new Date(rec.dueDate);
            const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 0 && rec.id) {
              await updateDoc(doc(db, 'rentRecords', rec.id), { status: 'late' });
              await addDoc(collection(db, 'notifications'), {
                userId: rec.tenantId,
                type: 'alert',
                message: `⚠️ Your rent payment of ₹${rec.rentAmount} for ${rec.month} is overdue. Please pay immediately.`,
                status: 'unread',
                createdAt: new Date().toISOString()
              });
              await addDoc(collection(db, 'notifications'), {
                userId: user.id,
                type: 'alert',
                message: `Late payment: Tenant's rent of ₹${rec.rentAmount} for ${rec.month} is overdue.`,
                status: 'unread',
                createdAt: new Date().toISOString()
              });
            }
          }
        });
      });
      unsubs.push(unsub);
    }
    return () => unsubs.forEach(u => u());
  }, [properties, user.id]);

  // Compute financial stats from actual payments and records
  useEffect(() => {
    // Total Monthly Rent = Fixed Expectation computed from occupied units
    const totalMonthlyRent = ownerStats.totalMonthlyRentConfigured || 0;

    // Actually sum up real payments for "Total Paid" instead of only relying on rentRecords that are paid.
    // However, if the owner manually marks a record as paid but there's no payment record, it should still count.
    // Wait, rentRecords handles this cleanly now since payment modal syncs the two.
    const totalPaid = rentRecords.filter(r => r.status === 'paid').reduce((s, r) => s + r.rentAmount, 0);
    const totalPending = rentRecords.filter(r => r.status === 'pending').reduce((s, r) => s + r.rentAmount, 0);
    const totalLate = rentRecords.filter(r => r.status === 'late').reduce((s, r) => s + r.rentAmount, 0);
    const lateCount = rentRecords.filter(r => r.status === 'late').length;

    setFinancialStats({ totalMonthlyRent, totalPaid, totalPending, totalLate, lateCount });
  }, [rentRecords, ownerStats.totalMonthlyRentConfigured]);



  // Collect occupied tenants from manual tenants list for notice dropdown
  useEffect(() => {
    const list: typeof occupiedTenants = [];
    for (const [tid, mt] of Object.entries(manualTenants)) {
      const m = mt as any;
      const prop = properties.find(p => p.id === m.propertyId);
      if (prop) list.push({ tenantId: tid, name: m.tenantName ?? m.name ?? 'Unknown', phone: m.phone ?? m.phoneNumber ?? '', propertyId: prop.id, propertyTitle: prop.propertyTitle });
    }
    for (const [tid, t] of Object.entries(tenants)) {
      const tu = t as User;
      if (!list.find(x => x.tenantId === tid)) {
        const req = requests.find(r => r.tenantId === tid && r.status === 'approved');
        if (req) {
          const prop = properties.find(p => p.id === req.propertyId);
          if (prop) list.push({ tenantId: tid, name: tu.name, phone: tu.phone, propertyId: prop.id, propertyTitle: prop.propertyTitle });
        }
      }
    }
    setOccupiedTenants(list);
  }, [manualTenants, tenants, properties, requests]);

  // Fetch Requests for Owner's Properties
  useEffect(() => {
    if (properties.length === 0) return;
    const propertyIds = properties.map(p => p.id);

    // We have to batch in queries if propertyIds > 10, but assuming < 10 for simplicity
    const chunks = [];
    for (let i = 0; i < propertyIds.length; i += 10) {
      chunks.push(propertyIds.slice(i, i + 10));
    }

    const fetchRequests = async () => {
      let allReqs: InterestRequest[] = [];
      for (const chunk of chunks) {
        const reqQ = query(collection(db, 'requests'), where('propertyId', 'in', chunk));
        const snap = await getDocs(reqQ);
        allReqs = [...allReqs, ...snap.docs.map(d => ({ id: d.id, ...d.data() } as InterestRequest))];
      }
      setRequests(allReqs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

      // Fetch Tenant Data
      const tenantIds = [...new Set(allReqs.map(r => r.tenantId))];
      const newTenants: Record<string, User> = { ...tenants };
      let updated = false;
      for (const tid of tenantIds) {
        if (!newTenants[tid]) {
          const uQ = query(collection(db, 'users'), where('userId', '==', tid));
          const uSnap = await getDocs(uQ);
          if (!uSnap.empty) {
            const uData = uSnap.docs[0].data();
            newTenants[tid] = {
              id: uData.userId,
              name: uData.name,
              phone: uData.phone,
              role: uData.role,
              documents: uData.documents
            };
            updated = true;
          }
        }
      }
      if (updated || Object.keys(newTenants).length !== Object.keys(tenants).length) {
        setTenants(newTenants);
      }
    };

    fetchRequests();

    // Simple interval fallback if not using onSnapshot for derived data
    const interval = setInterval(fetchRequests, 10000);
    return () => clearInterval(interval);
  }, [properties]);

  // Fetch Units when Manage Units is open
  useEffect(() => {
    if (!selectedPropertyForUnits) {
      setPropertyUnits([]);
      return;
    }
    setUnitsLoading(true);

    // Listen to changes on the selected property document itself
    const q = doc(db, 'properties', selectedPropertyForUnits.id);
    const unsub = onSnapshot(q, async (snap) => {
      if (!snap.exists()) return;
      const propData = snap.data() as Property;
      const uData = propData.units || [];
      setPropertyUnits(uData);

      // Check if there are any missing tenants
      const missingTenantIds = uData.filter(u => u.status === 'occupied' && u.tenantId && !u.tenantId.startsWith('mt_') && !tenants[u.tenantId]).map(u => u.tenantId!);
      if (missingTenantIds.length > 0) {
        const newTenants = { ...tenants };
        let updated = false;
        for (const tid of missingTenantIds) {
          if (!newTenants[tid]) {
            const uQ = query(collection(db, 'users'), where('userId', '==', tid));
            const uSnap = await getDocs(uQ);
            if (!uSnap.empty) {
              const uData = uSnap.docs[0].data();
              newTenants[tid] = {
                id: uData.userId,
                name: uData.name,
                phone: uData.phone,
                role: uData.role,
                documents: uData.documents
              };
              updated = true;
            }
          }
        }
        if (updated || Object.keys(newTenants).length !== Object.keys(tenants).length) {
          setTenants(newTenants);
        }
      }

      // Fetch manual tenants check
      const missingManualTenantIds = uData.filter(u => u.status === 'occupied' && u.tenantId && u.tenantId.startsWith('mt_')).map(u => u.tenantId!);
      if (missingManualTenantIds.length > 0) {
        const newManuals = { ...manualTenants };
        let updated = false;
        for (const tid of missingManualTenantIds) {
          if (!newManuals[tid]) {
            const uQ = query(collection(db, 'tenants'), where('tenantId', '==', tid));
            const mSnap = await getDocs(uQ);
            if (!mSnap.empty) {
              newManuals[tid] = { ...mSnap.docs[0].data(), id: mSnap.docs[0].id };
              updated = true;
            } else {
              // If query fails, fetching document by id
              const mtDoc = await getDocs(query(collection(db, 'tenants')));
              const mtFound = mtDoc.docs.find(d => d.id === tid || d.data().tenantId === tid);
              if (mtFound) {
                newManuals[tid] = { ...mtFound.data(), id: mtFound.id };
                updated = true;
              }
            }
          }
        }
        if (updated) setManualTenants(newManuals);
      }
      setUnitsLoading(false);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPropertyForUnits]);

  const handleAddPropertySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingProperty(true);
    try {
      let imageUrls: string[] = [];
      if (newPropertyImages.length > 0) {
        imageUrls = await Promise.all(newPropertyImages.map(file => uploadImage(file)));
      }

      const propData = {
        ownerId: user.id,
        propertyTitle: newProperty.propertyTitle,
        location: newProperty.location,
        rentAmount: Number(newProperty.rentAmount),
        securityDeposit: Number(newProperty.securityDeposit) || 0,
        description: newProperty.description,
        propertyType: newProperty.propertyType,
        availabilityStatus: newProperty.availabilityStatus,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        isVisibleToTenants: false,
        createdAt: new Date().toISOString(),
        images: imageUrls,
        units: newProperty.units.map(u => ({ ...u, rentAmount: Number(u.rentAmount) }))
      };
      await addDoc(collection(db, 'properties'), propData);

      setIsPropertyModalOpen(false);
      setNewPropertyImages([]);
      setNewProperty({
        propertyTitle: '',
        location: '',
        rentAmount: '',
        securityDeposit: '',
        description: '',
        propertyType: PropertyType.FLAT,
        availabilityStatus: 'available',
        units: [{ unitId: `unit_${Date.now()}`, unitName: '', roomSize: '', rentAmount: 0, status: 'vacant' }] as PropertyUnit[]
      });
      alert('Your property has been submitted for approval. It will be visible to tenants once approved by the admin.');
    } catch (err) {
      console.error(err);
      alert('Failed to add property');
    } finally {
      setAddingProperty(false);
    }
  };

  const handleApproveClick = async (req: InterestRequest) => {
    const confirm = window.confirm('Are you sure you want to approve this request?');
    if (!confirm) return;

    try {
      if (req.selectedUnits && req.selectedUnits.length > 0) {
        const propRef = doc(db, 'properties', req.propertyId);
        const prop = properties.find(p => p.id === req.propertyId);
        if (prop) {
          const updatedUnits = prop.units?.map(u =>
            req.selectedUnits?.includes(u.unitId) ? { ...u, status: 'occupied' as const, tenantId: req.tenantId } : u
          ) || [];
          await updateDoc(propRef, { units: updatedUnits });
        }
      }

      // Update request status
      await updateDoc(doc(db, 'requests', req.id!), {
        status: 'approved',
      });

      alert('Request approved! Units assigned.');
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved' } : r));
    } catch (err) {
      console.error(err);
      alert("Failed to approve request");
    }
  };

  const handleReject = async (reqId: string) => {
    try {
      await updateDoc(doc(db, 'requests', reqId), {
        status: 'rejected'
      });
      setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'rejected' } : r));
    } catch (err) {
      alert('Error rejecting request');
    }
  };

  const handleMarkVacant = async (unit: PropertyUnit) => {
    if (!selectedPropertyForUnits) return;
    const confirm = window.confirm(`Are you sure you want to mark ${unit.unitName} as vacant?`);
    if (!confirm) return;
    try {
      const updatedUnits = selectedPropertyForUnits.units?.map(u => u.unitId === unit.unitId ? { ...u, status: 'vacant' as const, tenantId: '' } : u) || [];
      await updateDoc(doc(db, 'properties', selectedPropertyForUnits.id), { units: updatedUnits });
      alert(`${unit.unitName} is now vacant.`);
    } catch (e) {
      console.error(e);
      alert("Error marking unit vacant");
    }
  };

  const handleEditUnitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPropertyForUnits || !editingUnit) return;
    try {
      const updatedUnits = selectedPropertyForUnits.units?.map(u =>
        u.unitId === editingUnit.unitId ? { ...u, unitName: editUnitData.unitName, roomSize: editUnitData.roomSize, rentAmount: Number(editUnitData.rentAmount) } : u
      ) || [];
      await updateDoc(doc(db, 'properties', selectedPropertyForUnits.id), { units: updatedUnits });
      alert("Unit details updated!");
      setIsEditUnitModalOpen(false);
      setEditingUnit(null);
    } catch (e) {
      alert("Error updating unit");
    }
  };

  const handleManualTenantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPropertyForUnits || !selectedUnitForManual) return;
    setSubmittingManualTenant(true);

    try {


      const tenantId = `mt_${Date.now()}`;

      const newTenantData = {
        tenantId,
        tenantName: manualTenantForm.tenantName,
        phone: manualTenantForm.phoneNumber,
        aadhaarNumber: manualTenantForm.aadhaarNumber,

        propertyId: selectedPropertyForUnits.id,
        unitId: selectedUnitForManual.unitId,
        rentAmount: Number(manualTenantForm.rentAmount) || selectedUnitForManual.rentAmount,
        moveInDate: manualTenantForm.moveInDate,
        createdByOwner: user.id,
        createdAt: new Date().toISOString()
      };

      const updatedUnits = selectedPropertyForUnits.units?.map(u =>
        u.unitId === selectedUnitForManual.unitId ? { ...u, status: 'occupied' as const, tenantId: tenantId } : u
      ) || [];
      await updateDoc(doc(db, 'properties', selectedPropertyForUnits.id), { units: updatedUnits });

      await addDoc(collection(db, 'tenants'), newTenantData);

      alert("Tenant added manually successfully!");
      setIsManualTenantModalOpen(false);
      setManualTenantForm({
        tenantName: '', phoneNumber: '', aadhaarNumber: '', rentAmount: '', moveInDate: ''
      });
      setSelectedUnitForManual(null);
    } catch (err) {
      console.error(err);
      alert("Failed to add tenant manually");
    } finally {
      setSubmittingManualTenant(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSubmitting(true);

    try {
      const uQ = query(collection(db, 'users'), where('userId', '==', user.id));
      const uSnap = await getDocs(uQ);
      if (uSnap.empty) {
        alert("User record not found");
        setProfileSubmitting(false);
        return;
      }
      const userDocId = uSnap.docs[0].id;

      let photoUrl = user.profilePhoto || user.documents?.profilePhotoUrl;
      if (profilePhotoFile) {
        photoUrl = await uploadImage(profilePhotoFile);
        console.log("Photo URL:", photoUrl);
      }

      const updateData = {
        name: editProfileData.name,
        phone: editProfileData.phone,
        email: editProfileData.email || null,
        profilePhoto: photoUrl
      };

      await updateDoc(doc(db, 'users', userDocId), updateData);

      await login({
        ...user,
        name: editProfileData.name,
        phone: editProfileData.phone,
        email: editProfileData.email,
        profilePhoto: photoUrl
      });

      setIsEditingProfile(false);
      alert('Profile updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to update profile');
    } finally {
      setProfileSubmitting(false);
    }
  };

  // ── Delete Property ──────────────────────────────────────────────────────────
  const handleDeleteProperty = async (property: Property) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${property.propertyTitle}"?\n\nThis will permanently remove the property and all its units. This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      // Delete the property document itself
      await deleteDoc(doc(db, 'properties', property.id));

      alert(`Property "${property.propertyTitle}" has been deleted successfully.`);
    } catch (err) {
      console.error(err);
      alert('Failed to delete property. Please try again.');
    }
  };

  // ── Send Rent Notice ────────────────────────────────────────────────────────
  const handleSendNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeForm.tenantId || !noticeForm.propertyId) {
      alert('Please select a tenant and property.');
      return;
    }
    setSendingNotice(true);
    try {
      const prop = properties.find(p => p.id === noticeForm.propertyId);
      const noticeData = {
        tenantId: noticeForm.tenantId,
        ownerId: user.id,
        propertyId: noticeForm.propertyId,
        month: noticeForm.month,
        rentAmount: Number(noticeForm.rentAmount),
        dueDate: noticeForm.dueDate,
        message: noticeForm.message || `Your monthly rent for ${noticeForm.month} is due.`,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'notices'), noticeData);

      // Auto-generate a Rent Record if it doesn't exist for financial tracking
      const recordsQ = query(
        collection(db, 'rentRecords'),
        where('tenantId', '==', noticeForm.tenantId),
        where('propertyId', '==', noticeForm.propertyId),
        where('month', '==', noticeForm.month)
      );
      const recordsSnap = await getDocs(recordsQ);
      if (recordsSnap.empty) {
        await addDoc(collection(db, 'rentRecords'), {
          tenantId: noticeForm.tenantId,
          propertyId: noticeForm.propertyId,
          month: noticeForm.month,
          rentAmount: Number(noticeForm.rentAmount),
          dueDate: noticeForm.dueDate,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
      }

      // Notify the tenant
      await addDoc(collection(db, 'notifications'), {
        userId: noticeForm.tenantId,
        type: 'notice',
        message: `New rent notice: ₹${noticeForm.rentAmount} due for ${noticeForm.month} at ${prop?.propertyTitle || 'your property'}.`,
        status: 'unread',
        createdAt: new Date().toISOString()
      });
      setIsSendNoticeModalOpen(false);
      setNoticeForm({ tenantId: '', propertyId: '', month: '', rentAmount: '', dueDate: '', message: '' });
      alert('Rent notice sent successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to send notice.');
    } finally {
      setSendingNotice(false);
    }
  };

  // ── Mark all notifications read ─────────────────────────────────────────────
  const markAllRead = async () => {
    const unread = notifications.filter(n => n.status === 'unread' && n.id);
    for (const n of unread) {
      await updateDoc(doc(db, 'notifications', n.id!), { status: 'read' });
    }
  };

  // ── Generate Rent Record ─────────────────────────────────────────────────────
  const handleGenerateRentRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genRecordForm.tenantId || !genRecordForm.propertyId) {
      alert('Please select a tenant and property.');
      return;
    }
    setGeneratingRecord(true);
    try {
      const prop = properties.find(p => p.id === genRecordForm.propertyId);
      const recordData: Omit<RentRecord, 'id'> = {
        tenantId: genRecordForm.tenantId,
        propertyId: genRecordForm.propertyId,
        month: genRecordForm.month,
        rentAmount: Number(genRecordForm.rentAmount),
        dueDate: genRecordForm.dueDate,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'rentRecords'), recordData);
      // Notify tenant
      await addDoc(collection(db, 'notifications'), {
        userId: genRecordForm.tenantId,
        type: 'notice',
        message: `📋 Rent record generated: ₹${genRecordForm.rentAmount} due for ${genRecordForm.month} at ${prop?.propertyTitle || 'your property'}. Due date: ${genRecordForm.dueDate}.`,
        status: 'unread',
        createdAt: new Date().toISOString()
      });
      setIsGenRecordModalOpen(false);
      setGenRecordForm({ tenantId: '', propertyId: '', month: '', rentAmount: '', dueDate: '' });
      alert('Rent record generated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to generate rent record.');
    } finally {
      setGeneratingRecord(false);
    }
  };

  // ── Mark Rent Record as Paid ─────────────────────────────────────────────────
  const handleMarkRentPaid = async (record: RentRecord) => {
    if (!record.id) return;
    try {
      await updateDoc(doc(db, 'rentRecords', record.id), {
        status: 'paid',
        paymentDate: new Date().toISOString()
      });

      // Maintain consistency in Payments tab
      await addDoc(collection(db, 'rent_payments'), {
        tenantId: record.tenantId,
        ownerId: user.id,
        propertyId: record.propertyId,
        noticeId: record.id,
        amount: record.rentAmount,
        month: record.month,
        paymentDate: new Date().toISOString(),
        paymentMethod: 'Manual (Owner)',
        transactionId: `TXN-MANUAL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        status: 'completed',
        createdAt: new Date().toISOString()
      });

      await addDoc(collection(db, 'notifications'), {
        userId: record.tenantId,
        type: 'payment',
        message: `✅ Your rent of ₹${record.rentAmount} for ${record.month} has been marked as paid by the owner.`,
        status: 'unread',
        createdAt: new Date().toISOString()
      });
      alert('Rent record marked as paid!');
    } catch (err) {
      alert('Failed to update rent record.');
    }
  };

  // ── Update Complaint Status ───────────────────────────────────────────────────
  const handleUpdateComplaintStatus = async (complaint: Complaint, newStatus: ComplaintStatus) => {
    if (!complaint.id) return;
    setUpdatingComplaintId(complaint.id);
    try {
      await updateDoc(doc(db, 'complaints', complaint.id), { status: newStatus });
      // Notify tenant
      const statusLabel = newStatus === ComplaintStatus.IN_PROGRESS ? 'is being addressed' : 'has been resolved';
      await addDoc(collection(db, 'notifications'), {
        userId: complaint.tenantId,
        type: 'complaint',
        message: `🔧 Your complaint "${complaint.title}" ${statusLabel}.`,
        status: 'unread',
        createdAt: new Date().toISOString()
      });
      setComplaints(prev => prev.map(c => c.id === complaint.id ? { ...c, status: newStatus } : c));
    } catch (err) {
      alert('Failed to update complaint status.');
    } finally {
      setUpdatingComplaintId(null);
    }
  };

  const tabs = [
    { id: 'properties', label: t.myProperties, icon: Icons.Home },
    { id: 'requests', label: 'Requests', icon: Icons.Users },
    { id: 'financial', label: 'Financial', icon: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg> },
    { id: 'rent-records', label: 'Rent Records', icon: Icons.Rent },
    { id: 'notices', label: 'Notices', icon: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg> },
    { id: 'payments', label: 'Payments', icon: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg> },
    { id: 'complaints', label: `Complaints${complaints.filter(c => c.status === ComplaintStatus.OPEN).length > 0 ? ` (${complaints.filter(c => c.status === ComplaintStatus.OPEN).length})` : ''}`, icon: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg> },
    { id: 'notifications', label: `Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}`, icon: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg> },
    { id: 'profile', label: 'Profile', icon: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg> }
  ];


  if (loading) return <div className="p-8 flex items-center justify-center">Loading Data...</div>;

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      tabs={tabs}
      lang={lang}
      onLogout={onLogout}
      userRole="Owner Dashboard"
    >
      <div className="space-y-6 animate-fadeIn">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-xl font-bold text-[#4B5EAA]">Owner Dashboard</h2>
              <p className="text-sm text-[#8E9491]">Welcome, {user.name}!</p>
              {user.systemId && (
                <span className="inline-block mt-1 text-xs font-mono font-bold bg-[#EEF2FF] text-[#4B5EAA] border border-[#C7D2FE] px-2 py-0.5 rounded-full">
                  ID: {user.systemId}
                </span>
              )}
            </div>
          </div>
        </div>

        {activeTab === 'profile' && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">My Profile</h3>
              {!isEditingProfile && (
                <Button onClick={() => setIsEditingProfile(true)} variant="outline" className="!px-4 !py-2 !text-sm">
                  Edit Profile
                </Button>
              )}
            </div>

            <div className="bg-white p-8 rounded-2xl border border-[#EAEAEA] shadow-sm">
              {!isEditingProfile ? (
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                  <div className="shrink-0 relative">
                    {user.profilePhoto ? (
                      <img src={user.profilePhoto} alt="Profile" className="w-32 h-32 rounded-full object-cover shadow-md border-4 border-white" />
                    ) : (
                      <div className="w-32 h-32 bg-[#4B5EAA] text-white rounded-full flex items-center justify-center text-5xl font-bold shadow-md border-4 border-white">
                        {user.name.charAt(0)}
                      </div>
                    )}
                    <div className="absolute -bottom-2 right-4 bg-[#E8F5E9] text-[#2E7D32] text-xs font-bold px-3 py-1 rounded-full shadow border border-[#C8E6C9]">{user.role}</div>
                  </div>
                  <div className="space-y-4 w-full">
                    <div className="pb-4 border-b border-gray-100">
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Full Name</p>
                      <p className="text-lg font-bold text-gray-800">{user.name}</p>
                    </div>
                    {user.systemId && (
                      <div className="pb-4 border-b border-gray-100">
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">System ID</p>
                        <p className="text-lg font-bold font-mono text-[#4B5EAA]">{user.systemId}</p>
                      </div>
                    )}
                    <div className="pb-4 border-b border-gray-100">
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Phone Number</p>
                      <p className="text-lg font-bold text-gray-800">{user.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Email <span className="text-gray-300 normal-case font-normal">(Optional)</span></p>
                      <p className="text-lg font-bold text-gray-800">{user.email || <span className="text-gray-400 italic">Not provided</span>}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="shrink-0 mx-auto md:mx-0">
                      {profilePhotoFile ? (
                        <img src={URL.createObjectURL(profilePhotoFile)} alt="Preview" className="w-32 h-32 rounded-full object-cover shadow-md" />
                      ) : user.profilePhoto ? (
                        <img src={user.profilePhoto} alt="Profile" className="w-32 h-32 rounded-full object-cover shadow-md" />
                      ) : (
                        <div className="w-32 h-32 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center text-5xl font-bold shadow-sm border border-gray-200">
                          {user.name.charAt(0)}
                        </div>
                      )}
                      <label className="block mt-4 text-center cursor-pointer text-sm font-semibold text-[#1565C0] hover:text-[#0D47A1]">
                        Change Photo
                        <input type="file" accept="image/*" onChange={e => setProfilePhotoFile(e.target.files?.[0] || null)} className="hidden" />
                      </label>
                    </div>

                    <div className="w-full space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                        <input required value={editProfileData.name} onChange={e => setEditProfileData({ ...editProfileData, name: e.target.value })} className="w-full p-3 rounded-xl border border-[#EAEAEA] bg-[#F9F8F6] focus:border-[#4B5EAA] focus:ring-1 focus:ring-[#4B5EAA]" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                        <input required type="tel" value={editProfileData.phone} onChange={e => setEditProfileData({ ...editProfileData, phone: e.target.value })} className="w-full p-3 rounded-xl border border-[#EAEAEA] bg-[#F9F8F6] focus:border-[#4B5EAA] focus:ring-1 focus:ring-[#4B5EAA]" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-gray-400 font-normal">(Optional)</span></label>
                        <input type="email" value={editProfileData.email} onChange={e => setEditProfileData({ ...editProfileData, email: e.target.value })} className="w-full p-3 rounded-xl border border-[#EAEAEA] bg-[#F9F8F6] focus:border-[#4B5EAA] focus:ring-1 focus:ring-[#4B5EAA]" />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-100 mt-6 justify-end">
                    <Button type="button" variant="outline" onClick={() => { setIsEditingProfile(false); setProfilePhotoFile(null); setEditProfileData({ name: user.name, phone: user.phone, email: user.email || '' }); }}>Cancel</Button>
                    <Button type="submit" disabled={profileSubmitting}>{profileSubmitting ? 'Saving...' : 'Save Changes'}</Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {activeTab === 'properties' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-[#EAEAEA] text-center">
                <p className="text-gray-500 text-sm font-semibold uppercase">Properties</p>
                <p className="text-2xl font-bold text-[#4B5EAA]">{ownerStats.totalProperties}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-[#EAEAEA] text-center">
                <p className="text-gray-500 text-sm font-semibold uppercase">Total Units</p>
                <p className="text-2xl font-bold text-gray-800">{ownerStats.totalUnits}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-[#EAEAEA] text-center border-b-4 border-green-500">
                <p className="text-gray-500 text-sm font-semibold uppercase">Occupied Units</p>
                <p className="text-2xl font-bold text-green-600">{ownerStats.occupied}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-[#EAEAEA] text-center border-b-4 border-yellow-500">
                <p className="text-gray-500 text-sm font-semibold uppercase">Vacant</p>
                <p className="text-2xl font-bold text-yellow-600">{ownerStats.vacant}</p>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold">{t.myProperties}</h3>
              <Button onClick={() => setIsPropertyModalOpen(true)} variant="primary" className="!px-4 !py-2 !text-sm !rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <Icons.Add /> <span className="ml-1">{t.addNew}</span>
              </Button>
            </div>

            {properties.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-[#EAEAEA]">
                <Icons.Home />
                <p className="mt-4 text-lg text-gray-500">You haven't listed any properties yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map(p => (
                  <div key={p.id} className="bg-white rounded-2xl border border-[#EAEAEA] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col h-full border-t-4 border-t-[#4B5EAA]">
                    {p.images && p.images.length > 0 && (
                      <div className="w-full h-40 bg-gray-100 flex overflow-x-auto snap-x snap-mandatory relative" style={{ scrollbarWidth: 'none' }}>
                        {p.images.map((imgUrl, i) => (
                          <img key={i} src={imgUrl} alt={`${p.propertyTitle} image ${i + 1}`} className="w-full h-full object-cover shrink-0 snap-center" />
                        ))}
                        {p.images.length > 1 && (
                          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full font-bold shadow">
                            {p.images.length} Photos
                          </div>
                        )}
                      </div>
                    )}
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide mb-2 inline-block ${p.status === 'approved' ? 'bg-[#E8F5E9] text-[#2E7D32]' : p.status === 'rejected' ? 'bg-[#FFEBEE] text-[#C62828]' : 'bg-[#FFF8E1] text-[#F57F17]'}`}>
                            {p.status === 'approved' ? 'Approved' : p.status === 'rejected' ? 'Rejected' : 'Pending Approval'}
                          </span>
                          <h4 className="text-lg font-bold text-[#2D3436]">{p.propertyTitle}</h4>
                          {p.status === 'rejected' && p.rejectionReason && (
                            <p className="text-xs text-red-600 bg-red-50 p-2 rounded mt-1 border border-red-100">
                              <span className="font-bold">Reason:</span> {p.rejectionReason}
                            </p>
                          )}
                          <p className="text-sm text-[#8E9491] flex items-center gap-1 mt-1">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.536l.034.017Zm.31-10.433a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" clipRule="evenodd" /></svg>
                            {p.location}
                          </p>
                        </div>
                        <p className="font-bold text-[#4B5EAA] text-xl">₹{p.rentAmount}<span className="text-sm font-normal text-[#8E9491]">/mo</span></p>
                      </div>

                      <div className="bg-[#F9F8F6] p-3 rounded-xl mb-4 text-sm text-gray-700">
                        {p.description.length > 80 ? p.description.substring(0, 80) + '...' : p.description}
                      </div>

                      <div className="flex justify-between items-center text-sm font-medium text-gray-500 border-t border-[#EAEAEA] pt-4 mt-auto">
                        <div className="flex flex-col">
                          <span className="text-[#2D3436] font-bold flex items-center gap-1"><Icons.Home /> {propertyStats[p.id]?.totalUnits || p.units?.length || 1} Total Units</span>
                          {propertyStats[p.id] && (
                            <span className="text-xs mt-1"><span className="text-green-600 font-bold">{propertyStats[p.id].occupied} Occupied</span> | <span className="text-yellow-600 font-bold">{propertyStats[p.id].vacant} Vacant</span></span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" className="!py-1 !px-3 !text-xs !bg-[#E3F2FD] !border-[#BBDEFB] !text-[#1565C0] font-semibold h-fit" onClick={() => setSelectedPropertyForUnits(p)}>Manage Units</Button>
                          <button
                            onClick={() => handleDeleteProperty(p)}
                            title="Delete Property"
                            className="p-1.5 rounded-lg bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 hover:text-red-700 hover:border-red-400 transition-all duration-200"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold">Tenant Interest Requests</h3>

            {requests.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-[#EAEAEA]">
                <p className="text-lg text-gray-500">No requests from tenants yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map(req => {
                  const prop = properties.find(p => p.id === req.propertyId);
                  const tenant = tenants[req.tenantId];
                  return (
                    <div key={req.id} className="bg-white p-6 rounded-2xl border border-[#EAEAEA] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${req.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            req.status === 'approved' ? 'bg-green-100 text-green-700' :
                              'bg-red-100 text-red-700'
                            }`}>{req.status}</span>
                          <span className="text-sm text-gray-500">{new Date(req.createdAt).toLocaleDateString()}</span>
                        </div>
                        <h4 className="text-lg font-bold text-[#2D3436]">
                          Property: <span className="text-[#4B5EAA]">{prop?.propertyTitle || 'Unknown'}</span>
                        </h4>

                        {tenant ? (
                          <div className="mt-4 bg-[#F9F8F6] p-4 rounded-xl border border-gray-200">
                            <p className="font-semibold text-gray-800">Tenant: {tenant.name}</p>
                            <p className="text-sm text-gray-600">Phone: {tenant.phone}</p>
                            <div className="mt-3 flex gap-3 text-sm">
                              <a href={tenant.documents?.aadhaarUrl || '#'} target="_blank" rel="noreferrer" className="text-[#1565C0] underline font-medium">Aadhaar Card</a>
                              <a href={tenant.documents?.idProofUrl || '#'} target="_blank" rel="noreferrer" className="text-[#1565C0] underline font-medium">ID Proof</a>
                              <a href={tenant.documents?.profilePhotoUrl || '#'} target="_blank" rel="noreferrer" className="text-[#1565C0] underline font-medium">Photo</a>
                            </div>
                            {req.depositAmount ? <p className="text-sm text-green-700 mt-2 font-semibold border-t pt-2">Agreed to deposit: ₹{req.depositAmount}</p> : null}
                          </div>
                        ) : (
                          <div className="mt-4 bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm text-gray-500">
                            Wait for user details or user manually added...
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-3 w-full md:w-auto">
                        <span className="text-lg font-bold text-[#4B5EAA] text-right">Requested Units: {req.selectedUnits ? req.selectedUnits.map(uid => uid.substring(0, 10)).join(', ') : 'Any'}</span>
                        {req.totalRent && <span className="text-lg font-bold text-gray-700 text-right">Total Rent: ₹{req.totalRent}</span>}
                        {req.status === 'pending' && (
                          <div className="flex gap-2">
                            <button onClick={() => req.id && handleReject(req.id)} className="flex-1 px-4 py-2 border border-red-500 text-red-500 rounded-lg font-medium hover:bg-red-50 transition-colors">Reject</button>
                            <button onClick={() => handleApproveClick(req)} className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 shadow border border-transparent transition-colors">Approve</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Notices Tab ──────────────────────────────────────────── */}
        {activeTab === 'notices' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold">Rent Notices</h3>
              <Button onClick={() => setIsSendNoticeModalOpen(true)} variant="primary" className="!px-4 !py-2 !text-sm">+ Send Notice</Button>
            </div>
            {notices.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-[#EAEAEA]"><p className="text-lg text-gray-500">No rent notices sent yet.</p></div>
            ) : (
              <div className="space-y-4">
                {notices.map(notice => {
                  const prop = properties.find(p => p.id === notice.propertyId);
                  const tnt = (tenants[notice.tenantId] || manualTenants[notice.tenantId]) as any;
                  const tntName = tnt ? (tnt.tenantName || tnt.name || 'Tenant') : notice.tenantId.substring(0, 8);
                  return (
                    <div key={notice.id} className="bg-white p-5 rounded-2xl border border-[#EAEAEA] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${notice.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{notice.status}</span>
                          <span className="text-xs text-gray-400">{new Date(notice.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="font-bold text-gray-800">{prop?.propertyTitle || 'Property'}</p>
                        <p className="text-sm text-gray-500">Tenant: <span className="font-semibold text-gray-700">{tntName}</span></p>
                        <p className="text-sm text-gray-600 mt-1 italic">"{notice.message}"</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-[#4B5EAA]">₹{notice.rentAmount}</p>
                        <p className="text-xs text-gray-500">Month: {notice.month}</p>
                        <p className="text-xs text-gray-500">Due: {notice.dueDate}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Payments Tab ─────────────────────────────────────────── */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold">Received Payments</h3>
            {payments.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-[#EAEAEA]"><p className="text-lg text-gray-500">No payments recorded yet.</p></div>
            ) : (
              <div className="space-y-4">
                {payments.map(payment => {
                  const prop = properties.find(p => p.id === payment.propertyId);
                  const tnt = (tenants[payment.tenantId] || manualTenants[payment.tenantId]) as any;
                  const tntName = tnt ? (tnt.tenantName || tnt.name || 'Tenant') : payment.tenantId.substring(0, 8);
                  return (
                    <div key={payment.id} className="bg-white p-5 rounded-2xl border border-[#EAEAEA] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-green-100 text-green-700">Paid</span>
                          <span className="text-xs text-gray-400">{new Date(payment.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="font-bold text-gray-800">{prop?.propertyTitle || 'Property'}</p>
                        <p className="text-sm text-gray-500">Tenant: <span className="font-semibold text-gray-700">{tntName}</span></p>
                        <p className="text-sm text-gray-500">Month: {payment.month}</p>
                        <p className="text-xs text-gray-400 mt-1">Method: {payment.paymentMethod} | Paid: {new Date(payment.paymentDate).toLocaleDateString()}</p>
                      </div>
                      <p className="text-2xl font-bold text-green-600">₹{payment.amount}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Notifications Tab ────────────────────────────────────── */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold">Notifications {unreadCount > 0 && <span className="ml-2 text-sm font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{unreadCount} unread</span>}</h3>
              {unreadCount > 0 && <button onClick={markAllRead} className="text-sm text-[#4B5EAA] font-semibold hover:underline">Mark all as read</button>}
            </div>
            {notifications.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-[#EAEAEA]"><p className="text-lg text-gray-500">No notifications yet.</p></div>
            ) : (
              <div className="space-y-3">
                {notifications.map(notif => (
                  <div key={notif.id} className={`p-4 rounded-2xl border flex items-start gap-4 transition-all ${notif.status === 'unread' ? 'bg-[#EEF2FF] border-[#C7D2FE]' : 'bg-white border-[#EAEAEA]'}`}>
                    <div className={`p-2 rounded-xl shrink-0 text-lg ${notif.type === 'payment' ? 'bg-green-100' : notif.type === 'notice' ? 'bg-blue-100' : notif.type === 'request' ? 'bg-purple-100' : notif.type === 'reminder' ? 'bg-orange-100' : notif.type === 'complaint' ? 'bg-pink-100' : 'bg-yellow-100'}`}>
                      {notif.type === 'payment' ? '₹' : notif.type === 'notice' ? '📋' : notif.type === 'request' ? '👤' : notif.type === 'reminder' ? '⏰' : notif.type === 'complaint' ? '⚠️' : '🔔'}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm ${notif.status === 'unread' ? 'font-bold text-gray-900' : 'text-gray-700'}`}>{notif.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
                    </div>
                    {notif.status === 'unread' && <span className="w-2.5 h-2.5 rounded-full bg-[#4B5EAA] shrink-0 mt-1 flex-none"></span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Financial Dashboard Tab ───────────────────────────────── */}
        {activeTab === 'financial' && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold">Financial Report</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-[#EAEAEA] shadow-sm text-center border-t-4 border-t-[#4B5EAA]">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Properties</p>
                <p className="text-3xl font-bold text-[#4B5EAA]">{ownerStats.totalProperties}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-[#EAEAEA] shadow-sm text-center border-t-4 border-t-gray-400">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Total Units</p>
                <p className="text-3xl font-bold text-gray-700">{ownerStats.totalUnits}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-[#EAEAEA] shadow-sm text-center border-t-4 border-t-green-500">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Occupied</p>
                <p className="text-3xl font-bold text-green-600">{ownerStats.occupied}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-[#EAEAEA] shadow-sm text-center border-t-4 border-t-yellow-400">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Vacant</p>
                <p className="text-3xl font-bold text-yellow-600">{ownerStats.vacant}</p>
              </div>
            </div>

            <h4 className="text-lg font-bold text-gray-700 mt-2">Rent Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-[#4B5EAA] to-[#3D4D9A] p-5 rounded-2xl text-white shadow-md">
                <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">Total Monthly Rent</p>
                <p className="text-3xl font-bold">₹{financialStats.totalMonthlyRent.toLocaleString('en-IN')}</p>
                <p className="text-xs opacity-60 mt-1">Expected based on occupied units</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-5 rounded-2xl text-white shadow-md">
                <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">Total Paid</p>
                <p className="text-3xl font-bold">₹{financialStats.totalPaid.toLocaleString('en-IN')}</p>
                <p className="text-xs opacity-60 mt-1">{rentRecords.filter(r => r.status === 'paid').length} records</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 p-5 rounded-2xl text-white shadow-md">
                <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">Pending Rent</p>
                <p className="text-3xl font-bold">₹{financialStats.totalPending.toLocaleString('en-IN')}</p>
                <p className="text-xs opacity-60 mt-1">{rentRecords.filter(r => r.status === 'pending').length} records</p>
              </div>
              <div className="bg-gradient-to-br from-red-500 to-red-600 p-5 rounded-2xl text-white shadow-md">
                <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">Late Payments</p>
                <p className="text-3xl font-bold">₹{financialStats.totalLate.toLocaleString('en-IN')}</p>
                <p className="text-xs opacity-60 mt-1">{financialStats.lateCount} overdue</p>
              </div>
            </div>

            {rentRecords.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#EAEAEA] overflow-hidden shadow-sm">
                <div className="p-4 border-b border-[#EAEAEA] bg-[#F9F8F6]">
                  <h4 className="font-bold text-gray-700">Recent Rent Records</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-[#EAEAEA]">
                        <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Tenant</th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Month</th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Due Date</th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rentRecords.slice(0, 10).map(rec => {
                        const tnt = (tenants[rec.tenantId] || manualTenants[rec.tenantId]) as any;
                        const tntName = tnt ? (tnt.tenantName || tnt.name || 'Tenant') : rec.tenantId.substring(0, 8);
                        return (
                          <tr key={rec.id} className="border-b border-[#EAEAEA] hover:bg-gray-50">
                            <td className="p-3 font-medium text-gray-800">{tntName}</td>
                            <td className="p-3 text-gray-600">{rec.month}</td>
                            <td className="p-3 font-bold text-[#4B5EAA]">₹{rec.rentAmount.toLocaleString('en-IN')}</td>
                            <td className="p-3 text-gray-600">{rec.dueDate}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${rec.status === 'paid' ? 'bg-green-100 text-green-700' : rec.status === 'late' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{rec.status}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Rent Records Tab ──────────────────────────────────────── */}
        {activeTab === 'rent-records' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold">Monthly Rent Records</h3>
              <Button onClick={() => setIsGenRecordModalOpen(true)} variant="primary" className="!px-4 !py-2 !text-sm">+ Generate Record</Button>
            </div>
            {rentRecords.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-[#EAEAEA]">
                <p className="text-lg text-gray-500">No rent records generated yet.</p>
                <p className="text-sm text-gray-400 mt-1">Click "Generate Record" to create monthly rent records for tenants.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {rentRecords.map(rec => {
                  const prop = properties.find(p => p.id === rec.propertyId);
                  const tnt = (tenants[rec.tenantId] || manualTenants[rec.tenantId]) as any;
                  const tntName = tnt ? (tnt.tenantName || tnt.name || 'Tenant') : rec.tenantId.substring(0, 8);
                  return (
                    <div key={rec.id} className={`bg-white p-5 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${rec.status === 'late' ? 'border-red-200 border-l-4 border-l-red-500' : rec.status === 'paid' ? 'border-green-200' : 'border-yellow-200 border-l-4 border-l-yellow-400'}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${rec.status === 'paid' ? 'bg-green-100 text-green-700' : rec.status === 'late' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{rec.status}</span>
                          <span className="text-xs text-gray-400">{new Date(rec.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="font-bold text-gray-800">{prop?.propertyTitle || 'Property'}</p>
                        <p className="text-sm text-gray-500">Tenant: <span className="font-semibold text-gray-700">{tntName}</span></p>
                        <p className="text-sm text-gray-600 mt-1">Month: <strong>{rec.month}</strong> | Due: <strong>{rec.dueDate}</strong></p>
                        {rec.paymentDate && <p className="text-xs text-green-600 mt-1">Paid on: {new Date(rec.paymentDate).toLocaleDateString()}</p>}
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <p className="text-2xl font-bold text-[#4B5EAA]">₹{rec.rentAmount.toLocaleString('en-IN')}</p>
                        {rec.status !== 'paid' && (
                          <Button variant="outline" className="!px-3 !py-1.5 !text-xs !bg-green-50 !border-green-200 !text-green-700 font-semibold" onClick={() => handleMarkRentPaid(rec)}>
                            Mark as Paid
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Complaints Tab ────────────────────────────────────────── */}
        {activeTab === 'complaints' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold">Tenant Complaints</h3>
              <div className="flex gap-2 text-xs font-semibold">
                <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full">{complaints.filter(c => c.status === ComplaintStatus.OPEN).length} Open</span>
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{complaints.filter(c => c.status === ComplaintStatus.IN_PROGRESS).length} In Progress</span>
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">{complaints.filter(c => c.status === ComplaintStatus.RESOLVED).length} Resolved</span>
              </div>
            </div>
            {complaints.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-[#EAEAEA]">
                <p className="text-lg text-gray-500">No complaints submitted yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {complaints.map(complaint => {
                  const prop = properties.find(p => p.id === complaint.propertyId);
                  const tnt = (tenants[complaint.tenantId] || manualTenants[complaint.tenantId]) as any;
                  const tntName = tnt ? (tnt.tenantName || tnt.name || 'Tenant') : complaint.tenantId.substring(0, 8);
                  const priorityColors: Record<string, string> = { low: 'bg-gray-100 text-gray-600', medium: 'bg-yellow-100 text-yellow-700', high: 'bg-red-100 text-red-700' };
                  const statusColors: Record<string, string> = { [ComplaintStatus.OPEN]: 'bg-red-100 text-red-700', [ComplaintStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-700', [ComplaintStatus.RESOLVED]: 'bg-green-100 text-green-700' };
                  return (
                    <div key={complaint.id} className="bg-white p-5 rounded-2xl border border-[#EAEAEA] shadow-sm">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${statusColors[complaint.status] || 'bg-gray-100 text-gray-600'}`}>{complaint.status.replace('_', ' ')}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${priorityColors[complaint.priority] || 'bg-gray-100'}`}>{complaint.priority} priority</span>
                            <span className="text-xs text-gray-400">{new Date(complaint.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="font-bold text-gray-800 text-lg">{complaint.title}</p>
                          <p className="text-sm text-gray-500 mt-1">Tenant: <span className="font-semibold text-gray-700">{tntName}</span> | Property: <span className="font-semibold">{prop?.propertyTitle || 'Unknown'}</span></p>
                          <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-3 rounded-xl">{complaint.description}</p>
                        </div>
                        <div className="flex flex-col gap-2 min-w-[140px]">
                          {complaint.status !== ComplaintStatus.IN_PROGRESS && complaint.status !== ComplaintStatus.RESOLVED && (
                            <button
                              onClick={() => handleUpdateComplaintStatus(complaint, ComplaintStatus.IN_PROGRESS)}
                              disabled={updatingComplaintId === complaint.id}
                              className="px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-xs font-semibold hover:bg-blue-100 transition-colors disabled:opacity-50"
                            >
                              {updatingComplaintId === complaint.id ? 'Updating...' : '🔧 Mark In Progress'}
                            </button>
                          )}
                          {complaint.status !== ComplaintStatus.RESOLVED && (
                            <button
                              onClick={() => handleUpdateComplaintStatus(complaint, ComplaintStatus.RESOLVED)}
                              disabled={updatingComplaintId === complaint.id}
                              className="px-3 py-2 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs font-semibold hover:bg-green-100 transition-colors disabled:opacity-50"
                            >
                              {updatingComplaintId === complaint.id ? 'Updating...' : '✅ Mark Resolved'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        <Modal isOpen={isPropertyModalOpen} onClose={() => setIsPropertyModalOpen(false)} title="Add New Property">
          <form onSubmit={handleAddPropertySubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#2D3436] mb-1">Property Title</label>
              <input required value={newProperty.propertyTitle} onChange={e => setNewProperty({ ...newProperty, propertyTitle: e.target.value })} className="w-full p-3 rounded-xl border border-[#EAEAEA] bg-[#F9F8F6]" placeholder="e.g. Modern 2BHK flat" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2D3436] mb-1">Location</label>
              <input required value={newProperty.location} onChange={e => setNewProperty({ ...newProperty, location: e.target.value })} className="w-full p-3 rounded-xl border border-[#EAEAEA] bg-[#F9F8F6]" placeholder="e.g. Sector 14, Gurgaon" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2D3436] mb-1">Description</label>
              <textarea required rows={3} value={newProperty.description} onChange={e => setNewProperty({ ...newProperty, description: e.target.value })} className="w-full p-3 rounded-xl border border-[#EAEAEA] bg-[#F9F8F6]" placeholder="Beautiful flat with park view..."></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2D3436] mb-1">Property Images (Multiple)</label>
              <input type="file" multiple accept="image/*" onChange={e => setNewPropertyImages(Array.from(e.target.files || []))} className="w-full p-2 border border-[#EAEAEA] bg-[#F9F8F6] rounded-xl" />
              {newPropertyImages.length > 0 && <p className="text-xs text-gray-500 mt-1 pl-1">{newPropertyImages.length} images selected.</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2D3436] mb-1">Security Deposit (₹) <span className="text-gray-400 font-normal">(Optional)</span></label>
              <input type="number" value={newProperty.securityDeposit} onChange={e => setNewProperty({ ...newProperty, securityDeposit: e.target.value })} className="w-full p-3 rounded-xl border border-[#EAEAEA] bg-[#F9F8F6]" placeholder="30000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2D3436] mb-1">Property Type</label>
              <select value={newProperty.propertyType} onChange={e => setNewProperty({ ...newProperty, propertyType: e.target.value as PropertyType })} className="w-full p-3 rounded-xl border border-[#EAEAEA] bg-[#F9F8F6]">
                {Object.values(PropertyType).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2D3436] mb-1">Status</label>
              <select value={newProperty.availabilityStatus} onChange={e => setNewProperty({ ...newProperty, availabilityStatus: e.target.value as 'available' | 'rented' })} className="w-full p-3 rounded-xl border border-[#EAEAEA] bg-[#F9F8F6]">
                <option value="available">Available</option>
                <option value="rented">Rented</option>
              </select>
            </div>

            <div className="border border-[#EAEAEA] rounded-xl p-4 bg-gray-50 mt-4">
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-medium text-[#2D3436]">Units / Flats</label>
                <Button type="button" variant="outline" className="!text-xs !px-2 !py-1" onClick={() => setNewProperty({ ...newProperty, units: [...newProperty.units, { unitId: `unit_${Date.now()}`, unitName: '', roomSize: '', rentAmount: 0, status: 'vacant' }] })}>+ Add Unit</Button>
              </div>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {newProperty.units.map((unit, index) => (
                  <div key={unit.unitId} className="flex gap-2 items-center bg-white p-3 rounded-lg border border-[#EAEAEA]">
                    <input className="flex-1 w-full p-2 border border-[#EAEAEA] rounded text-sm" placeholder="Unit Name (e.g. 101)" value={unit.unitName} onChange={e => {
                      const newUnits = [...newProperty.units];
                      newUnits[index].unitName = e.target.value;
                      setNewProperty({ ...newProperty, units: newUnits });
                    }} required />
                    <input className="w-24 p-2 border border-[#EAEAEA] rounded text-sm" placeholder="1BHK / Size" value={unit.roomSize} onChange={e => {
                      const newUnits = [...newProperty.units];
                      newUnits[index].roomSize = e.target.value;
                      setNewProperty({ ...newProperty, units: newUnits });
                    }} required />
                    <input className="w-28 p-2 border border-[#EAEAEA] rounded text-sm" type="number" placeholder="Rent (₹)" value={unit.rentAmount || ''} onChange={e => {
                      const newUnits = [...newProperty.units];
                      newUnits[index].rentAmount = Number(e.target.value);
                      setNewProperty({ ...newProperty, units: newUnits });
                    }} required />
                    {newProperty.units.length > 1 && (
                      <button type="button" className="text-red-500 font-bold px-2 hover:bg-red-50 rounded" onClick={() => {
                        setNewProperty({ ...newProperty, units: newProperty.units.filter((_, i) => i !== index) });
                      }}>×</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button type="button" variant="outline" onClick={() => setIsPropertyModalOpen(false)} fullWidth>Cancel</Button>
              <Button type="submit" disabled={addingProperty} fullWidth>{addingProperty ? 'Saving...' : 'Save Property'}</Button>
            </div>
          </form>
        </Modal>

        {/* Manage Units Modal */}
        <Modal isOpen={!!selectedPropertyForUnits} onClose={() => setSelectedPropertyForUnits(null)} title={`Manage Units: ${selectedPropertyForUnits?.propertyTitle}`}>
          {unitsLoading ? <div className="p-4 text-center">Loading units...</div> : (
            <div className="space-y-3">
              {propertyUnits.length === 0 ? (
                <p className="text-gray-500 italic p-4 text-center bg-gray-50 rounded-xl">No units found for this property.</p>
              ) : (
                propertyUnits.map(unit => {
                  const tId = unit.tenantId;
                  const isManual = tId && tId.startsWith('mt_');
                  const tenant = isManual ? manualTenants[tId] : tId ? tenants[tId] : null;

                  return (
                    <div key={unit.unitId} className="p-4 border rounded-xl bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-sm transition-all border-[#EAEAEA]">
                      <div>
                        <p className="font-bold text-lg">{unit.unitName} ({unit.roomSize}) - <span className={unit.status === 'vacant' ? 'text-green-600' : 'text-red-500'}>{unit.status === 'vacant' ? 'Vacant' : 'Occupied'}</span></p>
                        <p className="text-xs text-gray-500 font-medium mt-1">Rent: ₹{unit.rentAmount}</p>

                        {unit.status === 'occupied' && tenant && (
                          <div className="text-sm bg-white p-2 rounded border mt-2">
                            <p className="font-semibold text-gray-800">Assigned Tenant: {isManual ? tenant.tenantName : tenant.name} {isManual && <span className="text-xs text-blue-500 bg-blue-50 px-1 rounded ml-1">Manual</span>}</p>
                            <p className="text-gray-500">{tenant.phone}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 w-full md:w-auto">
                        <div className="flex gap-2">
                          <button className="px-3 py-1.5 border border-[#1565C0] text-[#1565C0] rounded-lg text-sm font-semibold hover:bg-blue-50" onClick={() => {
                            setEditingUnit(unit);
                            setEditUnitData({ unitName: unit.unitName, roomSize: unit.roomSize, rentAmount: unit.rentAmount.toString() });
                            setIsEditUnitModalOpen(true);
                          }}>
                            Edit Details
                          </button>
                          {unit.status === 'occupied' && (
                            <button className="px-3 py-1.5 border border-red-500 text-red-500 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors" onClick={() => handleMarkVacant(unit)}>
                              Mark Vacant
                            </button>
                          )}
                          {unit.status === 'vacant' && (
                            <button className="px-3 py-1.5 bg-[#4B5EAA] text-white rounded-lg text-sm font-semibold hover:bg-opacity-90 transition-colors whitespace-nowrap" onClick={() => {
                              setSelectedUnitForManual(unit);
                              setManualTenantForm({ ...manualTenantForm, rentAmount: unit.rentAmount.toString() });
                              setIsManualTenantModalOpen(true);
                            }}>
                              Add Tenant
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </Modal>

        {/* Edit Unit Modal */}
        <Modal isOpen={isEditUnitModalOpen} onClose={() => { setIsEditUnitModalOpen(false); setEditingUnit(null); }} title="Edit Unit Details">
          <form onSubmit={handleEditUnitSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Unit Name</label>
              <input required type="text" value={editUnitData.unitName} onChange={e => setEditUnitData({ ...editUnitData, unitName: e.target.value })} className="w-full p-3 rounded-xl border border-[#EAEAEA]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Room Size</label>
              <input required type="text" value={editUnitData.roomSize} onChange={e => setEditUnitData({ ...editUnitData, roomSize: e.target.value })} className="w-full p-3 rounded-xl border border-[#EAEAEA]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Rent Amount (₹)</label>
              <input required type="number" value={editUnitData.rentAmount} onChange={e => setEditUnitData({ ...editUnitData, rentAmount: e.target.value })} className="w-full p-3 rounded-xl border border-[#EAEAEA]" />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditUnitModalOpen(false)} fullWidth>Cancel</Button>
              <Button type="submit" fullWidth>Save Changes</Button>
            </div>
          </form>
        </Modal>

        {/* Add Manual Tenant Modal */}
        <Modal isOpen={isManualTenantModalOpen} onClose={() => setIsManualTenantModalOpen(false)} title="Add Tenant Manually">
          <form onSubmit={handleManualTenantSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-2 pb-2">
            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800 mb-2 border border-blue-100">
              Adding to: <span className="font-bold">{selectedPropertyForUnits?.propertyTitle}</span> - Unit <span className="font-bold">{selectedUnitForManual?.unitName}</span>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tenant Name *</label>
              <input required value={manualTenantForm.tenantName} onChange={e => setManualTenantForm({ ...manualTenantForm, tenantName: e.target.value })} className="w-full p-3 rounded-xl border border-[#EAEAEA]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone Number *</label>
              <input required type="tel" value={manualTenantForm.phoneNumber} onChange={e => setManualTenantForm({ ...manualTenantForm, phoneNumber: e.target.value })} className="w-full p-3 rounded-xl border border-[#EAEAEA]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Aadhaar Number (Optional)</label>
              <input value={manualTenantForm.aadhaarNumber} onChange={e => setManualTenantForm({ ...manualTenantForm, aadhaarNumber: e.target.value })} className="w-full p-3 rounded-xl border border-[#EAEAEA]" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Rent Amount (₹) *</label>
              <input required type="number" value={manualTenantForm.rentAmount} onChange={e => setManualTenantForm({ ...manualTenantForm, rentAmount: e.target.value })} className="w-full p-3 rounded-xl border border-[#EAEAEA]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Move In Date *</label>
              <input required type="date" value={manualTenantForm.moveInDate} onChange={e => setManualTenantForm({ ...manualTenantForm, moveInDate: e.target.value })} className="w-full p-3 rounded-xl border border-[#EAEAEA]" />
            </div>

            <div className="flex gap-3 pt-4 border-t mt-4">
              <Button type="button" variant="outline" onClick={() => setIsManualTenantModalOpen(false)} fullWidth>Cancel</Button>
              <Button type="submit" disabled={submittingManualTenant} fullWidth>{submittingManualTenant ? 'Adding...' : 'Add Tenant'}</Button>
            </div>
          </form>
        </Modal>

        {/* Send Rent Notice Modal */}
        <Modal isOpen={isSendNoticeModalOpen} onClose={() => setIsSendNoticeModalOpen(false)} title="Send Rent Notice">
          <form onSubmit={handleSendNotice} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Select Tenant *</label>
              <select required value={noticeForm.tenantId} onChange={e => {
                const ot = occupiedTenants.find(x => x.tenantId === e.target.value);
                setNoticeForm({ ...noticeForm, tenantId: e.target.value, propertyId: ot?.propertyId || '' });
              }} className="w-full p-3 rounded-xl border border-[#EAEAEA] bg-[#F9F8F6]">
                <option value="">-- Select Tenant --</option>
                {occupiedTenants.map(ot => (
                  <option key={ot.tenantId} value={ot.tenantId}>{ot.name} ({ot.phone}) — {ot.propertyTitle}</option>
                ))}
              </select>
              {occupiedTenants.length === 0 && <p className="text-xs text-yellow-600 mt-1">No tenants found. Add tenants manually or approve requests first.</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Property *</label>
              <select required value={noticeForm.propertyId} onChange={e => setNoticeForm({ ...noticeForm, propertyId: e.target.value })} className="w-full p-3 rounded-xl border border-[#EAEAEA] bg-[#F9F8F6]">
                <option value="">-- Select Property --</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.propertyTitle}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Month *</label>
                <input required type="month" value={noticeForm.month} onChange={e => setNoticeForm({ ...noticeForm, month: e.target.value })} className="w-full p-3 rounded-xl border border-[#EAEAEA] bg-[#F9F8F6]" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Due Date *</label>
                <input required type="date" value={noticeForm.dueDate} onChange={e => setNoticeForm({ ...noticeForm, dueDate: e.target.value })} className="w-full p-3 rounded-xl border border-[#EAEAEA] bg-[#F9F8F6]" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Rent Amount (₹) *</label>
              <input required type="number" value={noticeForm.rentAmount} onChange={e => setNoticeForm({ ...noticeForm, rentAmount: e.target.value })} className="w-full p-3 rounded-xl border border-[#EAEAEA] bg-[#F9F8F6]" placeholder="e.g. 15000" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Message (Optional)</label>
              <textarea rows={3} value={noticeForm.message} onChange={e => setNoticeForm({ ...noticeForm, message: e.target.value })} className="w-full p-3 rounded-xl border border-[#EAEAEA] bg-[#F9F8F6] resize-none" placeholder="Your monthly rent is due. Please pay on time." />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsSendNoticeModalOpen(false)} fullWidth>Cancel</Button>
              <Button type="submit" disabled={sendingNotice} fullWidth>{sendingNotice ? 'Sending...' : 'Send Notice'}</Button>
            </div>
          </form>
        </Modal>

        {/* Generate Rent Record Modal */}
        <Modal isOpen={isGenRecordModalOpen} onClose={() => setIsGenRecordModalOpen(false)} title="Generate Monthly Rent Record">
          <form onSubmit={handleGenerateRentRecord} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Select Tenant *</label>
              <select required value={genRecordForm.tenantId} onChange={e => {
                const ot = occupiedTenants.find(x => x.tenantId === e.target.value);
                setGenRecordForm({ ...genRecordForm, tenantId: e.target.value, propertyId: ot?.propertyId || '' });
              }} className="w-full p-3 rounded-xl border border-[#EAEAEA] bg-[#F9F8F6]">
                <option value="">-- Select Tenant --</option>
                {occupiedTenants.map(ot => (
                  <option key={ot.tenantId} value={ot.tenantId}>{ot.name} ({ot.phone}) — {ot.propertyTitle}</option>
                ))}
              </select>
              {occupiedTenants.length === 0 && <p className="text-xs text-yellow-600 mt-1">No tenants found. Add tenants manually or approve requests first.</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Property *</label>
              <select required value={genRecordForm.propertyId} onChange={e => setGenRecordForm({ ...genRecordForm, propertyId: e.target.value })} className="w-full p-3 rounded-xl border border-[#EAEAEA] bg-[#F9F8F6]">
                <option value="">-- Select Property --</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.propertyTitle}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Month *</label>
                <input required type="month" value={genRecordForm.month} onChange={e => setGenRecordForm({ ...genRecordForm, month: e.target.value })} className="w-full p-3 rounded-xl border border-[#EAEAEA] bg-[#F9F8F6]" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Due Date *</label>
                <input required type="date" value={genRecordForm.dueDate} onChange={e => setGenRecordForm({ ...genRecordForm, dueDate: e.target.value })} className="w-full p-3 rounded-xl border border-[#EAEAEA] bg-[#F9F8F6]" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Rent Amount (₹) *</label>
              <input required type="number" value={genRecordForm.rentAmount} onChange={e => setGenRecordForm({ ...genRecordForm, rentAmount: e.target.value })} className="w-full p-3 rounded-xl border border-[#EAEAEA] bg-[#F9F8F6]" placeholder="e.g. 15000" />
            </div>
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-xs text-blue-800">
              ℹ️ The tenant will receive a notification. Reminders auto-send 3 days before due date. Overdue records are auto-marked as late.
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsGenRecordModalOpen(false)} fullWidth>Cancel</Button>
              <Button type="submit" disabled={generatingRecord} fullWidth>{generatingRecord ? 'Generating...' : 'Generate Record'}</Button>
            </div>
          </form>
        </Modal>

      </div>
    </Layout>
  );
};

export default OwnerPanel;
