// app/layout.js

export const metadata = {
  title: "Polaris",
  description: "AI Multimodal Interview Mentor",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
