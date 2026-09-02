import Link from "next/link";

export default function BackLink({ href, children }) {
  return (
    <p className="mb-2 text-sm">
      <Link href={href} className="text-slate-500 hover:text-brand-600 hover:underline">
        ← {children}
      </Link>
    </p>
  );
}
