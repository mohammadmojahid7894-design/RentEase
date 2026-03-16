import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc } from 'firebase/firestore';
import { User, UserRole } from '../types';
import { Icons } from '../constants';

interface AuthProps {
    initialMode?: 'login' | 'register';
    initialRole?: UserRole;
    onSuccess: (user: User) => void;
    onBack: () => void;
}

// ── System ID helpers ─────────────────────────────────────────────────────────
const generateSystemId = (role: UserRole): string => {
    let prefix = 'RE-TEN';
    if (role === UserRole.OWNER) prefix = 'RE-OWN';
    if (role === UserRole.ADMIN) prefix = 'RE-ADM';
    const digits = String(Math.floor(1000 + Math.random() * 9000)); // 1000-9999
    return `${prefix}-${digits}`;
};

/** Generates a unique systemId not already present in Firestore */
const createUniqueSystemId = async (role: UserRole): Promise<string> => {
    const usersRef = collection(db, 'users');
    for (let attempt = 0; attempt < 20; attempt++) {
        const candidate = generateSystemId(role);
        const snap = await getDocs(query(usersRef, where('systemId', '==', candidate)));
        if (snap.empty) return candidate;
    }
    // Fallback: extend to 6-digit to reduce collision risk
    let prefix = 'RE-TEN';
    if (role === UserRole.OWNER) prefix = 'RE-OWN';
    if (role === UserRole.ADMIN) prefix = 'RE-ADM';
    return `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
};

// ── Component ─────────────────────────────────────────────────────────────────
const Auth: React.FC<AuthProps> = ({ initialMode = 'login', initialRole = UserRole.TENANT, onSuccess, onBack }) => {
    const [mode, setMode] = useState<'login' | 'register'>(initialMode);
    const [role, setRole] = useState<UserRole>(initialRole);

    // Login fields
    const [identifier, setIdentifier] = useState(''); // systemId, phone, or userId
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Register fields
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [showRegPassword, setShowRegPassword] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Seed admin on mount if role is admin
    React.useEffect(() => {
        if (role === UserRole.ADMIN) {
            const seedAdmin = async () => {
                try {
                    const usersRef = collection(db, 'users');
                    const q = query(usersRef, where('role', '==', 'admin'));
                    const snap = await getDocs(q);
                    if (snap.empty) {
                        await addDoc(usersRef, {
                            name: 'Super Admin',
                            phone: '0000000000',
                            email: 'admin@rentease.com',
                            role: 'admin',
                            userId: 'U-ADMIN1234',
                            systemId: 'admin',
                            password: 'admin',
                            createdAt: new Date().toISOString()
                        });
                        console.log("Admin seeded successfully: 'admin' / 'admin'");
                    }
                } catch (e) {
                    console.error("Failed to seed admin:", e);
                }
            };
            seedAdmin();
        }
    }, [role]);

    // ── Login ─────────────────────────────────────────────────────────────────
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!password) {
            setError('Password is required.');
            setLoading(false);
            return;
        }

        try {
            const usersRef = collection(db, 'users');
            let foundUser: any = null;

            // Search by systemId (RE-OWN-XXXX / RE-TEN-XXXX)
            const q1 = query(usersRef, where('systemId', '==', identifier.toUpperCase()));
            const snap1 = await getDocs(q1);
            if (!snap1.empty) foundUser = snap1.docs[0].data();

            // Fallback: search by phone
            if (!foundUser) {
                const q2 = query(usersRef, where('phone', '==', identifier));
                const snap2 = await getDocs(q2);
                if (!snap2.empty) foundUser = snap2.docs[0].data();
            }

            // Fallback: search by legacy userId
            if (!foundUser) {
                const q3 = query(usersRef, where('userId', '==', identifier));
                const snap3 = await getDocs(q3);
                if (!snap3.empty) foundUser = snap3.docs[0].data();
            }

            if (!foundUser) {
                setError('No account found with this System ID, phone number, or User ID.');
                setLoading(false);
                return;
            }

            // Verify password
            if (foundUser.password && foundUser.password !== password) {
                setError('Incorrect password. Please try again.');
                setLoading(false);
                return;
            }

            // Role check
            let userRole: UserRole;
            if (foundUser.role === 'admin') userRole = UserRole.ADMIN;
            else if (foundUser.role === 'owner') userRole = UserRole.OWNER;
            else userRole = UserRole.TENANT;

            if (userRole !== role) {
                setError(`This account is registered as a ${foundUser.role}. Please select the correct role.`);
                setLoading(false);
                return;
            }

            const userObj: User = {
                id: foundUser.userId,
                systemId: foundUser.systemId,
                name: foundUser.name,
                phone: foundUser.phone,
                role: userRole,
                email: foundUser.email,
                profilePhoto: foundUser.profilePhoto || foundUser.documents?.profilePhotoUrl,
                aadhaarUrl: foundUser.aadhaarUrl || foundUser.documents?.aadhaarUrl,
                idProofUrl: foundUser.idProofUrl || foundUser.documents?.idProofUrl,
                documents: foundUser.documents
            };

            onSuccess(userObj);
        } catch (err: any) {
            console.error('Login Error:', err);
            setError('An error occurred during login. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── Register ──────────────────────────────────────────────────────────────
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!name.trim() || !phone.trim()) {
            setError('Name and Phone Number are required.');
            setLoading(false);
            return;
        }
        if (!regPassword || regPassword.length < 4) {
            setError('Password must be at least 4 characters.');
            setLoading(false);
            return;
        }
        if (regPassword !== confirmPassword) {
            setError('Passwords do not match.');
            setLoading(false);
            return;
        }

        try {
            const usersRef = collection(db, 'users');

            // Check if phone already registered
            const q = query(usersRef, where('phone', '==', phone));
            const snap = await getDocs(q);
            if (!snap.empty) {
                setError('An account with this phone number already exists.');
                setLoading(false);
                return;
            }

            const systemId = await createUniqueSystemId(role);
            const userId = `U-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

            const userData = {
                name,
                phone,
                email: email || null,
                role: role === UserRole.OWNER ? 'owner' : role === UserRole.ADMIN ? 'admin' : 'tenant',
                userId,
                systemId,
                password: regPassword,
                createdAt: new Date().toISOString(),
                smsSent: false,
                emailSent: false,
                notificationSentAt: null
            };

            const docRef = await addDoc(usersRef, userData);

            // Trigger Welcome API for SMS & Email
            let smsSuccess = false;
            let emailSuccess = false;
            try {
                const apiRes = await fetch('/api/sendWelcome', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: userData.name,
                        phone: userData.phone,
                        email: userData.email,
                        role: userData.role
                    })
                });
                
                if (apiRes.ok) {
                    const notifyData = await apiRes.json();
                    smsSuccess = notifyData.smsSent;
                    emailSuccess = notifyData.emailSent;
                }
            } catch (notifyErr) {
                console.error("Failed to trigger welcome notifications:", notifyErr);
            }

            // Update user document with notification status
            try {
                await updateDoc(docRef, {
                    smsSent: smsSuccess,
                    emailSent: emailSuccess,
                    notificationSentAt: new Date().toISOString()
                });
            } catch (updateErr) {
                console.error("Failed to update notification status in DB:", updateErr);
            }

            alert(
                `✅ Account created successfully!\n\n` +
                `Your System ID: ${systemId}\n\n` +
                `Use this ID + your password to login.\nPlease save it somewhere safe.\n\n` +
                `A confirmation SMS and email have been initiated.`
            );

            const userObj: User = {
                id: userId,
                systemId,
                name: userData.name,
                phone: userData.phone,
                role: userData.role === 'owner' ? UserRole.OWNER : userData.role === 'admin' ? UserRole.ADMIN : UserRole.TENANT,
                email: userData.email || undefined
            };

            onSuccess(userObj);
        } catch (err: any) {
            console.error('Registration Error:', err);
            setError('An error occurred during account creation. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#FDFCF9] flex flex-col font-sans">
            <nav className="p-6">
                <button onClick={onBack} className="flex items-center gap-2 text-[#4B5EAA] font-semibold hover:opacity-80 transition-opacity">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                    Back to Home
                </button>
            </nav>

            <div className="flex-1 flex items-center justify-center p-6">
                <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-[#EAEAEA] w-full max-w-md animate-fadeIn">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex bg-[#4B5EAA] p-3 rounded-2xl text-white shadow-lg shadow-indigo-200 mb-4">
                            <Icons.Home />
                        </div>
                        <h2 className="text-3xl font-bold text-[#2D3436]">
                            {role === UserRole.ADMIN ? 'Admin Login' : (mode === 'login' ? 'Welcome Back' : 'Create Account')}
                        </h2>
                        <p className="text-[#8E9491] mt-2">
                            {role === UserRole.ADMIN
                                ? 'Enter your Admin ID and password'
                                : (mode === 'login'
                                    ? 'Enter your System ID or Phone + Password'
                                    : 'Join us to manage your properties easily')}
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium mb-6 border border-red-100">
                            {error}
                        </div>
                    )}

                    {/* Role selector – shown on both modes for regular users, hidden for admin */}
                    {role !== UserRole.ADMIN && (
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <label className={`cursor-pointer border-2 rounded-xl p-4 text-center transition-all ${role === UserRole.OWNER ? 'border-[#4B5EAA] bg-[#EEF2FF] text-[#4B5EAA]' : 'border-[#EAEAEA] hover:border-gray-300 text-gray-500'}`}>
                                <input type="radio" className="hidden" name="role" checked={role === UserRole.OWNER} onChange={() => setRole(UserRole.OWNER)} />
                                <div className="text-xl mb-1">🏠</div>
                                <div className="font-bold text-sm">Owner</div>
                            </label>
                            <label className={`cursor-pointer border-2 rounded-xl p-4 text-center transition-all ${role === UserRole.TENANT ? 'border-[#4B5EAA] bg-[#EEF2FF] text-[#4B5EAA]' : 'border-[#EAEAEA] hover:border-gray-300 text-gray-500'}`}>
                                <input type="radio" className="hidden" name="role" checked={role === UserRole.TENANT} onChange={() => setRole(UserRole.TENANT)} />
                                <div className="text-xl mb-1">🔑</div>
                                <div className="font-bold text-sm">Tenant</div>
                            </label>
                        </div>
                    )}

                    {mode === 'login' ? (
                        <form onSubmit={handleLogin} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-[#2D3436] mb-2">System ID or Phone Number</label>
                                <input
                                    type="text"
                                    className="w-full border-2 border-[#EAEAEA] p-4 rounded-xl focus:outline-none focus:border-[#4B5EAA] transition-colors bg-[#FDFCF9] font-mono"
                                    placeholder={role === UserRole.ADMIN ? 'admin or RE-ADM-XXXX' : (role === UserRole.OWNER ? 'RE-OWN-XXXX or Phone' : 'RE-TEN-XXXX or Phone')}
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[#2D3436] mb-2">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="w-full border-2 border-[#EAEAEA] p-4 rounded-xl focus:outline-none focus:border-[#4B5EAA] transition-colors bg-[#FDFCF9] pr-12"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm font-medium">
                                        {showPassword ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#4B5EAA] text-white p-4 rounded-xl font-bold text-lg hover:bg-[#3D4D8C] transition-colors shadow-lg shadow-indigo-200 disabled:opacity-70 flex justify-center items-center gap-2"
                            >
                                {loading && <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>}
                                {loading ? 'Logging in…' : 'Login'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-[#2D3436] mb-2">Full Name</label>
                                <input
                                    type="text"
                                    className="w-full border-2 border-[#EAEAEA] p-4 rounded-xl focus:outline-none focus:border-[#4B5EAA] transition-colors bg-[#FDFCF9]"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[#2D3436] mb-2">Phone Number</label>
                                <input
                                    type="tel"
                                    className="w-full border-2 border-[#EAEAEA] p-4 rounded-xl focus:outline-none focus:border-[#4B5EAA] transition-colors bg-[#FDFCF9]"
                                    placeholder="9876543210"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[#2D3436] mb-2">Email (Optional)</label>
                                <input
                                    type="email"
                                    className="w-full border-2 border-[#EAEAEA] p-4 rounded-xl focus:outline-none focus:border-[#4B5EAA] transition-colors bg-[#FDFCF9]"
                                    placeholder="john@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[#2D3436] mb-2">Password</label>
                                <div className="relative">
                                    <input
                                        type={showRegPassword ? 'text' : 'password'}
                                        className="w-full border-2 border-[#EAEAEA] p-4 rounded-xl focus:outline-none focus:border-[#4B5EAA] transition-colors bg-[#FDFCF9] pr-12"
                                        placeholder="Min. 4 characters"
                                        value={regPassword}
                                        onChange={(e) => setRegPassword(e.target.value)}
                                        required
                                    />
                                    <button type="button" onClick={() => setShowRegPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm font-medium">
                                        {showRegPassword ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[#2D3436] mb-2">Confirm Password</label>
                                <input
                                    type="password"
                                    className="w-full border-2 border-[#EAEAEA] p-4 rounded-xl focus:outline-none focus:border-[#4B5EAA] transition-colors bg-[#FDFCF9]"
                                    placeholder="Re-enter password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>

                            {/* System ID preview */}
                            <div className="bg-[#EEF2FF] border border-[#C7D2FE] rounded-xl p-3 text-sm text-[#4B5EAA]">
                                <span className="font-semibold">Your System ID will look like: </span>
                                <span className="font-mono font-bold">{role === UserRole.OWNER ? 'RE-OWN-XXXX' : 'RE-TEN-XXXX'}</span>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#4B5EAA] text-white p-4 rounded-xl font-bold text-lg hover:bg-[#3D4D8C] transition-colors shadow-lg shadow-indigo-200 disabled:opacity-70 flex justify-center items-center gap-2"
                            >
                                {loading && <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>}
                                {loading ? 'Creating Account…' : 'Create Account'}
                            </button>
                        </form>
                    )}

                    {role !== UserRole.ADMIN && (
                        <div className="mt-8 text-center border-t border-[#EAEAEA] pt-6">
                            <p className="text-[#8E9491]">
                                {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                                <button
                                    type="button"
                                    onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                                    className="font-bold text-[#4B5EAA] hover:underline"
                                >
                                    {mode === 'login' ? 'Create Account' : 'Login here'}
                                </button>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Auth;
