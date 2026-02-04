"use client";
import React from "react";
import Link from "next/link";

export default function PrivacyPolicy() {
  const lastUpdated = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div style={{ background: "#fff", color: "#374151", fontFamily: "sans-serif", lineHeight: "1.6" }}>
      {/* Header section */}
      <div style={{ background: "#166534", padding: "60px 20px", textAlign: "center", color: "#fff" }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "10px" }}>Privacy Policy</h1>
        <p style={{ opacity: "0.9" }}>Last Updated: {lastUpdated}</p>
      </div>

      {/* Content section */}
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 20px" }}>
        <p style={{ marginBottom: "20px" }}>
          At <strong>EarthySource</strong>, accessible from EarthySource.com, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by EarthySource and how we use it.
        </p>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>1. Information We Collect</h2>
          <p>We collect several types of information to provide and improve our services to you:</p>
          <ul style={{ paddingLeft: "20px" }}>
            <li><strong>Personal Identifiable Information:</strong> Name, Email Address, Phone Number, and Delivery Address.</li>
            <li><strong>Application Data:</strong> For those applying for jobs via our Careers portal, we collect educational background and professional experience.</li>
            <li><strong>Log Data:</strong> We may collect info that your browser sends whenever you visit our website (IP address, browser type).</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>2. How We Use Your Information</h2>
          <p>We use the data we collect in various ways, including to:</p>
          <ul style={{ paddingLeft: "20px" }}>
            <li>Provide, operate, and maintain our water delivery services.</li>
            <li>Process your job applications for open positions.</li>
            <li>Send you order confirmations and delivery updates.</li>
            <li>Find and prevent fraudulent transactions.</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>3. Data Storage and Security</h2>
          <p>
            Your information is stored securely. Since we process some data through Google Cloud and Google Sheets API, we rely on their enterprise-grade security. We strive to use commercially acceptable means to protect your Personal Information, but remember that no method of transmission over the internet is 100% secure.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>4. Third-Party Services</h2>
          <p>
            We may employ third-party companies (such as delivery partners or payment processors). These third parties have access to your Personal Information only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>5. Your Rights</h2>
          <p>
            Under India's DPDP Act, you have the right to access, update, or delete the information we have on you. If you wish to be removed from our records, please contact us at the email below.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>6. Contact Us</h2>
          <p>
            If you have any questions or suggestions about our Privacy Policy, do not hesitate to contact us at:
          </p>
          <div style={{ background: "#f3f4f6", padding: "15px", borderRadius: "8px", marginTop: "10px" }}>
            <strong>Email:</strong> support@earthysource.com<br />
            <strong>Address:</strong> Earthy Source Foods And Beverages, Shrirampur, Ahilyanagar, Maharashtra
          </div>
        </section>

        <div style={{ marginTop: "40px", textAlign: "center" }}>
          <Link href="/" style={{ color: "#166534", fontWeight: "bold", textDecoration: "none" }}>
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  marginBottom: "35px"
};

const headingStyle: React.CSSProperties = {
  color: "#111827",
  fontSize: "1.5rem",
  marginBottom: "12px",
  borderBottom: "2px solid #dcfce7",
  display: "inline-block"
};