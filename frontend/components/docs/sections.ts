// Documentation sections in order. Shared by the page and the sidebar.
export interface DocSection {
  id: string;
  title: string;
  keywords: string;
}

export const DOCS_SECTIONS: DocSection[] = [
  { id: 'understand', title: 'Understand Bondsman', keywords: 'overview thesis problem accountability bond' },
  { id: 'verify', title: 'Verify the proof', keywords: 'proof console casper testnet action 27 x402' },
  { id: 'create', title: 'Create action', keywords: 'bonded action template policy scenario manifest wallet' },
  { id: 'integrate', title: 'Integrate the API', keywords: 'x402 quote submit payer authorization http' },
  { id: 'mcp', title: 'Use MCP', keywords: 'mcp model context protocol tools bondsman package' },
  { id: 'a2a', title: 'Use A2A', keywords: 'a2a agent card discovery well known skills' },
  { id: 'casper', title: 'Casper impact', keywords: 'casper agent activity x402 mcp adapters reserve' },
  { id: 'launch', title: 'Launch plan', keywords: 'roadmap thirty sixty ninety day design partner security' },
  { id: 'security', title: 'Threat model and security', keywords: 'security review threat model authority bounds' },
];
