import { Code2, Github, Twitter } from 'lucide-react';

const footerLinks = {
  Product: ['Features', 'Pricing', 'Changelog', 'Roadmap'],
  Resources: ['Documentation', 'API Reference', 'Blog', 'Status'],
  Company: ['About', 'Careers', 'Contact', 'Privacy'],
  Legal: ['Terms of Service', 'Privacy Policy', 'Security', 'DPA'],
};

export default function Footer() {
  return (
    <footer className="border-t border-border bg-bg-primary/80">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <a href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <Code2 className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-lg font-bold">
                Interview<span className="text-accent-glow">OS</span>
              </span>
            </a>
            <p className="mt-4 text-sm text-text-muted leading-relaxed max-w-xs">
              The interview platform engineers actually want to use. Built for
              modern engineering teams.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <a
                href="#"
                className="w-9 h-9 rounded-lg bg-bg-card flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-colors"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-lg bg-bg-card flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-colors"
              >
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-text-primary mb-4">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-text-muted hover:text-text-primary transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-text-muted">
            &copy; {new Date().getFullYear()} InterviewOS. All rights reserved.
          </p>
          <p className="text-sm text-text-muted">
            Self-hosted &middot; Open Source &middot; Built with love
          </p>
        </div>
      </div>
    </footer>
  );
}
