"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- DYNAMIC DATE HELPER ---
const todayDate = new Date().toLocaleDateString('en-IN', {
  day: '2-digit',
  month: 'long',
  year: 'numeric'
});

// --- BASE TEMPLATES ---
const defaultTemplates = {
  English: {
    rate_update: `Hello {name}! 👋 

Pure hydration just got a new look! ✨ Our updated per-box rates for *Sai Sanjivani* as of ${todayDate}:

💧 1 Liter Box: ₹[Price]
💧 500 ML Box: ₹[Price]
💧 200 ML Box: ₹[Price]

Stay Pure, Stay Healthy! 🌿
— Team Earthy Source

📧 support@earthysource.in
🌐 https://www.earthysource.in`,

    offer: `Exciting News {name}! 🎉 

Boost your stock today! Get a *Special Discount* on bulk orders of our 200ml and 500ml variants. 🚚💨

Healthy hydration is just a click away! 💧✨
— Team Earthy Source

📧 support@earthysource.in
🌐 https://www.earthysource.in`
  },
  
  Marathi: {
    rate_update: `नमस्कार {name}! 👋

शुद्धता आणि विश्वासाचे दुसरे नाव - *साई संजीवनी*! ✨ आज ${todayDate} पासून आमचे प्रति बॉक्स नवीन दर खालीलप्रमाणे आहेत:

💧 १ लिटर बॉक्स: ₹[Price]
💧 ५०० मिली बॉक्स: ₹[Price]
💧 २०० मिली बॉक्स: ₹[Price]

शुद्ध पाणी, निरोगी जीवन! 🌿
— टीम अर्थी सोर्स

📧 support@earthysource.in
🌐 https://www.earthysource.in`,

    offer: `खास ऑफर {name}! 🎉

आजच आपला स्टॉक वाढवा! साई संजीवनीच्या ५०० मिली आणि २०० मिली पर्यायांवर विशेष सवलत मिळवा. 🚚💨

आरोग्यदायी पाऊल, शुद्धतेच्या दिशेने! 💧✨
— टीम अर्थी सोर्स

📧 support@earthysource.in
🌐 https://www.earthysource.in`
  }
};

type Contact = {
  id: number;
  phone_number: string;
  name: string;
  category: "Distributor" | "Customer";
  last_messaged_at?: string;
};

export default function BroadcastManager() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [category, setCategory] = useState<"Distributor" | "Customer">("Distributor");
  const [language, setLanguage] = useState<"English" | "Marathi">("English");
  const [selectedTemplate, setSelectedTemplate] = useState("rate_update");
  const [customMsg, setCustomMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => { fetchContacts(); }, [category]);

  // --- SURGICAL UPDATE: SYNC TEMPLATE TO EDITABLE BOX ---
  useEffect(() => {
    if (selectedTemplate === "custom") {
      setCustomMsg(""); // Clear for fresh custom message
    } else {
      const text = (defaultTemplates[language] as any)[selectedTemplate];
      if (text) {
        setCustomMsg(text);
      }
    }
  }, [selectedTemplate, language]);

  async function fetchContacts() {
    const { data } = await supabase.from("contact_list").select("*").eq("category", category);
    setContacts(data || []);
  }

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone_number.includes(searchQuery));
  }, [contacts, searchQuery]);

  const handleWhatsApp = async (contact: Contact) => {
    const finalMsg = customMsg.replace('{name}', contact.name);
    
    await supabase.from('contact_list').update({ last_messaged_at: new Date().toISOString() }).eq('id', contact.id);

    window.open(`https://wa.me/${contact.phone_number}?text=${encodeURIComponent(finalMsg)}`, '_blank');
    fetchContacts(); 
  };

  const startBulk = () => {
    const toSend = contacts.filter(c => selectedIds.includes(c.id));
    toSend.forEach((c, i) => {
      setTimeout(() => handleWhatsApp(c), i * 1500); 
    });
  };

  return (
    <div style={containerStyle}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        
        <header style={headerStyle}>
          <div>
            <h1 style={titleStyle}>EARTHY SOURCE BROADCAST</h1>
            <p style={subtitleStyle}>Professional Communication Hub</p>
          </div>
          <div style={badgeStyle}>{selectedIds.length} Contacts Selected</div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '30px' }}>
          
          <aside style={sidebarStyle}>
            <div style={sectionBox}>
              <label style={labelStyle}>1. Target Audience</label>
              <div style={toggleGroup}>
                <button 
                  onClick={() => setCategory('Distributor')} 
                  style={category === 'Distributor' ? activeToggle : inactiveToggle}>Distributors</button>
                <button 
                  onClick={() => setCategory('Customer')} 
                  style={category === 'Customer' ? activeToggle : inactiveToggle}>Customers</button>
              </div>

              <label style={labelStyle}>2. Communication Language</label>
              <div style={toggleGroup}>
                <button 
                  onClick={() => setLanguage('English')} 
                  style={language === 'English' ? activeToggle : inactiveToggle}>English</button>
                <button 
                  onClick={() => setLanguage('Marathi')} 
                  style={language === 'Marathi' ? activeToggle : inactiveToggle}>मराठी</button>
              </div>

              <label style={labelStyle}>3. Message Template</label>
              <select 
                style={selectStyle} 
                value={selectedTemplate} 
                onChange={(e) => setSelectedTemplate(e.target.value)}>
                <option value="rate_update">Rate Update</option>
                <option value="offer">Special Offer</option>
                <option value="custom">Custom Message (Blank)</option>
              </select>

              <textarea 
                style={{...textAreaStyle, height: '250px'}} 
                placeholder="Edit your message here... use {name} for personalization"
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
              />
            </div>

            <div style={previewBox}>
              <label style={labelStyle}>Message Preview</label>
              <div style={previewText}>
                {customMsg.replace('{name}', '[Name]') || "Type something..."}
              </div>
            </div>
          </aside>

          <main style={tableWrapperStyle}>
            <div style={filterBar}>
              <input 
                style={searchInput} 
                placeholder="🔍 Search name or phone number..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button 
                onClick={() => setSelectedIds(selectedIds.length === filteredContacts.length ? [] : filteredContacts.map(c => c.id))}
                style={bulkCheckBtn}>
                {selectedIds.length === filteredContacts.length ? "Deselect All" : "Select All Visible"}
              </button>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  <th style={tHeadStyle}>Select</th>
                  <th style={tHeadStyle}>Contact Identity</th>
                  <th style={tHeadStyle}>Last Messaged</th>
                  <th style={tHeadStyle}>Quick Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} style={{ borderBottom: "1px solid #f1f5f9", background: selectedIds.includes(contact.id) ? '#f0fdf4' : 'transparent' }}>
                    <td style={tCellStyle}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(contact.id)}
                        onChange={() => setSelectedIds(prev => prev.includes(contact.id) ? prev.filter(x => x !== contact.id) : [...prev, contact.id])}
                      />
                    </td>
                    <td style={tCellStyle}>
                      <div style={{ fontWeight: 700, color: '#064e3b' }}>{contact.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{contact.phone_number}</div>
                    </td>
                    <td style={tCellStyle}>
                      <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                        {contact.last_messaged_at ? new Date(contact.last_messaged_at).toLocaleDateString() : '—'}
                      </span>
                    </td>
                    <td style={tCellStyle}>
                      <button onClick={() => handleWhatsApp(contact)} style={singleSendBtn}>SEND WA</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {selectedIds.length > 0 && (
              <div style={bulkFooter}>
                <div style={{color: 'white'}}>
                  <strong>{selectedIds.length} Contacts Ready</strong>
                  <div style={{fontSize: '0.7rem', opacity: 0.8}}>Sequencing active: 1.5s delay per message</div>
                </div>
                <button onClick={startBulk} style={bulkSendBtn}>START BULK BROADCAST</button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// Earthy Styling Constants
const containerStyle = { padding: "40px", background: "#f8fafc", minHeight: "100vh", fontFamily: 'Inter, system-ui, sans-serif' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', borderBottom: '2px solid #e2e8f0', paddingBottom: '20px' };
const titleStyle = { margin: 0, fontSize: '2rem', fontWeight: 900, color: '#064e3b', letterSpacing: '-1px' };
const subtitleStyle = { margin: 0, color: '#15803d', fontWeight: 600, fontSize: '0.9rem' };
const badgeStyle = { background: '#15803d', color: 'white', padding: '8px 20px', borderRadius: '50px', fontWeight: 800, fontSize: '0.8rem' };

const sidebarStyle = { display: 'flex', flexDirection: 'column' as const, gap: '20px' };
const sectionBox = { background: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' };
const labelStyle = { display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' as const, marginBottom: '12px', letterSpacing: '0.05em' };

const toggleGroup = { display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', marginBottom: '20px' };
const activeToggle = { flex: 1, border: 'none', background: 'white', padding: '8px', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', color: '#15803d', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', cursor: 'pointer' };
const inactiveToggle = { flex: 1, border: 'none', background: 'transparent', padding: '8px', borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem', color: '#64748b', cursor: 'pointer' };

const selectStyle = { width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600, fontSize: '0.9rem', outline: 'none' };
const textAreaStyle = { width: '100%', marginTop: '12px', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', height: '100px', fontSize: '0.85rem', resize: 'none' as const };

const previewBox = { background: '#064e3b', padding: '24px', borderRadius: '20px', color: '#ecfdf5' };
const previewText = { background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px', fontSize: '0.85rem', lineHeight: '1.5', italic: 'italic' };

const tableWrapperStyle = { background: "white", borderRadius: "20px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", overflow: "hidden", border: '1px solid #e2e8f0' };
const filterBar = { padding: '20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '15px', alignItems: 'center' };
const searchInput = { flex: 1, padding: '12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '0.9rem' };
const bulkCheckBtn = { background: 'none', border: '1px solid #cbd5e1', padding: '10px 15px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', cursor: 'pointer' };

const tHeadStyle: React.CSSProperties = { padding: "16px 20px", textAlign: 'left', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tCellStyle: React.CSSProperties = { padding: "16px 20px" };
const singleSendBtn = { background: '#dcfce7', color: '#15803d', border: 'none', padding: '6px 15px', borderRadius: '8px', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer' };

const bulkFooter = { position: 'sticky' as const, bottom: 0, background: '#064e3b', padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const bulkSendBtn = { background: '#10b981', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '12px', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.4)' };