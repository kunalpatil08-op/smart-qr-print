import { db, uid } from './db.js'

const ago = (mins) => new Date(Date.now() - mins * 60000).toISOString()
const days = (d) => new Date(Date.now() - d * 86400000).toISOString()

export function seedIfEmpty() {
  if (db.read('seeded', false)) {
    // one-time backfill of the agent tables for stores created before they existed
    if (!db.read('agentsSeeded', false)) {
      db.write('agents', db.read('agents', []).length ? db.read('agents', []) : [])
      db.write('agentsSeeded', true)
    }
    return
  }
  db.write('shops', [
    {
      id: 'shop_vertex',
      name: 'Vertex Print Hub',
      ownerName: 'Rahul Mehta',
      ownerEmail: 'owner@vertexprint.in',
      ownerPassword: 'demo1234',
      address: 'Gate 2, College Road, Pune 411001',
      phone: '+91 98220 11223',
      upiId: 'vertexprint@upi',
      open: true,
      rating: 4.8,
      reviews: 412,
      hours: '9:00 AM – 9:00 PM',
      pricing: { bwSingle: 1.5, bwDouble: 1.0, colorSingle: 6, colorDouble: 4.5, a3Multiplier: 2, binding: 15 },
      retentionHours: 24,
    },
  ])

  db.write('printers', [
    { id: 'prn_1', shopId: 'shop_vertex', name: 'HP LaserJet Pro 4001', type: 'B&W Laser', status: 'online', queue: 2, toner: 72 },
    { id: 'prn_2', shopId: 'shop_vertex', name: 'Canon i-SENSYS X', type: 'Colour Laser', status: 'busy', queue: 4, toner: 41 },
    { id: 'prn_3', shopId: 'shop_vertex', name: 'Epson EcoTank L15150', type: 'A3 Colour', status: 'maintenance', queue: 0, toner: 18 },
  ])

  db.write('users', [
    {
      id: 'usr_demo',
      role: 'student',
      name: 'Aarav Sharma',
      email: 'student@demo.com',
      password: 'demo1234',
      college: 'COEP Technological University',
      course: 'B.Tech Computer Engineering',
      year: '3rd Year',
      createdAt: days(60),
      monthlyPrintLimit: 400,
    },
  ])

  db.write('documents', [
    { id: 'doc_1', userId: 'usr_demo', name: 'Data Structures — Unit 3 Notes.pdf', size: 1_840_000, pages: 24, kind: 'pdf', source: 'upload', createdAt: ago(45), expiresAt: days(-1), status: 'stored' },
    { id: 'doc_2', userId: 'usr_demo', name: 'Operating Systems Question Bank.pdf', size: 2_410_000, pages: 38, kind: 'pdf', source: 'upload', createdAt: ago(180), expiresAt: days(-2), status: 'stored' },
    { id: 'doc_3', userId: 'usr_demo', name: 'DBMS Revision Sheet.pdf', size: 420_000, pages: 6, kind: 'pdf', source: 'notes', createdAt: days(2), expiresAt: days(5), status: 'stored' },
    { id: 'doc_4', userId: 'usr_demo', name: 'Digital Electronics Lab Manual.pdf', size: 3_120_000, pages: 52, kind: 'pdf', source: 'upload', createdAt: days(6), expiresAt: days(1), status: 'stored' },
  ])

  db.write('notes', [
    { id: 'note_1', userId: 'usr_demo', title: 'DBMS Normalization — Quick Revision', subject: 'DBMS', style: 'quick-revision', createdAt: days(2), updatedAt: days(2), body: '' },
    { id: 'note_2', userId: 'usr_demo', title: 'OS Scheduling Algorithms', subject: 'Operating Systems', style: 'exam', createdAt: days(9), updatedAt: days(9), body: '' },
  ])

  db.write('conversations', [
    { id: 'conv_1', userId: 'usr_demo', title: 'Explain Deadlock in OS', subject: 'Operating Systems', createdAt: ago(120), updatedAt: ago(118), messages: [
      { id: 'm1', role: 'user', content: 'Explain deadlock in operating systems in simple terms.', createdAt: ago(121) },
      { id: 'm2', role: 'assistant', content: 'A **deadlock** is when a set of processes each hold a resource and wait for one held by another — so none can proceed.\n\n**The four Coffman conditions (all must hold):**\n1. **Mutual exclusion** — a resource is used by one process at a time.\n2. **Hold and wait** — a process holds one resource while waiting for another.\n3. **No preemption** — resources cannot be forcibly taken away.\n4. **Circular wait** — a cycle of processes each waiting on the next.\n\n**Break any one and deadlock is impossible.** Practical fixes: acquire locks in a global order (kills circular wait), use timeouts (kills no-preemption), or run the Banker\u2019s algorithm for safe-state admission.', createdAt: ago(118) },
    ] },
    { id: 'conv_2', userId: 'usr_demo', title: 'Python: recursion vs iteration', subject: 'Programming', createdAt: days(1), updatedAt: days(1), messages: [
      { id: 'm1', role: 'user', content: 'When should I use recursion over iteration in Python?', createdAt: days(1) },
    ] },
  ])

  db.write('orders', [
    { id: 'ord_1042', shopId: 'shop_vertex', userId: 'usr_demo', customerName: 'Aarav Sharma', docName: 'Data Structures — Unit 3 Notes.pdf', pages: 24, copies: 2, color: false, duplex: true, paper: 'A4', binding: true, amount: 51, status: 'completed', createdAt: days(4), updatedAt: days(4), payment: { provider: 'upi', ref: 'UPI-8F21A', verifiedAt: days(4) } },
    { id: 'ord_1043', shopId: 'shop_vertex', userId: 'usr_demo', customerName: 'Aarav Sharma', docName: 'Operating Systems Question Bank.pdf', pages: 38, copies: 1, color: false, duplex: true, paper: 'A4', binding: false, amount: 38, status: 'completed', createdAt: days(2), updatedAt: days(2), payment: { provider: 'upi', ref: 'UPI-2B77C', verifiedAt: days(2) } },
    { id: 'ord_1044', shopId: 'shop_vertex', userId: 'usr_demo', customerName: 'Aarav Sharma', docName: 'Digital Electronics Lab Manual.pdf', pages: 52, copies: 1, color: true, duplex: false, paper: 'A4', binding: true, amount: 327, status: 'printing', createdAt: ago(12), updatedAt: ago(4), payment: { provider: 'upi', ref: 'UPI-91D0E', verifiedAt: ago(10) } },
    { id: 'ord_1045', shopId: 'shop_vertex', userId: 'usr_demo', customerName: 'Aarav Sharma', docName: 'DBMS Revision Sheet.pdf', pages: 6, copies: 3, color: false, duplex: false, paper: 'A4', binding: false, amount: 27, status: 'in_queue', createdAt: ago(6), updatedAt: ago(6), payment: { provider: 'upi', ref: 'UPI-33AC1', verifiedAt: ago(5) } },
    { id: 'ord_1046', shopId: 'shop_vertex', userId: 'usr_demo', customerName: 'Aarav Sharma', docName: 'Placement Aptitude Set 2.pdf', pages: 18, copies: 1, color: false, duplex: true, paper: 'A4', binding: false, amount: 18, status: 'payment_pending', createdAt: ago(2), updatedAt: ago(2), payment: null },
    { id: 'ord_1039', shopId: 'shop_vertex', userId: 'usr_demo', customerName: 'Aarav Sharma', docName: 'Physics Lab Records.pdf', pages: 30, copies: 1, color: false, duplex: true, paper: 'A4', binding: true, amount: 45, status: 'failed', createdAt: days(9), updatedAt: days(9), failureReason: 'Paper jam on printer PRN-1', payment: { provider: 'upi', ref: 'UPI-77BA2', verifiedAt: days(9) } },
    { id: 'ord_1047', shopId: 'shop_vertex', userId: 'usr_other1', customerName: 'Priya Nair', docName: 'Thermodynamics Formula Sheet.pdf', pages: 12, copies: 1, color: true, duplex: false, paper: 'A4', binding: false, amount: 72, status: 'in_queue', createdAt: ago(20), updatedAt: ago(20), payment: { provider: 'upi', ref: 'UPI-AA11', verifiedAt: ago(19) } },
    { id: 'ord_1048', shopId: 'shop_vertex', userId: 'usr_other2', customerName: 'Rohan Desai', docName: 'Campus Fest Posters.pdf', pages: 4, copies: 20, color: true, duplex: false, paper: 'A3', binding: false, amount: 960, status: 'printing', createdAt: ago(30), updatedAt: ago(10), payment: { provider: 'upi', ref: 'UPI-BB22', verifiedAt: ago(28) } },
    { id: 'ord_1049', shopId: 'shop_vertex', userId: 'usr_other3', customerName: 'Sneha Iyer', docName: 'Resume Final.pdf', pages: 2, copies: 1, color: true, duplex: false, paper: 'A4', binding: false, amount: 12, status: 'completed', createdAt: ago(75), updatedAt: ago(70), payment: { provider: 'upi', ref: 'UPI-CC33', verifiedAt: ago(74) } },
    { id: 'ord_1050', shopId: 'shop_vertex', userId: 'usr_other4', customerName: 'Karan Patel', docName: 'Lab Manual Printout.pdf', pages: 46, copies: 1, color: false, duplex: true, paper: 'A4', binding: true, amount: 61, status: 'payment_pending', createdAt: ago(3), updatedAt: ago(3), payment: null },
  ])

  db.write('orderEvents', {})
  db.write('agents', [
    {
      id: 'agt_print_watch', userId: 'usr_demo', kind: 'print-monitor', name: 'Print Order Monitor',
      enabled: true, trigger: 'interval', intervalHours: 2, instructions: 'Tell me when an order moves forward or stalls.',
      createdAt: ago(2880), runCount: 0, lastRunAt: null, lastResult: null, nextRunAt: null,
    },
    {
      id: 'agt_study_plan', userId: 'usr_demo', kind: 'exam-planner', name: 'Exam Revision Planner',
      enabled: true, trigger: 'daily', time: '08:00', instructions: 'Plan my revision from saved notes.',
      createdAt: ago(2880), runCount: 0, lastRunAt: null, lastResult: null, nextRunAt: null,
    },
    {
      id: 'agt_docs', userId: 'usr_demo', kind: 'doc-hygiene', name: 'Document Caretaker',
      enabled: false, trigger: 'interval', intervalHours: 6, instructions: '',
      createdAt: ago(1440), runCount: 0, lastRunAt: null, lastResult: null, nextRunAt: null,
    },
  ])
  db.write('agentRuns', {})
  db.write('notifications', [])

  db.write('seeded', true)
}
