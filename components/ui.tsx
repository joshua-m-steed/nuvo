import clsx from "clsx";
import React from "react";

export function Button({
  variant="primary", size="md", className, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary"|"secondary"|"ghost"|"danger"; size?: "sm"|"md"|"lg" }){
  const base="inline-flex items-center justify-center gap-2 rounded-xl2 font-medium transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed";
  const v={
    primary:"bg-nuvo-600 hover:bg-nuvo-700 text-white shadow-sm",
    secondary:"bg-white hover:bg-ink-50 text-ink-900 border border-ink-200 shadow-sm",
    ghost:"bg-transparent hover:bg-ink-50 text-ink-900",
    danger:"bg-red-600 hover:bg-red-700 text-white shadow-sm"
  } as const;
  const s={ sm:"h-9 px-3 text-sm", md:"h-10 px-4 text-sm", lg:"h-11 px-5 text-base" } as const;
  return <button className={clsx(base, v[variant], s[size], className)} {...props} />;
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>){
  return <input className={clsx("h-10 w-full rounded-xl2 border border-ink-200 bg-white px-3 text-sm shadow-sm placeholder:text-ink-400 focus:border-nuvo-500 focus:ring-2 focus:ring-nuvo-200", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>){
  return <textarea className={clsx("w-full rounded-xl2 border border-ink-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-ink-400 focus:border-nuvo-500 focus:ring-2 focus:ring-nuvo-200", className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>){
  return <select className={clsx("h-10 w-full rounded-xl2 border border-ink-200 bg-white px-3 text-sm shadow-sm focus:border-nuvo-500 focus:ring-2 focus:ring-nuvo-200", className)} {...props} />;
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>){
  return <div className={clsx("rounded-xl2 border border-ink-200 bg-white shadow-subtle", className)} {...props} />;
}
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>){
  return <div className={clsx("px-5 py-4 border-b border-ink-200", className)} {...props} />;
}
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>){
  return <div className={clsx("px-5 py-4", className)} {...props} />;
}

export function Badge({ className, tone="gray", ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: "gray"|"orange"|"green"|"blue" }){
  const t={
    gray:"bg-ink-100 text-ink-700 border-ink-200",
    orange:"bg-nuvo-50 text-nuvo-800 border-nuvo-200",
    green:"bg-green-50 text-green-700 border-green-200",
    blue:"bg-blue-50 text-blue-700 border-blue-200"
  } as const;
  return <span className={clsx("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", t[tone], className)} {...props} />;
}

export function Kpi({ label, value, hint }:{ label:string; value:React.ReactNode; hint?:string }){
  return (
    <Card className="p-4">
      <div className="text-xs text-ink-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      {hint ? <div className="mt-1 text-xs text-ink-500">{hint}</div> : null}
    </Card>
  );
}

export function EmptyState({ title, description, action }:{ title:string; description:string; action?:React.ReactNode }){
  return (
    <div className="rounded-xl2 border border-dashed border-ink-200 bg-white p-10 text-center">
      <div className="mx-auto max-w-md">
        <div className="text-lg font-semibold">{title}</div>
        <div className="mt-2 text-sm text-ink-600">{description}</div>
        {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}

export function SkeletonRow(){
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-8 w-8 rounded-xl2 skeleton" />
      <div className="h-4 w-56 rounded skeleton" />
      <div className="ml-auto h-4 w-24 rounded skeleton" />
    </div>
  );
}

export function Divider(){ return <div className="h-px w-full bg-ink-200" />; }
