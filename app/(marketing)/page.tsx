    export default function Page() {
      return (
        <div
          dangerouslySetInnerHTML={{
            __html: `<main>
      <!-- HERO (Ramp-like: big value prop + proof + visual) -->
<section class="section hero" id="top">
  <div class="container">
    <div class="hero-grid">
      <div class="hero-copy">
        <p class="eyebrow">Nuvo for speech practice</p>
        <h1 class="hero-title">Speech practice for kids who love to play</h1>
        <p class="hero-subtitle">
          Create targeted practice in minutes, turn it into games kids actually want to repeat,
          and track progress without chasing worksheets.
        </p>

        <!-- Email CTA (input + button) -->
        <form class="email-cta" action="signup.html" method="GET">
          <label class="sr-only" for="workEmail">Work email</label>
          <input
            id="workEmail"
            name="email"
            class="email-input"
            type="email"
            placeholder="What’s your work email?"
            autocomplete="email"
            required
          />
          <button class="email-button" type="submit">Get started for free</button>
        </form>

        <a class="feedback-link" href="#survey">
          Give feedback <span aria-hidden="true">→</span>
        </a>
      </div>

      <div class="hero-visual">
        <!-- Real hero image -->
        <img class="hero-image" src="assets/heroimage.png" alt="Nuvo preview" loading="eager" />
      </div>
    </div>

    <!-- Social proof strip -->
    <div class="proof">
      <div class="proof-label">Built with feedback from SLPs, parents, and clinics</div>
      <div class="logo-row" aria-label="Logo placeholders">
        <div class="logo-pill">School District</div>
        <div class="logo-pill">Clinic</div>
        <div class="logo-pill">Private Practice</div>
        <div class="logo-pill">University Program</div>
        <div class="logo-pill">Pediatric OT/SLP</div>
      </div>
    </div>
  </div>
</section>


      <!-- SURVEY (compact band, left text + right visual) -->
      <section class="section survey" id="survey">
        <div class="container">
          <div class="survey-grid">
            <div class="survey-copy">
              <h2 class="h2">Built with SLP input</h2>
              <p class="lead">
                Help us make Nuvo even better. Tell us what you want in the dashboard, the games, and the reports.
              </p>

              <a
                class="btn btn-primary"
                href="https://forms.office.com/Pages/ResponsePage.aspx?id=m278xvtRqEi3eZ7lZLQEE6AaF3DwFFJAnD77I3I5d1tUODExV0FNTEhOOUQwWTlOTDREQlFPUTlaTi4u"
                target="_blank"
                rel="noopener noreferrer"
              >
                Take the survey
              </a>
            </div>

            <div class="survey-visual">
              <!-- grey placeholder for survey screenshot -->
              <div class="ph ph-card" aria-label="Survey screenshot placeholder">
                <div class="ph-inner">
                  <span class="ph-tag">Screenshot placeholder</span>
                  <span class="ph-text">Add: assets/survey.png</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- SOLUTIONS (Ramp-like: workflow steps + cards) -->
      <section class="section solutions" id="solutions">
        <div class="container">
          <div class="section-head">
            <h2 class="h2">A simple workflow that actually sticks</h2>
            <p class="lead">
              Nuvo connects therapist goals, parent support, and kid motivation—without adding busywork.
            </p>
          </div>

          <div class="steps">
            <div class="step">
              <div class="step-num">1</div>
              <div class="step-body">
                <h3 class="h3">Build assignments in minutes</h3>
                <p class="p">
                  Choose target sounds, positions, syllables, and difficulty. Nuvo generates practice sets that match the goal.
                </p>
                <div class="mini-card">
                  <div class="mini-title">Example</div>
                  <div class="mini-row"><span>Target</span><strong>/r/ initial</strong></div>
                  <div class="mini-row"><span>Mode</span><strong>Word + phrase</strong></div>
                  <div class="mini-row"><span>Session</span><strong>5–7 minutes</strong></div>
                </div>
              </div>
            </div>

            <div class="step">
              <div class="step-num">2</div>
              <div class="step-body">
                <h3 class="h3">Turn practice into play</h3>
                <p class="p">
                  Kids practice inside short, repeatable games. Parents don’t need to “coach”—the app guides the session.
                </p>
                <div class="ph ph-wide" aria-label="Game preview placeholder">
                  <div class="ph-inner">
                    <span class="ph-tag">Game image placeholder</span>
                    <span class="ph-text">Add a game screenshot later</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="step">
              <div class="step-num">3</div>
              <div class="step-body">
                <h3 class="h3">See progress that’s easy to explain</h3>
                <p class="p">
                  Clear trends for therapists, simple summaries for parents, and motivation boosts for kids.
                </p>
                <div class="ph ph-wide" aria-label="Report preview placeholder">
                  <div class="ph-inner">
                    <span class="ph-tag">Report placeholder</span>
                    <span class="ph-text">Add a dashboard/report screenshot later</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="card-grid">
            <div class="card">
              <h3 class="h3">For therapists</h3>
              <p class="p">
                Create goals, assign practice, and review results—without extra admin time.
              </p>
              <ul class="bullets">
                <li>Client library + assignment templates</li>
                <li>Consistency + accuracy trends</li>
                <li>Simple shareable summaries</li>
              </ul>
            </div>

            <div class="card">
              <h3 class="h3">For parents</h3>
              <p class="p">
                Know exactly what to do at home, how often to do it, and what progress looks like.
              </p>
              <ul class="bullets">
                <li>Short guided sessions</li>
                <li>Clear “what to say” prompts</li>
                <li>Motivation that doesn’t fight you</li>
              </ul>
            </div>

            <div class="card">
              <h3 class="h3">For kids</h3>
              <p class="p">
                Practice feels like a game. Reps happen naturally. Progress feels rewarding.
              </p>
              <ul class="bullets">
                <li>Fun, repeatable minigames</li>
                <li>Positive feedback loops</li>
                <li>Characters + rewards (Spriggy)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- SPRIGGY / PRODUCT SHOWCASE -->
      <section class="section showcase" id="spriggy">
        <div class="container">
          <div class="showcase-grid">
            <div class="showcase-visual">
              <div class="ph ph-tall" aria-label="Spriggy illustration placeholder">
                <div class="ph-inner">
                  <span class="ph-tag">Illustration placeholder</span>
                  <span class="ph-text">Add: Spriggy / characters / scenes</span>
                </div>
              </div>
            </div>

            <div class="showcase-copy">
              <h2 class="h2">Meet Spriggy (and friends)</h2>
              <p class="lead">
                A friendly character system that makes kids want “one more round” — while keeping practice aligned to therapy goals.
              </p>

              <div class="feature-list">
                <div class="feature">
                  <div class="feature-dot"></div>
                  <div>
                    <div class="feature-title">Motivation built in</div>
                    <div class="feature-text">Rewards and progress that encourage consistency without pressure.</div>
                  </div>
                </div>

                <div class="feature">
                  <div class="feature-dot"></div>
                  <div>
                    <div class="feature-title">Therapy-first design</div>
                    <div class="feature-text">Games are wrappers around reps — not distractions from them.</div>
                  </div>
                </div>

                <div class="feature">
                  <div class="feature-dot"></div>
                  <div>
                    <div class="feature-title">Flexible for different needs</div>
                    <div class="feature-text">Articulation, phonology, fluency support, and more over time.</div>
                  </div>
                </div>
              </div>

              <div class="inline-cta">
                <a class="btn btn-secondary" href="signup.html">Try Nuvo</a>
                <a class="text-link" href="#survey">Help shape the roadmap →</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- PRICING -->
      <section class="section pricing" id="pricing">
        <div class="container">
          <div class="section-head">
            <h2 class="h2">Pricing that works for clinics and families</h2>
            <p class="lead">Start simple. Upgrade when you’re ready.</p>
          </div>

          <div class="price-grid">
            <div class="price-card">
              <div class="price-top">
                <div class="price-name">Starter</div>
                <div class="price-amount">$0</div>
                <div class="price-note">for early access</div>
              </div>
              <ul class="bullets">
                <li>Basic assignments</li>
                <li>1–3 active clients</li>
                <li>Core games</li>
              </ul>
              <a class="btn btn-secondary btn-block" href="signup.html">Get early access</a>
            </div>

            <div class="price-card price-card--featured">
              <div class="badge">Most popular</div>
              <div class="price-top">
                <div class="price-name">Pro</div>
                <div class="price-amount">$—</div>
                <div class="price-note">per month</div>
              </div>
              <ul class="bullets">
                <li>Unlimited clients</li>
                <li>Advanced reporting</li>
                <li>Parent summaries</li>
                <li>More games + rewards</li>
              </ul>
              <a class="btn btn-primary btn-block" href="signup.html">Start Pro</a>
            </div>

            <div class="price-card">
              <div class="price-top">
                <div class="price-name">Clinic</div>
                <div class="price-amount">Custom</div>
                <div class="price-note">multi-therapist</div>
              </div>
              <ul class="bullets">
                <li>Team management</li>
                <li>Shared templates</li>
                <li>Clinic-wide analytics</li>
              </ul>
              <a class="btn btn-secondary btn-block" href="#survey">Talk to us</a>
            </div>
          </div>

          <div class="faq">
            <h3 class="h3">FAQ</h3>
            <div class="faq-grid">
              <details class="faq-item">
                <summary>What ages is Nuvo for?</summary>
                <p>We’re designing Nuvo for early elementary through middle school, with adaptable difficulty.</p>
              </details>
              <details class="faq-item">
                <summary>Does it replace therapy?</summary>
                <p>No—Nuvo supports at-home practice and makes it easier to stay consistent between sessions.</p>
              </details>
              <details class="faq-item">
                <summary>Can parents use it without an SLP?</summary>
                <p>Yes. It’s best with guidance, but we’re building parent-friendly pathways for independent use too.</p>
              </details>
              <details class="faq-item">
                <summary>When will more games be available?</summary>
                <p>We’ll release new games in batches—guided by survey feedback and therapist testing.</p>
              </details>
            </div>
          </div>
        </div>
      </section>

      <!-- FOOTER -->
      <footer class="footer" id="footer">
        <div class="container">
          <div class="footer-grid">
            <div class="footer-brand">
              <img class="footer-logo" src="assets/nuvotypeorange.svg" alt="Nuvo" />
              <p class="footer-text">
                Nuvo helps kids practice speech through play—powered by therapist-backed workflows and parent-friendly support.
              </p>
            </div>

            <div class="footer-col">
              <div class="footer-head">Product</div>
              <a class="footer-link" href="#solutions">Solutions</a>
              <a class="footer-link" href="#pricing">Pricing</a>
              <a class="footer-link" href="#survey">Survey</a>
            </div>

            <div class="footer-col">
              <div class="footer-head">For</div>
              <a class="footer-link" href="therapists.html">Therapists</a>
              <a class="footer-link" href="parents.html">Parents</a>
            </div>

            <div class="footer-col">
              <div class="footer-head">Company</div>
              <a class="footer-link" href="#">About</a>
              <a class="footer-link" href="#">Contact</a>
              <a class="footer-link" href="#">Privacy</a>
            </div>
          </div>

          <div class="footer-bottom">
            <div>© <span id="year"></span> Nuvo</div>
            <div class="footer-bottom-links">
              <a href="#" class="footer-mini">Terms</a>
              <a href="#" class="footer-mini">Privacy</a>
            </div>
          </div>
        </div>
      </footer>
    </main>`,
          }}
        />
      );
    }
