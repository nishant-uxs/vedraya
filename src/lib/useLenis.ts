import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, registerGsap, ScrollTrigger, prefersReducedMotion } from "./motion";

export function useLenis() {
  useEffect(() => {
    registerGsap();

    if (prefersReducedMotion()) {
      ScrollTrigger.refresh();
      return;
    }

    const lenis = new Lenis({
      duration: 0.85,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const ticker = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(ticker);
    gsap.ticker.lagSmoothing(0);

    document.documentElement.classList.add("lenis", "lenis-smooth");

    return () => {
      gsap.ticker.remove(ticker);
      lenis.destroy();
      document.documentElement.classList.remove("lenis", "lenis-smooth");
    };
  }, []);
}
