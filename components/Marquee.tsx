"use client";

import React from "react";

const MARQUEE_PHRASES = [
  "DESIGN THAT CONNECTS",
  "FROM IDEA TO IDENTITY",
  "CLEAR. CONNECTED. COMPLETE.",
];

export function Marquee() {
  return (
    <div className="w-full py-7 bg-foreground text-background overflow-hidden select-none my-20 rotate-[-5deg] shadow-2xl relative border-y border-foreground">
      <div className="animate-marquee-smooth whitespace-nowrap gap-16 items-center font-black text-xl md:text-3xl tracking-wider font-sans uppercase">
        {[...MARQUEE_PHRASES, ...MARQUEE_PHRASES, ...MARQUEE_PHRASES].map((phrase, index) => (
          <div key={index} className="flex items-center gap-16 mr-16">
            <span>{phrase}</span>
            <span className="text-xl md:text-2xl text-background font-bold leading-none inline-block">●</span>
          </div>
        ))}
      </div>
    </div>
  );
}
