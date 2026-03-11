const PptxGenJS = require('pptxgenjs');

const pptx = new PptxGenJS();

// ─── Global Slide Size ────────────────────────────────────────────────────────
pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 inches

// ─── Color Palette ───────────────────────────────────────────────────────────
const C = {
    navy: '0F1C3F',
    indigo: '3D52A0',
    violet: '7091E6',
    sky: '8697C4',
    white: 'FFFFFF',
    offwhite: 'F4F6FB',
    light: 'EEF1FA',
    accent: 'ADBBDA',
    gold: 'F0A500',
    text: '1E2D52',
    muted: '6B7BB6',
    card: 'FFFFFF',
    red: 'E05555',
    green: '4CAF82',
};

// ─── Helper: Dark gradient BG slide ──────────────────────────────────────────
function addDarkBg(slide) {
    slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: '100%', h: '100%',
        fill: { type: 'solid', color: C.navy },
    });
    // Decorative top bar
    slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: '100%', h: 0.12,
        fill: { type: 'solid', color: C.gold },
    });
    // Side accent
    slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: 0.08, h: '100%',
        fill: { type: 'solid', color: C.indigo },
    });
}

// Helper: Light BG slide
function addLightBg(slide) {
    slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: '100%', h: '100%',
        fill: { type: 'solid', color: C.offwhite },
    });
    // Top bar
    slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: '100%', h: 0.12,
        fill: { type: 'solid', color: C.indigo },
    });
    // Gold accent left
    slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: 0.08, h: '100%',
        fill: { type: 'solid', color: C.gold },
    });
}

// Helper: Section header bar
function addSectionHeader(slide, title, icon = '') {
    slide.addShape(pptx.ShapeType.rect, {
        x: 0.2, y: 0.25, w: 12.9, h: 0.72,
        fill: { type: 'solid', color: C.indigo },
        line: { color: C.indigo },
        shadow: { type: 'outer', blur: 6, offset: 2, angle: 45, color: '000000', opacity: 0.2 },
    });
    slide.addText(`${icon}  ${title}`, {
        x: 0.3, y: 0.28, w: 12.7, h: 0.66,
        fontSize: 22, bold: true, color: C.white,
        fontFace: 'Segoe UI',
    });
}

// Helper: card / box
function addCard(slide, x, y, w, h, opts = {}) {
    slide.addShape(pptx.ShapeType.rect, {
        x, y, w, h,
        fill: { type: 'solid', color: opts.fill || C.white },
        line: { color: opts.border || C.accent, pt: 1 },
        shadow: { type: 'outer', blur: 8, offset: 3, angle: 45, color: '000000', opacity: 0.12 },
    });
}

// Helper: bullet list
function bulletList(slide, items, x, y, w, h, opts = {}) {
    const paras = items.map(item => ({
        text: item.text || item,
        options: {
            bullet: item.bullet !== false ? { type: 'bullet', characterCode: '25CF' } : false,
            fontSize: opts.fontSize || 15,
            color: opts.color || C.text,
            bold: item.bold || false,
            breakLine: true,
            paraSpaceAfter: 6,
        }
    }));
    slide.addText(paras, {
        x, y, w, h,
        fontFace: 'Segoe UI',
        valign: 'top',
    });
}

// ─── SLIDE 1: TITLE ──────────────────────────────────────────────────────────
{
    const slide = pptx.addSlide();
    addDarkBg(slide);

    // Large decorative circle top-right
    slide.addShape(pptx.ShapeType.ellipse, {
        x: 10.5, y: -1.2, w: 4, h: 4,
        fill: { type: 'solid', color: C.indigo },
        line: { color: C.indigo },
    });
    slide.addShape(pptx.ShapeType.ellipse, {
        x: 11.2, y: -0.5, w: 2.5, h: 2.5,
        fill: { type: 'solid', color: C.violet },
        line: { color: C.violet },
    });

    // Small bottom-left circle
    slide.addShape(pptx.ShapeType.ellipse, {
        x: -0.8, y: 5.8, w: 3, h: 3,
        fill: { type: 'solid', color: C.indigo },
        line: { color: C.indigo },
    });

    // Gold bar accent
    slide.addShape(pptx.ShapeType.rect, {
        x: 1.0, y: 2.0, w: 0.08, h: 2.8,
        fill: { type: 'solid', color: C.gold },
    });

    // Project name
    slide.addText('RentEase', {
        x: 1.2, y: 1.6, w: 9, h: 1.2,
        fontSize: 54, bold: true, color: C.white,
        fontFace: 'Segoe UI',
        glow: { size: 10, color: C.violet, opacity: 0.5 },
    });

    // Subtitle
    slide.addText('Rental Management Web Application', {
        x: 1.2, y: 2.75, w: 9.5, h: 0.55,
        fontSize: 22, color: C.accent,
        fontFace: 'Segoe UI',
        italic: true,
    });

    // Gold divider
    slide.addShape(pptx.ShapeType.rect, {
        x: 1.2, y: 3.38, w: 6, h: 0.05,
        fill: { type: 'solid', color: C.gold },
    });

    // Student info
    slide.addText([
        { text: 'Student:  ', options: { color: C.accent, bold: false } },
        { text: 'Mohammad Mojahid', options: { color: C.white, bold: true } },
    ], { x: 1.2, y: 3.55, w: 9, h: 0.4, fontSize: 15, fontFace: 'Segoe UI' });

    slide.addText([
        { text: 'Course:  ', options: { color: C.accent, bold: false } },
        { text: 'B.Tech (Computer Science) — 6th Semester', options: { color: C.white, bold: true } },
    ], { x: 1.2, y: 3.98, w: 10, h: 0.4, fontSize: 15, fontFace: 'Segoe UI' });

    slide.addText([
        { text: 'College:  ', options: { color: C.accent, bold: false } },
        { text: 'Your College Name Here', options: { color: C.white, bold: true } },
    ], { x: 1.2, y: 4.42, w: 10, h: 0.4, fontSize: 15, fontFace: 'Segoe UI' });

    slide.addText([
        { text: 'Year:  ', options: { color: C.accent, bold: false } },
        { text: '2025 – 2026', options: { color: C.white, bold: true } },
    ], { x: 1.2, y: 4.85, w: 9, h: 0.4, fontSize: 15, fontFace: 'Segoe UI' });

    // Bottom tag
    slide.addText('6th Semester Project Presentation', {
        x: 0, y: 7.0, w: '100%', h: 0.35,
        align: 'center', fontSize: 11, color: C.muted,
        fontFace: 'Segoe UI',
    });
}

// ─── SLIDE 2: AGENDA ─────────────────────────────────────────────────────────
{
    const slide = pptx.addSlide();
    addLightBg(slide);
    addSectionHeader(slide, 'Contents / Agenda', '📋');

    const agendaItems = [
        { num: '01', label: 'Introduction', },
        { num: '02', label: 'Objectives', },
        { num: '03', label: 'Hardware & Software Requirements', },
        { num: '04', label: 'Important Panels — Overview', },
        { num: '05', label: 'App Screenshots — Landing & Login', },
        { num: '06', label: 'App Screenshots — Owner Dashboard', },
        { num: '07', label: 'App Screenshots — Tenant & Payments', },
        { num: '08', label: 'Future Scope', },
        { num: '09', label: 'Conclusion', },
        { num: '10', label: 'Bibliography', },
    ];

    agendaItems.forEach((item, i) => {
        const col = i < 4 ? 0 : 1;
        const row = i < 4 ? i : i - 4;
        const x = 0.3 + col * 6.6;
        const y = 1.25 + row * 1.38;

        addCard(slide, x, y, 6.2, 1.1, { fill: C.white, border: C.accent });
        slide.addShape(pptx.ShapeType.rect, {
            x: x, y: y, w: 0.85, h: 1.1,
            fill: { type: 'solid', color: C.indigo },
            line: { color: C.indigo },
        });
        slide.addText(item.num, {
            x: x, y: y, w: 0.85, h: 1.1,
            align: 'center', valign: 'middle',
            fontSize: 18, bold: true, color: C.white,
            fontFace: 'Segoe UI',
        });
        slide.addText(item.label, {
            x: x + 0.95, y: y + 0.2, w: 5.1, h: 0.7,
            fontSize: 15, bold: true, color: C.text,
            fontFace: 'Segoe UI', valign: 'middle',
        });
    });
}

// ─── SLIDE 3: INTRODUCTION ───────────────────────────────────────────────────
{
    const slide = pptx.addSlide();
    addLightBg(slide);
    addSectionHeader(slide, 'Introduction', '🏠');

    // Left column — concept
    addCard(slide, 0.25, 1.15, 6.1, 5.4, { fill: C.white, border: C.accent });
    slide.addShape(pptx.ShapeType.rect, {
        x: 0.25, y: 1.15, w: 6.1, h: 0.5,
        fill: { type: 'solid', color: C.indigo },
        line: { color: C.indigo },
    });
    slide.addText('What is Rental Management?', {
        x: 0.3, y: 1.15, w: 6.0, h: 0.5,
        fontSize: 14, bold: true, color: C.white,
        fontFace: 'Segoe UI', valign: 'middle',
    });

    bulletList(slide, [
        'A rental management system is a digital platform that helps property owners manage their properties, tenants, and payments efficiently.',
        'It replaces manual record-keeping with automated, organized digital processes.',
        'Enables real-time tracking of payment dues, complaints, and notices.',
        'Facilitates smooth communication between landlords and tenants through a centralized platform.',
    ], 0.35, 1.75, 5.9, 4.6, { fontSize: 13.5, color: C.text });

    // Right column — problem
    addCard(slide, 6.65, 1.15, 6.55, 5.4, { fill: C.white, border: C.red });
    slide.addShape(pptx.ShapeType.rect, {
        x: 6.65, y: 1.15, w: 6.55, h: 0.5,
        fill: { type: 'solid', color: C.red },
        line: { color: C.red },
    });
    slide.addText('Problems Without Digital Systems', {
        x: 6.7, y: 1.15, w: 6.4, h: 0.5,
        fontSize: 14, bold: true, color: C.white,
        fontFace: 'Segoe UI', valign: 'middle',
    });

    bulletList(slide, [
        'Manual paper-based records are error-prone and time consuming.',
        'Rent payment tracking is difficult — delays and disputes arise frequently.',
        'No centralized system for complaints or maintenance requests.',
        'Owners struggle to manage multiple properties and tenants simultaneously.',
        'Tenants lack transparency about rent dues, notices and property rules.',
        'Document management (Aadhaar, ID proof) is disorganized and insecure.',
    ], 6.75, 1.75, 6.3, 4.6, { fontSize: 13.5, color: C.text });
}

// ─── SLIDE 4: OBJECTIVES ─────────────────────────────────────────────────────
{
    const slide = pptx.addSlide();
    addLightBg(slide);
    addSectionHeader(slide, 'Objectives', '🎯');

    const objectives = [
        { icon: '🏢', title: 'Simplify Property Management', desc: 'Allow owners to add, manage and track multiple properties and units with ease.' },
        { icon: '👥', title: 'Tenant & Payment Tracking', desc: 'Maintain detailed tenant records, track monthly rent payments and dues automatically.' },
        { icon: '🌐', title: 'Centralized Digital Platform', desc: 'Provide a single, unified platform accessible from any device via web browser.' },
        { icon: '💬', title: 'Improved Communication', desc: 'Enable seamless communication through notices, complaints, and notifications between owners and tenants.' },
        { icon: '📄', title: 'Document Management', desc: 'Securely upload and store tenant documents like Aadhaar and ID proof in the cloud.' },
        { icon: '📊', title: 'Financial Reporting', desc: 'Give owners clear visibility into income, pending payments and financial history.' },
    ];

    objectives.forEach((obj, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = 0.25 + col * 4.38;
        const y = 1.15 + row * 2.85;

        addCard(slide, x, y, 4.1, 2.55, { fill: C.white, border: C.accent });
        slide.addShape(pptx.ShapeType.rect, {
            x: x, y: y, w: 4.1, h: 0.08,
            fill: { type: 'solid', color: C.indigo },
            line: { color: C.indigo },
        });
        slide.addText(obj.icon, {
            x: x + 0.1, y: y + 0.15, w: 0.6, h: 0.6,
            fontSize: 22, fontFace: 'Segoe UI',
        });
        slide.addText(obj.title, {
            x: x + 0.1, y: y + 0.75, w: 3.85, h: 0.5,
            fontSize: 13.5, bold: true, color: C.text,
            fontFace: 'Segoe UI',
        });
        slide.addText(obj.desc, {
            x: x + 0.1, y: y + 1.25, w: 3.85, h: 1.2,
            fontSize: 12, color: C.muted,
            fontFace: 'Segoe UI', valign: 'top',
        });
    });
}

// ─── SLIDE 5: REQUIREMENTS ────────────────────────────────────────────────────
{
    const slide = pptx.addSlide();
    addLightBg(slide);
    addSectionHeader(slide, 'Hardware & Software Requirements', '⚙️');

    // Hardware card
    addCard(slide, 0.25, 1.15, 6.1, 5.4, { fill: C.white, border: C.accent });
    slide.addShape(pptx.ShapeType.rect, {
        x: 0.25, y: 1.15, w: 6.1, h: 0.52,
        fill: { type: 'solid', color: C.navy },
        line: { color: C.navy },
    });
    slide.addText('🖥️   Hardware Requirements', {
        x: 0.35, y: 1.15, w: 5.9, h: 0.52,
        fontSize: 15, bold: true, color: C.white,
        fontFace: 'Segoe UI', valign: 'middle',
    });

    const hwItems = [
        { label: 'Device', val: 'Laptop or Desktop PC (minimum 4GB RAM)' },
        { label: 'Processor', val: 'Intel Core i3 / AMD Ryzen 3 or higher' },
        { label: 'Storage', val: 'Minimum 256 GB SSD / HDD' },
        { label: 'Internet', val: 'Broadband or WiFi connection (for Firebase)' },
        { label: 'Display', val: 'Minimum 1280×720 resolution screen' },
    ];

    hwItems.forEach((item, i) => {
        const y = 1.85 + i * 0.88;
        slide.addShape(pptx.ShapeType.rect, {
            x: 0.35, y, w: 1.5, h: 0.62,
            fill: { type: 'solid', color: C.light },
            line: { color: C.accent },
        });
        slide.addText(item.label, {
            x: 0.35, y, w: 1.5, h: 0.62,
            align: 'center', valign: 'middle',
            fontSize: 12, bold: true, color: C.indigo,
            fontFace: 'Segoe UI',
        });
        slide.addText(item.val, {
            x: 1.95, y: y + 0.1, w: 4.2, h: 0.45,
            fontSize: 12.5, color: C.text,
            fontFace: 'Segoe UI', valign: 'middle',
        });
    });

    // Software card
    addCard(slide, 6.65, 1.15, 6.55, 5.4, { fill: C.white, border: C.accent });
    slide.addShape(pptx.ShapeType.rect, {
        x: 6.65, y: 1.15, w: 6.55, h: 0.52,
        fill: { type: 'solid', color: C.navy },
        line: { color: C.navy },
    });
    slide.addText('💻   Software Requirements', {
        x: 6.75, y: 1.15, w: 6.35, h: 0.52,
        fontSize: 15, bold: true, color: C.white,
        fontFace: 'Segoe UI', valign: 'middle',
    });

    const swItems = [
        { icon: '⚛️', name: 'React + TypeScript', desc: 'Frontend UI framework with type safety' },
        { icon: '🔥', name: 'Firebase', desc: 'Authentication, Firestore DB & File Storage' },
        { icon: '⚡', name: 'Vite', desc: 'Ultra-fast development build tool' },
        { icon: '▲', name: 'Vercel', desc: 'Cloud deployment & hosting platform' },
        { icon: '💙', name: 'VS Code', desc: 'Primary code editor / IDE' },
        { icon: '🐙', name: 'GitHub', desc: 'Version control & source code management' },
    ];

    swItems.forEach((item, i) => {
        const y = 1.85 + i * 0.82;
        slide.addShape(pptx.ShapeType.rect, {
            x: 6.75, y, w: 0.7, h: 0.62,
            fill: { type: 'solid', color: C.indigo },
            line: { color: C.indigo },
        });
        slide.addText(item.icon, {
            x: 6.75, y, w: 0.7, h: 0.62,
            align: 'center', valign: 'middle',
            fontSize: 18, fontFace: 'Segoe UI',
        });
        slide.addText(item.name, {
            x: 7.55, y: y + 0.02, w: 5.4, h: 0.3,
            fontSize: 13.5, bold: true, color: C.text,
            fontFace: 'Segoe UI',
        });
        slide.addText(item.desc, {
            x: 7.55, y: y + 0.32, w: 5.4, h: 0.28,
            fontSize: 11.5, color: C.muted,
            fontFace: 'Segoe UI',
        });
    });
}

// ─── SLIDE 6: SYSTEM ARCHITECTURE ──────────────────────────────────────────
{
    const slide = pptx.addSlide();
    addLightBg(slide);
    addSectionHeader(slide, 'System Architecture', '🏗️');

    // User tier
    addCard(slide, 0.25, 1.2, 12.9, 1.2, { fill: C.light, border: C.accent });
    slide.addText('👤  USER TIER  —  Web Browser (React + TypeScript + Vite)', {
        x: 0.35, y: 1.2, w: 12.7, h: 1.2,
        fontSize: 16, bold: true, color: C.text,
        fontFace: 'Segoe UI', valign: 'middle', align: 'center',
    });

    // Arrow
    slide.addShape(pptx.ShapeType.rect, { x: 6.5, y: 2.5, w: 0.35, h: 0.6, fill: { type: 'solid', color: C.indigo }, line: { color: C.indigo } });

    // Firebase tier
    addCard(slide, 0.25, 3.18, 12.9, 1.4, { fill: C.indigo, border: C.indigo });
    slide.addText('🔥  BACKEND TIER  —  Firebase Platform', {
        x: 0.35, y: 3.18, w: 12.7, h: 0.48,
        fontSize: 15, bold: true, color: C.white,
        fontFace: 'Segoe UI', valign: 'middle', align: 'center',
    });
    const fbServices = ['Firebase Authentication\n(User Login & Register)', 'Firestore Database\n(Real-time NoSQL DB)', 'Firebase Storage\n(Document & File Upload)'];
    fbServices.forEach((svc, i) => {
        slide.addShape(pptx.ShapeType.rect, {
            x: 0.4 + i * 4.3, y: 3.72, w: 4.0, h: 0.75,
            fill: { type: 'solid', color: C.violet }, line: { color: C.violet },
        });
        slide.addText(svc, { x: 0.4 + i * 4.3, y: 3.72, w: 4.0, h: 0.75, align: 'center', valign: 'middle', fontSize: 12, bold: true, color: C.white, fontFace: 'Segoe UI' });
    });

    // Arrow
    slide.addShape(pptx.ShapeType.rect, { x: 6.5, y: 4.55, w: 0.35, h: 0.6, fill: { type: 'solid', color: C.indigo }, line: { color: C.indigo } });

    // Deployment tier
    addCard(slide, 0.25, 5.22, 12.9, 1.1, { fill: C.navy, border: C.navy });
    slide.addText('▲  DEPLOYMENT TIER  —  Vercel (CDN + Serverless Hosting)  |  GitHub (Version Control)', {
        x: 0.35, y: 5.22, w: 12.7, h: 1.1,
        fontSize: 14, bold: true, color: C.white,
        fontFace: 'Segoe UI', valign: 'middle', align: 'center',
    });
}

// ─── SLIDE 7: IMPORTANT PANELS OVERVIEW ──────────────────────────────────────
{
    const slide = pptx.addSlide();
    addLightBg(slide);
    addSectionHeader(slide, 'Important Panels — Overview', '🖥️');

    const panels = [
        { icon: '🏠', name: 'Landing Page', desc: 'Public home page with Owner & Tenant login options, project branding and multi-language support (Hindi/English).' },
        { icon: '👔', name: 'Owner Dashboard', desc: 'Property management, tenant overview, floor/unit management, financial reports and send rent notices.' },
        { icon: '🧑‍💼', name: 'Tenant Dashboard', desc: 'View assigned property details, apply for property, submit complaints, view notifications.' },
        { icon: '🏗️', name: 'Property / Unit Management', desc: 'Owners can add properties, define floors/units, mark vacancy, and assign tenants to specific units.' },
        { icon: '📁', name: 'Document Upload', desc: 'Tenants upload Aadhaar card, ID proof and profile photo securely stored in Firebase Storage.' },
        { icon: '💰', name: 'Rent Payment & Tracking', desc: 'Owners send rent notices; tenants pay via UPI/QR code. Real-time payment status tracking with history.' },
    ];

    panels.forEach((panel, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = 0.22 + col * 4.38;
        const y = 1.15 + row * 2.85;

        addCard(slide, x, y, 4.1, 2.62, { fill: C.white, border: C.accent });
        slide.addShape(pptx.ShapeType.rect, {
            x, y, w: 4.1, h: 0.08,
            fill: { type: 'solid', color: C.gold }, line: { color: C.gold },
        });
        slide.addText(panel.icon, {
            x: x + 0.12, y: y + 0.15, w: 0.65, h: 0.65,
            fontSize: 24, fontFace: 'Segoe UI',
        });
        slide.addText(panel.name, {
            x: x + 0.82, y: y + 0.2, w: 3.2, h: 0.6,
            fontSize: 14, bold: true, color: C.text,
            fontFace: 'Segoe UI', valign: 'middle',
        });
        slide.addShape(pptx.ShapeType.rect, {
            x: x + 0.1, y: y + 0.88, w: 3.85, h: 0.04,
            fill: { type: 'solid', color: C.light }, line: { color: C.light },
        });
        slide.addText(panel.desc, {
            x: x + 0.1, y: y + 1.0, w: 3.85, h: 1.52,
            fontSize: 12, color: C.muted,
            fontFace: 'Segoe UI', valign: 'top',
        });
        slide.addShape(pptx.ShapeType.rect, {
            x: x + 0.1, y: y + 2.58, w: 3.85, h: 0.02,
            fill: { type: 'solid', color: C.accent }, line: { color: C.accent },
        });
    });
}

// ─── SLIDE 7B: SCREENSHOT — LANDING PAGE & LOGIN ─────────────────────────────
{
    const slide = pptx.addSlide();
    addLightBg(slide);
    addSectionHeader(slide, 'App Screenshot — Landing Page & Login', '🏠');

    // Left: Landing Page screenshot
    addCard(slide, 0.22, 1.08, 6.25, 5.5, { fill: C.navy, border: C.navy });
    slide.addText('🏠  Landing Page', {
        x: 0.3, y: 1.12, w: 6.1, h: 0.42,
        fontSize: 13, bold: true, color: C.white,
        fontFace: 'Segoe UI', valign: 'middle',
    });
    slide.addImage({
        path: 'C:/Users/LENOVO/.gemini/antigravity/brain/039ccac1-2597-4e85-b080-09e90a61aaae/landing_page_full_1773040802985.png',
        x: 0.3, y: 1.6, w: 6.05, h: 4.85,
        sizing: { type: 'contain', w: 6.05, h: 4.85 },
    });

    // Right: Login Page screenshot
    addCard(slide, 6.85, 1.08, 6.25, 5.5, { fill: C.navy, border: C.navy });
    slide.addText('🔐  Login Page (Owner / Tenant)', {
        x: 6.93, y: 1.12, w: 6.1, h: 0.42,
        fontSize: 13, bold: true, color: C.white,
        fontFace: 'Segoe UI', valign: 'middle',
    });
    slide.addImage({
        path: 'C:/Users/LENOVO/.gemini/antigravity/brain/039ccac1-2597-4e85-b080-09e90a61aaae/login_page_owner_1773040760297.png',
        x: 6.93, y: 1.6, w: 6.05, h: 4.85,
        sizing: { type: 'contain', w: 6.05, h: 4.85 },
    });

    // Caption
    slide.addText('Left: Public landing page with Owner & Tenant login options  |  Right: Unified login panel with role selection (Owner/Tenant)', {
        x: 0.22, y: 6.7, w: 12.9, h: 0.35,
        align: 'center', fontSize: 10.5, color: C.muted,
        fontFace: 'Segoe UI', italic: true,
    });
}

// ─── SLIDE 7C: SCREENSHOT — OWNER DASHBOARD ──────────────────────────────────
{
    const slide = pptx.addSlide();
    addLightBg(slide);
    addSectionHeader(slide, 'App Screenshot — Owner Dashboard', '👔');

    // Full-width screenshot
    addCard(slide, 0.22, 1.08, 12.88, 5.5, { fill: C.navy, border: C.navy });
    slide.addText('👔  Owner Dashboard — Property & Tenant Overview', {
        x: 0.35, y: 1.12, w: 12.6, h: 0.42,
        fontSize: 14, bold: true, color: C.white,
        fontFace: 'Segoe UI', valign: 'middle', align: 'center',
    });
    slide.addImage({
        path: 'C:/Users/LENOVO/.gemini/antigravity/brain/039ccac1-2597-4e85-b080-09e90a61aaae/owner_dashboard_1773041268382.png',
        x: 0.35, y: 1.6, w: 12.6, h: 4.85,
        sizing: { type: 'contain', w: 12.6, h: 4.85 },
    });

    // Features bar at bottom
    const ownerFeats = ['📊 Stats Cards', '🏢 Property Cards', '👥 Tenant Management', '📜 Send Notices', '📈 Financial Reports', '🌐 Hindi/English Toggle'];
    ownerFeats.forEach((feat, i) => {
        const x = 0.22 + i * 2.15;
        slide.addShape(pptx.ShapeType.rect, {
            x, y: 6.65, w: 2.05, h: 0.42,
            fill: { type: 'solid', color: C.indigo }, line: { color: C.indigo },
        });
        slide.addText(feat, {
            x, y: 6.65, w: 2.05, h: 0.42,
            align: 'center', valign: 'middle',
            fontSize: 10, color: C.white, fontFace: 'Segoe UI',
        });
    });
}

// ─── SLIDE 7D: SCREENSHOT — TENANT DASHBOARD & RENT PAYMENT ──────────────────
{
    const slide = pptx.addSlide();
    addLightBg(slide);
    addSectionHeader(slide, 'App Screenshot — Tenant Dashboard & Rent Payment', '🧑‍💼');

    // Left: Tenant Dashboard
    addCard(slide, 0.22, 1.08, 6.25, 5.5, { fill: C.navy, border: C.navy });
    slide.addText('🧑‍💼  Tenant Dashboard', {
        x: 0.3, y: 1.12, w: 6.1, h: 0.42,
        fontSize: 13, bold: true, color: C.white,
        fontFace: 'Segoe UI', valign: 'middle',
    });
    slide.addImage({
        path: 'C:/Users/LENOVO/.gemini/antigravity/brain/039ccac1-2597-4e85-b080-09e90a61aaae/tenant_dashboard_1773041283839.png',
        x: 0.3, y: 1.6, w: 6.05, h: 4.85,
        sizing: { type: 'contain', w: 6.05, h: 4.85 },
    });

    // Right: Rent Payment
    addCard(slide, 6.85, 1.08, 6.25, 5.5, { fill: C.navy, border: C.navy });
    slide.addText('💰  Rent Payment — UPI / QR Code', {
        x: 6.93, y: 1.12, w: 6.1, h: 0.42,
        fontSize: 13, bold: true, color: C.white,
        fontFace: 'Segoe UI', valign: 'middle',
    });
    slide.addImage({
        path: 'C:/Users/LENOVO/.gemini/antigravity/brain/039ccac1-2597-4e85-b080-09e90a61aaae/rent_payment_panel_1773041315416.png',
        x: 6.93, y: 1.6, w: 6.05, h: 4.85,
        sizing: { type: 'contain', w: 6.05, h: 4.85 },
    });

    slide.addText('Left: Tenant panel with property info, notices & notifications  |  Right: UPI/QR Code payment with payment history', {
        x: 0.22, y: 6.7, w: 12.9, h: 0.35,
        align: 'center', fontSize: 10.5, color: C.muted,
        fontFace: 'Segoe UI', italic: true,
    });
}

// ─── SLIDE 7E: SCREENSHOT — PROPERTY & UNIT MANAGEMENT ───────────────────────
{
    const slide = pptx.addSlide();
    addLightBg(slide);
    addSectionHeader(slide, 'App Screenshot — Property & Unit Management', '🏗️');

    addCard(slide, 0.22, 1.08, 12.88, 5.5, { fill: C.navy, border: C.navy });
    slide.addText('🏗️  Property & Unit Management — Floor-wise Unit Overview', {
        x: 0.35, y: 1.12, w: 12.6, h: 0.42,
        fontSize: 14, bold: true, color: C.white,
        fontFace: 'Segoe UI', valign: 'middle', align: 'center',
    });
    slide.addImage({
        path: 'C:/Users/LENOVO/.gemini/antigravity/brain/039ccac1-2597-4e85-b080-09e90a61aaae/property_unit_management_1773041301654.png',
        x: 0.35, y: 1.6, w: 12.6, h: 4.85,
        sizing: { type: 'contain', w: 12.6, h: 4.85 },
    });

    const unitFeats = ['🏢 Multiple Properties', '🏗️ Floor-wise View', '🟢 Occupied Units', '⬜ Vacant Units', '👤 Assign Tenant', '📋 Unit Details'];
    unitFeats.forEach((feat, i) => {
        const x = 0.22 + i * 2.15;
        slide.addShape(pptx.ShapeType.rect, {
            x, y: 6.65, w: 2.05, h: 0.42,
            fill: { type: 'solid', color: C.green }, line: { color: C.green },
        });
        slide.addText(feat, {
            x, y: 6.65, w: 2.05, h: 0.42,
            align: 'center', valign: 'middle',
            fontSize: 10, color: C.white, fontFace: 'Segoe UI',
        });
    });
}

// ─── SLIDE 8: KEY FEATURES ────────────────────────────────────────────────────
{
    const slide = pptx.addSlide();
    addDarkBg(slide);
    slide.addText('Key Features of RentEase', {
        x: 0.25, y: 0.25, w: 12.8, h: 0.72,
        fontSize: 26, bold: true, color: C.white,
        fontFace: 'Segoe UI', align: 'center', valign: 'middle',
    });

    const features = [
        { icon: '🔐', title: 'Secure Firebase Auth', detail: 'Phone-based login with OTP, role-based access (Owner / Tenant)' },
        { icon: '🏢', title: 'Multi-Property Support', detail: 'Manage multiple properties, floors and units from one dashboard' },
        { icon: '📜', title: 'Rent Notice System', detail: 'Owners send digital rent notices; tenants receive real-time alerts' },
        { icon: '📱', title: 'QR Code Payment', detail: 'Tenants scan QR code to pay rent via UPI apps instantly' },
        { icon: '🔔', title: 'Notifications', detail: 'In-app notification system for payments, notices and complaints' },
        { icon: '🌐', title: 'Multi-Language', detail: 'Supports Hindi and English for wider accessibility' },
        { icon: '📂', title: 'Document Storage', detail: 'Secure cloud storage of Aadhaar, ID proof and profile photos' },
        { icon: '📊', title: 'Financial Reports', detail: 'Owner dashboard shows income summary and late payment alerts' },
    ];

    features.forEach((feat, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const x = 0.2 + col * 3.28;
        const y = 1.15 + row * 2.9;

        slide.addShape(pptx.ShapeType.rect, {
            x, y, w: 3.05, h: 2.6,
            fill: { type: 'solid', color: C.indigo },
            line: { color: C.violet },
        });
        slide.addShape(pptx.ShapeType.rect, {
            x, y, w: 3.05, h: 0.08,
            fill: { type: 'solid', color: C.gold }, line: { color: C.gold },
        });
        slide.addText(feat.icon, {
            x: x + 0.1, y: y + 0.18, w: 0.6, h: 0.6,
            fontSize: 22, fontFace: 'Segoe UI',
        });
        slide.addText(feat.title, {
            x: x + 0.1, y: y + 0.8, w: 2.8, h: 0.55,
            fontSize: 13.5, bold: true, color: C.white,
            fontFace: 'Segoe UI',
        });
        slide.addText(feat.detail, {
            x: x + 0.1, y: y + 1.38, w: 2.8, h: 1.1,
            fontSize: 11.5, color: C.accent,
            fontFace: 'Segoe UI', valign: 'top',
        });
    });
}

// ─── SLIDE 9: FUTURE SCOPE ────────────────────────────────────────────────────
{
    const slide = pptx.addSlide();
    addLightBg(slide);
    addSectionHeader(slide, 'Future Scope', '🚀');

    const futures = [
        { icon: '📱', title: 'Mobile Application', desc: 'Develop native Android & iOS apps using React Native for easier access on smartphones.', color: C.indigo },
        { icon: '💳', title: 'Online Payment Integration', desc: 'Integrate Razorpay / Stripe for direct rent collection within the app — automated receipts.', color: '2E7D32' },
        { icon: '🤖', title: 'AI Tenant Verification', desc: 'Use AI/ML to verify tenant identity documents automatically and flag suspicious profiles.', color: 'B45309' },
        { icon: '📈', title: 'Advanced Analytics', desc: 'Owner analytics dashboard with graphs — income trends, occupancy rates, payment forecasting.', color: C.red },
        { icon: '💬', title: 'In-App Chat', desc: 'Real-time chat between owners and tenants for faster issue resolution without external apps.', color: '5B21B6' },
        { icon: '🗓️', title: 'Automated Reminders', desc: 'Auto-scheduled SMS/email reminders for rent due dates, lease renewals and inspections.', color: '0E7490' },
    ];

    futures.forEach((item, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = 0.22 + col * 6.6;
        const y = 1.18 + row * 1.88;

        addCard(slide, x, y, 6.2, 1.68, { fill: C.white, border: C.accent });
        slide.addShape(pptx.ShapeType.rect, {
            x, y, w: 0.72, h: 1.68,
            fill: { type: 'solid', color: item.color },
            line: { color: item.color },
        });
        slide.addText(item.icon, {
            x, y, w: 0.72, h: 1.68,
            align: 'center', valign: 'middle',
            fontSize: 22, fontFace: 'Segoe UI',
        });
        slide.addText(item.title, {
            x: x + 0.82, y: y + 0.12, w: 5.25, h: 0.42,
            fontSize: 14.5, bold: true, color: C.text,
            fontFace: 'Segoe UI',
        });
        slide.addText(item.desc, {
            x: x + 0.82, y: y + 0.55, w: 5.25, h: 1.0,
            fontSize: 12.5, color: C.muted,
            fontFace: 'Segoe UI', valign: 'top',
        });
    });
}

// ─── SLIDE 10: CONCLUSION ─────────────────────────────────────────────────────
{
    const slide = pptx.addSlide();
    addDarkBg(slide);

    // Big circle decoration
    slide.addShape(pptx.ShapeType.ellipse, {
        x: 9.5, y: 0.5, w: 5, h: 5,
        fill: { type: 'solid', color: C.indigo }, line: { color: C.indigo },
    });
    slide.addShape(pptx.ShapeType.ellipse, {
        x: 10.3, y: 1.3, w: 3.4, h: 3.4,
        fill: { type: 'solid', color: C.violet }, line: { color: C.violet },
    });
    slide.addText('✅', {
        x: 10.8, y: 1.9, w: 2.4, h: 2.4,
        fontSize: 52, align: 'center', valign: 'middle', fontFace: 'Segoe UI',
    });

    slide.addText('Conclusion', {
        x: 0.25, y: 0.4, w: 9, h: 0.8,
        fontSize: 32, bold: true, color: C.gold,
        fontFace: 'Segoe UI',
    });
    slide.addShape(pptx.ShapeType.rect, {
        x: 0.25, y: 1.25, w: 5.5, h: 0.07,
        fill: { type: 'solid', color: C.gold }, line: { color: C.gold },
    });

    const conclusionPoints = [
        'RentEase successfully bridges the gap between traditional rental management and modern digital solutions.',
        'Owners can add properties, manage tenants, send rent notices and view financial reports — all in one place.',
        'Tenants enjoy a transparent experience — viewing their dues, paying rent via QR code, and submitting complaints.',
        'Built with modern technologies (React, TypeScript, Firebase) ensuring reliability, scalability and security.',
        'RentEase demonstrates how technology can transform everyday rental management challenges into seamless experiences.',
    ];

    conclusionPoints.forEach((point, i) => {
        slide.addShape(pptx.ShapeType.rect, {
            x: 0.25, y: 1.45 + i * 1.0, w: 0.06, h: 0.72,
            fill: { type: 'solid', color: C.gold }, line: { color: C.gold },
        });
        slide.addText(point, {
            x: 0.42, y: 1.45 + i * 1.0, w: 8.8, h: 0.78,
            fontSize: 13, color: C.white, valign: 'middle',
            fontFace: 'Segoe UI',
        });
    });
}

// ─── SLIDE 11: BIBLIOGRAPHY ────────────────────────────────────────────────────
{
    const slide = pptx.addSlide();
    addLightBg(slide);
    addSectionHeader(slide, 'Bibliography / References', '📚');

    const refs = [
        { num: '[1]', title: 'Firebase Documentation', url: 'https://firebase.google.com/docs', detail: 'Official Firebase docs for Authentication, Firestore & Storage.' },
        { num: '[2]', title: 'React Documentation', url: 'https://react.dev', detail: 'Official React docs for component-based UI development.' },
        { num: '[3]', title: 'TypeScript Handbook', url: 'https://www.typescriptlang.org/docs/', detail: 'Official TypeScript language documentation and best practices.' },
        { num: '[4]', title: 'Vite Documentation', url: 'https://vitejs.dev', detail: 'Build tool documentation used for development and bundling.' },
        { num: '[5]', title: 'Vercel Documentation', url: 'https://vercel.com/docs', detail: 'Deployment platform documentation for hosting the web app.' },
        { num: '[6]', title: 'MDN Web Docs', url: 'https://developer.mozilla.org', detail: 'Reference for HTML, CSS, and JavaScript web standards.' },
        { num: '[7]', title: 'GitHub Docs', url: 'https://docs.github.com', detail: 'Version control and repository management documentation.' },
    ];

    refs.forEach((ref, i) => {
        const y = 1.18 + i * 0.82;
        addCard(slide, 0.25, y, 12.85, 0.72, { fill: i % 2 === 0 ? C.white : C.light, border: C.accent });
        slide.addShape(pptx.ShapeType.rect, {
            x: 0.25, y, w: 0.62, h: 0.72,
            fill: { type: 'solid', color: C.indigo }, line: { color: C.indigo },
        });
        slide.addText(ref.num, {
            x: 0.25, y, w: 0.62, h: 0.72,
            align: 'center', valign: 'middle',
            fontSize: 11, bold: true, color: C.white, fontFace: 'Segoe UI',
        });
        slide.addText(ref.title, {
            x: 0.97, y: y + 0.06, w: 3.2, h: 0.3,
            fontSize: 13.5, bold: true, color: C.text, fontFace: 'Segoe UI',
        });
        slide.addText(ref.url, {
            x: 0.97, y: y + 0.38, w: 4.5, h: 0.28,
            fontSize: 11, color: C.muted, fontFace: 'Segoe UI', italic: true,
        });
        slide.addText(ref.detail, {
            x: 5.6, y: y + 0.12, w: 7.3, h: 0.5,
            fontSize: 12, color: C.text, fontFace: 'Segoe UI', valign: 'middle',
        });
    });
}

// ─── SLIDE 12: THANK YOU ──────────────────────────────────────────────────────
{
    const slide = pptx.addSlide();
    addDarkBg(slide);

    // Large decorative circles
    slide.addShape(pptx.ShapeType.ellipse, {
        x: -1.5, y: 4.5, w: 5, h: 5,
        fill: { type: 'solid', color: C.indigo }, line: { color: C.indigo },
    });
    slide.addShape(pptx.ShapeType.ellipse, {
        x: 10.0, y: -1.0, w: 4.5, h: 4.5,
        fill: { type: 'solid', color: C.indigo }, line: { color: C.indigo },
    });
    slide.addShape(pptx.ShapeType.ellipse, {
        x: 10.8, y: -0.3, w: 3, h: 3,
        fill: { type: 'solid', color: C.violet }, line: { color: C.violet },
    });

    slide.addText('Thank You!', {
        x: 0, y: 1.8, w: '100%', h: 1.5,
        align: 'center', fontSize: 62, bold: true, color: C.white,
        fontFace: 'Segoe UI',
    });
    slide.addText('🏠  RentEase — Rental Management Web Application', {
        x: 0, y: 3.45, w: '100%', h: 0.6,
        align: 'center', fontSize: 18, color: C.accent,
        fontFace: 'Segoe UI', italic: true,
    });
    slide.addShape(pptx.ShapeType.rect, {
        x: 3.5, y: 4.2, w: 6.35, h: 0.06,
        fill: { type: 'solid', color: C.gold }, line: { color: C.gold },
    });
    slide.addText('Questions & Feedback are Welcome', {
        x: 0, y: 4.45, w: '100%', h: 0.5,
        align: 'center', fontSize: 15.5, color: C.gold,
        fontFace: 'Segoe UI',
    });
    slide.addText('Presented by: Mohammad Mojahid  |  B.Tech CSE — 6th Semester', {
        x: 0, y: 6.8, w: '100%', h: 0.4,
        align: 'center', fontSize: 12, color: C.muted,
        fontFace: 'Segoe UI',
    });
}

// ─── SAVE ──────────────────────────────────────────────────────────────────────
const outputPath = 'RentEase_Presentation.pptx';
pptx.writeFile({ fileName: outputPath })
    .then(() => console.log(`✅ Presentation saved: ${outputPath}`))
    .catch(err => console.error('❌ Error:', err));
