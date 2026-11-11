import { useId, useState } from "react";
import { Minus, Plus } from "lucide-react";
import styles from "./Faq.module.css";

/** Accordion of questions and answers (one open at a time). */
export default function Faq({ title = "Frequently Asked Questions", items, aside }) {
  const [open, setOpen] = useState(-1);
  const baseId = useId();

  return (
    <section className={styles.faqSection}>
      <div className={`${styles.wrap} ${aside ? styles.withAside : ""}`}>
        <div>
          <h2 className={styles.title}>{title}</h2>
          <div className={styles.list}>
            {items.map((item, i) => {
              const isOpen = open === i;
              return (
                <div key={item.q} className={`${styles.item} ${isOpen ? styles.itemOpen : ""}`}>
                  <button
                    type="button"
                    className={styles.question}
                    aria-expanded={isOpen}
                    aria-controls={`${baseId}-${i}`}
                    onClick={() => setOpen(isOpen ? -1 : i)}
                  >
                    <span className={styles.icon} aria-hidden="true">
                      {isOpen ? <Minus size={16} /> : <Plus size={16} />}
                    </span>
                    {item.q}
                  </button>
                  <div id={`${baseId}-${i}`} role="region" className={styles.answer} hidden={!isOpen}>
                    <p>{item.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {aside && <div className={styles.aside}>{aside}</div>}
      </div>
    </section>
  );
}
