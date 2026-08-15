import './globals.css';

export const metadata = {
  title: "Du.art' Tattoo — Agendamentos",
  description: 'Agende sua sessão e envie sua arte de referência',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
