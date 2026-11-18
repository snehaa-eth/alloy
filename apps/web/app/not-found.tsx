import Link from "next/link";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 pt-24 text-center">
      <h1 className="bg-gradient-to-r from-white via-gray-300 to-white bg-clip-text pb-2 text-7xl font-bold tracking-tight text-transparent md:text-9xl">
        404
      </h1>
      <p className="mb-8 text-xl text-gray-400">This page or basket doesn&apos;t exist.</p>
      <Button asChild variant="metal" size="lg">
        <Link href="/">
          <Home className="mr-2 h-5 w-5" />
          Explore baskets
        </Link>
      </Button>
    </div>
  );
}
