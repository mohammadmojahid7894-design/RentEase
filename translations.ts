
export type Language = 'en' | 'hi';

export const TRANSLATIONS = {
  en: {
    // General
    appTitle: "RentEase",
    tagline: "Simple Rental Management for India",
    welcome: "Welcome",
    loginOwner: "Owner Login / Register",
    loginTenant: "Tenant Login / Register",
    backToHome: "Back to Home",
    logout: "Logout",
    save: "Save",
    cancel: "Cancel",
    submit: "Submit",

    // Tabs
    tabDashboard: "Dashboard",
    tabProperties: "Properties",
    tabRent: "Rent",
    tabMore: "More",
    tabMyHome: "My Home",
    tabComplaints: "Complaints",
    tabExplore: "Explore",

    // Dashboard (Owner)
    totalIncome: "Total Income",
    thisMonth: "This Month",
    rentDue: "Rent Due",
    pendingTenants: "tenants pending",
    occupancyStatus: "Occupancy Status",
    occupiedOf: "occupied of",
    pendingPayments: "Pending Payments",
    viewAll: "View All",
    recentComplaints: "Recent Complaints",
    noComplaints: "No new complaints.",
    takeAction: "Take Action",
    remind: "Remind",
    reminderSent: "Sent",

    // Dashboard (Tenant)
    currentRentDue: "Current Rent Due",
    payNow: "Pay Now",
    paymentHistory: "Payment History",
    myComplaints: "My Complaints",
    raiseComplaint: "Raise Complaint",
    availableProperties: "Available for Rent",
    noPropertiesAvailable: "No properties available at the moment.",
    rentProperty: "Rent This",
    reminderAlert: "⚠️ Owner sent a payment reminder!",

    // Properties
    myProperties: "My Properties",
    addNew: "Add New",
    details: "Details",
    manageTenant: "Manage Tenant",
    addTenant: "Add Tenant",
    vacant: "Vacant",
    occupied: "Occupied",

    // Forms
    addPropertyTitle: "Add New Property",
    propertyName: "Property Name (e.g., Flat 101)",
    address: "Address",
    city: "City",
    rentAmount: "Rent Amount (₹)",
    propertyType: "Property Type",

    addTenantTitle: "Add Tenant",
    tenantName: "Tenant Name",
    tenantPhone: "Phone Number",

    raiseComplaintTitle: "Raise a Complaint",
    complaintTitle: "Issue Title (e.g., Leaking Tap)",
    complaintDesc: "Description",

    // Status
    statusPaid: "Paid",
    statusDue: "Due",
    statusOverdue: "Overdue",
    statusPartial: "Partial",
    statusResolved: "Resolved",
    statusInProgress: "In Progress",
    statusOpen: "Open",

    // More
    manageTenants: "Manage Tenants",
    utilityBills: "Utility Bills",
    documents: "Documents",
    profile: "Profile",
    settings: "Settings",
    helpSupport: "Help & Support",
    contactOwner: "Contact Owner",
    rentAgreement: "Rent Agreement",
    policeVerification: "Police Verification",
    download: "Download",
    notifications: "Notifications",
    darkMode: "Dark Mode",
    language: "Language",

    // Rent Info
    rentDetails: "Rent Details",
    tenantDetails: "Tenant Details",
    history: "Payment History",
    noHistory: "No payment history recorded.",
    occupant: "Current Occupant",
    contact: "Contact",
    monthlyRent: "Monthly Rent",
    dueDay: "Due Day",
    markPaid: "Mark as Paid",
    tenantInfo: "Tenant Information",
    propertyDetails: "Property Details",

    // Landing Page
    landingHeroTitle: "Manage your rentals with zero stress",
    landingHeroSubtitle: "The most trusted app for Indian landlords and tenants. Track payments, manage complaints, and find new homes.",
    featuresTitle: "Why Choose RentEase?",
    feature1Title: "Automated Rent Cycles",
    feature1Desc: "Never miss a due date. Automated reminders for tenants.",
    feature2Title: "Digital Agreements",
    feature2Desc: "Store police verification and rent agreements securely.",
    feature3Title: "Easy Complaints",
    feature3Desc: "Resolve maintenance issues faster with photo proof.",
    testimonialsTitle: "Trusted by 10,000+ Landlords",
    testi1: "Managing my 5 flats in Delhi was a headache. Now it's a breeze!",
    testi1Name: "Sharma Ji, Delhi",
    footerText: "Made with ❤️ in India",
    getStarted: "Get Started Free"
  },
  hi: {
    // General
    appTitle: "RentEase",
    tagline: "Bharat ka apna Rental Manager",
    welcome: "Swagat Hai",
    loginOwner: "Owner Login / Register",
    loginTenant: "Tenant Login / Register",
    backToHome: "Wapas Jayein",
    logout: "Bahar Niklein",
    save: "Save Karein",
    cancel: "Radd Karein",
    submit: "Bhejein",

    // Tabs
    tabDashboard: "Dashboard",
    tabProperties: "Makan",
    tabRent: "Kiraya",
    tabMore: "Aur",
    tabMyHome: "Mera Ghar",
    tabComplaints: "Shikayatein",
    tabExplore: "Dhoondhein",

    // Dashboard (Owner)
    totalIncome: "Kul Kamayi",
    thisMonth: "Is Mahine",
    rentDue: "Baaki Kiraya",
    pendingTenants: "log baaki hain",
    occupancyStatus: "Ghar ki Stithi",
    occupiedOf: "me se bhare hain",
    pendingPayments: "Kiska Paisa Baaki?",
    viewAll: "Sab Dekhein",
    recentComplaints: "Nayi Shikayatein",
    noComplaints: "Koi shikayat nahi hai.",
    takeAction: "Dekhein",
    remind: "Yaad Dilayein",
    reminderSent: "Bheja Gaya",

    // Dashboard (Tenant)
    currentRentDue: "Abhi ka Kiraya",
    payNow: "Abhi Bharein",
    paymentHistory: "Purana Hisaab",
    myComplaints: "Meri Shikayatein",
    raiseComplaint: "Shikayat Karein",
    availableProperties: "Kiraye ke liye uplabdh",
    noPropertiesAvailable: "Abhi koi ghar khaali nahi hai.",
    rentProperty: "Kiraye pe lein",
    reminderAlert: "⚠️ Malik ne kiraya maanga hai!",

    // Properties
    myProperties: "Mere Ghar",
    addNew: "Naya Jodein",
    details: "Jaankari",
    manageTenant: "Tenant Dekhein",
    addTenant: "Tenant Jodein",
    vacant: "Khaali Hai",
    occupied: "Bhara Hua",

    // Forms
    addPropertyTitle: "Naya Ghar Jodein",
    propertyName: "Ghar ka Naam (Jaise: Flat 101)",
    address: "Pata",
    city: "Shahar",
    rentAmount: "Kiraya (₹)",
    propertyType: "Ghar ka Prakaar",

    addTenantTitle: "Tenant Jodein",
    tenantName: "Tenant ka Naam",
    tenantPhone: "Phone Number",

    raiseComplaintTitle: "Shikayat Darj Karein",
    complaintTitle: "Kya Dikkat Hai? (Jaise: Nal Kharab)",
    complaintDesc: "Vistara mein batayein",

    // Status
    statusPaid: "Bhari Hui",
    statusDue: "Baaki Hai",
    statusOverdue: "Der Ho Gayi",
    statusPartial: "Adha Diya",
    statusResolved: "Theek Ho Gaya",
    statusInProgress: "Kaam Chalu",
    statusOpen: "Nayi Shikayat",

    // More
    manageTenants: "Tenants Sambhalein",
    utilityBills: "Bijli-Paani Bill",
    documents: "Kaagaz Patra",
    profile: "Profile",
    settings: "Settings",
    helpSupport: "Madad Chahiye?",
    contactOwner: "Malik se Sampark",
    rentAgreement: "Rent Agreement",
    policeVerification: "Police Verification",
    download: "Download",
    notifications: "Notifications",
    darkMode: "Dark Mode",
    language: "Bhasha",

    // Rent Info
    rentDetails: "Kiraya Vivaran",
    tenantDetails: "Kirayedar Ki Jaankari",
    history: "Purana Hisaab",
    noHistory: "Koi purana hisaab nahi mila.",
    occupant: "Abhi Kaun Rehta Hai",
    contact: "Sampark",
    monthlyRent: "Mahine Ka Kiraya",
    dueDay: "Kiraya Dene Ki Tareekh",
    markPaid: "Mark Paid",
    tenantInfo: "Tenant Ki Jaankari",
    propertyDetails: "Ghar Ki Details",

    // Landing Page
    landingHeroTitle: "Ab Kiraya Maangna Hua Aasaan",
    landingHeroSubtitle: "Bharat ka sabse bharosemand app. Hisaab rakhein, shikayat suljhayein, aur naye tenants dhundhein.",
    featuresTitle: "Kyun Chunein RentEase?",
    feature1Title: "Automatic Hisaab",
    feature1Desc: "Har mahine ka hisaab apne aap. Tenant ko automatic reminder.",
    feature2Title: "Digital Agreement",
    feature2Desc: "Rent agreement aur police verification safe rakhein.",
    feature3Title: "Aasaan Shikayatein",
    feature3Desc: "Tooti-footi cheezon ki photo upload karein aur jaldi theek karwayein.",
    testimonialsTitle: "10,000+ Landlords ka Bharosa",
    testi1: "Pehle rent lene mein sharam aati thi, ab app khud reminder bhej deta hai!",
    testi1Name: "Sharma Ji, Delhi",
    footerText: "Dil se banaya India ke liye ❤️",
    getStarted: "Shuru Karein"
  }
};
