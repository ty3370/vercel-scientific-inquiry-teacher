export const metadata = {
  title: 'AI-탐구 설계 도우미 · 교사용',
  description:
    '학생의 과학 자유탐구 진행 상황과 AI 대화 기록을 조회하는 교사용 페이지',
};

export default function RootLayout({
  children
}) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: '#0f172a',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}
      >
        {children}
      </body>
    </html>
  );
}
