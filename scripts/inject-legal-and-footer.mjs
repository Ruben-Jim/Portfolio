#!/usr/bin/env node
/**
 * Injects legal SPA articles + site footer into index.html (idempotent).
 * Run: node scripts/inject-legal-and-footer.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = join(ROOT, 'index.html');
const START = '<!-- CWR_LEGAL_PAGES_START -->';
const END = '<!-- CWR_LEGAL_PAGES_END -->';
const FOOTER_START = '<!-- CWR_SITE_FOOTER_START -->';
const FOOTER_END = '<!-- CWR_SITE_FOOTER_END -->';

const UPDATED = 'September 16, 2026';
const CONTACT_EMAIL = 'Ruben.Jim.co@gmail.com';

function nav() {
  return `<nav class="navbar" data-navbar>
<button class="navbar-toggle" data-navbar-btn type="button" aria-label="Toggle menu">
            <ion-icon name="menu-outline" class="navbar-toggle-icon-open"></ion-icon>
            <ion-icon name="close-outline" class="navbar-toggle-icon-close"></ion-icon>
          </button>
          <div class="navbar-menu" data-navbar-menu>
            <ul class="navbar-list">
              <li class="navbar-item"><button class="navbar-link" data-nav-link data-page-name="home"><span data-i18n="nav.home">Home</span></button></li>
              <li class="navbar-item"><button class="navbar-link" data-nav-link data-page-name="about"><span data-i18n="nav.about">About</span></button></li>
              <li class="navbar-item"><button class="navbar-link" data-nav-link data-page-name="testimonials"><span data-i18n="nav.testimonials">Testimonials</span></button></li>
              <li class="navbar-item"><button class="navbar-link" data-nav-link data-page-name="portfolio"><span data-i18n="nav.portfolio">Portfolio</span></button></li>
              <li class="navbar-item"><button class="navbar-link" data-nav-link data-page-name="services-pricing"><span data-i18n="nav.services_pricing">Services & Pricing</span></button></li>
              <li class="navbar-item" style="display: none;"><button class="navbar-link" data-nav-link data-page-name="business-systems">What We Build</button></li>
              <li class="navbar-item"><button class="navbar-link" data-nav-link data-page-name="hire-me"><span data-i18n="nav.start_project">Start a project</span></button></li>
              <li class="navbar-item"><button class="navbar-link" data-nav-link data-page-name="contact"><span data-i18n="nav.contact">Contact</span></button></li>
              <li class="navbar-item" style="display: none;"><button class="navbar-link" data-nav-link data-page-name="messages">Messages</button></li>
              <li class="navbar-item" style="display: none;"><button class="navbar-link" data-nav-link data-page-name="admin">Admin</button></li>
              <li class="navbar-item navbar-item--lang-toggle">
                <div class="cwr-lang-toggle" role="group" aria-label="Language / Idioma">
                  <button type="button" class="cwr-lang-btn active" data-lang-target="en" onclick="cwrSetLang('en')" aria-pressed="true">🇺🇸 EN</button>
                  <button type="button" class="cwr-lang-btn" data-lang-target="es" onclick="cwrSetLang('es')" aria-pressed="false">🇲🇽 ES</button>
                </div>
              </li>
            </ul>
          </div>
        </nav>`;
}

function crosslinks(current) {
  const links = [
    ['privacy', 'Privacy'],
    ['terms', 'Terms'],
    ['cookies', 'Cookies'],
    ['refund', 'Refunds'],
    ['acceptable-use', 'Acceptable Use'],
    ['accessibility', 'Accessibility']
  ];
  return `<nav class="legal-crosslinks" aria-label="Other legal pages">
          ${links
            .map(([id, label]) =>
              id === current
                ? `<span class="legal-crosslinks-current" aria-current="page">${label}</span>`
                : `<a href="/${id}/" class="legal-crosslinks-link" onclick="if(typeof switchToPage==='function'){switchToPage('${id}');}return false;">${label}</a>`
            )
            .join('\n          ')}
        </nav>`;
}

function article(id, title, bodyHtml) {
  return `
      <article class="legal-page" data-page="${id}">
        ${nav()}
        <header>
          <h2 class="h2 article-title">${title}</h2>
          <p class="legal-updated">Last updated: ${UPDATED}</p>
        </header>
        <section class="legal-prose">
${bodyHtml}
        </section>
        ${crosslinks(id)}
        <p class="legal-disclaimer">Plain-language summary of how this site works today — not a substitute for legal advice. Questions: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>
      </article>`;
}

const pages = [
  [
    'privacy',
    'Privacy Policy',
    `          <p>This Privacy Policy explains how <strong>CodeWithRuben</strong> (“we”, “us”) collects and uses information on <strong>rubenjimenez.dev</strong>. It covers the public marketing site, contact and project inquiry forms, scheduling, private message threads, and related studio tools.</p>
          <h3>Who we are</h3>
          <p>CodeWithRuben is a Fresno, California web &amp; mobile development studio operated by Ruben Jimenez. Contact: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>
          <h3>Information you provide</h3>
          <ul>
            <li><strong>Contact form</strong> — full name, email address, and message text.</li>
            <li><strong>Start a project (hire) form</strong> — full name, email, project description, and package / project-type / budget selections you choose.</li>
            <li><strong>Schedule a call</strong> — name, email, and the time slot you book.</li>
            <li><strong>Private messages</strong> — content you send in a conversation thread after contacting us (including when you reopen a thread with your email).</li>
            <li><strong>Client portal / invites</strong> — information needed to open a secure link we send you (for example a testimonial invite or project portal token).</li>
          </ul>
          <h3>Information collected automatically</h3>
          <ul>
            <li><strong>Device &amp; usage basics</strong> — browser type, pages viewed, and similar technical data needed to run the site securely.</li>
            <li><strong>Preferences in your browser</strong> — language choice, cookie/analytics consent, and last public page viewed (stored locally on your device so the site can remember settings).</li>
            <li><strong>Analytics (only if you accept)</strong> — Google Analytics (GA4) to understand aggregate traffic. If you decline, analytics scripts are not loaded for that choice.</li>
            <li><strong>Embedded maps</strong> — the Contact page may load a Google Maps embed, which can set its own cookies under Google’s policies.</li>
          </ul>
          <h3>How we use information</h3>
          <ul>
            <li>Respond to inquiries and continue conversations in your private thread.</li>
            <li>Schedule calls and follow up on project requests.</li>
            <li>Operate and improve the site (including understanding which pages are useful when analytics is accepted).</li>
            <li>Secure the admin area and client tools (studio staff authentication is separate from public visitors).</li>
          </ul>
          <h3>Where data is stored</h3>
          <p>Form messages, conversation threads, scheduling details, and related studio data are stored with <strong>Google Firebase</strong> (cloud database and related services) under our project. We do not sell your personal information or rent email lists to advertisers.</p>
          <h3>Sharing</h3>
          <p>We share information only when needed to run the service: with infrastructure providers (for example Firebase / Google Cloud), with analytics providers when you have accepted analytics cookies, or when required by law. We do not sell personal data.</p>
          <h3>Retention</h3>
          <p>Inquiry and message data is kept as long as needed to serve the conversation and run the studio, or until you ask us to delete it (subject to legal or operational needs such as active project records).</p>
          <h3>Your choices</h3>
          <ul>
            <li>Decline analytics cookies via the consent banner (or clear site data and choose again).</li>
            <li>Email us to request access, correction, or deletion of personal information you sent us.</li>
            <li>Stop using forms or messaging at any time.</li>
          </ul>
          <h3>Children</h3>
          <p>This site is intended for business owners and adults. We do not knowingly collect personal information from children under 13.</p>
          <h3>Changes</h3>
          <p>We may update this policy as the site changes. The “Last updated” date at the top will change when we do. Continued use after an update means you have read the revised policy.</p>
          <h3>Contact</h3>
          <p>Privacy questions: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> or use the <a href="/contact/" onclick="if(typeof switchToPage==='function'){switchToPage('contact');}return false;">Contact</a> page.</p>`
  ],
  [
    'terms',
    'Terms of Service',
    `          <p>These Terms govern use of <strong>rubenjimenez.dev</strong> and related CodeWithRuben studio pages. By using the site you agree to these Terms. If you are buying a project, the written proposal / statement of work (SOW) and invoice for that project control the commercial details.</p>
          <h3>What this site is</h3>
          <p>The site is a portfolio and intake channel for custom web and mobile work. Content is informational. Package prices and timelines shown publicly are starting points; final scope is confirmed in writing before paid production work.</p>
          <h3>Acceptable use</h3>
          <p>Do not misuse the site: no scraping that harms the service, no attempts to access admin or other people’s message threads, no malware, spam, or illegal content in forms or messages. See also our <a href="/acceptable-use/" onclick="if(typeof switchToPage==='function'){switchToPage('acceptable-use');}return false;">Acceptable Use Policy</a>.</p>
          <h3>Accounts &amp; messages</h3>
          <p>Private message threads and portals are for people we are communicating with about projects. Keep login links and emails confidential. You are responsible for information you submit.</p>
          <h3>Intellectual property</h3>
          <ul>
            <li><strong>Site content</strong> — CodeWithRuben branding, copy, and portfolio presentation on this site are owned by us unless noted otherwise.</li>
            <li><strong>Client projects</strong> — Ownership and license for deliverables are defined in the project agreement (license vs buyout). Until agreed in writing, exploratory mockups remain our work product.</li>
          </ul>
          <h3>No guaranteed business outcomes</h3>
          <p>We build software and sites as specified. We do not guarantee leads, revenue, app-store approval outcomes, or third-party uptime. Results depend on your market, operations, and vendors you use.</p>
          <h3>Third-party services</h3>
          <p>The site relies on providers such as hosting, Firebase, Google Analytics (if accepted), maps embeds, and email. Their outages or policy changes are outside our control. See the Privacy Policy for data handling.</p>
          <h3>Disclaimer</h3>
          <p>The site and public materials are provided “as is” without warranties of any kind to the fullest extent allowed by law.</p>
          <h3>Limitation of liability</h3>
          <p>To the fullest extent permitted by law, CodeWithRuben and Ruben Jimenez are not liable for indirect, incidental, special, consequential, or lost-profit damages arising from use of this site or inability to use it. For paid project work, liability is limited as stated in the applicable SOW / contract (and typically will not exceed fees paid for the specific engagement).</p>
          <h3>Indemnity</h3>
          <p>You agree to be responsible for claims arising from content you submit or from your misuse of the site.</p>
          <h3>Governing law</h3>
          <p>These Terms are governed by the laws of the State of California, USA, without regard to conflict-of-law rules. Venue for disputes relating to this site is in courts located in Fresno County, California, unless a project contract says otherwise.</p>
          <h3>Changes</h3>
          <p>We may update these Terms; the date above will change when we do.</p>
          <h3>Contact</h3>
          <p><a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>`
  ],
  [
    'cookies',
    'Cookie &amp; Analytics Notice',
    `          <p>This notice explains cookies and similar storage used on <strong>rubenjimenez.dev</strong>.</p>
          <h3>Essential / preference storage</h3>
          <p>We use your browser’s local storage (and similar) for things the site needs to remember:</p>
          <ul>
            <li><strong>Language</strong> — English or Spanish preference.</li>
            <li><strong>Cookie choice</strong> — whether you accepted or declined analytics.</li>
            <li><strong>Navigation helpers</strong> — last public page, outreach draft helpers, and message-session helpers so forms and threads work smoothly on return visits.</li>
          </ul>
          <p>These are not used to sell ads. Clearing site data for this domain resets them.</p>
          <h3>Analytics cookies (optional)</h3>
          <p>If you tap <strong>Accept</strong> on the consent banner, we load <strong>Google Analytics 4</strong> (measurement ID <code>G-ZHKR19JXE1</code>) to see aggregate page views and referrals. If you tap <strong>Decline</strong>, we do not load that analytics script for your stored choice.</p>
          <h3>Third-party embeds</h3>
          <p>Pages such as Contact may embed Google Maps, which can set cookies controlled by Google. See Google’s documentation for details.</p>
          <h3>How to change your mind</h3>
          <ul>
            <li>Clear site data / cookies for rubenjimenez.dev in your browser, then reload — the consent banner can appear again.</li>
            <li>Or email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> and we can point you to the simplest reset steps.</li>
          </ul>
          <h3>More detail</h3>
          <p>See the <a href="/privacy/" onclick="if(typeof switchToPage==='function'){switchToPage('privacy');}return false;">Privacy Policy</a> for how form and message data is handled.</p>`
  ],
  [
    'refund',
    'Refund &amp; Cancellation Policy',
    `          <p>This policy covers payments for CodeWithRuben studio packages and custom work sold through this site’s intake process. Project-specific SOWs override this page if they conflict.</p>
          <h3>Free mockups &amp; exploratory work</h3>
            <p>Exploratory mockups offered before a paid package are complimentary and <strong>do not</strong> create a live product, hosting, maintenance, or legal-page obligation. They are not refundable because no fee was charged.</p>
          <h3>Paid packages</h3>
          <ul>
            <li>Production, hosting setup, care plans, and site essentials (including Privacy / Terms / cookie notice / branded 404 on client builds) begin after package payment and written approval of scope.</li>
            <li>Because custom software is made-to-order, <strong>all sales are generally final</strong> once paid production work has started.</li>
          </ul>
          <h3>Cancellations before work starts</h3>
          <p>If you cancel in writing <strong>before</strong> we begin paid production (and before any kickoff materials beyond a free mockup), we will refund fees paid for that unstarted package, minus any non-refundable third-party costs we already incurred with your approval (for example domain or vendor fees).</p>
          <h3>Cancellations after work starts</h3>
          <p>If you cancel after production has started, fees for work already performed are earned and non-refundable. Any unused prepaid portion may be discussed case-by-case; there is no automatic full refund.</p>
          <h3>Maintenance / care plans</h3>
          <p>Recurring care (when purchased) can be canceled going forward per the care terms on your invoice. Fees already billed for a period that has begun are typically non-refundable.</p>
          <h3>Chargebacks</h3>
          <p>Please contact us first at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> so we can resolve issues. Unwarranted chargebacks may result in suspension of delivery and recovery of fees and costs.</p>
          <h3>How to request a refund or cancel</h3>
          <p>Email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> with your name, project or invoice reference, and reason. We typically respond within a few business days.</p>`
  ],
  [
    'acceptable-use',
    'Acceptable Use Policy',
    `          <p>This Acceptable Use Policy applies to anyone using <strong>rubenjimenez.dev</strong>, contact forms, scheduling, private messaging, or related studio tools.</p>
          <h3>Allowed</h3>
          <ul>
            <li>Learning about our services and portfolio.</li>
            <li>Sending genuine project or support inquiries.</li>
            <li>Using a client portal or message thread we have opened with you.</li>
          </ul>
          <h3>Not allowed</h3>
          <ul>
            <li>Attempting to access admin areas, other customers’ conversations, or private tokens you were not given.</li>
            <li>Automated scraping, flooding forms, or spam.</li>
            <li>Malware, phishing, or content that is illegal, harassing, or infringing.</li>
            <li>Misrepresenting your identity in a way meant to deceive us or others.</li>
            <li>Interfering with site security or availability.</li>
          </ul>
          <h3>Enforcement</h3>
          <p>We may refuse, remove, or block access, delete abusive content, and contact providers or authorities when appropriate. These steps can be taken without prior notice when needed to protect the service or other users.</p>
          <h3>Reporting</h3>
          <p>Report abuse to <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>`
  ],
  [
    'accessibility',
    'Accessibility Statement',
    `          <p>CodeWithRuben aims to make <strong>rubenjimenez.dev</strong> usable for as many people as possible, including people who use keyboards, screen readers, or browser zoom.</p>
          <h3>What we do</h3>
          <ul>
            <li>Semantic headings and labels on primary public pages and forms.</li>
            <li>Keyboard-accessible navigation and dialogs where the design system supports it.</li>
            <li>Visible focus styles on interactive controls in our theme.</li>
            <li>Language toggle and consent controls that can be operated without a mouse.</li>
            <li>Ongoing fixes when we find barriers during design and QA.</li>
          </ul>
          <h3>Known limits</h3>
          <p>Some third-party embeds (for example maps), rich admin tools, and legacy portfolio media may not meet the same standard as the core marketing pages. We improve these over time as we touch those areas.</p>
          <h3>Standards</h3>
          <p>We use the <strong>WCAG 2.2 Level AA</strong> guidelines as a practical target for new public UI work. This statement is not a formal conformance claim for every page and state of the site.</p>
          <h3>Feedback</h3>
          <p>If you hit a barrier, email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> with the page URL and what you were trying to do. We will work to provide the information another way and fix the issue when we can.</p>
          <h3>Compatibility</h3>
          <p>We test primarily on current releases of major browsers on desktop and mobile. Assistive technology results can vary by browser and OS combination.</p>`
  ]
];

const legalBlock = `${START}
${pages.map(([id, title, body]) => article(id, title, body)).join('\n')}
${END}
`;

const footerBlock = `${FOOTER_START}
    <footer class="site-footer" data-site-footer>
      <div class="site-footer-inner">
        <p class="site-footer-brand">CodeWith<span class="cwr-landing-brand-accent">Ruben</span></p>
        <div class="site-footer-links">
          <nav class="site-footer-nav" aria-label="Legal and contact">
            <a href="/privacy/" onclick="if(typeof switchToPage==='function'){switchToPage('privacy');}return false;">Privacy</a>
            <span class="site-footer-sep" aria-hidden="true">·</span>
            <a href="/terms/" onclick="if(typeof switchToPage==='function'){switchToPage('terms');}return false;">Terms</a>
            <span class="site-footer-sep" aria-hidden="true">·</span>
            <a href="/cookies/" onclick="if(typeof switchToPage==='function'){switchToPage('cookies');}return false;">Cookies</a>
            <span class="site-footer-sep" aria-hidden="true">·</span>
            <a href="/contact/" onclick="if(typeof switchToPage==='function'){switchToPage('contact');}return false;">Contact</a>
          </nav>
          <nav class="site-footer-nav site-footer-nav--secondary" aria-label="More policies">
            <a href="/refund/" onclick="if(typeof switchToPage==='function'){switchToPage('refund');}return false;">Refunds</a>
            <span class="site-footer-sep" aria-hidden="true">·</span>
            <a href="/acceptable-use/" onclick="if(typeof switchToPage==='function'){switchToPage('acceptable-use');}return false;">Acceptable Use</a>
            <span class="site-footer-sep" aria-hidden="true">·</span>
            <a href="/accessibility/" onclick="if(typeof switchToPage==='function'){switchToPage('accessibility');}return false;">Accessibility</a>
          </nav>
        </div>
        <p class="site-footer-copy">© ${new Date().getFullYear()} CodeWithRuben · Fresno, CA</p>
      </div>
    </footer>
${FOOTER_END}
`;

let html = readFileSync(INDEX, 'utf8');

if (html.includes(START) && html.includes(END)) {
  html = html.replace(new RegExp(`${START}[\\s\\S]*?${END}`), legalBlock.trim());
  console.log('Updated existing legal pages block');
} else {
  const needle = '<!-- CWR_LEGAL_PAGES_END -->';
  const beforeMainClose = '      </article>\n\n    </div>\n\n  </main>';
  if (html.includes(beforeMainClose) && !html.includes(START)) {
    html = html.replace(
      beforeMainClose,
      `      </article>\n\n${legalBlock}\n\n    </div>\n\n  </main>`
    );
    console.log('Injected legal pages inside main-content');
  } else {
    console.error('Could not find legal pages injection point');
    process.exit(1);
  }
}

if (html.includes(FOOTER_START) && html.includes(FOOTER_END)) {
  html = html.replace(new RegExp(`${FOOTER_START}[\\s\\S]*?${FOOTER_END}`), footerBlock.trim());
  console.log('Updated existing footer block');
} else if (!html.includes('data-site-footer')) {
  if (!html.includes('  </main>\n\n')) {
    console.error('Could not find </main> for footer injection');
    process.exit(1);
  }
  html = html.replace('  </main>\n\n', `  </main>\n\n${footerBlock}\n`);
  console.log('Injected footer after </main>');
}

// Cookie banner: add Learn more → /cookies
if (!html.includes('data-cookie-learn-more')) {
  html = html.replace(
    '<p class="cwr-onboard-desc" data-i18n="cookie.desc">Google Analytics helps us understand how visitors use this site. No personal data is sold or shared with advertisers.</p>',
    `<p class="cwr-onboard-desc" data-i18n="cookie.desc">Google Analytics helps us understand how visitors use this site. No personal data is sold or shared with advertisers.</p>
        <p class="cwr-onboard-learn"><a href="/cookies/" data-cookie-learn-more onclick="if(typeof switchToPage==='function'){switchToPage('cookies');}return false;">Learn more</a></p>`
  );
  console.log('Linked cookie banner to /cookies');
}

writeFileSync(INDEX, html);
console.log('Wrote', INDEX);
