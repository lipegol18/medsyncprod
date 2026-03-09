import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import {
  Sparkles, ChevronDown, ChevronRight, Database, BarChart3,
  Table, Loader2, AlertCircle, Send, Clock, TrendingUp
} from "lucide-react";

interface QueryResult {
  sql: string;
  explanation: string;
  rows: Record<string, any>[];
  columns: string[];
  chartType: "bar" | "line" | "pie" | "table" | "kpi";
  rowCount: number;
}

interface HistoryItem {
  question: string;
  result: QueryResult;
  timestamp: Date;
}

const EXAMPLE_QUESTIONS = [
  "Quantos pedidos foram criados por mês nos últimos 6 meses?",
  "Quais são os 10 hospitais com mais pedidos?",
  "Qual a distribuição de pedidos por status?",
  "Quantos usuários ativos existem por especialidade médica?",
  "Quais os 5 procedimentos cirúrgicos mais solicitados?",
  "Quantos pedidos foram aprovados vs negados este ano?",
  "Qual o crescimento de novos pacientes por mês?",
  "Quais planos de assinatura têm mais usuários ativos?",
];

const CHART_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#f97316", "#84cc16",
];

function KpiCard({ columns, rows }: { columns: string[]; rows: Record<string, any>[] }) {
  if (rows.length === 0) return null;
  const entries = columns.map(col => ({ label: col, value: rows[0][col] }));

  return (
    <div className={`grid gap-4 ${entries.length > 1 ? "grid-cols-2 md:grid-cols-3" : "grid-cols-1"}`}>
      {entries.map(({ label, value }, i) => (
        <Card key={i} className="text-center">
          <CardContent className="pt-6 pb-4">
            <p className="text-3xl font-bold text-primary">
              {typeof value === "number" ? value.toLocaleString("pt-BR") : String(value ?? "-")}
            </p>
            <p className="text-sm text-muted-foreground mt-1 capitalize">{label.replace(/_/g, " ")}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DataTable({ columns, rows }: { columns: string[]; rows: Record<string, any>[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-4 py-3 text-left font-semibold text-muted-foreground capitalize whitespace-nowrap">
                {col.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t hover:bg-muted/30 transition-colors">
              {columns.map((col) => (
                <td key={col} className="px-4 py-2.5 text-foreground">
                  {row[col] !== null && row[col] !== undefined
                    ? typeof row[col] === "number"
                      ? row[col].toLocaleString("pt-BR")
                      : String(row[col])
                    : <span className="text-muted-foreground italic">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SmartChart({ result }: { result: QueryResult }) {
  const { chartType, rows, columns } = result;
  if (rows.length === 0) return <p className="text-muted-foreground text-sm text-center py-8">Nenhum resultado retornado.</p>;

  const numericCols = columns.filter(col => {
    const val = rows[0][col];
    return typeof val === "number" || (typeof val === "string" && !isNaN(Number(val)));
  });
  const labelCol = columns.find(col => !numericCols.includes(col)) || columns[0];

  const normalized = rows.map(row => {
    const obj: Record<string, any> = { ...row };
    numericCols.forEach(col => { obj[col] = Number(row[col]) || 0; });
    if (obj[labelCol] !== undefined) obj[labelCol] = String(obj[labelCol]);
    return obj;
  });

  if (chartType === "kpi") return <KpiCard columns={columns} rows={rows} />;

  if (chartType === "pie" && numericCols.length === 1) {
    const dataKey = numericCols[0];
    return (
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie data={normalized} dataKey={dataKey} nameKey={labelCol} cx="50%" cy="50%" outerRadius={120} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
            {normalized.map((_, index) => (
              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: any) => [Number(value).toLocaleString("pt-BR"), dataKey.replace(/_/g, " ")]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "line" && numericCols.length >= 1) {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={normalized} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey={labelCol} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => v.toLocaleString("pt-BR")} />
          <Tooltip formatter={(value: any) => [Number(value).toLocaleString("pt-BR")]} />
          <Legend />
          {numericCols.map((col, i) => (
            <Line key={col} type="monotone" dataKey={col} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 4 }} name={col.replace(/_/g, " ")} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if ((chartType === "bar" || chartType === "line") && numericCols.length >= 1) {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={normalized} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey={labelCol} tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => v.toLocaleString("pt-BR")} />
          <Tooltip formatter={(value: any) => [Number(value).toLocaleString("pt-BR")]} />
          <Legend wrapperStyle={{ paddingTop: 16 }} />
          {numericCols.map((col, i) => (
            <Bar key={col} dataKey={col} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[4, 4, 0, 0]} name={col.replace(/_/g, " ")} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return <DataTable columns={columns} rows={rows} />;
}

function SqlBlock({ sql }: { sql: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5 h-7 px-2">
          <Database className="h-3.5 w-3.5" />
          <span className="text-xs">Ver SQL gerado</span>
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <pre className="mt-2 rounded-lg bg-muted/60 p-4 text-xs font-mono overflow-x-auto text-muted-foreground border leading-relaxed whitespace-pre-wrap">
          {sql}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
}

const chartTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    bar: "Gráfico de Barras",
    line: "Gráfico de Linhas",
    pie: "Gráfico de Pizza",
    table: "Tabela",
    kpi: "KPI",
  };
  return map[type] || type;
};

const chartTypeIcon = (type: string) => {
  if (type === "table") return <Table className="h-3.5 w-3.5" />;
  if (type === "kpi") return <TrendingUp className="h-3.5 w-3.5" />;
  return <BarChart3 className="h-3.5 w-3.5" />;
};

export default function AdminAnalytics() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (user?.roleId !== 1) {
    navigate("/welcome");
    return null;
  }

  const mutation = useMutation({
    mutationFn: async (q: string) => {
      return apiRequest<QueryResult>("/api/admin/analytics-query", "POST", { question: q });
    },
    onSuccess: (data) => {
      setHistory(prev => [{ question, result: data, timestamp: new Date() }, ...prev.slice(0, 9)]);
    },
  });

  const handleSubmit = () => {
    if (!question.trim() || mutation.isPending) return;
    mutation.mutate(question.trim());
  };

  const handleExample = (q: string) => {
    setQuestion(q);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics com IA</h1>
          </div>
          <p className="text-muted-foreground">
            Faça perguntas em português sobre os dados do MedSync e visualize os resultados em gráficos em tempo real.
          </p>
        </div>

        {/* Input */}
        <Card>
          <CardContent className="pt-5 space-y-4">
            <Textarea
              ref={textareaRef}
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ex: Quantos pedidos foram criados por mês nos últimos 6 meses?"
              className="min-h-[90px] text-base resize-none focus-visible:ring-primary"
              disabled={mutation.isPending}
            />

            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground hidden sm:block">
                <kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px] font-mono">Ctrl+Enter</kbd> para enviar
              </p>
              <Button
                onClick={handleSubmit}
                disabled={!question.trim() || mutation.isPending}
                className="gap-2 ml-auto"
                size="lg"
              >
                {mutation.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Consultando...</>
                  : <><Send className="h-4 w-4" /> Consultar</>}
              </Button>
            </div>

            {/* Examples */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Exemplos de perguntas:</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleExample(q)}
                    disabled={mutation.isPending}
                    className="text-xs px-3 py-1.5 rounded-full border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {mutation.isError && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="pt-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-medium text-destructive">Erro ao processar a consulta</p>
                  <p className="text-xs text-muted-foreground">
                    {(mutation.error as any)?.message || "Tente reformular a pergunta ou verifique se a integração com IA está activa."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading skeleton */}
        {mutation.isPending && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm">A IA está a gerar e executar a consulta…</span>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-muted/60 rounded-full w-3/4 animate-pulse" />
                <div className="h-4 bg-muted/60 rounded-full w-1/2 animate-pulse" />
                <div className="h-40 bg-muted/40 rounded-xl animate-pulse mt-4" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Latest Result */}
        {mutation.isSuccess && mutation.data && (
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium">Pergunta</p>
                  <CardTitle className="text-base font-semibold leading-snug">{question}</CardTitle>
                </div>
                <Badge variant="secondary" className="gap-1.5 shrink-0">
                  {chartTypeIcon(mutation.data.chartType)}
                  {chartTypeLabel(mutation.data.chartType)}
                </Badge>
              </div>
              {mutation.data.explanation && (
                <p className="text-sm text-muted-foreground pt-1">{mutation.data.explanation}</p>
              )}
              <div className="flex items-center gap-3 pt-1">
                <span className="text-xs text-muted-foreground">{mutation.data.rowCount} linha{mutation.data.rowCount !== 1 ? "s" : ""}</span>
                <SqlBlock sql={mutation.data.sql} />
              </div>
            </CardHeader>
            <CardContent>
              {mutation.data.chartType !== "table" && mutation.data.rows.length > 0 && (
                <div className="mb-6">
                  <SmartChart result={mutation.data} />
                </div>
              )}
              {(mutation.data.chartType === "table" || mutation.data.rows.length > 0) && (
                <DataTable columns={mutation.data.columns} rows={mutation.data.rows} />
              )}
            </CardContent>
          </Card>
        )}

        {/* History */}
        {history.length > 1 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Consultas anteriores desta sessão</span>
            </div>
            {history.slice(1).map((item, i) => (
              <Card key={i} className="opacity-80 hover:opacity-100 transition-opacity">
                <CardHeader className="pb-2 pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-medium leading-snug truncate">{item.question}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {item.result.rowCount} linha{item.result.rowCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="gap-1.5 text-xs">
                        {chartTypeIcon(item.result.chartType)}
                        {chartTypeLabel(item.result.chartType)}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setQuestion(item.question);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Repetir
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-4">
                  {item.result.chartType !== "table" && item.result.rows.length > 0 && (
                    <div className="mb-4">
                      <SmartChart result={item.result} />
                    </div>
                  )}
                  <DataTable columns={item.result.columns} rows={item.result.rows} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
