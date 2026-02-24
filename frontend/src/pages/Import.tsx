import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api';

type ImportMode = 'transactions' | 'sales';
type TransactionType = 'auto' | 'expense' | 'income';

interface ParsedCSV {
  headers: string[];
  rows: string[][];
  totalRows: number;
  allRows: string[][];
}

interface Template {
  id: number;
  name: string;
  type: ImportMode;
  column_mapping: Record<string, number>;
}

interface TransactionColumnMapping {
  date: number;
  description: number;
  amount: number;
}

interface SalesColumnMapping {
  date: number;
  title: number;
  units: number;
  royalty: number;
  marketplace: number;
}

function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

const Import: React.FC = () => {
  const [mode, setMode] = useState<ImportMode>('transactions');
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedCSV | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragover, setDragover] = useState(false);

  // Column mappings
  const [txMapping, setTxMapping] = useState<TransactionColumnMapping>({ date: -1, description: -1, amount: -1 });
  const [salesMapping, setSalesMapping] = useState<SalesColumnMapping>({ date: -1, title: -1, units: -1, royalty: -1, marketplace: -1 });

  // Source & type
  const [source, setSource] = useState('');
  const [transactionType, setTransactionType] = useState<TransactionType>('auto');

  // Templates
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Import
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTemplates = useCallback(() => {
    api.getTemplates()
      .then((result: Template[]) => setTemplates(result))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleFileSelect = async (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV file.');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setParsing(true);
    setImportResult(null);

    try {
      const result: ParsedCSV = await api.parseCSV(selectedFile);
      setParsed(result);
      // Auto-detect column indices from headers
      autoDetectColumns(result.headers);
    } catch (err: any) {
      setError(err.message || 'Failed to parse CSV');
      setParsed(null);
    } finally {
      setParsing(false);
    }
  };

  const autoDetectColumns = (headers: string[]) => {
    const lower = headers.map((h) => h.toLowerCase().trim());

    // Transaction columns
    const dateIdx = lower.findIndex((h) => h.includes('date'));
    const descIdx = lower.findIndex((h) => h.includes('description') || h.includes('memo') || h.includes('name') || h.includes('payee'));
    const amountIdx = lower.findIndex((h) => h.includes('amount') || h.includes('total') || h.includes('value'));
    setTxMapping({ date: dateIdx, description: descIdx, amount: amountIdx });

    // Sales columns
    const titleIdx = lower.findIndex((h) => h.includes('title') || h.includes('name') || h.includes('book'));
    const unitsIdx = lower.findIndex((h) => h.includes('unit') || h.includes('qty') || h.includes('quantity'));
    const royaltyIdx = lower.findIndex((h) => h.includes('royalty') || h.includes('earning') || h.includes('revenue') || h.includes('amount'));
    const marketplaceIdx = lower.findIndex((h) => h.includes('marketplace') || h.includes('store') || h.includes('market'));
    setSalesMapping({ date: dateIdx, title: titleIdx, units: unitsIdx, royalty: royaltyIdx, marketplace: marketplaceIdx });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragover(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragover(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragover(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleClickDropzone = () => {
    fileInputRef.current?.click();
  };

  const applyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const template = templates.find((t) => String(t.id) === templateId);
    if (!template) return;

    const mapping = template.column_mapping;
    if (template.type === 'transactions') {
      setMode('transactions');
      setTxMapping({
        date: mapping.date ?? -1,
        description: mapping.description ?? -1,
        amount: mapping.amount ?? -1,
      });
    } else {
      setMode('sales');
      setSalesMapping({
        date: mapping.date ?? -1,
        title: mapping.title ?? -1,
        units: mapping.units ?? -1,
        royalty: mapping.royalty ?? -1,
        marketplace: mapping.marketplace ?? -1,
      });
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;
    setSavingTemplate(true);
    try {
      const columnMapping = mode === 'transactions'
        ? { date: txMapping.date, description: txMapping.description, amount: txMapping.amount }
        : { date: salesMapping.date, title: salesMapping.title, units: salesMapping.units, royalty: salesMapping.royalty, marketplace: salesMapping.marketplace };
      await api.saveTemplate({ name: templateName.trim(), type: mode, column_mapping: columnMapping });
      setTemplateName('');
      fetchTemplates();
    } catch (err: any) {
      setError(err.message || 'Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  };

  const isMappingComplete = (): boolean => {
    if (mode === 'transactions') {
      return txMapping.date >= 0 && txMapping.description >= 0 && txMapping.amount >= 0;
    } else {
      return salesMapping.date >= 0 && salesMapping.title >= 0 && salesMapping.units >= 0 && salesMapping.royalty >= 0 && salesMapping.marketplace >= 0;
    }
  };

  const getPreviewRows = (): string[][] => {
    if (!parsed) return [];
    return parsed.rows.slice(0, 20);
  };

  const getMappedPreviewData = (): Record<string, string>[] => {
    const rows = getPreviewRows();
    if (mode === 'transactions') {
      return rows.map((row) => ({
        date: txMapping.date >= 0 ? row[txMapping.date] || '' : '',
        description: txMapping.description >= 0 ? row[txMapping.description] || '' : '',
        amount: txMapping.amount >= 0 ? row[txMapping.amount] || '' : '',
      }));
    } else {
      return rows.map((row) => ({
        date: salesMapping.date >= 0 ? row[salesMapping.date] || '' : '',
        title: salesMapping.title >= 0 ? row[salesMapping.title] || '' : '',
        units: salesMapping.units >= 0 ? row[salesMapping.units] || '' : '',
        royalty: salesMapping.royalty >= 0 ? row[salesMapping.royalty] || '' : '',
        marketplace: salesMapping.marketplace >= 0 ? row[salesMapping.marketplace] || '' : '',
      }));
    }
  };

  const handleImport = async () => {
    if (!parsed || !isMappingComplete()) return;
    setImporting(true);
    setError(null);
    setImportResult(null);

    try {
      if (mode === 'transactions') {
        const result = await api.importTransactions({
          rows: parsed.allRows,
          columnMapping: {
            date: txMapping.date,
            description: txMapping.description,
            amount: txMapping.amount,
          },
          source,
          type: transactionType,
        });
        setImportResult(`Successfully imported ${result.count ?? parsed.totalRows} transactions.`);
      } else {
        const result = await api.importSales({
          rows: parsed.allRows,
          columnMapping: {
            date: salesMapping.date,
            title: salesMapping.title,
            units: salesMapping.units,
            royalty: salesMapping.royalty,
            marketplace: salesMapping.marketplace,
          },
          source,
        });
        setImportResult(`Successfully imported ${result.count ?? parsed.totalRows} sales records.`);
      }
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsed(null);
    setError(null);
    setImportResult(null);
    setTxMapping({ date: -1, description: -1, amount: -1 });
    setSalesMapping({ date: -1, title: -1, units: -1, royalty: -1, marketplace: -1 });
    setSource('');
    setTransactionType('auto');
    setSelectedTemplateId('');
    setTemplateName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderColumnSelect = (label: string, value: number, onChange: (val: number) => void) => (
    <div className="form-group" style={{ marginBottom: '12px' }}>
      <label>{label}</label>
      <select
        className="form-control"
        value={String(value)}
        onChange={(e) => onChange(parseInt(e.target.value))}
      >
        <option value="-1">-- Select Column --</option>
        {parsed?.headers.map((header, idx) => (
          <option key={idx} value={String(idx)}>
            {header}
          </option>
        ))}
      </select>
    </div>
  );

  const previewData = getMappedPreviewData();

  return (
    <div>
      <div className="page-header">
        <h1>Import</h1>
        {(parsed || importResult) && (
          <button className="btn btn-secondary" onClick={handleReset}>
            Start Over
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {importResult && <div className="alert alert-success">{importResult}</div>}

      {/* Mode Tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '24px' }}>
        <button
          className={`btn ${mode === 'transactions' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '6px 0 0 6px' }}
          onClick={() => setMode('transactions')}
        >
          Import Transactions
        </button>
        <button
          className={`btn ${mode === 'sales' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '0 6px 6px 0' }}
          onClick={() => setMode('sales')}
        >
          Import Sales
        </button>
      </div>

      {/* File Upload */}
      {!importResult && (
        <>
          <div
            className={`import-dropzone${dragover ? ' dragover' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClickDropzone}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
            />
            {parsing ? (
              <div>
                <div className="spinner" style={{ display: 'inline-block', marginBottom: '8px' }} />
                <p>Parsing CSV...</p>
              </div>
            ) : file ? (
              <div>
                <p style={{ fontWeight: 600, color: '#334155' }}>{file.name}</p>
                <p>{parsed ? `${parsed.totalRows} rows found` : 'Click or drag to replace'}</p>
              </div>
            ) : (
              <div>
                <p style={{ fontWeight: 600, color: '#334155', fontSize: '16px' }}>
                  Drop CSV file here or click to browse
                </p>
                <p>Accepts .csv files only</p>
              </div>
            )}
          </div>

          {/* Configuration (only after parse) */}
          {parsed && !importResult && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Left: Column Mapping */}
              <div className="card">
                <h3>Column Mapping</h3>
                {mode === 'transactions' ? (
                  <>
                    {renderColumnSelect('Date', txMapping.date, (val) => setTxMapping((prev) => ({ ...prev, date: val })))}
                    {renderColumnSelect('Description', txMapping.description, (val) => setTxMapping((prev) => ({ ...prev, description: val })))}
                    {renderColumnSelect('Amount', txMapping.amount, (val) => setTxMapping((prev) => ({ ...prev, amount: val })))}
                  </>
                ) : (
                  <>
                    {renderColumnSelect('Date', salesMapping.date, (val) => setSalesMapping((prev) => ({ ...prev, date: val })))}
                    {renderColumnSelect('Title', salesMapping.title, (val) => setSalesMapping((prev) => ({ ...prev, title: val })))}
                    {renderColumnSelect('Units', salesMapping.units, (val) => setSalesMapping((prev) => ({ ...prev, units: val })))}
                    {renderColumnSelect('Royalty', salesMapping.royalty, (val) => setSalesMapping((prev) => ({ ...prev, royalty: val })))}
                    {renderColumnSelect('Marketplace', salesMapping.marketplace, (val) => setSalesMapping((prev) => ({ ...prev, marketplace: val })))}
                  </>
                )}
              </div>

              {/* Right: Settings */}
              <div className="card">
                <h3>Settings</h3>
                <div className="form-group">
                  <label>Source</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={mode === 'transactions' ? 'e.g. Chase Checking' : 'e.g. Amazon KDP'}
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                  />
                </div>

                {mode === 'transactions' && (
                  <div className="form-group">
                    <label>Transaction Type</label>
                    <select
                      className="form-control"
                      value={transactionType}
                      onChange={(e) => setTransactionType(e.target.value as TransactionType)}
                    >
                      <option value="auto">Auto-detect from amount sign</option>
                      <option value="expense">Force all as Expense</option>
                      <option value="income">Force all as Income</option>
                    </select>
                    <div className="form-help">
                      Auto-detect: negative amounts become expenses, positive become income
                    </div>
                  </div>
                )}

                {/* Template Management */}
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Load Template
                  </label>
                  <select
                    className="form-control"
                    value={selectedTemplateId}
                    onChange={(e) => applyTemplate(e.target.value)}
                    style={{ marginBottom: '12px' }}
                  >
                    <option value="">-- Select Template --</option>
                    {templates
                      .filter((t) => t.type === mode)
                      .map((t) => (
                        <option key={t.id} value={String(t.id)}>
                          {t.name}
                        </option>
                      ))}
                  </select>

                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Save Current as Template
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Template name"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button
                      className="btn btn-secondary"
                      onClick={handleSaveTemplate}
                      disabled={savingTemplate || !templateName.trim()}
                    >
                      {savingTemplate ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preview Table */}
          {parsed && isMappingComplete() && !importResult && (
            <div className="import-preview">
              <div className="import-summary">
                <span>
                  Previewing first {Math.min(20, parsed.totalRows)} of {parsed.totalRows} rows
                </span>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      {mode === 'transactions' ? (
                        <>
                          <th>Date</th>
                          <th>Description</th>
                          <th className="amount">Amount</th>
                        </>
                      ) : (
                        <>
                          <th>Date</th>
                          <th>Title</th>
                          <th className="amount">Units</th>
                          <th className="amount">Royalty</th>
                          <th>Marketplace</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, idx) => (
                      <tr key={idx}>
                        {mode === 'transactions' ? (
                          <>
                            <td>{row.date}</td>
                            <td>{row.description}</td>
                            <td className="amount">{row.amount}</td>
                          </>
                        ) : (
                          <>
                            <td>{row.date}</td>
                            <td>{row.title}</td>
                            <td className="amount">{row.units}</td>
                            <td className="amount">{row.royalty}</td>
                            <td>{row.marketplace}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="form-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleImport}
                  disabled={importing || !isMappingComplete()}
                >
                  {importing ? 'Importing...' : `Import ${parsed.totalRows} Rows`}
                </button>
                <button className="btn btn-secondary" onClick={handleReset}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Import;
