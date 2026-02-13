interface Props {
  status: 'pending' | 'running' | 'complete' | 'failed' | 'success';
}

const STYLES: Record<string, string> = {
  pending:  'bg-gray-700 text-gray-300',
  running:  'bg-blue-900 text-blue-300 animate-pulse',
  complete: 'bg-green-900 text-green-300',
  success:  'bg-green-900 text-green-300',
  failed:   'bg-red-900 text-red-300',
};

export function StatusBadge({ status }: Props) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STYLES[status] ?? STYLES.pending}`}>
      {status === 'running' && <span className="mr-1">⟳</span>}
      {status}
    </span>
  );
}
