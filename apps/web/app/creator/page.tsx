import { redirect } from "next/navigation";

/** v1 creator dashboard moved to Me → Your baskets. */
export default function CreatorPage() {
  redirect("/me");
}

export const revalidate = 30;
