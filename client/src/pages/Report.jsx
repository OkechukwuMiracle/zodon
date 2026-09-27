import { Link, useParams } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import InvestigationReport from '../components/analysis/InvestigationReport.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { useInvestigation } from '../hooks/InvestigationContext.jsx';

export default function Report() {
  const { id } = useParams();
  const { findReport } = useInvestigation();
  const found = findReport(id);

  if (!found) {
    return (
      <div className="card">
        <EmptyState
          icon={FileQuestion}
          title="Investigation not found"
          description="This report is not in the current session or in this browser's history. Reports that were not saved are lost when the page is reloaded."
          action={
            <div className="flex gap-2">
              <Link to="/history" className="btn-secondary">Open history</Link>
              <Link to="/investigate" className="btn-primary">New investigation</Link>
            </div>
          }
        />
      </div>
    );
  }
  return <InvestigationReport key={found.report.id} report={found.report} preview={found.preview} source={found.source} />;
}
