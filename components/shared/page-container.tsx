import { PageContainerProps } from "@/types/types";

export function PageContainer({ children }: PageContainerProps) {
  return <div className="mx-auto w-full max-w-7xl px-6 py-8">{children}</div>;
}
