"use client";
import React from "react";
import { useAuth } from "../../../lib/authClient";
import { Card, CardContent, CardHeader, Badge } from "../../../components/ui";
import { mockUsers } from "../../../lib/mockDb";

export default function Admin(){
  const { user } = useAuth();
  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-semibold tracking-tight">Admin</div>
        <div className="mt-1 text-sm text-ink-600">Users, clinic config, audit logs (MVP).</div>
      </div>

      <Card>
        <CardHeader><div className="text-sm font-semibold">Users</div></CardHeader>
        <CardContent>
          <div className="overflow-auto rounded-xl2 border border-ink-200">
            <table className="min-w-full text-sm">
              <thead className="bg-ink-50 text-xs text-ink-500">
                <tr>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-200">
                {mockUsers.map(u=>(
                  <tr key={u.id}>
                    <td className="px-3 py-2 font-medium">{u.name}</td>
                    <td className="px-3 py-2 text-ink-600">{u.email}</td>
                    <td className="px-3 py-2"><Badge tone="gray">{u.role}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><div className="text-sm font-semibold">Audit logs</div></CardHeader>
        <CardContent className="text-sm text-ink-600">Placeholder — log events like assignment.created, exemplar.uploaded, etc.</CardContent>
      </Card>
    </div>
  );
}
