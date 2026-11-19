import { SearchX } from "lucide-react";
import { ButtonLink, EmptyState } from "@/components/alloy/primitives";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[480px] px-4 pt-16">
      <EmptyState icon={SearchX} line="This page or basket doesn't exist." action={<ButtonLink href="/">Explore baskets</ButtonLink>} />
    </div>
  );
}
