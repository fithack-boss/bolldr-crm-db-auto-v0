import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ImportUploader } from "@/components/ImportUploader";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await requireAdmin();

  const [owners, batches] = await Promise.all([
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.importBatch.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { user: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Import Data</h1>
        <p className="text-sm text-slate-500">
          Upload a CSV or Excel export. Rows are automatically transformed and appended to the master contacts table.
        </p>
      </div>

      <div className="card p-6">
        <ImportUploader owners={owners} />
      </div>

      <div className="card p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Recent imports</h2>
        {batches.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No imports yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">File</th>
                  <th className="th">By</th>
                  <th className="th">Rows</th>
                  <th className="th">Created</th>
                  <th className="th">Updated</th>
                  <th className="th">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td className="td font-medium text-slate-700">{b.filename}</td>
                    <td className="td">{b.user.name}</td>
                    <td className="td">{b.rowsTotal}</td>
                    <td className="td text-green-600">{b.rowsCreated}</td>
                    <td className="td text-brand-600">{b.rowsUpdated}</td>
                    <td className="td text-slate-500">{formatDateTime(b.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
