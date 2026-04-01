import { Document, Packer, Paragraph, TextRun, AlignmentType, PageBreak, BorderStyle, TabStopPosition, TabStopType, HeadingLevel, TableCell, TableRow, Table, WidthType, ShadingType, Header, Footer, PageNumber, NumberFormat, ImageRun, HorizontalPositionRelativeFrom, HorizontalPositionAlign, VerticalPositionRelativeFrom, VerticalPositionAlign, TextWrappingType } from "docx";
import fs from "fs";
import sharp from "sharp";

const FONT_PREMIUM = "Century Gothic";
const NAVY = "1a253f";
const NAVY_LIGHT = "25355a";
const BLACK = "111111";

const bgGridSvg = `
<svg width="1190" height="1684" xmlns="http://www.w3.org/2000/svg">
    <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
        <rect width="100" height="100" fill="#ffffff"/>
        <rect width="50" height="50" fill="#f8fafc"/>
        <rect x="50" y="50" width="50" height="50" fill="#f8fafc"/>
        <path d="M0,50 L50,50 L50,100 M50,0 L50,50 L100,50" fill="none" stroke="#f1f5f9" stroke-width="1"/>
    </pattern>
    <rect width="1190" height="1684" fill="url(#grid)" />
</svg>
`;

const overlaySvg = `
<svg width="1190" height="1684" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <filter id="shadow">
            <feDropShadow dx="15" dy="15" stdDeviation="15" flood-color="#000000" flood-opacity="0.3"/>
        </filter>
        <filter id="lightShadow">
            <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#000000" flood-opacity="0.2"/>
        </filter>
    </defs>
    
    <!-- Left Black Polygon Area -->
    <polygon points="0,290 600,290 100,1090 0,1090" fill="#0f172a" />
    
    <!-- Arrows Pattern on the Black Polygon -->
    <g fill="#1e3a8a" transform="translate(50, 420)">
        <polygon points="0,0 20,10 0,20" />  <polygon points="25,0 45,10 25,20" />
        <polygon points="50,0 70,10 50,20" /> <polygon points="75,0 95,10 75,20" />
        <polygon points="100,0 120,10 100,20" /> <polygon points="125,0 145,10 125,20" />
        <polygon points="150,0 170,10 150,20" /> <polygon points="175,0 195,10 175,20" />
    </g>
    <g fill="#1e3a8a" transform="translate(50, 450)">
        <polygon points="0,0 20,10 0,20" />  <polygon points="25,0 45,10 25,20" />
        <polygon points="50,0 70,10 50,20" /> <polygon points="75,0 95,10 75,20" />
        <polygon points="100,0 120,10 100,20" /> <polygon points="125,0 145,10 125,20" />
        <polygon points="150,0 170,10 150,20" /> <polygon points="175,0 195,10 175,20" />
    </g>

    <!-- The Huge Navy Ribbon -->
    <polygon points="650,150 1050,150 250,1400 -150,1400" fill="#25355a" filter="url(#shadow)" />
    
    <!-- The Fold effect at the bottom left of the ribbon -->
    <polygon points="250,1400 350,1400 -150,1400" fill="#172554" />
    
    <!-- Small Bottom Right Arrows -->
    <g fill="#25355a" transform="translate(900, 1150)">
        <polygon points="0,0 20,10 0,20" />  <polygon points="25,0 45,10 25,20" />
        <polygon points="50,0 70,10 50,20" /> <polygon points="75,0 95,10 75,20" />
        <polygon points="100,0 120,10 100,20" /> <polygon points="125,0 145,10 125,20" />
        <polygon points="150,0 170,10 150,20" /> <polygon points="175,0 195,10 175,20" />
    </g>
    <g fill="#0f172a" transform="translate(900, 1180)">
        <polygon points="0,0 20,10 0,20" />  <polygon points="25,0 45,10 25,20" />
        <polygon points="50,0 70,10 50,20" /> <polygon points="75,0 95,10 75,20" />
        <polygon points="100,0 120,10 100,20" /> <polygon points="125,0 145,10 125,20" />
        <polygon points="150,0 170,10 150,20" /> <polygon points="175,0 195,10 175,20" />
    </g>

    <!-- Top Left Logo Vector Element -->
    <path d="M40,40 L120,40 L160,140 L120,140 L100,90 L80,140 L40,140 Z" fill="#25355a" filter="url(#lightShadow)" />
    <path d="M80,80 L140,40" stroke="#facc15" stroke-width="4"/>
</svg>
`;

let ILLUS_BUFFER = null;
try {
  ILLUS_BUFFER = fs.readFileSync("rentease_illustration.png");
} catch(e) { console.log("rentease_illustration.png not found") }

// Composite graphic using sharp
const resizedIllus = ILLUS_BUFFER ? 
  await sharp(ILLUS_BUFFER).resize({width: 790, height: 800, fit: 'cover'}).toBuffer() : 
  await sharp({create: {width: 790, height: 800, channels: 4, background: {r: 200, g: 200, b: 200, alpha: 1}}}).png().toBuffer();

const COVER_BG_BUFFER = await sharp(Buffer.from(bgGridSvg))
  .composite([
     { input: resizedIllus, top: 290, left: 400 },
     { input: Buffer.from(overlaySvg), top: 0, left: 0 }
  ])
  .png().toBuffer();

const covPara = (text, size, bold, color, tracking, spaceBf, spaceAf, indentLeft=0) => new Paragraph({
  alignment: AlignmentType.LEFT,
  indent: { left: indentLeft },
  spacing: { before: spaceBf || 0, after: spaceAf || 0 },
  children: [new TextRun({ text, size, font: FONT_PREMIUM, bold, color, tracking })]
});

// ─── HELPERS ────────────────────────────────────────────────────────────────
const FONT = "Times New Roman";
const BLUE = "1A3C6E";
const DARK = "1E1E1E";
const GRAY = "555555";

const br = () => new Paragraph({ spacing: { after: 120 } });
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

const heading = (text, level = 1) => new Paragraph({
  spacing: { before: level === 1 ? 400 : 280, after: 200 },
  alignment: AlignmentType.LEFT,
  children: [new TextRun({ text: text.toUpperCase(), bold: true, size: level === 1 ? 32 : 26, font: FONT, color: BLUE })]
});

const para = (text, opts = {}) => new Paragraph({
  spacing: { after: 160, line: 360 },
  alignment: opts.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
  indent: opts.noIndent ? {} : { firstLine: 720 },
  children: [new TextRun({ text, size: 24, font: FONT, color: DARK, bold: opts.bold || false, italics: opts.italic || false })]
});

const centerPara = (text, size = 24, bold = false, color = DARK) => new Paragraph({
  spacing: { after: 100 },
  alignment: AlignmentType.CENTER,
  children: [new TextRun({ text, size, font: FONT, bold, color })]
});

const bullet = (text) => new Paragraph({
  spacing: { after: 100, line: 360 },
  bullet: { level: 0 },
  children: [new TextRun({ text, size: 24, font: FONT, color: DARK })]
});

const signLine = (label) => new Paragraph({
  spacing: { before: 600, after: 40 },
  children: [new TextRun({ text: "________________________", size: 24, font: FONT })]
});

const signLabel = (text) => new Paragraph({
  spacing: { after: 200 },
  children: [new TextRun({ text, size: 22, font: FONT, color: GRAY })]
});

const codeBlock = (title, code) => [
  new Paragraph({ spacing: { before: 300, after: 100 }, children: [new TextRun({ text: title, bold: true, size: 24, font: FONT, color: BLUE })] }),
  new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "(Key snippet shown below)", size: 20, font: FONT, italics: true, color: GRAY })] }),
  ...code.split("\n").map(line => new Paragraph({
    spacing: { after: 20 },
    children: [new TextRun({ text: line || " ", size: 18, font: "Consolas", color: "2D2D2D" })]
  })),
  br()
];

const tocEntry = (num, title, page) => new Paragraph({
  spacing: { after: 80 },
  tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX, leader: "dot" }],
  children: [
    new TextRun({ text: `${num}. ${title}`, size: 24, font: FONT }),
    new TextRun({ text: `\t${page}`, size: 24, font: FONT })
  ]
});

// ─── FRONT PAGE ─────────────────────────────────────────────────────────────
function frontPage() {
  const elements = [
    new Paragraph({
      children: [
        new ImageRun({
          data: COVER_BG_BUFFER,
          transformation: { width: 794, height: 1123 }, // Exact A4 dimensions at 96 DPI
          floating: {
            horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, align: HorizontalPositionAlign.CENTER },
            verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, align: VerticalPositionAlign.CENTER },
            wrap: { type: TextWrappingType.NONE },
            behindDocument: true,
          }
        }),
      ]
    }),
    
    // Top Left Header next to logo visual element
    covPara("Your University Name", 26, false, NAVY, 0, 0, 0, 1000),
    covPara("DHARANIDHAR UNIVERSITY", 20, true, NAVY, 10, 0, 0, 1000),
    covPara("KEONJHAR, ODISHA", 16, false, NAVY_LIGHT, 10, 0, 0, 1000),
    
    // Push content exactly to the bottom white section
    covPara("PROJECT PROPOSAL", 30, true, NAVY_LIGHT, 20, 8500, 100, 0),
    covPara("RentEase", 90, true, NAVY, 0, 0, 100, 0),
    covPara("SMART RENTAL PROPERTY", 30, true, NAVY, 10, 0, 0, 0),
    covPara("MANAGEMENT SYSTEM", 30, true, NAVY, 10, 0, 500, 0),
    
    // Bottom Detail Grid structured beautifully
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 }, insideHorizontal: { style: BorderStyle.NONE, size: 0 }, insideVertical: { style: BorderStyle.NONE, size: 0 } },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              children: [
                covPara("DATE:", 22, true, NAVY, 10, 0, 60),
                covPara("15 April 2025", 22, false, BLACK, 0, 0, 0)
              ]
            }),
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              children: [
                covPara("SUBMITTED BY:", 22, true, NAVY, 10, 0, 60),
                covPara("Mohammad Mojahid", 24, true, BLACK, 0, 0, 40),
                covPara("Roll No: 2322DXXX", 20, false, BLACK, 0, 0, 30),
                covPara("Regd No: 17346/XX", 20, false, BLACK, 0, 0, 0)
              ]
            }),
            new TableCell({
              width: { size: 35, type: WidthType.PERCENTAGE },
              children: [
                covPara("GUIDE:", 22, true, NAVY, 10, 0, 60),
                covPara("Mr. Shubhashish Behera", 24, true, BLACK, 0, 0, 40),
                covPara("Dept. of Computer Science", 20, false, BLACK, 0, 0, 0)
              ]
            })
          ]
        })
      ]
    }),
    
    pageBreak()
  ];
  return elements;
}

// ─── DECLARATION ────────────────────────────────────────────────────────────
function declaration() {
  return [
    heading("Declaration"),
    para("I hereby declare that the project work entitled \"RentEase – Smart Rental Property Management System\" submitted to the Department of Computer Science is a record of original work done by me under the guidance of my project guide. This project has not been submitted for any other degree or diploma at any other institution or university.", { noIndent: true }),
    br(),
    para("The information and data given in this project report is authentic to the best of my knowledge. This project is not a joint effort but my individual work."),
    br(), br(), br(),
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 600 }, children: [new TextRun({ text: "Mohammad Mojahid", bold: true, size: 24, font: FONT })] }),
    new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "B.Sc Computer Science", size: 22, font: FONT, color: GRAY })] }),
    br(),
    new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: "Date: _______________", size: 22, font: FONT })] }),
    new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: "Place: _______________", size: 22, font: FONT })] }),
    pageBreak()
  ];
}

// ─── ACKNOWLEDGEMENT ────────────────────────────────────────────────────────
function acknowledgement() {
  return [
    heading("Acknowledgement"),
    para("I would like to express my sincere gratitude to my project guide for providing valuable guidance, constant encouragement, and support throughout the development of this project."),
    para("I am also thankful to the Head of the Department of Computer Science and all the faculty members who have directly or indirectly helped me in completing this project successfully."),
    para("I extend my heartfelt thanks to my family and friends for their continuous moral support and encouragement throughout the duration of this project."),
    para("Finally, I thank the Almighty for giving me the strength and wisdom to complete this project on time."),
    br(), br(),
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 400 }, children: [new TextRun({ text: "Mohammad Mojahid", bold: true, size: 24, font: FONT })] }),
    pageBreak()
  ];
}

// ─── CERTIFICATE ────────────────────────────────────────────────────────────
function certificate() {
  return [
    heading("Certificate"),
    br(),
    para("This is to certify that the project report entitled \"RentEase – Smart Rental Property Management System\" submitted by Mohammad Mojahid in partial fulfillment of the requirements for the award of the degree of Bachelor of Science in Computer Science is a bonafide record of work carried out under my supervision and guidance.", { noIndent: true }),
    para("This project has not been submitted for any other degree or diploma at any other institution or university."),
    br(), br(), br(),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({ text: "Project Guide", size: 24, font: FONT, bold: true }),
        new TextRun({ text: "\t\t\t\t\t\t\t", size: 24, font: FONT }),
        new TextRun({ text: "Head of Department", size: 24, font: FONT, bold: true })
      ]
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "________________________", size: 24, font: FONT }),
        new TextRun({ text: "\t\t\t\t\t", size: 24, font: FONT }),
        new TextRun({ text: "________________________", size: 24, font: FONT })
      ]
    }),
    br(),
    new Paragraph({ children: [new TextRun({ text: "Date: _______________", size: 22, font: FONT })] }),
    new Paragraph({ children: [new TextRun({ text: "College Seal:", size: 22, font: FONT })] }),
    pageBreak()
  ];
}

// ─── ABSTRACT ───────────────────────────────────────────────────────────────
function abstract() {
  return [
    heading("Abstract"),
    para("RentEase is a comprehensive web-based rental property management system designed to streamline interactions between property owners and tenants. Built using modern web technologies, the platform addresses the challenges of traditional rental management by providing a digital solution that facilitates property listing, tenant onboarding, rent tracking, payment processing, and real-time communication."),
    para("The system employs a role-based architecture supporting three user types: Owners, Tenants, and Administrators. Owners can list properties with multiple units, manage tenant assignments, generate rent notices, track payments, and handle maintenance complaints. Tenants can browse available properties with location-based search, submit interest requests with document verification, make online rent payments via UPI, card, net banking, or cheque, and raise complaints."),
    para("The application is built with React.js and TypeScript for the frontend, Firebase Firestore for real-time NoSQL database operations, Cloudinary for cloud-based image and document storage, and is deployed on Vercel for serverless hosting. The notification system integrates Twilio for SMS alerts and Resend for email communications upon user registration."),
    para("Key features include automated rent cycle management with overdue tracking and late fee calculation, a secure payment gateway with QR code generation, real-time data synchronization using Firestore onSnapshot listeners, multi-language support (English and Hindi), and a comprehensive admin panel for system-wide oversight."),
    pageBreak()
  ];
}

// ─── TABLE OF CONTENTS ─────────────────────────────────────────────────────
function tableOfContents() {
  const entries = [
    ["1", "Introduction", "1"], ["2", "Objective", "3"], ["3", "System Analysis", "4"],
    ["4", "Feasibility Study", "6"], ["5", "Planning and Scheduling", "8"],
    ["6", "System Requirement Specification", "9"], ["7", "Literature Survey", "11"],
    ["8", "System Design", "13"], ["9", "Implementation", "16"],
    ["10", "Important Code Sections", "20"], ["11", "Input and Output Design", "28"],
    ["12", "Testing and Implementation", "30"], ["13", "Maintenance and Evaluation", "32"],
    ["14", "Cost-Benefit Analysis", "34"], ["15", "Conclusion", "36"],
    ["16", "Bibliography", "37"]
  ];
  return [
    heading("Table of Contents"),
    br(),
    ...entries.map(([n, t, p]) => tocEntry(n, t, p)),
    pageBreak()
  ];
}

// ─── CHAPTERS ───────────────────────────────────────────────────────────────
function introduction() {
  return [
    heading("Chapter 1: Introduction"),
    heading("1.1 Background", 2),
    para("In India, the rental housing market is vast and growing rapidly, with millions of tenants and property owners engaging in rental agreements every year. However, the traditional rental management process remains largely manual and fragmented. Landlords typically rely on handwritten receipts, phone calls, and in-person meetings to manage their properties, collect rent, and communicate with tenants. This approach is not only time-consuming but also prone to disputes, miscommunication, and financial discrepancies."),
    heading("1.2 Problem Statement", 2),
    para("The existing rental management systems in India suffer from several critical issues:"),
    bullet("Lack of a centralized platform for property listing and tenant discovery"),
    bullet("Manual rent collection leading to delayed payments and tracking difficulties"),
    bullet("No standardized process for tenant verification and onboarding"),
    bullet("Absence of automated notifications for rent due dates and overdue payments"),
    bullet("Difficulty in maintaining transparent financial records for both parties"),
    bullet("No digital complaint management system for maintenance requests"),
    heading("1.3 Proposed Solution", 2),
    para("RentEase addresses these challenges by providing a comprehensive, cloud-based rental property management platform. The system digitizes the entire rental lifecycle — from property listing and tenant discovery to payment processing and complaint resolution — creating a transparent, efficient, and user-friendly experience for all stakeholders."),
    pageBreak()
  ];
}

function objective() {
  return [
    heading("Chapter 2: Objective"),
    para("The primary objectives of the RentEase system are:"),
    bullet("To design and develop a user-friendly web application for seamless rental property management accessible from any device with an internet connection."),
    bullet("To facilitate easy property listing with multi-unit support, enabling owners to manage apartments, flats, PGs, and independent houses under a single platform."),
    bullet("To enable efficient tenant-owner communication through a structured request-approval workflow with document verification."),
    bullet("To implement a comprehensive payment tracking system supporting multiple payment methods including UPI, credit/debit cards, net banking, and cheque payments."),
    bullet("To provide automated rent cycle management with overdue tracking, late fee calculation, and timely notification reminders."),
    bullet("To integrate SMS and email notification systems for welcoming new users and alerting them about important activities."),
    bullet("To develop a robust admin panel for system-wide oversight, property approval management, and user administration."),
    bullet("To implement real-time data synchronization ensuring all stakeholders see up-to-date information without manual page refreshes."),
    bullet("To support multi-language functionality (English and Hindi) making the platform accessible to a wider user base across India."),
    pageBreak()
  ];
}

function systemAnalysis() {
  return [
    heading("Chapter 3: System Analysis"),
    heading("3.1 Existing System", 2),
    para("The current rental management landscape in India predominantly relies on manual processes. Landlords advertise their properties through local brokers, newspaper classifieds, or word-of-mouth. Rent is collected in cash, and receipts are maintained in physical registers. Tenant verification involves manual checking of documents without any standardized process. Communication between owners and tenants happens through phone calls or in-person meetings, leading to lack of documented records."),
    para("Key drawbacks of the existing system include:"),
    bullet("No centralized database for property and tenant information"),
    bullet("Prone to human errors in financial calculations"),
    bullet("Lack of transparency in payment histories"),
    bullet("Time-consuming manual processes for every operation"),
    bullet("No automated reminder system for rent due dates"),
    heading("3.2 Proposed System", 2),
    para("RentEase proposes a fully digital, cloud-based solution that automates the entire rental management workflow. The system architecture follows a component-based design using React.js, with Firebase Firestore providing a real-time NoSQL database backend. Key advantages of the proposed system include:"),
    bullet("Centralized cloud database accessible from anywhere with real-time synchronization"),
    bullet("Automated rent cycle management with overdue detection and late fee calculation"),
    bullet("Multiple payment gateway options with QR code-based UPI payments"),
    bullet("Role-based access control for Owners, Tenants, and Administrators"),
    bullet("Automated SMS and email notifications for important events"),
    bullet("Cloud-based document storage using Cloudinary for tenant verification"),
    bullet("Responsive UI design working seamlessly across desktop and mobile devices"),
    pageBreak()
  ];
}

function feasibility() {
  return [
    heading("Chapter 4: Feasibility Study"),
    heading("4.1 Economic Feasibility", 2),
    para("The development cost of RentEase is minimal as it utilizes open-source technologies and free-tier cloud services. Firebase provides a generous free tier (Spark plan) offering 1 GiB of Firestore storage, 50K reads/day, and 20K writes/day. Cloudinary offers 25GB of storage and 25GB bandwidth on the free tier. Vercel provides free deployment with automatic SSL and CDN. The only potential costs arise when scaling beyond free-tier limits, making the project highly economically feasible for development and initial deployment."),
    heading("4.2 Technical Feasibility", 2),
    para("The system is technically feasible as it leverages well-established, production-ready technologies:"),
    bullet("React.js 19 – A mature, well-documented UI library with a large ecosystem"),
    bullet("TypeScript – Provides type safety and better developer experience"),
    bullet("Firebase Firestore – Scalable NoSQL database with real-time listeners"),
    bullet("Cloudinary – Industry-standard media management service"),
    bullet("Vercel – Enterprise-grade serverless platform with edge network"),
    bullet("Twilio – Reliable SMS communication service with global reach"),
    bullet("Resend – Modern email delivery API with high deliverability"),
    heading("4.3 Operational Feasibility", 2),
    para("RentEase is designed with a focus on usability and accessibility. The intuitive user interface requires minimal training for both property owners and tenants. The responsive design ensures the platform works seamlessly on smartphones, tablets, and desktop computers. Multi-language support (English and Hindi) further enhances accessibility. The system can be adopted by individual landlords, property management companies, and housing societies with equal ease."),
    pageBreak()
  ];
}

function requirements() {
  return [
    heading("Chapter 5: System Requirement Specification"),
    heading("5.1 Hardware Requirements", 2),
    bullet("Processor: Intel Core i3 or equivalent (minimum)"),
    bullet("RAM: 4 GB (minimum), 8 GB (recommended)"),
    bullet("Storage: 256 GB SSD or higher"),
    bullet("Display: 1366 × 768 resolution or higher"),
    bullet("Internet: Broadband connection with minimum 1 Mbps speed"),
    bullet("Mobile: Any smartphone with a modern web browser"),
    heading("5.2 Software Requirements", 2),
    bullet("Operating System: Windows 10/11, macOS, or Linux"),
    bullet("Browser: Google Chrome 90+, Firefox 88+, Safari 14+, or Microsoft Edge 90+"),
    bullet("Node.js: Version 18 or higher (for development)"),
    bullet("npm: Version 9 or higher (package manager)"),
    heading("5.3 Technology Stack", 2),
    bullet("Frontend: React.js 19 with TypeScript"),
    bullet("Build Tool: Vite 6 (fast HMR and build)"),
    bullet("Database: Firebase Firestore (NoSQL, real-time)"),
    bullet("Authentication: Custom authentication with Firestore"),
    bullet("File Storage: Cloudinary (cloud-based image/document management)"),
    bullet("SMS Notifications: Twilio API"),
    bullet("Email Notifications: Resend API"),
    bullet("Deployment: Vercel (serverless)"),
    bullet("Styling: Tailwind CSS (utility-first CSS framework)"),
    bullet("QR Code: qrcode.react library for UPI payment QR generation"),
    pageBreak()
  ];
}

function systemDesign() {
  return [
    heading("Chapter 6: System Design"),
    heading("6.1 Use Case Diagram", 2),
    para("The RentEase system involves three primary actors: Owner, Tenant, and Admin. Each actor interacts with the system through specific use cases:"),
    para("Owner Use Cases:", { bold: true, noIndent: true }),
    bullet("Register/Login to the system"),
    bullet("Add, edit, and delete properties with multiple units"),
    bullet("View and manage tenant interest requests (approve/reject)"),
    bullet("Generate rent notices and rent records"),
    bullet("Track payments and financial summaries"),
    bullet("Handle tenant complaints"),
    bullet("Send notifications to tenants"),
    para("Tenant Use Cases:", { bold: true, noIndent: true }),
    bullet("Register/Login to the system"),
    bullet("Browse available properties with search and filters"),
    bullet("Submit interest requests with document uploads"),
    bullet("Make rent payments through multiple methods"),
    bullet("View rent records and payment history"),
    bullet("Raise maintenance complaints"),
    para("Admin Use Cases:", { bold: true, noIndent: true }),
    bullet("Login with admin credentials"),
    bullet("Approve or reject property listings"),
    bullet("View all owners, tenants, and properties"),
    bullet("Monitor system-wide statistics"),
    heading("6.2 ER Diagram Description", 2),
    para("The database schema consists of the following primary entities: Users (owners, tenants, admins), Properties (with embedded units array), Requests, Rent Records, Rent Payments, Notices, Notifications, Complaints, and Tenants (manually added). Relationships are maintained through reference IDs (ownerId, tenantId, propertyId) across collections."),
    heading("6.3 Data Flow Diagram (Level 0)", 2),
    para("At the highest level, the system receives inputs from three actors (Owner, Tenant, Admin), processes them through the RentEase application logic, interacts with Firebase Firestore for data persistence, Cloudinary for file storage, and Twilio/Resend for notifications, and returns appropriate responses to each actor through the React.js frontend."),
    pageBreak()
  ];
}

function implementation() {
  return [
    heading("Chapter 7: Implementation"),
    heading("7.1 Login & Registration System", 2),
    para("RentEase implements a custom authentication system using Firebase Firestore. Each user is assigned a unique System ID (e.g., RE-OWN-XXXX for owners, RE-TEN-XXXX for tenants) upon registration. Users can login using their System ID, phone number, or legacy User ID along with their password. The system supports role-based access (Owner, Tenant, Admin) with automatic role verification during login."),
    heading("7.2 Property Management", 2),
    para("Owners can add properties with detailed information including title, location, type, rent amount, security deposit, and description. Each property can contain multiple units (e.g., rooms, flats) with individual configurations. Property images are uploaded to Cloudinary. New properties require admin approval before becoming visible to tenants."),
    heading("7.3 Request & Approval Workflow", 2),
    para("Tenants can browse approved properties, view vacant units, and submit interest requests with required documents (ID proof, address proof, profile photo). Owners receive these requests and can approve or reject them. Approved requests require the tenant to make security deposit payment within 24 hours, after which the selected units are automatically assigned to the tenant."),
    heading("7.4 Payment System", 2),
    para("The payment module supports four methods: UPI (with QR code generation via qrcode.react), Credit/Debit Card, Net Banking, and Cheque. Payments are recorded in the rent_payments collection and automatically synchronize rent records and notices. The system generates transaction IDs and provides animated payment success confirmations."),
    heading("7.5 Notification System", 2),
    para("RentEase implements two notification layers: in-app notifications stored in Firestore with real-time listeners, and external notifications via Twilio (SMS) and Resend (email). In-app notifications alert users about new requests, payments, complaints, and rent notices. The welcome notification system sends SMS and email upon user registration via a Vercel serverless function."),
    heading("7.6 Rent Cycle Management", 2),
    para("The system includes automated rent cycle management that generates monthly rent records, tracks overdue payments with configurable grace periods, calculates late fees based on days overdue, and automatically creates next-cycle records upon payment completion. Reminder notifications are sent at 5 days, 2 days, and on the due date."),
    pageBreak()
  ];
}

function codeSection() {
  return [
    heading("Chapter 8: Important Code Sections"),
    ...codeBlock("8.1 Firebase Configuration (firebase.ts)", `import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyBB1qTEYx...",
    authDomain: "ghar-ka-system.firebaseapp.com",
    projectId: "ghar-ka-system",
    storageBucket: "ghar-ka-system.firebasestorage.app",
    messagingSenderId: "941070969721",
    appId: "1:941070969721:web:..."
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);`),
    para("This module initializes Firebase with project configuration and exports the Firestore database and authentication instances used throughout the application."),

    ...codeBlock("8.2 Authentication – Login Handler (Auth.tsx)", `const handleLogin = async (e) => {
  e.preventDefault();
  const usersRef = collection(db, 'users');
  // Search by systemId
  const q1 = query(usersRef, where('systemId', '==',
    identifier.toUpperCase()));
  const snap1 = await getDocs(q1);
  if (!snap1.empty) foundUser = snap1.docs[0].data();
  // Fallback: search by phone
  if (!foundUser) {
    const q2 = query(usersRef, where('phone', '==', identifier));
    const snap2 = await getDocs(q2);
    if (!snap2.empty) foundUser = snap2.docs[0].data();
  }
  // Verify password and role
  if (foundUser.password !== password) {
    setError('Incorrect password.');
    return;
  }
  onSuccess(userObj);
};`),
    para("The login handler searches Firestore for users by System ID first, then falls back to phone number. It verifies the password and ensures the selected role matches the user's registered role before granting access."),

    ...codeBlock("8.3 Property Addition (OwnerPanel.tsx)", `const handleAddPropertySubmit = async (e) => {
  e.preventDefault();
  let imageUrls = [];
  if (newPropertyImages.length > 0) {
    imageUrls = await Promise.all(
      newPropertyImages.map(file => uploadImage(file))
    );
  }
  const propData = {
    ownerId: user.id,
    propertyTitle: newProperty.propertyTitle,
    location: newProperty.location,
    rentAmount: Number(newProperty.rentAmount),
    status: 'pending',
    images: imageUrls,
    units: newProperty.units.map(u => ({
      ...u, rentAmount: Number(u.rentAmount)
    }))
  };
  await addDoc(collection(db, 'properties'), propData);
};`),
    para("This function handles property creation. Images are uploaded to Cloudinary in parallel, and the property data with unit configurations is stored in Firestore with a 'pending' status awaiting admin approval."),

    ...codeBlock("8.4 Tenant Request Submission (TenantPanel.tsx)", `const handleSubmitRequest = async (e) => {
  e.preventDefault();
  await addDoc(collection(db, 'requests'), {
    tenantId: user.id,
    propertyId: selectedProperty.id,
    selectedUnits: selectedUnits.map(u => u.unitId),
    totalRent: totalSelectedRent,
    depositAmount: selectedProperty.securityDeposit || 0,
    idProofUrl: applyIdProofUrl,
    status: 'pending',
    createdAt: new Date().toISOString()
  });
};`),
    para("Tenants submit interest requests by selecting vacant units in a property. The request includes document URLs, selected unit IDs, and calculated rent, and is stored with 'pending' status for owner review."),

    ...codeBlock("8.5 Rent Payment Handler (TenantPanel.tsx)", `const handlePayRent = async (method, transactionId) => {
  // Update notice status
  await updateDoc(doc(db, 'notices', noticeId),
    { status: 'paid' });
  // Update rent record status
  await updateDoc(doc(db, 'rentRecords', recordId), {
    status: 'paid',
    paymentDate: new Date().toISOString()
  });
  // Save payment record
  await addDoc(collection(db, 'rent_payments'), {
    tenantId: user.id, amount: notice.rentAmount,
    paymentMethod: method, transactionId,
    status: 'completed',
    createdAt: new Date().toISOString()
  });
  // Notify owner
  await addDoc(collection(db, 'notifications'), {
    userId: notice.ownerId, type: 'payment',
    message: 'Tenant paid rent successfully.',
    status: 'unread'
  });
};`),
    para("The payment handler synchronizes three collections — notices, rentRecords, and rent_payments — to ensure financial data consistency across both Owner and Tenant panels. It also triggers in-app notifications for both parties."),

    ...codeBlock("8.6 Cloudinary Image Upload (cloudinary.ts)", `export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "rentease_upload");
  const res = await fetch(
    "https://api.cloudinary.com/v1_1/do0h1yf1h/image/upload",
    { method: "POST", body: formData }
  );
  const data = await res.json();
  return data.secure_url || data.url;
};`),
    para("The Cloudinary upload function uses an unsigned upload preset for client-side image uploads. It returns the secure HTTPS URL of the uploaded image which is then stored in Firestore document references."),
    pageBreak()
  ];
}

function inputOutput() {
  return [
    heading("Chapter 9: Input and Output Design"),
    heading("9.1 Input Design", 2),
    para("The system accepts various forms of input from users:"),
    para("Registration Form:", { bold: true, noIndent: true }),
    bullet("Full Name, Phone Number, Email (optional), Password, Role Selection (Owner/Tenant)"),
    para("Property Addition Form:", { bold: true, noIndent: true }),
    bullet("Property Title, Location, Rent Amount, Security Deposit, Description, Property Type, Unit configurations (name, room size, rent), Property images"),
    para("Tenant Request Form:", { bold: true, noIndent: true }),
    bullet("Unit selection, ID Proof upload, Address Proof upload, Profile Photo upload"),
    para("Payment Form:", { bold: true, noIndent: true }),
    bullet("Payment method selection (UPI/Card/Net Banking/Cheque), Card details or cheque number as applicable"),
    para("Complaint Form:", { bold: true, noIndent: true }),
    bullet("Complaint title, Description, Priority level, Property and unit selection"),
    heading("9.2 Output Design", 2),
    para("The system provides the following output interfaces:"),
    bullet("Owner Dashboard: Property statistics cards (total properties, units, occupied, vacant), financial summary with total rent, paid, pending, and overdue amounts"),
    bullet("Tenant Dashboard: Browse properties with filters, request status tracking, rent records with payment status, payment history with transaction details"),
    bullet("Admin Dashboard: System-wide statistics, user management tables, property approval queue"),
    bullet("Payment Success: Animated confirmation with transaction ID, amount, and method details"),
    bullet("Notifications: Real-time in-app notification panel with unread count badges"),
    pageBreak()
  ];
}

function testing() {
  return [
    heading("Chapter 10: Testing and Implementation"),
    heading("10.1 Testing Methodology", 2),
    para("The testing of RentEase was conducted using a combination of manual testing and output verification to ensure all features function correctly across different scenarios."),
    heading("10.2 Unit Testing", 2),
    para("Individual components and functions were tested in isolation:"),
    bullet("Authentication: Tested login with valid/invalid System IDs, phone numbers, and passwords"),
    bullet("Property Addition: Verified data validation, image upload, and Firestore document creation"),
    bullet("Payment Processing: Tested all payment methods and verified data synchronization across collections"),
    bullet("Notification System: Verified SMS and email delivery through Twilio and Resend APIs"),
    heading("10.3 Integration Testing", 2),
    para("End-to-end workflows were tested to verify seamless interaction between modules:"),
    bullet("Complete tenant onboarding flow: Registration → Browse → Request → Approval → Payment → Assignment"),
    bullet("Rent cycle flow: Notice Generation → Rent Record Creation → Payment → Auto-Next-Cycle Generation"),
    bullet("Complaint lifecycle: Raise → Owner Review → In Progress → Resolved"),
    heading("10.4 Output Verification", 2),
    para("All data output was verified against expected values:"),
    bullet("Financial calculations accuracy for rent totals, pending amounts, and late fees"),
    bullet("Real-time data updates using Firestore onSnapshot listeners verified across multiple browser sessions"),
    bullet("Responsive UI rendering tested on Chrome, Firefox, Edge, and mobile browsers"),
    pageBreak()
  ];
}

function maintenance() {
  return [
    heading("Chapter 11: Maintenance and Evaluation"),
    heading("11.1 Maintenance Plan", 2),
    para("The RentEase system is designed for easy maintenance and extensibility:"),
    bullet("Corrective Maintenance: Bug fixes and error handling improvements based on user feedback"),
    bullet("Adaptive Maintenance: Updates to accommodate changes in Firebase SDK, React library updates, and third-party API changes"),
    bullet("Perfective Maintenance: Performance optimizations, UI enhancements, and new feature additions based on user requirements"),
    bullet("Preventive Maintenance: Regular security audits, dependency updates, and database indexing optimizations"),
    heading("11.2 Evaluation Criteria", 2),
    bullet("System Performance: Page load times under 2 seconds, real-time data sync within 500ms"),
    bullet("User Satisfaction: Intuitive UI requiring no formal training"),
    bullet("Data Integrity: Zero data loss with Firestore's built-in redundancy"),
    bullet("Scalability: Ability to handle growing number of users and properties through Firebase's auto-scaling"),
    pageBreak()
  ];
}

function costBenefit() {
  return [
    heading("Chapter 12: Cost-Benefit Analysis"),
    heading("12.1 Development Cost", 2),
    bullet("Hardware: Existing laptop/computer – ₹0 additional cost"),
    bullet("Software: All open-source/free-tier tools – ₹0"),
    bullet("Firebase Spark Plan (Free): 1 GiB storage, 50K reads/day – ₹0"),
    bullet("Cloudinary Free Tier: 25 GB storage – ₹0"),
    bullet("Vercel Free Plan: Unlimited deployments – ₹0"),
    bullet("Domain Name (optional): ₹500-1000/year"),
    bullet("Total Estimated Development Cost: ₹0 - ₹1,000"),
    heading("12.2 Benefits", 2),
    bullet("Eliminates manual rent tracking saving 5-10 hours per month for property owners"),
    bullet("Reduces payment disputes through transparent digital records"),
    bullet("Automated notifications reduce late payments by an estimated 40-60%"),
    bullet("Centralized platform reduces communication overhead significantly"),
    bullet("Digital document storage eliminates paper-based record keeping"),
    bullet("Real-time access from anywhere enables remote property management"),
    pageBreak()
  ];
}

function conclusion() {
  return [
    heading("Chapter 13: Conclusion"),
    para("RentEase – Smart Rental Property Management System has been successfully designed, developed, and implemented as a comprehensive solution for modernizing rental property management in India. The system effectively addresses the pain points of traditional manual rental management by providing a digital platform that streamlines property listing, tenant onboarding, payment tracking, and communication."),
    para("The project demonstrates the practical application of modern web development technologies including React.js, TypeScript, Firebase Firestore, Cloudinary, and serverless deployment on Vercel. The real-time synchronization capabilities of Firestore ensure that all stakeholders have access to up-to-date information, while the multi-payment gateway provides flexibility and convenience for rent payments."),
    para("Key achievements of this project include:"),
    bullet("A fully functional role-based web application with Owner, Tenant, and Admin panels"),
    bullet("Automated rent cycle management with overdue tracking and late fee calculation"),
    bullet("Integrated payment system supporting UPI, cards, net banking, and cheque"),
    bullet("Real-time notification system with in-app, SMS, and email support"),
    bullet("Cloud-based image and document management using Cloudinary"),
    bullet("Responsive design working across desktop and mobile platforms"),
    bullet("Multi-language support for English and Hindi"),
    para("The system has real-world applicability and can be deployed for individual landlords, property management companies, and housing societies. Future enhancements could include integration with actual payment gateways, tenant background verification APIs, rent agreement generation, and analytics dashboards with rental market insights."),
    pageBreak()
  ];
}

function bibliography() {
  return [
    heading("Chapter 14: Bibliography"),
    heading("References", 2),
    bullet("Firebase Documentation – https://firebase.google.com/docs"),
    bullet("React.js Official Documentation – https://react.dev/"),
    bullet("TypeScript Documentation – https://www.typescriptlang.org/docs/"),
    bullet("Cloudinary Documentation – https://cloudinary.com/documentation"),
    bullet("Vite Build Tool – https://vitejs.dev/"),
    bullet("Vercel Deployment Platform – https://vercel.com/docs"),
    bullet("Twilio SMS API – https://www.twilio.com/docs/sms"),
    bullet("Resend Email API – https://resend.com/docs"),
    bullet("Tailwind CSS Documentation – https://tailwindcss.com/docs"),
    bullet("qrcode.react Library – https://www.npmjs.com/package/qrcode.react"),
    bullet("MDN Web Docs (HTML, CSS, JavaScript) – https://developer.mozilla.org/"),
    bullet("Stack Overflow Community – https://stackoverflow.com/"),
    bullet("GeeksforGeeks – https://www.geeksforgeeks.org/"),
    bullet("W3Schools Web Tutorials – https://www.w3schools.com/"),
  ];
}

// ─── BUILD DOCUMENT ─────────────────────────────────────────────────────────
const doc = new Document({
  styles: {
    default: {
      document: { run: { font: FONT, size: 24, color: DARK } },
      listParagraph: { run: { font: FONT, size: 24 } }
    }
  },
  numbering: {
    config: [{
      reference: "bullet-list",
      levels: [{ level: 0, format: NumberFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }]
    }]
  },
  sections: [{
    properties: {
      page: {
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        size: { width: 12240, height: 15840 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "RentEase – Smart Rental Property Management System", size: 16, font: FONT, color: GRAY, italics: true })]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Page ", size: 18, font: FONT, color: GRAY }), new TextRun({ children: [PageNumber.CURRENT], size: 18, font: FONT, color: GRAY })]
        })]
      })
    },
    children: [
      ...frontPage(),
      ...declaration(),
      ...acknowledgement(),
      ...certificate(),
      ...abstract(),
      ...tableOfContents(),
      ...introduction(),
      ...objective(),
      ...systemAnalysis(),
      ...feasibility(),
      ...requirements(),
      ...systemDesign(),
      ...implementation(),
      ...codeSection(),
      ...inputOutput(),
      ...testing(),
      ...maintenance(),
      ...costBenefit(),
      ...conclusion(),
      ...bibliography()
    ]
  }]
});

// ─── SAVE FILE ──────────────────────────────────────────────────────────────
const buffer = await Packer.toBuffer(doc);
const outPath = "RentEase_Project_Report.docx";
fs.writeFileSync(outPath, buffer);
console.log(`✅ Report generated successfully: ${outPath}`);
console.log(`   File size: ${(buffer.length / 1024).toFixed(1)} KB`);
