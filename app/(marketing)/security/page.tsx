export default function Security(){
  return (
    <main className="section">
      <div className="container">
        <h1 className="section-title">Security</h1>
        <p className="section-subtitle">MVP foundations with an API-ready architecture.</p>
        <div className="grid-3">
          <div className="card">
            <h3>RBAC</h3>
            <p>Clinic Admin and SLP access controls. SLPs only see their own students.</p>
          </div>
          <div className="card">
            <h3>Upload model</h3>
            <p>Exemplar flow supports future presigned uploads (direct-to-storage).</p>
          </div>
          <div className="card">
            <h3>Audit ready</h3>
            <p>Admin route includes placeholders for audit logs and events.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
