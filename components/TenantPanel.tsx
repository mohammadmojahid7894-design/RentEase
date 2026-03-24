import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { User, Property, InterestRequest, PropertyUnit, RentNotice, AppNotification, Complaint, ComplaintStatus, ComplaintPriority, RentRecord, RentPaymentRecord } from '../types';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { uploadImage } from '../cloudinary';
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

  // Application Form States
  const [applyIdProof, setApplyIdProof] = useState<File | null>(null);
  const [applyAddressProof, setApplyAddressProof] = useState<File | null>(null);
  const [applyProfilePhoto, setApplyProfilePhoto] = useState<File | null>(null);
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

  const t = TRANSLATIONS[lang];

  // Fetch Available Properties and their Units
  useEffect(() => {
    const q = query(collection(db, 'properties'), where('availabilityStatus', '==', 'available'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const propsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property)).filter(p => p.status === 'approved' || p.isVisibleToTenants === true || (!p.status && p.isVisibleToTenants === undefined));
      setAllProperties(propsData);
      setLoading(false);

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

  // Fetch My Rent Records
  useEffect(() => {
    if (!user.id) return;
    const q = query(collection(db, 'rentRecords'), where('tenantId', '==', user.id));
    const unsub = onSnapshot(q, snap => {
      setMyRentRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as RentRecord)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
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

  // ── Submit request ─────────────────────────────────
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty || !user.id || selectedUnits.length === 0) {
      alert('Please select at least one unit before submitting.');
      return;
    }

    if (!applyIdProof) {
      alert('ID Proof is required.');
      return;
    }

    if (applyIdProof.size > 5 * 1024 * 1024 || (applyAddressProof && applyAddressProof.size > 5 * 1024 * 1024) || (applyProfilePhoto && applyProfilePhoto.size > 5 * 1024 * 1024)) {
      alert('File size exceeds 5MB limit.');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress('');

    try {
      let idProofUrl = '';
      let addressProofUrl = '';
      let profilePhotoUrl = '';

      if (applyIdProof) {
        setUploadProgress('Uploading ID Proof...');
        idProofUrl = await uploadImage(applyIdProof);
      }
      if (applyAddressProof) {
        setUploadProgress('Uploading Address Proof...');
        addressProofUrl = await uploadImage(applyAddressProof);
      }
      if (applyProfilePhoto) {
        setUploadProgress('Uploading Profile Photo...');
        profilePhotoUrl = await uploadImage(applyProfilePhoto);
      }

      setUploadProgress('📨 Submitting request...');
      await addDoc(collection(db, 'requests'), {
        tenantId: user.id,
        propertyId: selectedProperty.id,
        selectedUnits: selectedUnits.map(u => u.unitId),
        totalRent: totalSelectedRent,
        depositAmount: selectedProperty.securityDeposit || 0,
        idProofUrl,
        addressProofUrl,
        profilePhotoUrl,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      setIsApplyModalOpen(false);
      setSelectedProperty(null);
      setSelectedUnits([]);
      setApplyIdProof(null);
      setApplyAddressProof(null);
      setApplyProfilePhoto(null);
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
  const handlePayRequest = async (method: string, transactionId: string, amount: number) => {
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
        paymentDate: new Date().toISOString()
      });

      await addDoc(collection(db, 'rent_payments'), {
        tenantId: user.id,
        ownerId: prop?.ownerId || '',
        propertyId: selectedRequestToPay.propertyId,
        requestId: selectedRequestToPay.id,
        amount,
        month: 'Initial Security & Rent',
        paymentDate: new Date().toISOString(),
        paymentMethod: method,
        transactionId,
        status: 'completed',
        createdAt: new Date().toISOString()
      });

      if (prop?.ownerId) {
        await addDoc(collection(db, 'notifications'), {
          userId: prop.ownerId,
          type: 'payment',
          message: `Tenant ${user.name} has paid ₹${amount} and secured ${prop.propertyTitle}. Property assigned.`,
          status: 'unread',
          createdAt: new Date().toISOString()
        });
      }

      setIsRequestPayModalOpen(false);
      setLastTxData({ id: transactionId, method, amount, month: 'Initial Security & Rent' });
      setIsPaymentSuccessOpen(true);
      setSelectedRequestToPay(null);
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

            {propertiesWithUnits.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-[#EAEAEA]">
                <Icons.Home />
                <p className="mt-4 text-lg text-gray-500">No properties with vacant units at the moment.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {propertiesWithUnits.map(prop => {
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
                              <div key={unit.unitId} className="flex justify-between items-center px-3 py-2 bg-[#EEF2FF] rounded-lg text-sm">
                                <span className="font-semibold text-[#3730a3]">{unit.unitName} ({unit.roomSize})</span>
                                <span className="font-bold text-[#4B5EAA]">₹{unit.rentAmount}<span className="text-xs font-normal text-gray-500">/mo</span></span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {prop.securityDeposit > 0 && (
                          <p className="text-xs text-gray-500 mb-4">Security Deposit: <span className="font-bold text-gray-700">₹{prop.securityDeposit}</span></p>
                        )}

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
                          <span className="text-sm text-gray-400 font-medium">Applied on {new Date(req.createdAt).toLocaleDateString()}</span>
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
        <Modal isOpen={isApplyModalOpen} onClose={() => { setIsApplyModalOpen(false); setSelectedProperty(null); setSelectedUnits([]); }} title="Select Units & Apply">
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
            {selectedProperty && selectedProperty.securityDeposit > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-xl text-sm text-yellow-800">
                Security Deposit: <strong>₹{selectedProperty.securityDeposit}</strong> (payable to owner on approval)
              </div>
            )}
            <div className="bg-[#E3F2FD] p-4 rounded-xl border border-[#BBDEFB]">
              <h4 className="font-bold text-[#1565C0] flex items-center gap-2 mb-1"><Icons.Docs /> Documents Required</h4>
              <p className="text-xs text-[#1565C0] mb-4">Please upload your ID Proof to proceed. (Max 5MB)</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1565C0] mb-1">ID Proof (Aadhaar/PAN) <span className="text-red-500">*</span></label>
                  <label className="flex items-center gap-2 px-3 py-2 bg-white border border-blue-200 rounded cursor-pointer hover:bg-blue-50 transition-colors w-full">
                    <span className="bg-[#1565C0] text-white text-xs px-2 py-1 rounded shadow-sm shrink-0">Choose File</span>
                    <span className="text-sm text-gray-500 truncate">{applyIdProof ? applyIdProof.name : 'No file chosen'}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      required
                      onChange={e => setApplyIdProof(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1565C0] mb-1">Address Proof (Optional)</label>
                  <label className="flex items-center gap-2 px-3 py-2 bg-white border border-blue-200 rounded cursor-pointer hover:bg-blue-50 transition-colors w-full">
                    <span className="bg-gray-200 text-gray-700 font-medium text-xs px-2 py-1 rounded shadow-sm shrink-0">Choose File</span>
                    <span className="text-sm text-gray-500 truncate">{applyAddressProof ? applyAddressProof.name : 'No file chosen'}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={e => setApplyAddressProof(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1565C0] mb-1">Profile Photo (Optional)</label>
                  <label className="flex items-center gap-2 px-3 py-2 bg-white border border-blue-200 rounded cursor-pointer hover:bg-blue-50 transition-colors w-full">
                    <span className="bg-gray-200 text-gray-700 font-medium text-xs px-2 py-1 rounded shadow-sm shrink-0">Choose File</span>
                    <span className="text-sm text-gray-500 truncate">{applyProfilePhoto ? applyProfilePhoto.name : 'No file chosen'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => setApplyProfilePhoto(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
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
                disabled={isSubmitting || selectedUnits.length === 0 || !applyIdProof}
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
                          <span className="text-xs text-gray-400">{new Date(notice.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="font-bold text-gray-800 text-lg">{prop?.propertyTitle || 'Your Property'}</p>
                        <p className="text-sm text-gray-600 mt-1">Month: <strong>{notice.month}</strong> | Due: <strong>{notice.dueDate}</strong></p>
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
              <h3 className="text-2xl font-bold">Notifications {unreadCount > 0 && <span className="ml-2 text-sm font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{unreadCount} unread</span>}</h3>
              {unreadCount > 0 && <button onClick={markAllRead} className="text-sm text-[#4B5EAA] font-semibold hover:underline">Mark all as read</button>}
            </div>
            {myNotifications.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-[#EAEAEA]">
                <p className="text-lg text-gray-500">No notifications yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myNotifications.map(notif => (
                  <div key={notif.id} className={`p-4 rounded-2xl border flex items-start gap-4 transition-all ${notif.status === 'unread' ? 'bg-[#EEF2FF] border-[#C7D2FE]' : 'bg-white border-[#EAEAEA]'}`}>
                    <div className={`p-2 rounded-xl shrink-0 text-lg ${notif.type === 'payment' ? 'bg-green-100' : notif.type === 'notice' ? 'bg-blue-100' : notif.type === 'reminder' ? 'bg-orange-100' : notif.type === 'complaint' ? 'bg-purple-100' : 'bg-yellow-100'}`}>
                      {notif.type === 'payment' ? '₹' : notif.type === 'notice' ? '📋' : notif.type === 'reminder' ? '⏰' : notif.type === 'complaint' ? '🔧' : '🔔'}
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
        {/* ── Rent Records Tab ──────────────────────────────────────── */}
        {activeTab === 'rent-records' && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold">My Rent Status</h3>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
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
                <p className="text-2xl font-bold text-red-700">{myRentRecords.filter(r => r.status === 'late').length}</p>
              </div>
            </div>

            {myRentRecords.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-[#EAEAEA]">
                <p className="text-lg text-gray-500">No rent records yet. Your owner will generate them monthly.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="font-bold text-gray-700">All Rent Records</h4>
                <div className="bg-white rounded-2xl border border-[#EAEAEA] overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-[#EAEAEA]">
                          <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Month</th>
                          <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                          <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Due Date</th>
                          <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                          <th className="text-right p-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myRentRecords.map(rec => (
                          <tr key={rec.id} className="border-b border-[#EAEAEA] hover:bg-gray-50">
                            <td className="p-3 font-medium text-gray-800">{rec.month}</td>
                            <td className="p-3 font-bold text-[#4B5EAA]">₹{rec.rentAmount.toLocaleString('en-IN')}</td>
                            <td className="p-3 text-gray-600">{rec.dueDate}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${rec.status === 'paid' ? 'bg-green-100 text-green-700' : rec.status === 'late' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{rec.status}</span>
                            </td>
                            <td className="p-3 text-right">
                              {rec.status !== 'paid' && (
                                <Button 
                                  variant="primary" 
                                  className="!px-3 !py-1 !text-xs" 
                                  onClick={() => { 
                                    const prop = allProperties.find(p => p.id === rec.propertyId);
                                    setSelectedNotice({
                                      id: `record_${rec.id}`, // dummy id because we don't have a notice id
                                      tenantId: rec.tenantId,
                                      propertyId: rec.propertyId,
                                      ownerId: prop?.ownerId || '',
                                      month: rec.month,
                                      rentAmount: rec.rentAmount,
                                      dueDate: rec.dueDate,
                                      status: 'pending',
                                      message: 'Rent Record Payment',
                                      createdAt: new Date().toISOString()
                                    } as any); 
                                    setIsPayModalOpen(true); 
                                  }}
                                >
                                  Pay
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
                                <td className="p-3 text-gray-600">{new Date(pay.paymentDate).toLocaleDateString()}</td>
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
          const totalAmount = (selectedRequestToPay.totalRent || prop?.rentAmount || 0) + (selectedRequestToPay.depositAmount || prop?.securityDeposit || 0);
          return (
            <PaymentModal
              isOpen={isRequestPayModalOpen}
              onClose={() => { setIsRequestPayModalOpen(false); setSelectedRequestToPay(null); }}
              amount={totalAmount}
              month="Initial Security & Rent"
              onPaymentSuccess={(method, txId) => handlePayRequest(method, txId, totalAmount)}
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
