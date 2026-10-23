import './globals.css';
export const metadata = { title: 'Agent Launchpad · BNB Chain', description: 'Agent-only Flap launchpad. Tokens paired with tokenized stocks.' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
