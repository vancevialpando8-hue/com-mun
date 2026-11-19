import Link from "next/link";

export type AppTab = "home" | "explore" | "personal" | "battles" | "crew";

type AppTabsProps = {
  active: AppTab;
  crewHref?: string;
};

const tabs: { key: AppTab; label: string; href: string }[] = [
  { key: "home", label: "Home", href: "/?app=1" },
  { key: "explore", label: "Explore", href: "/communities" },
  { key: "personal", label: "Personal", href: "/profile" },
  { key: "battles", label: "Battles", href: "/battles" },
];

export function AppTabs({ active, crewHref = "/communities" }: AppTabsProps) {
  return <nav className="app-tabs" aria-label="Main navigation">
    {tabs.map((tab) => <Link className={active === tab.key ? "active" : ""} href={tab.href} key={tab.key}>{tab.label}</Link>)}
    <Link className={active === "crew" ? "active" : ""} href={crewHref}>Your community</Link>
  </nav>;
}
