// The six documentation sections, in order. Shared by the page and the sidebar.
export interface DocSection {
  id: string;
  title: string;
  keywords: string;
}

export const DOCS_SECTIONS: DocSection[] = [
  { id: 'thesis', title: 'Problem and thesis', keywords: 'problem agent risk nothing bond no action layer issuance' },
  { id: 'how-it-works', title: 'How it works', keywords: 'lifecycle clean slash path two agent economy watchdog' },
  { id: 'contracts', title: 'Contracts', keywords: 'controller bond vault invoice pool csprusd hashes architecture table' },
  { id: 'lifecycle', title: 'Lifecycle and transactions', keywords: 'steps on-chain transaction slash split duplicate proof' },
  { id: 'faq', title: 'Economics and security', keywords: 'faq optimistic verification sybil grief custodial wallet x402 window reputation' },
  { id: 'surfaces', title: 'Product surfaces', keywords: 'arena docket ledger agents two agents invoice pool mcp build' },
];
