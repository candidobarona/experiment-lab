import type { ReactNode } from "react";
import "./ui.css";

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`panel ${className}`}>{children}</div>;
}

export function BigNumber({
  value,
  label,
  sublabel,
  tone = "default",
}: {
  value: string;
  label: string;
  sublabel?: string;
  tone?: "default" | "positive" | "negative" | "muted";
}) {
  return (
    <div className={`big-number big-number--${tone}`}>
      <div className="big-number__value">{value}</div>
      <div className="big-number__label">{label}</div>
      {sublabel && <div className="big-number__sublabel">{sublabel}</div>}
    </div>
  );
}

export function InfoTip({ text }: { text: string }) {
  return (
    <span className="info-tip" tabIndex={0}>
      <span className="info-tip__icon" aria-hidden="true">
        i
      </span>
      <span className="info-tip__bubble" role="tooltip">
        {text}
      </span>
    </span>
  );
}

export function Field({
  label,
  tip,
  children,
  hint,
}: {
  label: string;
  tip?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field__label">
        {label}
        {tip && <InfoTip text={tip} />}
      </span>
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}

export function GuardrailBanner({
  severity,
  children,
}: {
  severity: "info" | "warning";
  children: ReactNode;
}) {
  return <div className={`guardrail guardrail--${severity}`}>{children}</div>;
}

export function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn btn--${variant}`}
    >
      {children}
    </button>
  );
}
