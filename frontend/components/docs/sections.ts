// The ten documentation sections, in order. Shared by the page and the sidebar.
export interface DocSection {
  id: string;
  title: string;
  // Keywords power the docs search box.
  keywords: string;
}

export const DOCS_SECTIONS: DocSection[] = [
  { id: 'overview', title: 'Overview', keywords: 'thesis what is bondsman system' },
  { id: 'how-it-works', title: 'How it works', keywords: 'lifecycle clean slash path intent bond execute challenge resolve' },
  { id: 'agent', title: 'The agent', keywords: 'autonomous model reasoning hash decide invoice confident mistake' },
  { id: 'contracts', title: 'Smart contracts', keywords: 'controller bond vault invoice pool csprusd hashes architecture' },
  { id: 'bond-and-slash', title: 'The bond and the slash', keywords: 'risk weighted formula bps split reserve fifty fifty' },
  { id: 'proving-fraud', title: 'Proving fraud on-chain', keywords: 'duplicate claim hash collision no human judge' },
  { id: 'api', title: 'API reference', keywords: 'endpoints invoices actions agents reserve challenge resolve deployments json' },
  { id: 'security', title: 'Security and trust', keywords: 'real testnet mocked invoice honest framing' },
  { id: 'deployment', title: 'Deployment', keywords: 'network toolchain pins casper odra run' },
  { id: 'roadmap', title: 'Roadmap', keywords: 'next future credible mainnet' },
];
