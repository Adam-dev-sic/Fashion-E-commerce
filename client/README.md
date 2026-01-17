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
  return (
    <footer
      className="
    bg-neutral-950
    border-t border-white/10 pt-16 pb-8 relative"
    >
      {/* <div className="fixed inset-0 opacity-20 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150"></div> */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">
          {/* Left: Brand Identity & Address */}
          <div className="lg:col-span-3 space-y-6">
            <h2 className="text-2xl font-fashion font-bold tracking-tighter">
              FASHIONIST.
            </h2>
            <p className="text-white/50 text-sm leading-relaxed">
              Redefining modern luxury through curated collections and timeless
              design logic.
            </p>
            <div className="flex space-x-4 pt-2">
              <a
                href="#"
                className="text-white/40 hover:text-white transition-colors"
              >
                <Instagram size={20} />
              </a>
              <a
                href="#"
                className="text-white/40 hover:text-white transition-colors"
              >
                <Twitter size={20} />
              </a>
              <a
                href="#"
                className="text-white/40 hover:text-white transition-colors"
              >
                <Facebook size={20} />
              </a>
            </div>
          </div>

          {/* Middle: Navigation Links (Separated by Gray Lines on Desktop) */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-8 lg:border-l lg:border-white/10 lg:pl-12">
            {/* Column 1 */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-6">
                Client Services
              </h4>
              <ul className="space-y-4 text-sm text-white/60">
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

            {/* Column 2 */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-6">
                The Company
              </h4>
              <ul className="space-y-4 text-sm text-white/60">
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

          {/* Right: Newsletter (Separated by Gray Line) */}
          <div className="lg:col-span-4 lg:border-l lg:border-white/10 lg:pl-12 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">
                Newsletter
              </h4>
              <p className="text-white/50 text-sm mb-6">
                Subscribe for exclusive access to new drops and private sales.
              </p>

              <form className="space-y-4">
                <div className="relative group">
                  <input
                    type="email"
                    placeholder="Email address"
                    className="w-full bg-transparent border-b border-white/30 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white transition-colors"
                  />
                </div>
                <button
                  type="button"
                  className="w-full bg-white text-black text-xs font-bold uppercase tracking-widest py-4 px-6 hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 group"
                >
                  <span>Subscribe</span>
                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-xs text-white/30">
          <p>&copy; 2024 Fashionist Group. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <span className="hover:text-white cursor-pointer">
              Privacy Policy
            </span>
            <span className="hover:text-white cursor-pointer">
              Terms of Service
            </span>
            <span className="hover:text-white cursor-pointer">
              Cookies Settings
            </span>
          </div>
        </div>
    </footer>
  );
}
