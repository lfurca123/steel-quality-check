import logoAsset from "@/assets/migra-logo.svg.asset.json";

export default function MigraLogo({ className = "" }: { className?: string }) {
  return <img src={logoAsset.url} alt="Migra" className={`block object-contain ${className}`} />;
}
