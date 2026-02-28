"use client";
import React from "react";
import clsx from "clsx";

type Toast = { id: string; title: string; message?: string; tone: "success"|"error"|"info" };
const Ctx = React.createContext<{ push:(t:Omit<Toast,"id">)=>void }|null>(null);

export function ToastProvider({ children }:{ children: React.ReactNode }){
  const [toasts,setToasts]=React.useState<Toast[]>([]);
  function push(t: Omit<Toast,"id">){
    const id=Math.random().toString(36).slice(2);
    setToasts(p=>[{...t,id},...p].slice(0,3));
    setTimeout(()=>setToasts(p=>p.filter(x=>x.id!==id)), 3200);
  }
  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex w-[360px] flex-col gap-2">
        {toasts.map(t=>(
          <div key={t.id} className={clsx("rounded-xl2 border bg-white p-3 shadow-subtle",
            t.tone==="success" && "border-green-200",
            t.tone==="error" && "border-red-200",
            t.tone==="info" && "border-ink-200"
          )}>
            <div className="text-sm font-semibold">{t.title}</div>
            {t.message ? <div className="mt-1 text-sm text-ink-600">{t.message}</div> : null}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(){
  const ctx=React.useContext(Ctx);
  if(!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
