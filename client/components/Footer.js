export default function Footer() {
  return (
    <footer style={{ background: 'var(--color-bg-card)', padding: 'var(--space-8) 0', marginTop: 'var(--space-16)', borderTop: '1px solid var(--color-border)' }}>
      <div className="container grid grid-4" style={{ gap: 'var(--space-8)' }}>
        <div>
          <h3 style={{ color: 'var(--color-primary)', fontWeight: 'var(--font-weight-extra-bold)', marginBottom: 'var(--space-4)' }}>KosEats</h3>
          <p className="text-muted text-small">Marketplace masakan rumahan hiperlokal #1 untuk anak kos. Gak pake ribet, makanan enak langsung mendarat di kamar.</p>
        </div>
        <div>
          <h4 style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-lg)' }}>KosEats</h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <li><a href="#" className="text-muted text-small">Tentang Kami</a></li>
            <li><a href="#" className="text-muted text-small">Blog</a></li>
            <li><a href="#" className="text-muted text-small">Karir</a></li>
          </ul>
        </div>
        <div>
          <h4 style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-lg)' }}>Bantuan</h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <li><a href="#" className="text-muted text-small">Pusat Bantuan</a></li>
            <li><a href="#" className="text-muted text-small">Syarat & Ketentuan</a></li>
            <li><a href="#" className="text-muted text-small">Kebijakan Privasi</a></li>
          </ul>
        </div>
        <div>
          <h4 style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-lg)' }}>Daftar</h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <li><a href="#" className="text-primary text-small" style={{ fontWeight: 'var(--font-weight-bold)' }}>Jadi Mitra Penjual</a></li>
            <li><a href="#" className="text-primary text-small" style={{ fontWeight: 'var(--font-weight-bold)' }}>Jadi Mitra Pengantar</a></li>
          </ul>
        </div>
      </div>
      <div className="container" style={{ marginTop: 'var(--space-8)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
        <p className="text-muted text-small">© {new Date().getFullYear()} KosEats. Seluruh Hak Cipta Dilindungi.</p>
      </div>
    </footer>
  );
}
