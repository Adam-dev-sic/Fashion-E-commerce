import React from "react";
import offersData from "../data/offersData";
import { Link } from "react-router-dom";

function Offers() {
  return (
    <div className="w-full">
      <div
        className="
          flex gap-6
          overflow-x-auto snap-x snap-mandatory
          lg:overflow-visible lg:snap-none
          scrollbar-hide
        "
      >
        {offersData.map((offer, i) => (
          <div
            key={i}
            className="
              flex-shrink-0
              w-[85%] sm:w-[70%] md:w-[60%] lg:w-[30%]
              snap-center
            "
          >
            {/* Link now uses `tags` (plural) and encodes the value */}
            <Link to={`/products?${new URLSearchParams({ tags: offer.title }).toString()}`}>
              <div className="overflow-hidden rounded-2xl cursor-pointer group">
                <img
                  src={`/images/${offer.image}`}
                  alt={offer.title}
                  className="
                    w-full
                    h-[420px] lg:h-[520px]
                    object-cover
                    transition duration-300
                    group-hover:scale-105
                  "
                />
              </div>

              <div className="w-full flex justify-center mt-4">
                <h1 className="text-2xl lg:text-3xl font-black group-hover:underline">
                  {offer.title}
                </h1>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Offers;
