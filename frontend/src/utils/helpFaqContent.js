const STUDENT_TOPICS = [
  { id: 'general', title: 'General Info', icon: 'fa-regular fa-file-lines', desc: 'General information about the grievance portal', count: '4 FAQs' },
  { id: 'submitting', title: 'Grievance Submission', icon: 'fa-solid fa-pen-nib', desc: 'Rules and requirements for submitting a grievance', count: '7 FAQs' },
  { id: 'tracking', title: 'Tracking & Workflow', icon: 'fa-regular fa-clipboard', desc: 'Understanding ticket statuses, feedback, and reopening', count: '4 FAQs' },
  { id: 'sla-priority', title: 'SLAs & Priorities', icon: 'fa-solid fa-clock-rotate-left', desc: 'SLA due dates and urgency calculations', count: '4 FAQs' },
  { id: 'account', title: 'Account Settings', icon: 'fa-regular fa-user', desc: 'Managing your profile and credentials securely', count: '3 FAQs' },
];

const STUDENT_FAQS = [
  { topicId: 'general', q: 'What is the Institutional Grievance Portal?', a: 'The Grievance Portal is an online platform that allows students to submit official complaints, track their resolution timeline, interact with assigned handlers, and secure resolutions in a transparent, accountable manner.' },
  { topicId: 'general', q: 'Who is authorized to use the Grievance Portal?', a: 'All registered students of the institution can log in to submit grievances, check status updates, and update their profiles. Staff, Faculty, HODs, Superintendents, and Administrators use their respective dashboards to address assignments.' },
  { topicId: 'general', q: 'Is my grievance submission confidential?', a: 'Yes. All information, remarks, and documents associated with your grievance are only visible to you, the assigned resolver(s), and the system administrators.' },
  { topicId: 'general', q: 'How does the automatic assignment of grievances work?', a: 'Grievances are auto-assigned to specific resolving authorities (such as HODs, Caretakers, or Superintendents) dynamically upon creation, depending on the chosen category, sub-category, department, and hostel rules.' },
  { topicId: 'submitting', q: 'What are the two primary types of grievances I can submit?', a: 'Grievances are categorized into Academic (related to Departments, Courses, Scholarships, Library, etc.) and Hostel (related to Infrastructure, Water/Electricity Supply, Mess, Safety, Room Allotment, etc.).' },
  { topicId: 'submitting', q: 'Why are hostel details disabled when I select an Academic category?', a: 'Academic grievances are routed strictly to Academic departments and officials. Since hostel details are irrelevant to academic workflows, they are automatically disabled and not required.' },
  { topicId: 'submitting', q: 'Why are department details disabled when I select a Hostel category?', a: 'Hostel grievances are routed to hostel administrative staff (Caretaker, Superintendent). Academic department details are irrelevant to hostel infrastructure issues, so they are disabled.' },
  { topicId: 'submitting', q: 'What are the rules for submitting a Scholarship grievance?', a: 'Scholarship grievances require: (1) Entering your scholarship application date, (2) Attaching a PDF or image file as proof of application. Note that you can only submit a scholarship grievance if at least 60 days have passed since your application date, as normal processing takes up to 60 days.' },
  { topicId: 'submitting', q: 'Are there any restrictions on files I can upload as attachments?', a: 'Yes. You can upload files to serve as evidence or proof. The system accepts PDF documents and images in JPG, JPEG, and PNG formats. File sizes must be within the system limits.' },
  { topicId: 'submitting', q: 'How do I submit a grievance?', a: 'Navigate to "Submit Grievance" from your sidebar, fill in all mandatory fields (subject, description, type, category, subcategory, and department/hostel details), attach any proof if necessary, and click "Submit Grievance".' },
  { topicId: 'submitting', q: 'What is a Ticket Number?', a: 'Upon successful submission, the system generates a unique identifier (e.g. GRV-XXXXXX-XXXX) for your grievance. You can use this ticket number to search, track, or reference your case in communications.' },
  { topicId: 'tracking', q: 'What do the different ticket status labels mean?', a: '• Submitted: Grievance is logged but not yet reviewed.\n• Under Review: The assigned employee has opened and is evaluating the ticket.\n• Assigned: The ticket has been routed to a resolver.\n• Work in Progress: The resolver is actively working on the solution.\n• Resolved: The resolver has fixed the issue and provided remarks.\n• Closed: The grievance is completed and finalized.' },
  { topicId: 'tracking', q: 'Where do I find all my submitted grievances?', a: 'You can find them by clicking "My Grievances" in the sidebar. This page lists all your active and closed tickets and lets you click "View Details" to see logs, comments, and attachments.' },
  { topicId: 'tracking', q: 'Can I reopen a grievance if I am unsatisfied with the resolution?', a: 'Yes. If a resolver marks your grievance as "Resolved" but the issue remains unresolved or unsatisfactory, you can click "Reopen Grievance" on the details page. This changes the status back to Reopened so they can address it further.' },
  { topicId: 'tracking', q: 'How will I receive updates on my grievance?', a: 'You will receive real-time notifications in your "Notifications" sidebar tab. Additionally, automated email updates are sent to your registered email address whenever your grievance status changes.' },
  { topicId: 'sla-priority', q: 'How is the priority of my grievance calculated?', a: 'Priority is calculated automatically based on system rules:\n• Emergency (24-hour SLA): Set automatically if the hostel is designated as a Special Hostel (requiring immediate attention).\n• Urgent (36-hour SLA): Set automatically for safety, security, or violence/harassment-related categories.\n• Routine (72-hour SLA): Default priority for standard infrastructure, academic, or administrative complaints.' },
  { topicId: 'sla-priority', q: 'What is the Service Level Agreement (SLA) due date?', a: 'The SLA due date ("Due By" in your table) is the deadline by which the university commits to resolving your grievance. It is calculated automatically at submission based on the ticket priority (24 hours for Emergency, 36 hours for Urgent, 72 hours for Routine).' },
  { topicId: 'sla-priority', q: 'What happens if a resolver fails to meet the SLA due date?', a: 'If a grievance is not resolved before the SLA due date passes, the system flags the ticket as "Overdue" so administrators and assigned staff can prioritize it for immediate attention.' },
  { topicId: 'sla-priority', q: 'Where can I see the SLA details of my ticket?', a: 'When viewing a specific grievance, the details page displays the SLA status (e.g., On Time or Overdue) and the exact date and time it is due.' },
  { topicId: 'account', q: 'How do I update my profile details?', a: 'Click the "Profile" tab in your sidebar. From here, you can view your student details (roll number, hostel, room, department) and update contact details or upload a profile picture.' },
  { topicId: 'account', q: 'What should I do if my hostel or department details are incorrect?', a: 'If your core academic or residential details are incorrect, please contact the administrator or the IT Help Desk to update them in the main institutional registry.' },
  { topicId: 'account', q: 'How do I change my password?', a: 'You can change your password by navigating to the "Profile" page, scrolling to the security section, entering your current password, and setting a strong new password.' },
];

const ADMIN_TOPICS = [
  { id: 'general', title: 'Admin Overview', icon: 'fa-solid fa-gauge-high', desc: 'General dashboard and SLA tracking', count: '2 FAQs' },
  { id: 'management', title: 'Grievance Management', icon: 'fa-solid fa-layer-group', desc: 'Rules, categories, and assignments', count: '1 FAQs' },
  { id: 'users', title: 'User Access Control', icon: 'fa-solid fa-users-gear', desc: 'Managing students, HODs, and Officers', count: '2 FAQs' },
  { id: 'reporting', title: 'Data & Reporting', icon: 'fa-solid fa-chart-pie', desc: 'Analytics, exports, and automated reports', count: '2 FAQs' },
  { id: 'system', title: 'System Settings', icon: 'fa-solid fa-sliders', desc: 'Portal configuration and announcements', count: '1 FAQs' },
];

const ADMIN_FAQS = [
  { topicId: 'general', q: 'How does the automated SLA tracking work?', a: 'The system automatically tracks the time since a grievance was assigned. If no action is taken within the defined SLA hours (e.g., 48 hours for High Priority), it is flagged and an alert is sent.' },
  { topicId: 'general', q: 'Can I reassign a grievance to another department?', a: 'Yes, as an admin, you can reassign any grievance by opening the grievance detail view and selecting a new department from the assignment dropdown.' },
  { topicId: 'management', q: 'How do I add a new grievance category?', a: 'Go to the Category Manager from the sidebar. Click "Add Category", provide the name, SLA duration, and assign the default handler (HOD or Officer).' },
  { topicId: 'users', q: 'How do I create a new HOD or Officer account?', a: 'Navigate to Manage Users, click "Add New User", fill in their details, and select the appropriate role (HOD/Officer) and their respective department.' },
  { topicId: 'users', q: 'Can I suspend a user account?', a: 'Yes, you can temporarily disable any user account from the Manage Users tab by toggling their active status. They will not be able to log in until re-enabled.' },
  { topicId: 'reporting', q: 'How do I export grievance data?', a: 'In the Manage Grievances page, click the "Export" button at the top right. You can choose to export the current view as CSV or Excel.' },
  { topicId: 'reporting', q: 'Are reports generated automatically?', a: 'Weekly and monthly summary reports are generated automatically and sent to the super admin email. You can also generate custom reports manually.' },
  { topicId: 'system', q: 'How do I update the portal announcements?', a: 'System-wide announcements can be added from the Settings page. These will appear as banners on the student and staff dashboards.' },
];

const HOD_TOPICS = [
  { id: 'management', title: 'Ticket Management', icon: 'fa-solid fa-ticket-simple', desc: 'How to manage, assign and resolve grievances', count: '8 FAQs' },
  { id: 'reports', title: 'Reports & Analytics', icon: 'fa-solid fa-chart-line', desc: 'Generate and understand dashboard metrics', count: '5 FAQs' },
  { id: 'communication', title: 'Student Communication', icon: 'fa-regular fa-message', desc: 'Best practices for replying to students', count: '6 FAQs' },
  { id: 'account', title: 'Admin Account', icon: 'fa-regular fa-id-card', desc: 'Manage your officer profile and settings', count: '4 FAQs' },
  { id: 'guidelines', title: 'Resolution Guidelines', icon: 'fa-solid fa-gavel', desc: 'University policies for grievance resolution', count: '7 FAQs' },
];

const HOD_FAQS = [
  { topicId: 'management', q: 'How do I reassign a grievance to another officer?', a: 'Open the grievance detail, and in the "Update Ticket" sidebar, select the desired officer from the "Assign To" dropdown and click "Update Ticket".' },
  { topicId: 'management', q: 'Can I resolve a ticket without a student reply?', a: 'Yes, if the issue is resolved on the university side, you can mark it as resolved. However, it is recommended to leave a final note for the student.' },
  { topicId: 'reports', q: 'How often is the dashboard data updated?', a: 'The dashboard metrics are updated in real-time as grievances are submitted, updated, or resolved.' },
  { topicId: 'communication', q: 'Are my replies visible to other officers?', a: 'Yes, all conversation history is stored and can be audited by the administration to ensure quality resolution.' },
  { topicId: 'guidelines', q: 'What is the standard SLA for academic grievances?', a: 'Most academic grievances should be acknowledged within 24 hours and resolved within 3-5 business days.' },
];

export const HELP_FAQ_BY_ROLE = {
  student: {
    pageClass: 'student-page help-faq-page',
    layout: 'student',
    heroTitle: 'How can we help you today?',
    heroSubtitle: 'Browse help topics below to get started',
    topics: STUDENT_TOPICS,
    faqsList: STUDENT_FAQS,
    supportPath: '/student/support',
    breadcrumbRoot: 'Help & FAQs',
    backLabel: 'Back to FAQs',
  },
  admin: {
    pageClass: 'admin-overview-page help-faq-page',
    layout: 'admin',
    heroTitle: 'Admin Guidelines & FAQs',
    heroSubtitle: 'Comprehensive guide to managing the grievance portal and resolving system queries.',
    topics: ADMIN_TOPICS,
    faqsList: ADMIN_FAQS,
    supportPath: '/admin/support',
    breadcrumbRoot: 'Admin Guidelines',
    backLabel: 'Back to Admin Guidelines',
  },
  hod: {
    pageClass: 'hod-dashboard help-faq-page',
    layout: 'admin',
    heroTitle: 'Admin Help & FAQs',
    heroSubtitle: 'Find quick answers to management questions and portal guidelines.',
    topics: HOD_TOPICS,
    faqsList: HOD_FAQS,
    supportPath: '/staff/support',
    breadcrumbRoot: 'Help & FAQs',
    backLabel: 'Back to Help & FAQs',
  },
  staff: {
    pageClass: 'hod-dashboard help-faq-page',
    layout: 'admin',
    heroTitle: 'Staff Help & FAQs',
    heroSubtitle: 'Find quick answers to management questions and portal guidelines.',
    topics: HOD_TOPICS,
    faqsList: HOD_FAQS,
    supportPath: '/staff/support',
    breadcrumbRoot: 'Help & FAQs',
    backLabel: 'Back to Help & FAQs',
  },
};

export const getHelpFaqConfig = (role) =>
  HELP_FAQ_BY_ROLE[role] || HELP_FAQ_BY_ROLE.staff;
