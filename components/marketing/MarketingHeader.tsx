"use client";

import React from "react";
import Link from "next/link";

export function MarketingHeader(){
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Gooey filter for bubble button */}
      <svg xmlns="http://www.w3.org/2000/svg" version="1.1" className="goo" aria-hidden="true">
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      <header className={`site-header ${isScrolled ? "scrolled" : ""}`} id="siteHeader">
        <div className="header-inner header-layout">
          <Link className="brand" href="/" aria-label="Nuvo Home">
            <img className="brand-logo" src="/assets/nuvotypeorange.svg" alt="Nuvo" />
          </Link>

          <nav className="nav nav-center" aria-label="Primary">
            <Link className="nav-link" href="/therapists">Therapists</Link>
            <Link className="nav-link" href="/parents">Parents</Link>
            <Link className="nav-link" href="/solutions">Solutions</Link>
            <Link className="nav-link" href="/pricing">Pricing</Link>
          </nav>

          <div className="nav nav-right" aria-label="Account">
            <Link className="nav-link" href="/login">Sign in</Link>
            <span className="button--bubble__container">
              <Link className="button button--bubble" href="/login">Sign Up</Link>
              <span className="button--bubble__effect-container" aria-hidden="true">
                <span className="circle top-left"></span>
                <span className="circle top-left"></span>
                <span className="circle top-left"></span>
                <span className="button effect-button"></span>
                <span className="circle bottom-right"></span>
                <span className="circle bottom-right"></span>
                <span className="circle bottom-right"></span>
              </span>
            </span>
          </div>
        </div>
      </header>
    </>
  );
}
