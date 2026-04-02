import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { User, Property, InterestRequest, PropertyUnit, RentNotice, AppNotification, Complaint, ComplaintStatus, ComplaintPriority, RentRecord, RentPaymentRecord } from '../types';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { uploadImage } from '../cloudinary';
import { createFirstRentRecord, createNextCycleRecord, processRentCycles, getDaysOverdue, calculateLateFee, formatDate } from '../utils/rentCycle';
import { Icons } from '../constants';
import Button from './Button';
import Layout from './Layout';
import Modal from './Modal';
import PaymentModal from './PaymentModal';
import PaymentSuccess from './PaymentSuccess';
import { TRANSLATIONS, Language } from '../translations';
import { useAuth } from '../contexts/AuthContext';

interface TenantPanelProps {
  user: User;
  lang: Language;
  onLogout: () => void;
}

interface PropertyWithUnits extends Property {
  availableUnits: PropertyUnit[];
}

const TenantPanel: React.FC<TenantPanelProps> = ({ user, lang, onLogout }) => {
  const { login } = useAuth();
  const [activeTab, setActiveTab] = useState('browse');
  const [propertiesWithUnits, setPropertiesWithUnits] = useState<PropertyWithUnits[]>([]);
  const [myRequests, setMyRequests] = useState<InterestRequest[]>([]);
  const [allProperties, setAllProperties] = useState<Property[]>([]);

  const [loading, setLoading] = useState(true);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<PropertyWithUnits | null>(null);
  const [selectedUnits, setSelectedUnits] = useState<PropertyUnit[]>([]);
  const [ownerDocs, setOwnerDocs] = useState<Record<string, User>>({});

  // ── Search & Filter State ──────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [maxPriceInData, setMaxPriceInData] = useState(100000);
  const [geoLoading, setGeoLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Application Form States
  const [applyIdProofUrl, setApplyIdProofUrl] = useState<string>('');
  const [applyAddressProofUrl, setApplyAddressProofUrl] = useState<string>('');
  const [applyProfilePhotoUrl, setApplyProfilePhotoUrl] = useState<string>('');
  const [isUploadingId, setIsUploadingId] = useState(false);
  const [isUploadingAddress, setIsUploadingAddress] = useState(false);
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');
  // Profile Edit States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState({ name: user.name, phone: user.phone, email: user.email || '', aadhaarNumber: user.aadhaarNumber || '' });
  const [profilePhotoEditFile, setProfilePhotoEditFile] = useState<File | null>(null);
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  // ── Notices State
  const [myNotices, setMyNotices] = useState<RentNotice[]>([]);
  const [payingNoticeId, setPayingNoticeId] = useState<string | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<RentNotice | null>(null);
  const [isPaymentSuccessOpen, setIsPaymentSuccessOpen] = useState(false);
  const [lastTxData, setLastTxData] = useState<{ id: string; method: string; amount: number; month: string } | null>(null);

  const [selectedRequestToPay, setSelectedRequestToPay] = useState<InterestRequest | null>(null);
  const [isRequestPayModalOpen, setIsRequestPayModalOpen] = useState(false);

  // ── Notifications State
  const [myNotifications, setMyNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // ── Complaints State
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [complaintForm, setComplaintForm] = useState({ title: '', description: '', priority: ComplaintPriority.MEDIUM, propertyId: '', unitId: '' });
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [myComplaints, setMyComplaints] = useState<Complaint[]>([]);

  // ── Rent Records State
  const [myRentRecords, setMyRentRecords] = useState<RentRecord[]>([]);
  const [myPayments, setMyPayments] = useState<RentPaymentRecord[]>([]);

  // ── QR / UPI Copy State
  const [upiCopied, setUpiCopied] = useState(false);

  // ── System Config
  const [brokeragePercent, setBrokeragePercent] = useState(25);

  const t = TRANSLATIONS[lang];

  // Fetch System Settings
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'systemSettings'), snap => {
      if (!snap.empty) {
        const data = snap.docs[0].data();
        if (data.brokeragePercentage !== undefined) {
          setBrokeragePercent(data.brokeragePercentage);
        }
      }
    });
    return () => unsub();
  }, []);

  // Fetch Available Properties and their Units
  useEffect(() => {
    const q = query(collection(db, 'properties'), where('availabilityStatus', '==', 'available'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const propsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property)).filter(p => p.status === 'approved' || p.isVisibleToTenants === true || (!p.status && p.isVisibleToTenants === undefined));
      setAllProperties(propsData);
      setLoading(false);

      // Compute max price for range slider
      const allRents = propsData.flatMap(p => (p.units || []).map(u => u.rentAmount)).filter(Boolean);
      const maxR = allRents.length > 0 ? Math.max(...allRents) : 100000;
      setMaxPriceInData(Math.ceil(maxR / 1000) * 1000); // round up to nearest 1000
      setPriceRange(prev => [prev[0], Math.ceil(maxR / 1000) * 1000]);

      // Extract vacant units directly from property document
      const pwf: PropertyWithUnits[] = [];
      for (const p of propsData) {
        const units = p.units || [];
        const vacantUnits = units.filter(u => u.status === 'vacant');
        if (vacantUnits.length > 0) {
          pwf.push({ ...p, availableUnits: vacantUnits });
        }
      }
      setPropertiesWithUnits(pwf.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

      // Fetch owners
      const ownerIds = [...new Set(propsData.map(p => p.ownerId))];
      const newOwners: Record<string, User> = { ...ownerDocs };
      for (const oid of ownerIds) {
        if (!newOwners[oid]) {
          const uQ = query(collection(db, 'users'), where('userId', '==', oid));
          const uSnap = await getDocs(uQ);
          if (!uSnap.empty) {
            const uData = uSnap.docs[0].data();
            newOwners[oid] = {
              id: uData.userId,
              name: uData.name,
              phone: uData.phone,
              role: uData.role,
              documents: uData.documents
            };
          }
        }
      }
      setOwnerDocs(newOwners);
    });
    return () => unsubscribe();
  }, []);

  // Fetch My Requests
  useEffect(() => {
    if (!user.id) return;
    const q = query(collection(db, 'requests'), where('tenantId', '==', user.id));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const reqData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InterestRequest));
      console.log("[DEBUG] Fetched Tenant Requests for User:", user.id, reqData);
      
      const now = Date.now();
      for (const r of reqData) {
        if (r.status === 'approved' && r.approvedAt) {
          if (now - new Date(r.approvedAt).getTime() > 24 * 60 * 60 * 1000) {
            await updateDoc(doc(db, 'requests', r.id!), { status: 'cancelled_due_to_no_payment' });
            r.status = 'cancelled_due_to_no_payment';
          }
        }
      }
      setMyRequests(reqData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });
    return () => unsubscribe();
  }, [user.id]);

  // Fetch My Notices
  useEffect(() => {
    if (!user.id) return;
    const q = query(collection(db, 'notices'), where('tenantId', '==', user.id));
    const unsub = onSnapshot(q, snap => {
      setMyNotices(snap.docs.map(d => ({ id: d.id, ...d.data() } as RentNotice)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });
    return () => unsub();
  }, [user.id]);

  // Fetch My Notifications
  useEffect(() => {
    if (!user.id) return;
    const q = query(collection(db, 'notifications'), where('userId', '==', user.id));
    const unsub = onSnapshot(q, snap => {
      const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMyNotifications(notifs);
      setUnreadCount(notifs.filter(n => n.status === 'unread').length);
    });
    return () => unsub();
  }, [user.id]);

  // Fetch My Complaints
  useEffect(() => {
    if (!user.id) return;
    const q = query(collection(db, 'complaints'), where('tenantId', '==', user.id));
    const unsub = onSnapshot(q, snap => {
      setMyComplaints(snap.docs.map(d => ({ id: d.id, ...d.data() } as Complaint)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });
    return () => unsub();
  }, [user.id]);

  // Fetch My Rent Records + process overdue/reminders
  useEffect(() => {
    if (!user.id) return;
    const q = query(collection(db, 'rentRecords'), where('tenantId', '==', user.id));
    const unsub = onSnapshot(q, async snap => {
      const records = snap.docs.map(d => ({ id: d.id, ...d.data() } as RentRecord)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMyRentRecords(records);
      // Process overdue & reminders (client-side check)
      await processRentCycles(user.id).catch(console.error);
    });
    return () => unsub();
  }, [user.id]);

  // Fetch My Payment History
  useEffect(() => {
    if (!user.id) return;
    const q = query(collection(db, 'rent_payments'), where('tenantId', '==', user.id));
    const unsub = onSnapshot(q, snap => {
      setMyPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as RentPaymentRecord)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });
    return () => unsub();
  }, [user.id]);

  // ── Submit Complaint ──────────────────────────────────────────────────────
  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintForm.title || !complaintForm.description || !complaintForm.propertyId) {
      alert('Please fill in all required fields.');
      return;
    }
    setSubmittingComplaint(true);
    try {
      const complaintData = {
        tenantId: user.id,
        propertyId: complaintForm.propertyId,
        unitId: complaintForm.unitId || '',
        title: complaintForm.title,
        description: complaintForm.description,
        priority: complaintForm.priority,
        status: ComplaintStatus.OPEN,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'complaints'), complaintData);

      // Notify the owner of the property
      const prop = allProperties.find(p => p.id === complaintForm.propertyId);
      if (prop?.ownerId) {
        await addDoc(collection(db, 'notifications'), {
          userId: prop.ownerId,
          type: 'complaint',
          message: `⚠️ New complaint from ${user.name}: "${complaintForm.title}" (Priority: ${complaintForm.priority}) at ${prop.propertyTitle}.`,
          status: 'unread',
          createdAt: new Date().toISOString()
        });
      }

      setIsComplaintModalOpen(false);
      setComplaintForm({ title: '', description: '', priority: ComplaintPriority.MEDIUM, propertyId: '', unitId: '' });
      alert('Complaint submitted successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to submit complaint.');
    } finally {
      setSubmittingComplaint(false);
    }
  };



  const totalSelectedRent = selectedUnits.reduce((sum, u) => sum + u.rentAmount, 0);
  const totalSelectedDeposit = selectedUnits.reduce((sum, u) => sum + (u.securityDeposit || 0), 0);

  const handleUnitToggle = (unit: PropertyUnit) => {
    setSelectedUnits(prev =>
      prev.find(u => u.unitId === unit.unitId)
        ? prev.filter(u => u.unitId !== unit.unitId)
        : [...prev, unit]
    );
  };

  const handleApplyClick = (prop: PropertyWithUnits) => {
    setSelectedProperty(prop);
    setSelectedUnits([]);
    setIsApplyModalOpen(true);
  };

  // ── Upload helper using Cloudinary ───────────────
  const uploadFile = async (file: File, folder: string): Promise<string> => {
    return await uploadImage(file);
  };

  const handleIdProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('File size exceeds 5MB limit.'); return; }
    setIsUploadingId(true);
    try {
      const url = await uploadImage(file);
      setApplyIdProofUrl(url);
    } catch (err) { console.error(err); alert('Upload failed'); }
    setIsUploadingId(false);
  };

  const handleAddressProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('File size exceeds 5MB limit.'); return; }
    setIsUploadingAddress(true);
    try {
      const url = await uploadImage(file);
      setApplyAddressProofUrl(url);
    } catch (err) { console.error(err); alert('Upload failed'); }
    setIsUploadingAddress(false);
  };

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('File size exceeds 5MB limit.'); return; }
    setIsUploadingProfile(true);
    try {
      const url = await uploadImage(file);
      setApplyProfilePhotoUrl(url);
    } catch (err) { console.error(err); alert('Upload failed'); }
    setIsUploadingProfile(false);
  };

  // ── Submit request ─────────────────────────────────
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty || !user.id || selectedUnits.length === 0) {
      alert('Please select at least one unit before submitting.');
      return;
    }

    if (!applyIdProofUrl) {
      alert('ID Proof is required.');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress('');

    try {
      setUploadProgress('📨 Submitting request...');
      await addDoc(collection(db, 'requests'), {
        tenantId: user.id,
        propertyId: selectedProperty.id,
        selectedUnits: selectedUnits.map(u => u.unitId),
        totalRent: totalSelectedRent,
        depositAmount: totalSelectedDeposit || 0,
        idProofUrl: applyIdProofUrl,
        addressProofUrl: applyAddressProofUrl,
        profilePhotoUrl: applyProfilePhotoUrl,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      setIsApplyModalOpen(false);
      setSelectedProperty(null);
      setSelectedUnits([]);
      setApplyIdProofUrl('');
      setApplyAddressProofUrl('');
      setApplyProfilePhotoUrl('');
      setUploadProgress('');
      setUploadError('');

      alert('Request sent successfully! The owner will review your application.');
      setActiveTab('requests');
    } catch (err: any) {
      console.error('Request failed:', err);
      setUploadError('Failed to submit request. Please retry.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress('');
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSubmitting(true);

    try {
      const uQ = query(collection(db, 'users'), where('userId', '==', user.id));
      const uSnap = await getDocs(uQ);
      if (uSnap.empty) {
        alert('User record not found');
        setProfileSubmitting(false);
        return;
      }
      const userDocId = uSnap.docs[0].id;

      let photoUrl = user.profilePhoto || user.documents?.profilePhotoUrl;
      if (profilePhotoEditFile) photoUrl = await uploadFile(profilePhotoEditFile, 'photo');

      const updateData = {
        name: editProfileData.name,
        phone: editProfileData.phone,
        email: editProfileData.email || null,
        profilePhoto: photoUrl,
        aadhaarNumber: editProfileData.aadhaarNumber
      };

      await updateDoc(doc(db, 'users', userDocId), updateData);

      await login({
        ...user,
        name: editProfileData.name,
        phone: editProfileData.phone,
        email: editProfileData.email,
        profilePhoto: photoUrl,
        aadhaarNumber: editProfileData.aadhaarNumber
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


  // ── Pay Request Handler
  const handlePayRequest = async (method: string, transactionId: string, rentAmt: number, depositAmt: number, brokerageAmt: number, totalAmt: number) => {
    if (!selectedRequestToPay?.id || !user.id) return;
    try {
      const propRef = doc(db, 'properties', selectedRequestToPay.propertyId);
      const prop = allProperties.find(p => p.id === selectedRequestToPay.propertyId);

      if (prop && selectedRequestToPay.selectedUnits && selectedRequestToPay.selectedUnits.length > 0) {
        const updatedUnits = prop.units?.map(u =>
          selectedRequestToPay.selectedUnits?.includes(u.unitId) ? { ...u, status: 'occupied' as const, tenantId: user.id } : u
        ) || [];
        await updateDoc(propRef, { units: updatedUnits });
      }

      await updateDoc(doc(db, 'requests', selectedRequestToPay.id), {
        status: 'paid',
        paymentDate: new Date().toISOString(),
        brokeragePaid: true,
        brokerageAmount: brokerageAmt,
        totalPaidAmount: totalAmt
      });

      await addDoc(collection(db, 'rent_payments'), {
        tenantId: user.id,
        ownerId: prop?.ownerId || '',
        propertyId: selectedRequestToPay.propertyId,
        requestId: selectedRequestToPay.id,
        amount: rentAmt,
        month: 'First Month Rent',
        paymentDate: new Date().toISOString(),
        paymentMethod: method,
        transactionId,
        status: 'completed',
        type: 'rent',
        createdAt: new Date().toISOString()
      });

      if (depositAmt > 0) {
        await addDoc(collection(db, 'rent_payments'), {
          tenantId: user.id,
          ownerId: prop?.ownerId || '',
          propertyId: selectedRequestToPay.propertyId,
          requestId: selectedRequestToPay.id,
          amount: depositAmt,
          month: 'Security Deposit',
          paymentDate: new Date().toISOString(),
          paymentMethod: method,
          transactionId,
          status: 'completed',
          type: 'security_deposit',
          createdAt: new Date().toISOString()
        });
      }

      // Save Admin Earning (Brokerage)
      if (brokerageAmt > 0) {
        await addDoc(collection(db, 'adminEarnings'), {
          type: 'brokerage',
          amount: brokerageAmt,
          userId: user.id,
          propertyId: selectedRequestToPay.propertyId,
          date: new Date().toISOString(),
          createdAt: new Date().toISOString()
        });
      }

      if (prop?.ownerId) {
        await addDoc(collection(db, 'notifications'), {
          userId: prop.ownerId,
          type: 'payment',
          message: `Booking Confirmed! Tenant ${user.name} has paid rent and security deposit to secure ${prop.propertyTitle}.`,
          status: 'unread',
          createdAt: new Date().toISOString()
        });
      }

      setIsRequestPayModalOpen(false);
      setLastTxData({ id: transactionId, method, amount: totalAmt, month: 'Total Booking Payment' });
      setIsPaymentSuccessOpen(true);
      setSelectedRequestToPay(null);

      // Create first rent record for next month's cycle
      await createFirstRentRecord(
        user.id,
        selectedRequestToPay.propertyId,
        selectedRequestToPay.totalRent || rentAmt,
        selectedRequestToPay.selectedUnits
      ).catch(console.error);
    } catch (err) {
      console.error(err);
      alert('Payment failed. Please try again.');
    }
  };

  // ── Pay Rent Handler
  const handlePayRent = async (method: string, transactionId: string) => {
    if (!selectedNotice?.id || !user.id) return;
    setPayingNoticeId(selectedNotice.id);
    try {
      // Sync Notices: mark matching notices for this month as paid
      const noticeQuery = query(
        collection(db, 'notices'), 
        where('tenantId', '==', user.id),
        where('propertyId', '==', selectedNotice.propertyId),
        where('month', '==', selectedNotice.month)
      );
      const noticeSnap = await getDocs(noticeQuery);
      for (const nDoc of noticeSnap.docs) {
         await updateDoc(doc(db, 'notices', nDoc.id), { status: 'paid' });
      }

      // Sync RentRecords: mark matching rent record for this month as paid
      const recordsQ = query(
        collection(db, 'rentRecords'), 
        where('tenantId', '==', user.id), 
        where('propertyId', '==', selectedNotice.propertyId), 
        where('month', '==', selectedNotice.month)
      );
      const recordsSnap = await getDocs(recordsQ);
      if (recordsSnap.empty) {
         // Create it to ensure OwnerPanel financial summary reflects it
         await addDoc(collection(db, 'rentRecords'), {
            tenantId: user.id,
            propertyId: selectedNotice.propertyId,
            month: selectedNotice.month,
            rentAmount: selectedNotice.rentAmount,
            dueDate: selectedNotice.dueDate,
            status: 'paid',
            paymentDate: new Date().toISOString(),
            createdAt: new Date().toISOString()
         });
      } else {
         for (const rDoc of recordsSnap.docs) {
            await updateDoc(doc(db, 'rentRecords', rDoc.id), {
               status: 'paid',
               paymentDate: new Date().toISOString()
            });
         }
      }

      // Save payment record
      await addDoc(collection(db, 'rent_payments'), {
        tenantId: user.id,
        ownerId: selectedNotice.ownerId,
        propertyId: selectedNotice.propertyId,
        noticeId: selectedNotice.id,
        amount: selectedNotice.rentAmount,
        month: selectedNotice.month,
        paymentDate: new Date().toISOString(),
        paymentMethod: method,
        transactionId,
        status: 'completed',
        type: 'rent',
        createdAt: new Date().toISOString()
      });

      // Notify owner
      await addDoc(collection(db, 'notifications'), {
        userId: selectedNotice.ownerId,
        type: 'payment',
        message: `Tenant ${user.name} has paid ₹${selectedNotice.rentAmount} rent for ${selectedNotice.month}.`,
        status: 'unread',
        createdAt: new Date().toISOString()
      });

      // Notify tenant (confirmation)
      await addDoc(collection(db, 'notifications'), {
        userId: user.id,
        type: 'payment',
        message: `Your rent of ₹${selectedNotice.rentAmount} for ${selectedNotice.month} has been recorded successfully.`,
        status: 'unread',
        createdAt: new Date().toISOString()
      });

      setIsPayModalOpen(false);
      setLastTxData({ id: transactionId, method, amount: selectedNotice.rentAmount, month: selectedNotice.month });
      setIsPaymentSuccessOpen(true);
      setSelectedNotice(null);

      // Auto-create next cycle rent record
      const matchingRecord = myRentRecords.find(
        r => r.propertyId === selectedNotice.propertyId && r.month === selectedNotice.month
      );
      if (matchingRecord) {
        await createNextCycleRecord(
          user.id,
          selectedNotice.propertyId,
          matchingRecord.rentAmount,
          matchingRecord.dueDate,
          matchingRecord.unitId
        ).catch(console.error);
      }
    } catch (err) {
      console.error(err);
      alert('Payment failed. Please try again.');
    } finally {
      setPayingNoticeId(null);
    }
  };

  // ── Mark notifications read
  const markAllRead = async () => {
    const unread = myNotifications.filter(n => n.status === 'unread' && n.id);
    for (const n of unread) {
      await updateDoc(doc(db, 'notifications', n.id!), { status: 'read' });
    }
  };

  // ── Extract unique cities/locations for filter dropdown ──────────────────
  const allCities = React.useMemo(() => {
    const cities = new Set<string>();
    propertiesWithUnits.forEach(p => {
      const loc = p.location || '';
      // Try to extract city from location string (e.g. "Saheed Nagar, Bhubaneswar")
      const parts = loc.split(',').map(s => s.trim());
      parts.forEach(part => { if (part) cities.add(part); });
      if (p.city) cities.add(p.city);
    });
    return Array.from(cities).sort();
  }, [propertiesWithUnits]);

  const POPULAR_CITIES = ['Bhubaneswar', 'Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune', 'Chennai', 'Kolkata'];

  // ── Filtered properties ─────────────────────────────────────────────────
  const filteredProperties = React.useMemo(() => {
    return propertiesWithUnits.filter(p => {
      const loc = (p.location || '').toLowerCase();
      const city = (p.city || '').toLowerCase();
      const title = (p.propertyTitle || '').toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      // Search query match (city, location, title)
      if (q && !loc.includes(q) && !city.includes(q) && !title.includes(q)) return false;

      // City dropdown filter
      if (selectedCity) {
        const sc = selectedCity.toLowerCase();
        if (!loc.includes(sc) && !city.includes(sc)) return false;
      }

      // Price range filter — check if any unit falls in range
      const unitRents = p.availableUnits.map(u => u.rentAmount);
      const minUnitRent = Math.min(...unitRents);
      if (minUnitRent > priceRange[1] || Math.max(...unitRents) < priceRange[0]) return false;

      return true;
    });
  }, [propertiesWithUnits, searchQuery, selectedCity, priceRange]);

  // ── Geolocation handler ────────────────────────────────────────────────
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Use OpenStreetMap Nominatim for reverse geocoding (free, no API key)
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const detectedCity = data.address?.city || data.address?.town || data.address?.state_district || data.address?.state || '';
          if (detectedCity) {
            setSearchQuery(detectedCity);
            setSelectedCity('');
          } else {
            alert('Could not detect your city. Please search manually.');
          }
        } catch {
          alert('Failed to get location details. Please search manually.');
        } finally {
          setGeoLoading(false);
        }
      },
      () => {
        setGeoLoading(false);
        alert('Location access denied. You can search manually.');
      },
      { timeout: 10000 }
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCity('');
    setPriceRange([0, maxPriceInData]);
  };

  const tabs = [
    { id: 'browse', label: 'Browse Properties', icon: Icons.Home },
    { id: 'requests', label: 'My Requests', icon: Icons.Rent },
    { id: 'rent-records', label: `Rent Status${myRentRecords.filter(r => r.status !== 'paid').length > 0 ? ` (${myRentRecords.filter(r => r.status !== 'paid').length})` : ''}`, icon: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" /></svg> },
    { id: 'notices', label: `Notices${myNotices.filter(n => n.status === 'pending').length > 0 ? ` (${myNotices.filter(n => n.status === 'pending').length})` : ''}`, icon: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg> },
    { id: 'complaints', label: 'Complaints', icon: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg> },
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
      userRole="Tenant Dashboard"
    >
      <div className="space-y-6 animate-fadeIn">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-xl font-bold text-[#4B5EAA]">Tenant Dashboard</h2>
              <p className="text-sm text-[#8E9491]">Welcome, {user.name}!</p>
              {user.systemId && (
                <span className="inline-block mt-1 text-xs font-mono font-bold bg-[#EEF2FF] text-[#4B5EAA] border border-[#C7D2FE] px-2 py-0.5 rounded-full">
                  ID: {user.systemId}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Profile Tab */}
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
                    {(user.profilePhoto || user.documents?.profilePhotoUrl) ? (
                      <img src={user.profilePhoto || user.documents?.profilePhotoUrl} alt="Profile" className="w-32 h-32 rounded-full object-cover shadow-md border-4 border-white" />
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
                    <div className="pb-4 border-b border-gray-100">
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Email <span className="text-gray-300 normal-case font-normal">(Optional)</span></p>
                      <p className="text-lg font-bold text-gray-800">{user.email || <span className="text-gray-400 italic">Not provided</span>}</p>
                    </div>
                    <div className="pb-4 border-b border-gray-100">
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Aadhaar Number</p>
                      <p className="text-lg font-bold text-gray-800">{user.aadhaarNumber || <span className="text-gray-400 italic">Not provided</span>}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="shrink-0 mx-auto md:mx-0">
                      {profilePhotoEditFile ? (
                        <img src={URL.createObjectURL(profilePhotoEditFile)} alt="Preview" className="w-32 h-32 rounded-full object-cover shadow-md" />
                      ) : (user.profilePhoto || user.documents?.profilePhotoUrl) ? (
                        <img src={user.profilePhoto || user.documents?.profilePhotoUrl} alt="Profile" className="w-32 h-32 rounded-full object-cover shadow-md" />
                      ) : (
                        <div className="w-32 h-32 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center text-5xl font-bold shadow-sm border border-gray-200">
                          {user.name.charAt(0)}
                        </div>
                      )}
                      <label className="block mt-4 text-center cursor-pointer text-sm font-semibold text-[#1565C0] hover:text-[#0D47A1]">
                        Change Photo
                        <input type="file" accept="image/*" onChange={e => setProfilePhotoEditFile(e.target.files?.[0] || null)} className="hidden" />
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar Number</label>
                        <input value={editProfileData.aadhaarNumber} onChange={e => setEditProfileData({ ...editProfileData, aadhaarNumber: e.target.value })} className="w-full p-3 rounded-xl border border-[#EAEAEA] bg-[#F9F8F6] focus:border-[#4B5EAA] focus:ring-1 focus:ring-[#4B5EAA]" placeholder="12-digit Aadhaar Number" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4 border-t border-gray-100 mt-6 justify-end">
                    <Button type="button" variant="outline" onClick={() => { setIsEditingProfile(false); setProfilePhotoEditFile(null); setEditProfileData({ name: user.name, phone: user.phone, email: user.email || '', aadhaarNumber: user.aadhaarNumber || '' }); }}>Cancel</Button>
                    <Button type="submit" disabled={profileSubmitting}>{profileSubmitting ? 'Saving...' : 'Save Changes'}</Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Browse Tab */}
        {activeTab === 'browse' && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold">Available Properties & Units</h3>

            {/* ── Search Bar ───────────────────────────────────────────── */}
            <div className="bg-white p-4 rounded-2xl border border-[#EAEAEA] shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by city, locality, or property name..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-[#DDDCDB] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4B5EAA] focus:border-transparent transition-all bg-[#FAFAFA]"
                  />
                </div>

                {/* Use My Location */}
                <button
                  onClick={handleUseMyLocation}
                  disabled={geoLoading}
                  className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#4B5EAA] to-[#3D4D8C] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-60 whitespace-nowrap shadow-sm"
                >
                  {geoLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                      Detecting...
                    </span>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.536l.034.017Zm.31-10.433a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" clipRule="evenodd" />
                      </svg>
                      Use My Location
                    </>
                  )}
                </button>

                {/* Toggle Filters */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-3 border rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                    showFilters ? 'bg-[#4B5EAA] text-white border-[#4B5EAA]' : 'bg-white text-gray-700 border-[#DDDCDB] hover:bg-gray-50'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 0 1 .628.74v2.288a2.25 2.25 0 0 1-.659 1.59l-4.682 4.683a2.25 2.25 0 0 0-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 0 1 8 18.25v-5.757a2.25 2.25 0 0 0-.659-1.591L2.659 6.22A2.25 2.25 0 0 1 2 4.629V2.34a.75.75 0 0 1 .628-.74Z" clipRule="evenodd" />
                  </svg>
                  Filters
                </button>
              </div>

              {/* Popular Cities */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider self-center mr-1">Popular:</span>
                {POPULAR_CITIES.map(city => (
                  <button
                    key={city}
                    onClick={() => { setSearchQuery(city); setSelectedCity(''); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      searchQuery.toLowerCase() === city.toLowerCase()
                        ? 'bg-[#4B5EAA] text-white border-[#4B5EAA]'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-[#EEF2FF] hover:text-[#4B5EAA] hover:border-[#C7D2FE]'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>

              {/* ── Expanded Filters ──────────────────────────────────── */}
              {showFilters && (
                <div className="border-t border-[#EAEAEA] pt-4 space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* City Dropdown */}
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">City / Locality</label>
                      <select
                        value={selectedCity}
                        onChange={e => setSelectedCity(e.target.value)}
                        className="w-full px-3 py-2.5 border border-[#DDDCDB] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4B5EAA] bg-[#FAFAFA]"
                      >
                        <option value="">All Locations</option>
                        {allCities.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    {/* Price Range */}
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                        Price Range: ₹{priceRange[0].toLocaleString('en-IN')} — ₹{priceRange[1].toLocaleString('en-IN')}
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={maxPriceInData}
                          step={500}
                          value={priceRange[0]}
                          onChange={e => setPriceRange([Math.min(Number(e.target.value), priceRange[1] - 500), priceRange[1]])}
                          className="flex-1 accent-[#4B5EAA] h-2"
                        />
                        <span className="text-xs text-gray-400">to</span>
                        <input
                          type="range"
                          min={0}
                          max={maxPriceInData}
                          step={500}
                          value={priceRange[1]}
                          onChange={e => setPriceRange([priceRange[0], Math.max(Number(e.target.value), priceRange[0] + 500)])}
                          className="flex-1 accent-[#4B5EAA] h-2"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Active Filters & Clear */}
                  {(searchQuery || selectedCity || priceRange[0] > 0 || priceRange[1] < maxPriceInData) && (
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        {searchQuery && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#EEF2FF] text-[#4B5EAA] rounded-full text-xs font-semibold border border-[#C7D2FE]">
                            Search: "{searchQuery}"
                            <button onClick={() => setSearchQuery('')} className="ml-1 hover:text-red-500">×</button>
                          </span>
                        )}
                        {selectedCity && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#EEF2FF] text-[#4B5EAA] rounded-full text-xs font-semibold border border-[#C7D2FE]">
                            City: {selectedCity}
                            <button onClick={() => setSelectedCity('')} className="ml-1 hover:text-red-500">×</button>
                          </span>
                        )}
                        {(priceRange[0] > 0 || priceRange[1] < maxPriceInData) && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#EEF2FF] text-[#4B5EAA] rounded-full text-xs font-semibold border border-[#C7D2FE]">
                            ₹{priceRange[0].toLocaleString('en-IN')} — ₹{priceRange[1].toLocaleString('en-IN')}
                            <button onClick={() => setPriceRange([0, maxPriceInData])} className="ml-1 hover:text-red-500">×</button>
                          </span>
                        )}
                      </div>
                      <button onClick={clearFilters} className="text-xs text-red-500 font-semibold hover:underline">Clear All</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Results Count ─────────────────────────────────────── */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing <strong className="text-gray-800">{filteredProperties.length}</strong> of {propertiesWithUnits.length} properties
              </p>
            </div>

            {/* ── Property Grid ─────────────────────────────────────── */}
            {filteredProperties.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-[#EAEAEA]">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto text-gray-300 mb-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                <p className="text-lg text-gray-500">No properties found matching your search.</p>
                <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or search for a different location.</p>
                <button onClick={clearFilters} className="mt-4 px-4 py-2 bg-[#4B5EAA] text-white rounded-xl text-sm font-semibold hover:bg-[#3D4D8C] transition-colors">
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredProperties.map(prop => {
                  const owner = ownerDocs[prop.ownerId];
                  return (
                    <div key={prop.id} className="bg-white rounded-2xl border border-[#EAEAEA] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full border-t-4 border-t-[#4B5EAA]">
                      {prop.images && prop.images.length > 0 && (
                        <div className="w-full h-48 bg-gray-100 flex overflow-x-auto snap-x snap-mandatory relative" style={{ scrollbarWidth: 'none' }}>
                          {prop.images.map((imgUrl, i) => (
                            <img key={i} src={imgUrl} alt={`${prop.propertyTitle} image ${i + 1}`} className="w-full h-full object-cover shrink-0 snap-center" />
                          ))}
                          {prop.images.length > 1 && (
                            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full font-bold shadow">
                              {prop.images.length} Photos
                            </div>
                          )}
                        </div>
                      )}
                      <div className="p-5 flex flex-col flex-1">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-bold uppercase tracking-wide mb-2 inline-block">
                              {prop.availableUnits.length} Unit{prop.availableUnits.length > 1 ? 's' : ''} Available
                            </span>
                            <h4 className="text-xl font-bold text-[#2D3436]">{prop.propertyTitle}</h4>
                            <p className="text-sm text-[#8E9491] flex items-center gap-1 mt-1">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.536l.034.017Zm.31-10.433a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" clipRule="evenodd" /></svg>
                              {prop.location}
                            </p>
                          </div>
                          {owner && (
                            <span className="bg-purple-50 text-purple-700 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                              <Icons.Users /> Owner
                            </span>
                          )}
                        </div>

                        {prop.description && (
                          <div className="bg-[#F9F8F6] p-3 rounded-xl mb-3 text-sm text-gray-700">
                            {prop.description.length > 80 ? prop.description.substring(0, 80) + '...' : prop.description}
                          </div>
                        )}

                        {/* Unit List */}
                        <div className="mb-4">
                          <p className="text-xs font-semibold uppercase text-gray-400 mb-2 tracking-wider">Available Units</p>
                          <div className="space-y-1">
                            {prop.availableUnits.map(unit => (
                              <div key={unit.unitId} className="flex flex-col px-3 py-2 bg-[#EEF2FF] rounded-lg text-sm">
                                <div className="flex justify-between items-center">
                                  <span className="font-semibold text-[#3730a3]">{unit.unitName} ({unit.roomSize})</span>
                                  <span className="font-bold text-[#4B5EAA]">₹{unit.rentAmount}<span className="text-xs font-normal text-gray-500">/mo</span></span>
                                </div>
                                <div className="mt-2 text-xs text-gray-500">
                                  <span className="font-semibold text-gray-700">Rent:</span> ₹{unit.rentAmount} | <span className="font-semibold text-gray-700">Deposit:</span> ₹{unit.securityDeposit || 0}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-auto">
                          <Button onClick={() => handleApplyClick(prop)} variant="primary" fullWidth className="py-3 font-semibold shadow-md hover:bg-[#3D4D8C] transition-colors gap-2">
                            Select Units & Apply
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* My Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold">My Requests</h3>

            {myRequests.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-[#EAEAEA]">
                <p className="text-lg text-gray-500">You haven't requested any properties yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myRequests.map(req => {
                  const prop = allProperties.find(p => p.id === req.propertyId);
                  const safeStatus = req.status || 'pending';
                  
                  const getBadgeStyle = () => {
                    if (safeStatus === 'approved') return 'bg-blue-100 text-blue-700 border-blue-200';
                    if (safeStatus === 'paid') return 'bg-green-100 text-green-700 border-green-200';
                    if (safeStatus === 'cancelled_due_to_no_payment') return 'bg-gray-100 text-gray-700 border-gray-200';
                    if (safeStatus === 'rejected') return 'bg-red-100 text-red-700 border-red-200';
                    return 'bg-yellow-100 text-yellow-700 border-yellow-200'; // pending
                  };
                  
                  const getBadgeText = () => {
                    if (safeStatus === 'approved') return 'Approved - Awaiting Payment';
                    if (safeStatus === 'paid') return 'Paid';
                    if (safeStatus === 'cancelled_due_to_no_payment') return 'Cancelled (No Payment)';
                    if (safeStatus === 'rejected') return 'Request Rejected';
                    return 'Pending Approval';
                  };

                  return (
                    <div key={req.id} className="bg-white p-6 rounded-2xl border border-[#EAEAEA] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase shadow-sm border ${getBadgeStyle()}`}>
                            {getBadgeText()}
                          </span>
                          <span className="text-sm text-gray-400 font-medium">Applied on {formatDate(req.createdAt)}</span>
                        </div>
                        <h4 className="text-xl font-bold text-[#2D3436] mt-3">
                          {prop ? prop.propertyTitle : <span className="text-gray-400 italic">Property Unavailable</span>}
                        </h4>
                        {prop && <p className="text-[#8E9491] text-sm mt-1">{prop.location}</p>}
                        {req.selectedUnits && req.selectedUnits.length > 0 && (
                          <p className="text-[#1565C0] font-bold text-sm mt-1">
                            {req.selectedUnits.length} Unit{req.selectedUnits.length > 1 ? 's' : ''} Requested
                          </p>
                        )}
                        {safeStatus === 'approved' && (
                          <Button 
                            variant="primary" 
                            className="mt-3 shadow-md border border-[#3D4D8C] hover:-translate-y-0.5" 
                            onClick={() => {
                              setSelectedRequestToPay(req);
                              setIsRequestPayModalOpen(true);
                            }}
                          >
                            Pay Now to Secure
                          </Button>
                        )}
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        {req.totalRent ? (
                          <>
                            <p className="font-bold text-[#4B5EAA] text-2xl">₹{req.totalRent}</p>
                            <span className="text-xs text-gray-400">Total Rent / mo</span>
                          </>
                        ) : prop && (
                          <p className="font-bold text-[#4B5EAA] text-2xl">₹{prop.rentAmount}</p>
                        )}
                        <span className="text-xs bg-[#F9F8F6] px-2 py-1 rounded text-gray-500">Req ID: {req.id?.substring(0, 6)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Apply / Unit Selection Modal */}
        <Modal isOpen={isApplyModalOpen} onClose={() => { setIsApplyModalOpen(false); setSelectedProperty(null); setSelectedUnits([]); setApplyIdProofUrl(''); setApplyAddressProofUrl(''); setApplyProfilePhotoUrl(''); }} title="Select Units & Apply">
          <form onSubmit={handleSubmitRequest} className="space-y-5 max-h-[80vh] overflow-y-auto px-1 pb-1">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <p className="font-bold text-lg text-[#2D3436]">{selectedProperty?.propertyTitle}</p>
              <p className="text-[#8E9491] text-sm">{selectedProperty?.location}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-700 mb-3">Select the units you want to rent (multiple allowed):</p>
              <div className="space-y-2">
                {selectedProperty?.availableUnits.map(unit => {
                  const isSelected = selectedUnits.some(u => u.unitId === unit.unitId);
                  return (
                    <label key={unit.unitId} className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-[#4B5EAA] bg-[#EEF2FF]' : 'border-[#EAEAEA] bg-white hover:border-[#4B5EAA]/40'}`}>
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={isSelected} onChange={() => handleUnitToggle(unit)} className="w-5 h-5 accent-[#4B5EAA]" />
                        <span className="font-semibold text-gray-800">{unit.unitName} ({unit.roomSize})</span>
                      </div>
                      <span className="font-bold text-[#4B5EAA]">₹{unit.rentAmount}<span className="text-xs font-normal text-gray-500">/mo</span></span>
                    </label>
                  );
                })}
              </div>
            </div>
            {selectedUnits.length > 0 && (
              <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex justify-between items-center">
                <span className="font-semibold text-green-800">Total Rent ({selectedUnits.length} unit{selectedUnits.length > 1 ? 's' : ''}):</span>
                <span className="text-2xl font-bold text-green-700">₹{totalSelectedRent}/mo</span>
              </div>
            )}
            {selectedUnits.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-xl text-sm text-yellow-800">
                Total Security Deposit: <strong>₹{selectedUnits.reduce((sum, u) => sum + (u.securityDeposit || 0), 0)}</strong> (payable to owner on approval)
              </div>
            )}
            <div className="bg-[#E3F2FD] p-4 rounded-xl border border-[#BBDEFB]">
              <h4 className="font-bold text-[#1565C0] flex items-center gap-2 mb-1"><Icons.Docs /> Documents Required</h4>
              <p className="text-xs text-[#1565C0] mb-4">Please upload your ID Proof to proceed. (Max 5MB)</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1565C0] mb-1">ID Proof (Aadhaar/PAN) <span className="text-red-500">*</span></label>
                  {!applyIdProofUrl && !isUploadingId && (
                    <label className="flex items-center gap-2 px-3 py-2 bg-white border border-blue-200 rounded cursor-pointer hover:bg-blue-50 transition-colors w-full">
                      <span className="bg-[#1565C0] text-white text-xs px-2 py-1 rounded shadow-sm shrink-0">Upload ID Proof</span>
                      <span className="text-sm text-gray-500 truncate">No file chosen</span>
                      <input type="file" accept="image/*,application/pdf" onChange={handleIdProofUpload} className="hidden" />
                    </label>
                  )}
                  {isUploadingId && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded text-sm text-[#1565C0] font-semibold"><span className="animate-spin h-4 w-4 border-2 border-[#1565C0] border-t-transparent rounded-full shrink-0"></span> Uploading...</div>
                  )}
                  {applyIdProofUrl && (
                    <div className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 rounded">
                      <a href={applyIdProofUrl} target="_blank" rel="noreferrer" className="text-sm text-green-700 font-semibold hover:underline">View Uploaded ID Proof</a>
                      <button type="button" onClick={() => setApplyIdProofUrl('')} className="text-xs text-red-500 font-bold ml-2">Remove</button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1565C0] mb-1">Address Proof (Optional)</label>
                  {!applyAddressProofUrl && !isUploadingAddress && (
                    <label className="flex items-center gap-2 px-3 py-2 bg-white border border-blue-200 rounded cursor-pointer hover:bg-blue-50 transition-colors w-full">
                      <span className="bg-gray-200 text-gray-700 font-medium text-xs px-2 py-1 rounded shadow-sm shrink-0">Upload Address Proof</span>
                      <span className="text-sm text-gray-500 truncate">No file chosen</span>
                      <input type="file" accept="image/*,application/pdf" onChange={handleAddressProofUpload} className="hidden" />
                    </label>
                  )}
                  {isUploadingAddress && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded text-sm text-[#1565C0] font-semibold"><span className="animate-spin h-4 w-4 border-2 border-[#1565C0] border-t-transparent rounded-full shrink-0"></span> Uploading...</div>
                  )}
                  {applyAddressProofUrl && (
                    <div className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 rounded">
                      <a href={applyAddressProofUrl} target="_blank" rel="noreferrer" className="text-sm text-green-700 font-semibold hover:underline">View Address Proof</a>
                      <button type="button" onClick={() => setApplyAddressProofUrl('')} className="text-xs text-red-500 font-bold ml-2">Remove</button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1565C0] mb-1">Profile Photo (Optional)</label>
                  {!applyProfilePhotoUrl && !isUploadingProfile && (
                    <label className="flex items-center gap-2 px-3 py-2 bg-white border border-blue-200 rounded cursor-pointer hover:bg-blue-50 transition-colors w-full">
                      <span className="bg-gray-200 text-gray-700 font-medium text-xs px-2 py-1 rounded shadow-sm shrink-0">Upload Profile Photo</span>
                      <span className="text-sm text-gray-500 truncate">No file chosen</span>
                      <input type="file" accept="image/*" onChange={handleProfilePhotoUpload} className="hidden" />
                    </label>
                  )}
                  {isUploadingProfile && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded text-sm text-[#1565C0] font-semibold"><span className="animate-spin h-4 w-4 border-2 border-[#1565C0] border-t-transparent rounded-full shrink-0"></span> Uploading...</div>
                  )}
                  {applyProfilePhotoUrl && (
                    <div className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 rounded">
                      <a href={applyProfilePhotoUrl} target="_blank" rel="noreferrer" className="text-sm text-green-700 font-semibold hover:underline">View Profile Photo</a>
                      <button type="button" onClick={() => setApplyProfilePhotoUrl('')} className="text-xs text-red-500 font-bold ml-2">Remove</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Progress / Error / Retry indicator */}
            {isSubmitting && uploadProgress && !uploadError && (
              <div className="bg-[#EEF2FF] border border-[#C7D2FE] rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="animate-spin h-4 w-4 border-2 border-[#4B5EAA] border-t-transparent rounded-full shrink-0"></span>
                <span className="text-sm font-semibold text-[#4B5EAA]">{uploadProgress}</span>
              </div>
            )}

            {uploadError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="text-red-500 text-lg shrink-0 mt-0.5">⚠️</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-red-700">Upload Failed</p>
                    <p className="text-xs text-red-600 mt-0.5">{uploadError}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setUploadError(''); }}
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2 rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                  Retry Upload
                </button>
              </div>
            )}

            <div className="flex gap-3 mt-2 sticky bottom-0 bg-white pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => { setIsApplyModalOpen(false); setUploadError(''); }} fullWidth className="py-3 font-semibold">Cancel</Button>
              <Button
                type="submit"
                disabled={isSubmitting || selectedUnits.length === 0 || !applyIdProofUrl || isUploadingId || isUploadingAddress || isUploadingProfile}
                fullWidth
                className="py-3 font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                {isSubmitting
                  ? <span className="flex items-center justify-center gap-2"><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span> Processing...</span>
                  : uploadError ? 'Try Again' : `Submit Request (₹${totalSelectedRent}/mo)`}
              </Button>
            </div>
          </form>
        </Modal>


        {/* ── Notices Tab ──────────────────────────────────────────── */}
        {activeTab === 'notices' && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold">Rent Notices</h3>
            {myNotices.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-[#EAEAEA]">
                <p className="text-lg text-gray-500">No rent notices received yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myNotices.map(notice => {
                  const prop = allProperties.find(p => p.id === notice.propertyId);
                  return (
                    <div key={notice.id} className={`bg-white p-5 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${notice.status === 'pending' ? 'border-yellow-300 border-l-4 border-l-yellow-400' : 'border-[#EAEAEA]'}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${notice.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{notice.status}</span>
                          <span className="text-xs text-gray-400">{formatDate(notice.createdAt)}</span>
                        </div>
                        <p className="font-bold text-gray-800 text-lg">{prop?.propertyTitle || 'Your Property'}</p>
                        <p className="text-sm text-gray-600 mt-1">Month: <strong>{notice.month}</strong> | Due: <strong>{formatDate(notice.dueDate)}</strong></p>
                        <p className="text-sm text-gray-500 italic mt-1">"{notice.message}"</p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <p className="text-2xl font-bold text-[#4B5EAA]">₹{notice.rentAmount}</p>
                        {notice.status === 'pending' && (
                          <Button variant="primary" className="!px-4 !py-2 !text-sm" onClick={() => { setSelectedNotice(notice); setIsPayModalOpen(true); }}>
                            Pay Rent
                          </Button>
                        )}
                        {notice.status === 'paid' && <span className="text-sm font-bold text-green-600">✓ Paid</span>}
                      </div>
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
              <h3 className="text-2xl font-bold">Notifications {unreadCount > 0 && <span className="ml-2 text-sm font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full animate-pulse">{unreadCount} unread</span>}</h3>
              {unreadCount > 0 && <button onClick={markAllRead} className="text-sm text-[#4B5EAA] font-semibold hover:underline">Mark all as read</button>}
            </div>
            {myNotifications.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-[#EAEAEA]">
                <p className="text-lg text-gray-500">No notifications yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myNotifications.map(notif => {
                  const iconBg =
                    notif.type === 'payment' ? 'bg-green-100' :
                    notif.type === 'rent_reminder' ? 'bg-orange-100' :
                    notif.type === 'overdue' ? 'bg-red-100' :
                    notif.type === 'notice' ? 'bg-blue-100' :
                    notif.type === 'reminder' ? 'bg-orange-100' :
                    notif.type === 'complaint' ? 'bg-purple-100' :
                    notif.type === 'alert' ? 'bg-red-100' :
                    'bg-yellow-100';
                  const icon =
                    notif.type === 'payment' ? '₹' :
                    notif.type === 'rent_reminder' ? '⏰' :
                    notif.type === 'overdue' ? '🚨' :
                    notif.type === 'notice' ? '📋' :
                    notif.type === 'reminder' ? '⏰' :
                    notif.type === 'complaint' ? '🔧' :
                    notif.type === 'alert' ? '⚠️' :
                    '🔔';
                  const isOverdueNotif = notif.type === 'overdue';

                  return (
                    <div key={notif.id} className={`p-4 rounded-2xl border flex items-start gap-4 transition-all ${
                      isOverdueNotif && notif.status === 'unread' ? 'bg-red-50 border-red-200' :
                      notif.status === 'unread' ? 'bg-[#EEF2FF] border-[#C7D2FE]' :
                      'bg-white border-[#EAEAEA]'
                    }`}>
                      <div className={`p-2 rounded-xl shrink-0 text-lg ${iconBg}`}>
                        {icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                            isOverdueNotif ? 'bg-red-100 text-red-700' :
                            notif.type === 'rent_reminder' ? 'bg-orange-100 text-orange-700' :
                            notif.type === 'payment' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{notif.type.replace('_', ' ')}</span>
                        </div>
                        <p className={`text-sm ${notif.status === 'unread' ? 'font-bold text-gray-900' : 'text-gray-700'}`}>{notif.message}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <p className="text-xs text-gray-400">{formatDate(notif.createdAt, true)}</p>
                          {notif.status === 'unread' && notif.id && (
                            <button
                              onClick={() => updateDoc(doc(db, 'notifications', notif.id!), { status: 'read' })}
                              className="text-xs text-[#4B5EAA] font-semibold hover:underline"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                      {notif.status === 'unread' && <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 flex-none ${isOverdueNotif ? 'bg-red-500 animate-pulse' : 'bg-[#4B5EAA]'}`}></span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {/* ── Rent Records Tab ──────────────────────────────────────── */}
        {activeTab === 'rent-records' && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold">My Rent Status</h3>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-2xl text-center">
                <p className="text-xs font-semibold text-yellow-600 uppercase tracking-wider mb-1">Pending</p>
                <p className="text-2xl font-bold text-yellow-700">{myRentRecords.filter(r => r.status === 'pending').length}</p>
              </div>
              <div className="bg-green-50 border border-green-200 p-4 rounded-2xl text-center">
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-1">Paid</p>
                <p className="text-2xl font-bold text-green-700">{myRentRecords.filter(r => r.status === 'paid').length}</p>
              </div>
              <div className="bg-red-50 border border-red-200 p-4 rounded-2xl text-center">
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">Overdue</p>
                <p className="text-2xl font-bold text-red-700">{myRentRecords.filter(r => r.status === 'overdue' || r.status === 'late').length}</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 p-4 rounded-2xl text-center">
                <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1">Total Late Fees</p>
                <p className="text-2xl font-bold text-purple-700">₹{myRentRecords.reduce((sum, r) => sum + (r.lateFee || 0), 0).toLocaleString('en-IN')}</p>
              </div>
            </div>

            {myRentRecords.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-[#EAEAEA]">
                <p className="text-lg text-gray-500">No rent records yet. Records are auto-created after your first property payment.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="font-bold text-gray-700">All Rent Records</h4>
                <div className="space-y-3">
                  {myRentRecords.map(rec => {
                    const prop = allProperties.find(p => p.id === rec.propertyId);
                    const isOverdue = rec.status === 'overdue' || rec.status === 'late';
                    const daysOver = isOverdue ? getDaysOverdue(rec.dueDate) : 0;
                    const currentLateFee = isOverdue ? Math.round(rec.rentAmount * 0.02) : 0;
                    const totalDue = rec.rentAmount + currentLateFee;

                    return (
                      <div key={rec.id} className={`bg-white p-5 rounded-2xl border shadow-sm transition-all ${
                        isOverdue ? 'border-red-300 border-l-4 border-l-red-500 bg-red-50/30' :
                        rec.status === 'paid' ? 'border-green-200' :
                        'border-yellow-200 border-l-4 border-l-yellow-400'
                      }`}>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                                rec.status === 'paid' ? 'bg-green-100 text-green-700' :
                                isOverdue ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>{isOverdue ? 'OVERDUE' : rec.status}</span>
                              {isOverdue && daysOver > 0 && (
                                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">{daysOver} day{daysOver > 1 ? 's' : ''} late</span>
                              )}
                              <span className="text-xs text-gray-400">{formatDate(rec.dueDate)}</span>
                            </div>
                            <p className="font-bold text-gray-800">{prop?.propertyTitle || 'Property'}</p>
                            <p className="text-sm text-gray-600 mt-1">Month: <strong>{rec.month}</strong> | Due: <strong>{formatDate(rec.dueDate)}</strong></p>
                            {rec.nextDueDate && rec.status === 'paid' && (
                              <p className="text-xs text-blue-600 mt-1">Next due: {formatDate(rec.nextDueDate)}</p>
                            )}
                            {isOverdue && currentLateFee > 0 && (
                              <p className="text-sm text-red-700 font-semibold mt-2 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
                                ⚠️ Overdue + Fine added: ₹{currentLateFee.toLocaleString('en-IN')} (2% penalty)
                              </p>
                            )}
                            {rec.paymentDate && <p className="text-xs text-green-600 mt-1">Paid on: {formatDate(rec.paymentDate)}</p>}
                          </div>
                          <div className="text-right flex flex-col items-end gap-2">
                            <p className={`text-2xl font-bold ${isOverdue ? 'text-red-600' : 'text-[#4B5EAA]'}`}>
                              ₹{(isOverdue ? totalDue : rec.rentAmount).toLocaleString('en-IN')}
                            </p>
                            {isOverdue && (
                              <span className="text-xs text-gray-500">(Rent: ₹{rec.rentAmount.toLocaleString('en-IN')} + Fee: ₹{currentLateFee.toLocaleString('en-IN')})</span>
                            )}
                            {rec.status !== 'paid' && (
                              <Button 
                                variant="primary" 
                                className={`!px-4 !py-2 !text-sm ${isOverdue ? '!bg-red-600 hover:!bg-red-700' : ''}`}
                                onClick={() => { 
                                  const findProp = allProperties.find(p => p.id === rec.propertyId);
                                  setSelectedNotice({
                                    id: `record_${rec.id}`,
                                    tenantId: rec.tenantId,
                                    propertyId: rec.propertyId,
                                    ownerId: findProp?.ownerId || '',
                                    month: rec.month,
                                    rentAmount: isOverdue ? totalDue : rec.rentAmount,
                                    dueDate: rec.dueDate,
                                    status: 'pending',
                                    message: isOverdue ? `Overdue Rent + Late Fee` : 'Rent Payment',
                                    createdAt: new Date().toISOString()
                                  } as any); 
                                  setIsPayModalOpen(true); 
                                }}
                              >
                                {isOverdue ? `Pay ₹${totalDue.toLocaleString('en-IN')}` : 'Pay Rent'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Payment History from rent_payments */}
                {myPayments.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-bold text-gray-700 mb-3">Payment History</h4>
                    <div className="bg-white rounded-2xl border border-[#EAEAEA] overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 border-b border-[#EAEAEA]">
                              <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Month</th>
                              <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                              <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Method</th>
                              <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Paid On</th>
                              <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {myPayments.map(pay => (
                              <tr key={pay.id} className="border-b border-[#EAEAEA] hover:bg-gray-50">
                                <td className="p-3 font-medium text-gray-800">{pay.month}</td>
                                <td className="p-3 font-bold text-green-600">₹{pay.amount.toLocaleString('en-IN')}</td>
                                <td className="p-3 text-gray-600">{pay.paymentMethod}</td>
                                <td className="p-3 text-gray-600">{formatDate(pay.paymentDate)}</td>
                                <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-green-100 text-green-700">Completed</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Complaints Tab ────────────────────────────────────────── */}
        {activeTab === 'complaints' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold">My Complaints</h3>
              <Button onClick={() => setIsComplaintModalOpen(true)} variant="primary" className="!px-4 !py-2 !text-sm">+ Submit Complaint</Button>
            </div>
            {myComplaints.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-[#EAEAEA]">
                <p className="text-lg text-gray-500">No complaints submitted yet.</p>
                <p className="text-sm text-gray-400 mt-1">Submit a complaint if you have any issues with your property.</p>
                <Button onClick={() => setIsComplaintModalOpen(true)} variant="primary" className="!px-5 !py-2.5 !text-sm mt-4">Submit Complaint</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {myComplaints.map(complaint => {
                  const priorityColors: Record<string, string> = { low: 'bg-gray-100 text-gray-600', medium: 'bg-yellow-100 text-yellow-700', high: 'bg-red-100 text-red-700' };
                  const statusColors: Record<string, string> = { [ComplaintStatus.OPEN]: 'bg-red-100 text-red-700', [ComplaintStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-700', [ComplaintStatus.RESOLVED]: 'bg-green-100 text-green-700' };
                  return (
                    <div key={complaint.id} className="bg-white p-5 rounded-2xl border border-[#EAEAEA] shadow-sm">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${statusColors[complaint.status] || 'bg-gray-100'}`}>{complaint.status.replace('_', ' ')}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${priorityColors[complaint.priority] || 'bg-gray-100'}`}>{complaint.priority} priority</span>
                        <span className="text-xs text-gray-400">{new Date(complaint.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="font-bold text-gray-800 text-lg">{complaint.title}</p>
                      <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-3 rounded-xl">{complaint.description}</p>
                      {complaint.status === ComplaintStatus.RESOLVED && (
                        <p className="text-sm text-green-600 font-semibold mt-2">✅ This complaint has been resolved by the owner.</p>
                      )}
                      {complaint.status === ComplaintStatus.IN_PROGRESS && (
                        <p className="text-sm text-blue-600 font-semibold mt-2">🔧 Owner is working on this complaint.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Submit Complaint Modal */}
        <Modal isOpen={isComplaintModalOpen} onClose={() => setIsComplaintModalOpen(false)} title="Submit a Complaint">
          <form onSubmit={handleSubmitComplaint} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Property *</label>
              <select required value={complaintForm.propertyId} onChange={e => setComplaintForm({ ...complaintForm, propertyId: e.target.value })} className="w-full p-3 rounded-xl border border-[#EAEAEA] bg-[#F9F8F6]">
                <option value="">-- Select Property --</option>
                {allProperties.map(p => <option key={p.id} value={p.id}>{p.propertyTitle} — {p.location}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Complaint Title *</label>
              <input required value={complaintForm.title} onChange={e => setComplaintForm({ ...complaintForm, title: e.target.value })} className="w-full p-3 rounded-xl border border-[#EAEAEA] bg-[#F9F8F6]" placeholder="e.g. Water leakage in bathroom" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description *</label>
              <textarea required rows={4} value={complaintForm.description} onChange={e => setComplaintForm({ ...complaintForm, description: e.target.value })} className="w-full p-3 rounded-xl border border-[#EAEAEA] bg-[#F9F8F6] resize-none" placeholder="Describe the issue in detail..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Priority *</label>
              <div className="grid grid-cols-3 gap-2">
                {[ComplaintPriority.LOW, ComplaintPriority.MEDIUM, ComplaintPriority.HIGH].map(p => (
                  <label key={p} className={`cursor-pointer border-2 rounded-xl p-3 text-center text-sm font-semibold transition-all ${complaintForm.priority === p ? (p === ComplaintPriority.HIGH ? 'border-red-500 bg-red-50 text-red-700' : p === ComplaintPriority.MEDIUM ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : 'border-gray-400 bg-gray-50 text-gray-700') : 'border-[#EAEAEA] text-gray-500 hover:border-gray-300'}`}>
                    <input type="radio" className="hidden" name="priority" value={p} checked={complaintForm.priority === p} onChange={() => setComplaintForm({ ...complaintForm, priority: p })} />
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsComplaintModalOpen(false)} fullWidth>Cancel</Button>
              <Button type="submit" disabled={submittingComplaint} fullWidth>{submittingComplaint ? 'Submitting...' : 'Submit Complaint'}</Button>
            </div>
          </form>
        </Modal>

        {/* Payment Gateway Modal for Rent */}
        {selectedNotice && (
          <PaymentModal
            isOpen={isPayModalOpen}
            onClose={() => { setIsPayModalOpen(false); setSelectedNotice(null); }}
            amount={selectedNotice.rentAmount}
            month={selectedNotice.month}
            onPaymentSuccess={handlePayRent}
          />
        )}

        {/* Payment Gateway Modal for Requests */}
        {selectedRequestToPay && (() => {
          const prop = allProperties.find(p => p.id === selectedRequestToPay.propertyId);
          const rentAmt = selectedRequestToPay.totalRent || prop?.rentAmount || 0;
          const depAmt = selectedRequestToPay.depositAmount || prop?.securityDeposit || 0;
          const brokerageAmt = rentAmt * (brokeragePercent / 100); 
          const totalAmount = rentAmt + depAmt + brokerageAmt;
          
          return (
            <PaymentModal
              isOpen={isRequestPayModalOpen}
              onClose={() => { setIsRequestPayModalOpen(false); setSelectedRequestToPay(null); }}
              amount={totalAmount}
              month="Booking Confirmation"
              title="Complete Booking Payment"
              subtitle={`For ${prop?.propertyTitle || 'Property'}`}
              breakdown={[
                { label: 'Rent (1 Month)', amount: rentAmt },
                { label: 'Security Deposit', amount: depAmt },
                { 
                  label: `Brokerage (${brokeragePercent}% of monthly rent, One-time platform fee)`, 
                  amount: brokerageAmt,
                  isHighlighted: true,
                  tooltip: 'Charged for connecting tenant and owner'
                }
              ]}
              onPaymentSuccess={(method, txId) => handlePayRequest(method, txId, rentAmt, depAmt, brokerageAmt, totalAmount)}
            />
          );
        })()}
        
        {/* Payment Success Modal */}
        {lastTxData && (
          <PaymentSuccess
            isOpen={isPaymentSuccessOpen}
            onClose={() => { setIsPaymentSuccessOpen(false); setLastTxData(null); }}
            amount={lastTxData.amount}
            transactionId={lastTxData.id}
            paymentMethod={lastTxData.method}
            month={lastTxData.month}
          />
        )}

      </div>
    </Layout>
  );
};

export default TenantPanel;
