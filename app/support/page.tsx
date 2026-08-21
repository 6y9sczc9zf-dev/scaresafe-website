import Image from "next/image";
import Link from "next/link";

const faqs = [
  ["What is ScareSafe?", "ScareSafe is a horror companion that helps you see jumpscare timing before you watch, without spoiling the story."],
  ["How do I report or suggest a jumpscare?", "Open a movie in the ScareSafe app, start its timeline, and use Add Jumpscare. Community submissions are reviewed and verified over time."],
  ["Can I change or remove my vote?", "Yes. Sign in, return to the item, and tap your selected upvote or downvote again to remove it, or choose the other direction to switch."],
  ["Why does a timestamp say it may not match?", "Different releases can have slightly different runtimes or edits. Use the sync controls in the player to align the timeline with your copy."],
  ["How do I get help with my account or purchase?", "Email us and include the email address on your account plus a short description of the issue. Please do not send your password."],
];

export default function SupportPage() {
  return <main className="support-shell">
    <nav className="support-nav"><Link className="brand" href="/"><Image src="/brand/ghostie-icon.png" alt="" width={35} height={35} /><span>ScareSafe</span></Link><a href="/">Back home</a></nav>
    <article className="support-card">
      <p className="section-kicker">ScareSafe support</p>
      <h1>How can we help?</h1>
      <p className="support-lede">Find quick answers below, or send a note directly to the person behind ScareSafe.</p>
      <a className="button primary support-email" href="mailto:contactsafescare@gmail.com?subject=ScareSafe%20support">Email support <span>contactsafescare@gmail.com</span></a>
      <section className="faq-list" aria-labelledby="faq-title">
        <h2 id="faq-title">Frequently asked questions</h2>
        {faqs.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">＋</span></summary><p>{answer}</p></details>)}
      </section>
      <p className="support-note">For privacy requests, visit <Link href="/privacy">Privacy</Link>. For terms, visit <Link href="/terms">Terms</Link>.</p>
    </article>
  </main>;
}
