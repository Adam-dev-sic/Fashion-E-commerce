import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  ArrowUpRight,
  ArrowRight,
  Instagram,
  Twitter,
  Facebook,
} from "lucide-react";

// NOTE: add this to your index.html <head> to load the font used below:
// <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet">

const brandsData = [
  { title: "Gucci" },
  { title: "BreatheDivinity" },
  { title: "Nike" },
  { title: "Puma" },
  { title: "Adidas" },
  { title: "Jack & Jones" },
  { title: "Fendi" },
  { title: "Dolce & Gabbana" },
];

export default function Brands() {
  const navigate = useNavigate();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleBrandClick = (brandTitle) => {
    navigate(`/products?brand=${encodeURIComponent(brandTitle)}`);
  };

  // Simple mouse move effect for the background gradient
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="relative bg-neutral-950 text-white overflow-hidden font-sans selection:bg-purple-500 selection:text-white">
      {/* Import Fashion Font */}
      <style>
        {`
         
          }
        `}
      </style>

      {/* Grain Overlay for texture */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150"></div>

      <div className="relative z-10 container mx-auto px-6 py-20">
        {/* Header Section */}
        <div className="flex flex-col items-center justify-center mb-16 text-center space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
            <span className="text-xs uppercase tracking-widest text-purple-200 font-medium">
              Curated Collection
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-fashion font-medium tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/60">
            Featured Brands
          </h1>
          <p className="max-w-md text-white/50 text-sm md:text-base font-light">
            Discover the elite selection of global fashion houses available in
            our latest seasonal drop.
          </p>
        </div>

        {/* Brands Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {brandsData.map((brand, index) => (
            <div key={index} className="group relative h-30 w-full">
              {/* Glass Card */}
              <div
                onClick={() => handleBrandClick(brand.title)}
                className="absolute inset-0 cursor-pointer
                bg-white/5 
                border-b-white/25
                border-t-white/25
                backdrop-blur-xl 
                border border-white/10 
                rounded-4xl 
                shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]
                flex flex-col items-center justify-center
                transition-all duration-300 ease-out
                group-hover:bg-white/10 
                group-hover:scale-[1.05]
                group-hover:shadow-[0_20px_40px_0_rgba(237,237,237,0.15)]
                group-hover:border-white/20
                overflow-hidden
              "
              >
                {/* Content */}
                <div className="relative z-10 flex flex-col items-center space-y-4 p-6 text-center">
                  <h3 className="text-2xl md:text-3xl font-fashion italic font-medium text-white group-hover:text-purple-100 transition-colors">
                    {brand.title}
                  </h3>

                  {/* Hover Action */}
                  <div className="opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 flex items-center space-x-1 text-xs uppercase tracking-widest text-white/70">
                    <span>View Collection</span>
                    <ArrowUpRight size={14} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* <Footer /> */}
      </div>
    </div>
  );
}
