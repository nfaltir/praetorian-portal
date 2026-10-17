import { AlertCircle, CheckCircle2 } from "lucide-react";

export function Field({
  label,
  hint,
  error,
  id,
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string; id: string }) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[14px] font-medium">{label}</label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...input}
        className="h-11 rounded-control border border-muted/30 bg-page px-3.5 text-[15px] text-ink outline-none transition-colors placeholder:text-muted/70 hover:border-muted/50 focus:border-brand focus:bg-panel aria-invalid:border-danger"
      />
      {hint && !error && <p id={`${id}-hint`} className="text-[12px] text-muted">{hint}</p>}
      {error && <p id={`${id}-error`} className="text-[12px] text-danger">{error}</p>}
    </div>
  );
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const styles = {
    primary: "bg-brand text-on-dark hover:bg-brand-ink",
    secondary: "border border-line bg-panel text-ink hover:bg-brand-tint",
    danger: "border border-danger/30 bg-panel text-danger hover:bg-danger-tint",
  }[variant];
  return (
    <button
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-control px-5 text-[14px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${styles} ${className}`}
      {...props}
    />
  );
}

export function Alert({ tone, children }: { tone: "error" | "success" | "info"; children: React.ReactNode }) {
  const style = {
    error: "border-danger/25 bg-danger-tint text-danger",
    success: "border-success/25 bg-success-tint text-success",
    info: "border-accent/30 bg-accent-tint text-ink",
  }[tone];
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex gap-2.5 rounded-control border px-3.5 py-3 text-[14px] ${style}`}>
      <Icon size={18} className="mt-px shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
