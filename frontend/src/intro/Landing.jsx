import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

/**
 * Boot-sequence intro: a full-viewport hero that fades and scales away as the
 * user scrolls down into the dashboard ("console"). Pure presentation — the
 * dashboard below is untouched and fully functional without it.
 */
export default function Landing() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const opacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.93]);

  const enterConsole = () =>
    document.querySelector(".app-header")?.scrollIntoView({ behavior: "smooth" });

  return (
    <section ref={ref} className="landing">
      <motion.div className="landing-sticky" style={{ opacity, scale }}>
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            Crypto<span className="lens">Lens</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            Interactive visual analytics · 5 assets · minute-level history · live order flow
          </motion.p>
          <motion.button
            className="btn ghost enter"
            onClick={enterConsole}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.55 }}
            whileTap={{ scale: 0.95 }}
          >
            enter console ↓
          </motion.button>
        </div>
      </motion.div>
    </section>
  );
}
