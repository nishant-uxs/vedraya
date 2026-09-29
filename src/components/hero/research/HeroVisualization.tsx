import { useEffect, useRef } from "react";
import {
  gsap,
  registerGsap,
  prefersReducedMotion,
  isMobileViewport,
} from "../../../lib/motion";
import "./product-hero.css";

type Props = {
  sectionRef: React.RefObject<HTMLElement | null>;
};

export function HeroVisualization({ sectionRef }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerGsap();
    const root = rootRef.current;
    const section = sectionRef.current;
    if (!root || !section) return;

    const reduced = prefersReducedMotion();
    const mobile = isMobileViewport();
    const product = root.querySelector<HTMLElement>("[data-product]");
    const glow = root.querySelector<HTMLElement>("[data-glow]");
    const copy = section.querySelector<HTMLElement>(".hero__copy");

    const onMove = (e: PointerEvent) => {
      if (reduced || !product) return;
      const rect = root.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      gsap.to(product, {
        x: nx * 10,
        y: ny * 6,
        rotateY: nx * 4,
        rotateX: -ny * 3,
        duration: 1.1,
        ease: "power3.out",
        overwrite: "auto",
      });
    };

    const onLeave = () => {
      if (!product) return;
      gsap.to(product, {
        x: 0,
        y: 0,
        rotateX: 0,
        rotateY: 0,
        duration: 1.4,
        ease: "power3.out",
      });
    };

    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);

    const ctx = gsap.context(() => {
      gsap.set(product, { opacity: 0, y: 28, scale: 0.96 });
      gsap.set(glow, { opacity: 0, scale: 0.92 });

      if (!reduced) {
        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .to(glow, { opacity: 1, scale: 1, duration: 1.4 }, 0.05)
          .to(product, { opacity: 1, y: 0, scale: 1, duration: 1.25 }, 0.12);
      } else {
        gsap.set([product, glow], { clearProps: "all", opacity: 1 });
      }

      gsap
        .timeline({
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: mobile ? "+=50%" : "+=120%",
            scrub: 1.05,
            pin: !mobile,
            anticipatePin: 1,
          },
          defaults: { ease: "none" },
        })
        .to(product, { y: -28, scale: 1.06, duration: 0.55 }, 0)
        .to(glow, { scale: 1.18, opacity: 0.75, duration: 0.55 }, 0)
        .to(copy, { y: -36, opacity: 0.55, duration: 0.55 }, 0)
        .to(product, { y: -72, scale: 1.12, opacity: 0.85, duration: 0.45 }, 0.55)
        .to(glow, { opacity: 0.35, scale: 1.28, duration: 0.45 }, 0.55)
        .to(copy, { opacity: 0.2, y: -64, duration: 0.45 }, 0.55);
    }, root);

    return () => {
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      ctx.revert();
    };
  }, [sectionRef]);

  return (
    <div ref={rootRef} className="p-hero" aria-label="VEDRAYA product">
      <div className="p-hero__glow" data-glow aria-hidden />
      <div className="p-hero__stage" data-product>
        <img
          src="/vedraya-product-hero.png?v=2"
          alt="VEDRAYA research intelligence system"
          className="p-hero__img"
          draggable={false}
        />
      </div>
    </div>
  );
}
