/** Zodon logo (client/public/zodon-logo2.png). Designed for the dark navy sidebar. */
export default function Logo({ className = '' }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <img src="/zodon-logo2.png" alt="Zodon" className="h-10 w-auto select-none" draggable="false" />
      <div className="text-[10.5px] tracking-wide text-slate-400">AI Cyber Incident Investigator</div>
    </div>
  );
}
