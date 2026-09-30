import styles from "./background-atmosphere.module.css";

export function BackgroundAtmosphere() {
  return (
    <div className={styles.atmosphere} aria-hidden="true">
      <div className={styles.mist} />
    </div>
  );
}
