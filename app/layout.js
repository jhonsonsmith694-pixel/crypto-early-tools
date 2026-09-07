export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#09090b', color: '#fafafa', fontFamily: 'Inter,system-ui,sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
