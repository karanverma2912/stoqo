"use client";

import { useLanguage } from "@/components/language-provider";
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
  const { tr } = useLanguage();
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
          <a href="#how">{tr("How it works")}</a>
          <Link href="/login">{tr("Log in")}</Link>
          <Link className="button dark-button" href="/signup">
            {tr("Start your free trial")}
            <ArrowUpRight size={17} />
          </Link>
        </nav>
      </header>
      <main>
        <div className="hero">
          <section>
            <span className="eyebrow">
              <span className="tiny-dot" /> {tr("BIG IDEAS. SMALL BUSINESSES.")}
            </span>
            <h1>
              {tr("Your stock.")}
              <br />
              {tr("In a")}
              <span>{tr("good place.")}</span>
            </h1>
            <p>
              {tr("Less counting. Less guessing. More growing.")}
              <br />
              {tr("Meet the refreshingly simple home for your inventory.")}
            </p>
            <Link href="/signup" className="button primary big">
              {tr("Let’s get you stocked")}
              <ArrowUpRight size={21} />
            </Link>
            <div className="hero-note">
              <Check size={15} /> {tr("No card required")}
              <span>·</span> {tr("Made for your phone")}
            </div>
          </section>
          <section
            className="hero-preview"
            aria-label="Example inventory preview"
          >
            <div className="preview-top">
              <span className="wordmark">stoqo.</span>
              <span className="pill">{tr("A little peace of mind")}</span>
            </div>
            <div className="preview-greeting">
              {tr("Your shelves, at a glance")}
            </div>
            <div className="preview-number">
              {tr("All stocked up.")}
              <PackageCheck size={35} />
            </div>
            <div className="preview-cards">
              <div>
                <span>{tr("STOCK IN")}</span>
                <strong>
                  +24 <small>{tr("units")}</small>
                </strong>
                <ArrowDownLeft />
              </div>
              <div>
                <span>{tr("READY TO SELL")}</span>
                <strong>
                  148 <small>{tr("units")}</small>
                </strong>
                <Boxes />
              </div>
            </div>
            <div className="preview-item">
              <span className="product-avatar">OT</span>
              <div>
                <strong>{tr("Everyday oversized tee")}</strong>
                <small>{tr("Black / Medium")}</small>
              </div>
              <span className="status healthy">{tr("Healthy stock")}</span>
            </div>
            <div className="preview-item">
              <span className="product-avatar blue">CB</span>
              <div>
                <strong>{tr("Canvas carry-all")}</strong>
                <small>{tr("Natural / One size")}</small>
              </div>
              <span className="status low">{tr("Running low")}</span>
            </div>
            <div className="preview-foot">
              <ScanLine size={18} /> {tr("Scan it. Stock it. Sorted.")}
              <span>{tr("EXAMPLE WORKSPACE")}</span>
            </div>
          </section>
        </div>
        <section id="how" className="landing-features">
          <div>
            <span>{tr("01 / MAKE IT YOURS")}</span>
            <h2>{tr("Your business. Your space.")}</h2>
            <p>
              {tr(
                "Create your account and name your business. That’s the setup.",
              )}
            </p>
          </div>
          <div>
            <span>{tr("02 / ADD YOUR FIRST")}</span>
            <h2>{tr("A name is all you need.")}</h2>
            <p>
              {tr(
                "Add a product and its opening stock. The extra details can wait.",
              )}
            </p>
          </div>
          <div>
            <span>{tr("03 / GET ON WITH IT")}</span>
            <h2>{tr("Every move, remembered.")}</h2>
            <p>
              {tr(
                "Stock in, stock out, and a clear history. Know where you stand.",
              )}
            </p>
          </div>
        </section>
      </main>
      <footer>
        <span className="wordmark">stoqo.</span>
        <span>{tr("A little less stock stress.")}</span>
        <Link href="/signup">
          {tr("Make room for better")}
          <ArrowRight size={16} />
        </Link>
      </footer>
    </div>
  );
}
