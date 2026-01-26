"use client";
import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function EliteHRDashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [payMode, setPayMode] = useState("UPI");
  const [activeTab, setActiveTab] = useState<'current' | 'payments' | 'advances' | 'Payslips'>('current');
  
  const supabase = createClientComponentClient();

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/hr/summary?month=${selectedMonth}`);
    const data = await res.json();
    setSummary(data);
    if (selectedEmp) {
      const updated = data.report.find((e: any) => e.id === selectedEmp.id);
      if (updated) setSelectedEmp(updated);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const sendWhatsApp = (emp: any, type: 'SLIP' | 'DUES', url?: string) => {
    const phone = emp.phone?.replace(/\D/g, '');
    if (!phone) return alert("No phone number found for " + emp.name);

    let message = "";
    if (type === 'SLIP') {
      message = `*EARTHY SOURCE - SALARY SLIP*\n\nHello ${emp.name},\nYour salary slip for ${selectedMonth} has been generated.\n\nNet Amount: Rs. ${emp.netPayable.toLocaleString()}\nLink: ${url}.\n\nYour dedication is the soil that helps Earthy Source grow. Thank you for staying grounded and working hard with us! 🌱✨"`;
    } else {
      message = `*EARTHY SOURCE - PAYMENT DUE*\n\nHello ${emp.name},\nYour current balance for ${selectedMonth} is Rs. ${emp.netPayable.toLocaleString()}.\nKindly check with HR for settlement.\n\nThank you and Keep shining! 🚀"`;
    }

    window.open(`https://api.whatsapp.com/send?phone=91${phone}&text=${encodeURIComponent(message)}`, "_blank");
  };

  const generateAndUploadSlip = async () => {
    if (!selectedEmp) return;
    const fileName = `slips/${selectedMonth}/${selectedEmp.id}.pdf`;
    setLoading(true);

    try {
      const doc = new jsPDF();
      const slateGreen = [45, 90, 39]; 
      try { doc.addImage("/EarthyLogo.JPG", "JPEG", 85, 10, 40, 40); } catch (e) {}

      doc.setTextColor(45, 90, 39);
      doc.setFontSize(22);
      doc.text("EARTHY SOURCE", 105, 55, { align: "center" });
      doc.line(14, 60, 196, 60);

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`Employee: ${selectedEmp.name}`, 14, 72);
      doc.text(`ID: EMP-${selectedEmp.id.toString().slice(-4)}`, 14, 78);
      doc.text(`Month: ${selectedMonth}`, 14, 84);
      doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 150, 72);

   autoTable(doc, {
        startY: 95,
        head: [['Earnings Description', 'Units', 'Amount (INR)']],
        body: [
          ['Attendance (Full Day)', `${selectedEmp.fullDays}`, `Rs. ${(selectedEmp.fullDays * selectedEmp.dailyRate).toLocaleString()}`],
          ['Attendance (Half Day)', `${selectedEmp.halfDays}`, `Rs. ${(selectedEmp.halfDays * 0.5 * selectedEmp.dailyRate).toLocaleString()}`],
          // --- ADDED LEAVE ROW ---
          ['Leaves / Absent (Unpaid)', `${selectedEmp.leaves || 0}`, `Rs. 0`], 
          // -----------------------
          ['Gross Earnings', '', `Rs. ${selectedEmp.grossEarnings.toLocaleString()}`],
          ['Deduction: Salary Advances', 'Settled', `- Rs. ${selectedEmp.advances.toLocaleString()}`],
        ],
        foot: [['NET DISBURSEMENT', '', `Rs. ${selectedEmp.netPayable.toLocaleString()}`]],
        theme: 'grid',
        headStyles: { fillColor: slateGreen as [101, 141, 109] },
		footStyles: { fillColor: slateGreen as [101, 141, 109] },
      });

      const pdfBlob = doc.output('blob');
      const { error } = await supabase.storage.from('salary-slips').upload(fileName, pdfBlob, { upsert: true });
      
      if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('salary-slips').getPublicUrl(fileName);
          sendWhatsApp(selectedEmp, 'SLIP', publicUrl);
          fetchData(); 
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedEmp || selectedEmp.netPayable <= 0) return;
    if (!confirm(`Mark ₹${selectedEmp.netPayable.toLocaleString()} as PAID?`)) return;

    setLoading(true);
    const res = await fetch('/api/admin/hr/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            employee_id: selectedEmp.id,
            amount_paid: selectedEmp.netPayable,
            payment_mode: payMode,
            payment_month: selectedMonth
        })
    });

    if (res.ok) {
        alert("Payment Recorded Successfully");
        fetchData();
    }
    setLoading(false);
  };

  const formatMonthDisplay = (dateStr: string) => {
    if (!dateStr) return "N/A";
    try {
        if (dateStr.includes('-') && dateStr.length === 7) {
            const [year, month] = dateStr.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1);
            return date.toLocaleString('default', { month: 'long', year: 'numeric' });
        }
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    } catch (e) {
        return dateStr;
    }
  };

  const filteredReport = summary?.report?.filter((emp: any) =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalNetPayout = summary?.report?.reduce((acc: number, curr: any) => acc + (curr.netPayable || 0), 0) || 0;
  const totalAdvances = summary?.report?.reduce((acc: number, curr: any) => acc + (curr.advances || 0), 0) || 0;
  const activeStaff = summary?.report?.length || 0;

  const getDaysInMonth = (m: string) => new Date(parseInt(m.split('-')[0]), parseInt(m.split('-')[1]), 0).getDate();
  const getStartDayOfMonth = (m: string) => new Date(m + "-01").getDay();

  if (loading) return <div style={styles.loader}><span>SYNCHRONIZING...</span></div>;

  return (
    <div style={styles.wrapper}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>Earthy Source</div>
        <nav style={styles.navStack}>
          <a href="#" style={styles.navLinkActive}>📊 Dashboard</a>
          <a href="/admin/hr/attendance" style={styles.navLink}>📅 Attendance Log</a>
          <a href="/admin/hr/advances" style={styles.navLink}>💸 Advance Entry</a>
          <a href="/admin/hr/employees" style={styles.navLink}>👥 Staff Directory</a>
        </nav>
        <button onClick={() => {
            if(confirm("Notify all employees?")) {
                summary?.report?.forEach((emp: any, i: number) => setTimeout(() => sendWhatsApp(emp, 'DUES'), i * 1500));
            }
        }} style={styles.bulkBtn}>📢 Bulk Notify Dues</button>
      </aside>

      <main style={styles.main}>
        <header style={styles.topBar}>
          <div>
            <h1 style={styles.mainTitle}>HR Intelligence</h1>
            <p style={styles.subTitle}>{formatMonthDisplay(selectedMonth)}</p>
          </div>
          <div style={styles.filterBar}>
            <input type="text" placeholder="🔍 Search staff..." style={styles.searchInput} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <input type="month" style={styles.monthInput} value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
          </div>
        </header>

        <div style={styles.statsGrid}>
            <div style={styles.statCard}>
                <label style={styles.statLabel}>Total Net Payout</label>
                <div style={styles.statValue}>₹{totalNetPayout.toLocaleString()}</div>
            </div>
            <div style={styles.statCard}>
                <label style={styles.statLabel}>Total Advances</label>
                <div style={{...styles.statValue, color: '#e11d48'}}>₹{totalAdvances.toLocaleString()}</div>
            </div>
            <div style={styles.statCard}>
                <label style={styles.statLabel}>Active Staff</label>
                <div style={styles.statValue}>{activeStaff}</div>
            </div>
        </div>

        <div style={styles.tableCard}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Employee</th>
                <th style={styles.th}>Attendance</th>
                <th style={styles.th}>Advances</th>
                <th style={styles.th}>Net Due</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Management</th>
              </tr>
            </thead>
            <tbody>
              {filteredReport?.map((emp: any) => (
                <tr key={emp.id}>
                  <td style={styles.td}>
                    <div style={styles.userBox}>
                      <div style={styles.userIcon}>{emp.name?.charAt(0)}</div>
                      <div><b>{emp.name}</b><br/><small>{emp.role}</small></div>
                    </div>
                  </td>
                  <td style={styles.td}>
  {emp.fullDays}F | {emp.halfDays}H {emp.leaves > 0 && <span style={{color: '#e11d48'}}>| {emp.leaves}L</span>}
</td>
                  <td style={{ ...styles.td, color: '#e11d48' }}>₹{emp.advances}</td>
                  <td style={{ ...styles.td, fontWeight: '800' }}>₹{emp.netPayable?.toLocaleString()}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>
                    <div style={{display:'flex', gap:'8px', justifyContent:'flex-end'}}>
                        <button onClick={() => sendWhatsApp(emp, 'DUES')} style={{background:'#22c55e', border:'none', borderRadius:'8px', padding:'8px', cursor:'pointer', display:'flex', alignItems:'center'}}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.431 5.63 1.432h.006c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.415-8.414"/></svg>
                        </button>
                        <button onClick={() => setSelectedEmp(emp)} style={styles.btnAction}>Manage Details</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedEmp && (
          <div style={styles.drawerOverlay} onClick={() => setSelectedEmp(null)}>
            <div style={styles.drawer} onClick={e => e.stopPropagation()}>
              <div style={styles.drawerHeader}>
                <div>
                    <h2 style={{margin:0}}>{selectedEmp.name}</h2>
                    <small>{selectedEmp.role}</small>
                </div>
                <button onClick={() => setSelectedEmp(null)} style={styles.closeBtn}>✕</button>
              </div>

              <div style={styles.tabBar}>
                <button onClick={() => setActiveTab('current')} style={activeTab === 'current' ? styles.tabActive : styles.tab}>Settlement</button>
                <button onClick={() => setActiveTab('payments')} style={activeTab === 'payments' ? styles.tabActive : styles.tab}>Payments</button>
                <button onClick={() => setActiveTab('advances')} style={activeTab === 'advances' ? styles.tabActive : styles.tab}>Advances</button>
                <button onClick={() => setActiveTab('Payslips')} style={activeTab === 'Payslips' ? styles.tabActive : styles.tab}>Payslips</button>
              </div>

              <div style={styles.drawerContent}>
                {activeTab === 'current' ? (
                  <>
                    <section style={styles.section}>
                      <div style={styles.sectionHeader}>
                        <h4 style={{margin:0}}>Attendance Heatmap</h4>
                      </div>
                      <div style={styles.calendarGrid}>
                        {['S','M','T','W','T','F','S'].map(d => <div key={d} style={styles.calHeader}>{d}</div>)}
                        {Array.from({ length: getStartDayOfMonth(selectedMonth) }).map((_, i) => <div key={`e-${i}`} style={styles.calCellEmpty} />)}
                        {Array.from({ length: getDaysInMonth(selectedMonth) }).map((_, i) => {
                          const day = i + 1;
                          const dateKey = `${selectedMonth}-${day.toString().padStart(2, '0')}`;
                          const log = selectedEmp.attendanceHistory?.find((a: any) => {
                            if (!a.work_date) return false;
                            const formattedWorkDate = new Date(a.work_date).toISOString().split('T')[0];
                            return formattedWorkDate === dateKey;
                          });
                          return (
                            <div key={dateKey} style={{
                              ...styles.calCell,
                              background: 
                                log?.status?.toLowerCase() === 'full day' ? '#22c55e' : 
                                log?.status?.toLowerCase() === 'half day' ? '#eab308' : 
                                (log?.status?.toLowerCase() === 'leave' || log?.status?.toLowerCase() === 'absent') ? '#e11d48' : 
                                '#f1f5f9',
                              color: log ? '#fff' : '#cbd5e1'
                            }}>{day}</div>
                          );
                        })}
                      </div>
                    </section>

                    <section style={styles.section}>
                        <h4 style={{marginBottom:'10px'}}>Monthly Settlement</h4>
                        <div style={styles.ledgerBox}>
                            <div style={styles.ledgerItem}><span>Gross Earnings</span><span style={styles.amtText}>₹{selectedEmp.grossEarnings?.toLocaleString()}</span></div>
                            <div style={styles.ledgerItem}><span>Advances Settled</span><span style={{...styles.amtText, color: '#e11d48'}}>-₹{selectedEmp.advances?.toLocaleString()}</span></div>
                            <div style={{...styles.ledgerItem, borderTop:'1px solid #cbd5e1', marginTop:'5px', paddingTop:'10px'}}>
                                <span style={{fontWeight:'700'}}>Balance Due</span>
                                <span style={{...styles.amtText, color: '#2563eb', fontSize:'18px'}}>₹{selectedEmp.netPayable?.toLocaleString()}</span>
                            </div>
                        </div>
                        <button onClick={generateAndUploadSlip} style={{...styles.bulkBtn, width:'100%', background:'#6366f1'}}>
                            📄 Generate & Share Salary Slip
                        </button>
                    </section>

                    <div style={styles.payActionCard}>
                        <label style={{fontSize:'12px', fontWeight:'700', color:'#1e40af'}}>SETTLEMENT MODE</label>
                        <select style={styles.select} value={payMode} onChange={e => setPayMode(e.target.value)}>
                            <option>UPI</option><option>Cash</option><option>Bank Transfer</option>
                        </select>
                        <button onClick={handlePayment} style={{...styles.btnPay, opacity: selectedEmp.netPayable > 0 ? 1 : 0.5}} disabled={selectedEmp.netPayable <= 0}>
                          {selectedEmp.netPayable > 0 ? `Pay Balance: ₹${selectedEmp.netPayable.toLocaleString()}` : 'No Dues'}
                        </button>
                    </div>
                  </>
                ) : activeTab === 'payments' ? (
                  <div style={styles.trailContainer}>
                    {selectedEmp.paymentHistory?.length > 0 ? selectedEmp.paymentHistory.map((pay: any) => (
                      <div key={pay.id} style={styles.trailItem}>
                        <div style={{display:'flex', justifyContent:'space-between'}}>
                          <b>{formatMonthDisplay(pay.payment_month)}</b>
                          <span style={{color:'#22c55e', fontWeight:'bold'}}>₹{pay.amount_paid.toLocaleString()}</span>
                        </div>
                        <div style={{fontSize:'11px', color:'#64748b'}}>Mode: {pay.payment_mode} • {new Date(pay.created_at).toLocaleDateString()}</div>
                      </div>
                    )) : <p style={styles.emptyMsg}>No payment history.</p>}
                  </div>
                ) : activeTab === 'advances' ? (
                   <div style={styles.trailContainer}>
                    {selectedEmp.advanceHistory?.length > 0 ? 
                      selectedEmp.advanceHistory.map((adv: any) => (
                      <div key={adv.id} style={styles.trailItem}>
                        <div style={{display:'flex', justifyContent:'space-between'}}>
                          <b>{new Date(adv.created_at).toLocaleDateString('en-IN')}</b>
                          <span style={{color:'#e11d48', fontWeight:'bold'}}>₹{Number(adv.amount).toLocaleString()}</span>
                        </div>
                        <div style={{fontSize:'11px', color:'#64748b'}}>Reason: {adv.reason || 'Salary Advance'} • {adv.is_settled ? 'Settled' : 'Unpaid'}</div>
                      </div>
                    )) : <p style={styles.emptyMsg}>No advances found in records.</p>}
                  </div>
                ) : (
                  <div style={styles.trailContainer}>
                    {Array.from(new Set(
                      selectedEmp.paymentHistory
                        ?.filter((p: any) => p.payment_month || p.for_month)
                        .map((p: any) => p.for_month || "2026-01")
                    )).map((monthCode: any) => (
                      <div key={monthCode} style={styles.trailItem}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                          <b>Slip: {formatMonthDisplay(monthCode)}</b> 
                          <button style={styles.viewSlipBtn} onClick={() => {
                              const { data: { publicUrl } } = supabase.storage
                                .from('salary-slips')
                                .getPublicUrl(`slips/${monthCode}/${selectedEmp.id}.pdf`);
                              window.open(publicUrl, "_blank");
                          }}>👁️ View PDF</button>
                        </div>
                      </div>
                    ))}
                    {(!selectedEmp.paymentHistory || selectedEmp.paymentHistory.length === 0) && 
                      <p style={styles.emptyMsg}>No playslips generated.</p>
                    }
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles: any = {
  wrapper: { display: 'flex', minHeight: '100vh', background: '#f1f5f9', color: '#0f172a', fontFamily: "'Inter', sans-serif" },
  sidebar: { width: '260px', background: '#0f172a', padding: '40px 20px', position: 'fixed', left: 0, top: 0, height: '100vh', display:'flex', flexDirection:'column', zIndex: 50 },
  brand: { color: '#fff', fontSize: '24px', fontWeight: '900', marginBottom: '40px' },
  navStack: { display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 },
  navLink: { padding: '12px 16px', color: '#94a3b8', textDecoration: 'none', borderRadius: '10px', fontSize: '14px' },
  navLinkActive: { padding: '12px 16px', color: '#fff', background: '#2563eb', textDecoration: 'none', borderRadius: '10px', fontWeight: '600' },
  bulkBtn: { background: '#22c55e', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', marginTop:'20px' },
  main: { flex: 1, marginLeft: '260px', padding: '40px 60px', width: 'calc(100% - 260px)' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  mainTitle: { margin: 0, fontSize: '28px', fontWeight: '800' },
  subTitle: { margin: 0, color: '#64748b' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' },
  statCard: { background: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  statLabel: { fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' },
  statValue: { fontSize: '24px', fontWeight: '800', marginTop: '5px' },
  filterBar: { display: 'flex', gap: '15px' },
  searchInput: { padding: '10px 15px', borderRadius: '10px', border: '1px solid #e2e8f0', width: '220px' },
  monthInput: { padding: '10px 15px', borderRadius: '10px', border: '1px solid #e2e8f0' },
  tableCard: { background: '#fff', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { background: '#f8fafc', padding: '15px 24px', textAlign: 'left', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' },
  td: { padding: '18px 24px', borderBottom: '1px solid #f1f5f9' },
  userBox: { display: 'flex', alignItems: 'center', gap: '12px' },
  userIcon: { width: '38px', height: '38px', background: '#e0e7ff', color: '#4338ca', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
  btnAction: { padding: '8px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  drawerOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'flex-end', zIndex: 100 },
  drawer: { width: '480px', background: '#fff', height: '100vh', padding: '40px', overflowY: 'auto', boxShadow: '-10px 0 30px rgba(0,0,0,0.1)' },
  drawerHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px' },
  closeBtn: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' },
  tabBar: { display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '20px', gap: '10px' },
  tab: { padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '13px' },
  tabActive: { padding: '8px 12px', background: 'none', border: 'none', borderBottom: '2px solid #2563eb', cursor: 'pointer', color: '#2563eb', fontWeight: 'bold' },
  section: { marginBottom: '30px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  calendarGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' },
  calHeader: { fontSize: '11px', color: '#94a3b8', textAlign: 'center', fontWeight: 'bold', paddingBottom: '5px' },
  calCell: { height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700' },
  calCellEmpty: { height: '40px' },
  ledgerBox: { background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' },
  ledgerItem: { display: 'flex', justifyContent: 'space-between', padding: '8px 0' },
  amtText: { fontWeight: '700' },
  payActionCard: { background: '#eff6ff', padding: '20px', borderRadius: '16px', border: '1px solid #bfdbfe', marginTop: '20px' },
  select: { width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #d1d5db', margin: '10px 0', background: '#fff' },
  btnPay: { width: '100%', padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '14px', letterSpacing: '2px' },
  trailContainer: { background: '#f8fafc', borderRadius: '12px', padding: '10px', maxHeight: '500px', overflowY: 'auto' },
  trailItem: { padding: '12px', borderBottom: '1px solid #e2e8f0', background: '#fff', borderRadius: '8px', marginBottom: '8px' },
  viewSlipBtn: { background: '#0f172a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' },
  emptyMsg: { padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }
};