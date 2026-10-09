import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="home-page">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-copy">
          <p className="eyebrow">English for work</p>
          <h1 id="home-title">WorkLingo</h1>
          <p className="home-lede">
            Learn through realistic workplace situations, remember language in context,
            and build the confidence to communicate clearly.
          </p>
          <div className="home-actions">
            <Link className="home-primary-action" href="/register">
              Create free account
            </Link>
            <Link className="home-secondary-action" href="/login">
              Log in
            </Link>
          </div>
        </div>
        <aside className="home-principles" aria-label="How WorkLingo helps">
          <p className="card-tag">A practical learning loop</p>
          <h2>Understand, respond, and reuse.</h2>
          <ul>
            <li>One workplace context across listening, speaking, reading, and writing.</li>
            <li>Reasoning questions that check meaning—not keyword matching.</li>
            <li>Spaced review that brings useful language back in new situations.</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
