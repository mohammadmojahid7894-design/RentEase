const PptxGenJS = require('pptxgenjs');
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';

// ─── Premium Dark Palette ────────────────────────────────────────────────────
const C = {
    bg1: '0A0E1A', bg2: '0D1225', bg3: '111832',
    card: '151B36', cardLight: '1A2142',
    neon: '6C63FF', cyan: '00D4FF', magenta: 'FF006E',
    purple: '8B5CF6', glow: '4F46E5',
    gold: 'FFB800', white: 'FFFFFF', offwhite: 'E2E8F0',
    muted: '94A3B8', subtle: '475569', border: '2D3561',
    green: '10B981', red: 'EF4444', orange: 'F59E0B',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function premiumBg(slide) {
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { type: 'solid', color: C.bg1 } });
    // Gradient mesh blobs
    slide.addShape(pptx.ShapeType.ellipse, { x: -2, y: -2, w: 7, h: 7, fill: { type: 'solid', color: C.bg3 }, line: { color: C.bg3 } });
    slide.addShape(pptx.ShapeType.ellipse, { x: 9, y: 4, w: 6, h: 6, fill: { type: 'solid', color: C.bg2 }, line: { color: C.bg2 } });
    // Neon accent line top
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.04, fill: { type: 'solid', color: C.neon } });
}

function glassCard(slide, x, y, w, h, opts = {}) {
    slide.addShape(pptx.ShapeType.rect, { x, y, w, h,
        fill: { type: 'solid', color: opts.fill || C.card },
        line: { color: opts.border || C.border, pt: 1 },
        rectRadius: 0.15,
        shadow: { type: 'outer', blur: 12, offset: 4, angle: 45, color: '000000', opacity: 0.35 },
    });
    if (opts.accentTop !== false) {
        slide.addShape(pptx.ShapeType.rect, { x: x + 0.02, y, w: w - 0.04, h: 0.05,
            fill: { type: 'solid', color: opts.accent || C.neon }, rectRadius: 0.02,
        });
    }
}

function sectionTitle(slide, title, subtitle) {
    slide.addShape(pptx.ShapeType.rect, { x: 0.3, y: 0.2, w: 0.06, h: 0.7, fill: { type: 'solid', color: C.neon } });
    slide.addText(title, { x: 0.5, y: 0.15, w: 12, h: 0.8, fontSize: 28, bold: true, color: C.white, fontFace: 'Segoe UI' });
    if (subtitle) slide.addText(subtitle, { x: 0.5, y: 0.85, w: 12, h: 0.35, fontSize: 13, color: C.muted, fontFace: 'Segoe UI' });
}

function sectionDivider(title, number) {
    const s = pptx.addSlide();
    premiumBg(s);
    s.addShape(pptx.ShapeType.ellipse, { x: 5, y: 1, w: 8, h: 8, fill: { type: 'solid', color: C.bg3 }, line: { color: C.bg3 } });
    s.addShape(pptx.ShapeType.rect, { x: 4.5, y: 3.9, w: 4.33, h: 0.05, fill: { type: 'solid', color: C.neon } });
    s.addText(number, { x: 0, y: 1.5, w: '100%', h: 1.5, align: 'center', fontSize: 60, bold: true, color: C.neon, fontFace: 'Segoe UI' });
    s.addText(title, { x: 0, y: 3.3, w: '100%', h: 0.7, align: 'center', fontSize: 32, bold: true, color: C.white, fontFace: 'Segoe UI' });
    s.addShape(pptx.ShapeType.rect, { x: 5.2, y: 4.2, w: 2.93, h: 0.04, fill: { type: 'solid', color: C.purple } });
}

function iconCircle(slide, x, y, icon, color) {
    slide.addShape(pptx.ShapeType.ellipse, { x, y, w: 0.7, h: 0.7, fill: { type: 'solid', color: color || C.neon }, line: { color: color || C.neon },
        shadow: { type: 'outer', blur: 8, offset: 0, color: color || C.neon, opacity: 0.4 } });
    slide.addText(icon, { x, y, w: 0.7, h: 0.7, align: 'center', valign: 'middle', fontSize: 18, fontFace: 'Segoe UI' });
}

function deviceFrame(slide, x, y, w, h, label) {
    // Laptop frame
    slide.addShape(pptx.ShapeType.rect, { x, y, w, h: h * 0.06, fill: { type: 'solid', color: C.subtle }, rectRadius: 0.1 });
    slide.addShape(pptx.ShapeType.ellipse, { x: x + w/2 - 0.06, y: y + h*0.015, w: 0.12, h: 0.03, fill: { type: 'solid', color: C.muted } });
    slide.addShape(pptx.ShapeType.rect, { x, y: y + h*0.06, w, h: h * 0.88,
        fill: { type: 'solid', color: C.bg3 }, line: { color: C.border, pt: 1 }, rectRadius: 0.05,
        shadow: { type: 'outer', blur: 15, offset: 5, color: C.neon, opacity: 0.15 } });
    slide.addText('[ Insert Screenshot ]', { x, y: y + h*0.25, w, h: h*0.4, align: 'center', valign: 'middle', fontSize: 16, bold: true, color: C.border, fontFace: 'Segoe UI' });
    slide.addShape(pptx.ShapeType.rect, { x: x + w*0.3, y: y + h*0.94, w: w*0.4, h: h*0.06, fill: { type: 'solid', color: C.subtle }, rectRadius: 0.05 });
    if (label) slide.addText(label, { x, y: y + h*0.06 + 0.08, w, h: 0.35, align: 'center', fontSize: 11, color: C.cyan, fontFace: 'Segoe UI', bold: true });
}

// ═══════════ SLIDE 1: HERO TITLE ═══════════════════════════════════════════
{
    const s = pptx.addSlide();
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { type: 'solid', color: C.bg1 } });
    // Massive gradient blobs
    s.addShape(pptx.ShapeType.ellipse, { x: 8, y: -2, w: 8, h: 8, fill: { type: 'solid', color: C.bg3 }, line: { color: C.bg3 } });
    s.addShape(pptx.ShapeType.ellipse, { x: 9.5, y: -0.5, w: 5, h: 5, fill: { type: 'solid', color: '1E1B4B' }, line: { color: '1E1B4B' } });
    s.addShape(pptx.ShapeType.ellipse, { x: -2, y: 5, w: 5, h: 5, fill: { type: 'solid', color: C.bg2 }, line: { color: C.bg2 } });
    // Neon glow line
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.05, fill: { type: 'solid', color: C.neon } });
    s.addShape(pptx.ShapeType.rect, { x: 1.0, y: 1.4, w: 0.06, h: 4.0, fill: { type: 'solid', color: C.cyan } });
    // Title
    s.addText('Smart Rental Property', { x: 1.3, y: 1.2, w: 10, h: 0.95, fontSize: 50, bold: true, color: C.white, fontFace: 'Segoe UI' });
    s.addText('Management System', { x: 1.3, y: 2.1, w: 10, h: 0.95, fontSize: 50, bold: true, color: C.cyan, fontFace: 'Segoe UI',
        glow: { size: 8, color: C.cyan, opacity: 0.4 } });
    s.addText('A Smart Web-Based Rental Management Platform', { x: 1.3, y: 3.1, w: 9, h: 0.45, fontSize: 18, color: C.muted, fontFace: 'Segoe UI', italic: true });
    s.addShape(pptx.ShapeType.rect, { x: 1.3, y: 3.65, w: 5, h: 0.04, fill: { type: 'solid', color: C.neon } });
    // Info cards
    const info = [['Student', 'Mohammad Mojahid'], ['Course', 'B.Tech CSE — 6th Semester'], ['College', 'Your College Name'], ['Year', '2025 – 2026']];
    info.forEach((item, i) => {
        s.addText([{ text: `${item[0]}:  `, options: { color: C.muted } }, { text: item[1], options: { color: C.white, bold: true } }],
            { x: 1.3, y: 3.85 + i * 0.42, w: 9, h: 0.38, fontSize: 14, fontFace: 'Segoe UI' });
    });
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 7.32, w: '100%', h: 0.18, fill: { type: 'solid', color: C.bg3 } });
    s.addText('6th Semester Project Presentation', { x: 0, y: 7.05, w: '100%', h: 0.35, align: 'center', fontSize: 10, color: C.subtle, fontFace: 'Segoe UI' });
}

// ═══════════ SLIDE 2: CONTENTS ═══════════════════════════════════════════════
{
    const s = pptx.addSlide(); premiumBg(s);
    sectionTitle(s, 'Contents', 'Presentation Roadmap');
    const items = ['Introduction', 'Objectives', 'Tech Stack & Requirements', 'Features Overview', 'System Architecture',
        'Screenshots — Owner Panel', 'Screenshots — Tenant & Payments', 'Screenshots — Search & Notifications', 'Future Enhancements', 'Conclusion & Bibliography'];
    items.forEach((label, i) => {
        const col = i < 5 ? 0 : 1, row = i < 5 ? i : i - 5;
        const x = 0.3 + col * 6.55, y = 1.35 + row * 1.15;
        glassCard(s, x, y, 6.2, 0.92, { accentTop: false });
        s.addShape(pptx.ShapeType.rect, { x, y, w: 0.75, h: 0.92, fill: { type: 'solid', color: C.neon }, rectRadius: 0.1 });
        s.addText(String(i + 1).padStart(2, '0'), { x, y, w: 0.75, h: 0.92, align: 'center', valign: 'middle', fontSize: 18, bold: true, color: C.white, fontFace: 'Segoe UI' });
        s.addText(label, { x: x + 0.88, y: y + 0.15, w: 5.1, h: 0.6, fontSize: 15, bold: true, color: C.offwhite, fontFace: 'Segoe UI', valign: 'middle' });
    });
}

// ═══════════ SECTION + INTRODUCTION ═══════════════════════════════════════════
sectionDivider('Introduction', '01');
{
    const s = pptx.addSlide(); premiumBg(s);
    sectionTitle(s, 'Introduction', 'Understanding the problem & solution');
    // Left card
    glassCard(s, 0.3, 1.3, 6.2, 5.5, { accent: C.cyan });
    s.addText('What is Smart Rental Management?', { x: 0.5, y: 1.45, w: 5.8, h: 0.45, fontSize: 16, bold: true, color: C.cyan, fontFace: 'Segoe UI' });
    const leftPts = ['Digital platform for property owners to manage tenants & payments', 'Replaces manual records with automated processes', 'Real-time tracking of dues, complaints & notices', 'Centralized communication between landlords & tenants'];
    leftPts.forEach((p, i) => {
        iconCircle(s, 0.5, 2.15 + i * 1.05, ['🏠','⚡','📊','💬'][i], C.neon);
        s.addText(p, { x: 1.35, y: 2.15 + i * 1.05, w: 4.95, h: 0.7, fontSize: 12.5, color: C.offwhite, fontFace: 'Segoe UI', valign: 'middle' });
    });
    // Right card
    glassCard(s, 6.8, 1.3, 6.2, 5.5, { accent: C.red });
    s.addText('Problems Without Digital Systems', { x: 7.0, y: 1.45, w: 5.8, h: 0.45, fontSize: 16, bold: true, color: C.red, fontFace: 'Segoe UI' });
    const rightPts = ['Paper-based records — error-prone & slow', 'Rent disputes & tracking failures', 'No centralized complaint system', 'No transparency for tenants on dues & rules'];
    rightPts.forEach((p, i) => {
        iconCircle(s, 7.0, 2.15 + i * 1.05, ['📝','⚠️','🚫','🔒'][i], C.red);
        s.addText(p, { x: 7.85, y: 2.15 + i * 1.05, w: 4.95, h: 0.7, fontSize: 12.5, color: C.offwhite, fontFace: 'Segoe UI', valign: 'middle' });
    });
}

// ═══════════ SECTION + OBJECTIVES ═════════════════════════════════════════════
sectionDivider('Objectives', '02');
{
    const s = pptx.addSlide(); premiumBg(s);
    sectionTitle(s, 'Objectives', 'What our system aims to achieve');
    const objs = [
        { icon: '🔍', title: 'Easy Property Browsing', desc: 'Search by city, GPS location, price range filters', color: C.cyan },
        { icon: '👥', title: 'Owner-Tenant Management', desc: 'Multi-property, unit management, tenant tracking', color: C.purple },
        { icon: '✅', title: 'Request & Approval Flow', desc: 'Document upload, owner review, one-click approval', color: C.green },
        { icon: '💳', title: 'Payment Simulation', desc: 'UPI, Card, Net Banking with QR code & transaction IDs', color: C.orange },
        { icon: '🔔', title: 'Smart Notifications', desc: 'Auto reminders: 5-day, 2-day, due-date, overdue alerts', color: C.magenta },
        { icon: '📄', title: 'Document System', desc: 'Cloudinary-based ID proof upload with validation', color: C.neon },
    ];
    objs.forEach((o, i) => {
        const col = i % 3, row = Math.floor(i / 3);
        const x = 0.25 + col * 4.35, y = 1.35 + row * 2.8;
        glassCard(s, x, y, 4.1, 2.5, { accent: o.color });
        iconCircle(s, x + 0.2, y + 0.25, o.icon, o.color);
        s.addText(o.title, { x: x + 1.05, y: y + 0.25, w: 2.85, h: 0.5, fontSize: 14, bold: true, color: C.white, fontFace: 'Segoe UI', valign: 'middle' });
        s.addShape(pptx.ShapeType.rect, { x: x + 0.15, y: y + 0.85, w: 3.8, h: 0.02, fill: { type: 'solid', color: C.border } });
        s.addText(o.desc, { x: x + 0.15, y: y + 1.0, w: 3.8, h: 1.3, fontSize: 12, color: C.muted, fontFace: 'Segoe UI', valign: 'top' });
    });
}

// ═══════════ SECTION + REQUIREMENTS ═══════════════════════════════════════════
sectionDivider('Tech Stack & Requirements', '03');
{
    const s = pptx.addSlide(); premiumBg(s);
    sectionTitle(s, 'Hardware & Software', 'Technology stack powering the system');
    // Hardware
    glassCard(s, 0.3, 1.3, 6.2, 5.5, { accent: C.cyan });
    s.addText('Hardware', { x: 0.5, y: 1.45, w: 5.8, h: 0.42, fontSize: 16, bold: true, color: C.cyan, fontFace: 'Segoe UI' });
    [['🖥️','Device','Laptop/PC, 4GB+ RAM'],['⚙️','Processor','Intel i3 / Ryzen 3+'],['💾','Storage','256GB SSD/HDD'],['🌐','Internet','Broadband/WiFi'],['🖥️','Display','1280×720+']].forEach((h, i) => {
        const y = 2.05 + i * 0.85;
        iconCircle(s, 0.5, y, h[0], C.cyan);
        s.addText(h[1], { x: 1.35, y, w: 1.8, h: 0.5, fontSize: 12, bold: true, color: C.white, fontFace: 'Segoe UI', valign: 'middle' });
        s.addText(h[2], { x: 3.1, y, w: 3.2, h: 0.5, fontSize: 12, color: C.muted, fontFace: 'Segoe UI', valign: 'middle' });
    });
    // Software
    glassCard(s, 6.8, 1.3, 6.2, 5.5, { accent: C.purple });
    s.addText('Software Stack', { x: 7.0, y: 1.45, w: 5.8, h: 0.42, fontSize: 16, bold: true, color: C.purple, fontFace: 'Segoe UI' });
    [['⚛️','React.js + TypeScript','Frontend framework'],['🔥','Firebase','Auth + Firestore DB'],['☁️','Cloudinary','Image/Doc uploads'],['⚡','Vite','Build tool'],['▲','Vercel','Deployment'],['💙','VS Code','IDE']].forEach((sw, i) => {
        const y = 2.05 + i * 0.78;
        iconCircle(s, 7.0, y, sw[0], C.purple);
        s.addText(sw[1], { x: 7.85, y, w: 2.8, h: 0.38, fontSize: 13, bold: true, color: C.white, fontFace: 'Segoe UI', valign: 'middle' });
        s.addText(sw[2], { x: 7.85, y: y + 0.35, w: 4.8, h: 0.3, fontSize: 11, color: C.muted, fontFace: 'Segoe UI' });
    });
}

// ═══════════ SECTION + FEATURES ═══════════════════════════════════════════════
sectionDivider('Features Overview', '04');
{
    const s = pptx.addSlide(); premiumBg(s);
    sectionTitle(s, 'Key Features', 'What makes this system powerful');
    const feats = [
        { icon: '🏢', title: 'Property Listing', desc: 'Add properties with images, units, pricing', color: C.cyan },
        { icon: '🔍', title: 'Search & Filter', desc: 'City, GPS, price range, popular cities', color: C.purple },
        { icon: '✅', title: 'Request & Approval', desc: 'Apply with docs, owner reviews', color: C.green },
        { icon: '💳', title: 'Payment Gateway', desc: 'UPI, Card, Net Banking, QR code', color: C.orange },
        { icon: '📊', title: 'Rent Tracking', desc: 'Pending/Paid/Overdue + late fees', color: C.neon },
        { icon: '⏰', title: 'Auto Reminders', desc: '5-day, 2-day, due-date alerts', color: C.magenta },
        { icon: '📁', title: 'Document Upload', desc: 'ID proof via Cloudinary', color: C.cyan },
        { icon: '🛡️', title: 'Admin Panel', desc: 'Property approval, user mgmt', color: C.gold },
    ];
    feats.forEach((f, i) => {
        const col = i % 4, row = Math.floor(i / 4);
        const x = 0.2 + col * 3.28, y = 1.3 + row * 2.85;
        glassCard(s, x, y, 3.05, 2.55, { accent: f.color });
        iconCircle(s, x + 1.15, y + 0.2, f.icon, f.color);
        s.addText(f.title, { x: x + 0.1, y: y + 1.0, w: 2.85, h: 0.45, fontSize: 13.5, bold: true, color: C.white, fontFace: 'Segoe UI', align: 'center' });
        s.addShape(pptx.ShapeType.rect, { x: x + 0.3, y: y + 1.5, w: 2.45, h: 0.02, fill: { type: 'solid', color: C.border } });
        s.addText(f.desc, { x: x + 0.1, y: y + 1.6, w: 2.85, h: 0.8, fontSize: 11.5, color: C.muted, fontFace: 'Segoe UI', valign: 'top', align: 'center' });
    });
}

// ═══════════ SECTION + SCREENSHOTS ════════════════════════════════════════════
sectionDivider('App Screenshots', '05');
const screens = [
    { title: 'Owner Panel', sub: 'Property management, tenant overview, financial reports', pills: ['Dashboard','Properties','Tenants','Rent Records','Finances','Notices'] },
    { title: 'Tenant Dashboard', sub: 'Browse properties, apply with documents, track rent status', pills: ['Search','Filter','Apply','Documents','Rent Status','Profile'] },
    { title: 'Payment System', sub: 'UPI, Card, Net Banking with QR code and transaction tracking', pills: ['UPI Pay','Card','Net Banking','QR Code','Transaction ID','Success'] },
    { title: 'Notifications & Reminders', sub: 'Auto rent reminders, overdue alerts, type-based badges', pills: ['5-Day Alert','2-Day Alert','Due Today','Overdue','Mark Read','Badges'] },
    { title: 'Property Search & Filters', sub: 'City search, GPS location, price range, popular cities', pills: ['City Search','GPS Detect','Price Range','Popular','Filter Tags','Results'] },
];
screens.forEach(sc => {
    const s = pptx.addSlide(); premiumBg(s);
    sectionTitle(s, sc.title, sc.sub);
    deviceFrame(s, 1.5, 1.5, 10.33, 4.8, sc.title);
    sc.pills.forEach((p, i) => {
        const x = 0.3 + i * 2.12;
        s.addShape(pptx.ShapeType.rect, { x, y: 6.6, w: 2.0, h: 0.42, fill: { type: 'solid', color: C.card }, line: { color: C.border }, rectRadius: 0.1 });
        s.addText(p, { x, y: 6.6, w: 2.0, h: 0.42, align: 'center', valign: 'middle', fontSize: 10, color: C.cyan, fontFace: 'Segoe UI', bold: true });
    });
});

// ═══════════ LANDING PAGE PREVIEW ════════════════════════════════════════════
{
    const s = pptx.addSlide(); premiumBg(s);
    sectionTitle(s, 'Landing Page Preview', 'User-friendly homepage with property browsing and filters');
    // Glowing frame
    s.addShape(pptx.ShapeType.rect, { x: 1.2, y: 1.45, w: 10.93, h: 5.2, fill: { type: 'solid', color: C.neon }, rectRadius: 0.2,
        shadow: { type: 'outer', blur: 20, offset: 0, color: C.neon, opacity: 0.3 } });
    s.addShape(pptx.ShapeType.rect, { x: 1.25, y: 1.5, w: 10.83, h: 5.1, fill: { type: 'solid', color: C.bg3 }, rectRadius: 0.18, line: { color: C.border } });
    s.addText('[ Insert Landing Page Screenshot ]', { x: 1.25, y: 2.8, w: 10.83, h: 1.5, align: 'center', valign: 'middle', fontSize: 20, bold: true, color: C.border, fontFace: 'Segoe UI' });
    s.addText('Clean, modern homepage • Property browsing • Role-based login', { x: 1.25, y: 4.3, w: 10.83, h: 0.6, align: 'center', fontSize: 12, color: C.muted, fontFace: 'Segoe UI', italic: true });
}

// ═══════════ SECTION + FUTURE ════════════════════════════════════════════════
sectionDivider('Future Enhancements', '06');
{
    const s = pptx.addSlide(); premiumBg(s);
    sectionTitle(s, 'Future Enhancements', 'Where this system is heading next');
    const futures = [
        { icon: '💳', title: 'Razorpay / Stripe', desc: 'Live rent collection with receipts', color: C.green },
        { icon: '🤖', title: 'AI Recommendations', desc: 'ML-based property suggestions', color: C.purple },
        { icon: '💬', title: 'In-App Chat', desc: 'Real-time owner-tenant messaging', color: C.cyan },
        { icon: '📱', title: 'Mobile App', desc: 'React Native for iOS & Android', color: C.neon },
        { icon: '📈', title: 'Advanced Analytics', desc: 'Income trends, occupancy forecasting', color: C.orange },
        { icon: '🗓️', title: 'SMS/Email Automation', desc: 'Server-side scheduled reminders', color: C.magenta },
    ];
    futures.forEach((f, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const x = 0.3 + col * 6.55, y = 1.35 + row * 1.85;
        glassCard(s, x, y, 6.2, 1.6, { accent: f.color });
        iconCircle(s, x + 0.2, y + 0.35, f.icon, f.color);
        s.addText(f.title, { x: x + 1.05, y: y + 0.2, w: 4.95, h: 0.42, fontSize: 15, bold: true, color: C.white, fontFace: 'Segoe UI' });
        s.addText(f.desc, { x: x + 1.05, y: y + 0.65, w: 4.95, h: 0.7, fontSize: 12, color: C.muted, fontFace: 'Segoe UI', valign: 'top' });
    });
}

// ═══════════ SECTION + SYSTEM DESIGN ════════════════════════════════════════════
sectionDivider('System Design & Architecture', '07');

// ─── DFD SLIDE ───
{
    const s = pptx.addSlide(); premiumBg(s);
    sectionTitle(s, 'Data Flow Diagram (DFD)', 'High-level information flow between entities');
    
    // System (Center)
    glassCard(s, 5.0, 3.0, 3.33, 1.6, { accent: C.cyan, fill: C.cardLight });
    s.addText('RentEase System', { x: 5.0, y: 3.4, w: 3.33, h: 0.8, align: 'center', fontSize: 18, bold: true, color: C.cyan, fontFace: 'Segoe UI' });

    // Owner (Left)
    glassCard(s, 0.5, 3.0, 2.5, 1.6, { accent: C.purple });
    s.addText('Owner', { x: 0.5, y: 3.0, w: 2.5, h: 1.6, align: 'center', fontSize: 16, bold: true, color: C.purple, fontFace: 'Segoe UI' });

    // Admin (Right)
    glassCard(s, 10.33, 3.0, 2.5, 1.6, { accent: C.orange });
    s.addText('Admin', { x: 10.33, y: 3.0, w: 2.5, h: 1.6, align: 'center', fontSize: 16, bold: true, color: C.orange, fontFace: 'Segoe UI' });

    // Tenant (Bottom)
    glassCard(s, 5.0, 5.8, 3.33, 1.2, { accent: C.green });
    s.addText('Tenant', { x: 5.0, y: 5.8, w: 3.33, h: 1.2, align: 'center', fontSize: 16, bold: true, color: C.green, fontFace: 'Segoe UI' });

    // Arrows: Owner <-> System
    s.addShape(pptx.ShapeType.rightArrow, { x: 3.1, y: 3.4, w: 1.8, h: 0.15, fill: { color: C.purple } });
    s.addText('Properties, Approvals', { x: 3.1, y: 3.1, w: 1.8, h: 0.3, align: 'center', fontSize: 10, color: C.muted });
    
    s.addShape(pptx.ShapeType.leftArrow, { x: 3.1, y: 4.0, w: 1.8, h: 0.15, fill: { color: C.purple } });
    s.addText('Payments, Notices', { x: 3.1, y: 4.25, w: 1.8, h: 0.3, align: 'center', fontSize: 10, color: C.muted });

    // Arrows: System <-> Admin  
    s.addShape(pptx.ShapeType.rightArrow, { x: 8.43, y: 3.4, w: 1.8, h: 0.15, fill: { color: C.orange } });
    s.addText('System Logs, Content', { x: 8.43, y: 3.1, w: 1.8, h: 0.3, align: 'center', fontSize: 10, color: C.muted });

    s.addShape(pptx.ShapeType.leftArrow, { x: 8.43, y: 4.0, w: 1.8, h: 0.15, fill: { color: C.orange } });
    s.addText('Settings, Reports', { x: 8.43, y: 4.25, w: 1.8, h: 0.3, align: 'center', fontSize: 10, color: C.muted });

    // Arrows: System <-> Tenant
    s.addShape(pptx.ShapeType.downArrow, { x: 6.0, y: 4.8, w: 0.15, h: 0.8, fill: { color: C.green } });
    s.addText('Approvals, Dues', { x: 5.0, y: 5.0, w: 0.9, h: 0.3, align: 'right', fontSize: 10, color: C.muted });

    s.addShape(pptx.ShapeType.upArrow, { x: 7.18, y: 4.8, w: 0.15, h: 0.8, fill: { color: C.green } });
    s.addText('Requests, Rent', { x: 7.43, y: 5.0, w: 0.9, h: 0.3, align: 'left', fontSize: 10, color: C.muted });
}

// ─── ER DIAGRAM SLIDE ───
{
    const s = pptx.addSlide(); premiumBg(s);
    sectionTitle(s, 'Entity Relationship (ER) Diagram', 'Database definitions and their associations');

    // Box: Users (Center)
    glassCard(s, 5.4, 3.2, 2.5, 1.2, { accent: C.cyan, fill: C.cardLight });
    s.addText('Users', { x: 5.4, y: 3.2, w: 2.5, h: 1.2, align: 'center', fontSize: 16, bold: true, color: C.cyan, fontFace: 'Segoe UI' });

    // Box: Properties (Top)
    glassCard(s, 5.4, 1.2, 2.5, 1.2, { accent: C.purple });
    s.addText('Properties', { x: 5.4, y: 1.2, w: 2.5, h: 1.2, align: 'center', fontSize: 15, bold: true, color: C.white, fontFace: 'Segoe UI' });

    // Box: Payments (Bottom)
    glassCard(s, 5.4, 5.2, 2.5, 1.2, { accent: C.green });
    s.addText('Payments', { x: 5.4, y: 5.2, w: 2.5, h: 1.2, align: 'center', fontSize: 15, bold: true, color: C.white, fontFace: 'Segoe UI' });

    // Box: Requests (Left)
    glassCard(s, 1.5, 3.2, 2.5, 1.2, { accent: C.orange });
    s.addText('Requests', { x: 1.5, y: 3.2, w: 2.5, h: 1.2, align: 'center', fontSize: 15, bold: true, color: C.white, fontFace: 'Segoe UI' });

    // Box: Notifications (Right)
    glassCard(s, 9.3, 3.2, 2.5, 1.2, { accent: C.magenta });
    s.addText('Notifications', { x: 9.3, y: 3.2, w: 2.5, h: 1.2, align: 'center', fontSize: 15, bold: true, color: C.white, fontFace: 'Segoe UI' });

    // Users to Properties (Up)
    s.addShape(pptx.ShapeType.upArrow, { x: 6.55, y: 2.5, w: 0.15, h: 0.6, fill: { color: C.purple } });
    s.addText('Owns / Rents', { x: 6.8, y: 2.6, w: 1.5, h: 0.3, fontSize: 10, color: C.muted });

    // Users to Payments (Down)
    s.addShape(pptx.ShapeType.downArrow, { x: 6.55, y: 4.5, w: 0.15, h: 0.6, fill: { color: C.green } });
    s.addText('Transactions', { x: 6.8, y: 4.6, w: 1.5, h: 0.3, fontSize: 10, color: C.muted });

    // Users to Requests (Left)
    s.addShape(pptx.ShapeType.leftArrow, { x: 4.2, y: 3.75, w: 1.0, h: 0.15, fill: { color: C.orange } });
    s.addText('Creates', { x: 4.2, y: 3.45, w: 1.0, h: 0.3, align: 'center', fontSize: 10, color: C.muted });

    // Users to Notifications (Right)
    s.addShape(pptx.ShapeType.rightArrow, { x: 8.1, y: 3.75, w: 1.0, h: 0.15, fill: { color: C.magenta } });
    s.addText('Receives', { x: 8.1, y: 3.45, w: 1.0, h: 0.3, align: 'center', fontSize: 10, color: C.muted });
}

// ─── SYSTEM ARCHITECTURE SLIDE ───
{
    const s = pptx.addSlide(); premiumBg(s);
    sectionTitle(s, 'System Architecture', 'Modern tech stack and cloud deployment');

    // Vercel / Cloud Background box
    s.addShape(pptx.ShapeType.rect, { x: 1.0, y: 2.0, w: 11.3, h: 4.5, fill: { type: 'solid', color: C.bg3 }, line: { color: C.border, dashType: 'dash', pt: 2 }, rectRadius: 0.1 });
    s.addText('▲ Vercel Cloud Deployment', { x: 1.0, y: 2.1, w: 11.3, h: 0.4, align: 'center', fontSize: 14, bold: true, color: C.muted, fontFace: 'Segoe UI' });

    // Frontend
    glassCard(s, 1.5, 3.0, 2.8, 2.0, { accent: C.cyan });
    iconCircle(s, 2.55, 3.3, '⚛️', C.cyan);
    s.addText('Frontend', { x: 1.5, y: 4.2, w: 2.8, h: 0.4, align: 'center', fontSize: 16, bold: true, color: C.white, fontFace: 'Segoe UI' });
    s.addText('React • Vite • Tailwind', { x: 1.5, y: 4.5, w: 2.8, h: 0.3, align: 'center', fontSize: 10, color: C.offwhite, fontFace: 'Segoe UI' });

    // Backend
    glassCard(s, 5.25, 3.0, 2.8, 2.0, { accent: C.orange });
    iconCircle(s, 6.3, 3.3, '🔥', C.orange);
    s.addText('Backend / Auth', { x: 5.25, y: 4.2, w: 2.8, h: 0.4, align: 'center', fontSize: 16, bold: true, color: C.white, fontFace: 'Segoe UI' });
    s.addText('Firebase • Firestore', { x: 5.25, y: 4.5, w: 2.8, h: 0.3, align: 'center', fontSize: 10, color: C.offwhite, fontFace: 'Segoe UI' });

    // Storage
    glassCard(s, 9.0, 3.0, 2.8, 2.0, { accent: C.purple });
    iconCircle(s, 10.05, 3.3, '☁️', C.purple);
    s.addText('Media Storage', { x: 9.0, y: 4.2, w: 2.8, h: 0.4, align: 'center', fontSize: 16, bold: true, color: C.white, fontFace: 'Segoe UI' });
    s.addText('Cloudinary API', { x: 9.0, y: 4.5, w: 2.8, h: 0.3, align: 'center', fontSize: 10, color: C.offwhite, fontFace: 'Segoe UI' });

    // Arrows
    s.addShape(pptx.ShapeType.leftRightArrow, { x: 4.4, y: 3.95, w: 0.75, h: 0.15, fill: { color: C.neon } });
    s.addShape(pptx.ShapeType.leftRightArrow, { x: 8.15, y: 3.95, w: 0.75, h: 0.15, fill: { color: C.neon } });
}

// ═══════════ CONCLUSION ══════════════════════════════════════════════════════
{
    const s = pptx.addSlide(); premiumBg(s);
    s.addShape(pptx.ShapeType.ellipse, { x: 9.5, y: 0.5, w: 5, h: 5, fill: { type: 'solid', color: C.bg3 }, line: { color: C.bg3 } });
    s.addShape(pptx.ShapeType.ellipse, { x: 10.3, y: 1.3, w: 3, h: 3, fill: { type: 'solid', color: '1E1B4B' }, line: { color: '1E1B4B' } });
    s.addText('✅', { x: 10.5, y: 1.5, w: 2.6, h: 2.6, fontSize: 52, align: 'center', valign: 'middle', fontFace: 'Segoe UI' });
    s.addShape(pptx.ShapeType.rect, { x: 0.3, y: 0.35, w: 0.06, h: 0.65, fill: { type: 'solid', color: C.cyan } });
    s.addText('Conclusion', { x: 0.5, y: 0.3, w: 9, h: 0.75, fontSize: 30, bold: true, color: C.cyan, fontFace: 'Segoe UI' });
    s.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.1, w: 4, h: 0.04, fill: { type: 'solid', color: C.neon } });
    const pts = [
        'Simplifies the entire rental lifecycle — listing to payment.',
        'Eliminates paperwork with automated rent cycles & late fees.',
        'Improves transparency through real-time notifications.',
        'Scalable architecture — ready for real payment gateways.',
        'Modern tech stack ensures reliability & security.',
    ];
    pts.forEach((p, i) => {
        s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.35 + i * 1.0, w: 0.05, h: 0.72, fill: { type: 'solid', color: C.cyan } });
        s.addText(p, { x: 0.6, y: 1.35 + i * 1.0, w: 8.5, h: 0.78, fontSize: 13.5, color: C.offwhite, valign: 'middle', fontFace: 'Segoe UI' });
    });
}

// ═══════════ BIBLIOGRAPHY ════════════════════════════════════════════════════
{
    const s = pptx.addSlide(); premiumBg(s);
    sectionTitle(s, 'Bibliography', 'Sources & References');
    const refs = [
        ['Firebase Docs', 'firebase.google.com/docs'], ['React Documentation', 'react.dev'], ['Cloudinary Docs', 'cloudinary.com/documentation'],
        ['TypeScript Handbook', 'typescriptlang.org/docs'], ['Vite Documentation', 'vitejs.dev'], ['Vercel Docs', 'vercel.com/docs'], ['Stack Overflow', 'stackoverflow.com'],
    ];
    refs.forEach((r, i) => {
        const y = 1.35 + i * 0.78;
        glassCard(s, 0.3, y, 12.7, 0.65, { accentTop: false });
        s.addShape(pptx.ShapeType.rect, { x: 0.3, y, w: 0.65, h: 0.65, fill: { type: 'solid', color: C.neon }, rectRadius: 0.08 });
        s.addText(`[${i+1}]`, { x: 0.3, y, w: 0.65, h: 0.65, align: 'center', valign: 'middle', fontSize: 12, bold: true, color: C.white, fontFace: 'Segoe UI' });
        s.addText(r[0], { x: 1.1, y: y + 0.08, w: 4, h: 0.5, fontSize: 14, bold: true, color: C.white, fontFace: 'Segoe UI', valign: 'middle' });
        s.addText(r[1], { x: 5.5, y: y + 0.08, w: 7.3, h: 0.5, fontSize: 12, color: C.muted, fontFace: 'Segoe UI', valign: 'middle', italic: true });
    });
}

// ═══════════ THANK YOU ═══════════════════════════════════════════════════════
{
    const s = pptx.addSlide();
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { type: 'solid', color: C.bg1 } });
    s.addShape(pptx.ShapeType.ellipse, { x: -2, y: 4, w: 6, h: 6, fill: { type: 'solid', color: C.bg3 }, line: { color: C.bg3 } });
    s.addShape(pptx.ShapeType.ellipse, { x: 9.5, y: -1.5, w: 5.5, h: 5.5, fill: { type: 'solid', color: C.bg2 }, line: { color: C.bg2 } });
    s.addShape(pptx.ShapeType.ellipse, { x: 10.2, y: -0.8, w: 4, h: 4, fill: { type: 'solid', color: '1E1B4B' }, line: { color: '1E1B4B' } });
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.05, fill: { type: 'solid', color: C.neon } });
    s.addText('Thank You!', { x: 0, y: 1.5, w: '100%', h: 1.8, align: 'center', fontSize: 68, bold: true, color: C.white, fontFace: 'Segoe UI',
        glow: { size: 10, color: C.neon, opacity: 0.4 } });
    s.addText('Smart Rental Property Management System', { x: 0, y: 3.4, w: '100%', h: 0.6, align: 'center', fontSize: 18, color: C.cyan, fontFace: 'Segoe UI', italic: true });
    s.addShape(pptx.ShapeType.rect, { x: 3.8, y: 4.15, w: 5.73, h: 0.04, fill: { type: 'solid', color: C.neon } });
    s.addText('Questions & Feedback are Welcome', { x: 0, y: 4.4, w: '100%', h: 0.5, align: 'center', fontSize: 16, color: C.gold, fontFace: 'Segoe UI', bold: true });
    s.addText('Presented by: Mohammad Mojahid  |  B.Tech CSE — 6th Semester', { x: 0, y: 6.8, w: '100%', h: 0.4, align: 'center', fontSize: 11, color: C.subtle, fontFace: 'Segoe UI' });
}

// ─── SAVE ────────────────────────────────────────────────────────────────────
pptx.writeFile({ fileName: 'Smart Rental Premium Updated.pptx' })
    .then(() => console.log('✅ Premium presentation saved: Smart Rental Premium Updated.pptx'))
    .catch(err => console.error('❌ Error:', err));
