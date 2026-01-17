import React from "react";
import {
  Sparkles,
  ArrowUpRight,
  ArrowRight,
  Instagram,
  Twitter,
  Facebook,
} from "lucide-react";

export default function Footer() {
  const [openClient, setOpenClient] = React.useState(false);
  const [openCompany, setOpenCompany] = React.useState(false);

  return (
    <footer
      className="
        bg-neutral-950
        border-t border-white/10 pt-12 pb-8
        relative text-white
        px-4 sm:px-6 lg:px-20
      "
    >
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150"></div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
          {/* Left: Brand Identity & Address */}
          <div className="md:col-span-3 space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">FASHIONIST.</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              Redefining modern luxury through curated collections and timeless
              design logic.
            </p>

            <div className="flex space-x-4 pt-2">
              <a
                href="#"
                className="text-white/40 hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
              <a
                href="#"
                className="text-white/40 hover:text-white transition-colors"
                aria-label="Twitter"
              >
                <Twitter size={20} />
              </a>
              <a
                href="#"
                className="text-white/40 hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <Facebook size={20} />
              </a>
            </div>
          </div>

          {/* Middle: Navigation Links */}
          <div className="md:col-span-5 border-t md:border-t-0 md:border-l md:pl-8 md:border-white/10 pt-4 md:pt-0">
            <div className="md:hidden">
              {/* Mobile: collapsible nav columns */}
              <div className="space-y-4">
                <div>
                  <button
                    type="button"
                    aria-expanded={openClient}
                    aria-controls="client-services"
                    onClick={() => setOpenClient((v) => !v)}
                    className="w-full flex items-center justify-between py-3 px-2 bg-white/2 rounded-md"
                  >
                    <span className="text-sm font-semibold">Client Services</span>
                    <span
                      className={`transform transition-transform ${
                        openClient ? "rotate-180" : "rotate-0"
                      }`}
                    >
                      <ArrowUpRight size={16} />
                    </span>
                  </button>
                  <div
                    id="client-services"
                    className={`mt-2 overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${
                      openClient ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <ul className="space-y-3 text-sm text-white/70 px-2 pt-2">
                      <li>
                        <a href="#" className="hover:text-white">
                          Shipping & Returns
                        </a>
                      </li>
                      <li>
                        <a href="#" className="hover:text-white">
                          Track Order
                        </a>
                      </li>
                      <li>
                        <a href="#" className="hover:text-white">
                          Size Guide
                        </a>
                      </li>
                      <li>
                        <a href="#" className="hover:text-white">
                          Book an Appointment
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    aria-expanded={openCompany}
                    aria-controls="company-links"
                    onClick={() => setOpenCompany((v) => !v)}
                    className="w-full flex items-center justify-between py-3 px-2 bg-white/2 rounded-md"
                  >
                    <span className="text-sm font-semibold">The Company</span>
                    <span
                      className={`transform transition-transform ${
                        openCompany ? "rotate-180" : "rotate-0"
                      }`}
                    >
                      <ArrowUpRight size={16} />
                    </span>
                  </button>
                  <div
                    id="company-links"
                    className={`mt-2 overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${
                      openCompany ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <ul className="space-y-3 text-sm text-white/70 px-2 pt-2">
                      <li>
                        <a href="#" className="hover:text-white">
                          About Us
                        </a>
                      </li>
                      <li>
                        <a href="#" className="hover:text-white">
                          Careers
                        </a>
                      </li>
                      <li>
                        <a href="#" className="hover:text-white">
                          Legal & Privacy
                        </a>
                      </li>
                      <li>
                        <a href="#" className="hover:text-white">
                          Sustainability
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop: two columns visible */}
            <div className="hidden md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">
                  Client Services
                </h4>
                <ul className="space-y-3 text-sm text-white/70">
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Shipping & Returns
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Track Order
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Size Guide
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Book an Appointment
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">
                  The Company
                </h4>
                <ul className="space-y-3 text-sm text-white/70">
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      About Us
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Careers
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Legal & Privacy
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Sustainability
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right: Newsletter */}
          <div className="md:col-span-4 border-t md:border-t-0 md:border-l md:pl-8 md:border-white/10 pt-4 md:pt-0 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-3">
                Newsletter
              </h4>
              <p className="text-white/60 text-sm mb-4">
                Subscribe for exclusive access to new drops and private sales.
              </p>

              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  // placeholder - replace with your subscribe handler
                }}
              >
                <div className="relative">
                  <input
                    type="email"
                    placeholder="Email address"
                    className="w-full bg-transparent border-b border-white/20 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white transition-colors"
                    required
                    aria-label="Email address"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-white text-black text-xs font-bold uppercase tracking-widest py-3 px-4 hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
                >
                  <span>Subscribe</span>
                  <ArrowRight size={14} />
                </button>
              </form>
            </div>

            {/* Optional small promo / trust badge */}
            <div className="mt-6 text-white/50 text-sm hidden md:flex items-center gap-2">
              <Sparkles size={16} />
              <span>Free shipping over $150 • Easy returns</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-xs text-white/30 gap-3">
          <p className="text-center md:text-left">&copy; 2024 Fashionist Group. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-4">
            <a className="hover:text-white cursor-pointer" href="#">
              Privacy Policy
            </a>
            <a className="hover:text-white cursor-pointer" href="#">
              Terms of Service
            </a>
            <a className="hover:text-white cursor-pointer" href="#">
              Cookies Settings
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
