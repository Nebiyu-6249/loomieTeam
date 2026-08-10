"use client";

import React from "react";
import { Cpu, Eye, Layers, Zap } from "lucide-react";

export function ArchitectureSection() {
  return (
    <section id="architecture" className="py-24 px-6 md:px-12 max-w-[1700px] mx-auto border-t border-border-custom">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-16">
        <div>
          <span className="text-xs uppercase font-mono tracking-widest text-accent font-bold">
            04 / SYSTEM DESIGN
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mt-2">
            TECHNICAL ARCHITECTURE
          </h2>
        </div>
        <p className="text-foreground-secondary max-w-md text-sm md:text-base mt-4 md:mt-0">
          Engineered for high frame-rate performance, zero layout thrashing, and zero-lag state transitions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Layer 1 */}
        <div className="p-8 rounded-none bg-surface-card border border-border-custom flex flex-col justify-between hover:border-accent transition-colors duration-300 group">
          <div>
            <div className="w-12 h-12 rounded-none bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-6 group-hover:scale-110 transition-transform duration-300">
              <Zap className="w-6 h-6" />
            </div>
            <span className="text-xs font-mono font-bold text-accent uppercase tracking-wider">
              Layer 01
            </span>
            <h3 className="text-xl font-bold mt-2 mb-4">
              Lenis Smooth Scroll & GSAP RAF Sync
            </h3>
            <p className="text-foreground-secondary text-sm leading-relaxed">
              Virtual smooth scroll context syncing 60fps requestAnimationFrame (RAF) cycles directly with GSAP ScrollTrigger updates for seamless parallax without scroll jitter.
            </p>
          </div>
          <div className="mt-8 pt-4 border-t border-border-custom flex items-center justify-between text-xs font-mono text-foreground-secondary">
            <span>Scroll Physics</span>
            <span>GSAP + Lenis</span>
          </div>
        </div>

        {/* Layer 2 */}
        <div className="p-8 rounded-none bg-surface-card border border-border-custom flex flex-col justify-between hover:border-accent transition-colors duration-300 group">
          <div>
            <div className="w-12 h-12 rounded-none bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-6 group-hover:scale-110 transition-transform duration-300">
              <Eye className="w-6 h-6" />
            </div>
            <span className="text-xs font-mono font-bold text-accent uppercase tracking-wider">
              Layer 02
            </span>
            <h3 className="text-xl font-bold mt-2 mb-4">
              View Transitions Radial Theme Engine
            </h3>
            <p className="text-foreground-secondary text-sm leading-relaxed">
              Pointer-coordinate tracking expanding a radial clip-path mask from 0% to 150% across the viewport with zero DOM re-renders via standard CSS custom properties.
            </p>
          </div>
          <div className="mt-8 pt-4 border-t border-border-custom flex items-center justify-between text-xs font-mono text-foreground-secondary">
            <span>Clip-Path Mask</span>
            <span>View Transitions API</span>
          </div>
        </div>

        {/* Layer 3 */}
        <div className="p-8 rounded-none bg-surface-card border border-border-custom flex flex-col justify-between hover:border-accent transition-colors duration-300 group">
          <div>
            <div className="w-12 h-12 rounded-none bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-6 group-hover:scale-110 transition-transform duration-300">
              <Layers className="w-6 h-6" />
            </div>
            <span className="text-xs font-mono font-bold text-accent uppercase tracking-wider">
              Layer 03
            </span>
            <h3 className="text-xl font-bold mt-2 mb-4">
              Strict GPU-Accelerated Layout Rules
            </h3>
            <p className="text-foreground-secondary text-sm leading-relaxed">
              Animations strictly restricted to GPU composite properties (<code className="text-accent font-mono text-xs">transform</code>, <code className="text-accent font-mono text-xs">opacity</code>) to prevent layout shifts and heavy reflows.
            </p>
          </div>
          <div className="mt-8 pt-4 border-t border-border-custom flex items-center justify-between text-xs font-mono text-foreground-secondary">
            <span>Performance</span>
            <span>GPU Transform Only</span>
          </div>
        </div>
      </div>
    </section>
  );
}
