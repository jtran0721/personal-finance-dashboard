import { ArrowLeft, FileText, FileWarning, Loader2, Plus, UploadCloud } from 'lucide-react';
import { useRef, useState } from 'react';
import clsx from 'clsx';
import { useStore } from '@/store/useStore';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { ReviewTable } from './ReviewTable';
import { importPdf } from '@/lib/pdfImport';
import { format } from 'date-fns';
import type { ParsedRow, Transaction, TxType } from '@/types';

type Phase = 'idle' | 'parsing' | 'review' | 'empty' | 'noText' | 'error';

const genId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `imp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const reSign = (type: TxType, amount: number) => (type === 'income' ? Math.abs(amount) : -Math.abs(amount));

export function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addTransactions = useStore((s) => s.addTransactions);
  const categories = useStore((s) => s.categories);
  const { toast } = useToast();

  const [tab, setTab] = useState<'upload' | 'manual'>('upload');
  const [phase, setPhase] = useState<Phase>('idle');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [pageCount, setPageCount] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [manual, setManual] = useState({ date: format(new Date(), 'yyyy-MM-dd'), description: '', amount: '', categoryId: 'groceries' });

  const reset = () => {
    setPhase('idle');
    setRows([]);
    setFileName('');
    setPageCount(0);
  };

  const close = () => {
    reset();
    setTab('upload');
    onClose();
  };

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast('Please choose a PDF file', 'error');
      return;
    }
    setFileName(file.name);
    setPhase('parsing');
    try {
      const result = await importPdf(file);
      setPageCount(result.pageCount);
      if (!result.hadText) setPhase('noText');
      else if (result.rows.length === 0) setPhase('empty');
      else {
        setRows(result.rows);
        setPhase('review');
      }
    } catch (err) {
      console.error(err);
      setPhase('error');
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const commitImport = () => {
    const included = rows.filter((r) => r.include);
    const txns: Transaction[] = included.map((r) => ({
      id: genId(),
      date: r.date,
      description: r.description.trim() || '(no description)',
      amount: r.amount,
      type: r.type,
      categoryId: r.categoryId,
      account: 'Imported',
      source: 'pdf',
    }));
    const { added, skipped } = addTransactions(txns);
    toast(`Imported ${added} transaction${added === 1 ? '' : 's'}${skipped ? ` · ${skipped} duplicate${skipped === 1 ? '' : 's'} skipped` : ''}`, 'success');
    close();
  };

  const addManual = () => {
    const amt = Number(manual.amount);
    if (!manual.description.trim() || !Number.isFinite(amt) || amt === 0) {
      toast('Enter a description and a non-zero amount', 'error');
      return;
    }
    const cat = categories.find((c) => c.id === manual.categoryId);
    const type = cat?.type ?? 'expense';
    const { added } = addTransactions([
      {
        id: genId(),
        date: manual.date,
        description: manual.description.trim(),
        amount: Number(reSign(type, amt).toFixed(2)),
        type,
        categoryId: manual.categoryId,
        account: 'Manual',
        source: 'manual',
      },
    ]);
    toast(added ? 'Transaction added' : 'Looks like a duplicate — skipped', added ? 'success' : 'info');
    setManual((m) => ({ ...m, description: '', amount: '' }));
  };

  return (
    <Modal open={open} onClose={close} title="Import transactions" maxWidth="max-w-3xl">
      {/* Tabs */}
      <div className="mb-5 inline-flex rounded-xl bg-black/5 p-1 dark:bg-white/5">
        {(['upload', 'manual'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition-colors',
              tab === t ? 'bg-white text-ink shadow-sm dark:bg-white/10 dark:text-white' : 'muted',
            )}
          >
            {t === 'upload' ? 'Upload PDF' : 'Add manually'}
          </button>
        ))}
      </div>

      {tab === 'upload' && (
        <div>
          {phase === 'idle' && (
            <>
              <label
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={clsx(
                  'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors',
                  dragOver ? 'border-brand-500 bg-brand-500/10' : 'border-black/15 hover:border-brand-400 dark:border-white/15',
                )}
              >
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow-sm">
                  <UploadCloud size={26} />
                </span>
                <div>
                  <p className="font-display font-bold">Drop a bank statement PDF here</p>
                  <p className="muted text-sm">or click to browse · processed entirely in your browser</p>
                </div>
                <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </label>
              <p className="muted mt-3 text-center text-xs">
                Text-based PDFs work best. Scanned/image statements can't be read automatically — use “Add manually”.
              </p>
            </>
          )}

          {phase === 'parsing' && (
            <div className="flex flex-col items-center gap-3 py-16">
              <Loader2 className="animate-spin text-brand-500" size={32} />
              <p className="font-semibold">Reading {fileName}…</p>
              <p className="muted text-sm">Extracting and categorizing transactions</p>
            </div>
          )}

          {phase === 'review' && (
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm">
                <FileText size={16} className="text-brand-500" />
                <span className="font-semibold">{fileName}</span>
                <span className="muted">· {pageCount} page{pageCount === 1 ? '' : 's'} · {rows.length} found</span>
              </div>
              <ReviewTable rows={rows} onChange={setRows} categories={categories} />
              <div className="mt-5 flex items-center justify-between gap-3">
                <button onClick={reset} className="btn-ghost"><ArrowLeft size={16} /> Choose another file</button>
                <button onClick={commitImport} disabled={rows.every((r) => !r.include)} className="btn-primary">
                  Import {rows.filter((r) => r.include).length} transactions
                </button>
              </div>
            </div>
          )}

          {(phase === 'empty' || phase === 'noText' || phase === 'error') && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-sunset/15 text-sunset">
                <FileWarning size={26} />
              </span>
              <p className="font-display font-bold">
                {phase === 'noText' && 'No readable text found'}
                {phase === 'empty' && 'No transactions detected'}
                {phase === 'error' && 'Something went wrong'}
              </p>
              <p className="muted max-w-md text-sm">
                {phase === 'noText' && 'This looks like a scanned or image-only PDF. We can only read text-based statements automatically.'}
                {phase === 'empty' && "We read the PDF but couldn't recognize a transaction layout. You can add entries manually instead."}
                {phase === 'error' && 'The file could not be parsed. Try a different PDF, or add transactions manually.'}
              </p>
              <div className="mt-2 flex gap-3">
                <button onClick={reset} className="btn-outline">Try another file</button>
                <button onClick={() => setTab('manual')} className="btn-primary"><Plus size={16} /> Add manually</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'manual' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={manual.date} onChange={(e) => setManual((m) => ({ ...m, date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Amount</label>
              <input type="number" step="0.01" placeholder="e.g. 42.50" className="input tabular-nums" value={manual.amount} onChange={(e) => setManual((m) => ({ ...m, amount: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <input placeholder="e.g. Whole Foods Market" className="input" value={manual.description} onChange={(e) => setManual((m) => ({ ...m, description: e.target.value }))} />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input cursor-pointer" value={manual.categoryId} onChange={(e) => setManual((m) => ({ ...m, categoryId: e.target.value }))}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
              ))}
            </select>
          </div>
          <p className="muted text-xs">Sign is set automatically from the category type — income adds, everything else subtracts.</p>
          <div className="flex justify-end">
            <button onClick={addManual} className="btn-primary"><Plus size={16} /> Add transaction</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
