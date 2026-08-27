import { PageHeaderProps } from "@/types/types";

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header>
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>

      {description && (
        <p className="mt-1 text-muted-foreground">{description}</p>
      )}
    </header>
  );
}
