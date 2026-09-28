import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Boxes,
  ScanLine,
  Check,
  ArrowDownLeft,
  PackageCheck,
} from "lucide-react";
export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Link href="/" className="wordmark">
          <span className="brand-mark">
            <Boxes />
          </span>
          stoqo<span className="brand-dot">.</span>
        </Link>
        <nav>
          <a href="#how">How it works</a>
          <Link href="/login">Log in</Link>
          <Link className="button dark-button" href="/signup">
            Start your free trial <ArrowUpRight size={17} />
          </Link>
        </nav>
      </header>
      <main>
        <div className="hero">
          <section>
            <span className="eyebrow">
              <span className="tiny-dot" /> BIG IDEAS. SMALL BUSINESSES.
            </span>
            <h1>
              Your stock.
              <br />
              In a <span>good place.</span>
            </h1>
            <p>
              Less counting. Less guessing. More growing.
              <br />
              Meet the refreshingly simple home for your inventory.
            </p>
            <Link href="/signup" className="button primary big">
              Let’s get you stocked <ArrowUpRight size={21} />
            </Link>
            <div className="hero-note">
              <Check size={15} /> No card required <span>·</span> Made for your
              phone
            </div>
          </section>
          <section
            className="hero-preview"
            aria-label="Example inventory preview"
          >
            <div className="preview-top">
              <span className="wordmark">stoqo.</span>
              <span className="pill">A little peace of mind</span>
            </div>
            <div className="preview-greeting">Your shelves, at a glance</div>
            <div className="preview-number">
              All stocked up.
              <PackageCheck size={35} />
            </div>
            <div className="preview-cards">
              <div>
                <span>STOCK IN</span>
                <strong>
                  +24 <small>units</small>
                </strong>
                <ArrowDownLeft />
              </div>
              <div>
                <span>READY TO SELL</span>
                <strong>
                  148 <small>units</small>
                </strong>
                <Boxes />
              </div>
            </div>
            <div className="preview-item">
              <span className="product-avatar">OT</span>
              <div>
                <strong>Everyday oversized tee</strong>
                <small>Black / Medium</small>
              </div>
              <span className="status healthy">Healthy stock</span>
            </div>
            <div className="preview-item">
              <span className="product-avatar blue">CB</span>
              <div>
                <strong>Canvas carry-all</strong>
                <small>Natural / One size</small>
              </div>
              <span className="status low">Running low</span>
            </div>
            <div className="preview-foot">
              <ScanLine size={18} /> Scan it. Stock it. Sorted.
              <span>EXAMPLE WORKSPACE</span>
            </div>
          </section>
        </div>
        <section id="how" className="landing-features">
          <div>
            <span>01 / MAKE IT YOURS</span>
            <h2>Your business. Your space.</h2>
            <p>Create your account and name your business. That’s the setup.</p>
          </div>
          <div>
            <span>02 / ADD YOUR FIRST</span>
            <h2>A name is all you need.</h2>
            <p>
              Add a product and its opening stock. The extra details can wait.
            </p>
          </div>
          <div>
            <span>03 / GET ON WITH IT</span>
            <h2>Every move, remembered.</h2>
            <p>
              Stock in, stock out, and a clear history. Know where you stand.
            </p>
          </div>
        </section>
      </main>
      <footer>
        <span className="wordmark">stoqo.</span>
        <span>A little less stock stress.</span>
        <Link href="/signup">
          Make room for better <ArrowRight size={16} />
        </Link>
      </footer>
    </div>
  );
}
