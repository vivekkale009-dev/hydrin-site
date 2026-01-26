"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EditDistributorPage() {
  const { id } = useParams();
  const router = useRouter();
  const [formData, setFormData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchDistributor() {
      try {
        const res = await fetch(`/api/admin/distributors/${id}/details`);
        const json = await res.json();
        if (json.data) setFormData(json.data.profile);
      } catch (err) {
        console.error("Failed to load distributor", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDistributor();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/distributors/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert("Distributor updated successfully!");
        router.push("/admin/distributors");
      } else {
        alert("Failed to update.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={styles.loader}>Loading Profile...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.overlay} />
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={() => router.back()} style={styles.backBtn}>← Cancel</button>
          <h1 style={styles.title}>Edit Profile: {formData?.name}</h1>
        </div>

        <form onSubmit={handleSubmit} style={styles.card}>
          <div style={styles.grid}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Full Name</label>
              <input 
                style={styles.input}
                value={formData.name || ""} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                required 
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Phone Number</label>
              <input 
                style={styles.input}
                value={formData.phone || ""} 
                onChange={e => setFormData({...formData, phone: e.target.value})} 
                required 
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>City</label>
              <input 
                style={styles.input}
                value={formData.city || ""} 
                onChange={e => setFormData({...formData, city: e.target.value})} 
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Delivery Rate (per KM)</label>
              <input 
                type="number"
                style={styles.input}
                value={formData.delivery_rate_per_km || 0} 
                onChange={e => setFormData({...formData, delivery_rate_per_km: e.target.value})} 
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Credit Limit (₹)</label>
              <input 
                type="number"
                style={styles.input}
                value={formData.credit_limit || 0} 
                onChange={e => setFormData({...formData, credit_limit: e.target.value})} 
              />
            </div>
          </div>

          <div style={styles.footer}>
            <button type="submit" disabled={saving} style={styles.saveBtn}>
              {saving ? "Saving Changes..." : "Update Distributor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles: any = {
  page: { minHeight: '100vh', backgroundImage: "url('/hero-deep.jpg')", backgroundSize: 'cover', position: 'relative', padding: '60px 20px' },
  overlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)' },
  container: { position: 'relative', zIndex: 1, maxWidth: '800px', margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px', color: '#fff' },
  backBtn: { background: 'none', color: '#ccc', border: '1px solid #444', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' },
  title: { fontSize: '24px', margin: 0 },
  card: { background: '#fff', padding: '40px', borderRadius: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' },
  input: { padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '15px' },
  footer: { marginTop: '30px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' },
  saveBtn: { width: '100%', padding: '16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' },
  loader: { color: '#fff', textAlign: 'center', marginTop: '200px' }
};