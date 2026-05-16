import type { LucideIcon } from "lucide-react";

type SectionPlaceholderProps = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export function SectionPlaceholder({ title, description, icon: Icon }: SectionPlaceholderProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <span className="panel-icon">
          <Icon aria-hidden="true" size={20} />
        </span>
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
      <div className="empty-state">
        <p>Backend endpoints are ready for this workflow.</p>
      </div>
    </section>
  );
}

