const SECTIONS = [
  { href: '/typography', label: 'Typography' },
  { href: '/color', label: 'Color' },
  { href: '/spacing', label: 'Spacing' },
  { href: '/grid', label: 'Grid & responsive' },
  { href: '/buttons', label: 'Buttons & links' },
  { href: '/forms', label: 'Form controls' },
  { href: '/data-display', label: 'Data display' },
  { href: '/overlays', label: 'Tabs, accordion, drawers, dialogs' },
  { href: '/wallet-states', label: 'Wallet states' },
  { href: '/payment-states', label: 'Payment ladder' },
  { href: '/lifecycle', label: 'Action lifecycle' },
  { href: '/receipts', label: 'Receipt states' },
  { href: '/evidence-labels', label: 'Evidence labels' },
  { href: '/banners-states', label: 'Banners, empty, loading, error, degraded' },
  { href: '/mobile-nav', label: 'Mobile navigation' },
  { href: '/icons', label: 'Iconography' },
  { href: '/motion', label: 'Motion prototype' },
  { href: '/logo-usage', label: 'Logo usage' },
];

export default function LabIndex() {
  return (
    <main>
      <h1>Bondsman Design Lab</h1>
      <p>Internal component showcase. Not part of the production site.</p>
      <ul>
        {SECTIONS.map((s) => (
          <li key={s.href}>
            <a href={s.href}>{s.label}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
