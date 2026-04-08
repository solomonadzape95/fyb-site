// Minimal layout for the hidden Puppeteer render page.
// Overrides the root layout's body styles so Puppeteer sees a clean page
// with no padding, dark background, or global fonts applied over the top.
export default function FlyerRenderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        margin: 0,
        padding: 0,
        width: 1080,
        height: 1350,
        overflow: 'hidden',
        background: '#0a1a0e',
      }}
    >
      {children}
    </div>
  );
}
