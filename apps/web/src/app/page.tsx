import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      <p>English for work</p>
      <h1>WorkLingo</h1>
      <p>Learn in context, remember for longer, and communicate clearly.</p>
      <Link href="/register">Start your learning journey</Link>
    </main>
  );
}
