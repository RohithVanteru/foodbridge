import Link from "next/link";
export default function Layout({ children }: { children: React.ReactNode }) { return <><nav aria-label="Account tools" className="flex flex-wrap justify-center gap-6 bg-white p-4"><Link href="/settings">Profile & notifications</Link><Link href="/privacy">Privacy & data</Link><Link href="/incidents">Incident reports</Link></nav>{children}</>; }
