'use client';

import { useMemo, useState } from 'react';
import { Label } from '@/components/ui/Primitives';
import type {
  AssuranceAnalyzeRequest,
  AssuranceCounterpartyStatus,
  AssuranceEvidenceSource,
  AssuranceTemplate,
  AssuranceUrgency,
} from '@/lib/types';

const SCALE = 10n ** 9n;

function humanToAtomic(value: string): string | null {
  const cleaned = value.replace(/[, ]+/g, '').trim();
  if (!cleaned) return null;
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const [wholePart, fracPartRaw = ''] = cleaned.split('.');
  const fracPart = (fracPartRaw + '0'.repeat(9)).slice(0, 9);
  try {
    const total = BigInt(wholePart) * SCALE + BigInt(fracPart);
    return total.toString();
  } catch {
    return null;
  }
}

interface Props {
  template: AssuranceTemplate;
  onSubmit: (body: AssuranceAnalyzeRequest) => Promise<void> | void;
  running: boolean;
}

interface FormState {
  description: string;
  amountHuman: string;
  agentConfidence: number;
  counterpartyStatus: AssuranceCounterpartyStatus;
  evidenceSource: AssuranceEvidenceSource;
  maxLossBps: number;
  urgency: AssuranceUrgency;
}

const DEFAULTS: FormState = {
  description: '',
  amountHuman: '10,000',
  agentConfidence: 0.7,
  counterpartyStatus: 'unknown',
  evidenceSource: 'signed_delivery_attestation',
  maxLossBps: 200,
  urgency: 'normal',
};

const PRESETS: { id: string; label: string; state: Partial<FormState> }[] = [
  {
    id: 'supplier',
    label: 'Supplier payment · 10,000 csprUSD · unknown counterparty',
    state: {
      description:
        'Autonomous procurement payment to an industrial parts supplier under a signed delivery attestation.',
      amountHuman: '10,000',
      agentConfidence: 0.72,
      counterpartyStatus: 'unknown',
      evidenceSource: 'signed_delivery_attestation',
      maxLossBps: 200,
      urgency: 'normal',
    },
  },
  {
    id: 'treasury',
    label: 'Treasury disbursement · 50,000 csprUSD · known counterparty',
    state: {
      description:
        'DAO treasury disbursement approved by a multisig. Payment executes when the approval record is present.',
      amountHuman: '50,000',
      agentConfidence: 0.9,
      counterpartyStatus: 'known',
      evidenceSource: 'multisig_approval',
      maxLossBps: 100,
      urgency: 'low',
    },
  },
  {
    id: 'dex',
    label: 'DEX swap · 100,000 csprUSD · execution receipt',
    state: {
      description:
        'Autonomous DEX swap of 100k USDC into CSPR with a maximum 1 percent slippage tolerance and a fixed route.',
      amountHuman: '100,000',
      agentConfidence: 0.8,
      counterpartyStatus: 'unknown',
      evidenceSource: 'execution_receipt',
      maxLossBps: 100,
      urgency: 'high',
    },
  },
];

export default function ScenarioForm({ template, onSubmit, running }: Props) {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [error, setError] = useState<string | null>(null);

  const amountAtomic = useMemo(() => humanToAtomic(form.amountHuman), [form.amountHuman]);

  function applyPreset(id: string) {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setForm((prev) => ({ ...prev, ...preset.state }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.description.trim()) {
      setError('Describe the scenario before analysing it.');
      return;
    }
    if (!amountAtomic) {
      setError('Enter a valid amount in csprUSD, for example 25,000.');
      return;
    }
    await onSubmit({
      templateId: template.id,
      description: form.description.trim(),
      amount: amountAtomic,
      agentConfidence: form.agentConfidence,
      counterpartyStatus: form.counterpartyStatus,
      evidenceSource: form.evidenceSource,
      maxLossBps: form.maxLossBps,
      urgency: form.urgency,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-md border border-rule bg-surface p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <Label>Step 2 · Describe the scenario</Label>
          <h3 className="mt-1 text-lg font-semibold text-bone">
            {template.name}
          </h3>
          <p className="mt-2 max-w-prose text-sm text-muted">
            The AI interprets the risk. The deterministic policy prices the
            minimum bond. Your inputs never touch a Casper transaction.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyPreset(p.id)}
            className="rounded border border-rule bg-ink px-3 py-1.5 text-xs text-muted hover:border-accent/40 hover:text-bone"
          >
            Preset · {p.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Field label="Scenario description" className="md:col-span-2">
          <textarea
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder="Payout for verified delivery of medical supplies to Warehouse 4."
            className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-bone placeholder:text-muted/60 focus:border-accent focus:outline-none"
          />
        </Field>

        <Field
          label="Amount (csprUSD)"
          help={
            amountAtomic
              ? `Base units: ${amountAtomic}`
              : 'Enter a positive amount, for example 25,000.'
          }
        >
          <input
            required
            inputMode="decimal"
            value={form.amountHuman}
            onChange={(e) => setForm({ ...form, amountHuman: e.target.value })}
            className="w-full rounded border border-rule bg-ink px-3 py-2 font-mono text-sm text-bone focus:border-accent focus:outline-none"
          />
        </Field>

        <Field label={`Agent confidence · ${(form.agentConfidence * 100).toFixed(0)}%`}>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={form.agentConfidence}
            onChange={(e) =>
              setForm({ ...form, agentConfidence: Number(e.target.value) })
            }
            className="w-full accent-accent"
          />
        </Field>

        <Field label="Counterparty status">
          <select
            value={form.counterpartyStatus}
            onChange={(e) =>
              setForm({
                ...form,
                counterpartyStatus: e.target.value as AssuranceCounterpartyStatus,
              })
            }
            className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-bone focus:border-accent focus:outline-none"
          >
            <option value="new">New</option>
            <option value="known">Known</option>
            <option value="trusted">Trusted</option>
            <option value="unknown">Unknown</option>
          </select>
        </Field>

        <Field label="Evidence source">
          <select
            value={form.evidenceSource}
            onChange={(e) =>
              setForm({
                ...form,
                evidenceSource: e.target.value as AssuranceEvidenceSource,
              })
            }
            className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-bone focus:border-accent focus:outline-none"
          >
            <option value="signed_delivery_attestation">
              Signed delivery attestation
            </option>
            <option value="paid_claim_registry">Paid claim registry</option>
            <option value="multisig_approval">Multisig approval</option>
            <option value="oracle_report">Oracle report</option>
            <option value="execution_receipt">Execution receipt</option>
          </select>
        </Field>

        <Field
          label={`Maximum tolerated loss · ${form.maxLossBps} bps`}
          help={`${(form.maxLossBps / 100).toFixed(2)}% of principal`}
        >
          <input
            type="range"
            min={25}
            max={1000}
            step={25}
            value={form.maxLossBps}
            onChange={(e) => setForm({ ...form, maxLossBps: Number(e.target.value) })}
            className="w-full accent-accent"
          />
        </Field>

        <Field label="Urgency">
          <div className="flex gap-2">
            {(['low', 'normal', 'high'] as AssuranceUrgency[]).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setForm({ ...form, urgency: u })}
                className={`flex-1 rounded border px-3 py-2 text-xs transition-colors ${
                  form.urgency === u
                    ? 'border-accent/60 bg-accent/10 text-accent'
                    : 'border-rule bg-ink text-bone hover:border-accent/40'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </Field>
      </div>

      {error && (
        <p className="mt-4 text-sm text-slash">{error}</p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={running}
          className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-accent-strong disabled:opacity-60"
        >
          {running ? 'Analysing…' : 'Analyse scenario'}
        </button>
        <span className="text-xs text-muted">
          Design only. No transaction is created.
        </span>
      </div>
    </form>
  );
}

function Field({
  label,
  help,
  children,
  className,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="serial text-[0.6rem] text-muted">{label}</span>
      <div className="mt-2">{children}</div>
      {help && (
        <p className="mt-1 text-[0.7rem] leading-snug text-muted">{help}</p>
      )}
    </label>
  );
}
