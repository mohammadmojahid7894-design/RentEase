import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, deleteDoc, writeBatch, updateDoc, addDoc } from 'firebase/firestore';
import { User, Property, InterestRequest } from '../types';
import { Icons } from '../constants';
import { Language } from '../translations';

interface AdminPanelProps {
  user: User;
  lang: Language;
  onLogout: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ user, lang, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'owners' | 'tenants' | 'properties' | 'requests' | 'settings'>('dashboard');
  const [loading, setLoading] = useState(true);

  // States for data
  const [users, setUsers] = useState<any[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [requests, setRequests] = useState<any[]>([]);

  // Property Filters
  const [propertyFilter, setPropertyFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [propertySearchToken, setPropertySearchToken] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const propsSnap = await getDocs(collection(db, 'properties'));
      const reqsSnap = await getDocs(collection(db, 'requests'));

      setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setProperties(propsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Property));
      setRequests(reqsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.error("Error fetching admin data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const owners = users.filter((u) => u.role === 'owner' || u.role === 'OWNER');
  const tenants = users.filter((u) => u.role === 'tenant' || u.role === 'TENANT');
  const occupiedProps = properties.filter(p => p.availabilityStatus === 'rented' || p.isOccupied === true);
  const vacantProps = properties.filter(p => p.availabilityStatus === 'available' || p.isOccupied === false);
  const pendingProps = properties.filter(p => p.status === 'pending');
  const approvedProps = properties.filter(p => p.status === 'approved' || (!p.status && p.isVisibleToTenants !== false));
  const rejectedProps = properties.filter(p => p.status === 'rejected');

  const handleApproveProperty = async (id: string) => {
    if (window.confirm("Approve this property? It will be visible to tenants.")) {
      try {
        const propToApprove = properties.find(p => p.id === id);
        
        await updateDoc(doc(db, 'properties', id), {
          status: 'approved',
          approvedAt: new Date().toISOString(),
          approvedBy: user.id,
          isVisibleToTenants: true
        });
        
        if (propToApprove?.ownerId) {
          await addDoc(collection(db, 'notifications'), {
            userId: propToApprove.ownerId,
            type: 'alert',
            message: `🎉 Great news! Your property "${propToApprove.propertyTitle || 'Listing'}" has been approved by the admin and is now visible to tenants.`,
            status: 'unread',
            createdAt: new Date().toISOString()
          });
        }
        
        setProperties(properties.map(p => p.id === id ? { ...p, status: 'approved', isVisibleToTenants: true } : p));
      } catch (err) {
         console.error(err);
         alert("Failed to approve property.");
      }
    }
  };

  const handleRejectProperty = async (id: string) => {
    const reason = window.prompt("Reason for rejection:");
    if (reason !== null) {
      if (reason.trim() === '') {
        alert("Rejection reason cannot be empty.");
        return;
      }
      try {
        const propToReject = properties.find(p => p.id === id);
        
        await updateDoc(doc(db, 'properties', id), {
          status: 'rejected',
          rejectedAt: new Date().toISOString(),
          rejectionReason: reason,
          isVisibleToTenants: false
        });
        
        if (propToReject?.ownerId) {
          await addDoc(collection(db, 'notifications'), {
            userId: propToReject.ownerId,
            type: 'alert',
            message: `⚠️ Your property "${propToReject.propertyTitle || 'Listing'}" has been rejected. Reason: ${reason}.`,
            status: 'unread',
            createdAt: new Date().toISOString()
          });
        }
        
        setProperties(properties.map(p => p.id === id ? { ...p, status: 'rejected', rejectionReason: reason, isVisibleToTenants: false } : p));
      } catch (err) {
         console.error(err);
         alert("Failed to reject property.");
      }
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      await deleteDoc(doc(db, 'users', id));
      setUsers(users.filter(u => u.id !== id));
    }
  };

  const handleDeleteProperty = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this property?")) {
      await deleteDoc(doc(db, 'properties', id));
      setProperties(properties.filter(p => p.id !== id));
    }
  };

  const handleClearDemoData = async () => {
    if (window.confirm("Are you sure you want to clear demo test accounts? This permanently deletes users with 'demo' or 'test' in their name.")) {
       setLoading(true);
       try {
         const testUsers = users.filter(u => 
           (u.name && u.name.toLowerCase().includes('test')) || 
           (u.name && u.name.toLowerCase().includes('demo'))
         );
         for (const tu of testUsers) {
           await deleteDoc(doc(db, 'users', tu.id));
         }
         setUsers(users.filter(u => !testUsers.find(tu => tu.id === u.id)));
         alert(`Cleared ${testUsers.length} test/demo accounts successfully.`);
       } catch (e) {
         console.error(e);
         alert("Failed to clear demo data");
       } finally {
         setLoading(false);
       }
    }
  };

  const renderDashboard = () => (
    <div className="animate-fadeIn">
      <h2 className="text-3xl font-extrabold text-gray-800 mb-6 drop-shadow-sm">Dashboard Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { title: "Total Users", val: users.length, icon: <Icons.Users />, color: "bg-blue-500" },
          { title: "Owners", val: owners.length, icon: <Icons.Home />, color: "bg-indigo-500" },
          { title: "Pending Prop.", val: pendingProps.length, icon: <Icons.Docs />, color: "bg-orange-500" },
          { title: "Approved Prop.", val: approvedProps.length, icon: <Icons.Home />, color: "bg-green-500" },
          { title: "Rejected Prop.", val: rejectedProps.length, icon: <Icons.Docs />, color: "bg-red-500" },
          { title: "Requests", val: requests.length, icon: <Icons.Docs />, color: "bg-pink-500" },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 hover:shadow-2xl transition-all hover:-translate-y-1 relative overflow-hidden group">
            <div className={`absolute -right-4 -top-4 w-24 h-24 ${stat.color} opacity-10 rounded-full group-hover:scale-150 transition-transform duration-500`}></div>
            <div className="flex justify-between items-center relative z-10">
              <div>
                <p className="text-gray-500 font-semibold mb-1">{stat.title}</p>
                <h3 className="text-4xl font-black text-gray-800 tracking-tight">{stat.val}</h3>
              </div>
              <div className={`w-14 h-14 rounded-2xl ${stat.color} text-white flex items-center justify-center shadow-lg`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderUsersTable = (title: string, userList: any[], isOwner: boolean) => (
    <div className="animate-fadeIn">
      <h2 className="text-3xl font-extrabold text-gray-800 mb-6 drop-shadow-sm">{title}</h2>
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-100 text-gray-500 uppercase tracking-wider text-sm">
              <th className="py-4 px-4 font-bold">System ID</th>
              <th className="py-4 px-4 font-bold">Name</th>
              <th className="py-4 px-4 font-bold">Phone</th>
              {isOwner && <th className="py-4 px-4 font-bold">Properties</th>}
              <th className="py-4 px-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {userList.map(u => (
              <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="py-4 px-4 font-mono text-sm text-gray-600 font-semibold">{u.systemId || u.userId || 'N/A'}</td>
                <td className="py-4 px-4 font-bold text-gray-800">{u.name}</td>
                <td className="py-4 px-4 text-gray-600">{u.phone}</td>
                {isOwner && <td className="py-4 px-4 text-indigo-600 font-bold">{properties.filter(p => p.ownerId === u.id || p.ownerId === u.userId).length}</td>}
                <td className="py-4 px-4 text-right">
                  <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 hover:text-red-700 font-semibold hover:bg-red-50 px-3 py-1 rounded-lg transition-colors">Delete</button>
                </td>
              </tr>
            ))}
            {userList.length === 0 && (
              <tr><td colSpan={isOwner ? 5 : 4} className="py-8 text-center text-gray-500">No data available.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPropertiesTable = () => {
    const filteredProps = properties.filter(p => {
      let statusMatch = true;
      if (propertyFilter === 'pending') statusMatch = p.status === 'pending';
      else if (propertyFilter === 'approved') statusMatch = p.status === 'approved' || (!p.status && p.isVisibleToTenants !== false);
      else if (propertyFilter === 'rejected') statusMatch = p.status === 'rejected';

      let searchMatch = true;
      if (propertySearchToken.trim()) {
        const token = propertySearchToken.toLowerCase();
        const owner = users.find(u => u.id === p.ownerId || u.userId === p.ownerId);
        const ownerName = owner?.name?.toLowerCase() || '';
        searchMatch = (p.propertyTitle || '').toLowerCase().includes(token) || 
                      (p.location || '').toLowerCase().includes(token) ||
                      ownerName.includes(token);
      }
      return statusMatch && searchMatch;
    });

    return (
      <div className="animate-fadeIn">
        <h2 className="text-3xl font-extrabold text-gray-800 mb-6 drop-shadow-sm">Manage Properties</h2>
        
        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row justify-between mb-4 gap-4">
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-full md:w-auto">
             {['all', 'pending', 'approved', 'rejected'].map(f => (
               <button 
                 key={f} 
                 onClick={() => setPropertyFilter(f as any)} 
                 className={`px-4 py-2 text-sm font-semibold rounded-md capitalize transition-colors ${propertyFilter === f ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-800'}`}
               >
                 {f}
               </button>
             ))}
          </div>
          <input 
             type="text" 
             placeholder="Search by title, location, owner..." 
             className="px-4 py-2 border border-gray-200 rounded-lg w-full md:w-72 focus:outline-none focus:ring-2 focus:ring-indigo-500"
             value={propertySearchToken}
             onChange={(e) => setPropertySearchToken(e.target.value)}
          />
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="border-b-2 border-gray-100 text-gray-500 uppercase tracking-wider text-sm">
                <th className="py-4 px-4 font-bold max-w-[200px]">Title & Location</th>
                <th className="py-4 px-4 font-bold">Owner & Contact</th>
                <th className="py-4 px-4 font-bold">Type/Units</th>
                <th className="py-4 px-4 font-bold">Status</th>
                <th className="py-4 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProps.map(p => {
                const owner = users.find(u => u.id === p.ownerId || u.userId === p.ownerId);
                const derivedStatus = p.status || (p.isVisibleToTenants === false ? 'pending' : 'approved');

                return (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-4 max-w-[200px]">
                    {p.images && p.images.length > 0 && <img src={p.images[0]} className="w-16 h-12 object-cover rounded shadow mb-2" alt="Property" />}
                    <p className="font-bold text-gray-800 truncate">{p.propertyTitle || p.name || 'Untitled'}</p>
                    <p className="text-xs text-gray-500 truncate">{p.location || 'Unknown location'}</p>
                  </td>
                  <td className="py-4 px-4">
                    <p className="font-bold text-gray-700">{owner?.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{owner?.phone || 'No phone'}</p>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-gray-600 text-xs font-semibold uppercase">{p.propertyType}</p>
                    <p className="text-gray-800 font-bold">{p.units?.length || 0} Units</p>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${derivedStatus === 'approved' ? 'bg-green-100 text-green-700' : derivedStatus === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                       {derivedStatus}
                    </span>
                    {derivedStatus === 'pending' && <p className="text-xs text-orange-500 mt-1 font-semibold">Needs Review</p>}
                  </td>
                  <td className="py-4 px-4 text-right space-x-2">
                    {derivedStatus === 'pending' && (
                      <div className="flex justify-end gap-2 mb-2">
                        <button onClick={() => handleApproveProperty(p.id)} className="bg-green-500 hover:bg-green-600 text-white font-semibold px-3 py-1 rounded-lg transition-colors text-xs whitespace-nowrap">Approve</button>
                        <button onClick={() => handleRejectProperty(p.id)} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-3 py-1 rounded-lg transition-colors text-xs whitespace-nowrap">Reject</button>
                      </div>
                    )}
                    <button onClick={() => handleDeleteProperty(p.id)} className="text-red-500 hover:text-red-700 font-semibold hover:bg-red-50 px-3 py-1 rounded-lg transition-colors text-xs whitespace-nowrap">Delete</button>
                  </td>
                </tr>
                );
              })}
              {filteredProps.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-gray-500">No properties found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderRequestsTable = () => (
    <div className="animate-fadeIn">
      <h2 className="text-3xl font-extrabold text-gray-800 mb-6 drop-shadow-sm">Tenant Requests</h2>
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-100 text-gray-500 uppercase tracking-wider text-sm">
              <th className="py-4 px-4 font-bold">Date</th>
              <th className="py-4 px-4 font-bold">Tenant ID</th>
              <th className="py-4 px-4 font-bold">Property ID</th>
              <th className="py-4 px-4 font-bold">Status</th>
              <th className="py-4 px-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(r => (
              <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="py-4 px-4 text-gray-600">{new Date(r.createdAt).toLocaleDateString()}</td>
                <td className="py-4 px-4 text-blue-600 font-mono text-sm">{r.tenantId}</td>
                <td className="py-4 px-4 text-purple-600 font-mono text-sm">{r.propertyId}</td>
                <td className="py-4 px-4">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-yellow-100 text-yellow-700">
                     {r.status}
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  <button onClick={async () => {
                     if (window.confirm("Delete request?")) {
                       await deleteDoc(doc(db, 'requests', r.id));
                       setRequests(requests.filter(req => req.id !== r.id));
                     }
                  }} className="text-red-500 hover:text-red-700 font-semibold hover:bg-red-50 px-3 py-1 rounded-lg transition-colors">Delete</button>
                </td>
              </tr>
            ))}
             {requests.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-gray-500">No requests available.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="animate-fadeIn">
      <h2 className="text-3xl font-extrabold text-gray-800 mb-6 drop-shadow-sm">Admin Controls</h2>
      <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
        <div className="max-w-xl">
           <h3 className="text-xl font-bold text-gray-800 mb-2">Danger Zone</h3>
           <p className="text-gray-500 mb-6">These actions affect the platform permanently.</p>
           
           <div className="space-y-4">
             <div className="flex justify-between items-center p-4 border border-red-200 rounded-2xl bg-red-50/50">
               <div>
                 <h4 className="font-bold text-red-800">Clear All Demo Data</h4>
                 <p className="text-sm text-red-600">Delete all test users and properties quickly.</p>
               </div>
               <button onClick={handleClearDemoData} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-xl shadow-lg shadow-red-200 transition-all">Clear Data</button>
             </div>
           </div>
        </div>
      </div>
    </div>
  );

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Icons.Home /> },
    { id: 'owners', label: 'Owners', icon: <Icons.Users /> },
    { id: 'tenants', label: 'Tenants', icon: <Icons.Users /> },
    { id: 'properties', label: 'Properties', icon: <Icons.Rent /> },
    { id: 'requests', label: 'Requests', icon: <Icons.Docs /> },
    { id: 'settings', label: 'Settings', icon: <Icons.Setup /> },
  ];

  return (
    <div className="min-h-screen bg-[#FDFCF9] font-sans flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#1E293B] text-white hidden md:flex flex-col shadow-2xl z-20 sticky top-0 h-screen">
         <div className="p-6 border-b border-gray-800 bg-[#0F172A]">
           <span className="font-extrabold text-2xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">AdminPanel</span>
         </div>
         <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto custom-scrollbar">
           {navItems.map(item => (
             <button
               key={item.id}
               onClick={() => setActiveTab(item.id as any)}
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium
                 ${activeTab === item.id 
                   ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/30 font-bold scale-[1.02]' 
                   : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
             >
               <div className={`transition-colors ${activeTab === item.id ? 'text-white' : 'text-gray-500'}`}>
                 {item.icon}
               </div>
               {item.label}
             </button>
           ))}
         </nav>
         <div className="p-4 border-t border-gray-800">
           <div className="bg-gray-800 rounded-xl p-4 mb-4 flex items-center gap-3">
             <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center font-bold shadow-inner">
               A
             </div>
             <div className="flex-1 overflow-hidden">
                <p className="font-bold text-sm truncate">{user.name}</p>
                <p className="text-xs text-gray-400 font-mono">ADMIN</p>
             </div>
           </div>
           <button onClick={onLogout} className="w-full bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white py-3 rounded-xl font-bold transition-all shadow border border-red-500/20">
             Logout
           </button>
         </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-screen bg-gray-50/50">
         {/* Mobile Header */}
         <header className="md:hidden bg-[#0F172A] p-4 text-white flex justify-between items-center shadow-lg sticky top-0 z-30">
           <span className="font-extrabold text-xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">AdminPanel</span>
           <button onClick={onLogout} className="bg-red-500 py-1 px-4 rounded-lg font-bold text-sm shadow">Logout</button>
         </header>

         {/* Mobile Nav Tabs */}
         <div className="md:hidden bg-[#1E293B] p-2 flex overflow-x-auto gap-2 shadow-inner border-b border-gray-800 custom-scrollbar sticky top-[60px] z-30">
           {navItems.map(item => (
             <button
               key={item.id}
               onClick={() => setActiveTab(item.id as any)}
               className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-semibold transition-colors
                 ${activeTab === item.id ? 'bg-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}
             >
               {item.label}
             </button>
           ))}
         </div>

         <div className="p-6 md:p-10 max-w-7xl mx-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full drop-shadow-md"></div>
              </div>
            ) : (
              <>
                {activeTab === 'dashboard' && renderDashboard()}
                {activeTab === 'owners' && renderUsersTable('Manage Owners', owners, true)}
                {activeTab === 'tenants' && renderUsersTable('Manage Tenants', tenants, false)}
                {activeTab === 'properties' && renderPropertiesTable()}
                {activeTab === 'requests' && renderRequestsTable()}
                {activeTab === 'settings' && renderSettings()}
              </>
            )}
         </div>
      </main>
    </div>
  );
};

export default AdminPanel;
