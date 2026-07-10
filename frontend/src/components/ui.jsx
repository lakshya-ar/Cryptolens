import { motion } from "framer-motion";
import { AnimatedNumber } from "../fx/AnimatedNumber.jsx";

const panelVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.985 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  }),
};

/**
 * Glass panel with a staggered entrance (via `index`), hover lift, and an
 * optional state glow: glow="ok" | "warn" | "crit".
 */
export function Panel({ title, subtitle, actions, className = "", glow, index = 0, children }) {
  return (
    <motion.section
      className={`panel ${className}`}
      data-glow={glow}
      custom={index}
      variants={panelVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
    >
      <header className="panel-head">
        <div className="panel-title">
          <h3>{title}</h3>
          {subtitle && <span className="panel-sub">{subtitle}</span>}
        </div>
        {actions && <div className="panel-actions">{actions}</div>}
      </header>
      <div className="panel-body">{children}</div>
    </motion.section>
  );
}

export function Status({ loading, error, empty, children }) {
  if (error) return <div className="status err">⚠ {error}</div>;
  if (loading) return <div className="status">Loading…</div>;
  if (empty) return <div className="status">No data in range</div>;
  return children;
}

/**
 * Stat readout. Pass `num` (raw number) + `format` to get a spring-animated
 * counter; otherwise `value` renders as plain text.
 */
export function Stat({ label, value, num, format, tone }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      {format ? (
        <AnimatedNumber value={num} format={format} className={`stat-value ${tone ?? ""}`} />
      ) : (
        <span className={`stat-value ${tone ?? ""}`}>{value}</span>
      )}
    </div>
  );
}
