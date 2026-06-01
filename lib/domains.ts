export const DOMAIN_OPTIONS = [
  { id: 'devtools', label: 'DevTools', color: '#4f9eff' },
  { id: 'data', label: 'Data', color: '#9b59ff' },
  { id: 'security', label: 'Security', color: '#ff4444' },
  { id: 'ai', label: 'AI', color: '#9b59ff' },
  { id: 'finance', label: 'Finance', color: '#00d084' },
  { id: 'general', label: 'General', color: '#888888' },
] as const;

export function domainMeta(domain?: string | null) {
  const found = DOMAIN_OPTIONS.find(
    (d) => d.id === domain?.toLowerCase() || d.label.toLowerCase() === domain?.toLowerCase()
  );
  return found ?? { id: domain ?? 'general', label: domain ?? 'General', color: '#888888' };
}
